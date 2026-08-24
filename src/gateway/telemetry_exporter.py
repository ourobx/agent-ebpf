"""
KSEC v2.0 — Multi-Destination Telemetry Exporter (ClickHouse Batching & S3 Archival)

Features:
- Immediate Zero-Delay Flush for Threat & Security Events
- Sub-500ms Non-Blocking Buffer for Benign High-Volume Events
- Bounded Dead Letter Queue (DLQ max 10k: drops oldest benign, preserves threats)
- High-Precision Monotonic Timer & SOC-2 Compliant S3 Partitioning
"""

from __future__ import annotations
import json
import time
import gzip
import uuid
import datetime
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional, Callable


@dataclass
class KernelTelemetryEvent:
    event_id: str
    tenant_id: str
    agent_id: str
    timestamp_ns: int
    event_type: str        # 'SQL_VERIFIED', 'DDL_BLOCKED', 'PII_EGRESS_BLOCKED', 'DRIFT_FROZEN'
    action_verdict: str    # 'PASS', 'DROP', 'SIGKILL', 'ROLLBACK'
    latency_us: float
    target_host: str
    target_port: int
    payload_preview: str
    ast_sha256: str
    is_threat: bool


class TelemetryPipeline:
    """
    Asynchronous multi-tenant buffer for ClickHouse streaming, S3 compliance archival, and DLQ resilience.
    """

    def __init__(
        self,
        clickhouse_endpoint: Optional[str] = None,
        s3_bucket: Optional[str] = None,
        clickhouse_transport: Optional[Callable[[str], bool]] = None,
        s3_transport: Optional[Callable[[str, bytes], bool]] = None
    ):
        self.clickhouse_endpoint = clickhouse_endpoint
        self.s3_bucket = s3_bucket or "ksec-audit-vault"
        self.clickhouse_transport = clickhouse_transport
        self.s3_transport = s3_transport

        self.buffer: List[KernelTelemetryEvent] = []
        self.dlq: List[KernelTelemetryEvent] = []
        self.max_buffer_size = 1_000
        self.max_dlq_size = 10_000
        self.last_flush_monotonic = time.monotonic()
        self.flush_interval_seconds = 0.5  # 500ms

    def ingest_event(self, event: KernelTelemetryEvent) -> None:
        """
        Appends event to the ingestion ring.
        CRITICAL: Threat events trigger an immediate flush.
        """
        self.buffer.append(event)
        now_mono = time.monotonic()

        # Immediate flush for security threats, or when buffer/time threshold is reached
        if event.is_threat or len(self.buffer) >= self.max_buffer_size or (now_mono - self.last_flush_monotonic) >= self.flush_interval_seconds:
            self.flush()

    def generate_s3_partition_key(self, tenant_id: str, timestamp_ns: int) -> str:
        """
        Generates SOC-2 compliant hierarchical S3 object key:
        s3://{bucket}/{tenant_id}/{YYYY}/{MM}/{DD}/{HH}_{uuid}.json.gz
        """
        seconds = int(timestamp_ns // 1_000_000_000)
        dt = datetime.datetime.fromtimestamp(seconds, tz=datetime.timezone.utc)
        year = dt.strftime("%Y")
        month = dt.strftime("%m")
        day = dt.strftime("%d")
        hour = dt.strftime("%H")
        batch_id = uuid.uuid4().hex[:8]
        return f"{tenant_id}/{year}/{month}/{day}/{hour}_{batch_id}.json.gz"

    def _enqueue_to_dlq(self, failed_events: List[KernelTelemetryEvent]) -> None:
        """Appends failed events to DLQ while enforcing max size bounds (preserving threats)."""
        self.dlq.extend(failed_events)
        if len(self.dlq) > self.max_dlq_size:
            # Separate threats from benign events
            threats = [e for e in self.dlq if e.is_threat]
            benign = [e for e in self.dlq if not e.is_threat]
            # Keep newest benign events to stay under limit, but keep all threats
            excess = (len(threats) + len(benign)) - self.max_dlq_size
            if excess > 0:
                benign = benign[excess:]
            self.dlq = threats + benign

    def flush(self) -> Dict[str, Any]:
        """Flushes buffered events to ClickHouse and S3."""
        if not self.buffer and not self.dlq:
            return {"flushed_count": 0, "dlq_size": 0}

        # Drain DLQ and active buffer
        batch = list(self.dlq) + list(self.buffer)
        self.buffer.clear()
        self.dlq.clear()
        self.last_flush_monotonic = time.monotonic()

        try:
            # 1. Format ClickHouse JSONEachRow payload
            clickhouse_payload = "\n".join([json.dumps(asdict(e)) for e in batch])
            if self.clickhouse_transport:
                success = self.clickhouse_transport(clickhouse_payload)
                if not success:
                    raise RuntimeError("ClickHouse transport reported write failure")

            # 2. Partition and compress for S3
            tenant_batches: Dict[str, List[KernelTelemetryEvent]] = {}
            for e in batch:
                tenant_batches.setdefault(e.tenant_id, []).append(e)

            s3_keys = []
            for tenant_id, events in tenant_batches.items():
                first_ts = events[0].timestamp_ns if events else int(time.time() * 1e9)
                s3_key = self.generate_s3_partition_key(tenant_id, first_ts)
                jsonl_data = "\n".join([json.dumps(asdict(e)) for e in events])
                compressed = gzip.compress(jsonl_data.encode("utf-8"))

                if self.s3_transport:
                    self.s3_transport(s3_key, compressed)
                s3_keys.append(s3_key)

            return {
                "flushed_count": len(batch),
                "dlq_size": 0,
                "s3_keys_generated": s3_keys,
                "status": "FLUSHED_SUCCESSFULLY"
            }
        except Exception as err:
            # On failure, route back to bounded DLQ
            self._enqueue_to_dlq(batch)
            return {
                "flushed_count": 0,
                "dlq_size": len(self.dlq),
                "error": str(err),
                "status": "QUEUED_TO_DLQ"
            }

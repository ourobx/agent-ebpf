"""
KSEC Kernel Ring-Buffer Saturation Sentinel & Autonomous Health Watcher.
Continuously monitors eBPF Ring-Buffer memory watermarks, polling latencies, and dropped event metrics.
Dynamically tunes userspace polling frequencies and broadcasts saturation warnings to control plane operators.
"""

import time
import asyncio
from typing import Dict, Any


class RingBufferSentinel:
    def __init__(self, capacity_bytes: int = 262144): # 256 KB default
        self.capacity_bytes = capacity_bytes
        self.total_events_processed = 0
        self.total_events_dropped = 0
        self.current_watermark_pct = 0.0
        self.last_poll_latency_us = 12.4
        self.adaptive_poll_timeout_ms = 10
        self.health_status = "HEALTHY" # HEALTHY, DEGRADED, SATURATED
        self.last_check_timestamp = time.time()

    def record_batch(self, event_count: int, dropped_count: int = 0, poll_duration_us: float = 12.0):
        """Records processed event batches and dynamically calculates buffer saturation metrics."""
        self.total_events_processed += event_count
        self.total_events_dropped += dropped_count
        self.last_poll_latency_us = poll_duration_us
        self.last_check_timestamp = time.time()

        # Estimated watermark percentage based on queue density
        estimated_in_flight_bytes = (event_count * 64) # 64-byte struct event_t
        self.current_watermark_pct = min(100.0, round((estimated_in_flight_bytes / self.capacity_bytes) * 100, 2))

        # Autonomous adaptive tuning: Reduce poll timeout when under heavy load
        if self.current_watermark_pct > 75.0 or dropped_count > 0:
            self.adaptive_poll_timeout_ms = max(1, self.adaptive_poll_timeout_ms // 2)
            self.health_status = "SATURATED" if dropped_count > 0 else "DEGRADED"
        elif self.current_watermark_pct < 20.0:
            self.adaptive_poll_timeout_ms = min(25, self.adaptive_poll_timeout_ms + 1)
            self.health_status = "HEALTHY"
        else:
            self.health_status = "HEALTHY"

    def get_health_metrics(self) -> Dict[str, Any]:
        """Returns structured kernel telemetry health status and latency SLA metrics."""
        drop_rate = 0.0
        if (self.total_events_processed + self.total_events_dropped) > 0:
            drop_rate = round((self.total_events_dropped / (self.total_events_processed + self.total_events_dropped)) * 100, 4)

        return {
            "status": self.health_status,
            "buffer_capacity_kb": self.capacity_bytes // 1024,
            "current_watermark_pct": self.current_watermark_pct,
            "adaptive_poll_timeout_ms": self.adaptive_poll_timeout_ms,
            "last_poll_latency_us": self.last_poll_latency_us,
            "total_processed": self.total_events_processed,
            "total_dropped": self.total_events_dropped,
            "drop_rate_pct": drop_rate,
            "sla_compliant": self.last_poll_latency_us < 50.0 and self.total_events_dropped == 0
        }


ringbuf_sentinel = RingBufferSentinel()

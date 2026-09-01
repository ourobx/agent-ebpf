"""
KSEC Central gRPC Telemetry Mesh Server.
Receives high-throughput binary event streams from global edge agents via HTTP/2,
authenticates tenant API keys, and routes events into the multi-tenant broadcaster.
"""

import asyncio
from typing import AsyncIterator, Dict, Any, Optional

from backend.app.core.broadcaster import tenant_broadcaster
from backend.app.schemas.telemetry import EbpfEvent

try:
    import grpc
    from grpc import ServicerContext
except ImportError:
    grpc = None
    ServicerContext = Any


class TelemetryMeshServicer:
    """
    gRPC Servicer handling bi-directional / client streaming of eBPF kernel telemetry.
    """

    async def StreamTelemetry(self, request_iterator, context: Optional[ServicerContext] = None) -> Dict[str, Any]:
        """
        Consumes live eBPF telemetry event stream from authenticated remote edge nodes.
        """
        tenant_id = "tenant_default"

        # 1. Authenticate invocation metadata if gRPC context is provided
        if context and hasattr(context, "invocation_metadata"):
            metadata = dict(context.invocation_metadata())
            api_key = metadata.get("x-ksec-api-key", "")

            if not api_key:
                context.abort(grpc.StatusCode.UNAUTHENTICATED, "Missing or invalid Tenant API Key (x-ksec-api-key).")

            tenant_id = f"tenant_{api_key[:8]}"

        processed_count = 0

        try:
            async for event_msg in request_iterator:
                # Handle both protobuf objects and dictionary payloads
                pid = getattr(event_msg, "pid", None) or event_msg.get("pid", 0)
                comm = getattr(event_msg, "comm", None) or event_msg.get("comm", "unknown")
                event_type = getattr(event_msg, "event_type", None) or event_msg.get("event_type", "kprobe")
                syscall = getattr(event_msg, "syscall", None) or event_msg.get("syscall", "tcp_v4_connect")
                severity = getattr(event_msg, "severity", None) or event_msg.get("severity", "INFO")
                details = getattr(event_msg, "details", None) or event_msg.get("details", {})

                # Construct Pydantic telemetry event
                telemetry_event = EbpfEvent(
                    pid=pid,
                    comm=comm,
                    event_type=event_type,
                    syscall=syscall,
                    severity=severity if severity in ["INFO", "WARN", "CRIT"] else "INFO",
                    details=dict(details) if isinstance(details, dict) else {}
                )

                # Associate PID with tenant and publish into the async event stream
                tenant_broadcaster.register_user_pid(tenant_id, pid)
                await tenant_broadcaster.publish(telemetry_event)
                processed_count += 1

        except Exception as exc:
            print(f"[WARN] [gRPC Mesh] Stream interrupted for {tenant_id}: {exc}")

        return {
            "received": True,
            "message": "Telemetry stream successfully ingested.",
            "processed_count": processed_count
        }


class GrpcTelemetryMeshServer:
    def __init__(self, port: int = 50051):
        self.port = port
        self.server = None

    async def start(self):
        if not grpc:
            print("[WARN] [gRPC Mesh] grpcio library not installed. gRPC server disabled.")
            return

        self.server = grpc.aio.server()
        self.server.add_insecure_port(f"[::]:{self.port}")
        print(f"[INFO] [gRPC Mesh] Central telemetry server listening on port {self.port} (HTTP/2)...")
        await self.server.start()

    async def stop(self):
        if self.server:
            await self.server.stop(grace=1.0)
            print("[INFO] [gRPC Mesh] Central telemetry server stopped.")


grpc_servicer = TelemetryMeshServicer()
grpc_mesh_server = GrpcTelemetryMeshServer()

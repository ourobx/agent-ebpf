import asyncio
from typing import Optional
from fastapi import APIRouter, Request, Query
from fastapi.responses import StreamingResponse

from backend.app.core.broadcaster import tenant_broadcaster
from backend.app.core.auth import decode_access_token
from backend.app.schemas.telemetry import EbpfEvent

router = APIRouter()


@router.get("/telemetry/stream", response_class=StreamingResponse, tags=["Telemetry Stream"])
async def stream_ebpf_events(
    request: Request,
    token: Optional[str] = Query(None, description="JWT Authentication token for tenant-scoped telemetry"),
):
    """
    Real-time Server-Sent Events (SSE) telemetry stream for eBPF kernel events.
    Isolates streams to authenticated tenant processes or falls back to global stream.
    Includes automated 15-second keepalive pings for Cloudflare Tunnel proxy buffering protection.
    """
    username = "global"
    if token:
        try:
            payload = decode_access_token(token)
            username = payload.get("sub") or payload.get("email") or "global"
        except Exception:
            username = "global"

    async def event_generator():
        queue = await tenant_broadcaster.subscribe(username)
        try:
            while True:
                if await request.is_disconnected():
                    break

                try:
                    # Wait for next eBPF event or emit keepalive to prevent Cloudflare 100s proxy timeout
                    event: EbpfEvent = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"event: ebpf_event\ndata: {event.model_dump_json()}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            await tenant_broadcaster.unsubscribe(username, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )

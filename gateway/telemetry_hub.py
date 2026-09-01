import asyncio
import json
import time
from typing import AsyncGenerator
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/v1/telemetry", tags=["Live Telemetry"])

class TelemetryHub:
    def __init__(self):
        self._subscribers: list[asyncio.Queue] = []

    async def broadcast(self, event_type: str, data: dict) -> None:
        payload = {
            "type": event_type,
            "timestamp": time.time_ns(),
            "data": data
        }
        # Snapshot to avoid mutation during iteration
        subscribers_snapshot = list(self._subscribers)
        dead: list[asyncio.Queue] = []
        for queue in subscribers_snapshot:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                dead.append(queue)
        # Clean up dead subscribers in a single pass
        for q in dead:
            try:
                self._subscribers.remove(q)
            except ValueError:
                pass  # Already removed by another coroutine

    async def subscribe(self) -> AsyncGenerator[str, None]:
        queue = asyncio.Queue(maxsize=1000)
        self._subscribers.append(queue)
        try:
            # Yield initial connected event
            yield "event: connected\ndata: {\"status\": \"STREAM_CONNECTED\", \"timestamp\": " + str(time.time_ns()) + "}\n\n"
            while True:
                try:
                    # 15s timeout for SSE keep-alive heartbeat against proxy idle disconnects
                    payload = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"event: {payload['type']}\ndata: {json.dumps(payload)}\n\n"
                except asyncio.TimeoutError:
                    # SSE Keep-Alive Ping Comment (keeps Cloudflare Tunnel QUIC streams alive)
                    yield f": ping {time.time_ns()}\n\n"
        finally:
            try:
                self._subscribers.remove(queue)
            except ValueError:
                pass  # Already cleaned up by broadcast()

telemetry_hub = TelemetryHub()

@router.get("/stream")
async def live_telemetry_stream():
    return StreamingResponse(
        telemetry_hub.subscribe(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

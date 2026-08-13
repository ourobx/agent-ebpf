"""
P2 SSE resiliency tests for Agent-eBPF MCP Gateway.

Covers:
  3A. The /sse endpoint serves a Server-Sent event stream, registers a
      session, and cleans it up on disconnect; multiple concurrent
      connections must not leak sessions.

These tests invoke the real /sse endpoint in-process (no network socket)
and read the streaming body_iterator directly, making them deterministic
and CI-friendly on any platform.
"""
import sys
import os
import asyncio
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from starlette.requests import Request
from mcp_server import app, sessions


async def _disconnected_receive():
    return {"type": "http.disconnect"}


def _make_request() -> Request:
    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": "/sse",
        "raw_path": b"/sse",
        "query_string": b"",
        "root_path": "",
        "headers": [(b"accept", b"text/event-stream")],
        "client": ("127.0.0.1", 12345),
        "server": ("testserver", 80),
    }
    return Request(scope, receive=_disconnected_receive)


def _sse_endpoint():
    for route in app.routes:
        if getattr(route, "path", None) == "/sse":
            return route.endpoint
    raise RuntimeError("/sse route not found")


async def _read_first_event_chunks(response) -> tuple:
    """Read the first SSE event (endpoint) from a StreamingResponse body."""
    it = response.body_iterator.__aiter__()
    first = await it.__anext__()
    if isinstance(first, bytes):
        first = first.decode("utf-8", "replace")
    try:
        second = await asyncio.wait_for(it.__anext__(), timeout=0.1)
        if isinstance(second, bytes):
            second = second.decode("utf-8", "replace")
    except (StopAsyncIteration, asyncio.TimeoutError):
        second = ""
    return first, second


def test_sse_stream_serves_one_event_and_cleans_up():
    endpoint = _sse_endpoint()
    baseline = len(sessions)

    async def run():
        req = _make_request()
        resp = await endpoint(req)
        assert "text/event-stream" in resp.headers["content-type"]

        first, second = await _read_first_event_chunks(resp)
        text = first + second
        assert "event: endpoint" in text
        assert "/messages?session_id=" in text, f"Missing session id: {text}"

        # Closing the stream or completing iteration triggers generator cleanup.
        await resp.body_iterator.aclose()
        assert len(sessions) == baseline

    asyncio.run(run())
    assert len(sessions) == baseline
    print("[PASS] SSE stream serves endpoint event and cleans up session on close")


def test_sse_concurrent_connections_no_leak():
    endpoint = _sse_endpoint()
    baseline = len(sessions)
    N = 5

    async def run():
        responses = []
        for _ in range(N):
            resp = await endpoint(_make_request())
            assert "text/event-stream" in resp.headers["content-type"]
            responses.append(resp)

        # All N sessions are registered concurrently.
        assert len(sessions) == baseline + N, f"{len(sessions)} != {baseline + N}"

        # Every stream emitted its endpoint event referencing a live session.
        for resp in responses:
            first, second = await _read_first_event_chunks(resp)
            text = first + second
            assert "/messages?session_id=" in text

            # Clean up each stream.
            await resp.body_iterator.aclose()

        assert len(sessions) == baseline

    asyncio.run(run())
    assert len(sessions) == baseline
    print(f"[PASS] {N} concurrent SSE connections opened and closed without session leaks")


if __name__ == "__main__":
    test_sse_stream_serves_one_event_and_cleans_up()
    test_sse_concurrent_connections_no_leak()
    print("\n[SUCCESS] All SSE resiliency tests passed!")

"""
P3 Real-time telemetry endpoint tests for Agent-eBPF MCP Gateway.

Covers the authenticated telemetry surface the dashboard consumes:
  4A. JWT-protected telemetry endpoints reject unauthenticated calls (401)
  4B. With a valid token, endpoints return real-shaped payloads (no synthetic data)
  4C. The authenticated SSE metrics stream emits a real `metrics` frame
"""
import sys
import os
import json
import asyncio
import pytest
from jose import jwt
from starlette.testclient import TestClient
from mcp_server import app, JWT_SECRET_KEY, JWT_ALGORITHM


def make_token(payload: dict) -> str:
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


ADMIN = make_token({"sub": "admin_user", "role": "admin",
                    "scopes": ["ebpf:read", "ebpf:write", "security_rule:add", "ebpf:admin"]})
ADMIN_HEADERS = {"Authorization": f"Bearer {ADMIN}"}


# ---------------------------------------------------------------------------
# 4A. Authentication gate
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("path", ["/api/system/status", "/api/system/host", "/api/events", "/api/threats"])
def test_telemetry_endpoints_require_auth(path):
    client = TestClient(app)
    r = client.get(path)
    assert r.status_code == 401, f"{path} should require a JWT, got {r.status_code}"
    print(f"[PASS] {path} rejects unauthenticated request (401)")


# ---------------------------------------------------------------------------
# 4B. Real-shaped payloads under valid token
# ---------------------------------------------------------------------------
def test_system_status_real_shape():
    client = TestClient(app)
    r = client.get("/api/system/status", headers=ADMIN_HEADERS)
    assert r.status_code == 200, r.text
    body = r.json()
    # Real fields only — never synthetic numeric payloads.
    assert set(body) >= {"kernel_health", "ebpf", "database_connected", "active_rules", "threat_index", "threat_label"}
    assert body["kernel_health"] in ("OPERATIONAL", "NOT_LOADED", "ERROR")
    assert isinstance(body["database_connected"], bool)
    assert isinstance(body["active_rules"], int)
    print(f"[PASS] /api/system/status real shape: kernel={body['kernel_health']} db={body['database_connected']}")


def test_events_and_threats_return_real_schema():
    client = TestClient(app)
    for path, key in [("/api/events", "events"), ("/api/threats", "threats")]:
        r = client.get(path, headers=ADMIN_HEADERS)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "available" in body and isinstance(body["available"], bool)
        assert isinstance(body[key], list)
        print(f"[PASS] {path}: available={body['available']} count={len(body[key])}")


def test_host_metrics_never_fabricate():
    client = TestClient(app)
    r = client.get("/api/system/host", headers=ADMIN_HEADERS)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "available" in body
    # When psutil is missing, the endpoint MUST report unavailable — never a fake number.
    if not body["available"]:
        assert "reason" in body, "unavailable host metrics must explain why, not fabricate"
    print(f"[PASS] /api/system/host real: available={body['available']} reason={body.get('reason', 'n/a')}")


# ---------------------------------------------------------------------------
# 4C. Authenticated SSE metrics stream emits a real frame
# ---------------------------------------------------------------------------
def test_metrics_stream_emits_real_frame():
    """Mirrors the deterministic /sse test: call the endpoint coroutine directly
    (dependency user is injected, not resolved), read the first body_iterator
    chunk, and assert a real `metrics` frame carrying eBPF state was emitted."""
    from starlette.requests import Request

    def _metrics_endpoint():
        for route in app.routes:
            if getattr(route, "path", None) == "/api/metrics/stream":
                return route.endpoint
        raise RuntimeError("/api/metrics/stream route not found")

    endpoint = _metrics_endpoint()

    async def run():
        # Auth dependency bypassed: pass a stand-in user (the handler never reads it).
        resp = await endpoint(None, user=object())
        assert "text/event-stream" in resp.headers["content-type"]
        it = resp.body_iterator.__aiter__()
        first = await asyncio.wait_for(it.__anext__(), timeout=5)
        if isinstance(first, bytes):
            first = first.decode("utf-8", "replace")
        await resp.body_iterator.aclose()
        assert "event: metrics" in first, f"unexpected frame: {first!r}"
        assert "data:" in first
        data = first.split("data:", 1)[1].strip()
        payload = json.loads(data)
        assert "ebpf" in payload, "metrics frame must carry real eBPF map state"
        print(f"[PASS] /api/metrics/stream emitted real frame: ebpf.status={payload.get('ebpf', {}).get('status')}")

    asyncio.run(run())



if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])

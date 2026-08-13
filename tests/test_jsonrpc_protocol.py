"""
P1 JSON-RPC 2.0 protocol conformance tests for Agent-eBPF MCP Gateway.

Covers:
  2A. Invalid JSON-RPC payloads -> standard error codes
        -32600 Invalid Request / -32601 Method not found / -32602 Invalid params
  2B. Tool execution timeout -> -32001 (server-defined error range)
"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from jose import jwt
from starlette.testclient import TestClient

import mcp_server
from mcp_server import app, JWT_SECRET_KEY, JWT_ALGORITHM, sessions


def admin_headers() -> dict:
    tok = jwt.encode({"sub": "admin", "role": "admin",
                      "scopes": ["ebpf:read", "ebpf:write", "security_rule:add", "ebpf:admin"]},
                     JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return {"Authorization": f"Bearer {tok}"}


def call(sid: str, body) -> dict:
    """POST a JSON-RPC body to a registered session and pop the queued response."""
    client = TestClient(app)
    sessions[sid] = asyncio.Queue()
    try:
        r = client.post(f"/messages?session_id={sid}", json=body, headers=admin_headers())
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        return sessions[sid].get_nowait()
    finally:
        sessions.pop(sid, None)


def errcode_of(resp: dict) -> int:
    assert "error" in resp, f"Expected JSON-RPC error, got: {resp}"
    return resp["error"]["code"]


# ---------------------------------------------------------------------------
# 2A. Invalid JSON-RPC payloads
# ---------------------------------------------------------------------------

def test_wrong_jsonrpc_version_returns_m32600():
    resp = call("s1", {"jsonrpc": "1.0", "method": "ping", "id": 1})
    assert errcode_of(resp) == -32600
    print("[PASS] Wrong jsonrpc version -> -32600 Invalid Request")


def test_missing_method_returns_m32600():
    resp = call("s2", {"jsonrpc": "2.0", "id": 1})
    assert errcode_of(resp) == -32600
    print("[PASS] Missing method -> -32600 Invalid Request")


def test_non_string_method_returns_m32600():
    resp = call("s3", {"jsonrpc": "2.0", "method": 123, "id": 1})
    assert errcode_of(resp) == -32600
    print("[PASS] Non-string method -> -32600 Invalid Request")


def test_boolean_id_returns_m32600():
    resp = call("s4", {"jsonrpc": "2.0", "method": "ping", "id": True})
    assert errcode_of(resp) == -32600
    print("[PASS] Boolean id -> -32600 Invalid Request")


def test_unknown_method_returns_m32601():
    resp = call("s5", {"jsonrpc": "2.0", "method": "no/such/method", "id": 1})
    assert errcode_of(resp) == -32601
    print("[PASS] Unknown method -> -32601 Method not found")


def test_tools_call_non_object_arguments_returns_m32602():
    resp = call("s6", {"jsonrpc": "2.0", "method": "tools/call", "id": 1,
                       "params": {"name": "ping", "arguments": "not-an-object"}})
    assert errcode_of(resp) == -32602
    print("[PASS] tools/call with non-object arguments -> -32602 Invalid params")


def test_non_dict_body_returns_m32600():
    client = TestClient(app)
    sid = "s7"
    sessions[sid] = asyncio.Queue()
    try:
        r = client.post(f"/messages?session_id={sid}", json=["a", "b"], headers=admin_headers())
        assert r.status_code == 200
        resp = sessions[sid].get_nowait()
        assert errcode_of(resp) == -32600
    finally:
        sessions.pop(sid, None)
    print("[PASS] Non-object payload -> -32600 Invalid Request")


# ---------------------------------------------------------------------------
# 2B. Tool execution timeout
# ---------------------------------------------------------------------------

def test_tool_execution_timeout_returns_m32001(monkeypatch):
    async def slow_tool(name, args, user=None):
        await asyncio.sleep(2.0)
        return {"status": "late"}

    monkeypatch.setattr(mcp_server, "TOOL_TIMEOUT", 0.05)
    monkeypatch.setattr(mcp_server, "execute_tool", slow_tool)

    client = TestClient(app)
    sid = "sess-timeout"
    sessions[sid] = asyncio.Queue()
    try:
        r = client.post(f"/messages?session_id={sid}",
                        json={"jsonrpc": "2.0", "id": 1, "method": "tools/call",
                              "params": {"name": "get_security_status", "arguments": {}}},
                        headers=admin_headers())
        assert r.status_code == 200
        resp = sessions[sid].get_nowait()
        assert errcode_of(resp) == -32001
        assert "timed out" in resp["error"]["message"].lower()
    finally:
        sessions.pop(sid, None)
    print("[PASS] Slow tool call timed out -> -32001")


def test_tool_execution_success_when_fast():
    client = TestClient(app)
    sid = "sess-fast"
    sessions[sid] = asyncio.Queue()
    try:
        r = client.post(f"/messages?session_id={sid}",
                        json={"jsonrpc": "2.0", "id": 1, "method": "tools/call",
                              "params": {"name": "get_security_status", "arguments": {}}},
                        headers=admin_headers())
        assert r.status_code == 200
        resp = sessions[sid].get_nowait()
        assert "error" not in resp
        assert "content" in resp["result"]
    finally:
        sessions.pop(sid, None)
    print("[PASS] Fast tool call completes normally")


if __name__ == "__main__":
    _fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in _fns:
        fn()
    print("\n[SUCCESS] All JSON-RPC protocol tests passed!")


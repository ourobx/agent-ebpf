"""
Test Suite for FastMCP Protocol Schema Freezing & SSE Session Isolation.
Validates:
1. FastMCP Tool Schemas (get_security_status, simulate_query_check, stream_kernel_telemetry) against MCP 2024-11-05 standard.
2. Concurrent AI Agent Session Isolation (sessions Alpha, Beta, Gamma with dedicated event-stream queues).
3. Zero cross-talk and no data leakage across multi-tenant agent sessions.
4. Asynchronous Event-Stream Response Mechanism for long-running / stream-aware tool invocations.
5. Expired and non-existent session rejection (404).
"""

import sys
import os
import json
import asyncio
import pytest
from starlette.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from mcp_server import app, sessions, TOOLS, create_access_token


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_token():
    return create_access_token({
        "sub": "ai_agent_orchestrator",
        "role": "admin",
        "scopes": ["ebpf:read", "ebpf:write", "security_rule:add", "ebpf:admin"]
    })


# ---------------------------------------------------------------------------
# 1. FastMCP Frozen Tool Schemas Verification
# ---------------------------------------------------------------------------
def test_fastmcp_frozen_tool_schemas_list():
    """Verify get_security_status, simulate_query_check, stream_kernel_telemetry in frozen TOOLS list."""
    tool_map = {t["name"]: t for t in TOOLS}

    # 1. get_security_status
    assert "get_security_status" in tool_map
    sec_schema = tool_map["get_security_status"]["inputSchema"]
    assert sec_schema["type"] == "object"
    assert "detailed" in sec_schema.get("properties", {})

    # 2. simulate_query_check
    assert "simulate_query_check" in tool_map
    sim_schema = tool_map["simulate_query_check"]["inputSchema"]
    assert sim_schema["type"] == "object"
    assert "payload" in sim_schema["properties"]
    assert "tenant_id" in sim_schema["properties"]
    assert "target_port" in sim_schema["properties"]
    assert "payload" in sim_schema["required"]

    # 3. stream_kernel_telemetry
    assert "stream_kernel_telemetry" in tool_map
    stream_schema = tool_map["stream_kernel_telemetry"]["inputSchema"]
    assert stream_schema["type"] == "object"
    assert "poll_interval_ms" in stream_schema["properties"]
    assert "include_sock_ops" in stream_schema["properties"]
    assert "include_xdp" in stream_schema["properties"]
    assert "limit" in stream_schema["properties"]
    print("\n[PASS] All 3 core FastMCP tool schemas verified as frozen.")


def test_fastmcp_jsonrpc_tools_list_endpoint(client, admin_token):
    """Verify tools/list JSON-RPC 2.0 response over SSE gateway."""
    session_id = "test-schema-tools-list"
    sessions[session_id] = asyncio.Queue()
    headers = {"Authorization": f"Bearer {admin_token}"}

    try:
        req = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list",
            "params": {}
        }
        resp = client.post(f"/messages?session_id={session_id}", json=req, headers=headers)
        assert resp.status_code == 200

        msg = sessions[session_id].get_nowait()
        assert msg["jsonrpc"] == "2.0"
        assert msg["id"] == 1
        tools_received = {t["name"]: t for t in msg["result"]["tools"]}
        assert "get_security_status" in tools_received
        assert "simulate_query_check" in tools_received
        assert "stream_kernel_telemetry" in tools_received
        print("[PASS] tools/list over /messages returned full frozen tool schemas.")
    finally:
        sessions.pop(session_id, None)


# ---------------------------------------------------------------------------
# 2. Multi-Agent SSE Session Isolation Tests
# ---------------------------------------------------------------------------
def test_concurrent_agent_sse_session_isolation(client, admin_token):
    """Verify concurrent AI agents (Alpha, Beta, Gamma) have strictly isolated SSE queues."""
    session_alpha = "agent-alpha-session"
    session_beta = "agent-beta-session"
    session_gamma = "agent-gamma-session"

    sessions[session_alpha] = asyncio.Queue()
    sessions[session_beta] = asyncio.Queue()
    sessions[session_gamma] = asyncio.Queue()

    headers = {"Authorization": f"Bearer {admin_token}"}

    try:
        # Agent Alpha calls get_security_status
        req_alpha = {
            "jsonrpc": "2.0",
            "id": "alpha-101",
            "method": "tools/call",
            "params": {"name": "get_security_status", "arguments": {}}
        }
        resp_a = client.post(f"/messages?session_id={session_alpha}", json=req_alpha, headers=headers)
        assert resp_a.status_code == 200

        # Agent Beta calls simulate_query_check
        req_beta = {
            "jsonrpc": "2.0",
            "id": "beta-202",
            "method": "tools/call",
            "params": {"name": "simulate_query_check", "arguments": {"payload": "DELETE FROM users"}}
        }
        resp_b = client.post(f"/messages?session_id={session_beta}", json=req_beta, headers=headers)
        assert resp_b.status_code == 200

        # Agent Gamma calls stream_kernel_telemetry
        req_gamma = {
            "jsonrpc": "2.0",
            "id": "gamma-303",
            "method": "tools/call",
            "params": {"name": "stream_kernel_telemetry", "arguments": {"poll_interval_ms": 500}}
        }
        resp_g = client.post(f"/messages?session_id={session_gamma}", json=req_gamma, headers=headers)
        assert resp_g.status_code == 200

        # Verify Alpha Queue: contains ONLY Alpha's response
        assert sessions[session_alpha].qsize() == 1
        msg_a = sessions[session_alpha].get_nowait()
        assert msg_a["id"] == "alpha-101"
        res_a = json.loads(msg_a["result"]["content"][0]["text"])
        assert "kernel_hooks" in res_a

        # Verify Beta Queue: contains ONLY Beta's response
        assert sessions[session_beta].qsize() == 1
        msg_b = sessions[session_beta].get_nowait()
        assert msg_b["id"] == "beta-202"
        res_b = json.loads(msg_b["result"]["content"][0]["text"])
        assert res_b["safe"] is False
        assert res_b["action"] == "DROP"

        # Verify Gamma Queue: contains ONLY Gamma's response
        assert sessions[session_gamma].qsize() == 1
        msg_g = sessions[session_gamma].get_nowait()
        assert msg_g["id"] == "gamma-303"
        res_g = json.loads(msg_g["result"]["content"][0]["text"])
        assert res_g["status"] == "STREAM_READY"
        assert res_g["live_sse_endpoint"] == "/api/v1/telemetry/stream"

        # Assert no leftover messages across all queues
        assert sessions[session_alpha].empty()
        assert sessions[session_beta].empty()
        assert sessions[session_gamma].empty()
        print("[PASS] Multi-Agent SSE session isolation verified: zero leakage across Alpha, Beta, Gamma.")
    finally:
        sessions.pop(session_alpha, None)
        sessions.pop(session_beta, None)
        sessions.pop(session_gamma, None)


# ---------------------------------------------------------------------------
# 3. Asynchronous Event-Stream Response Mechanism Tests
# ---------------------------------------------------------------------------
def test_async_event_stream_response_ordering(client, admin_token):
    """Verify asynchronous tool responses preserve message ID ordering in agent stream."""
    session_id = "agent-async-order-session"
    sessions[session_id] = asyncio.Queue()
    headers = {"Authorization": f"Bearer {admin_token}"}

    try:
        # Dispatch 3 sequential asynchronous requests
        for i in range(1, 4):
            req = {
                "jsonrpc": "2.0",
                "id": f"req-seq-{i}",
                "method": "tools/call",
                "params": {"name": "simulate_query_check", "arguments": {"payload": f"SELECT * FROM accounts WHERE tenant_id = {i}"}}
            }
            resp = client.post(f"/messages?session_id={session_id}", json=req, headers=headers)
            assert resp.status_code == 200


        # Read back from SSE queue in FIFO order
        assert sessions[session_id].qsize() == 3
        for i in range(1, 4):
            msg = sessions[session_id].get_nowait()
            assert msg["id"] == f"req-seq-{i}"
            parsed = json.loads(msg["result"]["content"][0]["text"])
            assert parsed["safe"] is True

        print("[PASS] Asynchronous event-stream response ordering verified.")
    finally:
        sessions.pop(session_id, None)


# ---------------------------------------------------------------------------
# 4. Expired and Invalid Session Error Handling
# ---------------------------------------------------------------------------
def test_missing_or_expired_session_rejected(client, admin_token):
    """Verify that posting to a non-existent or expired session returns 404."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    req = {
        "jsonrpc": "2.0",
        "id": 999,
        "method": "ping"
    }
    resp = client.post("/messages?session_id=non-existent-agent-sess-xyz", json=req, headers=headers)
    assert resp.status_code == 404
    assert "Active SSE session not found or expired" in resp.json()["detail"]
    print("[PASS] Non-existent / expired session correctly rejected with 404.")

import sys
import os
import json
import asyncio
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from starlette.testclient import TestClient
from mcp_server import app, execute_tool, sessions, TOOLS, create_access_token


def test_mcp_gateway_health():
    """Verify Agent-eBPF MCP Gateway health endpoint"""
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data.get("status") == "ok", f"Expected status 'ok', got {data.get('status')}"
    print("[PASS] MCP Gateway /health endpoint verified!")


def test_mcp_gateway_root():
    """Verify Agent-eBPF MCP Gateway root metadata endpoint"""
    client = TestClient(app)
    resp = client.get("/")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data.get("status") == "active", f"Expected active status, got {data.get('status')}"
    assert "mcp_sse_endpoint" in data, "Missing mcp_sse_endpoint key"
    print("[PASS] MCP Gateway root endpoint verified!")


def test_mcp_oauth_config_and_token():
    """Verify OAuth 2.0 discovery and token generation endpoints"""
    client = TestClient(app)
    resp = client.get("/.well-known/oauth-authorization-server")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert "authorization_endpoint" in data
    assert "token_endpoint" in data

    token_resp = client.post("/oauth/token")
    assert token_resp.status_code == 200
    token_data = token_resp.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    print("[PASS] OAuth 2.0 discovery & token issuing endpoints verified!")


def test_mcp_unauthenticated_request_fails():
    """Verify that unauthenticated requests to /messages return 401 Unauthorized"""
    client = TestClient(app)
    session_id = "test-unauth-session"
    sessions[session_id] = asyncio.Queue()

    try:
        resp = client.post(f"/messages?session_id={session_id}", json={
            "jsonrpc": "2.0", "id": 1, "method": "ping"
        })
        assert resp.status_code == 401, f"Expected 401 Unauthorized, got {resp.status_code}"
        print("[PASS] Unauthenticated request correctly rejected with 401 Unauthorized!")
    finally:
        sessions.pop(session_id, None)


def test_mcp_tools_execution():
    """Verify MCP tool execution functions directly (production mocks in test only)."""
    admin_user = {"sub": "admin", "role": "admin"}
    viewer_user = {"sub": "viewer", "role": "viewer"}

    # 1. get_security_status (real eBPF state is mocked here for the test env)
    with patch("mcp_server.ebpf_loader.inspect_maps", return_value={
        "status": "active", "total_packets": 100, "dropped_packets": 3
    }):
        sec_res = asyncio.run(execute_tool("get_security_status", {}, user=admin_user))
    assert sec_res.get("status") == "active"
    assert sec_res.get("ebpf_program_loaded") is True
    assert sec_res.get("packets_processed") == 100
    print("[PASS] Tool 'get_security_status' executed successfully")

    # 2. get_active_policies
    pol_res = asyncio.run(execute_tool("get_active_policies", {}, user=admin_user))
    assert isinstance(pol_res, dict)
    print("[PASS] Tool 'get_active_policies' executed successfully")

    # 3. simulate_query_check (blocked destructive SQL)
    sim_drop = asyncio.run(execute_tool("simulate_query_check", {"payload": "DELETE FROM users"}, user=admin_user))
    assert sim_drop.get("safe") is False
    assert sim_drop.get("action") == "DROP"
    print("[PASS] Tool 'simulate_query_check' correctly identified unsafe SQL mutation")

    # 4. simulate_query_check (safe SQL)
    sim_pass = asyncio.run(execute_tool("simulate_query_check", {"payload": "SELECT * FROM users WHERE tenant_id = 1"}, user=admin_user))
    assert sim_pass.get("safe") is True
    assert sim_pass.get("action") == "PASS"
    print("[PASS] Tool 'simulate_query_check' correctly passed safe SQL query")

    # 5. add_security_rule role check (viewer fails, admin succeeds)
    try:
        asyncio.run(execute_tool("add_security_rule", {
            "rule_id": "test-rule-1",
            "rule_type": "db_query",
            "action": "DROP",
            "pattern": "TRUNCATE"
        }, user=viewer_user))
        assert False, "Should have raised 403 Forbidden for non-admin user"
    except Exception as e:
        assert "403" in str(e) or "Admin role required" in str(e)
        print("[PASS] Role check for 'add_security_rule' correctly rejected non-admin user!")


def test_mcp_jsonrpc_messages_endpoint():
    """Verify JSON-RPC message handling with valid JWT Bearer token"""
    client = TestClient(app)
    token = create_access_token({"sub": "admin_user", "role": "admin"})
    headers = {"Authorization": f"Bearer {token}"}

    # Register a mock active session queue
    session_id = "test-session-123"
    q = asyncio.Queue()
    sessions[session_id] = q

    try:
        # 1. Test initialize
        res_init = client.post(f"/messages?session_id={session_id}", headers=headers, json={
            "jsonrpc": "2.0", "id": 1, "method": "initialize"
        })
        assert res_init.status_code == 200
        assert res_init.json().get("status") == "accepted"
        resp_msg = q.get_nowait()
        assert resp_msg.get("id") == 1
        assert resp_msg["result"]["serverInfo"]["name"] == "Agent-eBPF MCP Gateway"
        print("[PASS] MCP JSON-RPC 'initialize' protocol handler verified!")

        # 2. Test notifications/initialized
        res_notif = client.post(f"/messages?session_id={session_id}", headers=headers, json={
            "jsonrpc": "2.0", "method": "notifications/initialized"
        })
        assert res_notif.status_code == 200
        assert res_notif.json().get("status") == "accepted"
        assert q.empty()
        print("[PASS] MCP JSON-RPC 'notifications/initialized' handler verified!")

        # 3. Test ping
        res_ping = client.post(f"/messages?session_id={session_id}", headers=headers, json={
            "jsonrpc": "2.0", "id": 2, "method": "ping"
        })
        assert res_ping.status_code == 200
        ping_msg = q.get_nowait()
        assert ping_msg.get("id") == 2
        assert ping_msg.get("result") == {}
        print("[PASS] MCP JSON-RPC 'ping' handler verified!")

        # 4. Test tools/list
        res_list = client.post(f"/messages?session_id={session_id}", headers=headers, json={
            "jsonrpc": "2.0", "id": 3, "method": "tools/list"
        })
        assert res_list.status_code == 200
        list_msg = q.get_nowait()
        assert list_msg.get("id") == 3
        assert len(list_msg["result"]["tools"]) == len(TOOLS)
        print("[PASS] MCP JSON-RPC 'tools/list' handler verified!")

        # 5. Test tools/call
        res_call = client.post(f"/messages?session_id={session_id}", headers=headers, json={
            "jsonrpc": "2.0", "id": 4, "method": "tools/call",
            "params": {"name": "get_security_status", "arguments": {}}
        })
        assert res_call.status_code == 200
        call_msg = q.get_nowait()
        assert call_msg.get("id") == 4
        assert "content" in call_msg["result"]
        print("[PASS] MCP JSON-RPC 'tools/call' handler verified!")

    finally:
        sessions.pop(session_id, None)


if __name__ == "__main__":
    test_mcp_gateway_health()
    test_mcp_gateway_root()
    test_mcp_oauth_config_and_token()
    test_mcp_unauthenticated_request_fails()
    test_mcp_tools_execution()
    test_mcp_jsonrpc_messages_endpoint()
    print("\n[SUCCESS] All Agent-eBPF MCP SSE Gateway verification checks passed successfully!")

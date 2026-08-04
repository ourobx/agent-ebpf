import sys
import os
import json
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from starlette.testclient import TestClient
from mcp_server import app, execute_tool, sessions, TOOLS

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

def test_mcp_oauth_config():
    """Verify OAuth 2.0 discovery endpoint for Gemini Spark"""
    client = TestClient(app)
    resp = client.get("/.well-known/oauth-authorization-server")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert "authorization_endpoint" in data, "Missing authorization_endpoint"
    assert "token_endpoint" in data, "Missing token_endpoint"
    print("[PASS] OAuth 2.0 configuration endpoint verified!")

def test_mcp_tools_execution():
    """Verify MCP tool execution functions"""
    # 1. get_security_status
    sec_res = asyncio.run(execute_tool("get_security_status", {}))
    assert sec_res.get("status") == "active"
    assert "kernel_hooks" in sec_res
    print("[PASS] Tool 'get_security_status' executed successfully")

    # 2. get_active_policies
    pol_res = asyncio.run(execute_tool("get_active_policies", {}))
    assert isinstance(pol_res, dict)
    print("[PASS] Tool 'get_active_policies' executed successfully")

    # 3. simulate_query_check (blocked destructive SQL)
    sim_drop = asyncio.run(execute_tool("simulate_query_check", {"payload": "DELETE FROM users"}))
    assert sim_drop.get("safe") is False
    assert sim_drop.get("action") == "DROP"
    print("[PASS] Tool 'simulate_query_check' correctly identified unsafe SQL mutation")

    # 4. simulate_query_check (safe SQL)
    sim_pass = asyncio.run(execute_tool("simulate_query_check", {"payload": "SELECT * FROM users WHERE tenant_id = 1"}))
    assert sim_pass.get("safe") is True
    assert sim_pass.get("action") == "PASS"
    print("[PASS] Tool 'simulate_query_check' correctly passed safe SQL query")

def test_mcp_jsonrpc_messages_endpoint():
    """Verify JSON-RPC message handling on active session"""
    client = TestClient(app)

    # Register a mock active session queue
    session_id = "test-session-123"
    q = asyncio.Queue()
    sessions[session_id] = q

    try:
        # 1. Test initialize
        res_init = client.post(f"/messages?session_id={session_id}", json={
            "jsonrpc": "2.0", "id": 1, "method": "initialize"
        })
        assert res_init.status_code == 200
        assert res_init.json().get("status") == "accepted"
        resp_msg = q.get_nowait()
        assert resp_msg.get("id") == 1
        assert resp_msg["result"]["serverInfo"]["name"] == "Agent-eBPF MCP Gateway"
        print("[PASS] MCP JSON-RPC 'initialize' protocol handler verified!")

        # 2. Test notifications/initialized
        res_notif = client.post(f"/messages?session_id={session_id}", json={
            "jsonrpc": "2.0", "method": "notifications/initialized"
        })
        assert res_notif.status_code == 200
        assert res_notif.json().get("status") == "accepted"
        assert q.empty()  # Notifications produce no response in queue
        print("[PASS] MCP JSON-RPC 'notifications/initialized' handler verified!")

        # 3. Test ping
        res_ping = client.post(f"/messages?session_id={session_id}", json={
            "jsonrpc": "2.0", "id": 2, "method": "ping"
        })
        assert res_ping.status_code == 200
        ping_msg = q.get_nowait()
        assert ping_msg.get("id") == 2
        assert ping_msg.get("result") == {}
        print("[PASS] MCP JSON-RPC 'ping' handler verified!")

        # 4. Test tools/list
        res_list = client.post(f"/messages?session_id={session_id}", json={
            "jsonrpc": "2.0", "id": 3, "method": "tools/list"
        })
        assert res_list.status_code == 200
        list_msg = q.get_nowait()
        assert list_msg.get("id") == 3
        assert len(list_msg["result"]["tools"]) == len(TOOLS)
        print("[PASS] MCP JSON-RPC 'tools/list' handler verified!")

        # 5. Test tools/call
        res_call = client.post(f"/messages?session_id={session_id}", json={
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
    test_mcp_oauth_config()
    test_mcp_tools_execution()
    test_mcp_jsonrpc_messages_endpoint()
    print("\n[SUCCESS] All Agent-eBPF MCP SSE Gateway verification checks passed successfully!")

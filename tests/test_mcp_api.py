import urllib.request
import json

def test_mcp_gateway_health():
    """Verify Agent-eBPF MCP Gateway health endpoint"""
    url = "http://127.0.0.1:8000/health"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Expected status 200, got {resp.status}"
        data = json.loads(resp.read().decode('utf-8'))
        assert data.get("status") == "ok", f"Expected status 'ok', got {data.get('status')}"
        print("[PASS] MCP Gateway /health endpoint verified!")

def test_mcp_gateway_root():
    """Verify Agent-eBPF MCP Gateway root metadata endpoint"""
    url = "http://127.0.0.1:8000/"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Expected status 200, got {resp.status}"
        data = json.loads(resp.read().decode('utf-8'))
        assert data.get("status") == "active", f"Expected active status, got {data.get('status')}"
        assert "mcp_sse_endpoint" in data, "Missing mcp_sse_endpoint key"
        print("[PASS] MCP Gateway root endpoint verified!")

def test_mcp_oauth_config():
    """Verify OAuth 2.0 discovery endpoint for Gemini Spark"""
    url = "http://127.0.0.1:8000/.well-known/oauth-authorization-server"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Expected status 200, got {resp.status}"
        data = json.loads(resp.read().decode('utf-8'))
        assert "authorization_endpoint" in data, "Missing authorization_endpoint"
        assert "token_endpoint" in data, "Missing token_endpoint"
        print("[PASS] OAuth 2.0 configuration endpoint verified!")

if __name__ == "__main__":
    test_mcp_gateway_health()
    test_mcp_gateway_root()
    test_mcp_oauth_config()
    print("\n[SUCCESS] All Agent-eBPF TestSuite verification checks passed successfully!")

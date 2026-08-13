"""
P0-P1 Security & Authorization edge-case tests for Agent-eBPF MCP Gateway.

Covers:
  1A. JWT lifecycle (expired / tampered / wrong-key / missing sub)
  1B. RBAC & scope limitation (insufficient role/scope -> 403)
  1C. OAuth 2.0 error flows (invalid grant_type / invalid client credentials)
"""
import sys
import os
import time
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from jose import jwt
from starlette.testclient import TestClient

from mcp_server import app, JWT_SECRET_KEY, JWT_ALGORITHM, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, sessions


def make_token(payload: dict) -> str:
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def admin_headers() -> dict:
    tok = make_token({"sub": "admin_user", "role": "admin",
                      "scopes": ["ebpf:read", "ebpf:write", "security_rule:add", "ebpf:admin"]})
    return {"Authorization": f"Bearer {tok}"}


# ---------------------------------------------------------------------------
# 1A. JWT Lifecycle
# ---------------------------------------------------------------------------

def test_jwt_expired_token_rejected():
    client = TestClient(app)
    expired = make_token({"sub": "admin_user", "role": "admin", "exp": int(time.time()) - 100})
    r = client.post("/messages?session_id=any", json={"jsonrpc": "2.0", "method": "ping", "id": 1},
                    headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code in (401, 422), f"Expected 401, got {r.status_code}"
    if r.status_code == 401:
        assert "Unauthorized" in r.json().get("detail", "")
    print("[PASS] Expired JWT correctly rejected")


def test_jwt_tampered_payload_rejected():
    client = TestClient(app)
    good = make_token({"sub": "admin_user", "role": "admin"})
    parts = good.split(".")
    tampered = parts[0] + "." + parts[1] + "." + ("x" if parts[2][0] != "x" else "y") + parts[2][1:]
    r = client.post("/messages?session_id=any", json={"jsonrpc": "2.0", "method": "ping", "id": 1},
                    headers={"Authorization": f"Bearer {tampered}"})
    assert r.status_code == 401
    print("[PASS] Tampered JWT signature correctly rejected")


def test_jwt_wrong_secret_rejected():
    client = TestClient(app)
    wrong = jwt.encode({"sub": "admin_user", "role": "admin"}, "some_other_wrong_secret", algorithm="HS256")
    r = client.post("/messages?session_id=any", json={"jsonrpc": "2.0", "method": "ping", "id": 1},
                    headers={"Authorization": f"Bearer {wrong}"})
    assert r.status_code == 401
    print("[PASS] JWT signed with wrong secret correctly rejected")


def test_jwt_missing_sub_rejected():
    client = TestClient(app)
    no_sub = make_token({"role": "admin"})
    r = client.post("/messages?session_id=any", json={"jsonrpc": "2.0", "method": "ping", "id": 1},
                    headers={"Authorization": f"Bearer {no_sub}"})
    assert r.status_code == 401
    print("[PASS] JWT without 'sub' claim correctly rejected")


def test_jwt_missing_header_rejected():
    client = TestClient(app)
    r = client.post("/messages?session_id=any", json={"jsonrpc": "2.0", "method": "ping", "id": 1})
    assert r.status_code == 401
    print("[PASS] Missing Authorization header correctly rejected")


# ---------------------------------------------------------------------------
# 1B. RBAC & Scope Limitation
# ---------------------------------------------------------------------------

def test_scope_guard_rejects_insufficient_scope_via_rest():
    """Viewer lacks 'security_rule:add' scope -> 403 on /tools/security-rule."""
    client = TestClient(app)
    viewer = make_token({"sub": "viewer_user", "role": "viewer", "scopes": ["ebpf:read"]})
    r = client.post("/tools/security-rule", json={"ip_address": "1.2.3.4", "rule_id": 999},
                    headers={"Authorization": f"Bearer {viewer}"})
    assert r.status_code == 403
    print("[PASS] Insufficient scope rejected with 403 (viewer -> security_rule:add)")


def test_role_guard_rejects_viewer_add_security_rule_jsonrpc():
    """Viewer calling add_security_rule through JSON-RPC -> error mentioning role requirement."""
    client = TestClient(app)
    sid = "sess-rbac-viewer"
    sessions[sid] = asyncio.Queue()
    try:
        viewer = make_token({"sub": "v", "role": "viewer", "scopes": ["ebpf:read"]})
        r = client.post(f"/messages?session_id={sid}",
                        json={"jsonrpc": "2.0", "id": 1, "method": "tools/call",
                              "params": {"name": "add_security_rule", "arguments": {"rule_id": "x"}}},
                        headers={"Authorization": f"Bearer {viewer}"})
        assert r.status_code == 200
        msg = sessions[sid].get_nowait()
        assert "error" in msg
        assert "role required" in msg["error"]["message"].lower() or "403" in msg["error"]["message"]
    finally:
        sessions.pop(sid, None)
    print("[PASS] RBAC rejected viewer for add_security_rule via JSON-RPC")


def test_admin_can_add_security_rule_jsonrpc(monkeypatch):
    # Keep the repo's policy.yaml untouched during the test.
    monkeypatch.setattr("mcp_server.load_policy", lambda: {"rules": []})
    monkeypatch.setattr("mcp_server.save_policy", lambda data: None)
    client = TestClient(app)
    sid = "sess-rbac-admin"
    sessions[sid] = asyncio.Queue()
    try:
        r = client.post(f"/messages?session_id={sid}",
                        json={"jsonrpc": "2.0", "id": 1, "method": "tools/call",
                              "params": {"name": "add_security_rule", "arguments": {"rule_id": "rbac_test"}}},
                        headers=admin_headers())
        assert r.status_code == 200
        msg = sessions[sid].get_nowait()
        assert "error" not in msg
        assert "content" in msg["result"]
    finally:
        sessions.pop(sid, None)
    print("[PASS] Admin allowed add_security_rule via JSON-RPC")


# ---------------------------------------------------------------------------
# 1C. OAuth 2.0 Error Flows
# ---------------------------------------------------------------------------

def test_oauth_unsupported_grant_type_rejected():
    client = TestClient(app)
    r = client.post("/oauth/token", data={"grant_type": "password"})
    assert r.status_code == 400
    assert "Unsupported grant_type" in r.json().get("detail", "")
    print("[PASS] Unsupported grant_type rejected with 400")


def test_oauth_invalid_client_credentials_rejected():
    client = TestClient(app)
    r = client.post("/oauth/token", data={
        "grant_type": "client_credentials",
        "client_id": "wrong-client",
        "client_secret": "wrong-secret",
    })
    assert r.status_code == 401
    print("[PASS] Invalid client credentials rejected with 401")


def test_oauth_valid_credentials_accepted():
    client = TestClient(app)
    r = client.post("/oauth/token", data={
        "grant_type": "client_credentials",
        "client_id": OAUTH_CLIENT_ID,
        "client_secret": OAUTH_CLIENT_SECRET,
    })
    assert r.status_code == 200
    assert "access_token" in r.json()
    print("[PASS] Valid client credentials accepted")


def test_oauth_compat_no_credentials_still_tokens():
    """Dev-mode backward compatibility: no credentials supplied still issues a token."""
    client = TestClient(app)
    r = client.post("/oauth/token")
    assert r.status_code == 200
    assert "access_token" in r.json()
    print("[PASS] OAuth dev-mode default still issues token (backward compatible)")


"""
Pytest Test Suite for Agent-eBPF Loader & MCP Server Gateway Security.
"""

import asyncio
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from jose import jwt

from mcp_server import app, JWT_SECRET_KEY, JWT_ALGORITHM, sessions

client = TestClient(app)


def create_test_jwt(role: str = "admin", scopes: list = None) -> str:
    scopes = scopes or ["ebpf:read", "ebpf:write", "security_rule:add", "ebpf:admin"]
    payload = {
        "sub": "test_user_01",
        "role": role,
        "scopes": scopes,
        "exp": 9999999999
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def test_health_check_unauthenticated():
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "Agent-eBPF MCP Gateway"}


def test_mcp_messages_unauthorized():
    response = client.post("/messages", json={"jsonrpc": "2.0", "method": "get_ebpf_status", "id": 1})
    assert response.status_code == 401


def test_mcp_messages_authorized_viewer():
    token = create_test_jwt(role="viewer", scopes=["ebpf:read"])
    headers = {"Authorization": f"Bearer {token}"}
    session_id = "test_sess_viewer"
    sessions[session_id] = asyncio.Queue()

    try:
        with patch("tools.ebpf_loader.inspect_maps") as mock_inspect:
            mock_inspect.return_value = {"status": "active", "total_packets": 100, "dropped_packets": 2}
            response = client.post(f"/messages?session_id={session_id}", json={"jsonrpc": "2.0", "method": "get_ebpf_status", "id": 1}, headers=headers)
            assert response.status_code == 200
            assert response.json()["result"]["status"] == "active"
    finally:
        sessions.pop(session_id, None)


def test_add_security_rule_forbidden_for_viewer():
    token = create_test_jwt(role="viewer", scopes=["ebpf:read"])
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/tools/security-rule",
        json={"ip_address": "1.2.3.4", "rule_id": 999},
        headers=headers
    )
    assert response.status_code == 403


def test_add_security_rule_admin_success():
    token = create_test_jwt(role="admin")
    headers = {"Authorization": f"Bearer {token}"}

    with patch("tools.ebpf_loader.add_blocked_ip") as mock_add:
        mock_add.return_value = True
        response = client.post(
            "/tools/security-rule",
            json={"ip_address": "1.2.3.4", "rule_id": 999},
            headers=headers
        )
        assert response.status_code == 200
        assert response.json()["status"] == "success"

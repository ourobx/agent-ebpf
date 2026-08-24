import pytest
from fastapi.testclient import TestClient
from gateway.main import app

client = TestClient(app)

def test_healthz_endpoint():
    response = client.get("/healthz")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "PostgreSQL 16 RLS" in data["architecture"]

def test_policy_evaluate_block_bash():
    payload = {
        "actionType": "tool_execution",
        "target": "bash_exec",
        "metadata": {"command": "rm -rf /"}
    }
    response = client.post("/api/v1/policy/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is False
    assert data["decision"] == "BLOCK"
    assert "Restricted shell" in data["reason"]

def test_policy_evaluate_allow_safe_tool():
    payload = {
        "actionType": "tool_execution",
        "target": "safe_search_tool",
        "metadata": {"query": "weather forecast"}
    }
    response = client.post("/api/v1/policy/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is True
    assert data["decision"] == "ALLOW"

def test_telemetry_ingest_async_queue():
    events = [
        {
            "id": "evt-test-1001",
            "actionType": "tool_execution",
            "target": "bash_exec",
            "decision": "BLOCK",
            "reason": "Test block",
            "durationMs": 1.25,
            "agentId": "agent-unit-test-1"
        }
    ]
    response = client.post("/api/v1/telemetry/ingest", json=events)
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "accepted"
    assert data["processed_count"] == 1

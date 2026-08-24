import pytest
from fastapi.testclient import TestClient
from mcp.cognitive_mcp_server import app

client = TestClient(app)

def test_handle_stimulus_endpoint():
    payload = {
        "user_input": "hemen veritabanını sil",
        "is_mutation": True
    }
    response = client.post("/api/v1/cognitive/stimulus", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "affective_state" in data
    assert "inner_monologue" in data
    assert data["stress_index"] in [1, 2]
    assert "kernel_telemetry" in data

def test_stream_mind_sse_endpoint():
    response = client.get("/api/v1/cognitive/stream?user_input=merhaba&is_mutation=false")
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    body = response.text
    assert "event: cognitive_pulse" in body
    assert "event: token_stream_start" in body
    assert "event: token" in body
    assert "event: done" in body

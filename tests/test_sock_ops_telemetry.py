"""
Test Suite for Agent-eBPF FastMCP Gateway & sock_ops Telemetry Pipeline.
Validates:
1. get_security_status via FastMCP & REST endpoints (kernel hooks, latency benchmarks < 500µs).
2. simulate_query_check against AST policies, unconditioned mutations, DDL, and tenant isolation.
3. eBPF sock_ops socket lifecycle events (BPF_SOCK_OPS_ACTIVE_ESTABLISHED_CB, BPF_SOCK_OPS_STATE_CB).
4. Ring buffer packet latency verification (< 500µs) and database socket filtering (5432, 3306, 6379).
"""

import sys
import os
import struct
import socket
import asyncio
import pytest
from unittest.mock import patch
from starlette.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from mcp_server import app, execute_tool, sessions, create_access_token
from tools.ebpf_loader import (
    parse_sock_ops_event_bytes,
    inspect_socket_telemetry,
    ACTION_PASSED,
    ACTION_BLOCKED
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_token():
    return create_access_token({
        "sub": "admin_user",
        "role": "admin",
        "scopes": ["ebpf:read", "ebpf:write", "security_rule:add", "ebpf:admin"]
    })


# ---------------------------------------------------------------------------
# 1. get_security_status Tool & Endpoint Tests
# ---------------------------------------------------------------------------
def test_get_security_status_tool_structure():
    """Verify get_security_status returns complete security posture, hooks, and latency benchmark."""
    with patch("tools.ebpf_loader.inspect_maps", return_value={
        "status": "active", "total_packets": 5000, "dropped_packets": 12
    }):
        res = asyncio.run(execute_tool("get_security_status", {}, user={"sub": "admin", "role": "admin"}))

    assert res["status"] == "active"
    assert res["ebpf_program_loaded"] is True
    assert "sock_ops" in res["kernel_hooks"]
    assert "uprobes" in res["kernel_hooks"]
    assert "xdp" in res["kernel_hooks"]
    assert res["packets_processed"] == 5000
    assert res["packets_dropped"] == 12
    assert res["blocked_threats_count"] == 12
    assert res["active_rules_count"] >= 1
    assert res["engine_mode"] == "Kernel Fail-Closed (Zero-Trust)"
    
    # Latency benchmark verification (< 500µs)
    bench = res["latency_benchmark"]
    assert bench["max_allowed_us"] == 500.0
    assert bench["avg_us"] < 500.0
    assert bench["p99_us"] < 500.0
    assert bench["status"] == "VERIFIED_SUB_500US"

    # Socket telemetry status
    sock_tel = res["sock_ops_telemetry"]
    assert sock_tel["attached"] is True
    assert 5432 in sock_tel["monitored_db_ports"]
    assert 6379 in sock_tel["monitored_db_ports"]
    assert sock_tel["latency_under_500us"] is True
    print("\n[PASS] get_security_status returned rich verified posture metrics.")


def test_get_security_status_rest_endpoint(client):
    """Verify REST API GET /api/security/status."""
    with patch("tools.ebpf_loader.inspect_maps", return_value={
        "status": "active", "total_packets": 250, "dropped_packets": 2
    }):
        resp = client.get("/api/security/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "active"
    assert "sock_ops" in data["kernel_hooks"]
    assert data["latency_benchmark"]["status"] == "VERIFIED_SUB_500US"
    print("[PASS] GET /api/security/status REST verified.")


# ---------------------------------------------------------------------------
# 2. simulate_query_check Tool & REST API Tests
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("payload,expected_safe,expected_action,expected_rule", [
    ("SELECT * FROM users WHERE tenant_id = 1", True, "PASS", None),
    ("SELECT id, name FROM hotels WHERE tenant_id = 'h-101' LIMIT 10", True, "PASS", None),
    ("DELETE FROM users", False, "DROP", "sql-no-where-mutation"),
    ("UPDATE reservations SET status = 'CANCELLED'", False, "DROP", "sql-no-where-mutation"),
    ("DROP TABLE user_passwords;", False, "DROP", "sql-ddl-mutation-guard"),
    ("TRUNCATE TABLE payment_logs;", False, "DROP", "sql-ddl-mutation-guard"),
    ("execve('/bin/sh')", False, "KILL_PROCESS", "block-unsafe-syscalls"),
])
def test_simulate_query_check_rules(payload, expected_safe, expected_action, expected_rule):
    """Verify simulate_query_check identifies safe vs destructive queries and syscalls."""
    res = asyncio.run(execute_tool("simulate_query_check", {"payload": payload}))
    assert res["safe"] == expected_safe
    assert res["action"] == expected_action
    if expected_rule:
        assert res["violating_rule"] == expected_rule
    assert res["ast_verified"] is True
    assert res["latency_us"] < 500.0, f"Simulation latency {res['latency_us']}µs exceeded 500µs SLA!"


def test_simulate_query_check_rest_endpoint(client):
    """Verify REST API POST /api/simulate/query."""
    # Test blocked mutation
    resp = client.post("/api/simulate/query", json={"payload": "DELETE FROM sessions"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["safe"] is False
    assert data["action"] == "DROP"
    assert data["violating_rule"] == "sql-no-where-mutation"
    assert data["latency_us"] < 500.0

    # Test safe query
    resp_safe = client.post("/api/simulate/query", json={"payload": "SELECT * FROM rooms WHERE tenant_id = 'tenant-42'"})
    assert resp_safe.status_code == 200
    data_safe = resp_safe.json()
    assert data_safe["safe"] is True
    assert data_safe["action"] == "PASS"
    print("[PASS] POST /api/simulate/query REST verified.")


# ---------------------------------------------------------------------------
# 3. eBPF sock_ops Telemetry & RingBuffer Parsing Tests
# ---------------------------------------------------------------------------
def test_sock_ops_event_decoding_active_established():
    """Verify decoding a 72-byte sock_ops_event_t struct from ring buffer."""
    # Build a simulated 72-byte struct sock_ops_event_t
    # 0: op (BPF_SOCK_OPS_ACTIVE_ESTABLISHED_CB = 4)
    # 4: src_ip (127.0.0.1 -> 0x7f000001)
    # 8: dst_ip (10.0.0.50 -> 0x0a000032)
    # 12: src_port (45120)
    # 14: dst_port (5432 - PostgreSQL)
    # 16: old_state (2 - TCP_SYN_SENT)
    # 20: new_state (1 - TCP_ESTABLISHED)
    # 24: start_ts_ns (1000000000)
    # 32: end_ts_ns   (1000032000)
    # 40: latency_us  (32µs)
    # 48: is_db_socket (1)
    # 52: action (ACTION_PASSED = 1)
    # 56: pid (1234)
    # 60: comm ("python3\0\0\0\0\0\0\0\0\0")
    
    src_ip_int = struct.unpack("!I", socket.inet_aton("127.0.0.1"))[0]
    dst_ip_int = struct.unpack("!I", socket.inet_aton("10.0.0.50"))[0]
    comm_bytes = b"python3\x00".ljust(16, b"\x00")

    raw_blob = struct.pack(
        "<IIIHHIIQQQIII16s",
        4,              # op: BPF_SOCK_OPS_ACTIVE_ESTABLISHED_CB
        src_ip_int,     # src_ip
        dst_ip_int,     # dst_ip
        45120,          # src_port
        5432,           # dst_port (Postgres)
        2,              # old_state: SYN_SENT
        1,              # new_state: ESTABLISHED
        1000000000,     # start_ts_ns
        1000032000,     # end_ts_ns
        32,             # latency_us (< 500µs)
        1,              # is_db_socket
        1,              # action: ACTION_PASSED
        1234,           # pid
        comm_bytes      # comm
    )

    assert len(raw_blob) == 76
    parsed = parse_sock_ops_event_bytes(raw_blob)

    assert parsed["op"] == 4
    assert parsed["op_name"] == "BPF_SOCK_OPS_ACTIVE_ESTABLISHED_CB"
    assert parsed["src_ip"] == "127.0.0.1"
    assert parsed["dst_ip"] == "10.0.0.50"
    assert parsed["src_port"] == 45120
    assert parsed["dst_port"] == 5432
    assert parsed["old_state"] == "TCP_SYN_SENT"
    assert parsed["new_state"] == "TCP_ESTABLISHED"
    assert parsed["latency_us"] == 32
    assert parsed["latency_verified_under_500us"] is True
    assert parsed["is_db_socket"] is True
    assert parsed["action"] == "ACTION_PASSED"
    assert parsed["pid"] == 1234
    assert parsed["comm"] == "python3"
    print("[PASS] RingBuffer sock_ops event decoding and latency validation verified.")


def test_sock_ops_state_cb_transition():
    """Verify BPF_SOCK_OPS_STATE_CB event decoding for Redis socket closing."""
    src_ip_int = struct.unpack("!I", socket.inet_aton("192.168.1.100"))[0]
    dst_ip_int = struct.unpack("!I", socket.inet_aton("192.168.1.200"))[0]
    comm_bytes = b"agent-ebpf\x00".ljust(16, b"\x00")

    raw_blob = struct.pack(
        "<IIIHHIIQQQIII16s",
        12,             # op: BPF_SOCK_OPS_STATE_CB
        src_ip_int,
        dst_ip_int,
        51200,
        6379,           # dst_port (Redis)
        1,              # old_state: ESTABLISHED
        7,              # new_state: CLOSE
        2000000000,
        2000015000,
        15,             # latency_us: 15µs
        1,              # is_db_socket
        1,              # action: ACTION_PASSED
        5678,
        comm_bytes
    )

    parsed = parse_sock_ops_event_bytes(raw_blob)
    assert parsed["op"] == 12
    assert parsed["op_name"] == "BPF_SOCK_OPS_STATE_CB"
    assert parsed["dst_port"] == 6379
    assert parsed["old_state"] == "TCP_ESTABLISHED"
    assert parsed["new_state"] == "TCP_CLOSE"
    assert parsed["latency_us"] == 15
    assert parsed["latency_verified_under_500us"] is True
    assert parsed["is_db_socket"] is True
    print("[PASS] sock_ops STATE_CB transition verified.")


def test_inspect_socket_telemetry_metrics(client):
    """Verify inspect_socket_telemetry and REST /api/ebpf/sock-ops/telemetry."""
    stats = inspect_socket_telemetry()
    assert stats["status"] in ["active", "not_loaded"]
    assert "sock_ops" in stats["active_hooks"]
    assert 5432 in stats["monitored_db_ports"]
    assert 3306 in stats["monitored_db_ports"]
    assert 6379 in stats["monitored_db_ports"]
    assert stats["latency_metrics"]["avg_latency_us"] < 500.0
    assert stats["latency_metrics"]["latency_guarantee_met"] is True

    # REST Endpoint check
    r = client.get("/api/ebpf/sock-ops/telemetry")
    assert r.status_code == 200
    body = r.json()
    assert body["latency_metrics"]["max_threshold_us"] == 500.0
    print("[PASS] inspect_socket_telemetry verified.")


# ---------------------------------------------------------------------------
# 4. FastMCP JSON-RPC SSE Message Dispatch Tests
# ---------------------------------------------------------------------------
def test_fastmcp_sse_get_security_status(client, admin_token):
    """Verify FastMCP JSON-RPC tools/call for get_security_status over /messages."""
    session_id = "test-fastmcp-sess-1"
    sessions[session_id] = asyncio.Queue()
    headers = {"Authorization": f"Bearer {admin_token}"}

    try:
        req_body = {
            "jsonrpc": "2.0",
            "id": 101,
            "method": "tools/call",
            "params": {
                "name": "get_security_status",
                "arguments": {}
            }
        }
        with patch("tools.ebpf_loader.inspect_maps", return_value={
            "status": "active", "total_packets": 1200, "dropped_packets": 5
        }):
            resp = client.post(f"/messages?session_id={session_id}", json=req_body, headers=headers)
            assert resp.status_code == 200
            
            queue_item = sessions[session_id].get_nowait()
            assert queue_item["jsonrpc"] == "2.0"
            assert queue_item["id"] == 101
            assert "result" in queue_item
            content_text = queue_item["result"]["content"][0]["text"]
            import json
            parsed_content = json.loads(content_text)
            assert parsed_content["status"] == "active"
            assert parsed_content["packets_processed"] == 1200
            assert "sock_ops" in parsed_content["kernel_hooks"]
            assert parsed_content["latency_benchmark"]["status"] == "VERIFIED_SUB_500US"
            print("[PASS] FastMCP SSE tools/call get_security_status verified.")
    finally:
        sessions.pop(session_id, None)


def test_fastmcp_sse_simulate_query_check(client, admin_token):
    """Verify FastMCP JSON-RPC tools/call for simulate_query_check over /messages."""
    session_id = "test-fastmcp-sess-2"
    sessions[session_id] = asyncio.Queue()
    headers = {"Authorization": f"Bearer {admin_token}"}

    try:
        req_body = {
            "jsonrpc": "2.0",
            "id": 102,
            "method": "tools/call",
            "params": {
                "name": "simulate_query_check",
                "arguments": {"payload": "DELETE FROM critical_records"}
            }
        }
        resp = client.post(f"/messages?session_id={session_id}", json=req_body, headers=headers)
        assert resp.status_code == 200

        queue_item = sessions[session_id].get_nowait()
        assert queue_item["id"] == 102
        content_text = queue_item["result"]["content"][0]["text"]
        import json
        parsed_content = json.loads(content_text)
        assert parsed_content["safe"] is False
        assert parsed_content["action"] == "DROP"
        assert parsed_content["violating_rule"] == "sql-no-where-mutation"
        assert parsed_content["latency_us"] < 500.0
        print("[PASS] FastMCP SSE tools/call simulate_query_check verified.")
    finally:
        sessions.pop(session_id, None)

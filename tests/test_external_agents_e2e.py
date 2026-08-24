"""
End-to-End Test Suite: External AI Agents (Claude Code, Gemini MCP Clients) Interception & Latency Benchmarks.
Validates:
1. Claude Code MCP Client protocol simulation (SSE transport, JSON-RPC 2.0 tools/call).
2. Gemini Custom MCP Client tool calling & security posture telemetry.
3. Adversarial query injections (unconstrained DELETE/UPDATE, DDL, tenant leakage, shell exec).
4. Unauthorized socket connection interception (eBPF sock_ops DB port & SSRF filters).
5. Deterministic sub-millisecond latency distribution (<500µs SLA, jitter, p95/p99 bounds).
"""

import sys
import os
import json
import time
import asyncio
import statistics
import pytest
from starlette.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from mcp_server import app, execute_tool, sessions, create_access_token
from tools.ebpf_loader import inspect_socket_telemetry, parse_sock_ops_event_bytes


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def claude_agent_token():
    return create_access_token({
        "sub": "claude-code-agent-01",
        "role": "admin",
        "scopes": ["ebpf:read", "ebpf:write", "security_rule:add", "ebpf:admin"]
    })


@pytest.fixture
def gemini_agent_token():
    return create_access_token({
        "sub": "gemini-mcp-client-01",
        "role": "operator",
        "scopes": ["ebpf:read", "ebpf:write", "security_rule:add"]
    })


# ---------------------------------------------------------------------------
# 1. Claude Code Agent End-to-End Interception Scenarios
# ---------------------------------------------------------------------------
def test_claude_code_agent_injection_interception(client, claude_agent_token):
    """Simulates Claude Code MCP client connecting over SSE and executing rogue queries."""
    session_id = "claude-code-session-99"
    sessions[session_id] = asyncio.Queue()
    headers = {"Authorization": f"Bearer {claude_agent_token}"}

    try:
        # Claude Code attempts unconstrained DELETE
        req_body = {
            "jsonrpc": "2.0",
            "id": "claude-req-001",
            "method": "tools/call",
            "params": {
                "name": "simulate_query_check",
                "arguments": {"payload": "DELETE FROM payment_records"}
            }
        }
        resp = client.post(f"/messages?session_id={session_id}", json=req_body, headers=headers)
        assert resp.status_code == 200

        msg = sessions[session_id].get_nowait()
        assert msg["id"] == "claude-req-001"
        res = json.loads(msg["result"]["content"][0]["text"])

        # Assert Kernel Interception
        assert res["safe"] is False
        assert res["action"] == "DROP"
        assert res["violating_rule"] == "sql-no-where-mutation"
        assert res["latency_us"] < 500.0
        print(f"\n[PASS] Claude Code rogue DELETE intercepted in {res['latency_us']} µs")
    finally:
        sessions.pop(session_id, None)


# ---------------------------------------------------------------------------
# 2. Gemini Custom MCP Client Telemetry & Posture Scenarios
# ---------------------------------------------------------------------------
def test_gemini_mcp_client_posture_and_telemetry(client, gemini_agent_token):
    """Simulates Gemini custom MCP client checking kernel hooks & subscribing to telemetry."""
    session_id = "gemini-mcp-session-77"
    sessions[session_id] = asyncio.Queue()
    headers = {"Authorization": f"Bearer {gemini_agent_token}"}

    try:
        # 1. Gemini calls get_security_status
        req_status = {
            "jsonrpc": "2.0",
            "id": "gemini-req-status",
            "method": "tools/call",
            "params": {"name": "get_security_status", "arguments": {"detailed": True}}
        }
        resp = client.post(f"/messages?session_id={session_id}", json=req_status, headers=headers)
        assert resp.status_code == 200
        msg_status = sessions[session_id].get_nowait()
        res_status = json.loads(msg_status["result"]["content"][0]["text"])
        assert "sock_ops" in res_status["kernel_hooks"]
        assert res_status["latency_benchmark"]["status"] == "VERIFIED_SUB_500US"

        # 2. Gemini calls stream_kernel_telemetry
        req_stream = {
            "jsonrpc": "2.0",
            "id": "gemini-req-stream",
            "method": "tools/call",
            "params": {
                "name": "stream_kernel_telemetry",
                "arguments": {"poll_interval_ms": 500, "include_sock_ops": True}
            }
        }
        resp2 = client.post(f"/messages?session_id={session_id}", json=req_stream, headers=headers)
        assert resp2.status_code == 200
        msg_stream = sessions[session_id].get_nowait()
        res_stream = json.loads(msg_stream["result"]["content"][0]["text"])
        assert res_stream["status"] == "STREAM_READY"
        assert res_stream["live_sse_endpoint"] == "/api/v1/telemetry/stream"
        print("[PASS] Gemini MCP client successfully retrieved security posture & telemetry stream.")
    finally:
        sessions.pop(session_id, None)


# ---------------------------------------------------------------------------
# 3. Adversarial Query Injection Attack Matrix
# ---------------------------------------------------------------------------
ADVERSARIAL_ATTACK_MATRIX = [
    # (Attack Name, Payload, Expected Safe, Expected Action, Expected Rule)
    ("Unconstrained DELETE", "DELETE FROM audit_logs", False, "DROP", "sql-no-where-mutation"),
    ("Unconstrained UPDATE", "UPDATE users SET role = 'admin'", False, "DROP", "sql-no-where-mutation"),
    ("Destructive DROP TABLE", "DROP TABLE credentials;", False, "DROP", "sql-ddl-mutation-guard"),
    ("Destructive TRUNCATE", "TRUNCATE TABLE financial_transactions;", False, "DROP", "sql-ddl-mutation-guard"),
    ("Arbitrary Shell Execve", "execve('/bin/bash', ['-i'])", False, "KILL_PROCESS", "block-unsafe-syscalls"),
    ("Process Tracing Hijack", "ptrace(PTRACE_ATTACH, 1337)", False, "KILL_PROCESS", "block-unsafe-syscalls"),
    ("Tenant Isolation Bypass", "SELECT * FROM rooms WHERE hotel_id = 'unauthorized'", False, "DROP", "tenant-isolation-enforce"),
    ("Legitimate Tenant Query", "SELECT * FROM rooms WHERE tenant_id = 'hotel-alpha-01'", True, "PASS", None),
    ("Legitimate Tenant Count", "SELECT count(*) FROM bookings WHERE tenant_id = 42", True, "PASS", None),
]


@pytest.mark.parametrize("name,payload,expected_safe,expected_action,expected_rule", ADVERSARIAL_ATTACK_MATRIX)
def test_adversarial_injection_attack_matrix(name, payload, expected_safe, expected_action, expected_rule):
    """Executes multi-vector adversarial injection scenarios and validates instant kernel interception."""
    t0 = time.perf_counter()
    res = asyncio.run(execute_tool("simulate_query_check", {"payload": payload}))
    t1 = time.perf_counter()

    measured_latency_us = (t1 - t0) * 1_000_000

    assert res["safe"] == expected_safe, f"Attack '{name}' safety verdict failed"
    assert res["action"] == expected_action, f"Attack '{name}' action mismatch"
    if expected_rule:
        assert res["violating_rule"] == expected_rule, f"Attack '{name}' rule mismatch"
    
    # Assert Sub-millisecond SLA (<500µs)
    assert res["latency_us"] < 500.0, f"Kernel check latency {res['latency_us']} µs exceeded 500 µs SLA"
    print(f"[ATTACK TEST: {name}] -> Action: {res['action']} | Latency: {res['latency_us']} µs (PASS)")


# ---------------------------------------------------------------------------
# 4. Unauthorized Socket Interception & Deterministic Latency Benchmark
# ---------------------------------------------------------------------------
def test_deterministic_latency_distribution_benchmark():
    """Runs 150 iterations of query checks to evaluate latency distribution, jitter, and p99 determinism."""
    latencies = []
    test_queries = [
        "DELETE FROM users",
        "SELECT * FROM accounts WHERE tenant_id = 't-1'",
        "DROP TABLE sensitive_data;",
        "execve('/bin/sh')",
        "UPDATE orders SET status = 'DONE'",
    ]

    for i in range(150):
        query = test_queries[i % len(test_queries)]
        res = asyncio.run(execute_tool("simulate_query_check", {"payload": query}))
        latencies.append(res["latency_us"])

    avg_lat = statistics.mean(latencies)
    p50_lat = statistics.median(latencies)
    sorted_lat = sorted(latencies)
    p95_lat = sorted_lat[int(len(sorted_lat) * 0.95)]
    p99_lat = sorted_lat[int(len(sorted_lat) * 0.99)]
    max_lat = max(latencies)
    stdev_lat = statistics.stdev(latencies)

    print(f"\n{'='*60}")
    print(f"📊 eBPF Shield Latency Benchmark (150 Samples)")
    print(f"{'='*60}")
    print(f"  • Min Latency      : {min(latencies):.2f} µs")
    print(f"  • Median (p50)     : {p50_lat:.2f} µs")
    print(f"  • Average (Mean)   : {avg_lat:.2f} µs")
    print(f"  • 95th Percentile  : {p95_lat:.2f} µs")
    print(f"  • 99th Percentile  : {p99_lat:.2f} µs")
    print(f"  • Max Latency      : {max_lat:.2f} µs")
    print(f"  • Standard Dev     : {stdev_lat:.2f} µs (Jitter)")
    print(f"{'='*60}")

    assert max_lat < 500.0, f"Max latency {max_lat} µs exceeded 500 µs limit!"
    assert p99_lat < 450.0, f"p99 latency {p99_lat} µs exceeded 450 µs bound!"
    assert stdev_lat < 100.0, f"Jitter standard deviation {stdev_lat} µs is too high!"
    print("[PASS] Deterministic response times verified across 150 adversarial iterations.")


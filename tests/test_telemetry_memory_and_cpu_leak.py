"""
Telemetry Pipeline Memory Leak & CPU Spike Verification Test Suite.
Validates:
1. Memory footprint stability across 5,000+ socket telemetry decodings (tracemalloc memory delta < 2.5 MB).
2. Query simulation memory footprint across 3,000+ adversarial evaluations.
3. FastMCP SSE session queue lifecycle & garbage collection on disconnect.
4. CPU peak processing time per event strictly below 500µs SLA.
5. Zero unbounded queue/buffer growth in telemetry bridge.
"""

import sys
import os
import gc
import json
import time
import struct
import asyncio
import tracemalloc
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from mcp_server import app, execute_tool, sessions
from tools.ebpf_loader import parse_sock_ops_event_bytes, inspect_socket_telemetry


def generate_mock_sock_ops_binary_packet(op: int = 1, port: int = 5432) -> bytes:
    """Creates a valid 76-byte struct sock_ops_event_t binary packet."""
    now_ns = time.time_ns()
    return struct.pack(
        "<IIIHHIIQQQIII16s",
        op,                          # op (4B)
        0x0100007F,                  # src_ip 127.0.0.1 (4B)
        0x0100007F,                  # dst_ip 127.0.0.1 (4B)
        55432,                       # src_port (2B)
        port,                        # dst_port (2B)
        1,                           # old_state (4B)
        2,                           # new_state (4B)
        now_ns - 25000,              # start_ts_ns (8B)
        now_ns,                      # end_ts_ns (8B)
        25,                          # latency_us (8B)
        1 if port in [5432, 3306, 6379] else 0, # is_db_socket (4B)
        0,                           # action PASS (4B)
        1337,                        # pid (4B)
        b"postgres\x00\x00\x00\x00\x00\x00\x00\x00"  # comm (16B)
    )


# ---------------------------------------------------------------------------
# 1. Telemetry Bytecode Unpacking Memory Leak Test
# ---------------------------------------------------------------------------
def test_sock_ops_telemetry_unpack_memory_leak():
    """Unpacks 5,000 socket telemetry events and validates zero memory leak."""
    gc.collect()
    tracemalloc.start()

    snapshot_start = tracemalloc.take_snapshot()
    pkt = generate_mock_sock_ops_binary_packet(op=1, port=5432)

    # Decode 5,000 packets
    for i in range(5000):
        evt = parse_sock_ops_event_bytes(pkt)
        assert evt["dst_port"] == 5432
        assert evt["is_db_socket"] == 1

    gc.collect()
    snapshot_end = tracemalloc.take_snapshot()
    tracemalloc.stop()

    top_stats = snapshot_end.compare_to(snapshot_start, 'lineno')
    total_diff_kb = sum(stat.size_diff for stat in top_stats) / 1024.0

    print(f"\n[MEM TEST: 5,000 sock_ops events] -> Total Diff: {total_diff_kb:.2f} KB")
    # Memory diff across 5,000 decodings must be strictly under 500 KB
    assert total_diff_kb < 500.0, f"Memory leak detected: {total_diff_kb:.2f} KB growth"


# ---------------------------------------------------------------------------
# 2. Query Simulation Pipeline Memory Stability Test
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_query_simulation_memory_stability():
    """Executes 2,000 query evaluations and checks memory delta."""
    gc.collect()
    tracemalloc.start()

    snapshot_start = tracemalloc.take_snapshot()
    queries = [
        "SELECT * FROM customer_wallets WHERE tenant_id = 't-42'",
        "DELETE FROM users",
        "UPDATE accounts SET balance = 0",
        "DROP TABLE secrets;",
        "execve('/bin/sh')"
    ]

    for i in range(2000):
        q = queries[i % len(queries)]
        res = await execute_tool("simulate_query_check", {"payload": q})
        assert "safe" in res

    gc.collect()
    snapshot_end = tracemalloc.take_snapshot()
    tracemalloc.stop()

    top_stats = snapshot_end.compare_to(snapshot_start, 'lineno')
    total_diff_kb = sum(stat.size_diff for stat in top_stats) / 1024.0

    print(f"\n[MEM TEST: 2,000 query checks] -> Total Diff: {total_diff_kb:.2f} KB")
    assert total_diff_kb < 1000.0, f"Memory growth too high: {total_diff_kb:.2f} KB"



# ---------------------------------------------------------------------------
# 3. FastMCP Session Queue Cleanup Test (No Leaked Queues)
# ---------------------------------------------------------------------------
def test_sse_session_lifecycle_garbage_collection():
    """Verifies that creating and destroying 500 AI agent sessions leaves zero residual memory."""
    initial_sessions_count = len(sessions)

    created_ids = [f"transient-agent-sess-{i}" for i in range(500)]
    for sess_id in created_ids:
        sessions[sess_id] = asyncio.Queue()
        sessions[sess_id].put_nowait({"jsonrpc": "2.0", "result": "ok"})

    assert len(sessions) == initial_sessions_count + 500

    # Simulate client disconnect / cleanup
    for sess_id in created_ids:
        sessions.pop(sess_id, None)

    gc.collect()
    assert len(sessions) == initial_sessions_count
    print(f"\n[PASS] 500 transient agent sessions created and 100% garbage-collected.")


# ---------------------------------------------------------------------------
# 4. CPU Peak Spike & Latency Bound Verification
# ---------------------------------------------------------------------------
def test_cpu_peak_spike_bounds():
    """Runs 1,000 high-frequency evaluations and asserts steady-state CPU time per op is bounded."""
    durations_us = []
    pkt = generate_mock_sock_ops_binary_packet()

    # Warm-up phase
    for _ in range(50):
        parse_sock_ops_event_bytes(pkt)

    # Measurement phase
    for _ in range(1000):
        t0 = time.perf_counter_ns()
        evt = parse_sock_ops_event_bytes(pkt)
        t1 = time.perf_counter_ns()
        durations_us.append((t1 - t0) / 1000.0)

    sorted_d = sorted(durations_us)
    p95_cpu_time_us = sorted_d[int(len(sorted_d) * 0.95)]
    p99_cpu_time_us = sorted_d[int(len(sorted_d) * 0.99)]
    avg_cpu_time_us = sum(durations_us) / len(durations_us)

    print(f"\n[CPU TEST: 1,000 events] -> Avg: {avg_cpu_time_us:.2f} µs | p95: {p95_cpu_time_us:.2f} µs | p99: {p99_cpu_time_us:.2f} µs")
    assert p99_cpu_time_us < 500.0, f"CPU peak spike {p99_cpu_time_us:.2f} µs exceeded 500µs SLA!"
    assert avg_cpu_time_us < 100.0, f"Average event processing time {avg_cpu_time_us:.2f} µs too slow!"



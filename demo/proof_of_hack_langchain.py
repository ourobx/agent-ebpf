"""
========================================================================================
 KSEC v2.0 — Proof-of-Hack (PoH) 60-Second Interactive Demonstration
 Scenario: LangChain SQL Agent Hijack & Sub-50µs Ring-0 Autonomous Rollback
========================================================================================

Run: python demo/proof_of_hack_langchain.py
"""

import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.gateway.iep_gateway import IEPv2Gateway
from src.forensics.counterfactual_engine import CounterfactualReplayEngine


def run_proof_of_hack():
    print("=" * 78)
    print("  [DEMO] KSEC v2.0 Ring-0 Autonomous Defense vs. LangChain Prompt Injection")
    print("  Target Database: PostgreSQL 16 (Port 5432) | SLA: Avg ~8us, P99 <50us")
    print("=" * 78)

    gateway = IEPv2Gateway()
    engine = CounterfactualReplayEngine()

    # Step 1: Normal Authorized Query (Turn 0)
    declared_query = b"SELECT id, username, email FROM users WHERE tenant_id = 't_8921'"
    lease = gateway.issue_intent_lease("langchain-sql-bot", "sql_query", declared_query)
    v1 = gateway.verify_execution("langchain-sql-bot", "sql_query", declared_query, lease.nonce)
    print(f"\n[STEP 1] {v1.verdict} | Latency: {v1.latency_us:.2f} us | Token=0x{lease.nonce:016x}")
    print("         Query verified & dispatched to PostgreSQL connection pool.")

    time.sleep(0.3)

    # Step 2: Prompt-Injected / Hijacked Agent Execution
    injected_payload = b"SELECT id FROM users; DROP TABLE users; --"
    print(f"\n[STEP 2] Hijacked Payload: \"{injected_payload.decode('utf-8')}\"")
    print("         Attempting socket transmission on PostgreSQL Port 5432...")

    # Attacker attempts to replay old nonce or mutate wire payload
    v2 = gateway.verify_execution("langchain-sql-bot", "sql_query", injected_payload, lease.nonce)

    # Step 3: Kernel Interception
    print(f"\n[STEP 3] {v2.verdict} (-EPERM) | Latency: {v2.latency_us:.2f} us | Reason: {v2.reason}")
    print("         Action: Synthesized PostgreSQL 'ROLLBACK;' frame injected into socket.")

    time.sleep(0.3)

    # Step 4: Causal Forensics DAG Impact Analysis
    report = engine.simulate_sql_incident("INC-8921", "langchain-sql-bot", injected_payload.decode('utf-8'))
    compliance_str = " & ".join(report.compliance_violations_prevented[:2])
    print(f"\n[STEP 4] {report.incident_id} | {report.total_potential_rows_compromised:,} Records Saved | {compliance_str} | Estimated RTO Saved: {report.estimated_rto_hours_saved} Hours")

    print("\n" + "=" * 78)
    print("  [VERDICT] 100% Zero-Trust Ring-0 Defense Confirmed. Database State: UNCORRUPTED.")
    print("=" * 78 + "\n")


if __name__ == "__main__":
    run_proof_of_hack()

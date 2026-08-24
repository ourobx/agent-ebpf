"""
Test Suite for Intent-to-Execution Protocol (IEP) & Pre-Lease Kernel Enforcement.
Validates:
1. Pre-Lease Provisioning with Microsecond-Precision Monotonic TTL (bpf_ktime_get_ns + ttl_ms).
2. cgroupv2 Binding & O(1) Hardware Policy Check (<500µs SLA).
3. Dead-Man Switch: Automatic expiration lockdown when lease TTL lapses.
4. Default-Deny Architecture: Unregistered cgroups immediately dropped.
5. Constraint Verification (Syscall bitmasks, Egress Ports, SQL Fingerprints).
6. FastMCP Gateway Integration (grant_execution_lease & verify_execution_lease tools).
"""

import sys
import os
import time
import asyncio
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from gateway.intent_lease_manager import (
    IntentLeaseManager,
    ACTION_TYPE_SYSCALL,
    ACTION_TYPE_NETWORK_EGRESS,
    ACTION_TYPE_DB_QUERY,
    ENFORCE_STRICT_BLOCK,
    ENFORCE_KILL_PROCESS,
    VERDICT_PASS,
    VERDICT_DROP,
    VERDICT_KILL,
    VERDICT_EXPIRED
)
from mcp_server import execute_tool, TOOLS


@pytest.fixture
def lease_mgr():
    return IntentLeaseManager()


# ---------------------------------------------------------------------------
# 1. Pre-Lease Provisioning & In-Window Execution Tests
# ---------------------------------------------------------------------------
def test_pre_lease_provisioning_and_valid_execution(lease_mgr):
    """Provisions a pre-lease and verifies execution within valid TTL window."""
    target_cgroup = 10042
    
    # 1. Provision lease
    res = lease_mgr.provision_lease(
        cgroup_id=target_cgroup,
        action_type=ACTION_TYPE_SYSCALL,
        ttl_ms=500,
        enforcement_mode=ENFORCE_STRICT_BLOCK,
        allowed_syscall_mask=0x1
    )
    assert res["success"] is True
    assert res["cgroup_id"] == target_cgroup
    assert res["status"] == "PROVISIONED_IN_KERNEL"
    assert res["latency_us"] < 500.0

    # 2. Verify in-flight execution check
    verdict = lease_mgr.verify_execution(
        cgroup_id=target_cgroup,
        action_type=ACTION_TYPE_SYSCALL,
        requested_syscall_bit=0x1
    )
    assert verdict["safe"] is True
    assert verdict["verdict"] == VERDICT_PASS
    assert verdict["latency_us"] < 500.0
    print(f"\n[PASS] Pre-lease verified in {verdict['latency_us']} µs (remaining TTL: {verdict['remaining_ttl_ms']:.1f}ms)")


# ---------------------------------------------------------------------------
# 2. Dead-Man Switch & TTL Expiration Tests
# ---------------------------------------------------------------------------
def test_dead_man_switch_ttl_expiration(lease_mgr):
    """Verifies that expired leases trigger automatic lockdown (Dead-Man Switch)."""
    target_cgroup = 20042
    
    # Provision very short 40ms lease
    lease_mgr.provision_lease(
        cgroup_id=target_cgroup,
        action_type=ACTION_TYPE_SYSCALL,
        ttl_ms=40,
        enforcement_mode=ENFORCE_STRICT_BLOCK
    )

    # Wait for TTL to lapse
    time.sleep(0.06)

    # Execution attempt must be rejected due to expiration
    verdict = lease_mgr.verify_execution(cgroup_id=target_cgroup, action_type=ACTION_TYPE_SYSCALL)
    assert verdict["safe"] is False
    assert verdict["verdict"] == VERDICT_EXPIRED
    assert "DEAD_MAN_SWITCH" in verdict["reason"]
    print(f"[PASS] Dead-man switch verified: expired lease locked down with {verdict['verdict']}.")


# ---------------------------------------------------------------------------
# 3. Default-Deny for Unregistered Cgroups
# ---------------------------------------------------------------------------
def test_default_deny_unregistered_cgroup(lease_mgr):
    """Verifies that unprovisioned processes/cgroups are immediately dropped."""
    unregistered_cgroup = 99999
    verdict = lease_mgr.verify_execution(cgroup_id=unregistered_cgroup, action_type=ACTION_TYPE_SYSCALL)
    assert verdict["safe"] is False
    assert verdict["verdict"] == VERDICT_DROP
    assert "DEFAULT_DENY" in verdict["reason"]
    print(f"[PASS] Default-deny verified for unregistered cgroup.")


# ---------------------------------------------------------------------------
# 4. Multi-Constraint Capability Enforcement Tests
# ---------------------------------------------------------------------------
def test_syscall_bitmask_constraint_violation(lease_mgr):
    """Verifies that attempting an unauthorized syscall bit triggers strict KILL/DROP."""
    target_cgroup = 30042
    lease_mgr.provision_lease(
        cgroup_id=target_cgroup,
        action_type=ACTION_TYPE_SYSCALL,
        ttl_ms=500,
        enforcement_mode=ENFORCE_KILL_PROCESS,
        allowed_syscall_mask=0x1 # Only bit 0 permitted
    )

    # Attempt forbidden syscall bit 0x2 (e.g. ptrace)
    verdict = lease_mgr.verify_execution(
        cgroup_id=target_cgroup,
        action_type=ACTION_TYPE_SYSCALL,
        requested_syscall_bit=0x2
    )
    assert verdict["safe"] is False
    assert verdict["verdict"] == VERDICT_KILL
    assert "SYSCALL_VIOLATION" in verdict["reason"]
    print(f"[PASS] Syscall bitmask violation intercepted with {verdict['verdict']}.")


def test_network_egress_port_constraint_violation(lease_mgr):
    """Verifies network egress port restriction."""
    target_cgroup = 40042
    lease_mgr.provision_lease(
        cgroup_id=target_cgroup,
        action_type=ACTION_TYPE_NETWORK_EGRESS,
        ttl_ms=500,
        allowed_port=5432 # Only PostgreSQL allowed
    )

    # Attempt connection to port 22 (SSH)
    verdict = lease_mgr.verify_execution(
        cgroup_id=target_cgroup,
        action_type=ACTION_TYPE_NETWORK_EGRESS,
        target_port=22
    )
    assert verdict["safe"] is False
    assert verdict["verdict"] == VERDICT_DROP
    assert "NETWORK_EGRESS_VIOLATION" in verdict["reason"]
    print(f"[PASS] Network egress port violation intercepted.")


def test_database_ast_fingerprint_constraint(lease_mgr):
    """Verifies SQL query AST fingerprint validation."""
    target_cgroup = 50042
    authorized_fingerprint = 0xAABBCCDDEEFF0011
    
    lease_mgr.provision_lease(
        cgroup_id=target_cgroup,
        action_type=ACTION_TYPE_DB_QUERY,
        ttl_ms=500,
        query_fingerprint=authorized_fingerprint
    )

    # Attempt mismatched query
    verdict = lease_mgr.verify_execution(
        cgroup_id=target_cgroup,
        action_type=ACTION_TYPE_DB_QUERY,
        sql_fingerprint=0x123456789ABCDEF0
    )
    assert verdict["safe"] is False
    assert verdict["verdict"] == VERDICT_DROP
    assert "DB_QUERY_VIOLATION" in verdict["reason"]
    print(f"[PASS] Database AST fingerprint mismatch intercepted.")


# ---------------------------------------------------------------------------
# 5. FastMCP Protocol Tool Calling for IEP
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_fastmcp_iep_tool_flow():
    """Verifies grant_execution_lease and verify_execution_lease FastMCP tools."""
    tool_names = {t["name"] for t in TOOLS}
    assert "grant_execution_lease" in tool_names
    assert "verify_execution_lease" in tool_names

    # 1. Grant Lease via FastMCP tool
    grant_res = await execute_tool("grant_execution_lease", {
        "cgroup_id": 60042,
        "action_type": 1,
        "ttl_ms": 600,
        "tenant_id": "hotel-aurora",
        "allowed_syscall_mask": 1
    })
    assert grant_res["success"] is True
    assert grant_res["status"] == "PROVISIONED_IN_KERNEL"

    # 2. Verify Lease via FastMCP tool
    verify_res = await execute_tool("verify_execution_lease", {
        "cgroup_id": 60042,
        "action_type": 1
    })
    assert verify_res["safe"] is True
    assert verify_res["verdict"] == "PASS"
    print("[PASS] FastMCP IEP tool flow (grant -> verify) executed cleanly.")

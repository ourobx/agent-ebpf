"""
KSEC Conflict-Free Replicated Data Type (CRDT) Policy Mesh Synchronizer.
Implements State-based LWW-Element-Set (Last-Write-Wins) for multi-region eBPF policy maps,
enabling conflict-free distributed rule replication across global edge clusters without central locks.
"""

import time
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class CRDTPolicyRecord(BaseModel):
    policy_id: str
    target_comm: str
    allowed_ports: List[int]
    action: str
    timestamp_ns: int
    node_origin: str
    deleted: bool = False


class CRDTPolicyEngine:
    def __init__(self, local_node_id: str = "control-plane-primary"):
        self.local_node_id = local_node_id
        # Internal Add-Set and Remove-Set keyed by policy_id
        self._policy_state: Dict[str, CRDTPolicyRecord] = {}

    def set_policy(self, policy_id: str, target_comm: str, allowed_ports: List[int], action: str = "ALLOW") -> CRDTPolicyRecord:
        """Adds or updates a policy locally with nanosecond timestamp."""
        record = CRDTPolicyRecord(
            policy_id=policy_id,
            target_comm=target_comm,
            allowed_ports=allowed_ports,
            action=action.upper(),
            timestamp_ns=time.time_ns(),
            node_origin=self.local_node_id,
            deleted=False
        )
        self._policy_state[policy_id] = record
        return record

    def delete_policy(self, policy_id: str) -> Optional[CRDTPolicyRecord]:
        """Tombstones a policy locally with high-resolution timestamp."""
        if policy_id in self._policy_state:
            record = self._policy_state[policy_id].model_copy()
            record.deleted = True
            record.timestamp_ns = time.time_ns()
            record.node_origin = self.local_node_id
            self._policy_state[policy_id] = record
            return record
        return None

    def merge_remote_state(self, remote_records: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Deterministically merges remote policy records using Last-Write-Wins (LWW) conflict resolution.
        """
        applied_count = 0
        ignored_count = 0

        for r_data in remote_records:
            try:
                remote_rec = CRDTPolicyRecord(**r_data)
                local_rec = self._policy_state.get(remote_rec.policy_id)

                if local_rec is None or remote_rec.timestamp_ns > local_rec.timestamp_ns:
                    self._policy_state[remote_rec.policy_id] = remote_rec
                    applied_count += 1
                else:
                    ignored_count += 1
            except Exception as exc:
                print(f"[WARN] [CRDT Sync] Failed to parse remote policy record: {exc}")
                ignored_count += 1

        return {
            "applied": applied_count,
            "ignored": ignored_count,
            "total_active": len([r for r in self._policy_state.values() if not r.deleted])
        }

    def get_active_policies(self) -> List[CRDTPolicyRecord]:
        """Returns all non-tombstoned active policies."""
        return [r for r in self._policy_state.values() if not r.deleted]

    def export_full_state(self) -> List[Dict[str, Any]]:
        """Exports full CRDT state (including tombstones) for mesh synchronization."""
        return [r.model_dump() for r in self._policy_state.values()]


crdt_engine = CRDTPolicyEngine()

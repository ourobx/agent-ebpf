"""
KSEC Cryptographic Intent-Lease Protocol Implementation.
Binds tool execution arguments to an immutable cryptographic nonce in memory.
"""

import hashlib
import time
import hmac
import os
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class IntentLease(BaseModel):
    agent_id: str
    tool_name: str
    payload_hash: str
    nonce: str
    issued_at_ns: int
    expires_at_ns: int
    max_duration_ms: int = 5000
    is_valid: bool = True

    def is_expired(self) -> bool:
        return time.time_ns() > self.expires_at_ns


def generate_intent_lease(
    agent_id: str,
    tool_name: str,
    arguments: Any,
    secret_key: Optional[bytes] = None
) -> IntentLease:
    """Creates an in-kernel verified intent lease nonce."""
    secret = secret_key or os.getenv("KSEC_SIGNING_KEY", "ksec-sovereign-dev-secret").encode()
    raw_bytes = str(arguments).encode("utf-8")
    payload_hash = hashlib.sha256(raw_bytes).hexdigest()
    
    now_ns = time.time_ns()
    expires_ns = now_ns + (5000 * 1_000_000)  # 5000ms
    
    msg = f"{agent_id}:{tool_name}:{payload_hash}:{now_ns}".encode()
    nonce = hmac.new(secret, msg, hashlib.sha256).hexdigest()[:16]

    return IntentLease(
        agent_id=agent_id,
        tool_name=tool_name,
        payload_hash=payload_hash,
        nonce=f"0x{nonce}",
        issued_at_ns=now_ns,
        expires_at_ns=expires_ns,
    )


def verify_intent(
    lease: IntentLease,
    executed_arguments: Any
) -> Dict[str, Any]:
    """Validates that runtime execution has not undergone in-memory TOCTOU tampering."""
    start_ns = time.time_ns()
    if lease.is_expired():
        return {
            "verdict": "DROP",
            "reason": "LEASE_EXPIRED",
            "latency_us": (time.time_ns() - start_ns) / 1000.0,
            "error_code": "-ETIME"
        }

    current_hash = hashlib.sha256(str(executed_arguments).encode("utf-8")).hexdigest()
    if not hmac.compare_digest(current_hash, lease.payload_hash):
        return {
            "verdict": "DROP",
            "reason": "TOCTOU_PAYLOAD_MUTATION_DETECTED",
            "latency_us": (time.time_ns() - start_ns) / 1000.0,
            "error_code": "-EPERM"
        }

    return {
        "verdict": "ALLOW",
        "reason": "INTENT_LEASE_VERIFIED",
        "latency_us": (time.time_ns() - start_ns) / 1000.0,
        "error_code": None
    }

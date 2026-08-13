"""
Data models and types for ksec-shield Python SDK.
"""

from typing import Dict, Any, Optional, Literal, List
from pydantic import BaseModel, Field


ActionType = Literal[
    "network_egress",
    "tool_execution",
    "file_system",
    "syscall",
    "memory_access"
]


class PolicyRule(BaseModel):
    id: str
    action_type: ActionType
    target: str
    decision: Literal["ALLOW", "BLOCK"]
    reason: Optional[str] = None
    ttl_seconds: int = 300


class ShieldTelemetryEvent(BaseModel):
    id: str
    agent_id: str
    action_type: ActionType
    target: str
    decision: Literal["ALLOW", "BLOCK"]
    duration_ms: float
    timestamp: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    reason: Optional[str] = None


class KsecSecurityViolationError(Exception):
    """Raised when an AI Agent action violates an active Agent-eBPF security policy."""
    def __init__(self, message: str, action_type: str, target: str, rule_id: Optional[str] = None):
        super().__init__(message)
        self.action_type = action_type
        self.target = target
        self.rule_id = rule_id

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from enum import Enum
from datetime import datetime

class ActionType(str, Enum):
    TOOL_EXECUTION = "tool_execution"
    NETWORK_REQUEST = "network_request"
    SYSTEM_CALL = "system_call"
    FILE_ACCESS = "file_access"
    NETWORK_EGRESS = "network_egress"

class PolicyDecision(str, Enum):
    ALLOW = "ALLOW"
    BLOCK = "BLOCK"
    AUDIT = "AUDIT"

class EvaluateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    action_type: ActionType = Field(..., alias="actionType")
    target: str
    agent_id: Optional[str] = Field(None, alias="agentId")
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    metadata: Optional[Dict[str, Any]] = None

class EvaluateResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    allowed: bool
    decision: PolicyDecision
    reason: Optional[str] = None
    kernel_trace_id: Optional[str] = Field(None, alias="kernelTraceId")
    matched_rule: Optional[str] = Field(None, alias="matchedRule")

class TelemetryEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    event_id: Optional[str] = Field(None, alias="id")
    action_type: ActionType = Field(..., alias="actionType")
    target: str
    decision: Optional[PolicyDecision] = PolicyDecision.ALLOW
    reason: Optional[str] = None
    kernel_trace_id: Optional[str] = Field(None, alias="kernelTraceId")
    duration_ms: Optional[float] = Field(0.0, alias="durationMs")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)
    agent_id: Optional[str] = Field(None, alias="agentId")
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    metadata: Optional[Dict[str, Any]] = None

class TelemetryBatchRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    events: List[TelemetryEvent]

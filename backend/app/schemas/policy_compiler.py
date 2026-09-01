from pydantic import BaseModel, Field
from typing import List, Literal


class CompiledEbpfRule(BaseModel):
    policy_id: str = Field(..., description="Unique policy identifier (e.g. pol-net-01)")
    rule_name: str = Field(..., description="Short summary description of the rule")
    target_comm: str = Field(..., description="Target process executable or binary name (e.g. python3, nc, curl)")
    allowed_ports: List[int] = Field(default_factory=list, description="List of permitted network ports")
    protocol: Literal["TCP", "UDP", "ALL"] = Field(default="TCP", description="Target transport layer protocol")
    action: Literal["ALLOW", "DROP", "LOG_ONLY"] = Field(default="ALLOW", description="Enforcement action verdict")
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = Field(default="LOW", description="AI evaluated threat risk level")
    rationale: str = Field(..., description="Security rationale provided by the AI compiler")

"""
KSEC Hierarchical Enterprise Swarm & Fractal Multi-Agent Orchestration Engine.
Orchestrates autonomous Meta-Agents delegating objectives recursively to specialized
sub-agent clusters (Security, Finance, DevOps, Legal) over high-performance SSE streams.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class SubAgent(BaseModel):
    agent_id: str = Field(..., description="Unique sub-agent identifier")
    role: str = Field(..., description="Functional role: SECURITY, FINANCE, DEVOPS, LEGAL")
    model: str = Field(default="gemini-2.5-flash", description="Underlying LLM model")
    system_prompt: str = Field(..., description="Domain-specific system instructions")


class HierarchicalSwarmRequest(BaseModel):
    meta_agent_id: str = Field(..., description="Executive Meta-Agent ID (e.g. CEO-MetaAgent-01)")
    objective: str = Field(..., description="High-level enterprise strategic objective")
    sub_agents: List[SubAgent] = Field(default_factory=list, description="Injected specialized sub-agent swarm")


class SwarmExecutionEvent(BaseModel):
    timestamp: str
    meta_agent_id: str
    active_sub_agent: Optional[str] = None
    step_type: str  # THOUGHT, DELEGATION, EXECUTION, RESULT, COMPLETE
    content: str
    status: str = "RUNNING"  # RUNNING, COMPLETED, FAILED

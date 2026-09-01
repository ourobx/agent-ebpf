from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from backend.app.core.policy_engine import policy_engine

router = APIRouter()


class IntentLeaseRequest(BaseModel):
    intent_id: str = Field(..., description="Unique Intent Identifier (e.g. intent-net-01)")
    pid: int = Field(..., description="Target Process ID running under agent execution context")
    action: Literal["ALLOW", "DENY", "allow", "deny"] = Field(..., description="Policy action verdict")


class IntentLeaseResponse(BaseModel):
    status: str = Field(default="success", description="Execution status")
    intent_id: str = Field(..., description="Granted intent identifier")
    pid: int = Field(..., description="Target Process ID")
    enforced_in_kernel: bool = Field(default=True, description="Whether policy was synchronized to eBPF map")


@router.post("/intent/lease", response_model=IntentLeaseResponse, tags=["Intent-to-Execution"])
async def grant_intent_lease(payload: IntentLeaseRequest):
    """
    Evaluates and provisions an in-kernel eBPF Intent Lease for an autonomous AI agent process.
    """
    is_allowed = payload.action.upper() == "ALLOW"
    success = policy_engine.update_intent_lease(payload.pid, is_allowed, payload.intent_id)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to synchronize eBPF kernel policy map.")

    return IntentLeaseResponse(
        status="success",
        intent_id=payload.intent_id,
        pid=payload.pid,
        enforced_in_kernel=True
    )


@router.get("/intent/leases", tags=["Intent-to-Execution"])
async def list_intent_leases():
    """Lists all active kernel-enforced capability leases."""
    return {"leases": policy_engine.list_leases()}

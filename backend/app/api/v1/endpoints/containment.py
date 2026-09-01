from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List

from backend.app.core.incident_containment import incident_engine, IncidentReport

router = APIRouter()


class IsolateRequest(BaseModel):
    pid: int = Field(..., description="Target process PID to immediately freeze and isolate")
    comm: str = Field(default="unknown", description="Process name / binary executable")
    reason: str = Field(default="Manual security quarantine triggered from dashboard", description="Containment rationale")


class ReleaseRequest(BaseModel):
    incident_id: str = Field(..., description="Target incident ID to release and unfreeze")


@router.post("/containment/isolate", response_model=IncidentReport, tags=["Incident Containment"])
async def isolate_process(payload: IsolateRequest):
    """
    Triggers automated quarantine on target process (cgroupv2 SIGSTOP) and generates forensics snapshot.
    """
    report = incident_engine.trigger_containment(payload.pid, payload.comm, payload.reason)
    return report


@router.post("/containment/release", response_model=IncidentReport, tags=["Incident Containment"])
async def release_process(payload: ReleaseRequest):
    """
    Releases an isolated process back into normal execution (SIGCONT).
    """
    report = incident_engine.release_containment(payload.incident_id)
    if not report:
        raise HTTPException(status_code=404, detail="Incident ID not found.")
    return report


@router.get("/containment/incidents", response_model=List[IncidentReport], tags=["Incident Containment"])
async def get_all_incidents():
    """
    Returns active and historical incident containment logs and forensics snapshots.
    """
    return incident_engine.list_incidents()

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from backend.app.core.quarantine import quarantine_engine

router = APIRouter()


class IncidentContainmentRequest(BaseModel):
    pid: int = Field(..., description="Target process PID committing security violation")
    comm: str = Field(default="unknown", description="Binary executable name (e.g. nc, python3)")
    reason: str = Field(..., description="Rationale for triggering automated quarantine")
    severity: Literal["INFO", "WARN", "CRIT", "crit"] = Field(default="CRIT", description="Incident severity level")


class IncidentContainmentResponse(BaseModel):
    status: str
    incident_id: str
    message: str
    enforced_by: str


@router.post("/incident/contain", response_model=IncidentContainmentResponse, tags=["Incident Containment"])
async def trigger_auto_containment(report: IncidentContainmentRequest, background_tasks: BackgroundTasks):
    """
    Triggers sub-millisecond process freezing via cgroupv2 when a critical security violation is detected.
    """
    if report.severity.upper() != "CRIT":
        return IncidentContainmentResponse(
            status="ignored",
            incident_id=f"inc_{report.pid}_{report.comm}",
            message="Event severity below CRIT threshold; quarantine skipped.",
            enforced_by="none"
        )

    # Dispatch non-blocking background task to freeze process via cgroupv2
    background_tasks.add_task(quarantine_engine.freeze_process, report.pid)

    return IncidentContainmentResponse(
        status="contained",
        incident_id=f"inc_{report.pid}_{report.comm}",
        message=f"Critical violation detected. PID {report.pid} ({report.comm}) quarantine initialized.",
        enforced_by="cgroupv2-freeze"
    )

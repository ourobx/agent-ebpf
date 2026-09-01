from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List

from backend.app.core.mesh_manager import mesh_manager, EdgeNode

router = APIRouter()


class HeartbeatPayload(BaseModel):
    node_id: str
    cpu_usage_pct: float = 0.0
    memory_mb: float = 0.0


@router.post("/mesh/register", response_model=EdgeNode, tags=["Distributed Telemetry Mesh"])
async def register_node(payload: EdgeNode):
    """Registers an edge telemetry agent into the global control plane mesh."""
    return mesh_manager.register_node(payload)


@router.post("/mesh/heartbeat", response_model=EdgeNode, tags=["Distributed Telemetry Mesh"])
async def node_heartbeat(payload: HeartbeatPayload):
    """Processes liveness heartbeats and dynamic telemetry statistics from edge nodes."""
    node = mesh_manager.record_heartbeat(payload.node_id, payload.cpu_usage_pct, payload.memory_mb)
    if not node:
        raise HTTPException(status_code=404, detail="Edge node not found. Please register first.")
    return node


@router.get("/mesh/nodes", response_model=List[EdgeNode], tags=["Distributed Telemetry Mesh"])
async def list_mesh_nodes():
    """Lists all registered edge nodes, regions, and their current health status."""
    return mesh_manager.get_nodes()

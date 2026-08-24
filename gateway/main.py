import re
import uuid
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Union
from fastapi import FastAPI, HTTPException, status, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    EvaluateRequest,
    EvaluateResponse,
    PolicyDecision,
    TelemetryEvent,
    TelemetryBatchRequest,
)
from .db import init_db_pool, close_db_pool, fetch_policies_for_tenant, bulk_insert_telemetry
from .redis_queue import init_redis, close_redis, enqueue_telemetry_batch
from .telemetry_worker import telemetry_worker_loop

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ksec.gateway")

# Fallback default rules if DB is offline
DEFAULT_FALLBACK_RULES: List[Dict[str, Any]] = [
    {
        "pattern": r"^(bash_exec|sh|exec|eval|rm_rf|write_file|delete_file)$",
        "action_type": "tool_execution",
        "decision": PolicyDecision.BLOCK,
        "reason": "[ksec-gateway] Restricted shell or mutating tool prohibited by tenant policy",
    },
    {
        "pattern": r"^https?://(localhost|127\.0\.0\.1|10\.|192\.168\.)",
        "action_type": "network_request",
        "decision": PolicyDecision.BLOCK,
        "reason": "[ksec-gateway] SSRF protection: private IP range forbidden",
    },
]

worker_task: asyncio.Task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global worker_task
    logger.info("[Gateway] Starting Agent-eBPF Policy & Telemetry Gateway...")
    await init_db_pool()
    await init_redis()
    
    # Start background telemetry consumer task
    worker_task = asyncio.create_task(telemetry_worker_loop())
    yield
    
    # Shutdown
    if worker_task:
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass
    await close_redis()
    await close_db_pool()
    logger.info("[Gateway] Gateway shutdown complete.")

app = FastAPI(
    title="ksec.space Policy & Telemetry Gateway",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

@app.post("/api/v1/policy/evaluate", response_model=EvaluateResponse)
async def evaluate_policy(
    payload: EvaluateRequest,
    auth: HTTPAuthorizationCredentials = Depends(security),
):
    """Centralised zero-trust policy evaluation enforcing PostgreSQL 16 RLS policies."""
    tenant_id = payload.tenant_id or "default_tenant"
    action_type = payload.action_type.value

    # 1. Fetch rules from PostgreSQL RLS database
    db_rules = await fetch_policies_for_tenant(tenant_id=tenant_id, action_type=action_type)

    if db_rules:
        for rule in db_rules:
            try:
                regex = re.compile(rule["pattern"], re.I)
                if regex.search(payload.target):
                    decision = PolicyDecision(rule["decision"])
                    return EvaluateResponse(
                        allowed=(decision == PolicyDecision.ALLOW),
                        decision=decision,
                        reason=rule.get("reason") or "Blocked by PostgreSQL tenant RLS policy",
                        kernel_trace_id=f"ksec-{uuid.uuid4().hex[:12]}",
                        matched_rule=rule["pattern"],
                    )
            except Exception as err:
                logger.warning(f"Error matching regex '{rule.get('pattern')}': {err}")

    # 2. Fallback to default in-memory rules if DB rules didn't match or DB is offline
    for rule in DEFAULT_FALLBACK_RULES:
        if rule["action_type"] == action_type:
            try:
                regex = re.compile(rule["pattern"], re.I)
                if regex.search(payload.target):
                    return EvaluateResponse(
                        allowed=(rule["decision"] == PolicyDecision.ALLOW),
                        decision=rule["decision"],
                        reason=rule["reason"],
                        kernel_trace_id=f"ksec-{uuid.uuid4().hex[:12]}",
                        matched_rule=rule["pattern"],
                    )
            except Exception as err:
                logger.warning(f"Error matching default regex: {err}")

    return EvaluateResponse(
        allowed=True,
        decision=PolicyDecision.ALLOW,
        reason="No matching blocking rule found",
    )

@app.post("/api/v1/telemetry", status_code=status.HTTP_202_ACCEPTED)
@app.post("/api/v1/telemetry/ingest", status_code=status.HTTP_202_ACCEPTED)
async def ingest_telemetry(
    payload: Union[List[TelemetryEvent], TelemetryBatchRequest, Dict[str, Any]],
    auth: HTTPAuthorizationCredentials = Depends(security),
):
    """Asynchronously ingests telemetry event batches into Redis Stream/Queue."""
    events_data = []
    
    if isinstance(payload, list):
        events_data = [e.model_dump(by_alias=True) for e in payload]
    elif isinstance(payload, TelemetryBatchRequest):
        events_data = [e.model_dump(by_alias=True) for e in payload.events]
    elif isinstance(payload, dict):
        raw_events = payload.get("events", [])
        if isinstance(raw_events, list):
            events_data = raw_events

    if not events_data:
        return {"status": "accepted", "processed_count": 0}

    tenant_id = "default_tenant"
    if events_data and isinstance(events_data[0], dict) and events_data[0].get("tenant_id"):
        tenant_id = events_data[0]["tenant_id"]

    # Enqueue to Redis queue for background worker ingestion
    queued = await enqueue_telemetry_batch(events_data, tenant_id=tenant_id)
    
    # Fallback to direct DB insert if Redis queue is unavailable
    if not queued:
        asyncio.create_task(bulk_insert_telemetry(events_data))

    return {"status": "accepted", "processed_count": len(events_data), "queued": queued}

@app.get("/healthz", status_code=status.HTTP_200_OK)
async def health_check():
    return {
        "status": "ok", 
        "service": "ksec-gateway", 
        "version": "1.1.0",
        "architecture": "PostgreSQL 16 RLS + Redis Queue"
    }

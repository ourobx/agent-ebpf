"""
Agent-eBPF Control Plane — FastAPI Application Entrypoint.
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.v1.endpoints import stream, intent, compiler, containment, mesh, billing, stripe_webhook, incident, swarm_stream, benchmark, forensics, audit, auth
from backend.app.core.broadcaster import event_broadcaster
from backend.app.core.ebpf_loader import ebpf_loader
from backend.app.middleware.saas_auth import SaaSAuthMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Register active asyncio event loop for thread-safe event broadcasting
    loop = asyncio.get_running_loop()
    event_broadcaster.set_event_loop(loop)

    # 2. Start eBPF RingBuffer poller thread
    try:
        ebpf_loader.start()
        print("[INFO] eBPF RingBuffer poller successfully initialized.")
    except Exception as exc:
        print(f"[WARN] eBPF Loader fallback (mock / userspace mode): {exc}")

    yield

    # 3. Gracefully release C memory and detach probes on shutdown
    ebpf_loader.stop()
    print("[INFO] eBPF RingBuffer poller stopped.")


app = FastAPI(
    title="Agent-eBPF Control Plane",
    version="2.0.0-PROD",
    description="Deterministic Ring-0 eBPF Telemetry & Defense Engine",
    lifespan=lifespan
)

# CORS configuration for development and production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

app.add_middleware(SaaSAuthMiddleware)

app.include_router(stream.router, prefix="/api/v1")
app.include_router(intent.router, prefix="/api/v1")
app.include_router(compiler.router, prefix="/api/v1")
app.include_router(containment.router, prefix="/api/v1")
app.include_router(mesh.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(stripe_webhook.router, prefix="/api/v1")
app.include_router(incident.router, prefix="/api/v1")
app.include_router(swarm_stream.router, prefix="/api/v1")
app.include_router(benchmark.router, prefix="/api/v1")
app.include_router(forensics.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api")

# Prometheus Metrics Instrumentation (metrics.ksec.space)
try:
    from prometheus_fastapi_instrumentator import Instrumentator
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")
except Exception:
    pass


@app.get("/healthz", tags=["Health"])
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "agent-ebpf-backend"}

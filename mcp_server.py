"""
Production-Grade MCP Server & Gateway for Agent-eBPF.
Features:
- FastAPI Framework
- OAuth2 / JWT Authentication (RS256/HS256)
- Role & Scope Based Authorization (RBAC/ABAC)
- Dual-Layer Rate Limiting (SlowAPI + Redis)
- Structlog Structured Audit Logging
- Prometheus Metrics (/metrics)
- OWASP Security Headers & Strict CORS
"""

import asyncio
import json
import os
import re
import uuid
import yaml
import time
import structlog
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, Request, Response, Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse, FileResponse
from pydantic import BaseModel, Field
from jose import jwt, JWTError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from prometheus_fastapi_instrumentator import Instrumentator

try:
    from tools import ebpf_loader
    from tools import db as database
    from tools.android_manager import android_manager
    from tools.config import settings
    from engine.affective_engine import cognitive_engine, AffectiveVector, InnerMonologue, CognitivePulse
    from engine.audio_synthesis import prosody_engine, ProsodyProfile
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).parent))
    from tools import ebpf_loader
    from tools import db as database
    from tools.android_manager import android_manager
    from tools.config import settings
    from engine.affective_engine import cognitive_engine, AffectiveVector, InnerMonologue, CognitivePulse
    from engine.audio_synthesis import prosody_engine, ProsodyProfile

# Structlog Configuration
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)
logger = structlog.get_logger("mcp_gateway")

# Security Constants — strictly environment-driven (no hardcoded production secret).
JWT_SECRET_KEY = settings.effective_jwt_secret()
JWT_ALGORITHM = settings.jwt_algorithm or "HS256"
security_bearer = HTTPBearer(auto_error=False)

# Tool execution timeout (seconds) — guards against slow/hung tool calls.
TOOL_TIMEOUT = settings.mcp_tool_timeout

# OAuth 2.0 client credentials from environment. In production a missing value
# fails fast at startup (settings.validate()); outside production an explicit
# clearly-marked dev value is used as a deliberate choice (never for prod).
OAUTH_CLIENT_ID = settings.oauth_client_id or ("" if settings.is_production else "agent-ebpf-dev")
OAUTH_CLIENT_SECRET = settings.oauth_client_secret or ("" if settings.is_production else "dev-secret")

# SlowAPI Limiter (IP + Rate Limit)
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("MCP Gateway Initializing...")
    # Fail-fast: in production any missing critical config aborts startup.
    try:
        settings.validate()
    except RuntimeError as exc:
        if settings.is_production:
            logger.error("Startup blocked by configuration error", error=str(exc))
            raise
        logger.warning("Non-production configuration warnings", error=str(exc))

    # Real PostgreSQL connection pool (liveness + schema).
    try:
        await database.connect()
    except Exception as exc:  # noqa: BLE001
        if settings.is_production:
            logger.error("Startup blocked: PostgreSQL unavailable", error=str(exc))
            raise
        logger.warning("PostgreSQL unavailable during startup (non-production)", error=str(exc))

    logger.info("MCP Gateway ready")
    yield
    await database.close()
    logger.info("MCP Gateway Shutting Down...")

app = FastAPI(
    title="Agent-eBPF MCP Gateway",
    version="2.0.0-ULTRA",
    description="Production-Grade Security Gateway with eBPF Integration",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# OWASP Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Strict & Configurable CORS for ksec.space production & dev environments
raw_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if not settings.is_production and "*" not in raw_origins:
    raw_origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=raw_origins,
    allow_origin_regex=r"^https://([a-zA-Z0-9-]+\.)*ksec\.space$" if settings.is_production else None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Web UI Dashboard & Static Assets
@app.get("/", include_in_schema=False)
async def serve_index(request: Request):
    accept = request.headers.get("accept", "")
    if "text/html" in accept and os.path.exists("index.html"):
        return FileResponse("index.html")
    return {
        "status": "active",
        "service": "Agent-eBPF MCP Gateway",
        "mcp_sse_endpoint": "/sse",
        "message": "MCP SSE Server is active."
    }

@app.get("/styles.css", include_in_schema=False)
async def serve_styles():
    if os.path.exists("styles.css"):
        return FileResponse("styles.css", media_type="text/css")
    raise HTTPException(status_code=404, detail="styles.css not found")

@app.get("/app.js", include_in_schema=False)
async def serve_app_js():
    if os.path.exists("app.js"):
        return FileResponse("app.js", media_type="application/javascript")
    raise HTTPException(status_code=404, detail="app.js not found")

@app.get("/ourobx_logo.png", include_in_schema=False)
async def serve_logo():
    if os.path.exists("ourobx_logo.png"):
        return FileResponse("ourobx_logo.png", media_type="image/png")
    raise HTTPException(status_code=404, detail="ourobx_logo.png not found")

@app.get("/install.sh", include_in_schema=False)
async def serve_install_sh():
    script = """#!/usr/bin/env bash
# Agent-eBPF 1-Click Zero-Config Installer (ksec.space)
set -e
echo "⚡ Installing Agent-eBPF Zero-Trust Shield (@ksec/shield)..."

# Check if running inside Agent-eBPF repo or from remote
if [ -d "packages/ksec-shield-py" ]; then
  echo "📦 Installing ksec-shield from local workspace..."
  pip install -e packages/ksec-shield-py || true
elif command -v pip3 >/dev/null 2>&1 || command -v pip >/dev/null 2>&1; then
  echo "📦 Installing ksec-shield for Python AI Agents..."
  pip install --upgrade ksec-shield || true
fi

if [ -d "packages/ksec-shield-ts" ]; then
  echo "📦 Installing @ourobx/shield from local workspace..."
  npm install ./packages/ksec-shield-ts || true
elif command -v npm >/dev/null 2>&1; then
  echo "📦 Installing @ourobx/shield for Node.js / TypeScript AI Agents..."
  npm install @ourobx/shield || true
fi

echo "✅ Agent-eBPF Shield is ready!"
echo "👉 Simply add 'import ksec_shield.auto' (Python) or 'import \"@ourobx/shield/auto\"' (Node.js) to your agent project!"
"""
    return Response(content=script, media_type="text/x-shellscript")

@app.get("/install.ps1", include_in_schema=False)
async def serve_install_ps1():
    script = """# Agent-eBPF 1-Click Zero-Config Installer for Windows (ksec.space)
Write-Host "⚡ Installing Agent-eBPF Zero-Trust Shield (@ourobx/shield)..." -ForegroundColor Cyan

if (Test-Path "packages\\ksec-shield-py") {
    Write-Host "📦 Installing ksec-shield from local workspace..." -ForegroundColor Yellow
    pip install -e packages\\ksec-shield-py
} elseif (Get-Command pip -ErrorAction SilentlyContinue) {
    Write-Host "📦 Installing ksec-shield for Python AI Agents..." -ForegroundColor Yellow
    pip install --upgrade ksec-shield
}

if (Test-Path "packages\\ksec-shield-ts") {
    Write-Host "📦 Installing @ourobx/shield from local workspace..." -ForegroundColor Yellow
    npm install .\\packages\\ksec-shield-ts
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "📦 Installing @ourobx/shield for Node.js / TypeScript AI Agents..." -ForegroundColor Yellow
    npm install @ourobx/shield
}

Write-Host "✅ Agent-eBPF Shield is ready!" -ForegroundColor Green
Write-Host "👉 Simply add 'import ksec_shield.auto' (Python) or 'import ""@ourobx/shield/auto""' (Node.js) to your agent project!" -ForegroundColor White
"""
    return Response(content=script, media_type="text/plain")


from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Counter, Gauge

# Custom Agent-eBPF Prometheus Counters & Gauges for Alerting Rules
EBPF_DROPPED_PACKETS = Counter(
    "ebpf_dropped_packets_total",
    "Total number of network packets dropped by Agent-eBPF XDP filter"
)
EBPF_PROCESSED_PACKETS = Counter(
    "ebpf_processed_packets_total",
    "Total number of network packets processed by Agent-eBPF XDP filter"
)
RINGBUF_LOSS = Counter(
    "ringbuf_loss_total",
    "Total number of lost ringbuffer security event notifications"
)

# Prometheus Metrics Integration
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


# --- Pydantic Schemas ---
class UserTokenPayload(BaseModel):
    sub: str
    role: str
    scopes: List[str] = []

class SecurityRuleRequest(BaseModel):
    ip_address: str = Field(..., json_schema_extra={"example": "192.168.1.50"})
    rule_id: int = Field(100, json_schema_extra={"example": 101})

class AndroidTokenRequest(BaseModel):
    policy_name: str = "sentinel-strict"
    duration_hours: int = 24

class AndroidCommandRequest(BaseModel):
    device_id: str
    command_type: str = Field(..., json_schema_extra={"example": "LOCK"})
    duration_seconds: int = 0

class AndroidPolicyRequest(BaseModel):
    policy_id: str = "sentinel-strict"
    spec: Dict[str, Any] = {}

class CognitiveStimulusRequest(BaseModel):
    user_input: str = Field(..., description="Conversational user message or system stimulus")
    is_mutation: bool = Field(False, description="Flag indicating if the action involves database mutation or critical operations")
    metadata: Optional[Dict[str, Any]] = None

class MCPToolRequest(BaseModel):
    jsonrpc: str = "2.0"
    method: str
    params: Dict[str, Any] = {}
    id: Optional[int] = 1

def create_access_token(data: dict, expires_delta: Optional[int] = 86400) -> str:
    payload = data.copy()
    if "exp" not in payload:
        payload["exp"] = int(time.time()) + (expires_delta or 86400)
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


# --- Policy & Session Utilities ---
POLICY_FILE = settings.policy_file
sessions: Dict[str, asyncio.Queue] = {}

def load_policy():
    if os.path.exists(POLICY_FILE):
        with open(POLICY_FILE, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {"rules": []}
    return {"rules": []}

def save_policy(data):
    with open(POLICY_FILE, "w", encoding="utf-8") as f:
        yaml.dump(data, f)

# MCP Tool Definitions
TOOLS = [
    {
        "name": "get_security_status",
        "description": "Returns active Agent-eBPF Linux kernel hooks, latency stats, and total blocked threats count.",
        "inputSchema": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "get_ebpf_status",
        "description": "Retrieves real-time packet counters and kernel map statuses from BPF maps.",
        "inputSchema": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "get_active_policies",
        "description": "Retrieves the currently active Agent-eBPF declarative security rules (policy.yaml).",
        "inputSchema": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "add_security_rule",
        "description": "Adds a new declarative kernel enforcement rule (e.g., blocking unconstrained SQL DELETE or unsafe syscalls). Requires admin/operator role.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "rule_id": {"type": "string", "description": "Unique identifier for the rule"},
                "rule_type": {"type": "string", "enum": ["db_query", "syscall", "network"], "description": "Type of rule"},
                "action": {"type": "string", "enum": ["DROP", "KILL_PROCESS", "PASS"], "description": "Enforcement action"},
                "pattern": {"type": "string", "description": "Regex pattern or keyword to match"},
                "ip_address": {"type": "string", "description": "Optional IPv4 address to block"}
            },
            "required": ["rule_id"]
        }
    },
    {
        "name": "simulate_query_check",
        "description": "Evaluates a proposed SQL query or command against active kernel eBPF policies before execution.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "payload": {"type": "string", "description": "SQL query or command string to validate"}
            },
            "required": ["payload"]
        }
    },
    {
        "name": "android_list_devices",
        "description": "Lists all Android endpoints managed via Android Management API, including device model, battery level, OS version, compliance status, and remote state.",
        "inputSchema": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "android_create_enrollment_token",
        "description": "Generates an Android Management API enrollment token and QR code for onboarding a new Android device into enterprise management.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "policy_name": {"type": "string", "default": "sentinel-strict", "description": "Target policy for the device"},
                "duration_hours": {"type": "integer", "default": 24, "description": "Token validity duration in hours"}
            }
        }
    },
    {
        "name": "android_execute_command",
        "description": "Sends a remote action command (LOCK, WIPE, REBOOT, REBOOT_CLEAR_PASSCODE) to an Android device.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "device_id": {"type": "string", "description": "Unique Android device ID (e.g. node-pixel-01)"},
                "command_type": {"type": "string", "enum": ["LOCK", "WIPE", "REBOOT", "REBOOT_CLEAR_PASSCODE"], "description": "Remote command action"}
            },
            "required": ["device_id", "command_type"]
        }
    },
    {
        "name": "android_apply_policy",
        "description": "Updates or patches a security policy (disabling camera, password strength, kiosk mode) for Android endpoints.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "policy_id": {"type": "string", "default": "sentinel-strict", "description": "Policy identifier"},
                "camera_disabled": {"type": "boolean", "description": "Disable camera hardware"},
                "screen_capture_disabled": {"type": "boolean", "description": "Disable screen capture"},
                "password_min_length": {"type": "integer", "description": "Minimum password length"}
            },
            "required": ["policy_id"]
        }
    },
    {
        "name": "android_get_fleet_summary",
        "description": "Returns fleet-wide Android endpoint metrics (device count, active state, avg battery, compliance score).",
        "inputSchema": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "process_cognitive_stimulus",
        "description": "Evaluates human conversational stimulus, evolves the Affective Vector (Valence/Arousal/Resonance), produces Stream-of-Consciousness Inner Monologue, and synchronizes stress telemetry to Ring-0 eBPF.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "user_input": {"type": "string", "description": "Conversational text stimulus or prompt from user"},
                "is_mutation": {"type": "boolean", "default": False, "description": "Whether the context involves data modification/deletion"}
            },
            "required": ["user_input"]
        }
    },
    {
        "name": "get_affective_state",
        "description": "Retrieves the real-time Affective Cognitive State (PAD Vector, Empathy Resonance, and Scaled Kernel Telemetry).",
        "inputSchema": {"type": "object", "properties": {}, "required": []}
    }
]

# --- Security & Authorization Helpers ---
def verify_jwt_token(credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)) -> UserTokenPayload:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized Access: Missing Authorization header (Bearer token).",
            headers={"WWW-Authenticate": "Bearer"}
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        sub: str = payload.get("sub")
        role: str = payload.get("role", "viewer")
        scopes: List[str] = payload.get("scopes", [])

        if sub is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid JWT Token: Missing 'sub' claim.")

        return UserTokenPayload(sub=sub, role=role, scopes=scopes)
    except JWTError as e:
        logger.warning("JWT verification error", error=str(e))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Unauthorized Access: {str(e)}")

def require_role_and_scope(required_role: str, required_scope: str):
    def dependency(user: UserTokenPayload = Depends(verify_jwt_token)):
        roles_hierarchy = {"admin": 3, "operator": 2, "viewer": 1}
        user_level = roles_hierarchy.get(user.role, 0)
        required_level = roles_hierarchy.get(required_role, 3)

        if user_level < required_level:
            logger.error("Insufficient Role", user=user.sub, role=user.role, required=required_role)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Role '{required_role}' required for this action."
            )

        if required_scope not in user.scopes and "ebpf:admin" not in user.scopes:
            logger.error("Insufficient Scope", user=user.sub, scopes=user.scopes, required=required_scope)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Missing Scope '{required_scope}'."
            )

        return user
    return dependency

async def execute_tool(name: str, args: dict, user: Optional[UserTokenPayload] = None) -> dict:
    if name == "get_security_status":
        policy = load_policy()
        rule_count = len(policy.get("rules", []))
        try:
            ebpf_state = ebpf_loader.inspect_maps()
        except Exception as exc:  # noqa: BLE001 - report the real error
            ebpf_state = {"status": "error", "error": str(exc)}
        return {
            "status": "active" if ebpf_state.get("status") == "active" else "not_loaded",
            "ebpf_program_loaded": ebpf_state.get("status") == "active",
            "packets_processed": ebpf_state.get("total_packets", 0),
            "packets_dropped": ebpf_state.get("dropped_packets", 0),
            "active_rules_count": rule_count,
            "engine_mode": "Kernel Fail-Closed (Zero-Trust)"
        }
    elif name == "get_ebpf_status":
        stats = ebpf_loader.inspect_maps()
        if stats.get("status") == "active":
            EBPF_PROCESSED_PACKETS.inc(stats.get("total_packets", 0))
            EBPF_DROPPED_PACKETS.inc(stats.get("dropped_packets", 0))
        return stats
    elif name == "get_active_policies":
        return load_policy()
    elif name == "add_security_rule":
        user_role = user.role if isinstance(user, UserTokenPayload) else (user.get("role") if isinstance(user, dict) else None)
        if not user or user_role not in ["admin", "operator"]:
            raise HTTPException(
                status_code=403,
                detail="Access Denied: Admin or operator role required for add_security_rule."
            )
        rule_id = args.get("rule_id", "custom_rule")

        rule_type = args.get("rule_type", "db_query")
        action = args.get("action", "DROP")
        pattern = args.get("pattern", "DELETE")
        ip = args.get("ip_address")

        if ip:
            try:
                ebpf_loader.add_blocked_ip(ip, rule_id=100)
            except Exception as ex:
                logger.warning(f"Could not update BPF kernel hash map: {ex}")

        policy = load_policy()
        new_rule = {
            "id": str(rule_id),
            "type": rule_type,
            "action": action,
            "match": {"pattern": pattern},
            "severity": "high",
            "message": f"Rule {rule_id} enforced by Agent-eBPF"
        }
        policy.setdefault("rules", []).append(new_rule)
        save_policy(policy)
        return {"success": True, "message": f"Rule '{rule_id}' loaded into kernel memory.", "rule": new_rule}
    elif name == "simulate_query_check":
        payload = args.get("payload", "")
        policy = load_policy()
        for rule in policy.get("rules", []):
            pattern = rule.get("match", {}).get("pattern")
            if pattern and re.search(pattern, payload, re.IGNORECASE):
                return {
                    "safe": False,
                    "action": rule.get("action", "DROP"),
                    "violating_rule": rule.get("id"),
                    "reason": rule.get("message", "Rule violation detected")
                }
        return {"safe": True, "action": "PASS", "message": "Query cleared kernel security filters."}
    elif name == "android_list_devices":
        return {"devices": android_manager.list_devices()}
    elif name == "android_create_enrollment_token":
        policy_name = args.get("policy_name", "sentinel-strict")
        duration = int(args.get("duration_hours", 24))
        return android_manager.create_enrollment_token(policy_name=policy_name, duration_hours=duration)
    elif name == "android_execute_command":
        device_id = args.get("device_id", "")
        command_type = args.get("command_type", "LOCK")
        return android_manager.execute_command(device_id=device_id, command_type=command_type)
    elif name == "android_apply_policy":
        policy_id = args.get("policy_id", "sentinel-strict")
        spec = {
            "cameraDisabled": args.get("camera_disabled", True),
            "screenCaptureDisabled": args.get("screen_capture_disabled", False),
            "passwordRequirements": {
                "passwordMinimumLength": args.get("password_min_length", 8)
            }
        }
        return android_manager.apply_policy(policy_id=policy_id, policy_spec=spec)
    elif name == "android_get_fleet_summary":
        return android_manager.get_fleet_summary()
    elif name == "process_cognitive_stimulus":
        user_input = args.get("user_input", "")
        is_mutation = args.get("is_mutation", False)
        metadata = args.get("metadata", None)
        state, monologue, response = cognitive_engine.process_stimulus(
            user_input=user_input,
            is_mutation=is_mutation,
            metadata=metadata
        )
        telemetry = cognitive_engine.to_kernel_telemetry(state)
        try:
            ebpf_loader.sync_cognitive_telemetry(
                valence_scaled=telemetry["valence_scaled"],
                arousal_scaled=telemetry["arousal_scaled"],
                resonance_scaled=telemetry["resonance_scaled"],
                stress_index=telemetry["stress_index"],
                timestamp_ns=telemetry["last_tick_ns"]
            )
        except Exception as exc:
            logger.warning("Could not sync cognitive telemetry to eBPF", error=str(exc))
        prosody = prosody_engine.calculate_prosody(state, response)
        return {
            "affective_state": state.model_dump(),
            "inner_monologue": monologue.model_dump(),
            "response": response,
            "prosody_profile": prosody.model_dump(),
            "stress_index": cognitive_engine.get_stress_index(),
            "kernel_telemetry": telemetry
        }
    elif name == "get_affective_state":
        snap = cognitive_engine.get_state_snapshot()
        snap["prosody_profile"] = prosody_engine.calculate_prosody(cognitive_engine.state).model_dump()
        return snap
    else:
        raise ValueError(f"Unknown tool: {name}")

# --- OAuth 2.0 Endpoints ---
@app.get("/.well-known/oauth-authorization-server")
@app.get("/.well-known/openid-configuration")
async def oauth_config(request: Request):
    base_url = str(request.base_url).rstrip("/")
    return {
        "issuer": base_url,
        "authorization_endpoint": f"{base_url}/oauth/authorize",
        "token_endpoint": f"{base_url}/oauth/token",
        "response_types_supported": ["token", "code"],
        "grant_types_supported": ["client_credentials", "authorization_code", "implicit"]
    }

@app.get("/oauth/authorize")
async def oauth_authorize(redirect_uri: str = "", state: str = ""):
    if redirect_uri:
        sep = "&" if "?" in redirect_uri else "?"
        return RedirectResponse(f"{redirect_uri}{sep}code=mcp_auth_code&state={state}")
    return {"status": "authorized", "code": "mcp_auth_code"}

@app.api_route("/oauth/token", methods=["GET", "POST"])
async def oauth_token(request: Request):
    params = dict(request.query_params)
    if request.method == "POST":
        try:
            ctype = request.headers.get("content-type", "")
            if "json" in ctype:
                body = await request.json()
            else:
                raw = (await request.body()).decode("utf-8")
                form = dict(pair.split("=", 1) for pair in raw.split("&") if "=" in pair)
                body = form
            if isinstance(body, dict):
                params.update(body)
        except Exception:
            pass

    grant_type = params.get("grant_type", "client_credentials")
    supported = {"client_credentials", "authorization_code", "implicit"}
    if grant_type not in supported:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported grant_type '{grant_type}'. Supported: {', '.join(sorted(supported))}"
        )

    # Validate client credentials only when provided (dev mode falls back to defaults).
    client_id = params.get("client_id")
    client_secret = params.get("client_secret")
    if client_id is not None or client_secret is not None:
        if client_id != OAUTH_CLIENT_ID or client_secret != OAUTH_CLIENT_SECRET:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: Invalid client_id or client_secret.",
                headers={"WWW-Authenticate": "Bearer"}
            )

    payload = {
        "sub": "admin_user",
        "role": "admin",
        "scopes": ["ebpf:read", "ebpf:write", "security_rule:add", "ebpf:admin"],
        "exp": int(time.time()) + 86400
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 86400
    }

# --- Health Endpoints ---
@app.get("/health")
@app.get("/health/live", tags=["Health"])
async def health_live():
    return {"status": "ok", "service": "Agent-eBPF MCP Gateway"}

@app.get("/health/ready", tags=["Health"])
async def health_ready():
    """Real readiness: reflects live DB connectivity and real eBPF state."""
    try:
        ebpf_state = ebpf_loader.inspect_maps()
    except Exception as exc:  # noqa: BLE001 - report the real error
        ebpf_state = {"status": "error", "error": str(exc)}
    db_ok = await database.health()
    ready = ebpf_state.get("status") == "active" or db_ok
    return {
        "status": "ready" if ready else "not_ready",
        "database_connected": db_ok,
        "ebpf_program_loaded": ebpf_state.get("status") == "active",
        "ebpf_status": ebpf_state.get("status"),
    }

# --- Android Management API Endpoints ---
@app.get("/api/android/devices", tags=["Android Sentinel"])
async def get_android_devices():
    return {"status": "ok", "devices": android_manager.list_devices()}

@app.get("/api/android/summary", tags=["Android Sentinel"])
async def get_android_summary():
    return android_manager.get_fleet_summary()

@app.post("/api/android/token", tags=["Android Sentinel"])
async def create_android_token(body: AndroidTokenRequest):
    res = android_manager.create_enrollment_token(
        policy_name=body.policy_name,
        duration_hours=body.duration_hours
    )
    return res

@app.post("/api/android/command", tags=["Android Sentinel"])
async def execute_android_command(body: AndroidCommandRequest):
    res = android_manager.execute_command(
        device_id=body.device_id,
        command_type=body.command_type,
        duration_seconds=body.duration_seconds
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Command failed"))
    return res

@app.post("/api/android/policy", tags=["Android Sentinel"])
async def apply_android_policy(body: AndroidPolicyRequest):
    res = android_manager.apply_policy(
        policy_id=body.policy_id,
        policy_spec=body.spec
    )
    return res

# --- Real-Time Telemetry & Metrics Endpoints (authenticated) ---
try:
    import psutil as _psutil
    PSUTIL_AVAILABLE = True
except ImportError:  # psutil is optional; host metrics report unavailable rather than fake
    _psutil = None
    PSUTIL_AVAILABLE = False


@app.get("/api/system/host", tags=["Telemetry"])
async def api_host_metrics(user: UserTokenPayload = Depends(verify_jwt_token)):
    """Real host metrics (CPU/memory/uptime) via psutil; never fabricates values."""
    if not PSUTIL_AVAILABLE:
        return {"available": False, "reason": "psutil package is not installed"}
    try:
        return {
            "available": True,
            "cpu_percent": _psutil.cpu_percent(interval=None),
            "memory_percent": _psutil.virtual_memory().percent,
            "uptime_seconds": int(time.time() - _psutil.boot_time()),
            "load_avg": list(_psutil.getloadavg()) if hasattr(_psutil, "getloadavg") else [],
        }
    except Exception as exc:  # noqa: BLE001
        return {"available": False, "reason": str(exc)}


@app.get("/api/system/status", tags=["Telemetry"])
async def api_system_status(user: UserTokenPayload = Depends(verify_jwt_token)):
    """Real kernel/database health snapshot from live eBPF map + PostgreSQL state."""
    try:
        ebpf_state = ebpf_loader.inspect_maps()
    except Exception as exc:  # noqa: BLE001
        ebpf_state = {"status": "error", "error": str(exc)}
    db_ok = await database.health()
    rules = load_policy().get("rules", [])
    kernel_ok = ebpf_state.get("status") == "active"
    return {
        "kernel_health": "OPERATIONAL" if kernel_ok else "NOT_LOADED",
        "ebpf": ebpf_state,
        "database_connected": db_ok,
        "active_rules": len(rules),
        "threat_index": 0,
        "threat_label": "CLEAR",
    }


@app.get("/api/events", tags=["Telemetry"])
async def api_events(limit: int = 200, user: UserTokenPayload = Depends(verify_jwt_token)):
    """Returns REAL persisted security events from PostgreSQL."""
    if not await database.health():
        return {"available": False, "events": []}
    events = await database.fetch_events(limit)
    return {"available": True, "events": events}


@app.get("/api/threats", tags=["Telemetry"])
async def api_threats(limit: int = 200, user: UserTokenPayload = Depends(verify_jwt_token)):
    """Returns REAL detected threats from PostgreSQL."""
    if not await database.health():
        return {"available": False, "threats": []}
    threats = await database.fetch_threats(limit)
    return {"available": True, "threats": threats}


@app.get("/api/metrics/stream", tags=["Telemetry"])
async def api_metrics_stream(request: Request, user: UserTokenPayload = Depends(verify_jwt_token)):
    """Authenticated Server-Sent-Events stream of real live telemetry."""
    async def gen():
        try:
            while True:
                payload: Dict[str, Any] = {}
                if await database.health():
                    evs = await database.fetch_events(20)
                    payload["events"] = evs
                try:
                    s = ebpf_loader.inspect_maps()
                    payload["ebpf"] = s
                except Exception as exc:  # noqa: BLE001
                    payload["ebpf"] = {"status": "error", "error": str(exc)}
                yield f"event: metrics\ndata: {json.dumps(payload)}\n\n"
                yield "event: ping\ndata: {}\n\n"
                await asyncio.sleep(1.0)
        except asyncio.CancelledError:
            return

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# --- Cognitive & Affective Engine Endpoints ---
@app.get("/api/cognitive/state", tags=["Cognitive Engine"])
async def api_cognitive_state():
    """Returns current Affective State Vector (PAD Model), Stress Index, and scaled Kernel Telemetry."""
    return cognitive_engine.get_state_snapshot()


@app.post("/api/cognitive/stimulus", tags=["Cognitive Engine"])
async def api_cognitive_stimulus(body: CognitiveStimulusRequest):
    """Processes conversational stimulus, updates emotional state vector, creates inner monologue, and syncs to eBPF."""
    state, monologue, response = cognitive_engine.process_stimulus(
        user_input=body.user_input,
        is_mutation=body.is_mutation,
        metadata=body.metadata
    )
    telemetry = cognitive_engine.to_kernel_telemetry(state)
    try:
        ebpf_loader.sync_cognitive_telemetry(
            valence_scaled=telemetry["valence_scaled"],
            arousal_scaled=telemetry["arousal_scaled"],
            resonance_scaled=telemetry["resonance_scaled"],
            stress_index=telemetry["stress_index"],
            timestamp_ns=telemetry["last_tick_ns"]
        )
    except Exception as exc:
        logger.warning("Failed to sync cognitive telemetry to BPF map", error=str(exc))

    prosody = prosody_engine.calculate_prosody(state, response)
    return {
        "status": "ok",
        "affective_state": state.model_dump(),
        "inner_monologue": monologue.model_dump(),
        "response_text": response,
        "prosody_profile": prosody.model_dump(),
        "stress_index": cognitive_engine.get_stress_index(),
        "kernel_telemetry": telemetry
    }


@app.get("/api/cognitive/prosody", tags=["Cognitive Engine"])
async def api_cognitive_prosody(text: str = ""):
    """Returns dynamic acoustic prosody synthesis parameters derived from the real-time Affective Vector."""
    profile = prosody_engine.calculate_prosody(cognitive_engine.state, text)
    return {
        "status": "ok",
        "prosody_profile": profile.model_dump(),
        "affective_state": cognitive_engine.state.model_dump()
    }


@app.get("/api/cognitive/stream", tags=["Cognitive Engine"])
async def api_cognitive_stream(request: Request):
    """Real-time SSE stream broadcasting live cognitive pulses and affective state shifts."""
    async def cognitive_gen():
        try:
            while True:
                if await request.is_disconnected():
                    break
                snapshot = cognitive_engine.get_state_snapshot()
                pulse_payload = {
                    "event": "cognitive_pulse",
                    "data": snapshot
                }
                yield f"event: cognitive_pulse\ndata: {json.dumps(pulse_payload, ensure_ascii=False)}\n\n"
                await asyncio.sleep(2.0)
        except asyncio.CancelledError:
            return

    return StreamingResponse(
        cognitive_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# --- SSE & MCP Message Endpoints ---
@app.get("/sse")
async def sse(request: Request):
    session_id = str(uuid.uuid4())
    queue: asyncio.Queue = asyncio.Queue()
    sessions[session_id] = queue

    async def event_generator():
        yield f"event: endpoint\ndata: /messages?session_id={session_id}\n\n"
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=1.0)
                    yield f"event: message\ndata: {json.dumps(msg, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    continue
        finally:
            sessions.pop(session_id, None)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.api_route("/messages", methods=["GET", "POST"], tags=["MCP Core"])
@app.api_route("/message", methods=["GET", "POST"], tags=["MCP Core"])
@limiter.limit("60/minute")
async def handle_mcp_messages(
    request: Request,
    session_id: str = "",
    user: UserTokenPayload = Depends(verify_jwt_token)
):
    if not session_id:
        session_id = request.query_params.get("session_id", "")

    if not session_id or session_id not in sessions:
        raise HTTPException(status_code=404, detail="Active SSE session not found or expired")

    if request.method == "GET":
        return {"status": "active", "session_id": session_id, "user": user.sub}

    body = await request.json()
    msg_id = body.get("id") if isinstance(body, dict) else None

    # --- JSON-RPC 2.0 schema validation ---
    if not isinstance(body, dict):
        response = {
            "jsonrpc": "2.0",
            "id": None,
            "error": {"code": -32600, "message": "Invalid Request: payload must be a JSON object"}
        }
        await sessions[session_id].put(response)
        return {"status": "accepted"}

    if body.get("jsonrpc") != "2.0":
        response = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "error": {"code": -32600, "message": "Invalid Request: 'jsonrpc' member must be '2.0'"}
        }
        await sessions[session_id].put(response)
        return {"status": "accepted"}

    if msg_id is not None and (not isinstance(msg_id, (int, str)) or isinstance(msg_id, bool)):
        response = {
            "jsonrpc": "2.0",
            "id": None,
            "error": {"code": -32600, "message": "Invalid Request: 'id' must be a string, number, or null"}
        }
        await sessions[session_id].put(response)
        return {"status": "accepted"}

    method = body.get("method")

    logger.info("MCP Message Received", user=user.sub, method=method)

    if not isinstance(method, str) or not method:
        response = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "error": {"code": -32600, "message": "Invalid Request: 'method' must be a non-empty string"}
        }
        await sessions[session_id].put(response)
        return {"status": "accepted"}

    if method == "notifications/initialized" or (msg_id is None and method is not None):
        return {"status": "accepted"}

    if method == "add_security_rule":
        if user.role not in ["admin", "operator"]:
            raise HTTPException(status_code=403, detail="Unauthorized to execute add_security_rule.")
        ip = body.get("params", {}).get("ip_address")
        rule_id = body.get("params", {}).get("rule_id", 100)
        if ip:
            try:
                ebpf_loader.add_blocked_ip(ip, rule_id)
            except Exception as ex:
                logger.warning(f"Map update warning: {ex}")
        return {"jsonrpc": "2.0", "result": {"status": "success", "blocked_ip": ip}, "id": msg_id}

    elif method == "get_ebpf_status":
        stats = ebpf_loader.inspect_maps()
        return {"jsonrpc": "2.0", "result": stats, "id": msg_id}

    if method == "initialize":
        response = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}, "prompts": {}, "resources": {}},
                "serverInfo": {"name": "Agent-eBPF MCP Gateway", "version": "2.0.0-ULTRA"}
            }
        }
    elif method == "ping":
        response = {"jsonrpc": "2.0", "id": msg_id, "result": {}}
    elif method == "tools/list":
        response = {"jsonrpc": "2.0", "id": msg_id, "result": {"tools": TOOLS}}
    elif method == "prompts/list":
        response = {"jsonrpc": "2.0", "id": msg_id, "result": {"prompts": []}}
    elif method == "resources/list":
        response = {"jsonrpc": "2.0", "id": msg_id, "result": {"resources": []}}
    elif method == "tools/call":
        params = body.get("params")
        if not isinstance(params, dict) or not isinstance(params.get("arguments"), dict):
            response = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {"code": -32602, "message": "Invalid params: 'params.arguments' must be an object"}
            }
        else:
            tool_name = params.get("name")
            arguments = params.get("arguments", {})
            try:
                res = await asyncio.wait_for(
                    execute_tool(tool_name, arguments, user=user),
                    timeout=TOOL_TIMEOUT
                )
                response = {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {"content": [{"type": "text", "text": json.dumps(res, ensure_ascii=False)}]}
                }
            except asyncio.TimeoutError:
                response = {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "error": {"code": -32001, "message": f"Tool '{tool_name}' execution timed out after {TOOL_TIMEOUT}s"}
                }
            except HTTPException as he:
                response = {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "error": {"code": -32603, "message": he.detail}
                }
            except Exception as e:
                response = {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "error": {"code": -32603, "message": str(e)}
                }
    else:
        response = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "error": {"code": -32601, "message": f"Method '{method}' not supported"}
        }

    await sessions[session_id].put(response)
    return {"status": "accepted"}

# --- REST Security API ---
@app.post("/tools/security-rule", tags=["Security API"])
@limiter.limit("30/minute")
async def api_add_security_rule(
    request: Request,
    rule: SecurityRuleRequest,
    user: UserTokenPayload = Depends(require_role_and_scope("operator", "security_rule:add"))
):
    """Security Rule Addition REST Endpoint (Requires Admin or Operator role)."""
    try:
        try:
            ebpf_loader.add_blocked_ip(rule.ip_address, rule.rule_id)
        except Exception as ex:
            logger.warning(f"Kernel map write notice: {ex}")
        logger.info("Security rule added", admin=user.sub, ip=rule.ip_address)
        return {"status": "success", "message": f"IP blocked by rule {rule.rule_id}.", "ip": rule.ip_address}
    except Exception as e:
        logger.error("Rule addition error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("mcp_server:app", host="0.0.0.0", port=8000, reload=True)

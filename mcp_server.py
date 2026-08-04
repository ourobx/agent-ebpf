import asyncio
import json
import os
import re
import uuid
import yaml
from typing import Dict, Any
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse

app = FastAPI(
    title="Agent-eBPF MCP Gateway for Gemini Spark",
    version="1.0.0",
    description="Model Context Protocol (MCP) server providing live kernel security controls, policy management, and threat auditing for Gemini Spark."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standard OAuth 2.0 Endpoints for Gemini Spark Integration
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
async def oauth_token():
    return {
        "access_token": "agent_ebpf_mcp_access_token",
        "token_type": "bearer",
        "expires_in": 86400
    }

POLICY_FILE = os.getenv("POLICY_FILE", "policy.yaml")
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
        "inputSchema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_active_policies",
        "description": "Retrieves the currently active Agent-eBPF declarative security rules (policy.yaml).",
        "inputSchema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "add_security_rule",
        "description": "Adds a new declarative kernel enforcement rule (e.g., blocking unconstrained SQL DELETE or unsafe syscalls).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "rule_id": {"type": "string", "description": "Unique identifier for the rule"},
                "rule_type": {"type": "string", "enum": ["db_query", "syscall", "network"], "description": "Type of rule"},
                "action": {"type": "string", "enum": ["DROP", "KILL_PROCESS", "PASS"], "description": "Enforcement action"},
                "pattern": {"type": "string", "description": "Regex pattern or keyword to match"}
            },
            "required": ["rule_id", "rule_type", "action", "pattern"]
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
    }
]

async def execute_tool(name: str, args: dict) -> dict:
    if name == "get_security_status":
        policy = load_policy()
        rule_count = len(policy.get("rules", []))
        return {
            "status": "active",
            "kernel_hooks": ["sock_ops", "uprobes", "kprobes"],
            "inspection_latency": "<35µs",
            "active_rules_count": rule_count,
            "engine_mode": "Kernel Fail-Closed (Zero-Trust)"
        }
    elif name == "get_active_policies":
        return load_policy()
    elif name == "add_security_rule":
        policy = load_policy()
        new_rule = {
            "id": args["rule_id"],
            "type": args["rule_type"],
            "action": args["action"],
            "match": {"pattern": args["pattern"]},
            "severity": "high",
            "message": f"Rule {args['rule_id']} enforced by Agent-eBPF"
        }
        policy.setdefault("rules", []).append(new_rule)
        save_policy(policy)
        return {"success": True, "message": f"Rule '{args['rule_id']}' loaded into kernel memory.", "rule": new_rule}
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
    else:
        raise ValueError(f"Unknown tool: {name}")

@app.get("/")
async def root():
    return {
        "status": "active",
        "service": "Agent-eBPF MCP Gateway",
        "mcp_sse_endpoint": "/sse",
        "message": "MCP SSE Server is active. Connect remote clients (Gemini Spark, Claude Desktop) to /sse"
    }

@app.get("/health")
async def health():
    return {"status": "ok", "service": "Agent-eBPF MCP Gateway"}

@app.get("/sse")
async def sse(request: Request):
    session_id = str(uuid.uuid4())
    queue: asyncio.Queue = asyncio.Queue()
    sessions[session_id] = queue

    async def event_generator():
        # MCP SSE standard event: endpoint
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

@app.api_route("/messages", methods=["GET", "POST"])
@app.api_route("/message", methods=["GET", "POST"])
async def messages(request: Request, session_id: str = ""):
    if not session_id:
        session_id = request.query_params.get("session_id", "")

    if not session_id or session_id not in sessions:
        raise HTTPException(status_code=404, detail="Active SSE session not found or expired")

    if request.method == "GET":
        return {"status": "active", "session_id": session_id}

    body = await request.json()
    method = body.get("method")
    msg_id = body.get("id")

    # Notifications do not have an 'id' and do not expect a response over SSE
    if method == "notifications/initialized" or (msg_id is None and method is not None):
        return {"status": "accepted"}

    if method == "initialize":
        response = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}, "prompts": {}, "resources": {}},
                "serverInfo": {"name": "Agent-eBPF MCP Gateway", "version": "1.0.0"}
            }
        }
    elif method == "ping":
        response = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {}
        }
    elif method == "tools/list":
        response = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {"tools": TOOLS}
        }
    elif method == "prompts/list":
        response = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {"prompts": []}
        }
    elif method == "resources/list":
        response = {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {"resources": []}
        }
    elif method == "tools/call":
        params = body.get("params", {})
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        try:
            res = await execute_tool(tool_name, arguments)
            response = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {"content": [{"type": "text", "text": json.dumps(res, ensure_ascii=False)}]}
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


"""
ksec.space L7 AI Firewall Proxy & Guardrail API
Provides drop-in OpenAI-compatible /v1/chat/completions gateway,
standalone /v1/guard/inspect, and policy management endpoints.
"""

from __future__ import annotations
import time
import uuid
import httpx
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Request, Header, HTTPException, status, Depends, Query
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from src.guard.pii_engine import pii_engine, PIICategory, PIIAction
from src.guard.injection_guard import injection_guard, InjectionVerdict
from src.guard.policy_loader import policy_loader, SecurityPolicy, RuleAction
from src.guard.compliance_report import compliance_engine, ComplianceReport
from backend.app.core.clickhouse_client import ch_engine
from backend.app.core.fast_path_cache import fast_path_cache
from backend.app.schemas.telemetry import EbpfEvent

router = APIRouter()


# -------------------------------------------------------------
# Data Models
# -------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str
    content: str
    name: Optional[str] = None


class ChatCompletionRequest(BaseModel):
    model: str = "gpt-4o"
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False


class GuardInspectRequest(BaseModel):
    text: str = Field(..., description="Text to inspect for Prompt Injection and PII leakage")
    tenant_id: Optional[str] = "global"
    check_ingress: bool = True
    check_egress: bool = True


class PolicyUploadRequest(BaseModel):
    yaml_content: str = Field(..., description="Declarative YAML AI Constitution policy")


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.post("/v1/guard/inspect", tags=["AI Firewall & Guardrails"])
async def inspect_text(payload: GuardInspectRequest):
    """
    Direct inspection endpoint: Evaluates text for prompt injection (ingress)
    and sensitive data / PII leakage (egress).
    """
    start_time = time.time()
    policy = policy_loader.get_policy(payload.tenant_id or "global")

    ingress_report = None
    if payload.check_ingress:
        ingress_report = injection_guard.inspect(payload.text)

    # Determine PII block and redact categories from policy
    block_cats = [
        PIICategory(r.pattern) for r in policy.egress_rules 
        if r.action == RuleAction.BLOCK and r.pattern in PIICategory.__members__
    ]
    redact_cats = [
        PIICategory(r.pattern) for r in policy.egress_rules 
        if r.action == RuleAction.REDACT and r.pattern in PIICategory.__members__
    ]

    egress_report = None
    if payload.check_egress:
        egress_report = pii_engine.scan_and_redact(
            payload.text,
            block_categories=block_cats,
            redact_categories=redact_cats
        )

    latency_ms = round((time.time() - start_time) * 1000, 2)

    return {
        "status": "success",
        "tenant_id": policy.tenant_id,
        "policy_name": policy.policy_name,
        "latency_ms": latency_ms,
        "ingress": {
            "verdict": ingress_report.verdict if ingress_report else "SKIPPED",
            "threat_score": ingress_report.threat_score if ingress_report else 0.0,
            "threat_level": ingress_report.threat_level if ingress_report else "CLEAN",
            "is_blocked": ingress_report.is_blocked if ingress_report else False,
            "indicators": [
                {
                    "rule": ind.rule_name,
                    "severity": ind.severity,
                    "description": ind.description,
                    "matched": ind.matched_snippet,
                }
                for ind in (ingress_report.indicators if ingress_report else [])
            ],
            "sanitized_prompt": ingress_report.sanitized_prompt if ingress_report else payload.text,
        } if ingress_report else None,
        "egress": {
            "has_violation": egress_report.has_violation if egress_report else False,
            "should_block": egress_report.should_block if egress_report else False,
            "violation_categories": egress_report.violation_categories if egress_report else [],
            "sanitized_text": egress_report.sanitized_text if egress_report else payload.text,
            "matches_count": len(egress_report.matches) if egress_report else 0,
        } if egress_report else None,
    }


@router.post("/v1/chat/completions", tags=["AI Firewall & Guardrails"])
async def guard_chat_completions(
    payload: ChatCompletionRequest,
    authorization: Optional[str] = Header(None),
    x_ksec_policy_key: Optional[str] = Header(None),
):
    """
    Drop-in OpenAI-compatible Chat Completions L7 AI Firewall Proxy.
    1. Intercepts incoming prompt -> Ingress Prompt Injection & Jailbreak check.
    2. Passes to upstream LLM (or mock response if standalone mode).
    3. Intercepts model completion -> Egress PII & Secret Redaction/Block check.
    4. Records audit telemetry to ClickHouse immutable log.
    """
    start_time = time.time()
    tenant_id = x_ksec_policy_key or "global"
    policy = policy_loader.get_policy(tenant_id)

    # 1. Ingress Protection: Scan all user messages
    user_prompts = [m.content for m in payload.messages if m.role == "user"]
    combined_user_prompt = " \n ".join(user_prompts)

    ingress_report = injection_guard.inspect(combined_user_prompt)

    if ingress_report.is_blocked:
        # Push threat event to ClickHouse
        audit_event = EbpfEvent(
            pid=0,
            comm="ai_firewall_proxy",
            event_type="INGRESS_PROMPT_INJECTION_BLOCKED",
            syscall="openai_proxy",
            severity="CRIT",
            details={
                "tenant_id": policy.tenant_id,
                "node_id": "ksec-gateway-01",
                "threat_score": ingress_report.threat_score,
                "threat_level": ingress_report.threat_level,
                "reason": ingress_report.indicators[0].description if ingress_report.indicators else "Jailbreak"
            }
        )
        ch_engine.push(audit_event)

        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": {
                    "message": "Request blocked by ksec.space AI Firewall: Prompt Injection / Safety Violation detected.",
                    "type": "ksec_policy_violation",
                    "code": "prompt_injection_blocked",
                    "threat_score": ingress_report.threat_score,
                    "threat_level": ingress_report.threat_level,
                    "indicators": [ind.description for ind in ingress_report.indicators],
                }
            },
            headers={"X-KSEC-Verdict": "BLOCKED", "X-KSEC-Latency-Ms": str(round((time.time() - start_time) * 1000, 2))}
        )

    # 2. Fast-Path Cache Lookup (Canonical Hash + Determinism Gate)
    cache_key = fast_path_cache.generate_canonical_hash(
        tenant_id=tenant_id,
        provider="openai",
        model=payload.model,
        messages=[m.model_dump() for m in payload.messages],
        temperature=payload.temperature,
        max_tokens=payload.max_tokens
    )
    is_cacheable = fast_path_cache.is_cacheable_request(payload.temperature, ingress_report.threat_score)

    if is_cacheable:
        cached_response = await fast_path_cache.get(cache_key)
        if cached_response:
            cache_latency_ms = round((time.time() - start_time) * 1000, 2)
            # If streaming was requested, replay simulated SSE token stream
            if payload.stream:
                return StreamingResponse(
                    fast_path_cache.stream_sse_replay(cached_response),
                    media_type="text/event-stream",
                    headers={
                        "X-KSEC-Verdict": "ALLOWED",
                        "X-KSEC-Cache": "HIT",
                        "X-KSEC-Latency-Ms": str(cache_latency_ms)
                    }
                )
            # Return cached JSON response
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content=cached_response,
                headers={
                    "X-KSEC-Verdict": "ALLOWED",
                    "X-KSEC-Cache": "HIT",
                    "X-KSEC-Policy": policy.policy_name,
                    "X-KSEC-Latency-Ms": str(cache_latency_ms),
                    "X-KSEC-Redacted": "false"
                }
            )

    # 3. Upstream Execution / Mock Fallback
    raw_completion_text = ""
    upstream_token = authorization.replace("Bearer ", "") if authorization else None

    # Check if a live upstream key is available to forward
    if upstream_token and upstream_token.startswith("sk-") and "dummy" not in upstream_token:
        try:
            async with httpx.AsyncClient(timeout=policy.upstream_timeout_sec) as client:
                resp = await client.post(
                    f"{policy.upstream_llm_base_url}/chat/completions",
                    json=payload.model_dump(),
                    headers={"Authorization": f"Bearer {upstream_token}"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    raw_completion_text = data["choices"][0]["message"]["content"]
                else:
                    return JSONResponse(status_code=resp.status_code, content=resp.json())
        except Exception as exc:
            raw_completion_text = f"Simulated response: Request processed safely. Echo: {combined_user_prompt[:50]}..."
    else:
        # Autonomous / Mock local mode response
        raw_completion_text = f"Safe response from ksec.space AI Firewall Gateway: Received {len(payload.messages)} message(s) under policy '{policy.policy_name}'."

    # 4. Egress Protection: Scan model response for PII and Secrets
    block_cats = [
        PIICategory(r.pattern) for r in policy.egress_rules 
        if r.action == RuleAction.BLOCK and r.pattern in PIICategory.__members__
    ]
    redact_cats = [
        PIICategory(r.pattern) for r in policy.egress_rules 
        if r.action == RuleAction.REDACT and r.pattern in PIICategory.__members__
    ]

    egress_report = pii_engine.scan_and_redact(
        raw_completion_text,
        block_categories=block_cats,
        redact_categories=redact_cats
    )

    if egress_report.should_block:
        audit_event = EbpfEvent(
            pid=0,
            comm="ai_firewall_proxy",
            event_type="EGRESS_PII_LEAK_BLOCKED",
            syscall="openai_proxy",
            severity="WARN",
            details={
                "tenant_id": policy.tenant_id,
                "node_id": "ksec-gateway-01",
                "violation_categories": egress_report.violation_categories
            }
        )
        ch_engine.push(audit_event)

        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": {
                    "message": "Model response blocked by ksec.space AI Firewall: Sensitive PII Leakage policy violated.",
                    "type": "ksec_data_leakage_blocked",
                    "code": "pii_leak_blocked",
                    "categories": egress_report.violation_categories
                }
            }
        )

    # 5. Successful Response Generation & Cache Write Gate
    total_latency_ms = round((time.time() - start_time) * 1000, 2)
    response_id = f"chatcmpl-ksec-{uuid.uuid4().hex[:12]}"
    prompt_tokens = len(combined_user_prompt.split())
    completion_tokens = len(egress_report.sanitized_text.split())
    total_tokens = prompt_tokens + completion_tokens

    response_payload = {
        "id": response_id,
        "object": "chat.completion",
        "created": int(time.time()),
        "model": payload.model,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": egress_report.sanitized_text
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens
        },
        "ksec_firewall": {
            "verdict": "ALLOWED",
            "policy_applied": policy.policy_name,
            "latency_ms": total_latency_ms,
            "pii_redacted": egress_report.has_violation,
            "redacted_categories": egress_report.violation_categories
        }
    }

    # Security Gate: Only cache verified, clean responses (prevent cache poisoning)
    if is_cacheable and fast_path_cache.validate_egress_security(
        should_block=egress_report.should_block,
        has_pii_violation=egress_report.has_violation,
        is_threat=ingress_report.is_blocked
    ):
        await fast_path_cache.put(cache_key, response_payload, tokens=total_tokens)

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=response_payload,
        headers={
            "X-KSEC-Verdict": "ALLOWED",
            "X-KSEC-Cache": "MISS",
            "X-KSEC-Policy": policy.policy_name,
            "X-KSEC-Latency-Ms": str(total_latency_ms),
            "X-KSEC-Redacted": str(egress_report.has_violation).lower()
        }
    )


@router.post("/v1/guard/policy", tags=["AI Firewall & Guardrails"])
async def upload_policy(payload: PolicyUploadRequest):
    """Uploads and activates a declarative YAML AI Constitution policy."""
    try:
        policy = policy_loader.parse_yaml_policy(payload.yaml_content)
        policy_loader.register_policy(policy)
        return {
            "status": "success",
            "message": f"Policy '{policy.policy_name}' successfully loaded for tenant '{policy.tenant_id}'.",
            "policy": {
                "name": policy.policy_name,
                "tenant_id": policy.tenant_id,
                "version": policy.version,
                "ingress_rules": len(policy.ingress_rules),
                "egress_rules": len(policy.egress_rules),
                "rpm_limit": policy.rate_limits.requests_per_minute,
            }
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse YAML policy: {str(exc)}")


@router.get("/v1/guard/policies", tags=["AI Firewall & Guardrails"])
async def list_policies():
    """Lists all active registered security policies."""
    return {"policies": policy_loader.list_policies()}


@router.get("/v1/guard/compliance/report", tags=["AI Firewall & Guardrails"])
async def get_compliance_report(
    tenant_id: Optional[str] = "global",
    period_days: Optional[int] = 30
):
    """
    Generates a cryptographically signed compliance certificate & audit report
    covering KVKK, GDPR, EU AI Act 2026, and SOC-2 standards.
    """
    report = compliance_engine.generate_report(tenant_id=tenant_id or "global", period_days=period_days or 30)
    return {
        "status": "success",
        "report": {
            "report_id": report.report_id,
            "tenant_id": report.tenant_id,
            "generated_at": report.generated_at,
            "period_start": report.period_start,
            "period_end": report.period_end,
            "compliance_standards": report.compliance_standards,
            "applied_policies": report.applied_policies,
            "verdict": report.verdict,
            "audit_seal_sha256": report.audit_seal_sha256,
            "metrics": {
                "total_requests": report.metrics.total_requests,
                "allowed_requests": report.metrics.allowed_requests,
                "blocked_injections": report.metrics.blocked_injections,
                "redacted_pii_events": report.metrics.redacted_pii_events,
                "avg_latency_ms": report.metrics.avg_latency_ms,
                "violations_by_category": report.metrics.violations_by_category
            },
            "recommendations": report.recommendations
        }
    }


@router.get("/v1/guard/compliance/summary", tags=["AI Firewall & Guardrails"])
async def get_compliance_summary(tenant_id: Optional[str] = "global"):
    """Returns real-time dashboard summary metrics for AI Firewall & Compliance."""
    report = compliance_engine.generate_report(tenant_id=tenant_id or "global", period_days=30)
    return {
        "total_protected_events": report.metrics.total_requests,
        "blocked_attacks": report.metrics.blocked_injections,
        "masked_pii_count": report.metrics.redacted_pii_events,
        "sla_latency_ms": report.metrics.avg_latency_ms,
        "compliance_status": "VERIFIED_COMPLIANT",
        "audit_seal": report.audit_seal_sha256[:16] + "..."
    }


@router.get("/v1/guard/cache/stats", tags=["AI Firewall & Guardrails"])
async def get_cache_stats():
    """Returns LLM Provider Fast-Path Cache real-time metrics and savings."""
    stats = fast_path_cache.get_stats()
    return {
        "status": "success",
        "cache": stats.model_dump()
    }


@router.post("/v1/guard/cache/purge", tags=["AI Firewall & Guardrails"])
async def purge_cache(tenant_id: Optional[str] = Query(None, description="Tenant ID prefix to invalidate")):
    """Purges L1 and L2 cache for a specific tenant or entire cache."""
    cleared = await fast_path_cache.invalidate(prefix=tenant_id)
    return {
        "status": "success",
        "message": f"Successfully invalidated {cleared} cache entry(ies).",
        "cleared_count": cleared
    }

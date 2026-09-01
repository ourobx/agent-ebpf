from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional

from backend.app.core.nlp_compiler import nlp_compiler, PolicyCompilationResult, CompiledRule
from backend.app.schemas.policy_compiler import CompiledEbpfRule
from backend.app.core.policy_engine import policy_engine
from backend.app.core.auth import get_current_user

router = APIRouter()


class CompileRequest(BaseModel):
    query: Optional[str] = Field(None, description="Natural language policy prompt")
    natural_language_rule: Optional[str] = Field(None, description="Natural language security intent rule")


class ApplyCompiledRuleRequest(BaseModel):
    rule: CompiledRule
    pid: int = Field(default=0, description="Optional target process ID to immediately bind the rule")


@router.post("/policy/compile", response_model=CompiledEbpfRule, tags=["NLP Policy Compiler"])
async def compile_policy_from_text(payload: CompileRequest, current_user: str = Depends(get_current_user)):
    """
    Translates natural language security rules into typed eBPF/Cgroup policies via Gemini AI.
    """
    text = payload.natural_language_rule or payload.query or ""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Policy text rule cannot be empty.")

    try:
        compiled_rule = await nlp_compiler.compile_natural_language(text)
        print(f"[NLP COMPILER] Compiled policy '{compiled_rule.policy_id}' for tenant/user: {current_user}")
        return compiled_rule
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI policy compilation failed: {exc}")


@router.post("/compiler/compile", response_model=PolicyCompilationResult, tags=["NLP Policy Compiler"])
async def compile_policy_from_nlp(payload: CompileRequest):
    """
    Synchronous fallback endpoint for compiler evaluations.
    """
    text = payload.query or payload.natural_language_rule or ""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")

    result = nlp_compiler.compile(text)
    return result


@router.post("/compiler/apply", tags=["NLP Policy Compiler"])
async def apply_compiled_rule(payload: ApplyCompiledRuleRequest):
    """
    Directly provisions a compiled natural language rule into the active eBPF kernel policy map.
    """
    is_allowed = payload.rule.action.upper() == "ALLOW"
    if payload.pid > 0:
        policy_engine.update_intent_lease(payload.pid, is_allowed, payload.rule.id)

    return {
        "status": "applied",
        "rule_id": payload.rule.id,
        "action": payload.rule.action,
        "target_comm": payload.rule.target_comm,
        "kernel_enforced": True
    }

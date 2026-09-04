"""
ksec.space Framework Adapters: Drop-in Guardrails for LangChain, CrewAI, and LlamaIndex.
Enforces ingress and egress guardrails around agent tool invocations and LLM chains.
"""

from __future__ import annotations
import functools
from typing import Any, Callable, Dict, List, Optional

from src.guard.pii_engine import pii_engine
from src.guard.injection_guard import injection_guard
from src.guard.policy_loader import policy_loader


class KsecSecurityException(Exception):
    """Raised when an AI agent action violates ksec.space security policies."""
    def __init__(self, message: str, threat_score: float = 1.0, indicators: Optional[List[str]] = None):
        super().__init__(message)
        self.threat_score = threat_score
        self.indicators = indicators or []


def guard_agent_tool(
    name: Optional[str] = None,
    tenant_id: str = "global",
    block_injection: bool = True,
    redact_pii: bool = True
) -> Callable:
    """
    Decorator for AI Agent tools (e.g. LangChain @tool or CrewAI tools).
    Scans input parameters for adversarial injection and masks sensitive PII in tool output.
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            tool_name = name or func.__name__

            # 1. Ingress parameter inspection
            if block_injection:
                param_text = " ".join([str(a) for a in args] + [f"{k}={v}" for k, v in kwargs.items()])
                verdict = injection_guard.inspect(param_text, tenant_id=tenant_id)
                if verdict.is_blocked:
                    ind_msgs = [ind.description for ind in verdict.indicators]
                    raise KsecSecurityException(
                        f"Execution of tool '{tool_name}' blocked by ksec.space: Prompt Injection detected.",
                        threat_score=verdict.threat_score,
                        indicators=ind_msgs
                    )

            # 2. Execute underlying tool
            raw_result = func(*args, **kwargs)

            # 3. Egress PII & Secret Redaction
            if redact_pii and isinstance(raw_result, str):
                egress = pii_engine.scan_and_redact(raw_result, tenant_id=tenant_id)
                return egress.sanitized_text

            return raw_result

        return wrapper

    return decorator


class KsecLangChainCallbackHandler:
    """
    LangChain BaseCallbackHandler implementation for real-time guardrail enforcement.
    """

    def __init__(self, tenant_id: str = "global", raise_on_violation: bool = True):
        self.tenant_id = tenant_id
        self.raise_on_violation = raise_on_violation

    def on_llm_start(self, serialized: Dict[str, Any], prompts: List[str], **kwargs: Any) -> None:
        """Inspects prompt array before submission to LLM."""
        for prompt in prompts:
            verdict = injection_guard.inspect(prompt, tenant_id=self.tenant_id)
            if verdict.is_blocked and self.raise_on_violation:
                raise KsecSecurityException(
                    f"LLM generation blocked by ksec.space: {verdict.indicators[0].description if verdict.indicators else 'Adversarial Prompt'}",
                    threat_score=verdict.threat_score,
                    indicators=[i.description for i in verdict.indicators]
                )

    def on_llm_end(self, response: Any, **kwargs: Any) -> None:
        """Inspects LLM outputs and sanitizes PII in generations."""
        if hasattr(response, "generations"):
            for gen_list in response.generations:
                for gen in gen_list:
                    if hasattr(gen, "text"):
                        egress = pii_engine.scan_and_redact(gen.text, tenant_id=self.tenant_id)
                        gen.text = egress.sanitized_text

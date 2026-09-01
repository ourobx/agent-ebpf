"""
Natural Language Policy Compiler (NLP-to-eBPF).
Translates plain English security intents into verified, type-safe eBPF policy rules
using Gemini structured JSON outputs with deterministic offline fallback heuristics.
"""

import os
import re
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from backend.app.schemas.policy_compiler import CompiledEbpfRule

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None


class CompiledRule(BaseModel):
    id: str
    name: str
    target_comm: str
    allowed_ports: List[int]
    action: str
    risk_score: int = Field(..., ge=0, le=100)
    explanation: str


class PolicyCompilationResult(BaseModel):
    natural_query: str
    rules: List[CompiledRule]
    overall_safety_rating: str
    warnings: List[str] = []


class NLPEBPFCompiler:
    KNOWN_PROCESSES = ["python", "python3", "node", "curl", "wget", "nc", "bash", "sh", "git", "docker"]

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = "gemini-2.5-flash"
        self.client = None
        if genai and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception:
                self.client = None

    async def compile_natural_language(self, user_prompt: str) -> CompiledEbpfRule:
        """
        Compiles plain English prompt into a structured eBPF policy object using Gemini or deterministic engine.
        """
        if self.client:
            try:
                system_instruction = (
                    "You are an elite Linux Kernel Security & eBPF Architect. "
                    "Your task is to parse natural language security rules into structured eBPF policy objects. "
                    "Extract the target command (comm), allowed ports, action (ALLOW/DROP), and assess the security risk level."
                )
                prompt = f"Natural language security rule to compile: '{user_prompt}'"

                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=CompiledEbpfRule,
                        temperature=0.1,
                    ),
                )
                return CompiledEbpfRule.model_validate_json(response.text)
            except Exception as exc:
                print(f"[WARN] Gemini LLM compilation fallback triggered: {exc}")

        # Deterministic Offline Rule Extraction Engine
        query_lower = user_prompt.lower()

        # 1. Target process extraction
        target_comm = "python3"
        for proc in self.KNOWN_PROCESSES:
            if re.search(rf"\b{proc}\b", query_lower):
                target_comm = proc
                break

        # 2. Port extraction
        ports_found = [int(p) for p in re.findall(r"\b(?:port\s*)?(\d{1,5})\b", query_lower) if 1 <= int(p) <= 65535]
        if "443" in query_lower and 443 not in ports_found:
            ports_found.append(443)
        if "80" in query_lower and 80 not in ports_found:
            ports_found.append(80)
        if "8000" in query_lower and 8000 not in ports_found:
            ports_found.append(8000)

        # 3. Action determination
        if any(w in query_lower for w in ["allow", "permit", "access", "connect"]):
            action = "ALLOW"
        elif any(w in query_lower for w in ["deny", "block", "drop", "prevent", "reject", "forbid"]):
            action = "DROP"
        else:
            action = "ALLOW"

        # 4. Risk Level
        if target_comm in ["nc", "bash", "sh"] and action == "ALLOW":
            risk_level = "CRITICAL"
        elif not ports_found and action == "ALLOW":
            risk_level = "HIGH"
        elif any(p in [22, 23, 3389] for p in ports_found) and action == "ALLOW":
            risk_level = "HIGH"
        elif action == "ALLOW" and all(p in [443, 80, 8000, 5432] for p in ports_found):
            risk_level = "LOW"
        else:
            risk_level = "MEDIUM"

        return CompiledEbpfRule(
            policy_id=f"pol-{target_comm}-{len(ports_found)}p",
            rule_name=f"Autonomous {target_comm.capitalize()} {action} Policy",
            target_comm=target_comm,
            allowed_ports=sorted(list(set(ports_found))),
            protocol="TCP",
            action=action,
            risk_level=risk_level,
            rationale=f"Generated deterministic eBPF map rule matching {target_comm} on ports {ports_found or 'ALL'} with verdict {action}."
        )

    def compile(self, query: str) -> PolicyCompilationResult:
        """Synchronous wrapper for legacy endpoints."""
        query_lower = query.lower()
        warnings: List[str] = []

        target_comm = "python3"
        for proc in self.KNOWN_PROCESSES:
            if re.search(rf"\b{proc}\b", query_lower):
                target_comm = proc
                break

        ports_found = [int(p) for p in re.findall(r"\b(?:port\s*)?(\d{1,5})\b", query_lower) if 1 <= int(p) <= 65535]
        if "443" in query_lower and 443 not in ports_found:
            ports_found.append(443)
        if "80" in query_lower and 80 not in ports_found:
            ports_found.append(80)
        if "8000" in query_lower and 8000 not in ports_found:
            ports_found.append(8000)

        if any(w in query_lower for w in ["deny", "block", "drop", "prevent", "reject", "forbid"]):
            action = "DENY"
        else:
            action = "ALLOW"

        risk_score = 10
        if target_comm in ["nc", "bash", "sh"] and action == "ALLOW":
            risk_score = 90
            warnings.append(f"Granting network permissions to shell utility '{target_comm}' poses high security risk.")
        elif not ports_found and action == "ALLOW":
            risk_score = 75
            warnings.append("Unrestricted port access requested; least-privilege violation.")
        elif any(p in [22, 23, 3389] for p in ports_found) and action == "ALLOW":
            risk_score = 80
            warnings.append("Administrative remote management ports detected in allowlist.")
        elif action == "ALLOW" and all(p in [443, 80, 8000, 5432] for p in ports_found):
            risk_score = 15

        safety_rating = "SECURE" if risk_score < 30 else ("MODERATE" if risk_score < 70 else "HIGH_RISK")

        rule = CompiledRule(
            id=f"nlp-{target_comm}-{len(ports_found)}p",
            name=f"NLP: {target_comm.capitalize()} {action.capitalize()} Rule",
            target_comm=target_comm,
            allowed_ports=sorted(list(set(ports_found))),
            action=action,
            risk_score=risk_score,
            explanation=f"Matches '{target_comm}' outbound socket calls, enforcing action {action} on ports {ports_found or 'ALL'}."
        )

        return PolicyCompilationResult(
            natural_query=query,
            rules=[rule],
            overall_safety_rating=safety_rating,
            warnings=warnings
        )


nlp_compiler = NLPEBPFCompiler()

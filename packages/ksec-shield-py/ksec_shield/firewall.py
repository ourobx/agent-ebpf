"""
ksec-shield: High-level AI Firewall & Policy Engine client.
Drop-in wrapper for OpenAI, Anthropic, and native Python LLM pipelines.
"""

from __future__ import annotations
import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional


class KsecAIFirewall:
    """
    Client for ksec.space L7 AI Firewall.
    Inspects prompts for prompt injections and outputs for sensitive PII/Secrets.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        tenant_id: Optional[str] = "global",
        timeout: float = 10.0
    ):
        self.api_key = api_key or os.getenv("KSEC_API_KEY", "")
        self.base_url = (base_url or os.getenv("KSEC_BASE_URL", "https://api.ksec.space")).rstrip("/")
        self.tenant_id = tenant_id or "global"
        self.timeout = timeout

    def inspect(self, text: str, check_ingress: bool = True, check_egress: bool = True) -> Dict[str, Any]:
        """
        Inspects text for prompt injection (ingress) and PII leakage (egress).
        """
        url = f"{self.base_url}/v1/guard/inspect"
        payload = {
            "text": text,
            "tenant_id": self.tenant_id,
            "check_ingress": check_ingress,
            "check_egress": check_egress,
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "X-KSEC-Policy-Key": self.api_key,
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            err_body = err.read().decode("utf-8")
            try:
                return json.loads(err_body)
            except Exception:
                return {"error": err_body, "status_code": err.code}
        except Exception as exc:
            return {"error": str(exc), "status": "failed"}

    def get_compliance_report(self, period_days: int = 30) -> Dict[str, Any]:
        """Fetches the cryptographically sealed KVKK/GDPR compliance certificate."""
        url = f"{self.base_url}/v1/guard/compliance/report?tenant_id={self.tenant_id}&period_days={period_days}"
        req = urllib.request.Request(
            url,
            headers={
                "Content-Type": "application/json",
                "X-KSEC-Policy-Key": self.api_key,
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            return {"error": str(exc), "status": "failed"}


def create_guarded_openai_client(
    openai_api_key: Optional[str] = None,
    ksec_policy_key: Optional[str] = None,
    ksec_gateway_url: str = "https://api.ksec.space/v1"
):
    """
    Creates an official `openai.OpenAI` client instance pre-configured with
    ksec.space AI Firewall gateway base_url and policy headers.
    """
    try:
        from openai import OpenAI
        return OpenAI(
            base_url=ksec_gateway_url,
            api_key=openai_api_key or os.getenv("OPENAI_API_KEY", "sk-live-dummy"),
            default_headers={
                "X-KSEC-Policy-Key": ksec_policy_key or os.getenv("KSEC_POLICY_KEY", "global")
            }
        )
    except ImportError:
        raise ImportError("Please install `openai` package via `pip install openai` to use create_guarded_openai_client.")

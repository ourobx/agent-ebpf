"""
HTTP & Gateway Client for ksec.space communications.
"""

import httpx
from typing import List, Dict, Any, Optional
from .types import PolicyRule, ShieldTelemetryEvent


class KsecClient:
    def __init__(self, gateway_url: str = "https://ksec.space", api_key: Optional[str] = None, debug: bool = False):
        self.gateway_url = gateway_url.rstrip("/")
        self.api_key = api_key or ""
        self.debug = debug

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def fetch_policies(self) -> List[PolicyRule]:
        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.get(f"{self.gateway_url}/api/v1/policies", headers=self._get_headers())
                if resp.status_code == 200:
                    data = resp.json()
                    rules_raw = data.get("policies", [])
                    return [PolicyRule(**r) for r in rules_raw]
        except Exception as e:
            if self.debug:
                print(f"[ksec-shield] Policy fetch warning: {e}")
        return []

    def send_telemetry_batch(self, events: List[ShieldTelemetryEvent]) -> None:
        if not events:
            return
        try:
            payload = {"events": [e.model_dump() for e in events]}
            with httpx.Client(timeout=5.0) as client:
                client.post(
                    f"{self.gateway_url}/api/v1/telemetry",
                    headers=self._get_headers(),
                    json=payload
                )
        except Exception as e:
            if self.debug:
                print(f"[ksec-shield] Telemetry push warning: {e}")

"""
Zero-Config Auto-Instrumentation for Python AI Agents.
Importing this module automatically activates Agent-eBPF egress & tool protection.

Usage:
    import ksec_shield.auto
"""

import os
from .shield import KsecShield

# Automatically read environment or use production gateway default
_gateway = os.getenv("KSEC_GATEWAY_URL", "https://ksec.space")
_api_key = os.getenv("KSEC_API_KEY", None)

# Initialize singleton shield instance
default_shield = KsecShield(
    gateway_url=_gateway,
    api_key=_api_key,
    agent_id=os.getenv("KSEC_AGENT_ID", "auto-injected-agent"),
    debug=os.getenv("KSEC_DEBUG", "").lower() in ("1", "true")
)


def _patch_network():
    """Transparently hook standard urllib3/httpx network socket dispatchers."""
    try:
        import urllib3.connectionpool
        _orig_urlopen = urllib3.connectionpool.HTTPConnectionPool.urlopen

        def _guarded_urlopen(self, method, url, *args, **kwargs):
            host = self.host
            return default_shield.guard_action(
                lambda: _orig_urlopen(self, method, url, *args, **kwargs),
                action_type="network_egress",
                target=host,
                metadata={"method": method, "url": url}
            )

        urllib3.connectionpool.HTTPConnectionPool.urlopen = _guarded_urlopen
    except Exception:
        pass


# Run auto-patching on import
_patch_network()

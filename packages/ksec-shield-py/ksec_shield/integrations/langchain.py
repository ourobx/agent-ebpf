"""
LangChain BaseCallbackHandler Integration for Agent-eBPF.
"""

from typing import Any, Dict, Optional
from ..shield import KsecShield
from ..types import KsecSecurityViolationError


class KsecLangChainCallback:
    """Callback Handler for LangChain agent runs."""
    def __init__(self, shield: KsecShield):
        self.shield = shield

    def on_tool_start(
        self,
        serialized: Dict[str, Any],
        input_str: str,
        **kwargs: Any
    ) -> None:
        tool_name = serialized.get("name", "unknown_tool")
        # Run zero-latency policy guard pass
        self.shield.guard_action(
            lambda: True,
            action_type="tool_execution",
            target=tool_name,
            metadata={"input_preview": input_str[:120]}
        )

    def on_tool_error(self, error: BaseException, **kwargs: Any) -> None:
        if isinstance(error, KsecSecurityViolationError):
            self.shield._emit_event("threat_blocked", {
                "tool_name": error.target,
                "error": str(error)
            })

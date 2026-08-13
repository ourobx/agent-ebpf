"""
LlamaIndex Integration for Agent-eBPF.
"""

from typing import Any, Dict, Optional
from ..shield import KsecShield


class KsecLlamaIndexHandler:
    """Callback / Event Handler for LlamaIndex query and tool execution."""
    def __init__(self, shield: KsecShield):
        self.shield = shield

    def on_event_start(self, event_type: str, payload: Optional[Dict[str, Any]] = None, **kwargs: Any) -> None:
        target = f"llamaindex:{event_type}"
        self.shield.guard_action(
            lambda: True,
            action_type="tool_execution",
            target=target,
            metadata=payload or {}
        )

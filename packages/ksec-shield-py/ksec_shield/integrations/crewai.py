"""
CrewAI Tool Wrapper integration for Agent-eBPF.
"""

from typing import Any, Callable
from ..shield import KsecShield


class KsecCrewAIToolWrapper:
    """Wraps CrewAI Tools with eBPF Guard policies."""
    def __init__(self, shield: KsecShield):
        self.shield = shield

    def wrap_tool(self, tool_name: str, func: Callable[..., Any]) -> Callable[..., Any]:
        def wrapped(*args: Any, **kwargs: Any) -> Any:
            return self.shield.guard_action(
                lambda: func(*args, **kwargs),
                action_type="tool_execution",
                target=tool_name,
                metadata={"framework": "crewai"}
            )
        return wrapped

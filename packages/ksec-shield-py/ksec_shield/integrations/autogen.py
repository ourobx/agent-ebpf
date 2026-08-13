"""
AutoGen (Microsoft AutoGen / AG2) Integration for Agent-eBPF.
"""

from typing import Any, Callable, Dict, Optional
from ..shield import KsecShield


class KsecAutoGenHook:
    """Hooks into Microsoft AutoGen agent message flow and code executors."""
    def __init__(self, shield: KsecShield):
        self.shield = shield

    def wrap_code_executor(self, executor: Any) -> Any:
        """Wraps AutoGen code execution (bash/python execution) with eBPF syscall guards."""
        if hasattr(executor, "execute_code_blocks"):
            orig_exec = executor.execute_code_blocks
            def guarded_exec(code_blocks: Any, **kwargs: Any) -> Any:
                return self.shield.guard_action(
                    lambda: orig_exec(code_blocks, **kwargs),
                    action_type="syscall",
                    target="autogen:code_execution",
                    metadata={"blocks_count": len(code_blocks) if hasattr(code_blocks, "__len__") else 1}
                )
            executor.execute_code_blocks = guarded_exec
        return executor

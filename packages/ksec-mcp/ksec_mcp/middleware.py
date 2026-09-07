"""
FastMCP and LangChain generic middleware interceptor.
"""

from typing import Any, Callable, Dict
from .shield import KSecShield


class FastMCPMiddleware:
    def __init__(self, shield: KSecShield):
        self.shield = shield

    async def on_tool_call(self, tool_name: str, arguments: Dict[str, Any], next_handler: Callable):
        inspection = self.shield.intercept(tool_name, arguments)
        if inspection["verdict"] == "DROP":
            return {
                "is_error": True,
                "content": [
                    {
                        "type": "text",
                        "text": f"[KSEC KERNEL DROP] System call aborted at Ring-0: {inspection['reason']}"
                    }
                ]
            }
        return await next_handler(tool_name, arguments)

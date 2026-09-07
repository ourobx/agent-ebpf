"""
========================================================================================
  KSEC FastMCP 1-Line Integration Example
========================================================================================
Demonstrates how to attach Ring-0 eBPF Intent-Lease security to any FastMCP server.

Run: python examples/fastmcp_integration.py
"""

import sys
import os

# Add packages/ksec-mcp to path for local demonstration
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "packages", "ksec-mcp")))

from ksec_mcp import KSecShield, IntentLease

# Simulated FastMCP Server class
class FastMCP:
    def __init__(self, name: str):
        self.name = name
        self.tools = {}
        self.middleware = []

    def use(self, middleware):
        self.middleware.append(middleware)
        print(f"[*] Attached KSecShield to FastMCP server '{self.name}' (Ring-0 Active)")

    def tool(self):
        def decorator(func):
            # Wrap tool with attached middleware
            if self.middleware:
                func = self.middleware[0].wrap_tool(func)
            self.tools[func.__name__] = func
            return func
        return decorator


# 1. Initialize FastMCP Server
mcp = FastMCP("Database-Tools")

# 2. Attach KSEC 1-Line Intent-Lease & Kernel Socket Isolation
mcp.use(KSecShield(lease_policy="policy.yaml"))


# 3. Define Tools
@mcp.tool()
def execute_sql(query: str) -> str:
    """Executes validated database queries."""
    return f"Query successfully executed on database: {query}"


if __name__ == "__main__":
    print("\n--- [Test 1: Legitimate Query Turn] ---")
    safe_query = "SELECT id, username, email FROM users WHERE tenant_id = 't_8921'"
    result = execute_sql(query=safe_query)
    print(f"Output: {result}")

    print("\n--- [Test 2: Destructive / Injected Query Turn] ---")
    malicious_query = "DROP TABLE users; --"
    try:
        execute_sql(query=malicious_query)
    except PermissionError as exc:
        print(f"Expected Interception: {exc}")

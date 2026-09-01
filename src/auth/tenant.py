"""
KSEC v2.0 — Enterprise SaaS Multi-Tenant Isolation & Context Manager

Enforces hard cryptographic and logical separation between customer tenants
across eBPF hooks, telemetry pipelines, and database sessions.
"""

from __future__ import annotations
import contextvars
from dataclasses import dataclass
from typing import Optional, Dict, Any

from .auth_db import auth_db

# Context variable for holding active tenant in the current execution context (async/thread safe)
_current_tenant_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "current_tenant_ctx", default=None
)


@dataclass
class TenantMetadata:
    tenant_id: str
    company_name: str
    plan_tier: str
    api_key: str
    created_at: float


class TenantIsolationError(Exception):
    """Raised when a request attempts to access or mutate resources belonging to another tenant."""
    pass


class TenantContext:
    """
    Context manager for scoping operations to a specific tenant ID.
    """

    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self._token: Optional[contextvars.Token] = None

    def __enter__(self):
        self._token = _current_tenant_ctx.set(self.tenant_id)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._token is not None:
            _current_tenant_ctx.reset(self._token)


def get_current_tenant_id(default: str = "default-tenant") -> str:
    """Returns the currently active tenant ID in the execution context."""
    return _current_tenant_ctx.get() or default


def set_current_tenant_id(tenant_id: str) -> None:
    """Sets the active tenant ID in current context."""
    _current_tenant_ctx.set(tenant_id)


def resolve_tenant_from_api_key(api_key: str) -> Optional[TenantMetadata]:
    """
    Resolves tenant metadata from a provided Bearer/API key.
    """
    if not api_key:
        return None

    clean_key = api_key.replace("Bearer ", "").strip()
    with auth_db._lock:
        with auth_db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT tenant_id, company_name, plan_tier, api_key, created_at FROM tenants WHERE api_key = ?",
                (clean_key,)
            )
            row = cursor.fetchone()
            if not row:
                return None
            return TenantMetadata(
                tenant_id=row["tenant_id"],
                company_name=row["company_name"],
                plan_tier=row["plan_tier"],
                api_key=row["api_key"],
                created_at=row["created_at"]
            )


def enforce_tenant_isolation(resource_tenant_id: str, caller_tenant_id: Optional[str] = None) -> None:
    """
    Strictly asserts that caller tenant matches target resource tenant.
    """
    active_tenant = caller_tenant_id or get_current_tenant_id()
    if active_tenant != resource_tenant_id:
        raise TenantIsolationError(
            f"Cross-tenant access violation: caller '{active_tenant}' cannot access tenant '{resource_tenant_id}'."
        )

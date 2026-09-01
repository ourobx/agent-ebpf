"""
KSEC v2.0 — Enterprise SaaS Auth Package
"""

from .auth_db import auth_db, AuthDatabase
from .auth_service import auth_service, AuthService
from .tenant import (
    TenantMetadata,
    TenantIsolationError,
    TenantContext,
    get_current_tenant_id,
    set_current_tenant_id,
    resolve_tenant_from_api_key,
    enforce_tenant_isolation,
)

__all__ = [
    "auth_db",
    "AuthDatabase",
    "auth_service",
    "AuthService",
    "TenantMetadata",
    "TenantIsolationError",
    "TenantContext",
    "get_current_tenant_id",
    "set_current_tenant_id",
    "resolve_tenant_from_api_key",
    "enforce_tenant_isolation",
]

import os
import json
import logging
from typing import Optional, List, Dict, Any
import asyncpg

logger = logging.getLogger("ksec.gateway.db")

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://agent_user:UltraSecurePostgresPass2026!@127.0.0.1:5432/agent_ebpf_db"
)

_pool: Optional[asyncpg.Pool] = None

async def init_db_pool() -> Optional[asyncpg.Pool]:
    global _pool
    if _pool is not None:
        return _pool
    try:
        # Convert standard postgresql:// URL if necessary for asyncpg
        dsn = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        _pool = await asyncpg.create_pool(
            dsn=dsn,
            min_size=2,
            max_size=20,
            command_timeout=10,
        )
        logger.info("[Gateway DB] asyncpg pool initialized successfully.")
        await init_schema()
        return _pool
    except Exception as e:
        logger.warning(f"[Gateway DB] Could not connect to PostgreSQL pool: {e}. Falling back to dynamic memory mode.")
        _pool = None
        return None

async def close_db_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("[Gateway DB] asyncpg pool closed.")

def get_db_pool() -> Optional[asyncpg.Pool]:
    return _pool

async def init_schema() -> None:
    """Executes schema.sql if database is connected."""
    if not _pool:
        return
    schema_file = os.path.join(os.path.dirname(__file__), "schema.sql")
    if os.path.exists(schema_file):
        async with _pool.acquire() as conn:
            with open(schema_file, "r", encoding="utf-8") as f:
                sql_content = f.read()
            await conn.execute(sql_content)
            logger.info("[Gateway DB] Schema and RLS policies verified.")

async def fetch_policies_for_tenant(tenant_id: str, action_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetches active policy rules enforcing PostgreSQL Row-Level Security (RLS)."""
    if not _pool:
        return []
    
    async with _pool.acquire() as conn:
        async with conn.transaction():
            # Enforce Row-Level Security via session setting
            await conn.execute("SELECT set_config('app.current_tenant', $1, true)", tenant_id)
            
            if action_type:
                query = """
                    SELECT id, tenant_id, name, action_type, pattern, decision, reason
                    FROM tenant_policies
                    WHERE enabled = TRUE AND action_type = $1
                    ORDER BY created_at ASC
                """
                records = await conn.fetch(query, action_type)
            else:
                query = """
                    SELECT id, tenant_id, name, action_type, pattern, decision, reason
                    FROM tenant_policies
                    WHERE enabled = TRUE
                    ORDER BY created_at ASC
                """
                records = await conn.fetch(query)
            
            return [dict(r) for r in records]

async def bulk_insert_telemetry(events: List[Dict[str, Any]]) -> int:
    """Bulk inserts telemetry audit records with tenant isolation."""
    if not _pool or not events:
        return 0

    records = []
    for e in events:
        records.append((
            e.get("tenant_id", "default_tenant"),
            e.get("event_id") or e.get("id") or "evt-unknown",
            e.get("agent_id"),
            e.get("action_type") or e.get("actionType") or "unknown",
            e.get("target") or "unknown",
            e.get("decision") or "ALLOW",
            e.get("reason"),
            e.get("kernel_trace_id") or e.get("kernelTraceId"),
            e.get("duration_ms", 0.0),
            e.get("metadata") or {}
        ))

    async with _pool.acquire() as conn:
        query = """
            INSERT INTO telemetry_events (
                tenant_id, event_id, agent_id, action_type, target, 
                decision, reason, kernel_trace_id, duration_ms, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        """
        await conn.executemany(query, records)
        return len(records)

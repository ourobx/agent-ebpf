"""
Agent-eBPF PostgreSQL persistence layer (asyncpg).

Real database-backed storage for security policies, enforcement rules,
threat events, and audit telemetry. There is NO in-memory synthetic data:
every operation reads/writes real PostgreSQL tables, and any database
unavailability raises a clear error instead of silently returning fakes.
"""
import json
from typing import Any, Dict, List, Optional

import asyncpg
import structlog

from tools.config import settings

logger = structlog.get_logger("db")

_pool: Optional[asyncpg.Pool] = None

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS policies (
    id              VARCHAR(128) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    engine_mode     VARCHAR(64)  NOT NULL DEFAULT 'Kernel Fail-Closed (Zero-Trust)',
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_rules (
    id              VARCHAR(128) PRIMARY KEY,
    policy_id       VARCHAR(128) NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    type            VARCHAR(64),
    action          VARCHAR(16),
    pattern         TEXT,
    severity        VARCHAR(16),
    message         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS security_events (
    id              BIGSERIAL PRIMARY KEY,
    event_type      VARCHAR(64)  NOT NULL,
    source_ip       VARCHAR(64),
    dst_ip          VARCHAR(64),
    action          VARCHAR(16),
    detail          JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS threats (
    id              BIGSERIAL PRIMARY KEY,
    rule_id         VARCHAR(128),
    payload         TEXT,
    reason          TEXT,
    action          VARCHAR(16),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


def pool() -> asyncpg.Pool:
    """Returns the live connection pool or raises a clear error."""
    if _pool is None:
        raise RuntimeError(
            "Database is not connected. Set DATABASE_URL and initialize the pool at startup "
            "(see tools.db.connect()). Operations that need persistence cannot run yet."
        )
    return _pool


async def connect(database_url: Optional[str] = None) -> asyncpg.Pool:
    """Creates the connection pool and applies the schema. Raises on failure."""
    global _pool
    url = database_url or settings.database_url
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not configured. Refusing to fall back to synthetic storage."
        )
    try:
        _pool = await asyncpg.create_pool(url, min_size=1, max_size=10)
    except Exception as e:  # noqa: BLE001 - surface the real connection error
        raise RuntimeError(f"Failed to connect to PostgreSQL: {e}") from e

    await init_schema()
    logger.info("PostgreSQL connected and schema initialized")
    return _pool


async def close() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def init_schema() -> None:
    await pool().execute(SCHEMA_SQL)


async def health() -> bool:
    """True only when a real DB connection is available."""
    if _pool is None:
        return False
    try:
        await pool().fetchval("SELECT 1")
        return True
    except Exception:  # noqa: BLE001
        return False


async def _seed_default_policy() -> None:
    """Imports the on-disk declarative policy.yaml into PostgreSQL once.

    This is a real (not synthetic) data migration from the declarative config,
    not a mock: it reflects the actual rules an operator authored in policy.yaml.
    """
    import os as _os
    import yaml
    from tools.config import settings as _settings
    path = _settings.policy_file
    if not _os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as fh:
        doc = yaml.safe_load(fh) or {}
    rules = doc.get("rules", [])
    if not rules:
        return
    existing = await pool().fetchval("SELECT COUNT(*) FROM policies")
    if existing:
        return
    await pool().execute(
        "INSERT INTO policies (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        "default", "Agent-eBPF Sentinel Default Policy",
    )
    for rule in rules:
        await pool().execute(
            """
            INSERT INTO policy_rules (id, policy_id, type, action, pattern, severity, message)
            VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING
            """,
            str(rule.get("id", rule.get("name", "rule"))),
            "default",
            rule.get("type", "db_query"),
            rule.get("action", "DROP"),
            rule.get("match", {}).get("pattern"),
            rule.get("severity", "high"),
            rule.get("message"),
        )
    logger.info("Imported declarative policy.yaml rules into PostgreSQL", rules=len(rules))


async def get_policies() -> List[Dict[str, Any]]:
    """Returns the real policy set (single default policy for now)."""
    await _seed_default_policy()
    rows = await pool().fetch(
        "SELECT id, name, engine_mode FROM policies ORDER BY updated_at DESC"
    )
    policies = []
    for row in rows:
        rules = await pool().fetch(
            """
            SELECT id, type, action, pattern, severity, message
            FROM policy_rules WHERE policy_id = $1 ORDER BY created_at ASC
            """,
            row["id"],
        )
        policies.append({
            "name": row["name"],
            "engine_mode": row["engine_mode"],
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
            "rules": [
                {
                    "id": r["id"],
                    "type": r["type"],
                    "action": r["action"],
                    "match": {"pattern": r["pattern"]},
                    "severity": r["severity"],
                    "message": r["message"],
                }
                for r in rules
            ],
        })
    return policies


async def add_rule(rule_id: str, rtype: str, action: str, pattern: str,
                   severity: str, message: str, policy_id: str = "default") -> Dict[str, Any]:
    await pool().execute(
        "INSERT INTO policies (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        policy_id, f"Policy {policy_id}",
    )
    await pool().execute(
        """
        INSERT INTO policy_rules (id, policy_id, type, action, pattern, severity, message)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE
            SET type = EXCLUDED.type, action = EXCLUDED.action,
                pattern = EXCLUDED.pattern, severity = EXCLUDED.severity,
                message = EXCLUDED.message
        """,
        rule_id, policy_id, rtype, action, pattern, severity, message,
    )
    return {
        "id": rule_id, "type": rtype, "action": action,
        "match": {"pattern": pattern}, "severity": severity,
        "message": message, "policy_id": policy_id,
    }


async def list_rules() -> List[Dict[str, Any]]:
    rows = await pool().fetch(
        """
        SELECT id, type, action, pattern, severity, message, policy_id
        FROM policy_rules ORDER BY created_at ASC
        """
    )
    return [
        {
            "id": r["id"], "type": r["type"], "action": r["action"],
            "match": {"pattern": r["pattern"]}, "severity": r["severity"],
            "message": r["message"], "policy_id": r["policy_id"],
        }
        for r in rows
    ]


async def record_event(event_type: str, source_ip: Optional[str] = None,
                       dst_ip: Optional[str] = None, action: Optional[str] = None,
                       detail: Optional[Dict[str, Any]] = None) -> int:
    """Persists a security/traffic event to the real security_events table."""
    row = await pool().fetchrow(
        """
        INSERT INTO security_events (event_type, source_ip, dst_ip, action, detail)
        VALUES ($1, $2, $3, $4, $5) RETURNING id
        """,
        event_type, source_ip, dst_ip, action,
        json.dumps(detail) if detail is not None else None,
    )
    return row["id"]


async def record_threat(rule_id: Optional[str], payload: Optional[str],
                        reason: Optional[str], action: str) -> int:
    """Persists a detected threat to the real threats table."""
    row = await pool().fetchrow(
        """
        INSERT INTO threats (rule_id, payload, reason, action)
        VALUES ($1, $2, $3, $4) RETURNING id
        """,
        rule_id, payload, reason, action,
    )
    return row["id"]


async def event_counts() -> Dict[str, int]:
    events = await pool().fetchval("SELECT COUNT(*) FROM security_events")
    threats = await pool().fetchval("SELECT COUNT(*) FROM threats")
    return {"total_events": int(events or 0), "total_threats": int(threats or 0)}



async def fetch_events(limit: int = 200) -> List[Dict[str, Any]]:
    """Returns the most recent REAL security events from PostgreSQL."""
    rows = await pool().fetch(
        """
        SELECT id, event_type, source_ip, dst_ip, action, detail, created_at
        FROM security_events ORDER BY created_at DESC LIMIT $1
        """,
        limit,
    )
    return [
        {
            "id": r["id"],
            "event_type": r["event_type"],
            "src_ip": r["source_ip"],
            "dst_ip": r["dst_ip"],
            "action": r["action"],
            "detail": r["detail"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        }
        for r in rows
    ]


async def fetch_threats(limit: int = 200) -> List[Dict[str, Any]]:
    """Returns the most recent REAL detected threats from PostgreSQL."""
    rows = await pool().fetch(
        """
        SELECT id, rule_id, payload, reason, action, created_at
        FROM threats ORDER BY created_at DESC LIMIT $1
        """,
        limit,
    )
    return [
        {
            "id": r["id"],
            "rule_id": r["rule_id"],
            "payload": r["payload"],
            "reason": r["reason"],
            "action": r["action"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        }
        for r in rows
    ]


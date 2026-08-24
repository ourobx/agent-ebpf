import os
import json
import logging
from typing import Optional, List, Dict, Any
import redis.asyncio as aioredis

logger = logging.getLogger("ksec.gateway.redis")

REDIS_URL = os.getenv(
    "REDIS_URL", 
    "redis://:UltraSecureRedisPass2026!@127.0.0.1:6379/0"
)
TELEMETRY_QUEUE_KEY = "agent_ebpf:telemetry_queue"

_redis_client: Optional[aioredis.Redis] = None

async def init_redis() -> Optional[aioredis.Redis]:
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        _redis_client = aioredis.from_url(
            REDIS_URL, 
            encoding="utf-8", 
            decode_responses=True,
            socket_timeout=5.0
        )
        await _redis_client.ping()
        logger.info("[Gateway Redis] Connected to Redis queue server.")
        return _redis_client
    except Exception as e:
        logger.warning(f"[Gateway Redis] Redis connection unavailable: {e}. Falling back to direct sync.")
        _redis_client = None
        return None

async def close_redis() -> None:
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
        logger.info("[Gateway Redis] Connection closed.")

def get_redis() -> Optional[aioredis.Redis]:
    return _redis_client

async def enqueue_telemetry_batch(events: List[Dict[str, Any]], tenant_id: str = "default_tenant") -> bool:
    """Enqueues telemetry events into Redis List/Stream for background worker consumption."""
    client = get_redis()
    if not client or not events:
        return False
    
    try:
        serialized = []
        for event in events:
            payload = dict(event)
            payload["tenant_id"] = tenant_id
            serialized.append(json.dumps(payload))
        
        await client.rpush(TELEMETRY_QUEUE_KEY, *serialized)
        return True
    except Exception as e:
        logger.error(f"[Gateway Redis] Enqueue error: {e}")
        return False

async def dequeue_telemetry_batch(batch_size: int = 50) -> List[Dict[str, Any]]:
    """Pops up to `batch_size` telemetry events from Redis queue."""
    client = get_redis()
    if not client:
        return []

    events = []
    try:
        for _ in range(batch_size):
            item = await client.lpop(TELEMETRY_QUEUE_KEY)
            if not item:
                break
            events.append(json.loads(item))
    except Exception as e:
        logger.error(f"[Gateway Redis] Dequeue error: {e}")

    return events

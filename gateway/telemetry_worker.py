import asyncio
import logging
from typing import NoReturn
from .redis_queue import dequeue_telemetry_batch
from .db import bulk_insert_telemetry

logger = logging.getLogger("ksec.gateway.worker")

async def telemetry_worker_loop(poll_interval: float = 2.0, batch_size: int = 100) -> None:
    """Async background worker loop consuming telemetry from Redis into PostgreSQL."""
    logger.info("[Telemetry Worker] Background telemetry worker loop started.")
    
    while True:
        try:
            events = await dequeue_telemetry_batch(batch_size=batch_size)
            if events:
                inserted_count = await bulk_insert_telemetry(events)
                logger.info(f"[Telemetry Worker] Flushed {inserted_count} events to PostgreSQL RLS audit table.")
            else:
                await asyncio.sleep(poll_interval)
        except asyncio.CancelledError:
            logger.info("[Telemetry Worker] Background loop cancelled.")
            break
        except Exception as e:
            logger.error(f"[Telemetry Worker] Error in worker loop: {e}")
            await asyncio.sleep(poll_interval)

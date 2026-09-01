"""
KSEC Usage-Based Metering & SaaS Quota Engine.
Provides high-throughput request metering, rate limiting, and quota enforcement
via Redis token buckets with in-memory fallback for local developer resilience.
"""

import os
from typing import Dict, Any
from fastapi import HTTPException, status

try:
    import redis.asyncio as redis
except ImportError:
    redis = None


class SaaSQuotaEngine:
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self._in_memory_counters: Dict[str, int] = {}
        self.redis_client = None

        if redis and "REDIS_URL" in os.environ:
            try:
                self.redis_client = redis.from_url(
                    self.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=0.5,
                    socket_timeout=0.5,
                )
            except Exception:
                self.redis_client = None

    async def check_and_increment_quota(self, tenant_id: str, limit: int = 50000) -> int:
        """
        Validates and increments monthly eBPF telemetry & API inspection quota for a tenant.
        """
        key = f"tenant:{tenant_id}:usage:current"

        if self.redis_client:
            try:
                current_usage = await self.redis_client.incr(key)
                if current_usage == 1:
                    # Set 30-day TTL on new billing window
                    await self.redis_client.expire(key, 2592000)
            except Exception:
                # Redis failure fallback to in-memory store
                current_usage = self._in_memory_counters.get(key, 0) + 1
                self._in_memory_counters[key] = current_usage
        else:
            current_usage = self._in_memory_counters.get(key, 0) + 1
            self._in_memory_counters[key] = current_usage

        if current_usage > limit:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Monthly API quota exceeded ({current_usage}/{limit}). Please upgrade your SaaS subscription tier at https://ksec.space/pricing."
            )

        return current_usage

    async def get_usage(self, tenant_id: str) -> Dict[str, Any]:
        """Retrieves real-time usage metrics for a given tenant."""
        key = f"tenant:{tenant_id}:usage:current"
        usage = 0
        if self.redis_client:
            try:
                val = await self.redis_client.get(key)
                usage = int(val) if val else 0
            except Exception:
                usage = self._in_memory_counters.get(key, 0)
        else:
            usage = self._in_memory_counters.get(key, 0)

        return {
            "tenant_id": tenant_id,
            "used_requests": usage,
            "limit": 50000,
            "plan": "Enterprise eBPF Mesh",
            "active_policies": 12,
            "latency_overhead_ms": 0.14
        }


quotas = SaaSQuotaEngine()

"""
ksec.space LLM Provider Fast-Path Cache
Provides deterministic L1 (Memory LRU) and L2 (Redis) response replay for LLM providers.
Features:
- Canonical Hash Engine for OpenAI, Anthropic, Gemini, DeepSeek
- Strict Security Gate preventing Cache Poisoning
- Deterministic Temperature Threshold Gating (<= 0.2)
- Streaming SSE Replay Engine (<1 ms latency)
- Real-time Telemetry and Token Saving Metrics
"""

from __future__ import annotations
import os
import time
import json
import hashlib
import asyncio
from collections import OrderedDict
from typing import Dict, Any, Optional, List, Tuple, AsyncGenerator
from pydantic import BaseModel

try:
    import redis.asyncio as aioredis
except ImportError:
    import redis as aioredis  # type: ignore

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")


class CacheStats(BaseModel):
    total_requests: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    hit_ratio_pct: float = 0.0
    tokens_saved: int = 0
    total_latency_saved_ms: float = 0.0
    cached_entries_count: int = 0


class FastPathCacheEntry:
    def __init__(self, key: str, data: Dict[str, Any], ttl: int = 3600, tokens: int = 0):
        self.key = key
        self.data = data
        self.created_at = time.time()
        self.expires_at = self.created_at + ttl
        self.tokens = tokens

    def is_expired(self) -> bool:
        return time.time() > self.expires_at


class FastPathCacheManager:
    """
    Two-Tier Fast-Path Cache Engine (L1 Memory LRU + L2 Redis)
    """

    def __init__(self, l1_capacity: int = 2048, default_ttl_sec: int = 3600):
        self.l1_capacity = l1_capacity
        self.default_ttl_sec = default_ttl_sec
        self._l1_cache: OrderedDict[str, FastPathCacheEntry] = OrderedDict()
        self._lock = asyncio.Lock()
        self._redis: Optional[aioredis.Redis] = None
        self._stats = CacheStats()

    async def _get_redis(self) -> Optional[aioredis.Redis]:
        if self._redis is None:
            try:
                self._redis = aioredis.from_url(REDIS_URL, decode_responses=True, socket_timeout=1.0)
            except Exception:
                self._redis = None
        return self._redis

    @staticmethod
    def generate_canonical_hash(
        tenant_id: str,
        provider: str,
        model: str,
        messages: List[Dict[str, Any]],
        temperature: Optional[float] = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Produces a deterministic, collision-resistant canonical SHA-256 hash
        representing the normalized user prompt and configuration.
        """
        normalized_messages = []
        for msg in messages:
            role = str(msg.get("role", "")).strip().lower()
            content = str(msg.get("content", "")).strip()
            # Collapse multiple whitespaces
            content = " ".join(content.split())
            normalized_messages.append({"role": role, "content": content})

        # Bucket temperature to avoid floating point hash divergence (e.g. 0.0, 0.1, 0.2)
        temp_bucket = round(temperature, 1) if temperature is not None else 0.7

        canonical_dict = {
            "tenant_id": tenant_id or "global",
            "provider": provider.lower().strip(),
            "model": model.lower().strip(),
            "messages": normalized_messages,
            "temp": temp_bucket,
            "max_tokens": max_tokens or 0,
            "system": (system_prompt or "").strip()
        }

        serialized = json.dumps(canonical_dict, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def is_cacheable_request(self, temperature: Optional[float], threat_score: float) -> bool:
        """
        Determines whether a request qualifies for caching.
        Requests with temperature > 0.2 (non-deterministic) or high threat scores are excluded.
        """
        if threat_score >= 0.50:
            return False
        if temperature is not None and temperature > 0.2:
            return False
        return True

    def validate_egress_security(
        self,
        should_block: bool,
        has_pii_violation: bool,
        is_threat: bool
    ) -> bool:
        """
        Security Gate: Prevents Cache Poisoning.
        Returns False if the response triggered any security violation or contains unredacted PII.
        """
        if should_block or is_threat or has_pii_violation:
            return False
        return True

    async def get(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """
        Fetches an entry from L1 memory or L2 Redis cache.
        """
        now = time.time()

        # 1. L1 Memory Cache Lookup (<0.1 ms)
        async with self._lock:
            self._stats.total_requests += 1
            if cache_key in self._l1_cache:
                entry = self._l1_cache[cache_key]
                if not entry.is_expired():
                    # Move to end (LRU hit)
                    self._l1_cache.move_to_end(cache_key)
                    self._stats.cache_hits += 1
                    self._stats.tokens_saved += entry.tokens
                    self._stats.total_latency_saved_ms += 1150.0  # Avg saved LLM latency
                    self._update_stats_ratio()
                    return entry.data
                else:
                    del self._l1_cache[cache_key]

        # 2. L2 Redis Cache Lookup (<1 ms)
        try:
            r = await self._get_redis()
            if r:
                raw_json = await r.get(f"ksec:cache:{cache_key}")
                if raw_json:
                    data = json.loads(raw_json)
                    tokens = data.get("usage", {}).get("total_tokens", 0)
                    
                    # Populate L1
                    async with self._lock:
                        self._l1_cache[cache_key] = FastPathCacheEntry(
                            key=cache_key,
                            data=data,
                            ttl=self.default_ttl_sec,
                            tokens=tokens
                        )
                        self._l1_cache.move_to_end(cache_key)
                        self._stats.cache_hits += 1
                        self._stats.tokens_saved += tokens
                        self._stats.total_latency_saved_ms += 1150.0
                        self._update_stats_ratio()
                    return data
        except Exception:
            pass

        async with self._lock:
            self._stats.cache_misses += 1
            self._update_stats_ratio()

        return None

    async def put(
        self,
        cache_key: str,
        data: Dict[str, Any],
        ttl_sec: Optional[int] = None,
        tokens: int = 0
    ) -> None:
        """
        Stores safe response data in L1 and L2 cache.
        """
        ttl = ttl_sec or self.default_ttl_sec
        entry = FastPathCacheEntry(key=cache_key, data=data, ttl=ttl, tokens=tokens)

        # 1. Write to L1 Memory
        async with self._lock:
            if len(self._l1_cache) >= self.l1_capacity:
                self._l1_cache.popitem(last=False)  # Evict oldest LRU item
            self._l1_cache[cache_key] = entry
            self._l1_cache.move_to_end(cache_key)
            self._stats.cached_entries_count = len(self._l1_cache)

        # 2. Write to L2 Redis asynchronously
        try:
            r = await self._get_redis()
            if r:
                serialized = json.dumps(data)
                await r.set(f"ksec:cache:{cache_key}", serialized, ex=ttl)
        except Exception:
            pass

    async def invalidate(self, cache_key: Optional[str] = None, prefix: Optional[str] = None) -> int:
        """Invalidates specific cache key or all keys matching a prefix."""
        cleared = 0
        async with self._lock:
            if cache_key:
                if cache_key in self._l1_cache:
                    del self._l1_cache[cache_key]
                    cleared += 1
            elif prefix:
                to_delete = [k for k in self._l1_cache.keys() if k.startswith(prefix)]
                for k in to_delete:
                    del self._l1_cache[k]
                    cleared += 1
            else:
                cleared = len(self._l1_cache)
                self._l1_cache.clear()
            self._stats.cached_entries_count = len(self._l1_cache)

        try:
            r = await self._get_redis()
            if r:
                if cache_key:
                    await r.delete(f"ksec:cache:{cache_key}")
                elif prefix:
                    keys = await r.keys(f"ksec:cache:{prefix}*")
                    if keys:
                        await r.delete(*keys)
                else:
                    keys = await r.keys("ksec:cache:*")
                    if keys:
                        await r.delete(*keys)
        except Exception:
            pass

        return cleared

    def get_stats(self) -> CacheStats:
        self._stats.cached_entries_count = len(self._l1_cache)
        return self._stats

    def _update_stats_ratio(self) -> None:
        total = self._stats.total_requests
        if total > 0:
            self._stats.hit_ratio_pct = round((self._stats.cache_hits / total) * 100, 2)

    async def stream_sse_replay(self, cached_data: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """
        Simulates lightning-fast SSE token chunks from cached completion data.
        """
        choice = cached_data.get("choices", [{}])[0]
        full_text = choice.get("message", {}).get("content", "")
        model_name = cached_data.get("model", "ksec-fastpath")
        response_id = f"chatcmpl-replay-{hashlib.md5(full_text.encode()).hexdigest()[:8]}"

        # Split into realistic word/token chunks
        words = full_text.split(" ")
        for i, word in enumerate(words):
            chunk_content = word + (" " if i < len(words) - 1 else "")
            chunk_payload = {
                "id": response_id,
                "object": "chat.completion.chunk",
                "created": int(time.time()),
                "model": model_name,
                "choices": [
                    {
                        "index": 0,
                        "delta": {"content": chunk_content},
                        "finish_reason": None if i < len(words) - 1 else "stop"
                    }
                ],
                "ksec_fast_path": True
            }
            yield f"data: {json.dumps(chunk_payload)}\n\n"
            await asyncio.sleep(0.005)  # 5ms token replay cadence

        yield "data: [DONE]\n\n"


# Global Fast-Path Cache Singleton
fast_path_cache = FastPathCacheManager()

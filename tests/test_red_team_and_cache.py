"""
Integration and Unit Tests for:
1. LLM Provider Fast-Path Cache (L1 LRU, Canonical Hashing, SSE Replay, Poisoning Prevention)
2. Autonomous Red-Team Adversarial Testbed & Vector Catalog
"""

import pytest
import time
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.fast_path_cache import FastPathCacheManager, fast_path_cache
from src.guard.red_team import AdversarialTestbedRunner, red_team_runner, AttackCategory


@pytest.fixture
def client():
    return TestClient(app)


# -------------------------------------------------------------
# 1. Fast-Path Cache Unit & Security Gate Tests
# -------------------------------------------------------------
def test_canonical_hash_determinism():
    cache_mgr = FastPathCacheManager()

    msgs_1 = [{"role": "user", "content": "  What is eBPF?   "}]
    msgs_2 = [{"role": "USER", "content": "What is eBPF?"}]

    h1 = cache_mgr.generate_canonical_hash("tenant_a", "openai", "gpt-4o", msgs_1, temperature=0.1)
    h2 = cache_mgr.generate_canonical_hash("tenant_a", "openai", "gpt-4o", msgs_2, temperature=0.1)

    assert h1 == h2, "Canonical hash must be invariant under whitespace and case differences"

    # Different tenant must produce distinct hash
    h3 = cache_mgr.generate_canonical_hash("tenant_b", "openai", "gpt-4o", msgs_1, temperature=0.1)
    assert h1 != h3, "Different tenants must produce distinct isolated hashes"


def test_cache_eligibility_and_temperature_gate():
    cache_mgr = FastPathCacheManager()

    # Temperature <= 0.2 is cacheable
    assert cache_mgr.is_cacheable_request(temperature=0.0, threat_score=0.1) is True
    assert cache_mgr.is_cacheable_request(temperature=0.2, threat_score=0.1) is True

    # High temperature (> 0.2) is non-deterministic -> not cacheable
    assert cache_mgr.is_cacheable_request(temperature=0.7, threat_score=0.1) is False

    # Malicious / suspicious prompt -> not cacheable
    assert cache_mgr.is_cacheable_request(temperature=0.0, threat_score=0.85) is False


def test_cache_poisoning_security_gate():
    cache_mgr = FastPathCacheManager()

    # Clean response -> allowed
    assert cache_mgr.validate_egress_security(should_block=False, has_pii_violation=False, is_threat=False) is True

    # PII violation -> forbidden from cache
    assert cache_mgr.validate_egress_security(should_block=False, has_pii_violation=True, is_threat=False) is False

    # Blocked response -> forbidden from cache
    assert cache_mgr.validate_egress_security(should_block=True, has_pii_violation=False, is_threat=False) is False


import asyncio
import uuid

def test_fast_path_l1_cache_put_get():
    async def _test():
        cache_mgr = FastPathCacheManager(l1_capacity=10, default_ttl_sec=60)
        key = f"test_key_{uuid.uuid4().hex}"
        payload = {"model": "gpt-4o", "choices": [{"message": {"content": "Cached eBPF explanation"}}]}

        # Initially Miss
        assert await cache_mgr.get(key) is None

        # Put and Hit
        await cache_mgr.put(key, payload, tokens=15)
        cached = await cache_mgr.get(key)
        assert cached is not None
        assert cached["choices"][0]["message"]["content"] == "Cached eBPF explanation"

        stats = cache_mgr.get_stats()
        assert stats.cache_hits >= 1
        assert stats.tokens_saved >= 15

    asyncio.run(_test())


def test_fast_path_sse_replay():
    async def _test():
        cache_mgr = FastPathCacheManager()
        payload = {
            "model": "gpt-4o",
            "choices": [{"message": {"content": "Hello Autonomous Agent"}}]
        }

        chunks = []
        async for chunk in cache_mgr.stream_sse_replay(payload):
            chunks.append(chunk)

        assert len(chunks) >= 3
        assert chunks[-1] == "data: [DONE]\n\n"
        assert "Hello" in chunks[0]

    asyncio.run(_test())


# -------------------------------------------------------------
# 2. Red-Team Adversarial Testbed Tests
# -------------------------------------------------------------
def test_red_team_catalog_and_coverage():
    runner = AdversarialTestbedRunner()
    assert len(runner.vectors) >= 10

    categories = {v.category for v in runner.vectors}
    assert AttackCategory.INDIRECT_PROMPT_INJECTION in categories
    assert AttackCategory.JAILBREAK_DAN in categories
    assert AttackCategory.MODEL_EXTRACTION in categories
    assert AttackCategory.COMMAND_EXECUTION in categories


def test_red_team_suite_execution_zero_bypass():
    runner = AdversarialTestbedRunner()
    report = runner.run_suite()

    assert report.total_vectors > 0
    assert report.bypass_count == 0, f"Zero bypass required, but {report.bypass_count} bypasses detected"
    assert report.defense_rate_pct == 100.0
    assert report.status == "PASSED_ZERO_BYPASS"
    assert report.latency_p99_us < 50000.0, "Latency P99 must be under 50ms (50,000 µs)"


# -------------------------------------------------------------
# 3. HTTP Endpoints E2E Tests
# -------------------------------------------------------------
def test_redteam_run_endpoint(client):
    res = client.post("/api/v1/redteam/run")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["report"]["defense_rate_pct"] == 100.0
    assert data["report"]["bypass_count"] == 0


def test_redteam_vectors_endpoint(client):
    res = client.get("/api/v1/redteam/vectors")
    assert res.status_code == 200
    data = res.json()
    assert data["total_count"] >= 10
    assert len(data["vectors"]) >= 10


def test_redteam_summary_endpoint(client):
    res = client.get("/api/v1/redteam/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["readiness_grade"] == "ENTERPRISE_SECURE_A_PLUS"
    assert data["defense_rate_pct"] == 100.0


def test_cache_stats_endpoint(client):
    res = client.get("/v1/guard/cache/stats")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "cache_hits" in data["cache"]


def test_guard_chat_completions_fast_path_caching(client):
    tenant = f"test_tenant_{int(time.time())}"
    client.post(f"/v1/guard/cache/purge?tenant_id={tenant}")

    req_body = {
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": f"How does eBPF kernel instrumentation work? {time.time()}"}],
        "temperature": 0.0
    }

    # First call: Cache MISS
    res1 = client.post("/v1/chat/completions", json=req_body, headers={"x-ksec-policy-key": tenant})
    assert res1.status_code == 200
    assert res1.headers.get("X-KSEC-Cache") == "MISS"

    # Second call: Cache HIT (<1ms fast-path replay)
    res2 = client.post("/v1/chat/completions", json=req_body, headers={"x-ksec-policy-key": tenant})
    assert res2.status_code == 200
    assert res2.headers.get("X-KSEC-Cache") == "HIT"
    assert res2.headers.get("X-KSEC-Verdict") == "ALLOWED"

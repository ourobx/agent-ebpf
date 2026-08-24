import asyncio
import pytest
import anyio
from engine.consensus import (
    ConsensusStrategy,
    ModelCandidate,
    SpeculativeConsensusEngine,
)


def create_invoker(model_id: str, output: str, latency_ms: float, confidence: float = 1.0):
    async def _invoker():
        await anyio.sleep(latency_ms / 1000.0)
        return ModelCandidate(
            model_id=model_id,
            output=output,
            latency_ms=latency_ms,
            confidence_score=confidence,
        )
    return _invoker


@pytest.mark.anyio
async def test_fastest_valid_strategy():
    engine = SpeculativeConsensusEngine(strategy=ConsensusStrategy.FASTEST_VALID)
    invokers = [
        create_invoker("gpt-4o", "Result A", 50.0),
        create_invoker("claude-3-5-sonnet", "Result B", 20.0),
        create_invoker("gemini-1-5-pro", "Result C", 80.0),
    ]

    verdict = await engine.execute(invokers)
    assert verdict.selected_model_id == "claude-3-5-sonnet"
    assert verdict.selected_output == "Result B"
    assert verdict.strategy_used == ConsensusStrategy.FASTEST_VALID


@pytest.mark.anyio
async def test_majority_vote_quorum_and_tie_breaking():
    engine = SpeculativeConsensusEngine(strategy=ConsensusStrategy.MAJORITY_VOTE)
    invokers = [
        create_invoker("model-1", '{"status": "ok"}', 30.0),
        create_invoker("model-2", '{"status": "ok"}', 10.0),  # Aynı çıktı, daha düşük latency
        create_invoker("model-3", '{"status": "error"}', 5.0),
    ]

    verdict = await engine.execute(invokers)
    assert verdict.selected_output == '{"status": "ok"}'
    assert verdict.selected_model_id == "model-2"
    assert verdict.quorum_reached is True
    assert verdict.agreement_ratio == pytest.approx(2 / 3)


@pytest.mark.anyio
async def test_weighted_consensus_strategy():
    weights = {"model-heavy": 3.0, "model-light-1": 1.0, "model-light-2": 1.0}
    engine = SpeculativeConsensusEngine(
        strategy=ConsensusStrategy.WEIGHTED,
        model_weights=weights,
    )
    invokers = [
        create_invoker("model-heavy", "High Confidence Output", 40.0, confidence=1.0),
        create_invoker("model-light-1", "Alternative Output", 10.0, confidence=0.9),
        create_invoker("model-light-2", "Alternative Output", 15.0, confidence=0.9),
    ]

    verdict = await engine.execute(invokers)
    assert verdict.selected_output == "High Confidence Output"
    assert verdict.selected_model_id == "model-heavy"


@pytest.mark.anyio
async def test_unanimous_success_and_divergence_failure():
    engine = SpeculativeConsensusEngine(strategy=ConsensusStrategy.UNANIMOUS)
    
    # Başarılı mutabakat
    success_invokers = [
        create_invoker("m1", "Exact Match", 10.0),
        create_invoker("m2", "Exact Match", 20.0),
    ]
    verdict = await engine.execute(success_invokers)
    assert verdict.selected_output == "Exact Match"
    assert verdict.agreement_ratio == 1.0

    # Uyuşmazlık durumu
    divergent_invokers = [
        create_invoker("m1", "Answer X", 10.0),
        create_invoker("m2", "Answer Y", 20.0),
    ]
    with pytest.raises(ValueError, match="Unanimous consensus failed"):
        await engine.execute(divergent_invokers)


@pytest.mark.anyio
async def test_validator_fn_filtering():
    engine = SpeculativeConsensusEngine(strategy=ConsensusStrategy.FASTEST_VALID)
    invokers = [
        create_invoker("fast-invalid", "INVALID_FORMAT", 5.0),
        create_invoker("slow-valid", "VALID_JSON:{}", 25.0),
    ]

    validator = lambda out: out.startswith("VALID_JSON")
    verdict = await engine.execute(invokers, validator_fn=validator)
    assert verdict.selected_model_id == "slow-valid"
    assert verdict.selected_output == "VALID_JSON:{}"


@pytest.mark.anyio
async def test_consensus_timeout_handling():
    engine = SpeculativeConsensusEngine(timeout_seconds=0.05)

    async def slow_invoker():
        await anyio.sleep(0.2)
        return ModelCandidate(model_id="slow", output="Late", latency_ms=200.0)

    with pytest.raises(TimeoutError, match="exceeded deadline"):
        await engine.execute([slow_invoker])

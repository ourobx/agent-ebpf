import asyncio
import hashlib
import json
import time
from enum import Enum
from typing import Any, Callable, Coroutine, Dict, List, Optional, Set
from pydantic import BaseModel, Field, ConfigDict
import structlog

logger = structlog.get_logger(__name__)


class ConsensusStrategy(str, Enum):
    UNANIMOUS = "unanimous"          # Tüm modeller aynı çıktıyı vermeli
    MAJORITY_VOTE = "majority_vote"  # En çok tekrar eden deterministik çıktı (Quorum)
    FASTEST_VALID = "fastest_valid"  # AST/Schema testini ilk geçen doğrulanmış çıktı
    WEIGHTED = "weighted"            # Model güven puanlarına göre ağırlıklı seçim


class ModelCandidate(BaseModel):
    model_config = ConfigDict(frozen=True)

    model_id: str
    output: str
    latency_ms: float
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @property
    def output_hash(self) -> str:
        """Deterministik karşılaştırma için çıktı özeti."""
        normalized = self.output.strip()
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class ConsensusVerdict(BaseModel):
    selected_output: str
    selected_model_id: str
    strategy_used: ConsensusStrategy
    total_latency_ms: float
    quorum_reached: bool
    agreement_ratio: float
    candidates: List[ModelCandidate]
    raw_divergence_data: Dict[str, Any] = Field(default_factory=dict)


ModelInvoker = Callable[[], Coroutine[Any, Any, ModelCandidate]]


class SpeculativeConsensusEngine:
    """
    Spekülatif paralel model çağrılarını orkestre eden ve çıktılar arasında
    deterministik konsensüs sağlayan hakemlik motoru.
    """

    def __init__(
        self,
        strategy: ConsensusStrategy = ConsensusStrategy.MAJORITY_VOTE,
        timeout_seconds: float = 8.0,
        model_weights: Optional[Dict[str, float]] = None,
    ) -> None:
        self.strategy = strategy
        self.timeout_seconds = timeout_seconds
        self.model_weights = model_weights or {}

    async def execute(
        self,
        invokers: List[ModelInvoker],
        validator_fn: Optional[Callable[[str], bool]] = None,
    ) -> ConsensusVerdict:
        """
        Tüm model çağrıcılarını paralel asyncio görevleri olarak tetikler ve
        seçilen strateji doğrultusunda konsensüs oluşturur.
        """
        start_time = time.perf_counter()
        tasks = [asyncio.create_task(invoker()) for invoker in invokers]

        try:
            results = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=self.timeout_seconds,
            )
        except asyncio.TimeoutError:
            logger.error("Speculative consensus timed out", timeout=self.timeout_seconds)
            raise TimeoutError(f"Model consensus exceeded deadline of {self.timeout_seconds}s")

        candidates: List[ModelCandidate] = []
        for i, res in enumerate(results):
            if isinstance(res, Exception):
                logger.warning("Model candidate failed execution", invoker_index=i, error=str(res))
            elif isinstance(res, ModelCandidate):
                # Filter candidates that do not pass optional AST / Type validation
                if validator_fn is not None:
                    try:
                        if not validator_fn(res.output):
                            logger.info("Candidate failed custom validation", model_id=res.model_id)
                            continue
                    except Exception as val_err:
                        logger.error("Validator raised exception", model_id=res.model_id, error=str(val_err))
                        continue
                candidates.append(res)

        if not candidates:
            raise RuntimeError("Consensus failure: None of the candidate models returned a valid output.")

        total_elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        if self.strategy == ConsensusStrategy.FASTEST_VALID:
            selected = min(candidates, key=lambda c: c.latency_ms)
            return ConsensusVerdict(
                selected_output=selected.output,
                selected_model_id=selected.model_id,
                strategy_used=self.strategy,
                total_latency_ms=total_elapsed_ms,
                quorum_reached=True,
                agreement_ratio=1.0 / len(candidates),
                candidates=candidates,
            )

        return self._arbitrate_outputs(candidates, total_elapsed_ms)

    def _arbitrate_outputs(
        self, candidates: List[ModelCandidate], total_elapsed_ms: float
    ) -> ConsensusVerdict:
        """Hash tabanlı kümeleme ile çoğunluk veya ağırlık konsensüsünü hesaplar."""
        hash_groups: Dict[str, List[ModelCandidate]] = {}
        for cand in candidates:
            hash_groups.setdefault(cand.output_hash, []).append(cand)

        total_candidates = len(candidates)

        if self.strategy == ConsensusStrategy.UNANIMOUS:
            if len(hash_groups) == 1:
                winner = candidates[0]
                return ConsensusVerdict(
                    selected_output=winner.output,
                    selected_model_id=winner.model_id,
                    strategy_used=self.strategy,
                    total_latency_ms=total_elapsed_ms,
                    quorum_reached=True,
                    agreement_ratio=1.0,
                    candidates=candidates,
                )
            raise ValueError(f"Unanimous consensus failed. Divergent outputs observed: {len(hash_groups)}")

        if self.strategy == ConsensusStrategy.WEIGHTED:
            weighted_scores: Dict[str, float] = {}
            for h_val, group in hash_groups.items():
                score = sum(
                    self.model_weights.get(c.model_id, 1.0) * c.confidence_score for c in group
                )
                weighted_scores[h_val] = score

            best_hash = max(weighted_scores, key=weighted_scores.get)  # type: ignore
            winning_candidate = hash_groups[best_hash][0]
            agreement_ratio = len(hash_groups[best_hash]) / total_candidates

            return ConsensusVerdict(
                selected_output=winning_candidate.output,
                selected_model_id=winning_candidate.model_id,
                strategy_used=self.strategy,
                total_latency_ms=total_elapsed_ms,
                quorum_reached=agreement_ratio >= 0.5,
                agreement_ratio=agreement_ratio,
                candidates=candidates,
                raw_divergence_data={"weighted_scores": weighted_scores},
            )

        # Varsayılan: MAJORITY_VOTE
        largest_group_hash = max(hash_groups, key=lambda k: len(hash_groups[k]))
        majority_candidates = hash_groups[largest_group_hash]
        agreement_ratio = len(majority_candidates) / total_candidates
        quorum_reached = agreement_ratio > 0.5

        # Kazanan küme içinden en düşük gecikmeye sahip olanı seç
        winner = min(majority_candidates, key=lambda c: c.latency_ms)

        return ConsensusVerdict(
            selected_output=winner.output,
            selected_model_id=winner.model_id,
            strategy_used=self.strategy,
            total_latency_ms=total_elapsed_ms,
            quorum_reached=quorum_reached,
            agreement_ratio=agreement_ratio,
            candidates=candidates,
            raw_divergence_data={
                "cluster_counts": {h: len(items) for h, items in hash_groups.items()}
            },
        )

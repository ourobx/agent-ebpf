"""
Thread-safe local policy cache & circuit breaker for ksec-shield.
"""

import time
import threading
from typing import Dict, Optional, Tuple, List
from .types import PolicyRule, ActionType


class PolicyCache:
    def __init__(self):
        self._lock = threading.RLock()
        self._cache: Dict[str, Tuple[PolicyRule, float]] = {}
        self._failure_count = 0
        self._last_failure_time = 0.0
        self._failure_threshold = 5
        self._cooldown_seconds = 15.0

    def _make_key(self, action_type: str, target: str) -> str:
        return f"{action_type}:{target.strip().lower()}"

    def set_rule(self, rule: PolicyRule) -> None:
        key = self._make_key(rule.action_type, rule.target)
        expires_at = time.time() + float(rule.ttl_seconds)
        with self._lock:
            self._cache[key] = (rule, expires_at)

    def set_rules(self, rules: List[PolicyRule]) -> None:
        with self._lock:
            for rule in rules:
                self.set_rule(rule)

    def evaluate(self, action_type: ActionType, target: str) -> Tuple[str, Optional[PolicyRule]]:
        key = self._make_key(action_type, target)
        now = time.time()
        with self._lock:
            if key in self._cache:
                rule, expires_at = self._cache[key]
                if now <= expires_at:
                    return rule.decision, rule
                del self._cache[key]

        return "ALLOW", None

    def record_failure(self) -> None:
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()

    def record_success(self) -> None:
        with self._lock:
            self._failure_count = 0

    def is_circuit_open(self) -> bool:
        with self._lock:
            if self._failure_count >= self._failure_threshold:
                if time.time() - self._last_failure_time < self._cooldown_seconds:
                    return True
                self._failure_count = self._failure_threshold // 2
            return False

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

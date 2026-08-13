"""
Core KsecShield Engine for Python AI Agents.
"""

import time
import uuid
import functools
import threading
from typing import Callable, Any, Optional, Dict, List, TypeVar, cast
from datetime import datetime, timezone

from .types import (
    PolicyRule, 
    ShieldTelemetryEvent, 
    KsecSecurityViolationError, 
    ActionType
)
from .policy_cache import PolicyCache
from .client import KsecClient

F = TypeVar("F", bound=Callable[..., Any])


class KsecShield:
    def __init__(
        self,
        gateway_url: str = "https://ksec.space",
        api_key: Optional[str] = None,
        agent_id: Optional[str] = None,
        sync_interval_seconds: int = 30,
        telemetry_batch_seconds: int = 5,
        debug: bool = False
    ):
        self.gateway_url = gateway_url
        self.api_key = api_key
        self.agent_id = agent_id or f"agent-{uuid.uuid4().hex[:8]}"
        self.debug = debug
        self.sync_interval = sync_interval_seconds
        self.telemetry_interval = telemetry_batch_seconds

        self.cache = PolicyCache()
        self.client = KsecClient(gateway_url=gateway_url, api_key=api_key, debug=debug)
        self._telemetry_queue: List[ShieldTelemetryEvent] = []
        self._queue_lock = threading.Lock()
        self._listeners: Dict[str, List[Callable[[Dict[str, Any]], None]]] = {}

        # Initial background sync
        if self.sync_interval > 0:
            self._sync_thread = threading.Thread(target=self._background_sync_loop, daemon=True)
            self._sync_thread.start()

    def add_policy_rule(self, rule: PolicyRule) -> None:
        self.cache.set_rule(rule)

    def sync_policies(self) -> None:
        try:
            rules = self.client.fetch_policies()
            if rules:
                self.cache.set_rules(rules)
                self.cache.record_success()
                self._emit_event("policy_synced", {"count": len(rules)})
        except Exception as e:
            self.cache.record_failure()
            self._emit_event("error", {"type": "sync_failure", "error": str(e)})

    def _background_sync_loop(self) -> None:
        self.sync_policies()
        while True:
            time.sleep(self.sync_interval)
            self.sync_policies()

    def guard_action(
        self, 
        action: Callable[[], Any], 
        action_type: ActionType, 
        target: str, 
        metadata: Optional[Dict[str, Any]] = None
    ) -> Any:
        start_time = time.time()
        decision, rule = self.cache.evaluate(action_type, target)

        if decision == "BLOCK":
            duration_ms = (time.time() - start_time) * 1000.0
            event = ShieldTelemetryEvent(
                id=f"evt-{uuid.uuid4().hex[:12]}",
                agent_id=self.agent_id,
                action_type=action_type,
                target=target,
                decision="BLOCK",
                duration_ms=duration_ms,
                timestamp=datetime.now(timezone.utc).isoformat(),
                metadata=metadata or {},
                reason=rule.reason if rule else "Blocked by eBPF policy",
            )
            self._record_telemetry(event)
            self._emit_event("threat_blocked", {
                "action_type": action_type,
                "target": target,
                "reason": event.reason
            })
            raise KsecSecurityViolationError(
                f"Execution blocked by Agent-eBPF kernel shield: {action_type} on '{target}'",
                action_type=action_type,
                target=target,
                rule_id=rule.id if rule else None
            )

        try:
            result = action()
            duration_ms = (time.time() - start_time) * 1000.0
            self._record_telemetry(ShieldTelemetryEvent(
                id=f"evt-{uuid.uuid4().hex[:12]}",
                agent_id=self.agent_id,
                action_type=action_type,
                target=target,
                decision="ALLOW",
                duration_ms=duration_ms,
                timestamp=datetime.now(timezone.utc).isoformat(),
                metadata=metadata or {},
            ))
            return result
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000.0
            meta = dict(metadata or {})
            meta["error"] = str(e)
            self._record_telemetry(ShieldTelemetryEvent(
                id=f"evt-{uuid.uuid4().hex[:12]}",
                agent_id=self.agent_id,
                action_type=action_type,
                target=target,
                decision="ALLOW",
                duration_ms=duration_ms,
                timestamp=datetime.now(timezone.utc).isoformat(),
                metadata=meta,
            ))
            raise

    def _record_telemetry(self, event: ShieldTelemetryEvent) -> None:
        with self._queue_lock:
            self._telemetry_queue.append(event)
            if len(self._telemetry_queue) >= 50:
                batch = self._telemetry_queue[:]
                self._telemetry_queue.clear()
                threading.Thread(target=self.client.send_telemetry_batch, args=(batch,), daemon=True).start()

    def on(self, event_name: str, listener: Callable[[Dict[str, Any]], None]) -> None:
        if event_name not in self._listeners:
            self._listeners[event_name] = []
        self._listeners[event_name].append(listener)

    def _emit_event(self, event_name: str, payload: Dict[str, Any]) -> None:
        listeners = self._listeners.get(event_name, [])
        for l in listeners:
            try:
                l(payload)
            except Exception as e:
                if self.debug:
                    print(f"[ksec-shield] Listener error: {e}")


def guard(
    shield: KsecShield, 
    action_type: ActionType = "tool_execution", 
    target_extractor: Optional[Callable[..., str]] = None
) -> Callable[[F], F]:
    """Decorator to guard Python functions / agent tools."""
    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            if target_extractor:
                target = target_extractor(*args, **kwargs)
            else:
                target = func.__name__
            return shield.guard_action(
                lambda: func(*args, **kwargs),
                action_type=action_type,
                target=target,
                metadata={"args_count": len(args), "kwargs_keys": list(kwargs.keys())}
            )
        return cast(F, wrapper)
    return decorator

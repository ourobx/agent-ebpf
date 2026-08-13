"""
Unit and integration tests for ksec-shield Python SDK.
"""

import pytest
from ksec_shield import KsecShield, guard, PolicyRule, KsecSecurityViolationError


def test_ksec_shield_allow_default():
    shield = KsecShield(
        gateway_url="http://localhost:8000",
        sync_interval_seconds=0,
        telemetry_batch_seconds=0
    )

    @guard(shield, action_type="tool_execution")
    def sample_tool(a: int, b: int) -> int:
        return a + b

    res = sample_tool(10, 20)
    assert res == 30


def test_ksec_shield_block_rule():
    shield = KsecShield(
        gateway_url="http://localhost:8000",
        sync_interval_seconds=0,
        telemetry_batch_seconds=0
    )

    shield.add_policy_rule(PolicyRule(
        id="block-bad-tool",
        action_type="tool_execution",
        target="dangerous_bash_exec",
        decision="BLOCK",
        reason="Blocked by security policy"
    ))

    @guard(shield, action_type="tool_execution")
    def dangerous_bash_exec(cmd: str) -> str:
        return f"executed: {cmd}"

    with pytest.raises(KsecSecurityViolationError) as exc_info:
        dangerous_bash_exec("rm -rf /")

    assert "Execution blocked by Agent-eBPF" in str(exc_info.value)
    assert exc_info.value.target == "dangerous_bash_exec"


def test_ksec_shield_event_listener():
    shield = KsecShield(
        gateway_url="http://localhost:8000",
        sync_interval_seconds=0,
        telemetry_batch_seconds=0
    )

    events_captured = []
    shield.on("threat_blocked", lambda evt: events_captured.append(evt))

    shield.add_policy_rule(PolicyRule(
        id="block-c2-ip",
        action_type="network_egress",
        target="203.0.113.5",
        decision="BLOCK"
    ))

    with pytest.raises(KsecSecurityViolationError):
        shield.guard_action(
            lambda: "connected",
            action_type="network_egress",
            target="203.0.113.5"
        )

    assert len(events_captured) == 1
    assert events_captured[0]["target"] == "203.0.113.5"


def test_multi_provider_adapter_anthropic():
    from ksec_shield import UniversalProviderAdapter, LLMProvider
    shield = KsecShield(gateway_url="http://localhost:8000", sync_interval_seconds=0, telemetry_batch_seconds=0)
    adapter = UniversalProviderAdapter(shield)

    class MockAnthropicMessages:
        def create(self, model, messages):
            return {"role": "assistant", "content": "hello from claude"}

    class MockAnthropicClient:
        messages = MockAnthropicMessages()

    client = MockAnthropicClient()
    adapter.protect_client(client, provider=LLMProvider.ANTHROPIC)

    res = client.messages.create(model="claude-3-5-sonnet-20241022", messages=[{"role": "user", "content": "hi"}])
    assert res["content"] == "hello from claude"


def test_multi_provider_adapter_gemini():
    from ksec_shield import UniversalProviderAdapter, LLMProvider
    shield = KsecShield(gateway_url="http://localhost:8000", sync_interval_seconds=0, telemetry_batch_seconds=0)
    adapter = UniversalProviderAdapter(shield)

    class MockGeminiModel:
        model_name = "gemini-2.0-flash"
        def generate_content(self, prompt):
            return {"text": "hello from gemini"}

    model = MockGeminiModel()
    adapter.protect_client(model, provider=LLMProvider.GEMINI)

    res = model.generate_content("hello")
    assert res["text"] == "hello from gemini"


def test_multi_provider_adapter_blocked_target():
    from ksec_shield import UniversalProviderAdapter, LLMProvider
    shield = KsecShield(gateway_url="http://localhost:8000", sync_interval_seconds=0, telemetry_batch_seconds=0)
    shield.add_policy_rule(PolicyRule(
        id="block-openai-egress",
        action_type="network_egress",
        target="api.openai.com",
        decision="BLOCK"
    ))

    adapter = UniversalProviderAdapter(shield)

    class MockOpenAIChatCompletions:
        def create(self, model, messages):
            return {"role": "assistant", "content": "hello"}

    class MockOpenAIChat:
        completions = MockOpenAIChatCompletions()

    class MockOpenAIClient:
        chat = MockOpenAIChat()

    client = MockOpenAIClient()
    adapter.protect_client(client, provider=LLMProvider.OPENAI)

    with pytest.raises(KsecSecurityViolationError):
        client.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": "hi"}])


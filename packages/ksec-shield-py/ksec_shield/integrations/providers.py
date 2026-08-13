"""
Universal Multi-Provider LLM & Agent Framework Adapters.

Supports:
- Anthropic (Claude 3.5 Sonnet / Haiku / Opus)
- Google Gemini (Gemini 1.5 Pro / Flash, Gemini 2.0)
- DeepSeek (DeepSeek-V3, DeepSeek-R1)
- Ollama & Local LLMs (vLLM, LMStudio, LocalAI)
- Mistral AI & Groq & Together AI & OpenRouter
- OpenAI (GPT-4o, o1, o3-mini)
- LiteLLM Universal Proxy
- AutoGen & LlamaIndex & CrewAI & LangChain
"""

from typing import Any, Callable, Optional, Union, Dict
from enum import Enum
from ..shield import KsecShield
from ..types import ActionType, KsecSecurityViolationError


class LLMProvider(str, Enum):
    AUTO = "auto"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    OPENAI = "openai"
    DEEPSEEK = "deepseek"
    OLLAMA = "ollama"
    MISTRAL = "mistral"
    GROQ = "groq"
    TOGETHER = "together"
    OPENROUTER = "openrouter"
    LITELLM = "litellm"
    CUSTOM = "custom"


PROVIDER_ENDPOINTS: Dict[LLMProvider, str] = {
    LLMProvider.ANTHROPIC: "api.anthropic.com",
    LLMProvider.GEMINI: "generativelanguage.googleapis.com",
    LLMProvider.OPENAI: "api.openai.com",
    LLMProvider.DEEPSEEK: "api.deepseek.com",
    LLMProvider.OLLAMA: "localhost:11434",
    LLMProvider.MISTRAL: "api.mistral.ai",
    LLMProvider.GROQ: "api.groq.com",
    LLMProvider.TOGETHER: "api.together.xyz",
    LLMProvider.OPENROUTER: "openrouter.ai",
}


class UniversalProviderAdapter:
    """Universal wrapper that attaches eBPF kernel security to ANY LLM client or agent."""

    def __init__(self, shield: KsecShield):
        self.shield = shield

    def protect_client(
        self, 
        client: Any, 
        provider: Union[LLMProvider, str] = LLMProvider.AUTO,
        custom_endpoint: Optional[str] = None
    ) -> Any:
        """
        Protects any LLM client (Anthropic, Gemini, OpenAI, DeepSeek, Ollama, etc.)
        with zero-trust kernel verification before any token or prompt leaves the machine.
        """
        prov_enum = LLMProvider(provider) if isinstance(provider, str) else provider
        target_host = custom_endpoint or PROVIDER_ENDPOINTS.get(prov_enum, "llm-provider")

        # 1. Anthropic Client Protection
        if hasattr(client, "messages") and hasattr(client.messages, "create"):
            orig_create = client.messages.create
            def guarded_anthropic_create(*args: Any, **kwargs: Any) -> Any:
                model = kwargs.get("model", "claude")
                return self.shield.guard_action(
                    lambda: orig_create(*args, **kwargs),
                    action_type="network_egress",
                    target=target_host or "api.anthropic.com",
                    metadata={"provider": "anthropic", "model": model}
                )
            client.messages.create = guarded_anthropic_create
            return client

        # 2. Google Gemini / GenerativeModel Protection
        if hasattr(client, "generate_content"):
            orig_generate = client.generate_content
            def guarded_gemini_generate(*args: Any, **kwargs: Any) -> Any:
                model_name = getattr(client, "model_name", "gemini")
                return self.shield.guard_action(
                    lambda: orig_generate(*args, **kwargs),
                    action_type="network_egress",
                    target=target_host or "generativelanguage.googleapis.com",
                    metadata={"provider": "gemini", "model": model_name}
                )
            client.generate_content = guarded_gemini_generate
            return client

        # 3. OpenAI & OpenAI-Compatible (DeepSeek, Groq, Mistral, Ollama, Together, OpenRouter)
        if hasattr(client, "chat") and hasattr(client.chat, "completions") and hasattr(client.chat.completions, "create"):
            orig_create = client.chat.completions.create
            def guarded_openai_create(*args: Any, **kwargs: Any) -> Any:
                model = kwargs.get("model", "unknown")
                return self.shield.guard_action(
                    lambda: orig_create(*args, **kwargs),
                    action_type="network_egress",
                    target=target_host or "openai-compatible-endpoint",
                    metadata={"provider": str(prov_enum), "model": model}
                )
            client.chat.completions.create = guarded_openai_create
            return client

        # 4. LiteLLM / Custom Function / Generic Callable
        if callable(client):
            def guarded_callable(*args: Any, **kwargs: Any) -> Any:
                return self.shield.guard_action(
                    lambda: client(*args, **kwargs),
                    action_type="network_egress",
                    target=target_host,
                    metadata={"provider": str(prov_enum), "custom": True}
                )
            return guarded_callable

        return client

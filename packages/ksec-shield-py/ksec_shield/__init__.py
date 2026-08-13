"""
ksec-shield: Official Python SDK for Agent-eBPF Zero-Trust Protection.
Universal support for Claude, Gemini, OpenAI, DeepSeek, Ollama, LangChain, CrewAI, LlamaIndex, AutoGen.
"""

from .types import (
    PolicyRule, 
    ShieldTelemetryEvent, 
    KsecSecurityViolationError, 
    ActionType
)
from .shield import KsecShield, guard
from .policy_cache import PolicyCache
from .client import KsecClient
from .integrations.langchain import KsecLangChainCallback
from .integrations.crewai import KsecCrewAIToolWrapper
from .integrations.llamaindex import KsecLlamaIndexHandler
from .integrations.autogen import KsecAutoGenHook
from .integrations.providers import UniversalProviderAdapter, LLMProvider

__version__ = "1.0.0"

__all__ = [
    "KsecShield",
    "guard",
    "PolicyRule",
    "ShieldTelemetryEvent",
    "KsecSecurityViolationError",
    "ActionType",
    "PolicyCache",
    "KsecClient",
    "KsecLangChainCallback",
    "KsecCrewAIToolWrapper",
    "KsecLlamaIndexHandler",
    "KsecAutoGenHook",
    "UniversalProviderAdapter",
    "LLMProvider",
]

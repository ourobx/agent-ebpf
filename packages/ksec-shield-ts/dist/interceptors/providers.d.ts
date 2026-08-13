/**
 * Universal Multi-Provider LLM & Agent Framework Adapters for TypeScript/Node.js.
 *
 * Supports:
 * - Anthropic SDK (@anthropic-ai/sdk)
 * - Google GenAI SDK (@google/genai / @google/generative-ai)
 * - OpenAI & Compatible SDK (openai) for DeepSeek, Ollama, Groq, Mistral, Together, OpenRouter
 * - Vercel AI SDK (ai)
 * - LlamaIndexTS (llamaindex)
 * - LangChain.js (langchain / @langchain/core)
 */
import { KsecShield } from '../index.js';
export type LLMProviderType = 'anthropic' | 'gemini' | 'openai' | 'deepseek' | 'ollama' | 'mistral' | 'groq' | 'together' | 'openrouter' | 'custom';
export declare const PROVIDER_ENDPOINTS: Record<string, string>;
export declare class UniversalProviderAdapter {
    private shield;
    constructor(shield: KsecShield);
    /**
     * Protects any LLM Client (Anthropic, Gemini, OpenAI, DeepSeek, Ollama, etc.)
     */
    protectClient<T extends object>(client: T, provider?: LLMProviderType, customEndpoint?: string): T;
}
//# sourceMappingURL=providers.d.ts.map
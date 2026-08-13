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

export type LLMProviderType = 
  | 'anthropic'
  | 'gemini'
  | 'openai'
  | 'deepseek'
  | 'ollama'
  | 'mistral'
  | 'groq'
  | 'together'
  | 'openrouter'
  | 'custom';

export const PROVIDER_ENDPOINTS: Record<string, string> = {
  anthropic: 'api.anthropic.com',
  gemini: 'generativelanguage.googleapis.com',
  openai: 'api.openai.com',
  deepseek: 'api.deepseek.com',
  ollama: 'localhost:11434',
  mistral: 'api.mistral.ai',
  groq: 'api.groq.com',
  together: 'api.together.xyz',
  openrouter: 'openrouter.ai',
};

export class UniversalProviderAdapter {
  private shield: KsecShield;

  constructor(shield: KsecShield) {
    this.shield = shield;
  }

  /**
   * Protects any LLM Client (Anthropic, Gemini, OpenAI, DeepSeek, Ollama, etc.)
   */
  public protectClient<T extends object>(client: T, provider: LLMProviderType = 'custom', customEndpoint?: string): T {
    const targetHost = customEndpoint || PROVIDER_ENDPOINTS[provider] || 'llm-provider';

    // 1. Anthropic SDK
    const anyClient = client as any;
    if (anyClient?.messages?.create && typeof anyClient.messages.create === 'function') {
      const origCreate = anyClient.messages.create.bind(anyClient.messages);
      anyClient.messages.create = async (...args: any[]) => {
        const model = args[0]?.model || 'claude';
        return this.shield.guard(
          () => origCreate(...args),
          {
            actionType: 'network_egress',
            target: targetHost,
            metadata: { provider: 'anthropic', model },
          }
        );
      };
      return client;
    }

    // 2. Google Gemini / GenerativeAI SDK
    if (anyClient?.generateContent && typeof anyClient.generateContent === 'function') {
      const origGenerate = anyClient.generateContent.bind(anyClient);
      anyClient.generateContent = async (...args: any[]) => {
        return this.shield.guard(
          () => origGenerate(...args),
          {
            actionType: 'network_egress',
            target: targetHost,
            metadata: { provider: 'gemini' },
          }
        );
      };
      return client;
    }

    // 3. OpenAI & Compatible (DeepSeek, Groq, Ollama, Mistral)
    if (anyClient?.chat?.completions?.create && typeof anyClient.chat.completions.create === 'function') {
      const origCreate = anyClient.chat.completions.create.bind(anyClient.chat.completions);
      anyClient.chat.completions.create = async (...args: any[]) => {
        const model = args[0]?.model || 'unknown';
        return this.shield.guard(
          () => origCreate(...args),
          {
            actionType: 'network_egress',
            target: targetHost,
            metadata: { provider, model },
          }
        );
      };
      return client;
    }

    return client;
  }
}

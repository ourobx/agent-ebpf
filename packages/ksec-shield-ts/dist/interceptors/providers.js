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
export const PROVIDER_ENDPOINTS = {
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
    shield;
    constructor(shield) {
        this.shield = shield;
    }
    /**
     * Protects any LLM Client (Anthropic, Gemini, OpenAI, DeepSeek, Ollama, etc.)
     */
    protectClient(client, provider = 'custom', customEndpoint) {
        const targetHost = customEndpoint || PROVIDER_ENDPOINTS[provider] || 'llm-provider';
        // 1. Anthropic SDK
        const anyClient = client;
        if (anyClient?.messages?.create && typeof anyClient.messages.create === 'function') {
            const origCreate = anyClient.messages.create.bind(anyClient.messages);
            anyClient.messages.create = async (...args) => {
                const model = args[0]?.model || 'claude';
                return this.shield.guard(() => origCreate(...args), {
                    actionType: 'network_egress',
                    target: targetHost,
                    metadata: { provider: 'anthropic', model },
                });
            };
            return client;
        }
        // 2. Google Gemini / GenerativeAI SDK
        if (anyClient?.generateContent && typeof anyClient.generateContent === 'function') {
            const origGenerate = anyClient.generateContent.bind(anyClient);
            anyClient.generateContent = async (...args) => {
                return this.shield.guard(() => origGenerate(...args), {
                    actionType: 'network_egress',
                    target: targetHost,
                    metadata: { provider: 'gemini' },
                });
            };
            return client;
        }
        // 3. OpenAI & Compatible (DeepSeek, Groq, Ollama, Mistral)
        if (anyClient?.chat?.completions?.create && typeof anyClient.chat.completions.create === 'function') {
            const origCreate = anyClient.chat.completions.create.bind(anyClient.chat.completions);
            anyClient.chat.completions.create = async (...args) => {
                const model = args[0]?.model || 'unknown';
                return this.shield.guard(() => origCreate(...args), {
                    actionType: 'network_egress',
                    target: targetHost,
                    metadata: { provider, model },
                });
            };
            return client;
        }
        return client;
    }
}
//# sourceMappingURL=providers.js.map
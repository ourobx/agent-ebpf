import { KsecShield } from '../index.js';
export interface LangChainToolCall {
    name: string;
    description?: string;
    [key: string]: unknown;
}
/**
 * LangChain Tracer / Callback Handler for Agent-eBPF protection.
 * Automatically wraps tool starts, LLM calls, and external requests.
 */
export declare class KsecLangChainCallback {
    private shield;
    constructor(shield: KsecShield);
    handleToolStart(tool: LangChainToolCall, input: string, runId?: string, parentRunId?: string, tags?: string[], metadata?: Record<string, unknown>): Promise<void>;
    handleToolError(err: Error, tool: LangChainToolCall): Promise<void>;
}
//# sourceMappingURL=langchain.d.ts.map
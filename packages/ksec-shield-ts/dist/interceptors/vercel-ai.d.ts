/**
 * Vercel AI SDK (`ai`) Interceptor for Agent-eBPF Kernel Shield.
 * Provides zero-latency tool interception and execution guardrails.
 */
import type { KsecShield } from '../index.js';
export interface VercelAICoreTool<PARAMS = any, RESULT = any> {
    description?: string;
    parameters?: any;
    execute?: (args: PARAMS, options?: any) => Promise<RESULT> | RESULT;
    [key: string]: unknown;
}
export declare class VercelAIInterceptor {
    private shield;
    constructor(shield: KsecShield);
    /**
     * Wraps a dictionary of Vercel AI SDK CoreTools with Kernel Shield guardrails.
     */
    wrapTools<T extends Record<string, VercelAICoreTool>>(tools: T): T;
    /**
     * Alias for wrapTools.
     */
    protectTools<T extends Record<string, VercelAICoreTool>>(tools: T): T;
    /**
     * Wraps a single Vercel AI SDK CoreTool with Kernel Shield guardrails.
     */
    wrapTool<TOOL extends VercelAICoreTool>(name: string, tool: TOOL): TOOL;
}
//# sourceMappingURL=vercel-ai.d.ts.map
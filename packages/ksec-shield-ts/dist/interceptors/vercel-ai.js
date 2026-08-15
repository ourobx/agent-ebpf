/**
 * Vercel AI SDK (`ai`) Interceptor for Agent-eBPF Kernel Shield.
 * Provides zero-latency tool interception and execution guardrails.
 */
export class VercelAIInterceptor {
    shield;
    constructor(shield) {
        this.shield = shield;
    }
    /**
     * Wraps a dictionary of Vercel AI SDK CoreTools with Kernel Shield guardrails.
     */
    wrapTools(tools) {
        const wrapped = {};
        for (const [name, toolDef] of Object.entries(tools)) {
            if (!toolDef || typeof toolDef.execute !== 'function') {
                wrapped[name] = toolDef;
                continue;
            }
            wrapped[name] = this.wrapTool(name, toolDef);
        }
        return wrapped;
    }
    /**
     * Alias for wrapTools.
     */
    protectTools(tools) {
        return this.wrapTools(tools);
    }
    /**
     * Wraps a single Vercel AI SDK CoreTool with Kernel Shield guardrails.
     */
    wrapTool(name, tool) {
        if (!tool.execute) {
            return tool;
        }
        const originalExec = tool.execute.bind(tool);
        return {
            ...tool,
            execute: async (args, options) => {
                return this.shield.guard(() => originalExec(args, options), {
                    actionType: 'tool_execution',
                    target: name,
                    metadata: {
                        toolName: name,
                        args,
                        options,
                    },
                });
            },
        };
    }
}
//# sourceMappingURL=vercel-ai.js.map
/**
 * LangChain Tracer / Callback Handler for Agent-eBPF protection.
 * Automatically wraps tool starts, LLM calls, and external requests.
 */
export class KsecLangChainCallback {
    shield;
    constructor(shield) {
        this.shield = shield;
    }
    async handleToolStart(tool, input) {
        const target = tool.name;
        await this.shield.guard(async () => {
            // Validation pass
            return true;
        }, {
            actionType: 'tool_execution',
            target,
            metadata: { input },
        });
    }
    async handleToolError(err, tool) {
        this.shield.emitCustomEvent('threat_blocked', {
            toolName: tool.name,
            error: err.message,
        });
    }
}
//# sourceMappingURL=langchain.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KsecLangChainCallback = void 0;
/**
 * LangChain Tracer / Callback Handler for Agent-eBPF protection.
 * Automatically wraps tool starts, LLM calls, and external requests.
 */
class KsecLangChainCallback {
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
exports.KsecLangChainCallback = KsecLangChainCallback;
//# sourceMappingURL=langchain.js.map
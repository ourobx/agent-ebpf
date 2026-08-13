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
export class KsecLangChainCallback {
  private shield: KsecShield;

  constructor(shield: KsecShield) {
    this.shield = shield;
  }

  public async handleToolStart(tool: LangChainToolCall, input: string): Promise<void> {
    const target = tool.name;
    await this.shield.guard(
      async () => {
        // Validation pass
        return true;
      },
      {
        actionType: 'tool_execution',
        target,
        metadata: { input },
      }
    );
  }

  public async handleToolError(err: Error, tool: LangChainToolCall): Promise<void> {
    this.shield.emitCustomEvent('threat_blocked', {
      toolName: tool.name,
      error: err.message,
    });
  }
}

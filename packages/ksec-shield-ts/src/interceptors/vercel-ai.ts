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

export class VercelAIInterceptor {
  constructor(private shield: KsecShield) {}

  /**
   * Wraps a dictionary of Vercel AI SDK CoreTools with Kernel Shield guardrails.
   */
  public wrapTools<T extends Record<string, VercelAICoreTool>>(tools: T): T {
    const wrapped: Record<string, VercelAICoreTool> = {};

    for (const [name, toolDef] of Object.entries(tools)) {
      if (!toolDef || typeof toolDef.execute !== 'function') {
        wrapped[name] = toolDef;
        continue;
      }

      wrapped[name] = this.wrapTool(name, toolDef);
    }

    return wrapped as T;
  }

  /**
   * Alias for wrapTools.
   */
  public protectTools<T extends Record<string, VercelAICoreTool>>(tools: T): T {
    return this.wrapTools(tools);
  }

  /**
   * Wraps a single Vercel AI SDK CoreTool with Kernel Shield guardrails.
   */
  public wrapTool<TOOL extends VercelAICoreTool>(name: string, tool: TOOL): TOOL {
    if (!tool.execute) {
      return tool;
    }

    const originalExec = tool.execute.bind(tool);

    return {
      ...tool,
      execute: async (args: any, options: any) => {
        return this.shield.guard(
          () => originalExec(args, options),
          {
            actionType: 'tool_execution',
            target: name,
            metadata: {
              toolName: name,
              args,
              options,
            },
          }
        );
      },
    };
  }
}

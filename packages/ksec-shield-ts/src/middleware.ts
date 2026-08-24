import { DeterminismEngine } from "./core.js";
import { VetoException } from "./errors.js";

export interface InterceptOptions {
  tenantHeaderKey?: string;
  onViolation?: (error: VetoException, context: Record<string, any>) => Promise<void> | void;
}

/**
 * Universal runtime guard middleware for AI Agent tool calls, JSON data, SQL queries, and code execution.
 */
export function createAgentGuard(options: InterceptOptions = {}) {
  const headerKey = options.tenantHeaderKey || "x-tenant-id";

  return async function guard<T>(
    payload: { generatedSql?: string; generatedCode?: string; data?: unknown },
    contextHeaders: Record<string, string | undefined> = {}
  ): Promise<T> {
    const tenantId = contextHeaders[headerKey.toLowerCase()] || contextHeaders[headerKey];

    try {
      if (payload.generatedSql) {
        DeterminismEngine.inspectSql(payload.generatedSql, tenantId);
      }

      if (payload.generatedCode) {
        DeterminismEngine.inspectCode(payload.generatedCode);
      }

      return payload.data as T;
    } catch (error) {
      if (error instanceof VetoException) {
        if (options.onViolation) {
          await options.onViolation(error, { tenantId, payload });
        }
        throw error;
      }
      throw error;
    }
  };
}

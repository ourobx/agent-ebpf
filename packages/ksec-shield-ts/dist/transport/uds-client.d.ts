import { EventEmitter } from 'node:events';
import type { FailMode } from '../types.js';
export interface UdsClientOptions {
    socketPath?: string;
    timeoutMs?: number;
    failMode?: FailMode;
    fallbackPolicy?: FailMode;
}
export interface PolicyCheckPayload {
    actionType: string;
    target: string;
    metadata?: Record<string, unknown>;
}
export interface PolicyCheckResponse {
    allowed: boolean;
    decision?: 'ALLOW' | 'BLOCK';
    reason?: string;
    kernelTraceId?: string;
    ruleId?: string;
}
export declare class UdsTransportClient extends EventEmitter {
    private socketPath;
    private timeoutMs;
    private failMode;
    constructor(options?: UdsClientOptions);
    /**
     * Evaluates action against local eBPF daemon via Unix Domain Socket / Named Pipe.
     */
    evaluate(payload: PolicyCheckPayload): Promise<PolicyCheckResponse>;
    /**
     * Alias for evaluate matching legacy API.
     */
    checkPolicy(action: string, target: string, metadata?: Record<string, unknown>): Promise<PolicyCheckResponse>;
    getSocketPath(): string;
    getFailMode(): FailMode;
}
export { UdsTransportClient as LocalUdsClient };
//# sourceMappingURL=uds-client.d.ts.map
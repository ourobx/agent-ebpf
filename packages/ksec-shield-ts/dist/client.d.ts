import { KsecShieldConfig, PolicyRule, ShieldTelemetryEvent } from './types.js';
export interface ClientOptions {
    /** Gateway URL endpoint (e.g. "https://ksec.space") */
    gatewayUrl?: string;
    /** Base URL endpoint alias for gatewayUrl */
    baseUrl?: string;
    /** Authorization bearer token or API key */
    apiKey?: string;
    /** Request timeout in milliseconds (default: 10000) */
    timeoutMs?: number;
    /** Maximum retry attempts for transient network or 5xx failures (default: 3) */
    maxRetries?: number;
    /** Enable debug logging (default: false) */
    debug?: boolean;
    /** Custom fetch implementation enjected for testing/mocking */
    fetch?: typeof fetch;
}
export type ClientConfig = ClientOptions;
export declare class KsecClient {
    #private;
    constructor(config?: KsecShieldConfig & ClientOptions);
    get gatewayUrl(): string;
    get apiKey(): string;
    get debug(): boolean;
    /**
     * Fetches remote policy rules from Gateway.
     */
    fetchPolicies(): Promise<PolicyRule[]>;
    /**
     * Evaluates action remotely against Gateway policies.
     */
    evaluatePolicy(payload: {
        actionType: string;
        target: string;
        metadata?: Record<string, unknown>;
    }): Promise<{
        allowed: boolean;
        decision: 'ALLOW' | 'BLOCK';
        reason?: string;
        kernelTraceId?: string;
        matchedRule?: string;
    }>;
    /**
     * Sends telemetry events batch to Gateway.
     */
    sendTelemetryBatch(events: ShieldTelemetryEvent[]): Promise<void>;
    /**
     * Asynchronous generator consuming Server-Sent Events (SSE) stream from Gateway.
     */
    streamEvents(signal?: AbortSignal): AsyncGenerator<Record<string, unknown>, void, unknown>;
}
//# sourceMappingURL=client.d.ts.map
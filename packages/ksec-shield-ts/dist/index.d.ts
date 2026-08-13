import { KsecShieldConfig, GuardOptions, ShieldEventType, ShieldEventListener, PolicyRule } from './types.js';
export * from './types.js';
export * from './circuit-breaker.js';
export * from './client.js';
export * from './interceptors/langchain.js';
export * from './interceptors/providers.js';
export declare class KsecShield {
    private config;
    private cache;
    private client;
    private telemetryQueue;
    private syncTimer?;
    private telemetryTimer?;
    private listeners;
    constructor(config?: KsecShieldConfig);
    private initTimers;
    syncPolicies(): Promise<void>;
    /**
     * Manually load policy rules into local cache
     */
    addPolicyRule(rule: PolicyRule): void;
    /**
     * Guards a function execution with zero-latency local policy evaluation and background telemetry.
     */
    guard<T>(fn: () => Promise<T> | T, options: GuardOptions): Promise<T>;
    /**
     * Wraps the global fetch or a custom HTTP client to inspect egress targets.
     */
    protectFetch(originalFetch?: typeof fetch): typeof globalThis.fetch;
    private recordTelemetry;
    flushTelemetry(): Promise<void>;
    on(event: ShieldEventType, listener: ShieldEventListener): () => void;
    emitCustomEvent(event: ShieldEventType, payload: Record<string, unknown>): void;
    destroy(): void;
}
//# sourceMappingURL=index.d.ts.map
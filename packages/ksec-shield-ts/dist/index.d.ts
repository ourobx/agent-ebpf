import { KsecShieldConfig, GuardOptions, ShieldEventType, ShieldEventListener, PolicyRule } from './types.js';
import { FastPathEngine, ShieldRule } from './engine/in-memory-matcher.js';
import { UdsTransportClient } from './transport/uds-client.js';
import { VercelAIInterceptor } from './interceptors/vercel-ai.js';
import { ShieldOTelExporter } from './telemetry/otel.js';
export * from './types.js';
export * from './circuit-breaker.js';
export * from './client.js';
export * from './engine/in-memory-matcher.js';
export * from './transport/uds-client.js';
export * from './presets/index.js';
export * from './telemetry/index.js';
export * from './interceptors/langchain.js';
export * from './interceptors/providers.js';
export * from './interceptors/vercel-ai.js';
export declare class KsecShield {
    private config;
    private cache;
    private client;
    readonly fastPath: FastPathEngine;
    readonly udsClient: UdsTransportClient;
    readonly vercelAI: VercelAIInterceptor;
    readonly otel: ShieldOTelExporter;
    private telemetryQueue;
    private syncTimer?;
    private telemetryTimer?;
    private listeners;
    constructor(config?: KsecShieldConfig);
    private initTimers;
    syncPolicies(): Promise<void>;
    /**
     * Applies a predefined security preset (e.g. ShieldPresets.StrictReadOnly)
     */
    applyPreset(rules: ShieldRule[]): void;
    /**
     * Manually load policy rules into local cache
     */
    addPolicyRule(rule: PolicyRule): void;
    /**
     * Manually add a fast-path pattern rule
     */
    addFastRule(rule: ShieldRule): void;
    /**
     * Guards a function execution with hybrid multi-layered policy evaluation,
     * OpenTelemetry semantic tracing and background telemetry.
     *
     * Hierarchy:
     * 1. In-Memory Fast-Path (<0.02ms)
     * 2. Policy Cache Evaluation (synced remote rules)
     * 3. Local Kernel UDS Daemon (<0.1ms) (if enabled)
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
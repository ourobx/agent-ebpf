import type { ThreatBlockedEvent } from '../types.js';
export interface ShieldOTelConfig {
    tracerName?: string;
    tracerVersion?: string;
    enabled?: boolean;
}
export interface MinimalSpan {
    setAttributes(attributes: Record<string, unknown>): this;
    setAttribute(key: string, value: unknown): this;
    addEvent(name: string, attributes?: Record<string, unknown>): this;
    setStatus(status: {
        code: number;
        message?: string;
    }): this;
    end(): void;
}
export interface MinimalTracer {
    startSpan(name: string, options?: {
        attributes?: Record<string, unknown>;
    }): MinimalSpan;
}
export declare class ShieldOTelExporter {
    private tracer;
    private isAvailable;
    private enabled;
    private SpanStatusCode;
    constructor(config?: ShieldOTelConfig);
    private initTracer;
    startGuardSpan(actionType: string, target: string): MinimalSpan | null;
    recordThreatBlocked(event: ThreatBlockedEvent, activeSpan?: MinimalSpan | null): void;
    recordAllowed(activeSpan?: MinimalSpan | null, source?: 'fast-path' | 'uds' | 'gateway'): void;
    isOTelActive(): boolean;
}
//# sourceMappingURL=otel.d.ts.map
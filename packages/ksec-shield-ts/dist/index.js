"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KsecShield = void 0;
const circuit_breaker_js_1 = require("./circuit-breaker.js");
const client_js_1 = require("./client.js");
__exportStar(require("./types.js"), exports);
__exportStar(require("./circuit-breaker.js"), exports);
__exportStar(require("./client.js"), exports);
__exportStar(require("./interceptors/langchain.js"), exports);
__exportStar(require("./interceptors/providers.js"), exports);
class KsecShield {
    config;
    cache;
    client;
    telemetryQueue = [];
    syncTimer;
    telemetryTimer;
    listeners = new Map();
    constructor(config = {}) {
        this.config = {
            gatewayUrl: config.gatewayUrl || 'https://ksec.space',
            apiKey: config.apiKey || '',
            agentId: config.agentId || `agent-${Math.random().toString(36).substring(2, 9)}`,
            fallbackPolicy: config.fallbackPolicy || 'fail-open',
            syncIntervalMs: config.syncIntervalMs || 30000,
            telemetryBatchIntervalMs: config.telemetryBatchIntervalMs || 5000,
            debug: config.debug ?? false,
        };
        this.cache = new circuit_breaker_js_1.PolicyCache();
        this.client = new client_js_1.KsecClient(this.config);
        // Initial background policy fetch & recurring timers
        this.initTimers();
    }
    initTimers() {
        // Initial fetch in background
        this.syncPolicies().catch(() => { });
        // Policy sync interval
        if (this.config.syncIntervalMs > 0) {
            this.syncTimer = setInterval(() => {
                this.syncPolicies().catch(() => { });
            }, this.config.syncIntervalMs);
            if (this.syncTimer.unref)
                this.syncTimer.unref();
        }
        // Telemetry batch flush interval
        if (this.config.telemetryBatchIntervalMs > 0) {
            this.telemetryTimer = setInterval(() => {
                this.flushTelemetry().catch(() => { });
            }, this.config.telemetryBatchIntervalMs);
            if (this.telemetryTimer.unref)
                this.telemetryTimer.unref();
        }
    }
    async syncPolicies() {
        try {
            const policies = await this.client.fetchPolicies();
            this.cache.setRules(policies);
            this.cache.recordSuccess();
            this.emitCustomEvent('policy_synced', { count: policies.length });
        }
        catch (err) {
            this.cache.recordFailure();
            this.emitCustomEvent('error', { type: 'sync_failure', error: err });
        }
    }
    /**
     * Manually load policy rules into local cache
     */
    addPolicyRule(rule) {
        this.cache.setRule(rule);
    }
    /**
     * Guards a function execution with zero-latency local policy evaluation and background telemetry.
     */
    async guard(fn, options) {
        const startTime = Date.now();
        const evaluation = this.cache.evaluate(options.actionType, options.target);
        if (evaluation.decision === 'BLOCK') {
            const durationMs = Date.now() - startTime;
            this.recordTelemetry({
                id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                agentId: this.config.agentId,
                actionType: options.actionType,
                target: options.target,
                decision: 'BLOCK',
                durationMs,
                timestamp: new Date().toISOString(),
                metadata: options.metadata,
                reason: evaluation.rule?.reason || 'Blocked by active Agent-eBPF policy',
            });
            this.emitCustomEvent('threat_blocked', {
                actionType: options.actionType,
                target: options.target,
                rule: evaluation.rule,
            });
            throw new circuit_breaker_js_1.KsecSecurityViolationError(`Execution blocked by Agent-eBPF kernel shield: ${options.actionType} on '${options.target}'`, options.actionType, options.target, evaluation.rule?.id);
        }
        try {
            const result = await fn();
            const durationMs = Date.now() - startTime;
            this.recordTelemetry({
                id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                agentId: this.config.agentId,
                actionType: options.actionType,
                target: options.target,
                decision: 'ALLOW',
                durationMs,
                timestamp: new Date().toISOString(),
                metadata: options.metadata,
            });
            return result;
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            this.recordTelemetry({
                id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                agentId: this.config.agentId,
                actionType: options.actionType,
                target: options.target,
                decision: 'ALLOW',
                durationMs,
                timestamp: new Date().toISOString(),
                metadata: { ...options.metadata, error: String(error) },
            });
            throw error;
        }
    }
    /**
     * Wraps the global fetch or a custom HTTP client to inspect egress targets.
     */
    protectFetch(originalFetch = globalThis.fetch) {
        return async (input, init) => {
            let target = 'unknown';
            if (typeof input === 'string') {
                try {
                    target = new URL(input).hostname;
                }
                catch {
                    target = input;
                }
            }
            else if (input instanceof URL) {
                target = input.hostname;
            }
            else if (input && typeof input === 'object' && 'url' in input) {
                try {
                    target = new URL(input.url).hostname;
                }
                catch {
                    target = input.url;
                }
            }
            return this.guard(() => originalFetch(input, init), {
                actionType: 'network_egress',
                target,
                metadata: { method: init?.method || 'GET' },
            });
        };
    }
    recordTelemetry(event) {
        this.telemetryQueue.push(event);
        if (this.telemetryQueue.length >= 50) {
            this.flushTelemetry().catch(() => { });
        }
    }
    async flushTelemetry() {
        if (this.telemetryQueue.length === 0)
            return;
        const batch = this.telemetryQueue.splice(0, this.telemetryQueue.length);
        try {
            await this.client.sendTelemetryBatch(batch);
            this.emitCustomEvent('telemetry_flushed', { count: batch.length });
        }
        catch (err) {
            // Re-queue on failure if within limit
            if (this.telemetryQueue.length < 500) {
                this.telemetryQueue.unshift(...batch);
            }
        }
    }
    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(listener);
        return () => {
            this.listeners.get(event)?.delete(listener);
        };
    }
    emitCustomEvent(event, payload) {
        const handlers = this.listeners.get(event);
        if (handlers) {
            for (const handler of handlers) {
                try {
                    handler(payload);
                }
                catch (err) {
                    if (this.config.debug) {
                        console.error(`[KsecShield] Event listener error:`, err);
                    }
                }
            }
        }
    }
    destroy() {
        if (this.syncTimer)
            clearInterval(this.syncTimer);
        if (this.telemetryTimer)
            clearInterval(this.telemetryTimer);
        this.flushTelemetry().catch(() => { });
    }
}
exports.KsecShield = KsecShield;
//# sourceMappingURL=index.js.map
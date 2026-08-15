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
const in_memory_matcher_js_1 = require("./engine/in-memory-matcher.js");
const uds_client_js_1 = require("./transport/uds-client.js");
const vercel_ai_js_1 = require("./interceptors/vercel-ai.js");
const otel_js_1 = require("./telemetry/otel.js");
__exportStar(require("./types.js"), exports);
__exportStar(require("./circuit-breaker.js"), exports);
__exportStar(require("./client.js"), exports);
__exportStar(require("./engine/in-memory-matcher.js"), exports);
__exportStar(require("./transport/uds-client.js"), exports);
__exportStar(require("./presets/index.js"), exports);
__exportStar(require("./telemetry/index.js"), exports);
__exportStar(require("./interceptors/langchain.js"), exports);
__exportStar(require("./interceptors/providers.js"), exports);
__exportStar(require("./interceptors/vercel-ai.js"), exports);
class KsecShield {
    config;
    cache;
    client;
    fastPath;
    udsClient;
    vercelAI;
    otel;
    telemetryQueue = [];
    syncTimer;
    telemetryTimer;
    listeners = new Map();
    constructor(config = {}) {
        const fallbackPolicy = config.fallbackPolicy || 'fail-open';
        this.config = {
            gatewayUrl: config.gatewayUrl || 'https://ksec.space',
            apiKey: config.apiKey || '',
            agentId: config.agentId || `agent-${Math.random().toString(36).substring(2, 9)}`,
            fallbackPolicy,
            syncIntervalMs: config.syncIntervalMs ?? 30000,
            telemetryBatchIntervalMs: config.telemetryBatchIntervalMs ?? 5000,
            udsSocketPath: config.udsSocketPath || (process.platform === 'win32' ? '\\\\.\\pipe\\agent-ebpf' : '/var/run/agent-ebpf.sock'),
            udsTimeoutMs: config.udsTimeoutMs ?? 50,
            enableKernelUds: config.enableKernelUds ?? false,
            enableOTel: config.enableOTel ?? true,
            debug: config.debug ?? false,
        };
        this.cache = new circuit_breaker_js_1.PolicyCache();
        this.client = new client_js_1.KsecClient(this.config);
        this.fastPath = new in_memory_matcher_js_1.FastPathEngine();
        this.udsClient = new uds_client_js_1.UdsTransportClient({
            socketPath: this.config.udsSocketPath,
            timeoutMs: this.config.udsTimeoutMs,
            failMode: this.config.fallbackPolicy,
        });
        this.otel = new otel_js_1.ShieldOTelExporter({ enabled: this.config.enableOTel });
        this.udsClient.on('transport_error', (err) => {
            this.emitCustomEvent('transport_error', { error: err });
        });
        this.vercelAI = new vercel_ai_js_1.VercelAIInterceptor(this);
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
     * Applies a predefined security preset (e.g. ShieldPresets.StrictReadOnly)
     */
    applyPreset(rules) {
        for (const rule of rules) {
            this.fastPath.addRule(rule);
        }
    }
    /**
     * Manually load policy rules into local cache
     */
    addPolicyRule(rule) {
        this.cache.setRule(rule);
    }
    /**
     * Manually add a fast-path pattern rule
     */
    addFastRule(rule) {
        this.fastPath.addRule(rule);
    }
    /**
     * Guards a function execution with hybrid multi-layered policy evaluation,
     * OpenTelemetry semantic tracing and background telemetry.
     *
     * Hierarchy:
     * 1. In-Memory Fast-Path (<0.02ms)
     * 2. Policy Cache Evaluation (synced remote rules)
     * 3. Local Kernel UDS Daemon (<0.1ms) (if enabled)
     */
    async guard(fn, options) {
        const startTime = Date.now();
        const span = this.otel.startGuardSpan(options.actionType, options.target);
        // 1. In-Memory Fast-Path Check (< 0.02ms)
        const fastEval = this.fastPath.evaluate(options.actionType, options.target);
        if (!fastEval.allowed) {
            const durationMs = Date.now() - startTime;
            const reason = fastEval.reason || 'Blocked by Agent-eBPF fast-path rule';
            const threatId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const threatEvent = {
                id: threatId,
                actionType: options.actionType,
                target: options.target,
                reason,
                timestamp: new Date().toISOString(),
                metadata: options.metadata,
                ruleId: fastEval.rule?.id,
            };
            this.recordTelemetry({
                id: threatId,
                agentId: this.config.agentId,
                actionType: options.actionType,
                target: options.target,
                decision: 'BLOCK',
                durationMs,
                timestamp: threatEvent.timestamp,
                metadata: options.metadata,
                reason,
            });
            this.otel.recordThreatBlocked(threatEvent, span);
            this.emitCustomEvent('threat_blocked', {
                ...threatEvent,
                rule: fastEval.rule,
            });
            throw new circuit_breaker_js_1.KsecSecurityViolationError(`Execution blocked by Agent-eBPF fast-path: ${options.actionType} on '${options.target}' (${reason})`, options.actionType, options.target, fastEval.rule?.id);
        }
        // 2. Policy Cache Evaluation
        const evaluation = this.cache.evaluate(options.actionType, options.target);
        if (evaluation.decision === 'BLOCK') {
            const durationMs = Date.now() - startTime;
            const reason = evaluation.rule?.reason || 'Blocked by active Agent-eBPF policy';
            const threatId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const threatEvent = {
                id: threatId,
                actionType: options.actionType,
                target: options.target,
                reason,
                timestamp: new Date().toISOString(),
                metadata: options.metadata,
                ruleId: evaluation.rule?.id,
            };
            this.recordTelemetry({
                id: threatId,
                agentId: this.config.agentId,
                actionType: options.actionType,
                target: options.target,
                decision: 'BLOCK',
                durationMs,
                timestamp: threatEvent.timestamp,
                metadata: options.metadata,
                reason,
            });
            this.otel.recordThreatBlocked(threatEvent, span);
            this.emitCustomEvent('threat_blocked', {
                ...threatEvent,
                rule: evaluation.rule,
            });
            throw new circuit_breaker_js_1.KsecSecurityViolationError(`Execution blocked by Agent-eBPF kernel shield: ${options.actionType} on '${options.target}'`, options.actionType, options.target, evaluation.rule?.id);
        }
        // 3. Local Kernel UDS Daemon Verification (if enabled)
        if (this.config.enableKernelUds) {
            const udsRes = await this.udsClient.evaluate({
                actionType: options.actionType,
                target: options.target,
                metadata: options.metadata,
            });
            if (!udsRes.allowed) {
                const durationMs = Date.now() - startTime;
                const reason = udsRes.reason || 'Blocked by Agent-eBPF kernel daemon via UDS';
                const threatId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                const threatEvent = {
                    id: threatId,
                    actionType: options.actionType,
                    target: options.target,
                    reason,
                    timestamp: new Date().toISOString(),
                    metadata: options.metadata,
                    kernelTraceId: udsRes.kernelTraceId,
                    ruleId: udsRes.ruleId,
                };
                this.recordTelemetry({
                    id: threatId,
                    agentId: this.config.agentId,
                    actionType: options.actionType,
                    target: options.target,
                    decision: 'BLOCK',
                    durationMs,
                    timestamp: threatEvent.timestamp,
                    metadata: options.metadata,
                    reason,
                    kernelTraceId: udsRes.kernelTraceId,
                });
                this.otel.recordThreatBlocked(threatEvent, span);
                this.emitCustomEvent('threat_blocked', {
                    ...threatEvent,
                });
                throw new circuit_breaker_js_1.KsecSecurityViolationError(`Execution blocked by Agent-eBPF kernel daemon: ${options.actionType} on '${options.target}' (${reason})`, options.actionType, options.target, udsRes.ruleId);
            }
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
            this.otel.recordAllowed(span, this.config.enableKernelUds ? 'uds' : 'fast-path');
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
            this.otel.recordAllowed(span, 'fast-path');
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
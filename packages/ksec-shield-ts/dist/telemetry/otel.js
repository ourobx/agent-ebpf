export class ShieldOTelExporter {
    tracer = null;
    isAvailable = false;
    enabled;
    SpanStatusCode = { UNSET: 0, OK: 1, ERROR: 2 };
    constructor(config = {}) {
        this.enabled = config.enabled ?? true;
        if (this.enabled) {
            this.initTracer(config);
        }
    }
    initTracer(config) {
        try {
            let otel = null;
            if (typeof require !== 'undefined') {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                otel = require('@opentelemetry/api');
            }
            if (otel && otel.trace) {
                this.tracer = otel.trace.getTracer(config.tracerName || '@ourobx/shield', config.tracerVersion || '1.1.0');
                if (otel.SpanStatusCode) {
                    this.SpanStatusCode = otel.SpanStatusCode;
                }
                this.isAvailable = true;
            }
        }
        catch {
            this.isAvailable = false;
            this.tracer = null;
        }
    }
    startGuardSpan(actionType, target) {
        if (!this.isAvailable || !this.tracer || !this.enabled)
            return null;
        try {
            return this.tracer.startSpan(`shield.guard.${actionType}`, {
                attributes: {
                    'gen_ai.system': 'agent-ebpf',
                    'agent.security.action_type': actionType,
                    'agent.security.target': target,
                    'agent.security.policy_engine': 'ksec-shield',
                },
            });
        }
        catch {
            return null;
        }
    }
    recordThreatBlocked(event, activeSpan) {
        if (!this.isAvailable || !this.enabled || !activeSpan)
            return;
        try {
            activeSpan.setAttributes({
                'agent.security.decision': 'BLOCK',
                'agent.security.reason': event.reason,
                'agent.security.threat_id': event.id,
            });
            if (event.kernelTraceId) {
                activeSpan.setAttribute('agent.security.kernel_trace_id', event.kernelTraceId);
            }
            activeSpan.addEvent('threat_blocked', {
                'threat.id': event.id,
                'threat.reason': event.reason,
                'threat.action_type': event.actionType,
                'threat.target': event.target,
                'threat.timestamp': event.timestamp,
            });
            activeSpan.setStatus({
                code: this.SpanStatusCode.ERROR,
                message: event.reason,
            });
            activeSpan.end();
        }
        catch {
            // Graceful error silence
        }
    }
    recordAllowed(activeSpan, source = 'fast-path') {
        if (!this.isAvailable || !this.enabled || !activeSpan)
            return;
        try {
            activeSpan.setAttributes({
                'agent.security.decision': 'ALLOW',
                'agent.security.decision_source': source,
            });
            activeSpan.setStatus({ code: this.SpanStatusCode.OK });
            activeSpan.end();
        }
        catch {
            // Graceful error silence
        }
    }
    isOTelActive() {
        return this.isAvailable && this.enabled;
    }
}
//# sourceMappingURL=otel.js.map
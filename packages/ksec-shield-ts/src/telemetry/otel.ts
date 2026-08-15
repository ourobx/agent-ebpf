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
  setStatus(status: { code: number; message?: string }): this;
  end(): void;
}

export interface MinimalTracer {
  startSpan(name: string, options?: { attributes?: Record<string, unknown> }): MinimalSpan;
}

export class ShieldOTelExporter {
  private tracer: MinimalTracer | null = null;
  private isAvailable = false;
  private enabled: boolean;
  private SpanStatusCode: { UNSET: number; OK: number; ERROR: number } = { UNSET: 0, OK: 1, ERROR: 2 };

  constructor(config: ShieldOTelConfig = {}) {
    this.enabled = config.enabled ?? true;
    if (this.enabled) {
      this.initTracer(config);
    }
  }

  private initTracer(config: ShieldOTelConfig): void {
    try {
      let otel: any = null;
      if (typeof require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        otel = require('@opentelemetry/api');
      }
      if (otel && otel.trace) {
        this.tracer = otel.trace.getTracer(
          config.tracerName || '@ourobx/shield',
          config.tracerVersion || '1.1.0'
        );
        if (otel.SpanStatusCode) {
          this.SpanStatusCode = otel.SpanStatusCode;
        }
        this.isAvailable = true;
      }
    } catch {
      this.isAvailable = false;
      this.tracer = null;
    }
  }

  public startGuardSpan(actionType: string, target: string): MinimalSpan | null {
    if (!this.isAvailable || !this.tracer || !this.enabled) return null;

    try {
      return this.tracer.startSpan(`shield.guard.${actionType}`, {
        attributes: {
          'gen_ai.system': 'agent-ebpf',
          'agent.security.action_type': actionType,
          'agent.security.target': target,
          'agent.security.policy_engine': 'ksec-shield',
        },
      });
    } catch {
      return null;
    }
  }

  public recordThreatBlocked(event: ThreatBlockedEvent, activeSpan?: MinimalSpan | null): void {
    if (!this.isAvailable || !this.enabled || !activeSpan) return;

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
    } catch {
      // Graceful error silence
    }
  }

  public recordAllowed(
    activeSpan?: MinimalSpan | null,
    source: 'fast-path' | 'uds' | 'gateway' = 'fast-path'
  ): void {
    if (!this.isAvailable || !this.enabled || !activeSpan) return;

    try {
      activeSpan.setAttributes({
        'agent.security.decision': 'ALLOW',
        'agent.security.decision_source': source,
      });

      activeSpan.setStatus({ code: this.SpanStatusCode.OK });
      activeSpan.end();
    } catch {
      // Graceful error silence
    }
  }

  public isOTelActive(): boolean {
    return this.isAvailable && this.enabled;
  }
}

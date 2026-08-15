import { test } from 'node:test';
import assert from 'node:assert';
import { ShieldOTelExporter } from '../src/telemetry/otel.js';
import type { ThreatBlockedEvent } from '../src/types.js';

test('ShieldOTelExporter handles graceful degradation when OTel is missing or disabled', () => {
  const exporter = new ShieldOTelExporter({ enabled: false });
  const span = exporter.startGuardSpan('tool_execution', 'bash_exec');
  assert.strictEqual(span, null);

  const mockEvent: ThreatBlockedEvent = {
    id: 'test-threat-123',
    actionType: 'tool_execution',
    target: 'rm_rf',
    reason: 'Filesystem mutation blocked',
    timestamp: new Date().toISOString(),
  };

  assert.doesNotThrow(() => exporter.recordThreatBlocked(mockEvent, null));
  assert.doesNotThrow(() => exporter.recordAllowed(null, 'fast-path'));
  assert.strictEqual(exporter.isOTelActive(), false);
});

test('ShieldOTelExporter works when enabled without crashing even if @opentelemetry/api is optional', () => {
  const exporter = new ShieldOTelExporter({ enabled: true });
  // If @opentelemetry/api is not in devDependencies, isOTelActive will be false and spans safely return null
  const span = exporter.startGuardSpan('tool_execution', 'bash_exec');
  
  const mockEvent: ThreatBlockedEvent = {
    id: 'test-threat-456',
    actionType: 'tool_execution',
    target: 'curl',
    reason: 'Raw socket tool blocked',
    timestamp: new Date().toISOString(),
    kernelTraceId: 'ebpf-lsm-trace-1234',
  };

  assert.doesNotThrow(() => exporter.recordThreatBlocked(mockEvent, span));
  assert.doesNotThrow(() => exporter.recordAllowed(span, 'uds'));
});

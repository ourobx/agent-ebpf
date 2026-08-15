import { KsecShield } from '../src/index.js';
import { ShieldPresets } from '../src/presets/index.js';
import { KsecSecurityViolationError } from '../src/circuit-breaker.js';
import assert from 'node:assert';
import test from 'node:test';

test('ShieldPresets.StrictReadOnly blocks shell executions and file mutations', async () => {
  const shield = new KsecShield({
    syncIntervalMs: 0,
    telemetryBatchIntervalMs: 0,
  });

  shield.applyPreset(ShieldPresets.StrictReadOnly);

  // Blocked tools
  await assert.rejects(
    async () => {
      await shield.guard(async () => 'ok', {
        actionType: 'tool_execution',
        target: 'bash_exec',
      });
    },
    KsecSecurityViolationError
  );

  await assert.rejects(
    async () => {
      await shield.guard(async () => 'ok', {
        actionType: 'tool_execution',
        target: 'rm_rf',
      });
    },
    KsecSecurityViolationError
  );

  // Allowed tools
  const res = await shield.guard(async () => 'read_success', {
    actionType: 'tool_execution',
    target: 'read_file',
  });
  assert.strictEqual(res, 'read_success');

  shield.destroy();
});

test('ShieldPresets.NoOutboundNetwork blocks all network egress', async () => {
  const shield = new KsecShield({
    syncIntervalMs: 0,
    telemetryBatchIntervalMs: 0,
  });

  shield.applyPreset(ShieldPresets.NoOutboundNetwork);

  await assert.rejects(
    async () => {
      await shield.guard(async () => 'ok', {
        actionType: 'network_egress',
        target: 'api.openai.com',
      });
    },
    KsecSecurityViolationError
  );

  shield.destroy();
});

test('ShieldPresets.SafeWebBrowsing blocks SSRF and raw socket CLI utilities', async () => {
  const shield = new KsecShield({
    syncIntervalMs: 0,
    telemetryBatchIntervalMs: 0,
  });

  shield.applyPreset(ShieldPresets.SafeWebBrowsing);

  // Localhost SSRF
  await assert.rejects(
    async () => {
      await shield.guard(async () => 'ok', {
        actionType: 'network_egress',
        target: 'http://127.0.0.1:8080/admin',
      });
    },
    KsecSecurityViolationError
  );

  // Private Subnet SSRF
  await assert.rejects(
    async () => {
      await shield.guard(async () => 'ok', {
        actionType: 'network_egress',
        target: 'http://192.168.1.1/router-login',
      });
    },
    KsecSecurityViolationError
  );

  // Blocked utilities
  await assert.rejects(
    async () => {
      await shield.guard(async () => 'ok', {
        actionType: 'tool_execution',
        target: 'curl',
      });
    },
    KsecSecurityViolationError
  );

  shield.destroy();
});

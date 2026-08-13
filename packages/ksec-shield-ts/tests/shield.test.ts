import { KsecShield } from '../src/index.js';
import { KsecSecurityViolationError } from '../src/circuit-breaker.js';
import assert from 'node:assert';
import test from 'node:test';

test('KsecShield allows execution when no block rule is matched', async () => {
  const shield = new KsecShield({
    gatewayUrl: 'http://localhost:8000',
    syncIntervalMs: 0,
    telemetryBatchIntervalMs: 0,
  });

  const result = await shield.guard(async () => {
    return 'success_payload';
  }, {
    actionType: 'tool_execution',
    target: 'calculator_tool',
  });

  assert.strictEqual(result, 'success_payload');
  shield.destroy();
});

test('KsecShield blocks execution when policy rule specifies BLOCK', async () => {
  const shield = new KsecShield({
    gatewayUrl: 'http://localhost:8000',
    syncIntervalMs: 0,
    telemetryBatchIntervalMs: 0,
  });

  shield.addPolicyRule({
    id: 'block-malicious-ip',
    actionType: 'network_egress',
    target: '198.51.100.1',
    decision: 'BLOCK',
    reason: 'Known malicious C2 IP',
  });

  let blockedEventFired = false;
  shield.on('threat_blocked', (evt) => {
    blockedEventFired = true;
  });

  await assert.rejects(
    async () => {
      await shield.guard(async () => {
        return 'should_not_reach_here';
      }, {
        actionType: 'network_egress',
        target: '198.51.100.1',
      });
    },
    KsecSecurityViolationError
  );

  assert.strictEqual(blockedEventFired, true);
  shield.destroy();
});

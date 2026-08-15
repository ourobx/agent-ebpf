import { FastPathEngine } from '../src/engine/in-memory-matcher.js';
import assert from 'node:assert';
import test from 'node:test';

test('FastPathEngine evaluates allow by default on empty rules', () => {
  const engine = new FastPathEngine();
  const res = engine.evaluate('tool_execution', 'calculate');
  assert.strictEqual(res.allowed, true);
  assert.strictEqual(res.decision, 'ALLOW');
});

test('FastPathEngine blocks malicious target matching string pattern', () => {
  const engine = new FastPathEngine([
    {
      actionType: 'tool_execution',
      pattern: 'bash_exec',
      decision: 'BLOCK',
      reason: 'Direct bash execution forbidden',
    },
  ]);

  const blockedRes = engine.evaluate('tool_execution', 'bash_exec');
  assert.strictEqual(blockedRes.allowed, false);
  assert.strictEqual(blockedRes.decision, 'BLOCK');
  assert.match(blockedRes.reason || '', /Direct bash execution forbidden/);

  const allowedRes = engine.evaluate('tool_execution', 'safe_search');
  assert.strictEqual(allowedRes.allowed, true);
  assert.strictEqual(allowedRes.decision, 'ALLOW');
});

test('FastPathEngine blocks regex patterns (e.g. egress IPs)', () => {
  const engine = new FastPathEngine();
  engine.addRule({
    actionType: 'network_egress',
    pattern: /^192\.168\./,
    decision: 'BLOCK',
    reason: 'Private subnet egress blocked',
  });

  const blocked = engine.evaluate('network_egress', '192.168.1.50');
  assert.strictEqual(blocked.allowed, false);
  assert.strictEqual(blocked.decision, 'BLOCK');

  const allowed = engine.evaluate('network_egress', '8.8.8.8');
  assert.strictEqual(allowed.allowed, true);
});

test('FastPathEngine evaluates performance in < 0.05ms', () => {
  const engine = new FastPathEngine([
    { actionType: 'tool_execution', pattern: 'rm_rf', decision: 'BLOCK' },
    { actionType: 'network_egress', pattern: 'c2.evil.com', decision: 'BLOCK' },
    { actionType: 'file_system', pattern: '/etc/shadow', decision: 'BLOCK' },
  ]);

  const start = performance.now();
  const iterations = 10000;
  for (let i = 0; i < iterations; i++) {
    engine.evaluate('network_egress', 'api.openai.com');
  }
  const totalMs = performance.now() - start;
  const avgMs = totalMs / iterations;

  // Average evaluation latency should be well under 0.01ms (10 microseconds)
  assert.ok(avgMs < 0.05, `Average latency (${avgMs.toFixed(5)}ms) exceeded 0.05ms`);
});

import { KsecShield } from '../src/index.js';
import { VercelAIInterceptor } from '../src/interceptors/vercel-ai.js';
import { KsecSecurityViolationError } from '../src/circuit-breaker.js';
import assert from 'node:assert';
import test from 'node:test';

test('VercelAIInterceptor allows safe tool execution', async () => {
  const shield = new KsecShield({
    syncIntervalMs: 0,
    telemetryBatchIntervalMs: 0,
  });

  const interceptor = new VercelAIInterceptor(shield);

  const tools = {
    calculateSum: {
      description: 'Calculates the sum of two numbers',
      parameters: {},
      execute: async (args: { a: number; b: number }) => {
        return args.a + args.b;
      },
    },
  };

  const protectedTools = interceptor.wrapTools(tools);
  const result = await protectedTools.calculateSum.execute({ a: 10, b: 20 });

  assert.strictEqual(result, 30);
  shield.destroy();
});

test('VercelAIInterceptor blocks blacklisted tool execution via Fast-Path', async () => {
  const shield = new KsecShield({
    syncIntervalMs: 0,
    telemetryBatchIntervalMs: 0,
  });

  shield.addFastRule({
    actionType: 'tool_execution',
    pattern: 'bash_command',
    decision: 'BLOCK',
    reason: 'Kernel policy disallows bash command execution',
  });

  const interceptor = new VercelAIInterceptor(shield);

  let executed = false;
  const tools = {
    bash_command: {
      description: 'Executes arbitrary shell command',
      parameters: {},
      execute: async () => {
        executed = true;
        return 'executed';
      },
    },
  };

  const protectedTools = interceptor.protectTools(tools);

  let blockedEventCaught = false;
  shield.on('threat_blocked', (evt) => {
    blockedEventCaught = true;
  });

  await assert.rejects(
    async () => {
      await protectedTools.bash_command.execute({});
    },
    (err: Error) => {
      return err instanceof KsecSecurityViolationError && err.message.includes('bash_command');
    }
  );

  assert.strictEqual(executed, false, 'Blocked tool execution should never reach original function');
  assert.strictEqual(blockedEventCaught, true);

  shield.destroy();
});

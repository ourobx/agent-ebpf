import { DeterminismEngine } from '../src/core.js';
import { createAgentGuard } from '../src/middleware.js';
import {
  VetoException,
  SecurityViolationError,
  TenantIsolationError,
  SchemaValidationError,
} from '../src/errors.js';
import assert from 'node:assert';
import test from 'node:test';

test('DeterminismEngine.inspectSql blocks destructive DDL commands', () => {
  assert.throws(() => {
    DeterminismEngine.inspectSql('DROP TABLE users;');
  }, SecurityViolationError);

  assert.throws(() => {
    DeterminismEngine.inspectSql('TRUNCATE TABLE audit_logs;');
  }, SecurityViolationError);
});

test('DeterminismEngine.inspectSql blocks UPDATE/DELETE without WHERE clause', () => {
  assert.throws(() => {
    DeterminismEngine.inspectSql('DELETE FROM customers;');
  }, SecurityViolationError);

  assert.throws(() => {
    DeterminismEngine.inspectSql('UPDATE accounts SET balance = 0;');
  }, SecurityViolationError);

  assert.doesNotThrow(() => {
    DeterminismEngine.inspectSql('DELETE FROM customers WHERE id = 10;');
  });
});

test('DeterminismEngine.inspectSql enforces Multi-Tenant RLS tenant_id check', () => {
  assert.throws(() => {
    DeterminismEngine.inspectSql('SELECT * FROM orders WHERE id = 5;', 'tenant-alpha');
  }, TenantIsolationError);

  assert.doesNotThrow(() => {
    DeterminismEngine.inspectSql("SELECT * FROM orders WHERE tenant_id = 'tenant-alpha' AND id = 5;", 'tenant-alpha');
  });
});

test('DeterminismEngine.inspectCode blocks dangerous execution patterns', () => {
  assert.throws(() => {
    DeterminismEngine.inspectCode('eval("console.log(1)");');
  }, SecurityViolationError);

  assert.throws(() => {
    DeterminismEngine.inspectCode('require("child_process").exec("whoami");');
  }, SecurityViolationError);

  assert.doesNotThrow(() => {
    DeterminismEngine.inspectCode('const sum = (a, b) => a + b;');
  });
});

test('createAgentGuard middleware intercepts violations with context', async () => {
  let violationCaptured = false;
  const guard = createAgentGuard({
    tenantHeaderKey: 'x-tenant-id',
    onViolation: (err, ctx) => {
      violationCaptured = true;
      assert.strictEqual(ctx.tenantId, 'tenant-beta');
    },
  });

  await assert.rejects(async () => {
    await guard(
      { generatedSql: 'DROP TABLE telemetry;' },
      { 'x-tenant-id': 'tenant-beta' }
    );
  }, VetoException);

  assert.strictEqual(violationCaptured, true);
});

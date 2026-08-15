import { UdsTransportClient } from '../src/transport/uds-client.js';
import net from 'node:net';
import assert from 'node:assert';
import test from 'node:test';

test('UdsTransportClient returns fail-open response when socket is unavailable', async () => {
  const client = new UdsTransportClient({
    socketPath: process.platform === 'win32' ? '\\\\.\\pipe\\non-existent-pipe' : '/tmp/non-existent.sock',
    timeoutMs: 30,
    failMode: 'fail-open',
  });

  const res = await client.evaluate({
    actionType: 'tool_execution',
    target: 'some_tool',
  });

  assert.strictEqual(res.allowed, true);
  assert.strictEqual(res.decision, 'ALLOW');
  assert.match(res.reason || '', /Handled with fail-open/);
});

test('UdsTransportClient returns fail-closed response when socket is unavailable', async () => {
  const client = new UdsTransportClient({
    socketPath: process.platform === 'win32' ? '\\\\.\\pipe\\non-existent-pipe' : '/tmp/non-existent.sock',
    timeoutMs: 30,
    failMode: 'fail-closed',
  });

  const res = await client.evaluate({
    actionType: 'tool_execution',
    target: 'bash_exec',
  });

  assert.strictEqual(res.allowed, false);
  assert.strictEqual(res.decision, 'BLOCK');
  assert.match(res.reason || '', /Handled with fail-closed/);
});

test('UdsTransportClient communicates with active local daemon/server', async () => {
  const pipePath = process.platform === 'win32'
    ? '\\\\.\\pipe\\test-ebpf-' + Math.random().toString(36).substring(2, 8)
    : '/tmp/test-ebpf-' + Math.random().toString(36).substring(2, 8) + '.sock';

  const server = net.createServer((socket) => {
    let buf = '';
    socket.on('data', (chunk) => {
      buf += chunk.toString();
      if (buf.includes('\n')) {
        const payload = JSON.parse(buf.trim());
        if (payload.target === 'forbidden_syscall') {
          socket.write(JSON.stringify({
            allowed: false,
            decision: 'BLOCK',
            reason: 'Kernel LSM blocked syscall',
            kernelTraceId: 'ebpf-trace-999'
          }) + '\n');
        } else {
          socket.write(JSON.stringify({
            allowed: true,
            decision: 'ALLOW',
            kernelTraceId: 'ebpf-trace-100'
          }) + '\n');
        }
      }
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(pipePath, () => resolve());
  });

  const client = new UdsTransportClient({
    socketPath: pipePath,
    timeoutMs: 100,
    failMode: 'fail-closed',
  });

  const allowedRes = await client.evaluate({
    actionType: 'syscall',
    target: 'read',
  });
  assert.strictEqual(allowedRes.allowed, true);
  assert.strictEqual(allowedRes.kernelTraceId, 'ebpf-trace-100');

  const blockedRes = await client.evaluate({
    actionType: 'syscall',
    target: 'forbidden_syscall',
  });
  assert.strictEqual(blockedRes.allowed, false);
  assert.strictEqual(blockedRes.kernelTraceId, 'ebpf-trace-999');

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

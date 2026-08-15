#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { KsecShield } from '../dist/index.js';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Kullanım: ksec-shield <komut> [argümanlar...]');
  console.error('Örnek:   ksec-shield claude-code --dangerously-skip-permissions');
  process.exit(1);
}

const [command, ...cmdArgs] = args;
const shield = new KsecShield({
  udsSocketPath: process.env.KSEC_SOCKET_PATH || (process.platform === 'win32' ? '\\\\.\\pipe\\agent-ebpf' : '/var/run/ksec/agent-ebpf.sock'),
  fallbackPolicy: (process.env.KSEC_FAIL_MODE === 'fail-closed' ? 'fail-closed' : 'fail-open'),
  enableKernelUds: true,
});

shield.guard(
  async () => {
    return new Promise((resolve, reject) => {
      const child = spawn(command, cmdArgs, { stdio: 'inherit', shell: true });
      child.on('exit', (code) => {
        shield.destroy();
        process.exit(code ?? 0);
      });
      child.on('error', (err) => {
        shield.destroy();
        reject(err);
      });
    });
  },
  {
    actionType: 'system_call',
    target: `${command} ${cmdArgs.join(' ')}`.trim(),
  }
).catch((err) => {
  console.error(`🚨 [Shield Blocked]: ${err.message}`);
  shield.destroy();
  process.exit(1);
});

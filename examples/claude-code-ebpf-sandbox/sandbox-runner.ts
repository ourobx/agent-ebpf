import { KsecShield } from '@ourobx/shield';
import { ShieldPresets } from '@ourobx/shield/presets';
import { spawn } from 'node:child_process';

// 1. Initialize Kernel Shield
const shield = new KsecShield({
  syncIntervalMs: 0,
  telemetryBatchIntervalMs: 0,
  fallbackPolicy: 'fail-closed',
});

// 2. Apply combined presets: StrictReadOnly + SafeWebBrowsing
shield.applyPreset(ShieldPresets.StrictReadOnly);
shield.applyPreset(ShieldPresets.SafeWebBrowsing);

shield.on('threat_blocked', (evt) => {
  console.error(`🚨 [Kernel Sandbox Block]: ${evt.actionType} on '${evt.target}' -> ${evt.reason}`);
});

// 3. Command execution runner protected by Shield
async function runSandboxedCommand(cmd: string, args: string[] = []): Promise<void> {
  const fullCommand = `${cmd} ${args.join(' ')}`.trim();
  console.log(`\n▶️ Executing: "${fullCommand}"`);

  try {
    await shield.guard(
      () => {
        return new Promise<void>((resolve, reject) => {
          const child = spawn(cmd, args, { stdio: 'inherit', shell: false });
          child.on('exit', (code) => {
            if (code === 0) {
              console.log(`✅ Completed with exit code 0`);
              resolve();
            } else {
              reject(new Error(`Process exited with code ${code}`));
            }
          });
          child.on('error', (err) => reject(err));
        });
      },
      {
        actionType: 'tool_execution',
        target: cmd,
        metadata: { command: fullCommand },
      }
    );
  } catch (err: any) {
    console.error(`❌ [Blocked by Sandbox]: ${err.message}`);
  }
}

async function main() {
  console.log('=== 🛡️ Agent-eBPF CLI Sandbox (Claude Code / Autonomous Agent) ===\n');

  // Scenario 1: Safe read command
  await runSandboxedCommand('node', ['-e', 'console.log("Hello from inside isolated sandbox!")']);

  // Scenario 2: Dangerous command that mutates or deletes
  await runSandboxedCommand('rm_rf', ['/tmp/critical_database']);

  // Scenario 3: Unauthorized network/raw socket tool
  await runSandboxedCommand('curl', ['http://169.254.169.254/latest/meta-data/']);

  shield.destroy();
}

main();

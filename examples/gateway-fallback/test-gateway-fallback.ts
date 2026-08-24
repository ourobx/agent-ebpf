// test-gateway-fallback.ts
import { KsecShield } from '@ourobx/shield';

async function main() {
  const shield = new KsecShield({
    gatewayUrl: 'http://localhost:8000',
    // Force fallback by providing a non‑existent UDS socket
    udsSocketPath: '/tmp/non-existent.sock',
    // Ensure we fail‑closed on errors
    fallbackPolicy: 'fail-closed',
  });

  console.log('--- Gateway Remote Fallback Test ---');

  try {
    await shield.guard(
      async () => {
        console.log('This should never run');
      },
      {
        actionType: 'tool_execution',
        target: 'bash_exec',
        metadata: { command: 'rm -rf /' },
      }
    );
  } catch (err: any) {
    console.log('✅ Gateway blocked the action:', err.message);
  }
}

main();

/**
 * ⚡ Live Demo: AI Agent with @ourobx/shield eBPF Zero-Trust Protection
 * Run with: node demo_agent.mjs
 */

import { KsecShield, UniversalProviderAdapter } from '@ourobx/shield';

console.log('\n🛡️  [Agent-eBPF] Initializing Kernel Shield for AI Agent...');

const shield = new KsecShield({
  gatewayUrl: 'https://ksec.space',
  agentId: 'demo-copilot-01',
  debug: true,
});

// 1. Manually add a zero-trust block rule for demonstration
shield.addPolicyRule({
  id: 'rule-block-c2',
  actionType: 'network_egress',
  target: 'malicious-c2-server.com',
  decision: 'BLOCK',
  reason: 'Kernel XDP Drop: Detected known Command & Control exfiltration host',
});

// 2. Listen to real-time kernel threat events
shield.on('threat_blocked', (evt) => {
  console.log('\n🚨 [ALERT: Kernel Intercepted Malicious Action!]:');
  console.log('   Target :', evt.target);
  console.log('   Reason :', evt.rule?.reason || 'Zero-Trust Block');
  console.log('   Action : Packet dropped at eBPF layer with 0ms penalty!\n');
});

async function main() {
  console.log('\n✅ 1. Executing Safe Agent Tool: Web Search (api.duckduckgo.com)...');
  const safeResult = await shield.guard(
    async () => {
      return { status: 200, data: 'Found 10 relevant security papers.' };
    },
    {
      actionType: 'network_egress',
      target: 'api.duckduckgo.com',
    }
  );
  console.log('   Result:', safeResult.data);

  console.log('\n⚠️  2. Simulating Prompt-Injection Attack trying to exfiltrate to malicious-c2-server.com...');
  try {
    await shield.guard(
      async () => {
        console.log('   [Danger] This code should NEVER execute!');
        return 'leaked_data';
      },
      {
        actionType: 'network_egress',
        target: 'malicious-c2-server.com',
      }
    );
  } catch (err) {
    console.log('🛡️  [Shield Protection Success]:', err.message);
  }

  console.log('\n🎉 Demo completed successfully! Agent-eBPF kept the agent safe.\n');
  shield.destroy();
}

main();

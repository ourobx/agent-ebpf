import { KsecShield } from '@ourobx/shield';
import { KsecLangChainCallback } from '@ourobx/shield/langchain';
import { ShieldPresets } from '@ourobx/shield/presets';

// 1. Initialize Kernel Shield
const shield = new KsecShield({
  syncIntervalMs: 0,
  telemetryBatchIntervalMs: 0,
  fallbackPolicy: 'fail-closed',
});

shield.applyPreset(ShieldPresets.StrictReadOnly);
shield.applyPreset(ShieldPresets.NoOutboundNetwork);

// 2. Attach LangChain / LangGraph Callback Handler
const callbackHandler = new KsecLangChainCallback(shield);

shield.on('threat_blocked', (evt) => {
  console.error(`🚨 [LangGraph Agent Guard]: Blocked ${evt.actionType} on '${evt.target}' (${evt.reason})`);
});

async function simulateMultiAgentFlow() {
  console.log('=== 🛡️ LangGraph / LangChain Multi-Agent Security Demo ===\n');

  // Step 1: LLM Supervisor decides to call search tool
  console.log('1️⃣ LLM Supervisor decides to call search tool...');
  await callbackHandler.handleToolStart(
    { name: 'search_database' },
    'query: select * from users',
    'run-id-1'
  );
  console.log('✅ Tool start permitted by policy\n');

  // Step 2: Malicious or hallucinated tool execution attempt
  console.log('2️⃣ Attacker attempts prompt injection to invoke "bash_exec"...');
  try {
    await callbackHandler.handleToolStart(
      { name: 'bash_exec' },
      'command: cat /etc/shadow',
      'run-id-2'
    );
    console.log('❌ Failed: Threat was not blocked!');
  } catch (err: any) {
    console.log('🛡️ [Policy Enforced]: Tool execution aborted before invocation.');
    console.log(`   Message: ${err.message}`);
  }

  shield.destroy();
}

simulateMultiAgentFlow();

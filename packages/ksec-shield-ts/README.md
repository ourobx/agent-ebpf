# @ourobx/shield

**Zero-Trust Kernel-Level Security SDK for AI Agents and LLMs**  
Powered by **Agent-eBPF** & [`ksec.space`](https://ksec.space).

[![npm version](https://img.shields.io/npm/v/@ourobx/shield.svg)](https://www.npmjs.com/package/@ourobx/shield)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)

---

## ⚡ Quick Start (1 Line Integration)

```bash
npm install @ourobx/shield
```

```typescript
import { KsecShield } from '@ourobx/shield';

// 1. Initialize Shield connected to ksec.space Gateway
const shield = new KsecShield({
  gatewayUrl: 'https://ksec.space',
  apiKey: process.env.KSEC_API_KEY,
});

// 2. Guard any AI agent tool execution or network request
const response = await shield.guard(
  async () => {
    return await myAgent.executeTool('bash_exec', { command: 'curl example.com' });
  },
  {
    actionType: 'tool_execution',
    target: 'bash_exec',
  }
);
```

---

## 🛡️ Global HTTP / Egress Protection

```typescript
// Auto-intercept fetch calls made by the agent
globalThis.fetch = shield.protectFetch(globalThis.fetch);
```

---

## 🦜 LangChain / LangGraph Integration

```typescript
import { KsecShield, KsecLangChainCallback } from '@ksec/shield';

const shield = new KsecShield({ gatewayUrl: 'https://ksec.space' });
const ksecCallback = new KsecLangChainCallback(shield);

const agent = createReactAgent({
  llm,
  tools,
  callbacks: [ksecCallback],
});
```

---

## 🔔 Real-Time Kernel Threat Event Hooks

```typescript
shield.on('threat_blocked', (event) => {
  console.error('🚨 [Agent-eBPF Threat Blocked]:', event);
});
```

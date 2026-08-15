# Quickstart Guide

Get up and running with `@ourobx/shield` in less than 2 minutes.

---

## 1. Installation

```bash
npm install @ourobx/shield
```

Optional: If using Vercel AI SDK or OpenTelemetry, install peer dependencies as needed:

```bash
npm install ai @opentelemetry/api
```

---

## 2. Vercel AI SDK Integration

Wrap your tool set with zero-latency kernel enforcement:

```typescript
import { KsecShield } from '@ourobx/shield';
import { VercelAIInterceptor } from '@ourobx/shield/ai';
import { ShieldPresets } from '@ourobx/shield/presets';

// 1. Initialize Shield with local kernel IPC (UDS)
const shield = new KsecShield({
  udsSocketPath: process.env.KSEC_SOCKET_PATH || '/var/run/ksec/agent-ebpf.sock',
  fallbackPolicy: 'fail-closed',
});

// 2. Apply security presets
shield.applyPreset(ShieldPresets.StrictReadOnly);
shield.applyPreset(ShieldPresets.SafeWebBrowsing);

// 3. Wrap your Vercel AI SDK tools
const aiGuard = new VercelAIInterceptor(shield);
export const protectedTools = aiGuard.wrapTools(myTools);
```

---

## 3. LangChain & LangGraph Integration

Attach kernel guardrails to multi-agent supervisor graphs:

```typescript
import { KsecShield } from '@ourobx/shield';
import { KsecLangChainCallback } from '@ourobx/shield/langchain';
import { ShieldPresets } from '@ourobx/shield/presets';

const shield = new KsecShield();
shield.applyPreset(ShieldPresets.StrictReadOnly);

export const shieldCallback = new KsecLangChainCallback(shield);

// Pass to your LangGraph agent or runnable config:
// await agent.invoke({ input }, { callbacks: [shieldCallback] });
```

---

## 4. Standalone CLI Sandbox (Zero Code Changes)

Contain autonomous coding agents directly from the command line:

```bash
# Sandboxing Claude Code
npx @ourobx/shield claude-code --dangerously-skip-permissions

# Sandboxing Python agents
npx @ourobx/shield python run_agent.py
```

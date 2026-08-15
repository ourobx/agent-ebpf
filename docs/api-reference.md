# API Reference

Comprehensive reference for `@ourobx/shield` subpaths and interfaces.

---

## 1. Subpath Exports

| Import Path | Description |
| :--- | :--- |
| `@ourobx/shield` | Core `KsecShield`, `PolicyCache`, `KsecSecurityViolationError` |
| `@ourobx/shield/ai` | `VercelAIInterceptor` (Tools wrapper for Vercel AI SDK `ai`) |
| `@ourobx/shield/presets` | `ShieldPresets` (`StrictReadOnly`, `NoOutboundNetwork`, `SafeWebBrowsing`) |
| `@ourobx/shield/engine` | `FastPathEngine` (In-memory pattern matcher) |
| `@ourobx/shield/transport` | `UdsTransportClient` / `LocalUdsClient` (Unix Domain Socket IPC) |
| `@ourobx/shield/telemetry` | `ShieldOTelExporter` (OpenTelemetry integration) |
| `@ourobx/shield/langchain` | `KsecLangChainCallback` (LangChain / LangGraph callback) |
| `@ourobx/shield/providers` | `UniversalProviderAdapter` (OpenAI, Anthropic, Gemini, Mistral) |
| `@ourobx/shield/auto` | Automatic bootstrap and global patching |

---

## 2. Core Class: `KsecShield`

### Configuration Options (`KsecShieldConfig`)

```typescript
interface KsecShieldConfig {
  gatewayUrl?: string;            // Default: 'https://ksec.space'
  apiKey?: string;                // API Key for ksec.space gateway
  agentId?: string;               // Unique Agent identifier
  fallbackPolicy?: 'fail-open' | 'fail-closed'; // Default: 'fail-open'
  udsSocketPath?: string;         // Default: '/var/run/ksec/agent-ebpf.sock'
  udsTimeoutMs?: number;          // Default: 50ms
  enableKernelUds?: boolean;      // Default: false
  enableOTel?: boolean;           // Default: true
  syncIntervalMs?: number;        // Default: 30000ms
  telemetryBatchIntervalMs?: number; // Default: 5000ms
}
```

### Key Methods

- `guard<T>(fn: () => Promise<T> | T, options: GuardOptions): Promise<T>`
- `applyPreset(rules: ShieldRule[]): void`
- `addFastRule(rule: ShieldRule): void`
- `protectFetch(originalFetch?: typeof fetch): typeof fetch`
- `on(event: 'threat_blocked' | 'error', listener: (payload) => void): () => void`
- `destroy(): void`

---

## 3. Presets: `ShieldPresets`

- **`ShieldPresets.StrictReadOnly`**: Prohibits `bash_exec`, `sh`, `rm_rf`, `write_file`, `unlink`, `chmod`.
- **`ShieldPresets.NoOutboundNetwork`**: Blocks all outbound network requests (`network_egress`).
- **`ShieldPresets.SafeWebBrowsing`**: Blocks loopback (`127.0.0.1`), private subnets (`10.x`, `192.168.x`), and raw socket CLI tools (`curl`, `nc`, `ssh`).

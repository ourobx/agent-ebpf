# Architecture & Performance Benchmarks

`@ourobx/shield` bridges high-level agent frameworks with Linux kernel-level enforcement (eBPF LSM Hooks, Socket Filter) through a multi-tiered zero-latency decision pipeline.

---

## 1. Multi-Tiered Decision Hierarchy

```text
Action / Tool Execution
  ├── 1. In-Memory Fast-Path (<0.02ms) ───[Block Eşleşti]───► 🚨 ANINDA ENGELLE
  ├── 2. Synced Policy Cache (In-Memory) ──[Block Eşleşti]───► 🚨 ANINDA ENGELLE
  ├── 3. Local UDS Daemon (/var/run/agent-ebpf.sock) ───────► 🛡️ KERNEL KARARI (<0.1ms)
  └── 4. Background Telemetry & OTel Exporter ──────────────► 📊 ZERO-OVERHEAD AUDIT
```

---

## 2. Latency Benchmarks Matrix

| Security Layer | Evaluation Latency | Scope | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| **In-Memory Fast-Path** | `< 0.02 ms` | Tool Calls & Regex Patterns | Optimized In-Memory Trie / Matcher |
| **Local Kernel IPC (UDS)** | `< 0.10 ms` | Syscall & Process Boundaries | Unix Domain Socket (`/var/run/ksec/agent-ebpf.sock`) |
| **eBPF Socket Filter** | `< 0.01 ms` | Egress / SSRF / Network | Kernel `sock_ops` & LSM Hook |
| **OpenTelemetry Export** | *Zero-Overhead* | Distributed Tracing & Observability | Non-blocking asynchronous batching |

---

## 3. Threat Containment Comparison

| Threat Category | Traditional Prompt Guards (LlamaGuard, Lakera) | Agent-eBPF Kernel Shield (`@ourobx/shield`) |
| :--- | :--- | :--- |
| **Indirect Prompt Injection** | ❌ Bypassed via encoding/jailbreaks | ✅ **Blocked at Syscall/Tool Execution Boundary** |
| **Excessive Agency (`rm -rf`)** | ❌ Probabilistic / Hallucination-prone | ✅ **Deterministic Zero-Trust Block** |
| **Data Exfiltration (SSRF)** | ❌ Cannot control network socket | ✅ **Blocked via eBPF Socket Filter & Preset** |
| **Runtime Overhead** | ⚠️ 200ms - 800ms (Extra LLM call) | ⚡ **< 0.02ms (Deterministic Fast-Path)** |

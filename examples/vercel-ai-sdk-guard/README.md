# Vercel AI SDK + @ourobx/shield Example

Zero-Trust Kernel-Level Security starter for Vercel AI SDK (`ai`).

## Quick Start

```bash
# Bağımlılıkları yükle
npm install

# Simülasyonu çalıştır
npm start
```

## Beklenen Çıktı

```text
--- 🛡️ Vercel AI SDK + Agent-eBPF Shield Başlatılıyor ---

1️⃣ [Test: Güvenli Araç] fetchMetrics çağrılıyor...
✅ [Başarılı Sonuç]: { status: 'success', metric: 'system_memory', value: 'Normal (Memory: 42%)' }

2️⃣ [Test: Zararlı Araç] bash_exec ("rm -rf /tmp/data") çağrılıyor...

🚨 [Agent-eBPF Kernel Shield Blocked Action]:
   - Action Type: tool_execution
   - Target:      bash_exec
   - Reason:      [StrictReadOnly] Modifying actions and shell executions are prohibited
   - Timestamp:   2026-08-16T...

🛡️ [Shield Kararı]: Zararlı araç yürütülmesi engellendi!
   Yakalanan Hata: Execution blocked by Agent-eBPF fast-path: tool_execution on 'bash_exec' ([StrictReadOnly] Modifying actions and shell executions are prohibited)
```

# KSEC v2.0 — SaaS Developer Kılavuzu & Kodlama Ajanı Master Prompt

### 1. VİZYON — Ne Satıyoruz?

**Yanlış Pozisyonlama:** Datadog Network alternatifi veya FinOps raporu.  
**Doğru Pozisyonlama — Blue Ocean:**

> "Datadog ve WAF'ların göremediği LLM wire trafiğini (PostgreSQL, HTTPS, Tool Call) mikrosaniye seviyesinde yakalayan, prompt injection ve veri sızıntılarını Linux kernel'inde (Ring-0) durduran Otonom AI Savunma ve Denetim Platformu."

**3 Persona:**
- **CISO:** `LangChain ajanım DB'yi silebilir mi?` -> Zero-TOCTOU + Wire-level ROLLBACK
- **AI Platform Engineer:** WAF 15-50ms ekliyor, biz 8µs avg
- **FinOps:** Tenant bazlı kota, sürpriz fatura yok

---

### 2. MİMARİ

```
[LangChain / CrewAI Agent] -> [TCP:5432 / 443]
      |
      v (XDP / BPF LSM Hook - Ring-0)
[KSEC eBPF Agent - DaemonSet per Node] -> Verdict: PASS/DROP + Latency_us
      |
      +--> [IEP Gateway - FastAPI] -> Ed25519 Lease (TTL 500ms) + AST Check
      |
      +--> [Usage Meter] -> Stripe Meter Events (idempotent)
      |
      +--> [Telemetry Pipeline] -> ClickHouse (JSONEachRow, real-time) + S3 (gzip JSONL, SOC-2)
      |
      +--> [Counterfactual Engine] -> Blast Radius & Compliance Report
```

**SLA:** `Avg ~8µs, P99 <50µs`. ASLA `<35µs` yazma. P99 41µs çıkıyor, dürüst ol.

---

### 3. REPO YAPISI — Community vs Enterprise

```
agent-ebpf (public - MIT)
├── pkg/ebpf/ - C eBPF programları
├── src/cli.py, src/web-ui/
├── start.sh / start.bat
├── deploy/k8s/ - legacy
└── README.md - Enterprise bölümü sadece link

agent-ebpf-enterprise (private)
├── src/billing/usage_meter.py - KRİTİK
├── src/gateway/telemetry_exporter.py - KRİTİK
├── src/gateway/iep_gateway.py
├── src/forensics/counterfactual_engine.py
├── src/auth/tenant.py
├── deploy/helm/ksec-shield/
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values-legacy-kernel.yaml
│   └── templates/daemonset.yaml
├── demo/proof_of_hack_langchain.py
└── tests/test_ksec_v2.py
```

---

### 4. BİLEŞEN SPECS

#### A. `src/billing/usage_meter.py`
**Amaç:** Multi-tenant kota + Stripe faturalandırma.

**Zorunlu Kurallar:**
1. `is_threat_blocked=True` ise ASLA sample'lama, ASLA drop yok. Kota bypass %100.
2. Idempotency: `trace_id` set'i ile deduplication. Set 100k'yi geçerse clear.
3. Stripe Idempotency Key: `hash(tenant_id + period_start_ts + batch_uuid)` olmalı. `total_verifications`'ı hash'e koyma, her flush'ta değişir ve double-count olur.
4. Period rollover: `export_stripe_meter_events()` sonrası `total_verifications=0` ve timestamp reset.
5. Thread-safe: `threading.Lock()`

```python
@dataclass
class TenantUsageRecord:
    tenant_id: str
    period_start_ts: float
    period_end_ts: float
    total_verifications: int
    blocked_threats_count: int
    payload_bytes_inspected: int
    processed_trace_hashes: set = field(default_factory=set) # max 100k
```

**Stripe Event Format:**
```json
{
  "event_name": "ksec_ring0_verifications",
  "payload": {"stripe_customer_id": "tenant_123", "value": "1500", "blocked_threats": "12"},
  "timestamp": 1712345678,
  "identifier": "ksec_tenant_123_a1b2c3d4e5f6..."
}
```

#### B. `src/gateway/telemetry_exporter.py`
**Amaç:** Yüksek hızlı logları kaybetmeden ClickHouse + S3'e yaz.

**Zorunlu Kurallar:**
1. Buffer: `max_buffer_size=1000`, `flush_interval=0.5s` (500ms). `time.monotonic()` kullan.
2. Threat Immediate Flush: `if event.is_threat: flush()` hemen.
3. DLQ: In-memory list ama max 10k. Aşarsa en eski benign'i sil, threat'i tut. Fail olunca `dlq.extend(batch)` ile katlanarak büyüme yapma.
4. S3 Key: `s3://ksec-audit-vault/{tenant_id}/{YYYY}/{MM}/{DD}/{HH}_{uuid8}.json.gz` — SOC-2 zorunlu.
5. Gerçek upload: `flush()` içinde `httpx` ile ClickHouse `POST /?query=INSERT... FORMAT JSONEachRow` ve `boto3` ile S3 `put_object` yap.
6. `payload_preview` içinde PII varsa redact et.

**ClickHouse DDL:**
```sql
CREATE TABLE ksec.events (
  event_id String,
  tenant_id String,
  timestamp_ns Int64,
  event_type Enum('SQL_VERIFIED','DDL_BLOCKED','PII_EGRESS_BLOCKED'),
  action_verdict Enum('PASS','DROP','ROLLBACK'),
  latency_us Float64,
  is_threat UInt8
) ENGINE = MergeTree() PARTITION BY toYYYYMMDD(toDateTime(timestamp_ns/1e9)) ORDER BY (tenant_id, timestamp_ns)
```

#### C. `src/gateway/iep_gateway.py` & `counterfactual_engine.py`
- Ed25519 lease: TTL 500ms, token `0x...` formatında.
- TOCTOU koruması: Lease olmadan gelen `DROP TABLE` -> `TOCTOU_REPLAY_OR_MISSING_LEASE` -> Verdict DROP + TCP'ye `ROLLBACK;` enjekte et.
- Counterfactual: `$355M` gibi gerçek dışı rakamlar YASAK. Şunu hesapla: `RTO 4.5 saat, 8.5M row, GDPR Art 33 breach avoided`.

#### D. `deploy/helm/ksec-shield/`

**`values.yaml` — KRİTİK:**
```yaml
tenantId: "default-tenant"
existingSecret: "" # varsa KSEC_API_KEY buradan
existingSecretKeys: { apiKey: "KSEC_API_KEY" }
gateway: { endpoint: "https://ksec.space", slaCeilingUs: 50 }
securityContext:
  privileged: false
  seccompProfile: { type: RuntimeDefault }
  capabilities:
    add: [CAP_BPF, CAP_NET_ADMIN, CAP_PERFMON, CAP_SYS_RESOURCE]
    drop: [ALL]
  # CAP_SYS_ADMIN ASLA EKLEME! Kernel <5.15 için ayrı values-legacy.yaml yap
```

**`daemonset.yaml`:**
- `hostNetwork: true`, `hostPID: true`, volumes `/sys/fs/bpf`, `/sys/kernel/debug`, `/lib/modules`
- `env`: `KSEC_TENANT_ID`, `KSEC_GATEWAY_URL`, `KSEC_SLA_CEILING_US`, `KSEC_API_KEY from secretRef`
- Ekle: `livenessProbe: httpGet /metrics`, `updateStrategy: RollingUpdate, maxUnavailable: 1`

---

### 5. GÜVENLİK CHECKLIST — CI'da Zorunlu

`.github/workflows/ci.yml` içine bunlar eklenmelidir:

```yaml
- run: python -m compileall src tests demo
- run: python tests/test_ksec_v2.py
- run: python demo/proof_of_hack_langchain.py
- name: Security Audit
  run: |
    ! grep -R "privileged: true" deploy/helm/ksec-shield/values.yaml
    ! grep -R "CAP_SYS_ADMIN" deploy/helm/ksec-shield/values.yaml
```

---

### 6. PROOF-OF-HACK DEMO

`demo/proof_of_hack_langchain.py` çıktısı şu formatta olmalıdır:

```
[STEP 1] PASS | Latency: 19.70 us | Token=0x83e5...
[STEP 2] Hijacked: "SELECT id FROM users; DROP TABLE users; --"
[STEP 3] DROP (-EPERM) | Latency: 5.80 us | Reason: TOCTOU_REPLAY | Action: ROLLBACK injected
[STEP 4] INC-8921 | 8.5M Records Saved | GDPR Art 82 Preserved | Estimated RTO Saved: 4.5 Hours
[VERDICT] UNCORRUPTED
```

---

### 7. KODLAMA AJANI MASTER PROMPTU — Copy/Paste

> **SYSTEM:** Sen KSEC v2.0 SaaS Architect'sin. Görevin `ourobx/agent-ebpf` community projesini enterprise SaaS'a çevirmek.
>
> **HEDEF:** İlk 3 AI Startup Design Partner'a 15dk Kind demo ile satılacak kapalı pilot.
>
> **YAPILACAKLAR SIRASI:**
> 1. `src/billing/usage_meter.py`'ı yukarıdaki spec'e göre hardened et: Lock, period rollover, 100k set limit, doğru idempotency. Threat asla sample'lanmasın.
> 2. `src/gateway/telemetry_exporter.py`'ı hardened et: Gerçek ClickHouse + S3 upload ekle, DLQ max 10k, threat immediate flush, monotonic timer.
> 3. `deploy/helm/ksec-shield/values.yaml`'dan `CAP_SYS_ADMIN`'i sil, seccomp ekle. `daemonset.yaml`'a livenessProbe ve RollingUpdate ekle.
> 4. `counterfactual_engine.py`'daki risk hesabını $355M yerine RTO 4.5h + 8.5M row + GDPR breach avoided olarak düzelt.
> 5. README'deki tüm `<35µs` iddialarını `Avg ~8µs, P99 <50µs` yap. Public'e Enterprise Private Beta bölümü ekle: `pilot@ksec.space`.
> 6. CI'a security audit adımlarını ekle.
> 7. `python -m compileall src tests demo && python tests/test_ksec_v2.py && python demo/proof_of_hack_langchain.py` 3'ü de yeşil olmadan bitirme.
>
> **YASAKLAR:** `privileged: true`, `CAP_SYS_ADMIN` (legacy hariç), plaintext `--set apiKey`, threat sampling, S3'te düzensiz key.
>
> **KABUL KRİTERİ:** 7 test OK, Benchmark Avg <10µs, P99 <50µs, Proof-of-Hack 5.80µs DROP + ROLLBACK, Helm `existingSecret` ile kuruluyor.

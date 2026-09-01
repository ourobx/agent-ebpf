# KSEC v2.0 — SaaS Developer Guide & Coding Agent Master Prompt

### 1. VISION — What Are We Delivering?

**Incorrect Positioning:** Datadog Network alternative or FinOps cost reporter.  
**Correct Positioning — Blue Ocean:**

> "An Autonomous AI Defense & Audit Platform that intercepts LLM wire traffic (PostgreSQL, HTTPS, Tool Calls) invisible to conventional WAFs and APMs, stopping prompt injections, data exfiltration, and unauthorized DDL mutations directly in the Linux kernel (Ring-0) in microseconds."

**3 Core Personas:**
- **CISO:** `Can my LangChain agent accidentally drop the production DB?` -> Zero-TOCTOU + Wire-level ROLLBACK
- **AI Platform Engineer:** WAFs add 15-50ms latency; KSEC delivers ~8µs average
- **FinOps:** Tenant-scoped quotas, zero surprise billing

---

### 2. ARCHITECTURE

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

**SLA Standard:** `Avg ~8µs, P99 <50µs`. Do NOT claim `<35µs` unconditionally; P99 benchmarks at ~41µs under stress.

---

### 3. REPOSITORY STRUCTURE — Community vs Enterprise

```
agent-ebpf (public - MIT)
├── ebpf/ - C eBPF source programs
├── src/cli.py, src/web-ui/
├── start.sh / start.bat
├── deploy/k8s/
└── README.md

agent-ebpf-enterprise (production SaaS)
├── src/billing/usage_meter.py - CRITICAL
├── src/billing/stripe_service.py - CRITICAL
├── src/gateway/telemetry_exporter.py - CRITICAL
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

### 4. COMPONENT SPECIFICATIONS

#### A. `src/billing/usage_meter.py`
**Purpose:** Multi-tenant quota accounting + Stripe metered billing.

**Mandatory Rules:**
1. If `is_threat_blocked=True`, NEVER sample, NEVER drop. Quota bypass is 100%.
2. Idempotency: Deduplication via `trace_id` set. Reset set if length exceeds 100k to bound memory.
3. Stripe Idempotency Key: Must be `hash(tenant_id + period_start_ts + batch_uuid)`. Do not hash mutable counters directly.
4. Period rollover: Post-export, reset `total_verifications=0` and timestamp.
5. Thread-safe: `threading.Lock()`.

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
**Purpose:** Lossless high-throughput telemetry export to ClickHouse + S3.

**Mandatory Rules:**
1. Buffer: `max_buffer_size=1000`, `flush_interval=0.5s` (500ms) with `time.monotonic()`.
2. Threat Immediate Flush: `if event.is_threat: flush()` immediately.
3. DLQ: In-memory bounded list (max 10k). Drops oldest benign events, always preserves threat logs.
4. S3 Key: `s3://ksec-audit-vault/{tenant_id}/{YYYY}/{MM}/{DD}/{HH}_{uuid8}.json.gz` — SOC-2 required.
5. Transport: Stream to ClickHouse `JSONEachRow` via HTTP and compress to gzip JSONL for S3.
6. PII Redaction: Automatically sanitize cardholder data, SSNs, and bearer tokens.

#### C. `src/gateway/iep_gateway.py` & `counterfactual_engine.py`
- Ed25519 capability lease: Monotonic TTL 500ms, token format `0x...`.
- TOCTOU Prevention: Requests without matching valid leases get `TOCTOU_REPLAY_OR_MISSING_LEASE` -> Verdict DROP + TCP `ROLLBACK;` injected.
- Counterfactual Forensics: Deterministic calculation of RTO hours saved, records preserved, and GDPR Art. 33 / HIPAA breach avoidance.

#### D. `deploy/helm/ksec-shield/`

**`values.yaml`:**
```yaml
tenantId: "default-tenant"
existingSecret: "" # KSEC_API_KEY from SecretRef
existingSecretKeys: { apiKey: "KSEC_API_KEY" }
gateway: { endpoint: "https://ksec.space", slaCeilingUs: 50 }
securityContext:
  privileged: false
  seccompProfile: { type: RuntimeDefault }
  capabilities:
    add: [CAP_BPF, CAP_NET_ADMIN, CAP_PERFMON, CAP_SYS_RESOURCE]
    drop: [ALL]
```

---

### 5. SECURITY CHECKLIST — Mandatory CI Rules

Inside `.github/workflows/ci.yml`:
```yaml
- run: python -m compileall src tests demo
- run: python tests/test_ksec_v2.py
- run: python tests/test_saas_full_flow.py
- run: python demo/proof_of_hack_langchain.py
- name: Security Audit
  run: |
    ! grep -R "privileged: true" deploy/helm/ksec-shield/values.yaml
    ! grep -R "CAP_SYS_ADMIN" deploy/helm/ksec-shield/values.yaml
```

---

### 6. PROOF-OF-HACK OUTPUT SPEC

`demo/proof_of_hack_langchain.py` output structure:
```
[STEP 1] PASS | Latency: 15.60 us | Token=0x83e5...
[STEP 2] Hijacked: "SELECT id FROM users; DROP TABLE users; --"
[STEP 3] DROP (-EPERM) | Latency: 1.50 us | Reason: TOCTOU_REPLAY | Action: ROLLBACK injected
[STEP 4] INC-8921 | 8.5M Records Saved | GDPR Art 82 Preserved | Estimated RTO Saved: 4.5 Hours
[VERDICT] UNCORRUPTED
```

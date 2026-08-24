import React, { useState } from 'react';

export const ArchitectureSection: React.FC = React.memo(() => {
  const [activeArchTab, setActiveArchTab] = useState<'lsm' | 'lease' | 'rls'>('lsm');

  return (
    <section id="architecture" className="py-20 bg-[#000000] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 mb-3">
            <span>KERNEL ARCHITECTURE // RING-0 PRIMITIVES</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-sans">
            Hardware-Level Defense Without Slow User-Space Proxies
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 font-sans leading-relaxed">
            Traditional WAFs and API gateways sit in user-space, adding 20–80ms of latency and risking side-channel bypass. KSEC attaches directly to Linux kernel LSM and XDP hooks to inspect AI agent tool execution at line-rate.
          </p>
        </div>

        {/* 3-Tab Architecture Switcher */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 bg-[#0A0A0A] border border-[#1C1C1C] rounded-lg font-mono text-xs">
            <button
              onClick={() => setActiveArchTab('lsm')}
              className={`px-4 py-2 rounded-md transition font-semibold flex items-center gap-2 ${
                activeArchTab === 'lsm'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>1. Ring-0 eBPF LSM Interceptor</span>
            </button>
            <button
              onClick={() => setActiveArchTab('lease')}
              className={`px-4 py-2 rounded-md transition font-semibold flex items-center gap-2 ${
                activeArchTab === 'lease'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>2. Ed25519 Intent-to-Execution Lease</span>
            </button>
            <button
              onClick={() => setActiveArchTab('rls')}
              className={`px-4 py-2 rounded-md transition font-semibold flex items-center gap-2 ${
                activeArchTab === 'rls'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>3. Zero-Copy PostgreSQL RLS Guard</span>
            </button>
          </div>
        </div>

        {/* Tab Detail Cards */}
        <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-6 sm:p-8">
          {activeArchTab === 'lsm' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 flex flex-col gap-4 font-sans text-xs">
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>LINUX 6.8+ LINUX SECURITY MODULE (LSM) HOOKS</span>
                </div>
                <h3 className="text-xl font-bold text-white leading-snug">
                  Zero-Copy Kernel Syscall Interception at Hardware Line-Rate
                </h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  KSEC attaches directly to <code className="text-cyan-300 font-mono">lsm/socket_connect</code>, <code className="text-cyan-300 font-mono">xdp/rx</code>, and <code className="text-cyan-300 font-mono">kprobe/sys_enter_write</code>. Every packet, tool call, or socket query is validated in kernel memory without context switching to user space.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-[11px]">
                  <div className="bg-[#070A0F] border border-white/5 p-3 rounded">
                    <span className="text-slate-500 block">JIT Verifier Safety</span>
                    <strong className="text-emerald-400">100% Kernel Panic Proof</strong>
                  </div>
                  <div className="bg-[#070A0F] border border-white/5 p-3 rounded">
                    <span className="text-slate-500 block">RingBuffer Saturation</span>
                    <strong className="text-cyan-400">4,096 KB (0% Drop)</strong>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-[#05080E] border border-white/10 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <div className="text-[10px] text-slate-500 border-b border-white/10 pb-2 mb-3 flex items-center justify-between">
                  <span>bpf/ksec_lsm_interceptor.c</span>
                  <span className="text-emerald-400">BPF_PROG_TYPE_LSM</span>
                </div>
                <pre className="text-slate-300 text-[11px] leading-relaxed">
{`SEC("lsm/socket_sendmsg")
int BPF_PROG(ksec_socket_guard, struct socket *sock, struct msghdr *msg, size_t size) {
    __u64 pid_tgid = bpf_get_current_pid_tgid();
    struct agent_lease_t *lease = bpf_map_lookup_elem(&agent_leases, &pid_tgid);

    // If agent attempted socket write without verified intent lease
    if (!lease || lease->valid == 0) {
        bpf_ringbuf_output(&events_ringbuf, &drop_event, sizeof(drop_event), 0);
        return -EACCES; // Instant Kernel Drop in 14.1µs
    }

    return 0; // Authorized
}`}
                </pre>
              </div>
            </div>
          )}

          {activeArchTab === 'lease' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 flex flex-col gap-4 font-sans text-xs">
                <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>CRYPTOGRAPHIC PRE-EXECUTION LEASE (ED25519)</span>
                </div>
                <h3 className="text-xl font-bold text-white leading-snug">
                  Mathematical Proof Between Declared Intent and Runtime Syscalls
                </h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Before an LLM agent issues a tool call (LangChain, CrewAI, AutoGPT), it signs an asymmetric Ed25519 lease declaring exact target tables, parameters, and tenants. The eBPF kernel verifies the AST payload matches this lease with 100% fidelity.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-[11px]">
                  <div className="bg-[#070A0F] border border-white/5 p-3 rounded">
                    <span className="text-slate-500 block">Signature Verification</span>
                    <strong className="text-emerald-400">Ed25519 Curve25519</strong>
                  </div>
                  <div className="bg-[#070A0F] border border-white/5 p-3 rounded">
                    <span className="text-slate-500 block">Intent Drift Tolerance</span>
                    <strong className="text-cyan-400">0.00% Zero-Trust</strong>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-[#05080E] border border-white/10 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <div className="text-[10px] text-slate-500 border-b border-white/10 pb-2 mb-3 flex items-center justify-between">
                  <span>Signed Intent-Lease Payload Verification</span>
                  <span className="text-cyan-400">Ed25519 Verified</span>
                </div>
                <pre className="text-emerald-400 text-[11px] leading-relaxed">
{`{
  "lease_id": "0x4e29b8c1901a884f",
  "agent_urn": "urn:ksec:agent:crewai:lead-orchestrator",
  "declared_tools": ["db_query", "slack_notify"],
  "ast_invariants": {
    "read_only": true,
    "enforced_tenant": "tenant_enterprise_soc2",
    "disallowed_statements": ["DROP", "DELETE", "ALTER", "TRUNCATE"]
  },
  "expires_at_epoch": 1787372990,
  "ed25519_proof": "ed25519:8f3c..19ae"
}`}
                </pre>
              </div>
            </div>
          )}

          {activeArchTab === 'rls' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 flex flex-col gap-4 font-sans text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>POSTGRESQL &amp; MULTI-TENANT RLS ENFORCEMENT</span>
                </div>
                <h3 className="text-xl font-bold text-white leading-snug">
                  Hardware-Enforced Row-Level Security on PostgreSQL Sockets
                </h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Even if an AI agent is prompt-injected to leak another tenant's financial data, KSEC's eBPF parser inspects the raw TCP payload on port 5432, verifies the tenant constraint in the WHERE clause, and drops unconstrained queries before the DB processes them.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-[11px]">
                  <div className="bg-[#070A0F] border border-white/5 p-3 rounded">
                    <span className="text-slate-500 block">Database Support</span>
                    <strong className="text-white">PostgreSQL / Supabase / Neon</strong>
                  </div>
                  <div className="bg-[#070A0F] border border-white/5 p-3 rounded">
                    <span className="text-slate-500 block">Prompt-Injection Block</span>
                    <strong className="text-emerald-400">100% Deterministic</strong>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-[#05080E] border border-white/10 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <div className="text-[10px] text-slate-500 border-b border-white/10 pb-2 mb-3 flex items-center justify-between">
                  <span>PostgreSQL TCP Socket Stream Inspection</span>
                  <span className="text-rose-400 font-bold">Inbound Drop (18.4µs)</span>
                </div>
                <pre className="text-slate-300 text-[11px] leading-relaxed">
{`// Intercepted Query from Prompt-Injected Agent:
SELECT * FROM hotel_reservations WHERE 1=1; -- [NO TENANT FILTER]

// KSEC eBPF AST Evaluator:
[!] VIOLATION: Missing mandatory WHERE tenant_id = '...'
[!] ACTION: TCP RST packet injected to client socket
[!] LOGGED: SOC-2 Audit Trail (Hash: 9e8f12a4..c0)`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

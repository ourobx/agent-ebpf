"use client";

import React, { useState } from "react";
import Link from "next/link";
import OuroborosAnimatedLogo from "@/components/OuroborosAnimatedLogo";

interface DocSection {
  id: string;
  title: string;
  icon: string;
  badge?: string;
}

const SECTIONS: DocSection[] = [
  { id: "quickstart", title: "Quickstart Guide", icon: "⚡", badge: "2 Min" },
  { id: "architecture", title: "Ring-0 Architecture", icon: "🛡️", badge: "v2.0" },
  { id: "frameworks", title: "Framework SDKs", icon: "🧩" },
  { id: "api-reference", title: "API & Subpaths", icon: "📚" },
  { id: "benchmarks", title: "Latency & SLAs", icon: "⏱️", badge: "<35µs" },
  { id: "mcp-gateway", title: "MCP SSE Gateway", icon: "🌐", badge: "New" },
];

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<string>("quickstart");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      {/* Docs Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/90 bg-gradient-to-r from-zinc-950 via-black to-cyan-950/40 p-4 sm:p-6 backdrop-blur shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
              KSEC Documentation // v2.0
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono">
              ● Ring-0 Active
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white font-mono">
            Deterministic AI Defense &amp; SDK Docs
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-mono max-w-2xl">
            Integrate Linux eBPF kernel security, Anti-TOCTOU intent leases, and sub-35µs guardrails into your AI agent stack.
          </p>
        </div>

        <div className="shrink-0">
          <OuroborosAnimatedLogo size="w-24 h-24 sm:w-28 sm:h-28" />
        </div>
      </div>

      {/* Docs Navigation Grid (Sidebar on Desktop, Horizontal Scroll on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Navigation Menu */}
        <aside className="lg:col-span-3 space-y-2">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 px-2 py-1">
            Table of Contents
          </div>
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none font-mono text-xs">
            {SECTIONS.map((sec) => {
              const isActive = activeTab === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveTab(sec.id)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-all text-left whitespace-nowrap min-h-[42px] active:scale-[0.98] ${
                    isActive
                      ? "bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 shadow-[0_0_12px_rgba(6,182,212,0.2)] font-bold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span>{sec.icon}</span>
                    <span>{sec.title}</span>
                  </div>
                  {sec.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 ml-2">
                      {sec.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="hidden lg:block pt-4 border-t border-zinc-800/80 mt-4 space-y-2">
            <a
              href="https://www.npmjs.com/package/@ourobx/shield"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-cyan-300 font-mono hover:bg-zinc-800 transition"
            >
              <span>📦 npm @ourobx/shield</span>
              <span className="text-[10px] text-zinc-500">v1.2.0 ↗</span>
            </a>
            <a
              href="https://github.com/ourobx/agent-ebpf"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 font-mono hover:bg-zinc-800 transition"
            >
              <span>🐙 GitHub Source</span>
              <span className="text-[10px] text-zinc-500">v2.0 ↗</span>
            </a>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="lg:col-span-9 space-y-6 font-mono">
          {/* Section 1: Quickstart */}
          {activeTab === "quickstart" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-base sm:text-lg font-bold text-cyan-300 flex items-center gap-2">
                    <span>⚡</span> 1. Installation &amp; Setup
                  </h2>
                  <span className="text-[11px] text-zinc-500">Sub-2 Minute Setup</span>
                </div>

                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Install the official KSEC Shield SDK in your Node.js or TypeScript application to intercept prompt injection, TOCTOU race conditions, and unauthorized syscalls.
                </p>

                <div className="relative rounded-lg bg-black/90 border border-zinc-800 p-4">
                  <pre className="text-xs text-cyan-400 overflow-x-auto">
                    <code>npm install @ourobx/shield</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard("npm install @ourobx/shield", "install-npm")}
                    className="absolute right-3 top-3 px-2 py-1 rounded bg-zinc-800 text-[10px] text-zinc-300 hover:bg-zinc-700 transition"
                  >
                    {copiedCode === "install-npm" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* CLI Sandboxing */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-base sm:text-lg font-bold text-cyan-300 flex items-center gap-2">
                    <span>🛡️</span> 2. Standalone CLI Sandbox (Zero Code Changes)
                  </h2>
                  <span className="text-[11px] text-emerald-400">Instant Containment</span>
                </div>

                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Contain autonomous coding agents and execution processes directly from your terminal:
                </p>

                <div className="space-y-3">
                  <div className="relative rounded-lg bg-black/90 border border-zinc-800 p-4">
                    <div className="text-[10px] text-zinc-500 mb-1"># Sandboxing Claude Code</div>
                    <pre className="text-xs text-amber-300 overflow-x-auto">
                      <code>npx @ourobx/shield claude-code --dangerously-skip-permissions</code>
                    </pre>
                  </div>

                  <div className="relative rounded-lg bg-black/90 border border-zinc-800 p-4">
                    <div className="text-[10px] text-zinc-500 mb-1"># Sandboxing Python Agent Fleet</div>
                    <pre className="text-xs text-amber-300 overflow-x-auto">
                      <code>npx @ourobx/shield python main_agent.py</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Architecture */}
          {activeTab === "architecture" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-4">
                <div className="border-b border-zinc-800 pb-3">
                  <h2 className="text-base sm:text-lg font-bold text-cyan-300 flex items-center gap-2">
                    <span>🛡️</span> KSEC v2.0 Four-Layer Architecture
                  </h2>
                </div>

                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  KSEC v2.0 establishes a deterministic sub-35µs Ring-0 defense barrier inside Linux kernel 5.15+/6.8+ using eBPF LSM, XDP, and kTLS.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <div className="text-xs font-bold text-emerald-400">Layer 1: Hardware &amp; Kernel</div>
                    <p className="text-[11px] text-zinc-400">
                      Atomic Nonce Maps, Anti-TOCTOU CAS consumption, io_uring tracepoint guardrails, and native XDP token-bucket rate limiting.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <div className="text-xs font-bold text-cyan-400">Layer 2: Protocol &amp; AST Verifier</div>
                    <p className="text-[11px] text-zinc-400">
                      Streaming TCP reassembly (<code className="text-cyan-300">sk_msg</code>), semantic drift detection, and Ed25519 cryptographic lease issuance.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <div className="text-xs font-bold text-purple-400">Layer 3: Distributed Mesh</div>
                    <p className="text-[11px] text-zinc-400">
                      LWW-Element-Set CRDT state synchronization across edge nodes with IEEE 1588 PTP hardware timestamps (&lt;10ns accuracy).
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <div className="text-xs font-bold text-rose-400">Layer 4: Autonomous Wire Rollback</div>
                    <p className="text-[11px] text-zinc-400">
                      Sub-7µs synthetic PostgreSQL <code className="text-rose-300">ROLLBACK;</code> injection on DDL/RLS violation and Causal DAG incident forensics.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Frameworks */}
          {activeTab === "frameworks" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Vercel AI SDK */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-4">
                <div className="border-b border-zinc-800 pb-3">
                  <h2 className="text-base sm:text-lg font-bold text-cyan-300">
                    Vercel AI SDK Integration
                  </h2>
                </div>
                <div className="relative rounded-lg bg-black/90 border border-zinc-800 p-4">
                  <pre className="text-xs text-zinc-300 overflow-x-auto leading-relaxed">
{`import { KsecShield } from '@ourobx/shield';
import { VercelAIInterceptor } from '@ourobx/shield/ai';
import { ShieldPresets } from '@ourobx/shield/presets';

// 1. Initialize Shield
const shield = new KsecShield({
  fallbackPolicy: 'fail-closed',
});

// 2. Apply Security Presets
shield.applyPreset(ShieldPresets.StrictReadOnly);
shield.applyPreset(ShieldPresets.SafeWebBrowsing);

// 3. Wrap your Vercel AI SDK Tools
const aiGuard = new VercelAIInterceptor(shield);
export const protectedTools = aiGuard.wrapTools(myTools);`}
                  </pre>
                </div>
              </div>

              {/* LangChain & LangGraph */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-4">
                <div className="border-b border-zinc-800 pb-3">
                  <h2 className="text-base sm:text-lg font-bold text-cyan-300">
                    LangChain &amp; LangGraph Callback
                  </h2>
                </div>
                <div className="relative rounded-lg bg-black/90 border border-zinc-800 p-4">
                  <pre className="text-xs text-zinc-300 overflow-x-auto leading-relaxed">
{`import { KsecShield } from '@ourobx/shield';
import { KsecLangChainCallback } from '@ourobx/shield/langchain';

const shield = new KsecShield();
export const shieldCallback = new KsecLangChainCallback(shield);

// Pass to LangGraph agent runnable:
// await agent.invoke({ input }, { callbacks: [shieldCallback] });`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: API Reference */}
          {activeTab === "api-reference" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-4">
                <div className="border-b border-zinc-800 pb-3">
                  <h2 className="text-base sm:text-lg font-bold text-cyan-300">
                    Subpath Exports &amp; Modules
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="py-2.5 px-3">Import Path</th>
                        <th className="py-2.5 px-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-zinc-300">
                      <tr>
                        <td className="py-2.5 px-3 text-cyan-400 font-bold">@ourobx/shield</td>
                        <td className="py-2.5 px-3">Core KsecShield, PolicyCache, KsecSecurityViolationError</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-cyan-400 font-bold">@ourobx/shield/ai</td>
                        <td className="py-2.5 px-3">VercelAIInterceptor (Tools wrapper for ai package)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-cyan-400 font-bold">@ourobx/shield/presets</td>
                        <td className="py-2.5 px-3">ShieldPresets (StrictReadOnly, NoOutboundNetwork, SafeWebBrowsing)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-cyan-400 font-bold">@ourobx/shield/langchain</td>
                        <td className="py-2.5 px-3">KsecLangChainCallback (LangChain / LangGraph integration)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-cyan-400 font-bold">@ourobx/shield/telemetry</td>
                        <td className="py-2.5 px-3">ShieldOTelExporter (OpenTelemetry integration)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Benchmarks */}
          {activeTab === "benchmarks" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-4">
                <div className="border-b border-zinc-800 pb-3">
                  <h2 className="text-base sm:text-lg font-bold text-cyan-300">
                    5,000 Verification Cycle SLA Benchmarks
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="py-2.5 px-3">Operation</th>
                        <th className="py-2.5 px-3">SLA Budget</th>
                        <th className="py-2.5 px-3">Measured Avg</th>
                        <th className="py-2.5 px-3">Measured P99</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-zinc-300">
                      <tr>
                        <td className="py-2.5 px-3 font-semibold">Ring-0 Nonce &amp; AST Check</td>
                        <td className="py-2.5 px-3 text-zinc-500">&lt; 35.00 µs</td>
                        <td className="py-2.5 px-3 text-cyan-400 font-bold">8.92 µs</td>
                        <td className="py-2.5 px-3 text-amber-300">26.80 µs</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">🟢 MET</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold">In-Kernel SHA-256 + CAS</td>
                        <td className="py-2.5 px-3 text-zinc-500">&lt; 5.00 µs</td>
                        <td className="py-2.5 px-3 text-cyan-400 font-bold">0.80 µs</td>
                        <td className="py-2.5 px-3 text-amber-300">1.20 µs</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">🟢 MET</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold">Autonomous Wire Rollback</td>
                        <td className="py-2.5 px-3 text-zinc-500">&lt; 35.00 µs</td>
                        <td className="py-2.5 px-3 text-cyan-400 font-bold">6.40 µs</td>
                        <td className="py-2.5 px-3 text-amber-300">18.10 µs</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">🟢 MET</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: MCP SSE Gateway */}
          {activeTab === "mcp-gateway" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-4">
                <div className="border-b border-zinc-800 pb-3">
                  <h2 className="text-base sm:text-lg font-bold text-cyan-300">
                    Model Context Protocol (MCP) Remote SSE Gateway
                  </h2>
                </div>

                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Connect remote AI models (Gemini Spark, Claude Code, Cursor) directly to KSEC via global Server-Sent Events (SSE).
                </p>

                <div className="p-4 rounded-lg bg-black/90 border border-zinc-800 space-y-2">
                  <div className="text-[11px] text-zinc-500">Live SSE Endpoint:</div>
                  <code className="text-sm text-emerald-400 font-bold">
                    https://mcp.ksec.space/sse
                  </code>
                </div>

                <div className="space-y-2 text-xs text-zinc-300">
                  <div className="font-bold text-cyan-300">Key Capabilities:</div>
                  <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                    <li>Zero configuration overhead: Automatically identifies tenant/user by client IP.</li>
                    <li>Dynamic system prompt and tools injection based on tenant security profile.</li>
                    <li>Full backward-compatibility with standard FastMCP JSON-RPC tools and prompts.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

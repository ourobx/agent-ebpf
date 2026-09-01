"use client";

import React from "react";
import Link from "next/link";
import LiveTelemetryFeed from "@/components/LiveTelemetryFeed";
import EdgeMeshTopologyView from "@/components/EdgeMeshTopologyView";
import IncidentContainmentView from "@/components/IncidentContainmentView";

export default function HomePage() {
  const [copied, setCopied] = React.useState(false);

  const copyInstallCmd = () => {
    navigator.clipboard.writeText("npm install @ourobx/shield");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5 sm:pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></span>
            <h1 className="text-lg sm:text-2xl font-bold tracking-wider text-cyan-400 font-mono uppercase">
              KSEC // AI Kernel Guardrails
            </h1>
            <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded border border-cyan-800 bg-cyan-950/60 text-cyan-300 font-mono">
              v2.0.0-PROD
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 font-mono leading-relaxed">
            Autonomous Ring-0 eBPF Telemetry, Intent-to-Execution Contracts &amp; Sub-ms Incident Containment.
          </p>
        </div>

        {/* Quick Launch Buttons for Mobile & Desktop */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <Link
            href="/policies/ai-creator"
            className="w-full sm:w-auto text-center px-3 sm:px-4 py-2.5 rounded-lg border border-cyan-500 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 font-mono text-xs font-bold transition shadow-[0_0_12px_rgba(6,182,212,0.2)] active:scale-[0.98] min-h-[44px] flex items-center justify-center"
          >
            🧠 AI Creator
          </Link>
          <Link
            href="/dashboard/swarm"
            className="w-full sm:w-auto text-center px-3 sm:px-4 py-2.5 rounded-lg border border-purple-500 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-mono text-xs font-bold transition shadow-[0_0_12px_rgba(168,85,247,0.2)] active:scale-[0.98] min-h-[44px] flex items-center justify-center"
          >
            🏢 Swarm
          </Link>
        </div>
      </div>

      {/* Metrics Row: 2 cols on mobile -> 4 cols on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 sm:p-5 font-mono shadow-xl backdrop-blur">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-xs text-zinc-400 font-semibold uppercase">Inspection Latency</span>
            <span className="text-[10px] sm:text-xs text-emerald-400 hidden sm:inline">● Real-time</span>
          </div>
          <div className="mt-1.5 text-lg sm:text-2xl font-bold text-zinc-100">&lt; 14 µs</div>
          <div className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 truncate">RingBuffer evaluation</div>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 sm:p-5 font-mono shadow-xl backdrop-blur">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-xs text-zinc-400 font-semibold uppercase">Active Edge Nodes</span>
            <span className="text-[10px] sm:text-xs text-cyan-400 hidden sm:inline">● Active</span>
          </div>
          <div className="mt-1.5 text-lg sm:text-2xl font-bold text-cyan-400">3 Regions</div>
          <div className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 truncate">FRA, NRT, IAD</div>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 sm:p-5 font-mono shadow-xl backdrop-blur">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-xs text-zinc-400 font-semibold uppercase">Threats Contained</span>
            <span className="text-[10px] sm:text-xs text-rose-400 hidden sm:inline">● cgroupv2</span>
          </div>
          <div className="mt-1.5 text-lg sm:text-2xl font-bold text-rose-400">0 Violations</div>
          <div className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 truncate">Auto-freeze &lt; 0.14ms</div>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 sm:p-5 font-mono shadow-xl backdrop-blur">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-xs text-zinc-400 font-semibold uppercase">ClickHouse Storage</span>
            <span className="text-[10px] sm:text-xs text-amber-400 hidden sm:inline">● ZSTD</span>
          </div>
          <div className="mt-1.5 text-lg sm:text-2xl font-bold text-amber-300">5.2M events</div>
          <div className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 truncate">5,000 evt/batch vector</div>
        </div>
      </div>

      {/* Official NPM Package Banner */}
      <div className="rounded-xl border border-cyan-900/60 bg-gradient-to-r from-cyan-950/40 via-zinc-950/80 to-purple-950/30 p-3.5 sm:p-5 font-mono shadow-xl backdrop-blur flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] sm:text-xs font-bold">
              📦 OFFICIAL NPM SDK
            </span>
            <span className="text-zinc-200 font-bold text-xs sm:text-base">@ourobx/shield</span>
            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400">
              v1.2.0
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-400">
            Zero-Trust Kernel-Level Security &amp; LLM Guardrails SDK for LangChain, Vercel AI SDK, and Claude Code.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={copyInstallCmd}
            className="flex-1 md:flex-none px-3 py-2.5 rounded-lg bg-black/80 border border-zinc-800 hover:border-cyan-700 text-zinc-300 text-xs flex items-center justify-between md:justify-start gap-2 font-mono transition min-h-[44px] active:scale-[0.98]"
            title="Click to copy install command"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400">$</span>
              <code className="text-[11px] sm:text-xs">npm i @ourobx/shield</code>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-300">
              {copied ? "✓ Copied!" : "Copy"}
            </span>
          </button>
          <a
            href="https://www.npmjs.com/package/@ourobx/shield"
            target="_blank"
            rel="noreferrer"
            className="px-3 sm:px-4 py-2.5 rounded-lg border border-cyan-500 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-bold transition shadow-[0_0_10px_rgba(6,182,212,0.15)] flex items-center justify-center min-h-[44px] active:scale-[0.98] whitespace-nowrap"
          >
            NPM ↗
          </a>
        </div>
      </div>

      {/* Main Live Telemetry Terminal */}
      <div className="space-y-4">
        <LiveTelemetryFeed />
      </div>

      {/* 2-Column Responsive Split (Stack on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <IncidentContainmentView />
        <EdgeMeshTopologyView />
      </div>
    </div>
  );
}

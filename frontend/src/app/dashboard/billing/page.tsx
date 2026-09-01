"use client";

import React, { useState, useEffect } from "react";

interface UsageStats {
  tenant_id: string;
  plan: string;
  used_requests: number;
  limit: number;
  active_policies: number;
  latency_overhead_ms: number;
}

export default function SaaSMetricsPage() {
  const [stats, setStats] = useState<UsageStats>({
    tenant_id: "tenant_vbb99x",
    plan: "Enterprise eBPF Mesh",
    used_requests: 18420,
    limit: 50000,
    active_policies: 12,
    latency_overhead_ms: 0.14,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.ksec.space";

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/v1/billing/usage`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch billing usage", err);
      }
    };
    fetchUsage();
  }, [apiUrl]);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_tier: "enterprise" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const percentage = Math.min(100, Math.round((stats.used_requests / stats.limit) * 100));

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 font-mono">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-wider text-cyan-400 uppercase">
              KSEC // SaaS Billing &amp; Usage Metering
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Usage-based metering, Redis token bucket quota limits, and Stripe billing lifecycle
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded border border-purple-800 bg-purple-950/40 text-purple-400 font-semibold">
            PLAN: {stats.plan}
          </span>
        </div>
      </div>

      {/* Quota Progress Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-6 shadow-2xl backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xs sm:text-sm font-semibold text-zinc-300 uppercase tracking-wide">
              Monthly Ingestion Quota
            </h2>
            <p className="text-xs text-zinc-500">
              Tenant ID: <span className="text-cyan-400">{stats.tenant_id}</span>
            </p>
          </div>
          <div className="text-right sm:text-right">
            <span className="text-lg sm:text-xl font-bold text-zinc-100">
              {stats.used_requests.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500"> / {stats.limit.toLocaleString()} Events</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-900 rounded-full h-3 sm:h-4 overflow-hidden border border-zinc-800">
          <div
            className={`h-full transition-all duration-500 ${
              percentage > 85
                ? "bg-rose-500 shadow-[0_0_12px_#f43f5e]"
                : percentage > 60
                ? "bg-amber-500 shadow-[0_0_12px_#f59e0b]"
                : "bg-cyan-500 shadow-[0_0_12px_#06b6d4]"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[11px] text-zinc-400 pt-1">
          <span>{percentage}% Quota Consumed</span>
          <span>{stats.limit - stats.used_requests} Events Remaining</span>
        </div>
      </div>

      {/* Pricing Tier Grid (Stack on Mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tier 1: Developer */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 space-y-4 flex flex-col justify-between shadow-xl">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-zinc-200 text-sm">Developer</h3>
              <span className="text-[10px] px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-400">
                Self-Hosted
              </span>
            </div>
            <div className="text-2xl font-bold text-zinc-100">
              $0 <span className="text-xs text-zinc-500 font-normal">/ month</span>
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>✓ Up to 10,000 events/mo</li>
              <li>✓ Single node local eBPF probe</li>
              <li>✓ Basic I2E intent leases</li>
              <li>✓ Community Slack support</li>
            </ul>
          </div>
          <button
            disabled
            className="w-full min-h-[44px] py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-500 text-xs font-semibold"
          >
            Current Baseline
          </button>
        </div>

        {/* Tier 2: Pro Mesh */}
        <div className="rounded-xl border border-cyan-800/80 bg-zinc-950/80 p-5 space-y-4 flex flex-col justify-between shadow-2xl relative">
          <div className="absolute -top-3 right-4 px-2 py-0.5 rounded-full bg-cyan-500 text-black font-bold text-[10px] uppercase tracking-wide">
            Popular
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-cyan-400 text-sm">Pro Mesh</h3>
              <span className="text-[10px] px-2 py-0.5 rounded border border-cyan-800 bg-cyan-950/60 text-cyan-300">
                Managed SaaS
              </span>
            </div>
            <div className="text-2xl font-bold text-cyan-300">
              $49 <span className="text-xs text-zinc-500 font-normal">/ month</span>
            </div>
            <ul className="space-y-2 text-xs text-zinc-300">
              <li>✓ Up to 500,000 events/mo</li>
              <li>✓ Multi-node gRPC telemetry mesh</li>
              <li>✓ Gemini NLP Policy Compiler</li>
              <li>✓ cgroupv2 auto-freeze incident guard</li>
              <li>✓ 99.9% uptime SLA</li>
            </ul>
          </div>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full min-h-[44px] py-2.5 rounded-lg border border-cyan-500 bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-300 text-xs font-bold transition shadow-[0_0_10px_rgba(6,182,212,0.2)] active:scale-[0.98]"
          >
            {loading ? "Redirecting..." : "Upgrade with Stripe"}
          </button>
        </div>

        {/* Tier 3: Enterprise */}
        <div className="rounded-xl border border-purple-800/80 bg-zinc-950/60 p-5 space-y-4 flex flex-col justify-between shadow-xl">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-purple-400 text-sm">Enterprise</h3>
              <span className="text-[10px] px-2 py-0.5 rounded border border-purple-800 bg-purple-950/60 text-purple-300">
                Custom SLA
              </span>
            </div>
            <div className="text-2xl font-bold text-purple-300">
              $299 <span className="text-xs text-zinc-500 font-normal">/ month</span>
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>✓ Unlimited eBPF events (ClickHouse)</li>
              <li>✓ Hierarchical Enterprise Swarm</li>
              <li>✓ SOC2 Type II Audit Manifests</li>
              <li>✓ Dedicated Cloudflare Tunnel Ingress</li>
              <li>✓ 24/7 Dedicated kernel engineer</li>
            </ul>
          </div>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full min-h-[44px] py-2.5 rounded-lg border border-purple-500 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold transition shadow-[0_0_10px_rgba(168,85,247,0.2)] active:scale-[0.98]"
          >
            Contact Sales / Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}

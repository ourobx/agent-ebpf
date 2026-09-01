"use client";

import React, { useState } from "react";

interface CompiledResult {
  policy_id: string;
  rule_name: string;
  target_comm: string;
  allowed_ports: number[];
  protocol: string;
  action: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  rationale: string;
}

export default function AIPolicyCreatorPage() {
  const [inputPrompt, setInputPrompt] = useState(
    "Allow python3 agent to access only port 443 outbound, and block all other connections."
  );
  const [loading, setLoading] = useState(false);
  const [compiledResult, setCompiledResult] = useState<CompiledResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.ksec.space";

  const handleCompile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;

    setLoading(true);
    setError(null);
    setCompiledResult(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("ksec_token") : null;
      const res = await fetch(`${apiUrl}/api/v1/policy/compile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ natural_language_rule: inputPrompt }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to compile natural language policy.");
      }

      const data = await res.json();
      setCompiledResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during AI policy compilation.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "LOW":
        return "bg-emerald-950 text-emerald-400 border-emerald-800";
      case "MEDIUM":
        return "bg-amber-950 text-amber-400 border-amber-800";
      case "HIGH":
      case "CRITICAL":
        return "bg-rose-950 text-rose-400 border-rose-800";
      default:
        return "bg-zinc-900 text-zinc-300 border-zinc-700";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 text-zinc-100 font-mono">
      <div className="space-y-6 sm:space-y-8">
        {/* Page Header */}
        <div className="border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-wider text-cyan-400 uppercase">
              KSEC // AI Policy Compiler
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Describe security intent in plain English; Gemini structures and compiles directly into Ring-0 eBPF rules.
          </p>
        </div>

        {/* Prompt Input Form */}
        <form onSubmit={handleCompile} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-wide">
              Natural Language Security Intent
            </label>
            <textarea
              rows={3}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="e.g. Block all outbound shell spawning from netcat and bash, only permit node on port 5432."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 sm:p-4 text-base sm:text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 transition shadow-inner resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-h-[44px] bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500 text-cyan-400 px-6 py-2.5 rounded-lg text-xs font-bold transition shadow-[0_0_15px_rgba(6,182,212,0.15)] disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? "Compiling with Gemini..." : "⚡ Compile to eBPF Map Rule"}
          </button>
        </form>

        {error && (
          <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800 text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* Compiled Result Card */}
        {compiledResult && (
          <div className="rounded-xl border border-emerald-800/60 bg-zinc-950 p-4 sm:p-6 space-y-4 shadow-2xl backdrop-blur">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-3 gap-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span>✅</span> Compilation Succeeded (Ready for Kernel Enforcement)
              </span>
              <span
                className={`w-fit text-[10px] border px-2 py-0.5 rounded font-bold ${getRiskBadgeColor(
                  compiledResult.risk_level
                )}`}
              >
                Risk Rating: {compiledResult.risk_level}
              </span>
            </div>

            {/* Responsive 1 col (mobile) -> 2 cols (tablet/desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
              <div className="flex justify-between sm:block">
                <span className="text-zinc-500">Policy ID: </span>
                <span className="text-cyan-400 font-bold">{compiledResult.policy_id}</span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="text-zinc-500">Target Comm: </span>
                <span className="text-amber-300 font-bold">{compiledResult.target_comm}</span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="text-zinc-500">Action: </span>
                <span className="text-emerald-400 font-bold">{compiledResult.action}</span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="text-zinc-500">Allowed Ports: </span>
                <span className="text-zinc-200">
                  {compiledResult.allowed_ports.length > 0
                    ? compiledResult.allowed_ports.join(", ")
                    : "None (Strict Drop)"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 leading-relaxed">
              <strong className="text-zinc-300">AI Rationale:</strong> {compiledResult.rationale}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";

interface CompiledRule {
  id: string;
  name: string;
  target_comm: string;
  allowed_ports: number[];
  action: string;
  risk_score: number;
  explanation: string;
}

interface CompilationResult {
  natural_query: string;
  rules: CompiledRule[];
  overall_safety_rating: string;
  warnings: string[];
}

export default function NlpPolicyCompiler() {
  const [prompt, setPrompt] = useState<string>(
    "Allow python3 to connect to ports 443 and 8000, drop all other traffic"
  );
  const [result, setResult] = useState<CompilationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [applyStatus, setApplyStatus] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.ksec.space";

  const handleCompile = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setApplyStatus(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/compiler/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: prompt }),
      });

      if (!res.ok) throw new Error("Compilation error");
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      alert("Failed to compile natural language policy.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (rule: CompiledRule) => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/compiler/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rule, pid: 0 }),
      });
      if (!res.ok) throw new Error("Apply failed");
      setApplyStatus(`[OK] Rule ${rule.id} applied to active eBPF kernel maps.`);
    } catch (err: any) {
      setApplyStatus(`[ERROR] Failed to apply rule: ${err.message}`);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-6 shadow-2xl backdrop-blur font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 mb-4 gap-2">
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <span>🧠</span> Natural Language Policy Compiler (NLP-to-eBPF)
          </h2>
          <p className="text-zinc-500 text-[11px] mt-0.5">
            Converts plain English security intents into typed eBPF map rules.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-zinc-400 mb-1.5 font-semibold text-[11px]">Security Intent Prompt</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Block all outbound connections from netcat and bash shells"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-base sm:text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 transition min-h-[44px]"
            />
            <button
              onClick={handleCompile}
              disabled={loading}
              className="w-full sm:w-auto min-h-[44px] bg-cyan-600/30 hover:bg-cyan-600/40 border border-cyan-500 text-cyan-300 font-bold px-5 py-2.5 rounded-lg transition disabled:opacity-50 text-xs active:scale-[0.98]"
            >
              {loading ? "Compiling..." : "Compile to eBPF"}
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-4 p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">
                Safety Rating:{" "}
                <span
                  className={`font-bold ${
                    result.overall_safety_rating === "SECURE"
                      ? "text-emerald-400"
                      : result.overall_safety_rating === "MODERATE"
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {result.overall_safety_rating}
                </span>
              </span>
            </div>

            {result.warnings.length > 0 && (
              <div className="p-3 bg-amber-950/30 border border-amber-800/80 rounded-lg text-amber-300 space-y-1">
                {result.warnings.map((w, idx) => (
                  <div key={idx}>⚠️ {w}</div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {result.rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-zinc-200">{rule.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          rule.action === "ALLOW"
                            ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                            : "bg-rose-950 text-rose-400 border-rose-800"
                        }`}
                      >
                        {rule.action}
                      </span>
                      <span className="text-zinc-500 text-[10px]">Risk: {rule.risk_score}/100</span>
                    </div>
                    <p className="text-zinc-400 text-[11px]">{rule.explanation}</p>
                  </div>
                  <button
                    onClick={() => handleApply(rule)}
                    className="w-full sm:w-auto bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500 text-emerald-400 px-3 py-1.5 rounded-lg font-bold transition text-xs whitespace-nowrap"
                  >
                    Apply to Kernel Map
                  </button>
                </div>
              ))}
            </div>

            {applyStatus && (
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 font-semibold text-xs">
                {applyStatus}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";

interface PolicyItem {
  id: string;
  name: string;
  target_comm: string;
  allowed_ports: number[];
  action: "ALLOW" | "DENY";
  status: "ACTIVE" | "SUSPENDED";
}

interface IntentLeasePayload {
  intent_id: string;
  pid: number;
  action: "ALLOW" | "DENY";
}

export default function PolicyManagementPage() {
  const [policies, setPolicies] = useState<PolicyItem[]>([
    {
      id: "intent-net-01",
      name: "AI Agent Outbound Restrictions",
      target_comm: "python3",
      allowed_ports: [443, 80, 8000, 5432],
      action: "ALLOW",
      status: "ACTIVE",
    },
    {
      id: "intent-exec-02",
      name: "Block Unauthorized Shell Spawning",
      target_comm: "nc",
      allowed_ports: [],
      action: "DENY",
      status: "ACTIVE",
    },
    {
      id: "intent-db-03",
      name: "Enforce Read-Only Database Leases",
      target_comm: "node",
      allowed_ports: [5432],
      action: "ALLOW",
      status: "ACTIVE",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [targetPid, setTargetPid] = useState<string>("");
  const [selectedIntent, setSelectedIntent] = useState<string>("intent-net-01");
  const [logMessage, setLogMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.ksec.space";

  const handleGrantIntent = async (action: "ALLOW" | "DENY") => {
    if (!targetPid || isNaN(parseInt(targetPid, 10))) {
      alert("Please enter a valid numeric Target Process PID.");
      return;
    }

    setLoading(true);
    setLogMessage(null);

    try {
      const payload: IntentLeasePayload = {
        intent_id: selectedIntent,
        pid: parseInt(targetPid, 10),
        action: action,
      };

      const res = await fetch(`${apiUrl}/api/v1/intent/lease`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to update kernel policy map.");
      }

      const data = await res.json();
      setLogMessage({
        text: `[OK] Granted ${data.intent_id} (PID: ${data.pid}) with kernel action [${action}].`,
        isError: false,
      });
      setTargetPid("");
    } catch (err: any) {
      setLogMessage({
        text: `[ERROR] ${err.message || "Connection error reaching control plane."}`,
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 sm:pb-16 space-y-8 font-mono">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-wider text-cyan-400 uppercase">
              KSEC // Intent &amp; Policy Engine
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Real-time eBPF cgroupv2 enforcement &amp; Intent-to-Execution (I2E) Protocol Management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded border border-emerald-800 bg-emerald-950/40 text-emerald-400 font-semibold">
            ● KERNEL MAP: ENFORCED
          </span>
        </div>
      </div>

      {/* Instant Intent Lease Dispatcher */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-6 shadow-2xl backdrop-blur space-y-4">
        <h2 className="text-xs sm:text-sm font-semibold text-zinc-300 uppercase tracking-wide flex items-center gap-2">
          <span>⚡</span> Instant Intent Lease Dispatcher
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-semibold">Select Policy Rule</label>
            <select
              value={selectedIntent}
              onChange={(e) => setSelectedIntent(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-base sm:text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 transition min-h-[44px]"
            >
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-semibold">Target Process PID</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 4210"
              value={targetPid}
              onChange={(e) => setTargetPid(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-base sm:text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 transition min-h-[44px]"
            />
          </div>

          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <button
              type="button"
              onClick={() => handleGrantIntent("ALLOW")}
              disabled={loading}
              className="flex-1 min-h-[44px] bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500 text-emerald-400 py-2.5 rounded-lg text-xs font-bold transition disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? "Syncing..." : "GRANT (ALLOW)"}
            </button>
            <button
              type="button"
              onClick={() => handleGrantIntent("DENY")}
              disabled={loading}
              className="flex-1 min-h-[44px] bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500 text-rose-400 py-2.5 rounded-lg text-xs font-bold transition disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? "Syncing..." : "REVOKE (DENY)"}
            </button>
          </div>
        </div>

        {logMessage && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs border ${
              logMessage.isError
                ? "bg-rose-950/40 border-rose-800 text-rose-300"
                : "bg-emerald-950/40 border-emerald-800 text-emerald-300"
            }`}
          >
            {logMessage.text}
          </div>
        )}
      </div>

      {/* Active eBPF Kernel Policies */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden shadow-2xl backdrop-blur">
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-300 uppercase tracking-wide">
            Active Kernel Policies (eBPF Maps)
          </h2>
          <span className="text-xs text-zinc-500">[{policies.length} Rules Bound]</span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4 font-semibold">POLICY ID</th>
                <th className="py-3 px-4 font-semibold">NAME</th>
                <th className="py-3 px-4 font-semibold">TARGET COMM</th>
                <th className="py-3 px-4 font-semibold">ALLOWED PORTS</th>
                <th className="py-3 px-4 font-semibold">DEFAULT ACTION</th>
                <th className="py-3 px-4 font-semibold text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {policies.map((policy) => (
                <tr key={policy.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-cyan-400">{policy.id}</td>
                  <td className="py-3 px-4 text-zinc-200">{policy.name}</td>
                  <td className="py-3 px-4 text-amber-300">{policy.target_comm}</td>
                  <td className="py-3 px-4 text-zinc-400">
                    {policy.allowed_ports.length > 0
                      ? policy.allowed_ports.join(", ")
                      : "None (Strict Drop)"}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        policy.action === "ALLOW"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                          : "bg-rose-950 text-rose-400 border-rose-800"
                      }`}
                    >
                      {policy.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-emerald-500 font-semibold">● {policy.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Policy Card List */}
        <div className="md:hidden divide-y divide-zinc-900 p-3 space-y-3">
          {policies.map((policy) => (
            <div key={policy.id} className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-cyan-400">{policy.id}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    policy.action === "ALLOW"
                      ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                      : "bg-rose-950 text-rose-400 border-rose-800"
                  }`}
                >
                  {policy.action}
                </span>
              </div>
              <div className="text-zinc-200 font-semibold">{policy.name}</div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500">Target Comm:</span>
                <span className="text-amber-300">{policy.target_comm}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500">Allowed Ports:</span>
                <span className="text-zinc-300">
                  {policy.allowed_ports.length > 0 ? policy.allowed_ports.join(", ") : "Strict Drop"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

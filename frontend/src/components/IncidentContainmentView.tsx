"use client";

import React, { useState, useEffect, useCallback } from "react";

interface IncidentReport {
  incident_id: string;
  pid: number;
  comm: string;
  reason: string;
  timestamp_ns: number;
  action_taken: string;
  forensics_snapshot: Record<string, unknown>;
  status: string;
}

export default function IncidentContainmentView() {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [targetPid, setTargetPid] = useState<string>("");
  const [reason, setReason] = useState<string>("Suspicious outbound TCP beaconing");
  const [loading, setLoading] = useState<boolean>(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.ksec.space";

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/containment/incidents`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch (err) {
      console.error("Failed to fetch incident containment records", err);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const handleIsolate = async () => {
    if (!targetPid) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/containment/isolate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid: parseInt(targetPid, 10), comm: "untrusted_proc", reason }),
      });
      if (res.ok) {
        setTargetPid("");
        fetchIncidents();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (incidentId: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/containment/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incidentId }),
      });
      if (res.ok) {
        fetchIncidents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-6 shadow-2xl backdrop-blur font-mono text-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-2">
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
            <span>🚨</span> Self-Healing Incident Containment
          </h2>
          <p className="text-zinc-500 text-[11px] mt-0.5">
            Automated cgroupv2 freeze (SIGSTOP) and live forensic snapshotting.
          </p>
        </div>
        <span className="w-fit px-2 py-0.5 rounded border border-rose-800 bg-rose-950/40 text-rose-400 font-semibold text-[10px]">
          ACTIVE CONTAINMENT
        </span>
      </div>

      {/* Manual Quarantine Trigger Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-zinc-400 mb-1 font-semibold text-[11px]">Process PID to Quarantine</label>
          <input
            type="number"
            inputMode="numeric"
            value={targetPid}
            onChange={(e) => setTargetPid(e.target.value)}
            placeholder="e.g. 5124"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-rose-500 transition text-base sm:text-xs min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-zinc-400 mb-1 font-semibold text-[11px]">Quarantine Rationale</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-rose-500 transition text-base sm:text-xs min-h-[44px]"
          />
        </div>
        <button
          onClick={handleIsolate}
          disabled={loading}
          className="w-full min-h-[44px] bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500 text-rose-300 font-bold py-2.5 rounded-lg transition disabled:opacity-50 text-xs sm:col-span-2 lg:col-span-1 active:scale-[0.98]"
        >
          {loading ? "Freezing..." : "Execute Quarantine (SIGSTOP)"}
        </button>
      </div>

      {/* Desktop Containment Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="py-2.5 px-3 font-semibold">INCIDENT ID</th>
              <th className="py-2.5 px-3 font-semibold">PID</th>
              <th className="py-2.5 px-3 font-semibold">COMM</th>
              <th className="py-2.5 px-3 font-semibold">ACTION TAKEN</th>
              <th className="py-2.5 px-3 font-semibold">REASON</th>
              <th className="py-2.5 px-3 font-semibold text-right">CONTROLS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-zinc-600">
                  No active process quarantine incidents. Kernel defense status nominal.
                </td>
              </tr>
            ) : (
              incidents.map((inc) => (
                <tr key={inc.incident_id} className="hover:bg-zinc-900/30 transition">
                  <td className="py-2.5 px-3 font-bold text-rose-400">{inc.incident_id}</td>
                  <td className="py-2.5 px-3 text-cyan-400 font-bold">{inc.pid}</td>
                  <td className="py-2.5 px-3 text-zinc-200">{inc.comm}</td>
                  <td className="py-2.5 px-3 text-amber-300">{inc.action_taken}</td>
                  <td className="py-2.5 px-3 text-zinc-400">{inc.reason}</td>
                  <td className="py-2.5 px-3 text-right">
                    {inc.status === "CONTAINED" ? (
                      <button
                        onClick={() => handleRelease(inc.incident_id)}
                        className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-400 px-2.5 py-1 rounded text-[11px] font-bold transition"
                      >
                        Unfreeze (SIGCONT)
                      </button>
                    ) : (
                      <span className="text-zinc-500">RELEASED</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Containment Cards */}
      <div className="md:hidden divide-y divide-zinc-900 space-y-3">
        {incidents.length === 0 ? (
          <div className="py-4 text-center text-zinc-600 text-xs">
            No active process quarantine incidents.
          </div>
        ) : (
          incidents.map((inc) => (
            <div key={inc.incident_id} className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-rose-400 text-xs">{inc.incident_id}</span>
                <span className="text-cyan-400 font-bold">PID {inc.pid}</span>
              </div>
              <div className="text-zinc-300">
                <span className="text-zinc-500">Binary:</span> {inc.comm}
              </div>
              <div className="text-zinc-400 text-[11px] break-words">
                <span className="text-zinc-500">Reason:</span> {inc.reason}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-zinc-850">
                <span className="text-amber-300 text-[10px]">{inc.action_taken}</span>
                {inc.status === "CONTAINED" ? (
                  <button
                    onClick={() => handleRelease(inc.incident_id)}
                    className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-400 px-3.5 py-2 rounded-lg text-xs font-bold transition min-h-[40px] active:scale-[0.98]"
                  >
                    Unfreeze (SIGCONT)
                  </button>
                ) : (
                  <span className="text-zinc-500 text-[11px]">RELEASED</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

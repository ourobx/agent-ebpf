"use client";

import React, { useState } from "react";
import { useEbpfStream, EbpfEvent } from "@/hooks/use-ebpf-stream";

const SEVERITY_STYLES: Record<EbpfEvent["severity"], string> = {
  INFO: "text-emerald-400 bg-emerald-950/40 border-emerald-800",
  WARN: "text-amber-400 bg-amber-950/40 border-amber-800",
  CRIT: "text-rose-400 bg-rose-950/40 border-rose-800",
};

export default function LiveTelemetryFeed() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.ksec.space";
  const { events, isConnected, clearEvents } = useEbpfStream(`${apiUrl}/api/v1/telemetry/stream`);
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");

  const filteredEvents = events.filter((ev) => {
    if (filterSeverity === "ALL") return true;
    return ev.severity === filterSeverity;
  });

  return (
    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 font-mono text-xs shadow-2xl backdrop-blur overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-900/60 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={`h-2.5 w-2.5 rounded-full transition-all ${
              isConnected
                ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                : "bg-rose-500 animate-pulse"
            }`}
          />
          <span className="font-semibold tracking-wider text-zinc-200 uppercase text-xs sm:text-sm">
            Kernel Telemetry Stream
          </span>
          <span className="text-zinc-500 text-[11px]">[{events.length} events buffered]</span>
        </div>

        {/* Action Controls for Mobile & Desktop */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="flex-1 sm:flex-none bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 text-xs focus:outline-none focus:border-cyan-500 min-h-[40px]"
          >
            <option value="ALL">All Severities</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="CRIT">CRIT</option>
          </select>
          <button
            onClick={clearEvents}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition text-xs font-semibold min-h-[40px] active:scale-[0.98]"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Desktop Table View (Hidden on Small Mobile) */}
      <div className="hidden md:block max-h-[500px] overflow-y-auto overflow-x-auto divide-y divide-zinc-900">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-zinc-950 text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="py-2.5 px-4 font-semibold">TIME</th>
              <th className="py-2.5 px-4 font-semibold">PID</th>
              <th className="py-2.5 px-4 font-semibold">COMM</th>
              <th className="py-2.5 px-4 font-semibold">HOOK / SYSCALL</th>
              <th className="py-2.5 px-4 font-semibold">PAYLOAD DETAILS</th>
              <th className="py-2.5 px-4 font-semibold text-right">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/60">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-600">
                  {isConnected ? "Awaiting eBPF kernel events..." : "Connecting to telemetry daemon..."}
                </td>
              </tr>
            ) : (
              filteredEvents.map((ev, idx) => (
                <tr key={`${ev.timestamp}-${idx}`} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="py-2.5 px-4 text-zinc-500 whitespace-nowrap">
                    {ev.timestamp.split("T")[1]?.slice(0, 12) || ev.timestamp}
                  </td>
                  <td className="py-2.5 px-4 text-cyan-400 font-bold">{ev.pid}</td>
                  <td className="py-2.5 px-4 text-zinc-200">{ev.comm}</td>
                  <td className="py-2.5 px-4 text-amber-300">
                    <span className="text-zinc-500">{ev.event_type}:</span> {ev.syscall}
                  </td>
                  <td className="py-2.5 px-4 text-zinc-400 truncate max-w-xs xl:max-w-md">
                    {JSON.stringify(ev.details)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <span
                      className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                        SEVERITY_STYLES[ev.severity]
                      }`}
                    >
                      {ev.severity}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Feed View (Shown on Screens < 768px) */}
      <div className="md:hidden max-h-[500px] overflow-y-auto divide-y divide-zinc-900 p-3 space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="py-8 text-center text-zinc-600 text-xs">
            {isConnected ? "Awaiting eBPF kernel events..." : "Connecting to telemetry daemon..."}
          </div>
        ) : (
          filteredEvents.map((ev, idx) => (
            <div
              key={`${ev.timestamp}-${idx}`}
              className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-2 text-xs"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold">PID {ev.pid}</span>
                  <span className="text-zinc-300 font-semibold">({ev.comm})</span>
                </div>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                    SEVERITY_STYLES[ev.severity]
                  }`}
                >
                  {ev.severity}
                </span>
              </div>

              <div className="text-amber-300 text-[11px]">
                <span className="text-zinc-500">{ev.event_type} →</span> {ev.syscall}
              </div>

              {ev.details && Object.keys(ev.details).length > 0 && (
                <div className="p-2 rounded bg-black/60 border border-zinc-800/60 text-[10px] text-zinc-400 break-all">
                  {JSON.stringify(ev.details)}
                </div>
              )}

              <div className="text-[10px] text-zinc-500 text-right">
                {ev.timestamp.split("T")[1]?.slice(0, 12) || ev.timestamp}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

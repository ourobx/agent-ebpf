"use client";

import React, { useState } from "react";

interface SwarmEvent {
  timestamp: string;
  meta_agent_id: string;
  active_sub_agent?: string;
  step_type: "THOUGHT" | "DELEGATION" | "EXECUTION" | "RESULT" | "COMPLETE" | string;
  content: string;
  status: string;
}

export default function EnterpriseSwarmPage() {
  const [objective, setObjective] = useState(
    "Perform automated eBPF security audit, inspect Stripe monthly telemetry quotas, and verify Cloudflare ingress tunnels."
  );
  const [events, setEvents] = useState<SwarmEvent[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [finalSummary, setFinalSummary] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.ksec.space";

  const startSwarmOrchestration = async () => {
    setIsRunning(true);
    setEvents([]);
    setFinalSummary(null);

    const payload = {
      meta_agent_id: "CEO-MetaAgent-01",
      objective: objective,
      sub_agents: [
        {
          agent_id: "sec-agent-01",
          role: "SECURITY",
          model: "gemini-2.5-flash",
          system_prompt: "eBPF kernel probe verification and cgroupv2 policy enforcement.",
        },
        {
          agent_id: "fin-agent-01",
          role: "FINANCE",
          model: "gemini-2.5-flash",
          system_prompt: "Stripe subscription metering and quota consumption validation.",
        },
        {
          agent_id: "dev-agent-01",
          role: "DEVOPS",
          model: "gemini-2.5-flash",
          system_prompt: "Cloudflare tunnel latency optimization and multi-stage Docker deployment.",
        },
      ],
    };

    try {
      const response = await fetch(`${apiUrl}/api/v1/swarm/orchestrate/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.body) throw new Error("Failed to open recursive SSE stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("event: swarm_step")) {
            const dataStr = line.replace("event: swarm_step\ndata: ", "");
            if (dataStr) {
              try {
                const eventObj: SwarmEvent = JSON.parse(dataStr);
                setEvents((prev) => [...prev, eventObj]);
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          } else if (line.startsWith("event: swarm_complete")) {
            const dataStr = line.replace("event: swarm_complete\ndata: ", "");
            if (dataStr) {
              try {
                const completeObj = JSON.parse(dataStr);
                setFinalSummary(completeObj.summary);
              } catch (e) {
                console.error("Parse complete error:", e);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Swarm stream error:", err);
    } finally {
      setIsRunning(false);
    }
  };

  const getStepBadgeColor = (step: string) => {
    switch (step) {
      case "THOUGHT":
        return "bg-cyan-950 text-cyan-300 border-cyan-800";
      case "DELEGATION":
        return "bg-purple-950 text-purple-300 border-purple-800";
      case "EXECUTION":
        return "bg-amber-950 text-amber-300 border-amber-800 animate-pulse";
      case "RESULT":
        return "bg-emerald-950 text-emerald-300 border-emerald-800";
      default:
        return "bg-zinc-900 text-zinc-300 border-zinc-700";
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 text-zinc-100 font-mono space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-wider text-cyan-400 uppercase">
              KSEC // Enterprise Swarm
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Hierarchical Meta-Agent delegating strategic objectives to specialized sub-agents over live SSE.
          </p>
        </div>
        <span className="w-fit text-xs px-2.5 py-1 rounded border border-purple-800 bg-purple-950/40 text-purple-400 font-semibold">
          ● FRACTAL MULTI-AGENT SWARM
        </span>
      </div>

      {/* Strategic Objective Console */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-6 space-y-4 shadow-2xl backdrop-blur">
        <label className="block text-xs text-zinc-400 uppercase tracking-wide font-semibold">
          Strategic Company Objective (Executive Intent)
        </label>
        <textarea
          rows={2}
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          disabled={isRunning}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-base sm:text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 transition resize-none"
        />
        <button
          onClick={startSwarmOrchestration}
          disabled={isRunning}
          className="w-full sm:w-auto min-h-[44px] bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500 text-cyan-400 px-6 py-2.5 rounded-lg text-xs font-bold transition shadow-[0_0_15px_rgba(6,182,212,0.15)] disabled:opacity-50 active:scale-[0.98]"
        >
          {isRunning ? "🚀 Swarm Coordinating Enterprise..." : "⚡ Launch Enterprise Swarm Operation"}
        </button>
      </div>

      {/* Live Swarm Execution Stream */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-6 space-y-4 shadow-2xl backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-3 gap-2">
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-300 uppercase tracking-wide flex items-center gap-2">
            <span>📡</span> Hierarchical Swarm Live Stream (Recursive SSE)
          </h2>
          <span className="text-zinc-500 text-[11px]">[{events.length} Steps Logged]</span>
        </div>

        <div className="max-h-[500px] overflow-y-auto space-y-3 font-mono text-xs divide-y divide-zinc-900">
          {events.length === 0 ? (
            <div className="py-12 text-center text-zinc-600">
              Awaiting strategic command to launch fractal multi-agent operations...
            </div>
          ) : (
            events.map((ev, i) => (
              <div key={i} className="pt-3 flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                <span className="text-zinc-500 text-[10px] sm:text-[11px] whitespace-nowrap">
                  {ev.timestamp.split("T")[1]?.slice(0, 8) || ev.timestamp}
                </span>
                <div className="space-y-1 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-cyan-400 font-bold">[{ev.meta_agent_id}]</span>
                    {ev.active_sub_agent && (
                      <span className="bg-purple-950/60 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        Sub-Agent: {ev.active_sub_agent}
                      </span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStepBadgeColor(
                        ev.step_type
                      )}`}
                    >
                      {ev.step_type}
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs break-words">{ev.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {finalSummary && (
          <div className="mt-4 p-4 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <span>🏆</span> {finalSummary}
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';

export const PerformanceRibbon: React.FC = React.memo(() => {
  return (
    <section id="benchmarks" className="border-y border-[#1C1C1C] bg-[#050505] py-8 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 divide-y lg:divide-y-0 lg:divide-x divide-white/5 font-mono">
          {/* Metric 1 */}
          <div className="flex flex-col gap-1 pt-4 lg:pt-0 lg:px-6 first:pl-0">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Packet &amp; Tool Throughput
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl lg:text-4xl font-bold text-white tabular-nums tracking-tight">
                1.42 Mpps
              </span>
              <span className="text-xs text-emerald-400 font-bold">Line Rate</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Native XDP Hook // Zero RingBuffer Loss
            </span>
          </div>

          {/* Metric 2 */}
          <div className="flex flex-col gap-1 pt-4 lg:pt-0 lg:px-6">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Deterministic P99 Latency
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl lg:text-4xl font-bold text-cyan-400 tabular-nums tracking-tight">
                &lt;35 µs
              </span>
              <span className="text-xs text-cyan-300 font-semibold">p50: 14.1µs</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Jitter: ±1.2µs // In-Memory Verification
            </span>
          </div>

          {/* Metric 3 */}
          <div className="flex flex-col gap-1 pt-4 lg:pt-0 lg:px-6">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              In-Memory AST Guardrails
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl lg:text-4xl font-bold text-white tabular-nums tracking-tight">
                100%
              </span>
              <span className="text-xs text-indigo-400 font-bold">Deterministic</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Zero External API Dependency // Zero AI Latency
            </span>
          </div>

          {/* Metric 4 */}
          <div className="flex flex-col gap-1 pt-4 lg:pt-0 lg:px-6">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Host Resource Footprint
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl lg:text-4xl font-bold text-emerald-400 tabular-nums tracking-tight">
                &lt;0.02%
              </span>
              <span className="text-xs text-emerald-300 font-semibold">CPU Overhead</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Zero User-Space Context Switches
            </span>
          </div>
        </div>
      </div>
    </section>
  );
});

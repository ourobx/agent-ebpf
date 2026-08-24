import React from 'react';
import { LatencyHistogram } from '../telemetry/LatencyHistogram';

export const TelemetryEngineView: React.FC = React.memo(() => {
  return (
    <div className="flex flex-col gap-4 p-5 max-w-[1400px] w-full mx-auto font-sans text-xs">
      {/* Top Telemetry Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <h1 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            eBPF Ring-0 Kernel Telemetry &amp; XDP Engine
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            eBPF LSM: ATTACHED
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            Zero-Copy RingBuf: 4,096 KB
          </span>
        </div>
      </div>

      {/* 3-Column Core Telemetry Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[#0D111A] border border-white/10 rounded p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] uppercase">
            <span>Kernel Hook Latency</span>
            <span className="text-cyan-400">p99</span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">28.4 µs</span>
            <span className="text-[10px] font-mono text-slate-500 block mt-0.5">Median: 14.1 µs | Jitter: ±1.2 µs</span>
          </div>
          <div className="text-[9px] font-mono text-slate-400 border-t border-white/5 pt-1.5 flex justify-between">
            <span>Overhead: &lt;0.02% CPU</span>
            <span className="text-emerald-400">Deterministic</span>
          </div>
        </div>

        <div className="bg-[#0D111A] border border-white/10 rounded p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] uppercase">
            <span>XDP Packet Throughput</span>
            <span className="text-emerald-400">Line Rate</span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">1.42 Mpps</span>
            <span className="text-[10px] font-mono text-slate-500 block mt-0.5">Events: 42.8k EPS | Drops: 0</span>
          </div>
          <div className="text-[9px] font-mono text-slate-400 border-t border-white/5 pt-1.5 flex justify-between">
            <span>Driver: Native XDP</span>
            <span className="text-emerald-400">Zero Packet Loss</span>
          </div>
        </div>

        <div className="bg-[#0D111A] border border-white/10 rounded p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] uppercase">
            <span>BPF Maps Capacity</span>
            <span className="text-cyan-400">21.7% Used</span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">14,280</span>
            <span className="text-[10px] font-mono text-slate-500 block mt-0.5">Total Slots: 65,536 (LRU Hash)</span>
          </div>
          <div className="text-[9px] font-mono text-slate-400 border-t border-white/5 pt-1.5 flex justify-between">
            <span>Slab Memory: 4.2 MB</span>
            <span className="text-cyan-400">RingBuffer Active</span>
          </div>
        </div>
      </div>

      {/* Latency Distribution Histogram Section */}
      <div className="bg-[#0D111A] border border-white/10 rounded p-4">
        <LatencyHistogram />
      </div>

      {/* Active Kernel Probes Table */}
      <div className="bg-[#0D111A] border border-white/10 rounded overflow-hidden">
        <div className="px-3.5 py-2.5 bg-[#090D15] border-b border-white/10 flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Active Kernel Hooks &amp; Kprobes</span>
          <span className="text-slate-500 text-[10px]">4 Attached Probes</span>
        </div>
        <table className="w-full text-left font-mono text-xs text-slate-300">
          <thead className="bg-black/30 text-[10px] text-slate-500 uppercase border-b border-white/5">
            <tr>
              <th className="py-2 px-3.5">Probe Name</th>
              <th className="py-2 px-3.5">Type</th>
              <th className="py-2 px-3.5">Target / Syscall</th>
              <th className="py-2 px-3.5">Verifier Instructions</th>
              <th className="py-2 px-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-[11px]">
            <tr>
              <td className="py-2 px-3.5 font-bold text-cyan-400">ksec_xdp_ingress</td>
              <td className="py-2 px-3.5 text-slate-400">BPF_PROG_TYPE_XDP</td>
              <td className="py-2 px-3.5 text-slate-300">eth0:rx_queue_0</td>
              <td className="py-2 px-3.5 text-slate-400">842 insns</td>
              <td className="py-2 px-3.5 text-emerald-400 font-bold">ACTIVE (0 Drop)</td>
            </tr>
            <tr>
              <td className="py-2 px-3.5 font-bold text-cyan-400">ksec_sys_enter_connect</td>
              <td className="py-2 px-3.5 text-slate-400">BPF_PROG_TYPE_KPROBE</td>
              <td className="py-2 px-3.5 text-slate-300">__sys_connect</td>
              <td className="py-2 px-3.5 text-slate-400">1,420 insns</td>
              <td className="py-2 px-3.5 text-emerald-400 font-bold">ENFORCING</td>
            </tr>
            <tr>
              <td className="py-2 px-3.5 font-bold text-cyan-400">ksec_sock_ops_audit</td>
              <td className="py-2 px-3.5 text-slate-400">BPF_PROG_TYPE_SOCK_OPS</td>
              <td className="py-2 px-3.5 text-slate-300">tcp_v4_connect</td>
              <td className="py-2 px-3.5 text-slate-400">612 insns</td>
              <td className="py-2 px-3.5 text-emerald-400 font-bold">MONITORING</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});

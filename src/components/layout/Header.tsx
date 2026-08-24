import React, { useState } from 'react';
import { KsecLogo } from '../brand/KsecLogo';
import { KernelHealthPopover } from '../navigation/KernelHealthPopover';
import { ConnectionState } from '../../services/telemetryStream';
import { KernelHealthMetrics } from '../../types/telemetry';

interface HeaderProps {
  connectionState?: ConnectionState;
  p99LatencyUs?: number;
  kernelHealth?: KernelHealthMetrics | null;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  connectionState = 'CONNECTING',
  p99LatencyUs = 0,
  kernelHealth = null,
}) => {
  const [isHealthOpen, setIsHealthOpen] = useState(false);

  // Status chip rendering according to real connection state
  const renderStatusChip = () => {
    switch (connectionState) {
      case 'LIVE_STREAMING':
        return (
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            SHIELD: ENFORCING (Connected to Node us-east-1a)
          </div>
        );
      case 'CONNECTING':
      case 'RECONNECTING':
        return (
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-mono font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full border border-amber-400 border-t-transparent animate-spin" />
            KERNEL STREAM: CONNECTING...
          </div>
        );
      case 'OFFLINE':
      default:
        return (
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-mono font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            KERNEL TELEMETRY: OFFLINE (Check daemon)
          </div>
        );
    }
  };

  return (
    <header className="h-[52px] bg-[#070A0F] border-b border-white/10 px-5 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
      {/* Left: Logo & Enterprise Breadcrumbs */}
      <div className="flex items-center gap-4">
        <KsecLogo size={26} showText={false} className="lg:hidden" />
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="text-slate-500 font-sans font-medium">Cluster:</span>
          <span className="bg-[#0D111A] border border-white/10 px-1.5 py-0.5 rounded text-slate-200 font-semibold">
            us-east-1a
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-300">Node-04</span>
          <span className="text-slate-600">/</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            eBPF LSM (Enforcing)
          </span>
        </div>
      </div>

      {/* Center: Live Enforcing Status Pill & Quantile */}
      <div className="hidden md:flex items-center gap-3">
        {renderStatusChip()}
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[11px] font-mono font-semibold">
          p99: {p99LatencyUs > 0 ? `${p99LatencyUs.toFixed(1)}µs` : '0.0µs'}
        </div>
      </div>

      {/* Right: SOC-2 Cluster Selector, Kernel Health Trigger, User Profile */}
      <div className="flex items-center gap-2.5">
        <select
          className="bg-[#0D111A] border border-white/10 text-slate-200 text-xs rounded px-2.5 py-1 font-sans outline-none cursor-pointer hover:border-white/20 transition"
          aria-label="Cluster Selection"
        >
          <option value="prod_soc2">Enterprise Production [SOC-2 Type II]</option>
          <option value="eu_sovereign">EU-Central Sovereign [GDPR Enforced]</option>
          <option value="apac_core">APAC Tokyo Primary [PCI-DSS Level 1]</option>
        </select>

        {/* Ring-0 Kernel Health Matrix Trigger & Popover */}
        <div className="relative">
          <button
            onClick={() => setIsHealthOpen(!isHealthOpen)}
            className="px-2.5 py-1 rounded bg-[#0D111A] hover:bg-[#151D2F] border border-white/10 text-slate-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition"
            title="Inspect Ring-0 Kernel Health Matrix"
          >
            <span className={`w-2 h-2 rounded-full ${kernelHealth ? 'bg-cyan-400' : 'bg-slate-600'}`} />
            <span>Kernel Health</span>
          </button>

          <KernelHealthPopover
            metrics={kernelHealth}
            isOpen={isHealthOpen}
            onClose={() => setIsHealthOpen(false)}
          />
        </div>

        {/* User Identity Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-bold flex items-center justify-center">
            OP
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-[11px] font-semibold text-slate-200 leading-tight">SecOps Engineer</span>
            <span className="text-[9px] font-mono text-slate-500 leading-none">KSEC Operator</span>
          </div>
        </div>
      </div>
    </header>
  );
});

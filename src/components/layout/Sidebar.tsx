import React from 'react';
import { KsecLogo } from '../brand/KsecLogo';

interface SidebarProps {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  activeTab = 'overview',
  onSelectTab,
  className = '',
}) => {
  return (
    <aside className={`w-[250px] bg-[#0A0E18] border-r border-white/10 flex flex-col justify-between h-screen fixed top-0 bottom-0 left-0 z-50 ${className}`}>
      {/* Top Header Logo */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <KsecLogo size={26} />
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
          v2.4-eBPF
        </span>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 font-sans text-xs">
        <div className="flex flex-col gap-1">
          <span className="px-2 text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
            Kernel Mission Control
          </span>
          <button
            onClick={() => onSelectTab && onSelectTab('overview')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition font-medium ${
              activeTab === 'overview'
                ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Executive Overview</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">LIVE</span>
          </button>

          <button
            onClick={() => onSelectTab && onSelectTab('telemetry')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition font-medium ${
              activeTab === 'telemetry'
                ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span>eBPF Telemetry</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">Ring-0</span>
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <span className="px-2 text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
            Agent Guardrails &amp; AST
          </span>
          <button
            onClick={() => onSelectTab && onSelectTab('cognitive')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition font-medium ${
              activeTab === 'cognitive'
                ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Agent Tool Firewall</span>
            </div>
            <span className="text-[10px] font-mono text-indigo-400">AST</span>
          </button>

          <button
            onClick={() => onSelectTab && onSelectTab('events')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition font-medium ${
              activeTab === 'events'
                ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span>Live Event Tail</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Stream</span>
          </button>
        </div>
      </nav>

      {/* Sidebar User Profile (SecOps Operator) */}
      <div className="p-3 border-t border-white/5 flex items-center gap-2.5 bg-[#090D15]">
        <div className="w-7 h-7 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-mono text-[10px] font-bold text-cyan-400 flex-shrink-0">
          KS
        </div>
        <div className="flex flex-col truncate flex-1">
          <span className="font-mono text-xs font-semibold text-slate-200 truncate">SecOps Operator</span>
          <span className="text-[9px] font-mono text-slate-500 truncate">KSEC Enterprise // Node-04</span>
        </div>
      </div>
    </aside>
  );
});

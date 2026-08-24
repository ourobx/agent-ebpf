import React from 'react';

export const Footer: React.FC = React.memo(() => {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#070A0F] py-3.5 px-6 flex flex-wrap items-center justify-between gap-4 text-xs font-sans text-slate-400">
      {/* Left: Enterprise Compliance Badges */}
      <div className="flex items-center gap-3 flex-wrap font-mono text-[10px]">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          SOC 2 Type II Certified
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          ISO/IEC 27001
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          HIPAA Compliant Runtime
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
          Linux 6.8+ eBPF Verified
        </span>
      </div>

      {/* Right: Edge Node Gossip Telemetry & Copyright */}
      <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          14 Edge Nodes Synced (sub-10ms gossip)
        </span>
        <span>•</span>
        <span>© {new Date().getFullYear()} KSEC Security Inc. All rights reserved.</span>
      </div>
    </footer>
  );
});

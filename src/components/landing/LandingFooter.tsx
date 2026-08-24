import React from 'react';
import { KsecLogo } from '../brand/KsecLogo';

export const LandingFooter: React.FC = React.memo(() => {
  return (
    <footer className="bg-[#000000] border-t border-[#1C1C1C] pt-14 pb-10 text-xs font-sans text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Col 1: Brand & Identity */}
          <div className="col-span-2 flex flex-col gap-3">
            <KsecLogo size={28} showText={true} />
            <p className="text-slate-400 text-xs max-w-sm leading-relaxed mt-1">
              KSEC is the enterprise standard for Ring-0 Autonomous AI Defense. Hardware-isolated eBPF runtime security for Fortune 500 LLM agents and multi-tenant databases.
            </p>
            <div className="flex items-center gap-2 mt-2 font-mono text-[11px] text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational // 14 Global Nodes</span>
            </div>
          </div>

          {/* Col 2: Platform */}
          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">Platform</span>
            <a href="#architecture" className="hover:text-cyan-400 transition">eBPF Ring-0 Engine</a>
            <a href="#architecture" className="hover:text-cyan-400 transition">LSM Syscall Interceptor</a>
            <a href="#platform" className="hover:text-cyan-400 transition">AST Guardrail Cache</a>
            <a href="#benchmarks" className="hover:text-cyan-400 transition">Native XDP Line-Rate</a>
          </div>

          {/* Col 3: Architecture & Security */}
          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">Architecture</span>
            <a href="#architecture" className="hover:text-cyan-400 transition">Ed25519 Intent Leases</a>
            <a href="#architecture" className="hover:text-cyan-400 transition">PostgreSQL RLS Guard</a>
            <a href="#compliance" className="hover:text-cyan-400 transition">SOC-2 Type II Compliance</a>
            <a href="#compliance" className="hover:text-cyan-400 transition">ISO/IEC 27001 Standard</a>
          </div>

          {/* Col 4: Resources & SDKs */}
          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">Developers</span>
            <a href="index.html" className="hover:text-cyan-400 transition">Live Mission Control</a>
            <a href="https://github.com/ourobx/agent-ebpf" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition">GitHub Repository</a>
            <a href="#" className="hover:text-cyan-400 transition">TypeScript SDK (@ourobx)</a>
            <a href="#" className="hover:text-cyan-400 transition">MCP Server Integration</a>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>© 2026 KSEC Security Inc. All rights reserved.</span>
            <span>•</span>
            <span className="text-emerald-400/80">SOC-2 Type II Certified</span>
          </div>

          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-300 transition">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300 transition">Terms of Service</a>
            <a href="#" className="hover:text-slate-300 transition">Security Disclosure</a>
          </div>
        </div>
      </div>
    </footer>
  );
});

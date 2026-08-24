import React from 'react';

export const TrustMatrix: React.FC = React.memo(() => {
  return (
    <section id="compliance" className="py-20 bg-[#000000] border-t border-[#1C1C1C] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 mb-3">
            <span>ENTERPRISE COMPLIANCE &amp; GOVERNANCE</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-sans">
            Built for Global Regulated &amp; Fortune 500 Infrastructure
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 font-sans">
            Cryptographic assurance, mathematical determinism, and immutable audit logs that pass rigorous SOC-2 Type II, ISO 27001, and HIPAA audits.
          </p>
        </div>

        {/* Compliance Badges Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-lg p-5 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm mb-3">
              SOC
            </div>
            <h3 className="font-sans font-bold text-sm text-white">SOC 2 Type II</h3>
            <span className="text-[11px] font-mono text-slate-400 mt-1">Continuous Security Audit Certified</span>
          </div>

          <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-lg p-5 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm mb-3">
              ISO
            </div>
            <h3 className="font-sans font-bold text-sm text-white">ISO/IEC 27001</h3>
            <span className="text-[11px] font-mono text-slate-400 mt-1">Information Security Standard</span>
          </div>

          <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-lg p-5 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-mono font-bold text-sm mb-3">
              HIP
            </div>
            <h3 className="font-sans font-bold text-sm text-white">HIPAA &amp; GDPR</h3>
            <span className="text-[11px] font-mono text-slate-400 mt-1">Hardware Tenant Isolation</span>
          </div>

          <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-lg p-5 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-sm mb-3">
              FIPS
            </div>
            <h3 className="font-sans font-bold text-sm text-white">FIPS 140-3</h3>
            <span className="text-[11px] font-mono text-slate-400 mt-1">Ed25519 Cryptographic Vault</span>
          </div>
        </div>

        {/* Quantifiable ROI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
          <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-6 flex flex-col justify-between">
            <div>
              <span className="text-4xl font-bold text-emerald-400 tabular-nums">99.999%</span>
              <h4 className="text-sm font-sans font-bold text-white mt-2">Ring-0 Kernel Availability</h4>
              <p className="text-xs font-sans text-slate-400 mt-1 leading-relaxed">
                Kernel JIT bytecode verifier guarantees zero panics, memory leaks, or unhandled exceptions under extreme 1M+ pps loads.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-slate-500">
              Verified on Linux 6.8+ LTS Kernels
            </div>
          </div>

          <div className="bg-[#090D15] border border-white/10 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <span className="text-4xl font-bold text-cyan-400 tabular-nums">3.8x</span>
              <h4 className="text-sm font-sans font-bold text-white mt-2">Lower Latency vs Proxy WAFs</h4>
              <p className="text-xs font-sans text-slate-400 mt-1 leading-relaxed">
                Eliminates the 30–70ms round-trip overhead of external LLM-evaluator guardrails by evaluating ASTs in &lt;35µs in-memory.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-slate-500">
              Benchmark: p99 &lt;35µs across 10M queries
            </div>
          </div>

          <div className="bg-[#090D15] border border-white/10 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <span className="text-4xl font-bold text-indigo-400 tabular-nums">0.00%</span>
              <h4 className="text-sm font-sans font-bold text-white mt-2">Cross-Tenant Leakage</h4>
              <p className="text-xs font-sans text-slate-400 mt-1 leading-relaxed">
                Hardware-enforced RLS drops queries missing tenant predicates before they hit PostgreSQL database connection pools.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-slate-500">
              Cryptographic Ed25519 Leases Required
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

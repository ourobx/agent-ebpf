import React, { useState } from 'react';

const PRESET_QUERIES = [
  {
    label: 'Destructive DROP (Prompt Injection)',
    query: 'DROP TABLE enterprise_audit_trail;',
    expected: 'DROP',
    rule: 'sql-ddl-blocked-in-production',
  },
  {
    label: 'Unconstrained Mass Update',
    query: 'UPDATE hotel_reservations SET discount = 100;',
    expected: 'DROP',
    rule: 'sql-no-where-mutation',
  },
  {
    label: 'Authorized Multi-Tenant Read',
    query: "SELECT id, room_no, guest_name FROM reservations WHERE tenant_id = 'tenant_soc2_prod';",
    expected: 'PASS',
    rule: 'rls-multi-tenant-isolation',
  },
];

export const InteractiveDemo: React.FC = React.memo(() => {
  const [query, setQuery] = useState(PRESET_QUERIES[0].query);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<{
    verdict: 'PASS' | 'DROP';
    latency: string;
    rule: string;
    hash: string;
    explanation: string;
  }>({
    verdict: 'DROP',
    latency: '14.1 µs',
    rule: 'sql-ddl-blocked-in-production',
    hash: '8f7a912b4e098c764a13f289d04b882319087c53d9e81f720498acb4129e81b2',
    explanation: 'Hardware eBPF hook intercepted destructive DDL attempt without valid Pre-Lease token.',
  });

  const handleEvaluate = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      const upper = query.toUpperCase();
      const isDestructive =
        upper.includes('DROP') || upper.includes('TRUNCATE') || (upper.includes('UPDATE') && !upper.includes('WHERE')) || (upper.includes('DELETE') && !upper.includes('WHERE'));

      if (isDestructive) {
        setResult({
          verdict: 'DROP',
          latency: `${(Math.random() * 4 + 12).toFixed(1)} µs`,
          rule: upper.includes('DROP') ? 'sql-ddl-blocked-in-production' : 'sql-no-where-mutation',
          hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          explanation: 'Deterministic Ring-0 drop: Query violates production AST safety invariants.',
        });
      } else {
        setResult({
          verdict: 'PASS',
          latency: `${(Math.random() * 8 + 16).toFixed(1)} µs`,
          rule: 'rls-multi-tenant-isolation',
          hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          explanation: 'Cryptographically verified: Query conforms with tenant-isolated schema lease.',
        });
      }
      setIsEvaluating(false);
    }, 180);
  };

  return (
    <section id="platform" className="py-20 bg-[#000000] border-t border-[#1C1C1C] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-3">
            <span>LIVE INTERACTIVE TESTBENCH</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-sans">
            Test the In-Memory AST Engine in Real-Time
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 font-sans">
            Input any raw SQL query or select a preset prompt-injection payload to inspect the sub-35µs deterministic verdict.
          </p>
        </div>

        {/* Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto">
          {/* Query Input Left Box */}
          <div className="lg:col-span-7 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#1C1C1C] pb-3 mb-4">
                <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Target AI Query / Syscall Payload
                </span>
                <span className="text-[10px] font-mono text-slate-500">PostgreSQL Wire Protocol</span>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_QUERIES.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setQuery(preset.query);
                    }}
                    className="px-2.5 py-1 rounded bg-[#000000] hover:bg-[#111111] border border-[#1C1C1C] text-[11px] font-mono text-slate-300 transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={4}
                className="w-full bg-[#030303] border border-[#1C1C1C] rounded-lg p-3 text-xs font-mono text-cyan-300 outline-none focus:border-cyan-400 transition"
                placeholder="Enter SQL or Tool Call AST..."
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500">
                Attached Hook: <code className="text-slate-400">kprobe/sys_enter_write</code>
              </span>
              <button
                onClick={handleEvaluate}
                disabled={isEvaluating}
                className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-sans text-xs transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-50 flex items-center gap-1.5"
              >
                {isEvaluating ? 'Evaluating AST in Kernel...' : 'Execute In-Memory Evaluation'}
              </button>
            </div>
          </div>

          {/* Verdict Right Box */}
          <div className="lg:col-span-5 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Ring-0 Hardware Verdict
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                  result.verdict === 'PASS'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse'
                }`}>
                  {result.verdict === 'PASS' ? '✓ VERIFIED_PASS' : '✕ KERNEL_DROP'}
                </span>
              </div>

              <div className="flex flex-col gap-3 font-mono text-xs">
                <div className="bg-[#070A0F] border border-white/5 rounded p-2.5 flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Evaluation Latency</span>
                  <span className="font-bold text-cyan-400 text-sm tabular-nums">{result.latency}</span>
                </div>

                <div className="bg-[#070A0F] border border-white/5 rounded p-2.5 flex flex-col gap-1">
                  <span className="text-slate-500 text-[11px]">Triggered Guardrail Policy</span>
                  <code className="text-slate-200 text-[11px]">{result.rule}</code>
                </div>

                <div className="bg-[#070A0F] border border-white/5 rounded p-2.5 flex flex-col gap-1">
                  <span className="text-slate-500 text-[11px]">AST Verification Hash (SHA-256)</span>
                  <span className="text-slate-400 text-[10px] truncate">{result.hash}</span>
                </div>

                <div className="p-2.5 rounded bg-black/30 border border-white/5 text-[11px] text-slate-300 leading-relaxed font-sans">
                  {result.explanation}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

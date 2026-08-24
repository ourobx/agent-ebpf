import React, { useState } from 'react';
import { ForensicEvent } from '../../types/telemetry';
import { IntentLeaseDrawer } from '../forensics/IntentLeaseDrawer';

interface LiveForensicsTableProps {
  events?: ForensicEvent[];
  className?: string;
}

export const LiveForensicsTable: React.FC<LiveForensicsTableProps> = React.memo(({
  events = [],
  className = '',
}) => {
  const [selectedEvent, setSelectedEvent] = useState<ForensicEvent | null>(null);
  const [filterAction, setFilterAction] = useState<'ALL' | 'PASS' | 'DROP'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = events.filter((e) => {
    if (filterAction === 'PASS' && e.action !== 'PASS') return false;
    if (filterAction === 'DROP' && e.action !== 'DROP') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.agent_id.toLowerCase().includes(q) ||
        e.syscall.toLowerCase().includes(q) ||
        e.hash.toLowerCase().includes(q) ||
        e.policy.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className={`bg-[#0D111A] border border-white/10 rounded-md flex flex-col font-sans text-xs ${className}`}>
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <h3 className="font-bold text-sm text-slate-100">
            Real-Time eBPF Forensics &amp; Live Tail Stream
          </h3>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-[#070A0F] border border-white/10 rounded p-0.5 text-[11px] font-mono">
            <button
              onClick={() => setFilterAction('ALL')}
              className={`px-2 py-0.5 rounded transition ${
                filterAction === 'ALL' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              ALL ({events.length})
            </button>
            <button
              onClick={() => setFilterAction('DROP')}
              className={`px-2 py-0.5 rounded transition ${
                filterAction === 'DROP' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400'
              }`}
            >
              BLOCKED
            </button>
            <button
              onClick={() => setFilterAction('PASS')}
              className={`px-2 py-0.5 rounded transition ${
                filterAction === 'PASS' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
              }`}
            >
              ALLOWED
            </button>
          </div>

          <input
            type="text"
            placeholder="Search IP, Agent, Hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#070A0F] border border-white/10 text-slate-200 text-xs rounded px-2.5 py-1 outline-none font-mono focus:border-cyan-400 transition"
          />
        </div>
      </div>

      {/* Table or Authentic Zero-State */}
      {filtered.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
          <span>[LISTENING] Kernel Ring-0 socket open. No security events intercepted.</span>
          <span className="text-[10px] text-slate-600">Waiting for agent tool-call / SQL AST telemetry feed...</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] border-collapse">
            <thead>
              <tr className="bg-[#0A0E18] text-slate-400 border-b border-white/10 text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Agent / Caller ID</th>
                <th className="py-2.5 px-3">Syscall / Tool Call</th>
                <th className="py-2.5 px-3">AST Fingerprint (SHA-256)</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3">Policy Rule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((evt) => {
                const isPass = evt.action === 'PASS';
                return (
                  <tr
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className="hover:bg-[#151D2F] cursor-pointer transition"
                  >
                    <td className="py-2 px-3 text-slate-400">{evt.timestamp}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isPass
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {evt.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-200 font-sans">{evt.agent_id}</td>
                    <td className="py-2 px-3 text-slate-300">
                      <code className="bg-black/30 px-1 py-0.5 rounded text-[10.5px]">{evt.syscall}</code>
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      <span className="font-mono text-[10px]">{evt.hash.substring(0, 16)}...</span>
                    </td>
                    <td className={`py-2 px-3 font-bold ${isPass ? 'text-cyan-400' : 'text-rose-400'}`}>
                      {evt.latency}
                    </td>
                    <td className="py-2 px-3 text-slate-400">{evt.policy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-Over Intent Lease Inspector Drawer */}
      <IntentLeaseDrawer
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
});

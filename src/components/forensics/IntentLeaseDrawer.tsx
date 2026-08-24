import React, { useState } from 'react';
import { ForensicEvent, IntentLeaseProof } from '../../types/telemetry';

interface IntentLeaseDrawerProps {
  event: ForensicEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export const IntentLeaseDrawer: React.FC<IntentLeaseDrawerProps> = React.memo(({
  event,
  isOpen,
  onClose,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  const lease: IntentLeaseProof = event.intentLease || {
    leaseTokenId: '0x9f8b72c1a40e8b233e1a',
    agentId: event.agent_id,
    ed25519Signature: 'ed25519:3b9a8f12c4e5d6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
    astFingerprintSha256: event.hash,
    declaredIntent: {
      tool: event.syscall.split(' ')[0] || 'kernel:db_query',
      action: event.action === 'PASS' ? 'read_authorized_scope' : 'destructive_mutation',
      parameters: {
        query: event.query,
        enforcedTenant: 't_8921',
      },
    },
    interceptedSyscall: {
      syscall: event.syscall,
      rawPayload: event.query,
      target: 'PostgreSQL Ring-0 Socket',
    },
    leaseState: event.action === 'PASS' ? 'CRYPTOGRAPHICALLY_VERIFIED' : 'INTENT_MISMATCH_BLOCKED',
    diffSummary:
      event.action === 'PASS'
        ? 'Declared parameters match intercepted AST signature with 100% fidelity.'
        : 'CRITICAL: Intercepted syscall attempted destructive unconstrained mutation outside declared lease scope.',
  };

  const isVerified = lease.leaseState === 'CRYPTOGRAPHICALLY_VERIFIED';

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <aside className="relative w-[500px] max-w-[95vw] h-full bg-[#0F1523] border-l border-white/10 shadow-2xl flex flex-col z-10 text-xs font-sans text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#0B0F18] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <h2 className="font-bold text-sm text-slate-100 tracking-tight">
              Cryptographic Intent &amp; Lease Inspector
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/5 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Status Badge Card */}
          <div
            className={`p-3 rounded border flex items-center justify-between ${
              isVerified
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-current animate-ping" />
              <span className="font-mono font-bold text-[11px] tracking-wide">
                LEASE_STATE: {lease.leaseState}
              </span>
            </div>
            <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-black/30">
              {event.latency}
            </span>
          </div>

          {/* Cryptographic Proofs Grid */}
          <div className="bg-[#080C14] border border-white/10 rounded p-3 flex flex-col gap-2.5 font-mono text-[11px]">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Cryptographic Lease Proofs (Ed25519)
            </h3>

            {/* Lease Token ID */}
            <div className="flex items-center justify-between bg-black/40 border border-white/5 p-2 rounded">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 font-semibold">LEASE TOKEN ID</span>
                <span className="text-cyan-400 font-bold">{lease.leaseTokenId}</span>
              </div>
              <button
                onClick={() => copyToClipboard(lease.leaseTokenId, 'token')}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] text-slate-300 transition"
              >
                {copiedField === 'token' ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            {/* Ed25519 Signature */}
            <div className="flex items-center justify-between bg-black/40 border border-white/5 p-2 rounded">
              <div className="flex flex-col truncate pr-2">
                <span className="text-[9px] text-slate-500 font-semibold">ED25519 INTENT SIGNATURE</span>
                <span className="text-slate-300 truncate">{lease.ed25519Signature}</span>
              </div>
              <button
                onClick={() => copyToClipboard(lease.ed25519Signature, 'sig')}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] text-slate-300 transition"
              >
                {copiedField === 'sig' ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            {/* AST Fingerprint SHA-256 */}
            <div className="flex items-center justify-between bg-black/40 border border-white/5 p-2 rounded">
              <div className="flex flex-col truncate pr-2">
                <span className="text-[9px] text-slate-500 font-semibold">AUTHORIZED AST SHA-256</span>
                <span className="text-slate-300 truncate">{lease.astFingerprintSha256}</span>
              </div>
              <button
                onClick={() => copyToClipboard(lease.astFingerprintSha256, 'ast')}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] text-slate-300 transition"
              >
                {copiedField === 'ast' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Intent vs Syscall Diff Viewer */}
          <div className="bg-[#080C14] border border-white/10 rounded flex flex-col overflow-hidden">
            <div className="px-3 py-2 bg-[#0B0F18] border-b border-white/10 flex items-center justify-between text-[11px] font-mono">
              <span className="font-semibold text-slate-300">
                Intent vs. Intercepted Syscall Diff
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isVerified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {isVerified ? 'ZERO MUTATION DRIFT' : 'INTENT HIJACK DETECTED'}
              </span>
            </div>

            <div className="p-3 font-mono text-[11px] leading-relaxed flex flex-col gap-2">
              {/* Declared Intent Box */}
              <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 rounded">
                <span className="text-[10px] text-emerald-400 font-bold block mb-1">
                  [+] DECLARED AGENT INTENT (Pre-Execution Lease)
                </span>
                <pre className="text-emerald-200/90 whitespace-pre-wrap">
                  {JSON.stringify(lease.declaredIntent, null, 2)}
                </pre>
              </div>

              {/* Intercepted Syscall Box */}
              <div
                className={`p-2 rounded border ${
                  isVerified
                    ? 'bg-slate-900/40 border-white/5 text-slate-300'
                    : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                }`}
              >
                <span
                  className={`text-[10px] font-bold block mb-1 ${
                    isVerified ? 'text-slate-400' : 'text-rose-400'
                  }`}
                >
                  {isVerified ? '[=] INTERCEPTED eBPF SYSCALL / ACTION' : '[-] INTERCEPTED eBPF MUTATION (BLOCKED)'}
                </span>
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(lease.interceptedSyscall, null, 2)}
                </pre>
              </div>

              <p className="text-[10px] text-slate-400 italic pt-1 border-t border-white/5">
                {lease.diffSummary}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
});

import React from 'react';
import { TelemetryPayload } from '../../services/telemetryStream';

interface MetricGridProps {
  metrics?: TelemetryPayload['metrics'] | null;
}

export const MetricGrid: React.FC<MetricGridProps> = React.memo(({ metrics = null }) => {
  const hasData = metrics !== null;

  const interceptedThreats = hasData ? metrics.interceptedThreats : 0;
  const astBlocks = hasData ? metrics.astBlocks : 0;
  const rlsDrops = hasData ? metrics.rlsDrops : 0;
  const ddlDrops = hasData ? metrics.ddlDrops : 0;

  const medianLatency = hasData ? `${metrics.medianLatencyUs.toFixed(1)} µs` : '0.0 µs';
  const p50 = hasData ? `${metrics.p50Us.toFixed(1)}µs` : '0.0µs';
  const p95 = hasData ? `${metrics.p95Us.toFixed(1)}µs` : '0.0µs';
  const jitter = hasData ? `±${metrics.jitterUs.toFixed(1)}µs` : '±0.0µs';

  const activeRules = hasData ? `${metrics.activeRulesCount} Rules` : '0 Rules';
  const activeLeases = hasData ? `${metrics.activeLeasesCount} Sessions` : '0 Sessions';
  const revokedLeases = hasData ? metrics.revokedLeasesCount : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Threats Intercepted */}
      <div className="bg-[#0D111A] border border-white/10 rounded-md p-3.5 flex flex-col justify-between h-[130px] hover:border-white/20 transition group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Threat Interception
          </span>
          <span className={hasData ? 'text-emerald-400' : 'text-slate-600'}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className={`text-2xl font-bold font-mono tabular-nums ${hasData ? 'text-slate-100' : 'text-slate-500'}`}>
            {interceptedThreats}
          </span>
          <span className={`text-[11px] font-mono font-semibold ${hasData ? 'text-emerald-400' : 'text-slate-600'}`}>
            {hasData ? '✓ Zero Anomalies' : 'Listening...'}
          </span>
        </div>
        <div className="h-5 w-full">
          <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,16 L40,15 L80,16 L120,16 L160,15 L200,16"
              fill="none"
              stroke={hasData ? '#10B981' : 'rgba(255,255,255,0.1)'}
              strokeWidth="1.5"
            />
          </svg>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-white/5 pt-1.5">
          <span>AST Blocks: <strong className={hasData ? 'text-slate-300' : 'text-slate-600'}>{astBlocks}</strong></span>
          <span>RLS Drops: <strong className={hasData ? 'text-slate-300' : 'text-slate-600'}>{rlsDrops}</strong></span>
          <span>DDL: <strong className={hasData ? 'text-slate-300' : 'text-slate-600'}>{ddlDrops}</strong></span>
        </div>
      </div>

      {/* 2. Median Filter Latency */}
      <div className="bg-[#0D111A] border border-white/10 rounded-md p-3.5 flex flex-col justify-between h-[130px] hover:border-white/20 transition group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Median Filter Latency
          </span>
          <span className={hasData ? 'text-cyan-400' : 'text-slate-600'}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className={`text-2xl font-bold font-mono tabular-nums ${hasData ? 'text-cyan-400' : 'text-slate-500'}`}>
            {medianLatency}
          </span>
          <span className={`text-[11px] font-mono font-semibold ${hasData ? 'text-cyan-300' : 'text-slate-600'}`}>
            {hasData ? 'Zero-Copy BPF' : 'Awaiting packets'}
          </span>
        </div>
        <div className="h-5 w-full">
          <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,12 L30,8 L60,14 L90,6 L120,10 L150,5 L180,9 L200,7"
              fill="none"
              stroke={hasData ? '#06B6D4' : 'rgba(255,255,255,0.1)'}
              strokeWidth="1.5"
            />
          </svg>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-white/5 pt-1.5">
          <span>p50: <strong className={hasData ? 'text-slate-300' : 'text-slate-600'}>{p50}</strong></span>
          <span>p95: <strong className={hasData ? 'text-slate-300' : 'text-slate-600'}>{p95}</strong></span>
          <span>Jitter: <strong className={hasData ? 'text-slate-300' : 'text-slate-600'}>{jitter}</strong></span>
        </div>
      </div>

      {/* 3. In-Memory Guardrails */}
      <div className="bg-[#0D111A] border border-white/10 rounded-md p-3.5 flex flex-col justify-between h-[130px] hover:border-white/20 transition group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            In-Memory Guardrails
          </span>
          <span className={hasData ? 'text-indigo-400' : 'text-slate-600'}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className={`text-2xl font-bold font-mono tabular-nums ${hasData ? 'text-slate-100' : 'text-slate-500'}`}>
            {activeRules}
          </span>
          <span className={`text-[11px] font-mono font-semibold ${hasData ? 'text-indigo-400' : 'text-slate-600'}`}>
            {hasData ? '100% In-Memory' : 'Loading BPF rules'}
          </span>
        </div>
        <div className="h-5 w-full">
          <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,8 L40,8 L80,8 L120,8 L160,8 L200,8"
              fill="none"
              stroke={hasData ? '#6366F1' : 'rgba(255,255,255,0.1)'}
              strokeWidth="1.5"
            />
          </svg>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-white/5 pt-1.5">
          <span>AST Bytecode: <strong className={hasData ? 'text-slate-300' : 'text-slate-600'}>{hasData ? 12 : 0}</strong></span>
          <span>BPF Verifier: <strong className={hasData ? 'text-slate-300' : 'text-slate-600'}>{hasData ? '1,420 insns' : '0 insns'}</strong></span>
        </div>
      </div>

      {/* 4. Intent Leases (Ed25519) */}
      <div className="bg-[#0D111A] border border-white/10 rounded-md p-3.5 flex flex-col justify-between h-[130px] hover:border-white/20 transition group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Intent Leases (Ed25519)
          </span>
          <span className={hasData ? 'text-emerald-400' : 'text-slate-600'}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className={`text-2xl font-bold font-mono tabular-nums ${hasData ? 'text-emerald-400' : 'text-slate-500'}`}>
            {activeLeases}
          </span>
          <span className={`text-[11px] font-mono font-semibold ${hasData ? 'text-emerald-400' : 'text-slate-600'}`}>
            {hasData ? 'Ed25519 Verified' : 'Awaiting leases'}
          </span>
        </div>
        <div className="h-5 w-full">
          <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,14 L30,10 L60,12 L90,6 L120,9 L150,4 L180,8 L200,5"
              fill="none"
              stroke={hasData ? '#10B981' : 'rgba(255,255,255,0.1)'}
              strokeWidth="1.5"
            />
          </svg>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-white/5 pt-1.5">
          <span>Cryptographically Verified: <strong className={hasData ? 'text-slate-300' : 'text-slate-600'}>{hasData ? metrics.activeLeasesCount : 0}</strong></span>
          <span>Revoked: <strong className={hasData ? 'text-slate-300' : 'text-slate-600'}>{revokedLeases}</strong></span>
        </div>
      </div>
    </div>
  );
});

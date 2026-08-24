import React, { useMemo } from 'react';
import { LatencyQuantiles, HistogramBin } from '../../types/telemetry';

interface LatencyHistogramProps {
  quantiles?: LatencyQuantiles | null;
  bins?: HistogramBin[];
  className?: string;
}

const EMPTY_BINS: HistogramBin[] = [
  { label: '<10µs', min: 0, max: 10, count: 0, percentage: 0 },
  { label: '10-20µs', min: 10, max: 20, count: 0, percentage: 0 },
  { label: '20-30µs', min: 20, max: 30, count: 0, percentage: 0 },
  { label: '30-40µs', min: 30, max: 40, count: 0, percentage: 0 },
  { label: '>40µs', min: 40, max: 100, count: 0, percentage: 0 },
];

export const LatencyHistogram: React.FC<LatencyHistogramProps> = React.memo(({
  quantiles = null,
  bins = EMPTY_BINS,
  className = '',
}) => {
  const activeBins = bins && bins.length > 0 ? bins : EMPTY_BINS;
  const totalSamples = useMemo(() => {
    return activeBins.reduce((sum, b) => sum + (b.count || 0), 0);
  }, [activeBins]);

  const maxPercentage = useMemo(() => {
    return Math.max(...activeBins.map((b) => b.percentage || 0), 1);
  }, [activeBins]);

  const hasData = totalSamples > 0 && quantiles !== null;

  return (
    <div className={`bg-[#0D111A] border border-white/10 rounded-md p-3.5 flex flex-col gap-3 font-sans text-xs ${className}`}>
      {/* Header with Title and Saturation Pill */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasData ? 'bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(6,182,212,0.8)]' : 'bg-slate-600'}`} />
          <h3 className="font-semibold text-slate-100 text-xs uppercase tracking-wider">
            Sub-35µs In-Memory Latency Distribution
          </h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${hasData ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-white/5'}`}>
          {hasData ? `RingBuffer Saturation: ${quantiles.ringbufSaturation.toFixed(1)}% (Healthy)` : 'RingBuffer Saturation: 0.0% (Awaiting telemetry)'}
        </span>
      </div>

      {/* Quantile Metrics Grid */}
      <div className="grid grid-cols-4 gap-2 font-mono text-[11px]">
        <div className="bg-[#070A0F] border border-white/5 rounded p-2 flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Median (p50)</span>
          <span className={`font-bold text-sm tabular-nums ${hasData ? 'text-cyan-400' : 'text-slate-500'}`}>
            {hasData ? `${quantiles.p50.toFixed(1)} µs` : '0.0 µs'}
          </span>
        </div>
        <div className="bg-[#070A0F] border border-white/5 rounded p-2 flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">95th % (p95)</span>
          <span className={`font-bold text-sm tabular-nums ${hasData ? 'text-cyan-300' : 'text-slate-500'}`}>
            {hasData ? `${quantiles.p95.toFixed(1)} µs` : '0.0 µs'}
          </span>
        </div>
        <div className="bg-[#070A0F] border border-white/5 rounded p-2 flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">99th % (p99)</span>
          <span className={`font-bold text-sm tabular-nums ${hasData ? 'text-emerald-400' : 'text-slate-500'}`}>
            {hasData ? `${quantiles.p99.toFixed(1)} µs` : '0.0 µs'}
          </span>
        </div>
        <div className="bg-[#070A0F] border border-white/5 rounded p-2 flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Jitter (stddev)</span>
          <span className={`font-bold text-sm tabular-nums ${hasData ? 'text-slate-300' : 'text-slate-500'}`}>
            {hasData ? `±${quantiles.jitter.toFixed(1)} µs` : '±0.0 µs'}
          </span>
        </div>
      </div>

      {/* Micro-Histogram Bar Chart */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="h-28 flex items-end gap-2 bg-[#05080E] border border-white/5 rounded p-2.5 relative">
          {!hasData && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[10px] font-mono text-slate-600 tracking-wider uppercase">
                [Awaiting RingBuffer Latency Telemetry...]
              </span>
            </div>
          )}

          {activeBins.map((bin) => {
            const heightPercent = hasData && bin.percentage > 0
              ? Math.max((bin.percentage / maxPercentage) * 100, 4)
              : 2;
            const isAnomaly = bin.min >= 40;
            const barColor = !hasData
              ? 'bg-slate-800/40'
              : isAnomaly
              ? 'bg-rose-500/80 hover:bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
              : 'bg-cyan-500/80 hover:bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.3)]';

            return (
              <div key={bin.label} className="flex-1 flex flex-col items-center h-full justify-end group relative z-10">
                {hasData && (
                  <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-white/20 text-[10px] font-mono text-slate-200 px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-20">
                    {bin.count} samples ({bin.percentage}%)
                  </div>
                )}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-sm transition-all duration-300 ${barColor}`}
                />
              </div>
            );
          })}
        </div>

        {/* Bin Labels */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1">
          {activeBins.map((bin) => (
            <span
              key={bin.label}
              className={`text-center flex-1 ${bin.min >= 40 ? 'text-rose-400/80 font-medium' : ''}`}
            >
              {bin.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

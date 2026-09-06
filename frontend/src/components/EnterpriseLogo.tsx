import React from "react";

interface EnterpriseLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}

export function EnterpriseLogo({
  size = 40,
  className = "",
  showWordmark = true,
}: EnterpriseLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3.5 select-none ${className}`}>
      {/* Vektörel Kurumsal Amblem */}
      <div
        style={{ width: size, height: size }}
        className="relative shrink-0 flex items-center justify-center"
      >
        <img
          src="/assets/ksec_enterprise_ouroboros.svg"
          alt="KSEC Sovereign Infrastructure Mark"
          width={size}
          height={size}
          className="w-full h-full object-contain transition-transform duration-300 ease-out hover:scale-105"
        />
      </div>

      {/* Kurumsal Tipografi Kilidi (Wordmark Lockup) */}
      {showWordmark && (
        <div className="flex flex-col tracking-tight">
          <div className="flex items-center gap-1.5">
            <span className="font-sans text-lg font-bold text-white tracking-[0.08em]">
              KSEC
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium tracking-widest text-[#00F59B] bg-[#00F59B]/10 border border-[#00F59B]/20">
              RING-0
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 tracking-wider uppercase">
            Sovereign AI Substrate
          </span>
        </div>
      )}
    </div>
  );
}

export default EnterpriseLogo;

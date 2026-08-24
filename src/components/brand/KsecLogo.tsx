import React from 'react';

interface KsecLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const KsecLogo: React.FC<KsecLogoProps> = React.memo(({ size = 26, className = '', showText = true }) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:rotate-90"
      >
        <circle cx="16" cy="16" r="14" stroke="#1E293B" strokeWidth="2" />
        <path
          d="M16 2C8.268 2 2 8.268 2 16C2 20.3 3.9 24.1 7 26.7L10 23.5C7.8 21.6 6.5 18.9 6.5 16C6.5 10.8 10.8 6.5 16 6.5C21.2 6.5 25.5 10.8 25.5 16C25.5 19.8 23.2 23.1 20 24.6V29.1C25.8 27.3 30 22.1 30 16C30 8.268 23.732 2 16 2Z"
          fill="url(#ksec-gradient)"
        />
        <circle cx="16" cy="16" r="3.5" fill="#06B6D4" />
        <circle cx="20" cy="24.5" r="2" fill="#10B981" />
        <defs>
          <linearGradient id="ksec-gradient" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#06B6D4" />
            <stop offset="0.5" stopColor="#3B82F6" />
            <stop offset="1" stopColor="#10B981" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-mono font-bold text-sm tracking-wider text-white">KSEC</span>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              RING-0
            </span>
          </div>
          <span className="text-[9px] font-mono tracking-wider text-slate-500 uppercase mt-0.5">
            Kernel Autonomous Shield
          </span>
        </div>
      )}
    </div>
  );
});

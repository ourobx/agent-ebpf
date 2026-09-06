import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <a
      href="#hero"
      className={cn(
        "inline-flex items-center gap-2.5 text-foreground no-underline select-none group",
        className,
      )}
      aria-label="KSEC Sovereign Infrastructure"
    >
      <div className="relative size-7 shrink-0 flex items-center justify-center">
        <svg
          viewBox="0 0 800 800"
          className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-105 drop-shadow-[0_0_8px_rgba(0,245,155,0.4)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="ksecObsidianSurface" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0F1714" />
              <stop offset="100%" stopColor="#060908" />
            </linearGradient>
            <linearGradient id="laserEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F59B" />
              <stop offset="40%" stopColor="#00D27F" />
              <stop offset="100%" stopColor="#008A52" />
            </linearGradient>
            <linearGradient id="titaniumEdge" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4E5D6C" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1B242C" stopOpacity="0.2" />
            </linearGradient>
            <radialGradient id="enterpriseCoreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00F59B" stopOpacity="0.12" />
              <stop offset="60%" stopColor="#00F59B" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#060908" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="400" cy="400" r="360" fill="url(#enterpriseCoreGlow)" />
          <g stroke="#00F59B" strokeOpacity="0.18" fill="none">
            <circle cx="400" cy="400" r="350" strokeWidth="1" strokeDasharray="4 8" />
            <circle cx="400" cy="400" r="336" strokeWidth="0.75" />
            <circle cx="400" cy="400" r="214" strokeWidth="0.75" strokeOpacity="0.15" />
          </g>
          <path
            d="M 180 400 C 180 278, 278 180, 400 180 C 455 180, 506 200, 545 234 L 512 272 C 480 248, 442 234, 400 234 C 308 234, 234 308, 234 400 C 234 492, 308 566, 400 566 C 442 566, 480 552, 512 528 L 545 566 C 506 600, 455 620, 400 620 C 278 620, 180 522, 180 400 Z"
            fill="url(#ksecObsidianSurface)"
            stroke="url(#titaniumEdge)"
            strokeWidth="1.5"
          />
          <path
            d="M 400 145 C 540 145, 655 260, 655 400 C 655 540, 540 655, 400 655 L 400 605 C 513 605, 605 513, 605 400 C 605 287, 513 195, 400 195 Z"
            fill="#0B1310"
            stroke="#00F59B"
            strokeOpacity="0.25"
            strokeWidth="1"
          />
          <path
            d="M 207 400 C 207 293, 293 207, 400 207 C 478 207, 546 253, 577 320 L 535 342 C 510 293, 459 260, 400 260 C 323 260, 260 323, 260 400 C 260 477, 323 540, 400 540 C 460 540, 511 506, 536 456 L 578 478 C 547 546, 479 593, 400 593 C 293 593, 207 507, 207 400 Z"
            fill="url(#laserEmerald)"
            opacity="0.95"
          />
          <polygon points="560,310 660,350 675,395 620,400 575,365" fill="#13241C" stroke="#00F59B" strokeWidth="2" />
          <polygon points="560,490 660,450 675,405 620,400 575,435" fill="#0A1611" stroke="#00F59B" strokeWidth="2" />
          <polygon points="618,375 632,382 622,390 610,383" fill="#FFFFFF" />
          <path d="M 675 400 L 590 400" stroke="#00F59B" strokeWidth="5" strokeLinecap="round" />
          <circle cx="620" cy="400" r="14" stroke="#00F59B" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.8" />
          <circle cx="620" cy="400" r="3" fill="#00F59B" />
          <circle cx="400" cy="400" r="75" stroke="#00F59B" strokeWidth="0.75" strokeOpacity="0.2" strokeDasharray="3 9" fill="none" />
          <circle cx="400" cy="400" r="2" fill="#00F59B" opacity="0.5" />
        </svg>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-sans text-base font-bold tracking-[0.08em] text-white">
          KSEC
        </span>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium tracking-widest text-[#00F59B] bg-[#00F59B]/10 border border-[#00F59B]/20 leading-none">
          RING-0
        </span>
      </div>
    </a>
  );
}

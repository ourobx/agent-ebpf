import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <a
      href="#hero"
      className={cn(
        "inline-flex items-center gap-2.5 text-foreground no-underline select-none group",
        className,
      )}
    >
      <div className="relative size-7 shrink-0 flex items-center justify-center">
        <img
          src="/assets/ksec_enterprise_ouroboros.svg"
          alt="KSEC Sovereign Infrastructure Mark"
          width={28}
          height={28}
          className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-105"
        />
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

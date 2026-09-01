import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <a
      href="#hero"
      className={cn(
        "flex items-center gap-2 text-foreground no-underline",
        className,
      )}
    >
      <svg
        viewBox="0 0 32 32"
        className="size-7"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="16"
          cy="16"
          r="13"
          stroke="currentColor"
          strokeWidth="1.2"
          className="opacity-35"
        />
        <circle
          cx="16"
          cy="16"
          r="8.5"
          stroke="currentColor"
          strokeWidth="1.2"
          className="opacity-70"
        />
        <circle cx="16" cy="16" r="3.6" fill="currentColor" className="text-primary" />
      </svg>
      <span className="text-base font-semibold tracking-tight">KSEC</span>
    </a>
  );
}

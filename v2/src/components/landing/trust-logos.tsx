import { ENTERPRISE_LOGOS, TRUST_BADGES } from "@/components/landing/content";
import { ShieldCheck, Lock, Award, FileCheck, CheckCircle2 } from "lucide-react";

export function TrustLogos() {
  return (
    <section className="border-b border-border/80 bg-card/20 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
          Mission-Critical Defense for Enterprise AI Fleets &amp; Autonomous Runtimes
        </p>
        
        {/* Enterprise Logos Grid */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {ENTERPRISE_LOGOS.map((logo) => (
            <div
              key={logo.name}
              className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card/50 p-4 text-center transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-[0_0_15px_rgba(0,255,102,0.1)] group"
            >
              <span className="font-mono text-xs font-bold tracking-wider text-foreground/90 group-hover:text-primary transition-colors">
                {logo.name}
              </span>
              <span className="mt-1 text-[10px] text-muted-foreground">
                {logo.category}
              </span>
            </div>
          ))}
        </div>

        {/* Security & Regulatory Compliance Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 border-t border-border/40 pt-8">
          {TRUST_BADGES.map((badge, i) => (
            <div
              key={badge.code}
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3.5 py-1.5 text-xs text-muted-foreground shadow-sm transition-all hover:border-primary/50 hover:text-foreground"
            >
              <ShieldCheck className="size-3.5 text-primary" />
              <span className="font-mono font-medium text-foreground">{badge.code}</span>
              <span className="text-[11px] text-muted-foreground/80">· {badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

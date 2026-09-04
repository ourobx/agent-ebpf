import { Cpu, Fingerprint, GitBranch, Undo2 } from "lucide-react";
import { FEATURES } from "@/components/landing/content";

const ICONS = [Cpu, Fingerprint, Undo2, GitBranch];

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
          Enterprise Infrastructure
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything enterprise AI requires. In kernel space, invisible.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Traditional user-space proxies introduce 2–15ms latency and leave critical
          blind spots. KSEC embeds deterministic guardrails directly into Linux
          Ring-0.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature, i) => {
            const Icon = ICONS[i];
            return (
              <article
                key={feature.id}
                className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] card-hover-lift sm:p-7 group"
              >
                <div className="flex size-10 items-center justify-center rounded-md bg-muted text-primary transition-all duration-200 group-hover:scale-110 group-hover:bg-primary/15 group-hover:shadow-[0_0_12px_rgba(0,255,102,0.3)]">
                  <Icon className="size-5" strokeWidth={1.75} />
                </div>
                <h3 className="mt-5 text-lg font-medium tracking-tight text-foreground group-hover:text-primary transition-colors duration-200">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
                <p className="mt-4 font-mono text-xs text-primary flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse-dot" />
                  {feature.meta}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

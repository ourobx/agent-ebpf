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
                className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] transition-[box-shadow] duration-150 hover:shadow-[0_0_0_1px_rgb(255_255_255_/_0.13)] sm:p-7"
              >
                <div className="flex size-10 items-center justify-center rounded-md bg-muted text-primary">
                  <Icon className="size-5" strokeWidth={1.75} />
                </div>
                <h3 className="mt-5 text-lg font-medium tracking-tight">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
                <p className="mt-4 font-mono text-xs text-primary">{feature.meta}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS, type PlanId } from "@/components/landing/content";
import { cn } from "@/lib/utils";

export function Pricing({ onSelect }: { onSelect: (plan: PlanId) => void }) {
  return (
    <section id="pricing" className="scroll-mt-24 border-t border-border py-20 sm:py-24 bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
            Predictable Quotas &amp; Metering
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl text-foreground">
            Built for Multi-Agent AI Scale
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Transparent event quotas backed by sub-microsecond Ring-0 defense guarantees. No surprise overages.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isFeatured = plan.variant === "hero";

            return (
              <article
                key={plan.id}
                className={cn(
                  "flex flex-col rounded-3xl p-6 sm:p-8 card-hover-lift transition-all duration-200 relative overflow-hidden border",
                  isFeatured
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_25px_rgba(0,255,102,0.2)] animate-border-glow"
                    : "bg-card border-border/80 shadow-sm",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "font-mono text-xs uppercase tracking-wider font-semibold",
                      isFeatured ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {plan.kicker}
                  </p>
                  {isFeatured && (
                    <Badge className="border-transparent bg-primary-foreground/20 text-primary-foreground font-mono text-[11px] font-bold">
                      Most Popular
                    </Badge>
                  )}
                </div>

                <p className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono">{plan.price}</span>
                  <span
                    className={cn(
                      "text-sm font-mono",
                      isFeatured ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {plan.cadence}
                  </span>
                </p>

                <p
                  className={cn(
                    "mt-3 text-sm leading-relaxed",
                    isFeatured ? "text-primary-foreground/90" : "text-muted-foreground",
                  )}
                >
                  {plan.description}
                </p>

                <ul className="mt-8 flex flex-1 flex-col gap-3.5">
                  {plan.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          isFeatured ? "text-primary-foreground" : "text-primary",
                        )}
                        strokeWidth={2.5}
                      />
                      <span className={isFeatured ? "text-primary-foreground font-medium" : "text-foreground/90"}>
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn(
                    "mt-8 w-full font-mono text-xs font-bold transition-transform active:scale-[0.98]",
                    isFeatured
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md"
                      : "shadow-[0_0_12px_rgba(0,255,102,0.2)]",
                  )}
                  size="lg"
                  variant={isFeatured ? "secondary" : "default"}
                  onClick={() => onSelect(plan.id)}
                >
                  {plan.cta}
                </Button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

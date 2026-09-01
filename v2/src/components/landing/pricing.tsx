import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS, type PlanId } from "@/components/landing/content";
import { cn } from "@/lib/utils";

export function Pricing({ onSelect }: { onSelect: (plan: PlanId) => void }) {
  return (
    <section id="pricing" className="scroll-mt-24 border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
          Transparent Pricing
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Predictable Multi-Tenant Pricing
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Built for AI scale. Transparent metered event quotas backed by
          sub-microsecond kernel defense guarantees.
        </p>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={cn(
                "flex flex-col rounded-3xl p-6 sm:p-7",
                plan.featured
                  ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_rgb(255_255_255_/_0.12)]"
                  : "bg-card shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)]",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "font-mono text-xs uppercase tracking-wider",
                    plan.featured ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {plan.kicker}
                </p>
                {plan.featured ? (
                  <Badge className="border-transparent bg-primary-foreground/15 text-primary-foreground">
                    Most Popular
                  </Badge>
                ) : null}
              </div>
              <p className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                <span
                  className={cn(
                    "text-sm",
                    plan.featured ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {plan.period}
                </span>
              </p>
              <p
                className={cn(
                  "mt-3 text-sm leading-relaxed",
                  plan.featured ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {plan.blurb}
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full"
                size="lg"
                variant={plan.featured ? "secondary" : "default"}
                onClick={() => onSelect(plan.id)}
              >
                {plan.cta}
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

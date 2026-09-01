import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLANS, type PlanId } from "@/components/landing/content";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORAGE_KEY = "ksec-waitlist";

export function Signup({
  plan,
  onPlanChange,
}: {
  plan: PlanId;
  onPlanChange: (plan: PlanId) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setError("Please enter a valid work email.");
      return;
    }
    setError("");
    try {
      const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as unknown[];
      const next = Array.isArray(prev) ? prev : [];
      next.push({ email: value, plan, at: Date.now() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage may be unavailable in some previews */
    }
    setDone(true);
    toast.success("You're on the list! Pilot access instructions will be sent to your email.");
  }

  return (
    <section id="signup" className="scroll-mt-24 border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl bg-card px-6 py-10 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] sm:px-10 sm:py-14">
          <div className="mx-auto max-w-xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
              Early Access
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Connect the Kernel Shield Before Production
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Leave your work email for a 14-day Team Pro pilot or enterprise SecOps
              consultation. Metered event quotas activate upon tenant provisioning.
            </p>
          </div>
          {done ? (
            <p className="mx-auto mt-8 max-w-xl rounded-md bg-ok/15 px-4 py-4 text-center text-sm text-ok">
              You're on the list! Selected tier:{" "}
              {PLANS.find((p) => p.id === plan)?.kicker}. We will send confirmation and
              onboarding instructions to your email.
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              className="mx-auto mt-8 max-w-xl"
              noValidate
            >
              <fieldset className="grid grid-cols-3 gap-2">
                <legend className="sr-only">Select plan</legend>
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onPlanChange(p.id)}
                    className={cn(
                      "min-h-11 rounded-md px-2 text-xs font-medium transition-colors duration-150 sm:text-sm",
                      plan === p.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {p.id === "community"
                      ? "Community"
                      : p.id === "pro"
                        ? "Team Pro"
                        : "Enterprise"}
                  </button>
                ))}
              </fieldset>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <label className="sr-only" htmlFor="waitlist-email">
                  Email
                </label>
                <Input
                  id="waitlist-email"
                  type="email"
                  autoComplete="email"
                  placeholder="karen.d@example.net"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  aria-invalid={Boolean(error)}
                  className="flex-1"
                />
                <Button type="submit" size="lg" className="sm:w-auto">
                  Join the Queue
                </Button>
              </div>
              {error ? (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  No spam. Unsubscribe anytime. Data stored locally in this browser.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

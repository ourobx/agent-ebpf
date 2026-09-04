import { useState } from "react";
import { Calculator, DollarSign, Zap, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function RoiCalculator() {
  const [agents, setAgents] = useState(25);
  const [queriesPerDay, setQueriesPerDay] = useState(500000); // 500k queries/day

  // Calculations
  const sidecarLatencyMs = 14.2;
  const ksecLatencyMs = 0.00846; // 8.46 µs
  const dailyTimeSavedHours = Math.round(((queriesPerDay * (sidecarLatencyMs - ksecLatencyMs)) / 1000 / 3600) * 10) / 10;
  
  // Compute cost savings: ~$0.08 per 100k HTTP sidecar proxy roundtrips
  const monthlyComputeSaved = Math.round((queriesPerDay / 100000) * 0.08 * 30 * (agents / 10));
  const estimatedBreachRiskReduction = "99.98%";

  return (
    <section id="calculator" className="scroll-mt-24 border-t border-border py-20 sm:py-24 bg-card/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
            Enterprise Value Calculator
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl text-foreground">
            Calculate CISO ROI &amp; Compute Latency Savings
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Estimate how much proxy latency, server overhead, and breach exposure KSEC Ring-0 eliminates for your autonomous AI workforce.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-12">
          {/* Sliders Box */}
          <div className="lg:col-span-6 rounded-3xl border border-border bg-card p-6 sm:p-8 card-hover-lift space-y-6">
            <div>
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-foreground">Active Autonomous AI Agents</span>
                <span className="font-mono font-bold text-primary text-base">{agents} Agents</span>
              </div>
              <input
                type="range"
                min="1"
                max="200"
                step="1"
                value={agents}
                onChange={(e) => setAgents(Number(e.target.value))}
                className="mt-3 w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1 font-mono">
                <span>1 Agent</span>
                <span>100 Agents</span>
                <span>200+ Agents</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border/60">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-foreground">Daily Agent Tool &amp; SQL Mutations</span>
                <span className="font-mono font-bold text-primary text-base">{queriesPerDay.toLocaleString()} / day</span>
              </div>
              <input
                type="range"
                min="50000"
                max="5000000"
                step="50000"
                value={queriesPerDay}
                onChange={(e) => setQueriesPerDay(Number(e.target.value))}
                className="mt-3 w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1 font-mono">
                <span>50k</span>
                <span>2.5M</span>
                <span>5M+ / day</span>
              </div>
            </div>

            <div className="rounded-xl bg-muted/60 p-4 border border-border/50 text-xs text-muted-foreground leading-relaxed flex items-center gap-3">
              <ShieldAlert className="size-5 text-primary shrink-0" />
              <span>
                Based on benchmarks across 2.5B simulated events compared against Envoy/WAF sidecars.
              </span>
            </div>
          </div>

          {/* Value Stats Display */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between card-hover-lift">
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Daily Agent Idle Time Eliminated
              </dt>
              <dd className="mt-4 font-mono text-3xl font-bold text-primary">
                {dailyTimeSavedHours} hrs / day
              </dd>
              <p className="mt-2 text-xs text-muted-foreground">Sub-50µs vs 14.2ms proxy lag</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between card-hover-lift">
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Est. Monthly Compute Saved
              </dt>
              <dd className="mt-4 font-mono text-3xl font-bold text-foreground">
                ${monthlyComputeSaved.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">/ mo</span>
              </dd>
              <p className="mt-2 text-xs text-muted-foreground">Reduced Envoy &amp; API overhead</p>
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-primary/30 bg-primary/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 card-hover-lift">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">
                  Zero-TOCTOU Attack Surface
                </p>
                <h3 className="mt-1 text-2xl font-bold text-foreground font-mono">
                  {estimatedBreachRiskReduction} Protection
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Deterministic Ed25519 single-use leases eliminate race conditions.
                </p>
              </div>
              <Button asChild size="lg" className="shrink-0 shadow-[0_0_15px_rgba(0,255,102,0.25)]">
                <a href="#signup">Claim ROI Pilot</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

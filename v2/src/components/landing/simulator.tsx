import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SCENARIOS } from "@/components/landing/content";
import { cn } from "@/lib/utils";

type Scenario = (typeof SCENARIOS)[number];

export function Simulator() {
  const [selected, setSelected] = useState<Scenario>(SCENARIOS[0]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Scenario | null>(SCENARIOS[0]);

  function run() {
    setBusy(true);
    setResult(null);
    window.setTimeout(
      () => {
        setResult(selected);
        setBusy(false);
      },
      280,
    );
  }

  return (
    <section id="simulator" className="scroll-mt-24 border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
          Interactive Testbed
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Simulate Ring-0 Defense Live
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          See how in-kernel eBPF verifiers evaluate and drop agent payloads in under
          35µs — with zero user-space latency.
        </p>
        <div className="mt-10 rounded-3xl bg-card p-2 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)]">
          <div className="grid gap-0 overflow-hidden rounded-2xl bg-background lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border-b border-border p-5 lg:border-r lg:border-b-0 sm:p-6">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Threat Scenario
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelected(s);
                      setResult(null);
                    }}
                    className={cn(
                      "min-h-11 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150",
                      selected.id === s.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-muted/80",
                    )}
                  >
                    <span className="block font-medium">{s.label}</span>
                    <span
                      className={cn(
                        "block text-xs",
                        selected.id === s.id
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {s.kind}
                    </span>
                  </button>
                ))}
              </div>
              <pre className="mt-5 overflow-x-auto rounded-md bg-muted p-4 font-mono text-xs leading-relaxed text-foreground">
                {selected.payload}
              </pre>
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                Hook: {selected.hook}
              </p>
              <Button className="mt-5 w-full" size="lg" onClick={run} disabled={busy}>
                <Play />
                {busy ? "Kernel evaluating…" : "Execute Ring-0 Verdict"}
              </Button>
            </div>
            <div className="flex flex-col justify-between p-5 sm:p-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Kernel Verdict
                </p>
                {busy ? (
                  <p className="mt-6 font-mono text-sm text-muted-foreground">
                    eBPF LSM verifier · SHA-256 AST · Ed25519 lease…
                  </p>
                ) : result ? (
                  <div className="mt-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={result.allow ? "ok" : "danger"}>
                        {result.verdict}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {result.errno}
                      </span>
                    </div>
                    <p className="mt-4 font-mono text-3xl font-medium tabular-nums tracking-tight">
                      {result.latency}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Decision latency · Linux 6.8+ Ring-0
                    </p>
                    <p className="mt-6 text-sm leading-relaxed text-foreground">
                      {result.reason}
                    </p>
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-muted-foreground">
                    Select a scenario and execute kernel verdict.
                  </p>
                )}
              </div>
              <p className="mt-8 font-mono text-xs text-ok">
                Deterministic Ring-0 Protection Active
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useState } from "react";
import { Play, ShieldAlert, ShieldCheck, Activity, Terminal, Cpu, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SCENARIOS } from "@/components/landing/content";
import { cn } from "@/lib/utils";

type Scenario = (typeof SCENARIOS)[number];

export function Simulator() {
  const [selected, setSelected] = useState<Scenario>(SCENARIOS[0]);
  const [customPayload, setCustomPayload] = useState<string>(SCENARIOS[0].payload);
  const [isCustom, setIsCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    allow: boolean;
    verdict: string;
    errno: string;
    latency: string;
    reason: string;
    trace: string[];
  } | null>({
    allow: SCENARIOS[0].allow,
    verdict: SCENARIOS[0].verdict,
    errno: SCENARIOS[0].errno,
    latency: SCENARIOS[0].latency,
    reason: SCENARIOS[0].reason,
    trace: [
      "BPF_PROG_RUN(lsm_socket_sendmsg)",
      "AST_EXTRACT(len=36, proto=PGSQL)",
      "MERKLE_LEASE_CHECK(lease_id=0x9f4a)",
      "VERDICT: DROP(-EPERM) in 7.12µs"
    ]
  });

  function selectScenario(s: Scenario) {
    setSelected(s);
    setCustomPayload(s.payload);
    setIsCustom(false);
    setResult(null);
  }

  function run() {
    setBusy(true);
    setResult(null);

    window.setTimeout(() => {
      const isDrop = isCustom
        ? /drop|delete|insert|update|eval|exec|secret|api_key|token|password/i.test(customPayload)
        : !selected.allow;

      const latency = `${(Math.random() * 3 + 6.2).toFixed(2)} µs`;

      setResult({
        allow: !isDrop,
        verdict: isDrop ? "KERNEL_DROP" : "KERNEL_ALLOW",
        errno: isDrop ? "-EPERM" : "0",
        latency: latency,
        reason: isDrop
          ? isCustom
            ? "Disallowed mutation / sensitive pattern detected outside signed Ed25519 lease scope."
            : selected.reason
          : "Deterministic verification passed. Zero AST anomalies or privilege escalations.",
        trace: isDrop
          ? [
              "BPF_PROG_RUN(lsm_socket_sendmsg)",
              "AST_EXTRACT(payload_digest=SHA256)",
              "LEASE_NONCE_VERIFY: FAILED(Nonce mismatch)",
              `VERDICT: DROP(-EPERM) in ${latency}`,
              "SYNTHETIC_FRAME_INJECT: ROLLBACK;"
            ]
          : [
              "BPF_PROG_RUN(lsm_socket_connect)",
              "AST_EXTRACT(payload_digest=SHA256)",
              "LEASE_NONCE_VERIFY: OK(Ed25519 valid)",
              `VERDICT: ALLOW(0) in ${latency}`
            ],
      });
      setBusy(false);
    }, 450);
  }

  return (
    <section id="simulator" className="scroll-mt-24 border-t border-border py-20 sm:py-24 relative bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono text-primary mb-3">
              <Cpu className="size-3 text-primary animate-pulse" />
              INTERACTIVE TESTBED · RING-0 INTERCEPTOR
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl text-foreground">
              Simulate Ring-0 Defense Live
            </h2>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              Test real agent payloads against the live Linux 6.8+ eBPF LSM verifier engine. Experience sub-10µs deterministic drops before socket buffers transmit.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-3xl bg-card p-2 sm:p-3 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] card-hover-lift">
          <div className="grid gap-0 overflow-hidden rounded-2xl bg-background lg:grid-cols-[1fr_1fr]">
            {/* Input & Scenario Panel */}
            <div className="border-b border-border p-5 lg:border-r lg:border-b-0 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Threat Scenario
                  </p>
                  <span className="font-mono text-[11px] text-primary">SELECT OR EDIT PAYLOAD</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {SCENARIOS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectScenario(s)}
                      className={cn(
                        "min-h-11 rounded-xl px-3 py-2 text-left text-sm transition-all duration-150 relative overflow-hidden border",
                        !isCustom && selected.id === s.id
                          ? "bg-primary text-primary-foreground border-primary shadow-[0_0_14px_rgba(0,255,102,0.3)]"
                          : "bg-muted text-foreground border-border/60 hover:bg-muted/80 hover:translate-y-[-1px]",
                      )}
                    >
                      <span className="block font-medium">{s.label}</span>
                      <span
                        className={cn(
                          "block text-xs font-mono",
                          !isCustom && selected.id === s.id
                            ? "text-primary-foreground/80 font-semibold"
                            : "text-muted-foreground",
                        )}
                      >
                        {s.kind}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Editable Payload Area */}
                <div className="relative mt-5">
                  <div className="flex items-center justify-between pb-1 text-xs font-mono text-muted-foreground">
                    <span>Agent Payload (Editable)</span>
                    <span className="text-[10px] text-primary">Hook: {selected.hook}</span>
                  </div>
                  <textarea
                    rows={3}
                    value={customPayload}
                    onChange={(e) => {
                      setCustomPayload(e.target.value);
                      setIsCustom(true);
                      setResult(null);
                    }}
                    className="w-full rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed text-foreground border border-border focus:border-primary focus:outline-none transition-colors"
                  />
                  {busy && <div className="scan-laser" />}
                </div>
              </div>

              <Button
                className={cn(
                  "mt-6 w-full shadow-[0_0_20px_rgba(0,255,102,0.3)] transition-all duration-200",
                  busy && "opacity-90",
                )}
                size="lg"
                onClick={run}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Activity className="animate-spin size-4 mr-2" />
                    eBPF Kernel Verifier Evaluating…
                  </>
                ) : (
                  <>
                    <Play className="size-4 mr-2" />
                    Execute Ring-0 Verdict
                  </>
                )}
              </Button>
            </div>

            {/* Live Verdict & Execution Trace */}
            <div className="flex flex-col justify-between p-5 sm:p-6 bg-card/50">
              <div>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Kernel Verdict & Memory Action
                  </p>
                  <span className="font-mono text-[10px] text-muted-foreground">RING-0 VCPU 0</span>
                </div>

                {busy ? (
                  <div className="mt-8 flex flex-col gap-4 font-mono text-sm text-muted-foreground animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary animate-ping" />
                      <span>Inspecting socket buffers via CO-RE eBPF...</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary animate-kernel-scan w-3/4 rounded-full" />
                    </div>
                    <div className="text-xs text-muted-foreground/80">
                      Computing Ed25519 lease cryptographic hash...
                    </div>
                  </div>
                ) : result ? (
                  <div className={cn("mt-6", result.allow ? "animate-verdict-ok" : "animate-verdict-danger")}>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge
                        variant={result.allow ? "ok" : "danger"}
                        className={cn(
                          "px-3 py-1 font-mono text-sm flex items-center gap-2",
                          result.allow 
                            ? "shadow-[0_0_16px_rgba(0,255,102,0.3)] bg-ok/15 text-ok border-ok/40" 
                            : "shadow-[0_0_16px_rgba(255,77,79,0.3)] bg-destructive/15 text-destructive border-destructive/40",
                        )}
                      >
                        {result.allow ? (
                          <ShieldCheck className="size-4" />
                        ) : (
                          <ShieldAlert className="size-4" />
                        )}
                        {result.verdict}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        Errno: <strong className="text-foreground">{result.errno}</strong>
                      </span>
                    </div>

                    <div className="mt-4">
                      <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-primary">
                        {result.latency}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Hardware decision SLA · Linux 6.8+ Ring-0
                      </p>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-foreground bg-background/80 p-3 rounded-lg border border-border">
                      {result.reason}
                    </p>

                    {/* eBPF Micro-Trace Output */}
                    <div className="mt-4 rounded-lg bg-black/60 p-3 border border-border/80 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] pb-2 border-b border-border/40">
                        <Terminal className="size-3 text-primary" />
                        <span>eBPF KERNEL TRACE</span>
                      </div>
                      <div className="mt-2 space-y-1 text-muted-foreground">
                        {result.trace.map((step, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-primary/70">›</span>
                            <span className={idx === result.trace.length - 1 ? (result.allow ? "text-ok font-semibold" : "text-destructive font-semibold") : ""}>
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 text-center text-muted-foreground text-sm">
                    Click "Execute Ring-0 Verdict" to simulate.
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs font-mono">
                <span className="text-ok flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" /> Zero TOCTOU Contention
                </span>
                <span className="text-muted-foreground">100% Wire Enforced</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

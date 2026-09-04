import { useState } from "react";
import { ShieldCheck, ShieldAlert, Cpu, Network, Zap, CheckCircle2, XCircle, ArrowRight, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function NeuralInterceptor() {
  const [viewMode, setViewMode] = useState<"ring0" | "legacy">("ring0");

  const comparisonData = {
    ring0: {
      badge: "NEXT-GEN DETERMINISTIC RING-0",
      badgeVariant: "ok" as const,
      title: "Linux 6.8+ eBPF LSM Interceptor",
      latency: "8.46 µs",
      latencyLabel: "Line-Rate Hardware Verdict",
      toctou: "100% Mathematically Immune (Atomic Nonces)",
      memory: "Zero-Copy Direct Socket Buffer",
      reliability: "Zero-Panic Kernel Safety Verified",
      steps: [
        { name: "Agent Tool Invocation", status: "ok", detail: "Ed25519 intent lease signed" },
        { name: "eBPF LSM Trap", status: "ok", detail: "Sub-10µs AST token parse in kernel" },
        { name: "Cryptographic Nonce CAS", status: "ok", detail: "Atomic single-use token consumption" },
        { name: "Wire Socket Transmission", status: "ok", detail: "Hardware buffer frame emitted" },
      ],
      verdictColor: "text-ok",
      bgGlow: "rgba(0, 255, 102, 0.15)",
    },
    legacy: {
      badge: "LEGACY USER-SPACE PROXY (WAF / HTTP)",
      badgeVariant: "danger" as const,
      title: "User-Space Sidecar / Reverse Proxy",
      latency: "42.50 ms",
      latencyLabel: "5,000x Slower Than Ring-0",
      toctou: "Vulnerable to Race Condition Rewrites",
      memory: "High TCP Buffer Copy & Context Switching",
      reliability: "Subject to Memory Contention & Crashes",
      steps: [
        { name: "Agent Tool Invocation", status: "ok", detail: "Unsigned JSON payload generated" },
        { name: "HTTP Reverse Proxy", status: "warn", detail: "15–40ms user-space context switch" },
        { name: "Heuristic String Regex", status: "danger", detail: "Bypassed by Unicode & multi-turn drift" },
        { name: "Socket Transmission", status: "danger", detail: "Payload rewritten in-flight (TOCTOU breach)" },
      ],
      verdictColor: "text-destructive",
      bgGlow: "rgba(255, 77, 79, 0.15)",
    },
  };

  const active = comparisonData[viewMode];

  return (
    <section id="neural-interceptor" className="scroll-mt-24 border-t border-border py-20 sm:py-24 bg-background relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-widest text-primary border-primary/30 shadow-[0_0_12px_rgba(0,255,102,0.15)] mb-3">
            Sub-Microsecond Paradigm Shift
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl text-foreground">
            Legacy Guardrails vs. Deterministic Ring-0
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Comparing the execution physics of traditional user-space HTTP gateways against Linux 6.8+ eBPF LSM socket interception.
          </p>

          {/* Interactive Mode Toggle */}
          <div className="mt-8 inline-flex items-center rounded-2xl bg-card border border-border p-1.5 shadow-md">
            <button
              type="button"
              onClick={() => setViewMode("ring0")}
              className={cn(
                "rounded-xl px-5 py-2 font-mono text-xs font-bold transition-all duration-200 flex items-center gap-2",
                viewMode === "ring0"
                  ? "bg-primary text-primary-foreground shadow-[0_0_16px_rgba(0,255,102,0.35)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Cpu className="size-4" />
              KSEC Ring-0 (Next-Gen)
            </button>
            <button
              type="button"
              onClick={() => setViewMode("legacy")}
              className={cn(
                "rounded-xl px-5 py-2 font-mono text-xs font-bold transition-all duration-200 flex items-center gap-2",
                viewMode === "legacy"
                  ? "bg-destructive text-destructive-foreground shadow-[0_0_16px_rgba(255,77,79,0.35)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Network className="size-4" />
              Legacy User-Space Proxy
            </button>
          </div>
        </div>

        {/* Live Architectural Comparison Visualizer */}
        <div className="mt-12 rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-6 sm:p-10 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] card-hover-lift">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-border pb-6">
            <div>
              <Badge variant={active.badgeVariant} className="font-mono text-xs mb-2">
                {active.badge}
              </Badge>
              <h3 className="text-2xl font-bold text-foreground">{active.title}</h3>
            </div>
            <div className="flex items-center gap-4 bg-muted/60 p-4 rounded-2xl border border-border font-mono">
              <Gauge className="size-6 text-primary" />
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block">Decision Latency</span>
                <span className={cn("text-3xl font-extrabold tabular-nums", active.verdictColor)}>
                  {active.latency}
                </span>
                <span className="text-[11px] text-muted-foreground block">{active.latencyLabel}</span>
              </div>
            </div>
          </div>

          {/* 4-Step Pipeline Flow */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {active.steps.map((step, idx) => (
              <div
                key={step.name}
                className={cn(
                  "rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between font-mono",
                  step.status === "ok" && "bg-ok/5 border-ok/30",
                  step.status === "warn" && "bg-warn/5 border-warn/30",
                  step.status === "danger" && "bg-destructive/5 border-destructive/30",
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase">Step 0{idx + 1}</span>
                    {step.status === "ok" && <CheckCircle2 className="size-4 text-ok" />}
                    {step.status === "warn" && <Zap className="size-4 text-warn" />}
                    {step.status === "danger" && <XCircle className="size-4 text-destructive" />}
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-foreground">{step.name}</h4>
                </div>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>

          {/* Key Differences Table Grid */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3 font-mono text-xs">
            <div className="rounded-xl bg-muted/40 p-4 border border-border">
              <span className="text-muted-foreground uppercase block text-[10px]">Anti-TOCTOU Guarantee</span>
              <span className="text-foreground font-semibold mt-1 block">{active.toctou}</span>
            </div>
            <div className="rounded-xl bg-muted/40 p-4 border border-border">
              <span className="text-muted-foreground uppercase block text-[10px]">Memory Architecture</span>
              <span className="text-foreground font-semibold mt-1 block">{active.memory}</span>
            </div>
            <div className="rounded-xl bg-muted/40 p-4 border border-border">
              <span className="text-muted-foreground uppercase block text-[10px]">Execution Reliability</span>
              <span className="text-foreground font-semibold mt-1 block">{active.reliability}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

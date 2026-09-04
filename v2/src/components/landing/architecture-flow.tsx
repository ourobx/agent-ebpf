import { ArrowRight, Shield, Zap, Database, Terminal, Cpu, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ArchitectureFlow() {
  return (
    <section id="architecture-flow" className="scroll-mt-24 border-t border-border py-20 sm:py-24 bg-background relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-widest text-primary border-primary/30 shadow-[0_0_12px_rgba(0,255,102,0.15)]">
            Deterministic Kernel Boundary
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Why User-Space WAFs Fail. <span className="text-primary">How Ring-0 Prevents Breaches.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Traditional AI guardrails operate in user-space, suffering from 15–40ms latency and fatal TOCTOU (Time-of-Check to Time-of-Use) race conditions. KSEC verifies Ed25519 cryptographic intent directly in Linux Ring-0 socket buffers.
          </p>
        </div>

        {/* 3-Stage Architecture Pipeline Grid */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {/* Stage 1 */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm card-hover-lift flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Layer 01</span>
                <Badge variant="outline">User-Space</Badge>
              </div>
              <div className="mt-4 flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <Terminal className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">AI Agent Execution Fleet</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Autonomous LLMs, LangChain tools, or CrewAI swarms generate queries, code executions, and financial API calls.
              </p>
            </div>
            <div className="mt-6 rounded-lg bg-muted/60 p-3 font-mono text-[11px] text-muted-foreground border border-border/50">
              Payload: <span className="text-foreground">SELECT * FROM secrets</span>
            </div>
          </div>

          {/* Stage 2 (Hero Center) */}
          <div className="rounded-2xl border border-primary/40 bg-card p-6 shadow-[0_0_25px_rgba(0,255,102,0.12)] card-hover-lift flex flex-col justify-between relative">
            <div className="absolute -top-3 right-6">
              <span className="inline-flex items-center rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold text-primary-foreground shadow-sm">
                8.46 µs Deterministic
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-primary uppercase tracking-wider font-semibold">Layer 02 // Core</span>
                <Badge variant="ok">Ring-0 LSM</Badge>
              </div>
              <div className="mt-4 flex size-10 items-center justify-center rounded-lg bg-primary/20 text-primary shadow-[0_0_12px_rgba(0,255,102,0.3)]">
                <Cpu className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-primary">KSEC eBPF Security Gate</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Linux kernel hooks (<code className="font-mono text-xs text-foreground">lsm/socket_connect</code> &amp; <code className="font-mono text-xs text-foreground">sk_msg</code>) verify the AST digest against Ed25519 single-use leases.
              </p>
            </div>
            <div className="mt-6 rounded-lg bg-primary/10 p-3 font-mono text-[11px] text-primary border border-primary/20 flex items-center justify-between">
              <span>Verdict: KERNEL_VERIFIED</span>
              <CheckCircle className="size-4 text-primary" />
            </div>
          </div>

          {/* Stage 3 */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm card-hover-lift flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Layer 03</span>
                <Badge variant="outline">Infrastructure</Badge>
              </div>
              <div className="mt-4 flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <Database className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Enterprise Wire &amp; Storage</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Only cryptographically authorized socket buffers transmit to PostgreSQL, ClickHouse, Stripe, or external microservices.
              </p>
            </div>
            <div className="mt-6 rounded-lg bg-muted/60 p-3 font-mono text-[11px] text-muted-foreground border border-border/50">
              Socket Transmit: <span className="text-ok">0 Packet Drops · Zero Corruption</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

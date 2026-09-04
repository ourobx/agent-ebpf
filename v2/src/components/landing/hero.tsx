import { useEffect, useState } from "react";
import { ArrowRight, Github, Shield, Terminal, Zap, Sparkles, Cpu, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LOG_LINES } from "@/components/landing/content";
import { HeroCanvas } from "@/components/landing/hero-canvas";
import { cn } from "@/lib/utils";

const METRICS = [
  { value: "8.46 µs", label: "Verification SLA", hint: "Line-Rate Hardware P99 < 35µs" },
  { value: "82,279", label: "Events / sec / core", hint: "Zero-copy sustained throughput" },
  { value: "1.42 Mpps", label: "Packet Capacity", hint: "Native XDP FastPath Ingress" },
  { value: "100%", label: "TOCTOU Immunity", hint: "Atomic single-use Nonce CAS" },
] as const;

export function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-28 bg-[#050709]">
      {/* Dynamic Particle & Mesh Raytracing Background */}
      <HeroCanvas />
      <div className="hero-wash pointer-events-none absolute inset-0" />
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-30" />
      <Rings />
      
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] z-10">
        <div className="stagger-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 font-mono text-xs text-primary shadow-[0_0_20px_rgba(0,255,102,0.25)]">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span>SOVEREIGN DEFENSE SUBSTRATE FOR NEXT-GEN AI &amp; AGI</span>
          </div>

          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.06] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Autonomous AI defense.{" "}
            <span className="text-primary drop-shadow-[0_0_32px_rgba(0,255,102,0.5)]">
              Deterministic at Ring-0.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Sub-50µs kernel infrastructure for frontier reasoning models, autonomous agent swarms, and tool runtimes. Prompt injection, TOCTOU race rewrites, and unauthorized mutations are neutralized in Linux 6.8+ eBPF before network sockets transmit.
          </p>

          <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
            <Button asChild size="xl" className="shadow-[0_0_28px_rgba(0,255,102,0.4)] hover:shadow-[0_0_40px_rgba(0,255,102,0.65)] transition-all duration-200 font-mono text-sm">
              <a href="#signup">
                Start 14-Day Pilot
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
            <Button asChild size="xl" variant="outline" className="border-border/80 hover:bg-muted/80 transition-all duration-200 font-mono text-sm">
              <a
                href="https://github.com/ourobx/agent-ebpf"
                target="_blank"
                rel="noreferrer"
              >
                <Github className="size-4 mr-2" />
                Whitepaper &amp; GitHub
              </a>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5 text-foreground/80">
              <Shield className="size-3.5 text-primary" />
              SOC-2 Type II Sealed
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-1.5 text-foreground/80">
              <Lock className="size-3.5 text-primary" />
              Ed25519 Leases
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-1.5 text-foreground/80">
              <Zap className="size-3.5 text-primary" />
              Sub-10µs Line-Rate
            </span>
          </div>
        </div>

        <KernelConsole />
      </div>

      <dl className="relative mx-auto mt-16 grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border/80 sm:grid-cols-4 z-10 shadow-2xl">
        {METRICS.map((m) => (
          <div key={m.label} className="bg-card/90 backdrop-blur-md px-4 py-5 sm:px-6 card-hover-lift">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-mono">
              {m.label}
            </dt>
            <dd className="mt-2 font-mono text-2xl font-bold tabular-nums tracking-tight sm:text-3xl text-gradient">
              {m.value}
            </dd>
            <p className="mt-1 text-xs text-muted-foreground">{m.hint}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Rings() {
  return (
    <svg
      className="pointer-events-none absolute top-12 right-[-8%] hidden h-[600px] w-[600px] text-foreground opacity-[0.16] lg:block"
      viewBox="0 0 520 520"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="260" cy="260" r="240" stroke="currentColor" strokeWidth="1" strokeDasharray="6 6" className="animate-radar-slow" />
      <circle cx="260" cy="260" r="170" stroke="#00ff66" strokeWidth="1.4" strokeDasharray="12 8" className="animate-radar-reverse" />
      <circle cx="260" cy="260" r="100" stroke="currentColor" strokeWidth="1" />
      <circle cx="260" cy="260" r="36" fill="#00ff66" className="animate-pulse-dot" opacity="0.4" />
    </svg>
  );
}

function KernelConsole() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % LOG_LINES.length);
    }, 1800);
    return () => window.clearInterval(id);
  }, []);

  const visible = Array.from({ length: 5 }, (_, n) => {
    const i = (index + n) % LOG_LINES.length;
    return { ...LOG_LINES[i], key: `${index}-${n}` };
  });

  return (
    <div className="rounded-3xl bg-card/90 backdrop-blur-xl p-2.5 shadow-[0_0_0_1px_rgb(255_255_255_/_0.1)] card-hover-lift">
      <div className="overflow-hidden rounded-2xl bg-background/95 border border-border/60">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="relative flex size-2.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-ok opacity-75 animate-ping-slow" />
              <span className="relative inline-flex size-2 rounded-full bg-ok animate-pulse-dot" />
            </div>
            <p className="font-mono text-xs text-muted-foreground flex items-center gap-1.5">
              <Terminal className="size-3.5 text-primary" />
              <span>ksec-ebpf-lsm // us-east-1a</span>
            </p>
          </div>
          <Badge variant="ok" className="shadow-[0_0_10px_rgba(0,255,102,0.25)] font-mono text-[11px]">
            Ring-0 Active
          </Badge>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Live Interceptor Log
            </p>
            <span className="font-mono text-[10px] text-primary">BUFFER: ZERO-COPY</span>
          </div>
          <ul className="mt-3 space-y-2 font-mono text-xs">
            {visible.map((line) => (
              <li
                key={line.key}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md bg-muted/70 px-3 py-2 animate-log-in border border-transparent hover:border-border transition-colors duration-150"
              >
                <span className="tabular-nums text-muted-foreground font-semibold">{line.t}</span>
                <span className="text-foreground/90 font-medium">{line.hook}</span>
                <span className="text-muted-foreground text-[11px]">{line.agent}</span>
                <span
                  className={cn(
                    "ml-auto font-bold px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide",
                    line.action === "DROP" 
                      ? "text-destructive bg-destructive/15 border border-destructive/30 shadow-[0_0_8px_rgba(255,77,79,0.25)]" 
                      : "text-ok bg-ok/15 border border-ok/30 shadow-[0_0_8px_rgba(0,255,102,0.25)]",
                  )}
                >
                  {line.action}
                </span>
                <span className="w-full text-muted-foreground text-[11px] truncate">{line.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

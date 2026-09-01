import { useEffect, useState } from "react";
import { ArrowRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LOG_LINES } from "@/components/landing/content";
import { cn } from "@/lib/utils";

const METRICS = [
  { value: "8.46 µs", label: "Verification SLA", hint: "Avg ~8µs · P99 < 50µs" },
  { value: "82,279", label: "Events / sec / core", hint: "Sustained throughput" },
  { value: "1.42 Mpps", label: "Line-rate capacity", hint: "Native XDP FastPath" },
  { value: "0%", label: "Memory contention", hint: "Zero-TOCTOU atomic nonce" },
] as const;

export function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-24">
      <div className="hero-wash pointer-events-none absolute inset-0" />
      <div className="hero-grid pointer-events-none absolute inset-0" />
      <Rings />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="stagger-in">
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-widest">
            Ring-0 Autonomous Defense · Linux 6.8+ eBPF LSM
          </Badge>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Autonomous AI defense.{" "}
            <span className="text-primary">Deterministic at Ring-0.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            Sub-50µs kernel infrastructure for enterprise AI agents. Prompt injection,
            TOCTOU race conditions, and unauthorized tool mutations are intercepted
            inside Linux eBPF before network sockets transmit.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="xl">
              <a href="#signup">
                Start 14-day pilot
                <ArrowRight />
              </a>
            </Button>
            <Button asChild size="xl" variant="outline">
              <a
                href="https://github.com/ourobx/agent-ebpf"
                target="_blank"
                rel="noreferrer"
              >
                <Github />
                Whitepaper & GitHub
              </a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            SOC-2 Type II & HIPAA Ready · LangChain, CrewAI, Vercel AI SDK
          </p>
        </div>
        <KernelConsole />
      </div>
      <dl className="relative mx-auto mt-16 grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.label} className="bg-card px-4 py-5 sm:px-6">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {m.label}
            </dt>
            <dd className="mt-2 font-mono text-2xl font-medium tabular-nums tracking-tight text-foreground sm:text-3xl">
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
      className="pointer-events-none absolute top-12 right-[-8%] hidden h-[520px] w-[520px] text-foreground opacity-[0.07] lg:block"
      viewBox="0 0 520 520"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="260" cy="260" r="240" stroke="currentColor" strokeWidth="1" />
      <circle cx="260" cy="260" r="170" stroke="currentColor" strokeWidth="1" />
      <circle cx="260" cy="260" r="100" stroke="currentColor" strokeWidth="1" />
      <circle cx="260" cy="260" r="36" fill="currentColor" className="text-primary" opacity="0.35" />
    </svg>
  );
}

function KernelConsole() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % LOG_LINES.length);
    }, 1600);
    return () => window.clearInterval(id);
  }, []);

  const visible = Array.from({ length: 5 }, (_, n) => {
    const i = (index + n) % LOG_LINES.length;
    return { ...LOG_LINES[i], key: `${index}-${n}` };
  });

  return (
    <div className="rounded-3xl bg-card p-2 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)]">
      <div className="overflow-hidden rounded-2xl bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-ok motion-safe-only" style={{ animation: "pulse-dot 1.6s ease-in-out infinite" }} />
            <p className="font-mono text-xs text-muted-foreground">
              ksec-ebpf-lsm // us-east-1a
            </p>
          </div>
          <Badge variant="ok">Ring-0 Active</Badge>
        </div>
        <div className="px-4 py-3">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Live Interceptor Log
            </p>
          <ul className="mt-3 space-y-2 font-mono text-xs">
            {visible.map((line) => (
              <li
                key={line.key}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md bg-muted/60 px-3 py-2"
                style={{ animation: "log-in 250ms cubic-bezier(0.22, 1, 0.36, 1)" }}
              >
                <span className="tabular-nums text-muted-foreground">{line.t}</span>
                <span className="text-foreground/80">{line.hook}</span>
                <span className="text-muted-foreground">{line.agent}</span>
                <span
                  className={cn(
                    "ml-auto font-medium",
                    line.action === "DROP" ? "text-destructive" : "text-ok",
                  )}
                >
                  {line.action}
                </span>
                <span className="w-full text-muted-foreground">{line.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

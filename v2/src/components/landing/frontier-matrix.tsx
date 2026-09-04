import { useState } from "react";
import { Sparkles, Shield, Cpu, Lock, CheckCircle2, ArrowRight, Zap, Bot, Layers, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FRONTIER_MODELS } from "@/components/landing/content";
import { cn } from "@/lib/utils";

export function FrontierMatrix() {
  const [activeModel, setActiveModel] = useState(0);

  const modelSpecs = [
    {
      title: "Reasoning & Frontier LLMs",
      subtitle: "OpenAI GPT-5 · Claude 3.7/4 · Gemini 2.0 Pro",
      desc: "Deep multi-step reasoning models synthesize complex multi-turn plans. KSEC embeds in-kernel AST token analyzers that mathematically verify every execution boundary before socket I/O happens.",
      badge: "Zero Prompt Drift",
      metrics: [
        { label: "Hardware Decision Latency", val: "7.12 µs" },
        { label: "AST Parse Accuracy", val: "100.0%" },
        { label: "TOCTOU Race Immunity", val: "Zero-Vulnerability" },
      ],
      diagram: "Prompt -> Reasoning DAG -> eBPF Ring-0 LSM -> Wire Socket"
    },
    {
      title: "Autonomous Agent Swarms",
      subtitle: "CrewAI · Microsoft AutoGen · LangGraph · OpenClaw",
      desc: "When hundreds of autonomous subagents collaborate in recursive execution loops, a single poisoned context can cascade across the swarm. KSEC provides cryptographic tenant isolation and hardware-level memory barriers.",
      badge: "Swarm Quarantine",
      metrics: [
        { label: "Cross-Agent Leakage", val: "0 bytes" },
        { label: "Concurrent Swarm Quota", val: "50,000 agents" },
        { label: "Cascading Rollback SLA", val: "< 35 µs" },
      ],
      diagram: "Planner -> Worker Agents -> Kernel Nonce Lease -> Execution"
    },
    {
      title: "Self-Hosted Cluster Mesh",
      subtitle: "DeepSeek-R1 · Llama-3.3 405B · vLLM · Ollama",
      desc: "Bare-metal GPU and private cloud clusters require sovereign data boundaries. KSEC attaches native XDP line-rate FastPath filters directly into the Linux network interface card (NIC), bypassing user-space overhead.",
      badge: "Sovereign eBPF Mesh",
      metrics: [
        { label: "Line-Rate Throughput", val: "1.42 Mpps" },
        { label: "GPU Contention Added", val: "0.00%" },
        { label: "Audit Merkle Integrity", val: "SHA-256 Sealed" },
      ],
      diagram: "GPU vLLM -> Linux 6.8+ NIC -> XDP FastPath -> Private VPC"
    },
  ];

  return (
    <section id="frontier-matrix" className="scroll-mt-24 border-t border-border py-20 sm:py-24 bg-background relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-xs font-mono text-primary mb-3 shadow-[0_0_16px_rgba(0,255,102,0.2)]">
            <Sparkles className="size-3.5 text-primary animate-pulse" />
            <span>DESIGNED FOR ALL FRONTIER AI GENERATIONS</span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl text-foreground">
            The Unbreakable Substrate for Next-Gen AGI
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            As artificial intelligence evolves from text completion to autonomous reasoning swarms and tool-executing superintelligence, probabilistic user-space filters become obsolete. KSEC enforces deterministic Ring-0 kernel invariants across all frontier architectures.
          </p>
        </div>

        {/* Model Support Grid Badges */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {FRONTIER_MODELS.map((model, idx) => (
            <div
              key={model.name}
              className="rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm p-3.5 flex flex-col justify-between hover:border-primary/50 transition-all duration-200 card-hover-lift"
            >
              <div>
                <span className="font-mono text-[10px] text-primary uppercase font-bold tracking-wider">
                  {model.protection}
                </span>
                <p className="mt-1 text-xs font-semibold text-foreground leading-snug">
                  {model.name}
                </p>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground font-mono">
                {model.type}
              </p>
            </div>
          ))}
        </div>

        {/* Interactive Architecture Deep Dive Card */}
        <div className="mt-12 rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-6 sm:p-10 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] card-hover-lift">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-6">
            <div className="flex flex-wrap gap-2">
              {modelSpecs.map((spec, idx) => (
                <button
                  key={spec.title}
                  type="button"
                  onClick={() => setActiveModel(idx)}
                  className={cn(
                    "rounded-xl px-4 py-2 font-mono text-xs font-semibold transition-all duration-150 flex items-center gap-2",
                    activeModel === idx
                      ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,255,102,0.3)]"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                  )}
                >
                  <Bot className="size-3.5" />
                  {spec.title}
                </button>
              ))}
            </div>

            <Badge variant="ok" className="font-mono text-xs shadow-sm">
              {modelSpecs[activeModel].badge}
            </Badge>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-center">
            <div>
              <p className="font-mono text-xs text-primary uppercase tracking-widest font-semibold">
                Frontier Architecture Specs
              </p>
              <h3 className="mt-2 text-2xl font-bold text-foreground">
                {modelSpecs[activeModel].subtitle}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {modelSpecs[activeModel].desc}
              </p>

              <div className="mt-6 rounded-xl bg-black/60 p-4 border border-border/80 font-mono text-xs">
                <p className="text-muted-foreground text-[10px] uppercase pb-2 border-b border-border/40">
                  Ring-0 Execution Pipeline
                </p>
                <p className="mt-2 text-primary font-medium flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse-dot" />
                  {modelSpecs[activeModel].diagram}
                </p>
              </div>
            </div>

            <div className="grid gap-3 font-mono">
              {modelSpecs[activeModel].metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl bg-muted/60 p-4 border border-border/60 hover:border-primary/40 transition-colors"
                >
                  <span className="text-[11px] text-muted-foreground uppercase block">{m.label}</span>
                  <span className="text-xl font-bold text-foreground mt-1 block tabular-nums text-gradient">
                    {m.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

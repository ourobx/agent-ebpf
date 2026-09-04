import { useState } from "react";
import { Copy, Check, Terminal, Code2, Sparkles, Layers, Play, CheckCircle2 } from "lucide-react";
import { CODE_EXAMPLES } from "@/components/landing/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LangKey = keyof typeof CODE_EXAMPLES;

const SAMPLE_OUTPUTS: Record<LangKey, string> = {
  typescript: `// Console Output:
[Ring-0 LSM] Initialized Ed25519 lease signer (us-east-1a)
[KsecShield] Verifying intent hash: 0xa9f4...7b2c
Verdict: ALLOW (decision_latency: 8.12µs, errno: 0)
Socket Frame: TRANSMITTED via XDP FastPath`,
  python: `# Python FastMCP Output:
>>> from ksec_shield import KsecLSMInterceptor
>>> shield = KsecLSMInterceptor.load_default()
[INFO] Attached eBPF CO-RE probes to lsm/socket_sendmsg
>>> verdict = shield.audit_tool_call("agent-01", "SELECT * FROM users")
>>> print(verdict)
<Verdict action="ALLOW" latency="7.44µs" signature="ed25519:valid" />`,
  fastmcp: `// FastMCP Server Handshake:
Connected to ksec-fastmcp-daemon at /var/run/ksec.sock
Registered Tools:
  - ksec_verify_intent (eBPF Ring-0 lease enforcement)
  - ksec_inspect_pii   (Sub-50µs regex SIMD filter)
  - ksec_audit_export  (SHA-256 Merkle proof chain)`,
  ebpf: `/* Kernel RingBuffer Trace */
[  142.901842] ksec_ebpf: hook=lsm_socket_connect pid=24901 comm=python3
[  142.901849] ksec_ebpf: lease_id=0x19f AST_MATCH: SELECT allowed
[  142.901850] ksec_ebpf: returning 0 (ALLOW) in 8.46 microseconds`
};

export function Integration() {
  const [activeLang, setActiveLang] = useState<LangKey>("typescript");
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  const tabs: { key: LangKey; label: string; badge: string }[] = [
    { key: "typescript", label: "TypeScript / Node.js", badge: "npm @ourobx/shield" },
    { key: "python", label: "Python (FastMCP)", badge: "pip install ksec-shield" },
    { key: "fastmcp", label: "Cursor & Claude MCP", badge: "1-Click Config" },
    { key: "ebpf", label: "Linux 6.8+ eBPF (C)", badge: "Ring-0 Bytecode" },
  ];

  function copyCode() {
    navigator.clipboard.writeText(CODE_EXAMPLES[activeLang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function simulateRun() {
    setRunning(true);
    setShowOutput(false);
    setTimeout(() => {
      setRunning(false);
      setShowOutput(true);
    }, 400);
  }

  return (
    <section id="sdk" className="scroll-mt-24 border-t border-border py-20 sm:py-24 bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
              Developer &amp; SecOps Integration
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl text-foreground">
              Embed Ring-0 Kernel Defense in One Line
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Drop-in compatibility with LangChain, CrewAI, AutoGen, Vercel AI SDK, and custom LLM microservices. Available via FastMCP, Python SDK, TypeScript SDK, or native Linux daemon.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="font-mono text-xs text-muted-foreground border-border">
              Sub-50µs SLA
            </Badge>
            <Badge variant="ok" className="shadow-[0_0_8px_rgba(0,255,102,0.2)]">
              FastMCP Ready
            </Badge>
          </div>
        </div>

        {/* Interactive Code Switcher */}
        <div className="mt-10 rounded-2xl border border-border bg-card shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] overflow-hidden card-hover-lift">
          {/* Header Bar with Tabs */}
          <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/50 px-4 py-2.5 gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveLang(tab.key);
                    setShowOutput(false);
                  }}
                  className={cn(
                    "rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-all duration-150 flex items-center gap-2",
                    activeLang === tab.key
                      ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(0,255,102,0.2)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Code2 className="size-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={simulateRun}
                disabled={running}
                className="h-8 gap-1.5 font-mono text-xs border-primary/40 text-primary hover:bg-primary/10"
              >
                <Play className="size-3.5 fill-primary" />
                <span>{running ? "Simulating..." : "Run Test"}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={copyCode}
                className="h-8 gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-primary" />
                    <span className="text-primary">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Code Body */}
          <div className="relative">
            <pre className="overflow-x-auto p-5 sm:p-6 font-mono text-xs leading-relaxed text-foreground bg-[#040608]">
              <code>{CODE_EXAMPLES[activeLang]}</code>
            </pre>

            {/* Simulated Live Output Panel */}
            {showOutput && (
              <div className="border-t border-border bg-black/90 p-4 font-mono text-xs animate-log-in">
                <div className="flex items-center justify-between pb-2 text-[11px] text-muted-foreground border-b border-border/40">
                  <span className="flex items-center gap-1.5 text-primary">
                    <Terminal className="size-3.5" /> Execution Sandbox Output
                  </span>
                  <span className="text-ok flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Verdict Validated
                  </span>
                </div>
                <pre className="mt-2 text-muted-foreground whitespace-pre-wrap leading-relaxed text-[11px]">
                  {SAMPLE_OUTPUTS[activeLang]}
                </pre>
              </div>
            )}

            <div className="border-t border-border/40 bg-muted/20 px-5 py-3 flex items-center justify-between font-mono text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary animate-pulse-dot" />
                Zero-TOCTOU Guarantee · Linux 6.8+ eBPF CO-RE
              </span>
              <span className="text-foreground/80">{tabs.find(t => t.key === activeLang)?.badge}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

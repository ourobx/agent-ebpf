import { Logo } from "@/components/landing/logo";
import { ShieldCheck, Globe, Activity, Github, Terminal } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-[#030406] py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Deterministic Ring-0 defense engine for enterprise AI agents. Built on Linux 6.8+ eBPF LSM and zero-TOCTOU cryptographic leases. Sub-50µs SLA.
            </p>
            
            {/* Global Edge Region SLA Badge */}
            <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-3 font-mono text-xs">
              <div className="relative flex size-2 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-ok opacity-75 animate-ping-slow" />
                <span className="relative inline-flex size-2 rounded-full bg-ok" />
              </div>
              <span className="text-foreground font-medium">12 Global PoPs</span>
              <span className="text-muted-foreground">· 99.999% Kernel SLA · Active</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                Core Engine
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="#architecture" className="text-muted-foreground hover:text-primary transition-colors">Architecture</a></li>
                <li><a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Ring-0 LSM</a></li>
                <li><a href="#simulator" className="text-muted-foreground hover:text-primary transition-colors">Interactive Testbed</a></li>
                <li><a href="#benchmarks" className="text-muted-foreground hover:text-primary transition-colors">Benchmark SLA</a></li>
                <li><a href="#calculator" className="text-muted-foreground hover:text-primary transition-colors">ROI Calculator</a></li>
              </ul>
            </div>

            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                SDK &amp; FastMCP
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="#sdk" className="text-muted-foreground hover:text-primary transition-colors">TypeScript SDK</a></li>
                <li><a href="#sdk" className="text-muted-foreground hover:text-primary transition-colors">Python Shield</a></li>
                <li><a href="#sdk" className="text-muted-foreground hover:text-primary transition-colors">FastMCP Server</a></li>
                <li><a href="https://github.com/ourobx/agent-ebpf" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">GitHub Repository</a></li>
                <li><a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">API Docs (Swagger)</a></li>
              </ul>
            </div>

            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                Compliance &amp; Trust
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><span className="text-muted-foreground">SOC-2 Type II Sealed</span></li>
                <li><span className="text-muted-foreground">ISO/IEC 27001 Ready</span></li>
                <li><span className="text-muted-foreground">EU AI Act 2026 Art. 14</span></li>
                <li><span className="text-muted-foreground">HIPAA Data Vault</span></li>
                <li><a href="http://localhost:8000" target="_blank" rel="noreferrer" className="text-primary hover:underline transition-colors font-medium">SecOps Console →</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between border-t border-border/60 pt-8 gap-4 text-xs text-muted-foreground">
          <p>© 2026 KSEC Autonomous AI Defense. All rights reserved. Deterministic Ring-0 Engine.</p>
          <div className="flex items-center gap-4 font-mono">
            <span>v2.0.0-PROD</span>
            <span>·</span>
            <span>Linux 6.8+ eBPF LSM</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

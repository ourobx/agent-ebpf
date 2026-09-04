import { BENCHMARKS } from "@/components/landing/content";
import { cn } from "@/lib/utils";

export function Benchmarks() {
  return (
    <section id="benchmarks" className="scroll-mt-24 border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
          Performance SLA
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Architectural Benchmark
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Why Fortune 500 AI platforms choose Ring-0 eBPF over user-space reverse proxies.
        </p>
        <div className="mt-10 overflow-x-auto rounded-2xl shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] card-hover-lift">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-muted">
              <tr>
                {[
                  "Security Architecture",
                  "Average Latency",
                  "P99 SLA",
                  "Prompt Drift",
                  "Memory Contention",
                  "Kernel Guarantee",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 font-medium text-muted-foreground first:pl-5 last:pr-5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BENCHMARKS.map((row) => (
                <tr
                  key={row.name}
                  className={cn(
                    "border-t border-border transition-colors duration-150",
                    row.highlight 
                      ? "bg-primary/5 hover:bg-primary/10 font-medium" 
                      : "bg-card hover:bg-muted/40",
                  )}
                >
                  <td className="px-4 py-4 font-medium first:pl-5 flex items-center gap-2">
                    {row.highlight && <span className="size-2 rounded-full bg-primary animate-pulse-dot inline-block" />}
                    {row.name}
                  </td>
                  <td className={cn("px-4 py-4 font-mono tabular-nums", row.highlight && "text-primary font-bold drop-shadow-[0_0_6px_rgba(0,255,102,0.3)]")}>
                    {row.latency}
                  </td>
                  <td className={cn("px-4 py-4 font-mono tabular-nums", row.highlight && "text-primary font-medium")}>
                    {row.p99}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{row.drift}</td>
                  <td className="px-4 py-4 text-muted-foreground">{row.contention}</td>
                  <td className="px-4 py-4 pr-5 text-muted-foreground">{row.guarantee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

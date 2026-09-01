import { INTEGRATION_SNIPPET } from "@/components/landing/content";

const STACK = ["TypeScript / Node.js", "Python (FastMCP)", "Rust (Core)", "Linux Daemon (CLI)"];

export function Integration() {
  return (
    <section className="border-t border-border py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
            Developer Integration
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            FastMCP &amp; SDK in One Line
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Connect KSEC kernel protection to any AI framework with a single line of code.
            Compatible with LangChain, CrewAI, Vercel AI SDK, and custom LLM runtimes.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {STACK.map((item) => (
              <li
                key={item}
                className="rounded-full border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 font-mono text-xs text-muted-foreground">
            npm install @ourobx/shield
          </p>
        </div>
        <pre className="overflow-x-auto rounded-2xl bg-card p-5 font-mono text-xs leading-relaxed text-foreground shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] sm:p-6 sm:text-sm">
          {INTEGRATION_SNIPPET}
        </pre>
      </div>
    </section>
  );
}

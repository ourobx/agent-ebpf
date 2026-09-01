export function Doctrine() {
  return (
    <section id="architecture" className="scroll-mt-24 border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
          KSEC Governance Doctrine
        </p>
        <blockquote className="mt-6 max-w-3xl text-2xl font-medium leading-snug tracking-tight text-foreground sm:text-3xl">
          “Autonomous agent security cannot rely solely on prompt filtering; the
          agent execution environment, tool invocation protocols, and OS boundary
          privileges must be deterministically locked.”
        </blockquote>
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] sm:p-8">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Probabilistic Prompt Filters
            </h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Bypassed by indirect injection, adversarial encoding, and context drift.
              Adds 2–15ms user-space latency, leaving race conditions and critical
              blind spots open.
            </p>
          </div>
          <div className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] sm:p-8">
            <h3 className="text-sm font-medium uppercase tracking-wider text-primary">
              Deterministic Kernel Runtime
            </h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Every tool invocation, SQL mutation, and socket frame is
              mathematically verified against cryptographic Ed25519 leases
              inside Linux Ring-0 before execution.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

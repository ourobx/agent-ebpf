import { Logo } from "@/components/landing/logo";
import { NAV } from "@/components/landing/content";

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Autonomous Ring-0 defense engine for enterprise AI agents. Linux 6.8+
            eBPF LSM. Deterministic, microsecond-scale.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Product
            </p>
            <ul className="mt-3 space-y-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-sm text-foreground/90 hover:text-primary"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Resources
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="https://github.com/ourobx/agent-ebpf"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-foreground/90 hover:text-primary"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://www.npmjs.com/package/@ourobx/shield"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-foreground/90 hover:text-primary"
                >
                  npm @ourobx/shield
                </a>
              </li>
              <li>
                <a href="#signup" className="text-sm text-foreground/90 hover:text-primary">
                  Pilot access
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-border px-4 pt-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
        <p>© 2026 KSEC. SOC-2 Type II &amp; HIPAA Ready Infrastructure.</p>
        <p className="font-mono">{"P99 < 50µs · 0% TOCTOU"}</p>
      </div>
    </footer>
  );
}

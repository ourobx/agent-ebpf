import { useEffect, useState } from "react";
import { Menu, X, ArrowRight, Shield, Terminal, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/landing/logo";
import { NAV } from "@/components/landing/content";
import { cn } from "@/lib/utils";

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Top Enterprise Announcement Bar */}
      <div className="bg-primary/10 border-b border-primary/20 text-center py-1.5 px-4 text-xs font-mono text-foreground/90 transition-colors hover:bg-primary/15">
        <a href="#simulator" className="inline-flex items-center gap-1.5 text-foreground/90 hover:text-primary">
          <span className="inline-block size-1.5 rounded-full bg-primary animate-pulse-dot" />
          <span className="font-semibold text-primary">KSEC 2.0 Engine:</span>
          <span>Zero-TOCTOU Ring-0 Defense for Autonomous AI Agents</span>
          <ArrowRight className="size-3 text-primary ml-1" />
        </a>
      </div>

      <header
        className={cn(
          "sticky top-0 z-50 transition-[background-color,box-shadow] duration-200",
          scrolled || open
            ? "bg-background/90 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] backdrop-blur-md"
            : "bg-background/60 backdrop-blur-sm",
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2.5 md:flex">
            <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-foreground">
              <a href="http://localhost:8000" target="_blank" rel="noreferrer" className="flex items-center gap-1.5">
                <Terminal className="size-3.5 text-primary" />
                Console Login
              </a>
            </Button>
            <Button asChild size="sm" className="font-mono text-xs shadow-[0_0_12px_rgba(0,255,102,0.25)]">
              <a href="#signup">Deploy Free Shield</a>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
        {open ? (
          <div className="border-t border-border bg-background md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4" aria-label="Mobile">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex min-h-11 items-center rounded-md px-3 text-base text-foreground"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                <Button asChild variant="outline" className="w-full" size="lg">
                  <a href="http://localhost:8000" target="_blank" rel="noreferrer">
                    Console Login
                  </a>
                </Button>
                <Button asChild className="w-full" size="lg">
                  <a href="#signup" onClick={() => setOpen(false)}>
                    Deploy Free Shield
                  </a>
                </Button>
              </div>
            </nav>
          </div>
        ) : null}
      </header>
    </>
  );
}

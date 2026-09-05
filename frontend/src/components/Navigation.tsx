"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: "🛡️" },
  { href: "/docs", label: "Docs", icon: "📖" },
  { href: "/policies", label: "Policies", icon: "⚡" },
  { href: "/dashboard/mesh", label: "Enterprise", icon: "🌐" },
];

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer automatically when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scrolling when drawer is open for a native, seamless mobile experience
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow || "unset";
      };
    }
  }, [mobileMenuOpen]);

  // Close menu when Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-black/85 backdrop-blur-xl transition-all safe-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Brand Logo & Compact Status */}
            <Link
              href="/"
              className="flex items-center gap-2 sm:gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg p-1"
              aria-label="KSEC Home"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 shadow-[0_0_12px_#06b6d4]"></span>
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-bold tracking-wider text-cyan-400 font-mono uppercase">
                    KSEC // eBPF
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded border border-cyan-800/80 bg-cyan-950/60 text-cyan-300 font-mono hidden xs:inline">
                    Ring-0
                  </span>
                </div>
                <span className="text-[9px] text-zinc-500 font-mono hidden sm:inline leading-none">
                  AI Security Guardrails
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 font-mono text-xs">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg transition font-medium flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      isActive
                        ? "bg-cyan-950/70 text-cyan-300 border border-cyan-800/80 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70"
                    }`}
                  >
                    <span className="text-xs">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Status Badge & Mobile Hamburger Button */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* NPM link on desktop */}
              <a
                href="https://www.npmjs.com/package/@ourobx/shield"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-cyan-800/60 bg-cyan-950/40 text-[11px] font-mono text-cyan-300 hover:bg-cyan-900/50 hover:text-cyan-200 transition"
                title="Official NPM Package: @ourobx/shield"
              >
                <span>📦</span>
                <span>npm @ourobx/shield</span>
              </a>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-emerald-800/60 bg-emerald-950/30 text-[10px] sm:text-[11px] font-mono text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="hidden xs:inline">ksec:</span>
                <span>live</span>
              </div>

              {/* Mobile Hamburger Toggle Button (44px touch target) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden flex items-center justify-center w-10 h-10 min-w-[40px] rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-200 hover:text-white hover:bg-zinc-800 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-cyan-500"
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation-drawer"
              >
                <div className="w-5 h-4 relative flex flex-col justify-between items-center">
                  <span
                    className={`block h-0.5 w-5 bg-current rounded-full transform transition-all duration-300 ease-in-out ${
                      mobileMenuOpen ? "rotate-45 translate-y-1.5 bg-cyan-400" : ""
                    }`}
                  />
                  <span
                    className={`block h-0.5 w-5 bg-current rounded-full transition-all duration-200 ease-in-out ${
                      mobileMenuOpen ? "opacity-0 scale-0" : ""
                    }`}
                  />
                  <span
                    className={`block h-0.5 w-5 bg-current rounded-full transform transition-all duration-300 ease-in-out ${
                      mobileMenuOpen ? "-rotate-45 -translate-y-2 bg-cyan-400" : ""
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Backdrop Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 top-14 sm:top-16 bg-black/75 backdrop-blur-sm z-40 transition-opacity duration-200 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile Drawer Menu (Slide-down + smooth scroll) */}
        {mobileMenuOpen && (
          <div
            id="mobile-navigation-drawer"
            className="md:hidden relative z-50 border-b border-zinc-800 bg-zinc-950/98 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-1.5 font-mono text-xs shadow-2xl animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain"
          >
            <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider px-2 py-1">
              Navigation Menu
            </div>

            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3.5 py-3 rounded-lg font-medium transition-all flex items-center justify-between min-h-[44px] active:scale-[0.98] ${
                    isActive
                      ? "bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 shadow-[0_0_14px_rgba(6,182,212,0.25)] font-bold"
                      : "text-zinc-300 hover:bg-zinc-900/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-xs tracking-wide">{item.label}</span>
                  </div>
                  <span className={`text-xs ${isActive ? "text-cyan-400 font-bold" : "text-zinc-600"}`}>
                    →
                  </span>
                </Link>
              );
            })}

            {/* Quick Actions in Mobile Drawer */}
            <div className="pt-3 border-t border-zinc-800/80 mt-3 flex flex-col gap-2">
              <a
                href="https://www.npmjs.com/package/@ourobx/shield"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-cyan-800/60 bg-cyan-950/40 text-cyan-300 font-semibold text-xs min-h-[44px] active:scale-[0.98] transition"
              >
                <div className="flex items-center gap-2">
                  <span>📦</span>
                  <span>npm @ourobx/shield</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono">v1.2.0 ↗</span>
              </a>

              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-[11px] text-zinc-400">
                <span>Kernel Guardrails</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Ring-0 Active
                </span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Quick Navigation App-Bar (Safe-Area Aware & Touch Optimized) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/90 bg-zinc-950/95 backdrop-blur-xl px-1.5 pt-1.5 safe-bottom flex items-center justify-around shadow-[0_-10px_25px_rgba(0,0,0,0.85)]"
        aria-label="Mobile Bottom Navigation"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-all min-w-[50px] min-h-[46px] active:scale-95 ${
                isActive ? "text-cyan-300 font-bold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className={`text-base transition-transform ${isActive ? "scale-110" : "opacity-75"}`}>
                {item.icon}
              </span>
              <span
                className={`text-[9px] tracking-tight truncate max-w-[58px] ${
                  isActive ? "text-cyan-400 font-bold" : "text-zinc-400"
                }`}
              >
                {item.label.split(" ")[0]}
              </span>
              {isActive && (
                <span className="w-1.5 h-1 rounded-full bg-cyan-400 mt-0.5 shadow-[0_0_8px_#06b6d4]"></span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}


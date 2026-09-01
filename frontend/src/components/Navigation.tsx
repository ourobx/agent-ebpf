"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: "🛡️" },
  { href: "/policies", label: "Policies & Intent", icon: "⚡" },
  { href: "/policies/ai-creator", label: "AI Policy Creator", icon: "🧠" },
  { href: "/dashboard/mesh", label: "Global Mesh", icon: "🌐" },
  { href: "/dashboard/swarm", label: "Enterprise Swarm", icon: "🏢" },
  { href: "/dashboard/billing", label: "SaaS Billing", icon: "💳" },
];

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="h-3 w-3 rounded-full bg-cyan-500 shadow-[0_0_12px_#06b6d4] group-hover:scale-110 transition-transform"></span>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-bold tracking-widest text-cyan-400 font-mono uppercase">
                KSEC // eBPF
              </span>
              <span className="text-[9px] text-zinc-500 font-mono hidden sm:inline">
                Ring-0 AI Security Guardrails
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
                  className={`px-3 py-2 rounded-lg transition font-medium flex items-center gap-1.5 ${
                    isActive
                      ? "bg-cyan-950/60 text-cyan-300 border border-cyan-800/80 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                  }`}
                >
                  <span className="text-xs">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Status Badge & Mobile Hamburger Button */}
          <div className="flex items-center gap-2 sm:gap-3">
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
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border border-emerald-800/60 bg-emerald-950/30 text-[11px] font-mono text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ksec.space: live</span>
            </div>

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 transition focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-zinc-950/98 backdrop-blur-2xl px-4 pt-3 pb-5 space-y-1.5 font-mono text-xs shadow-2xl animate-in slide-in-from-top-2 duration-200">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3.5 py-3 rounded-lg font-medium transition flex items-center justify-between min-h-[44px] ${
                  isActive
                    ? "bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{item.icon}</span>
                  <span className="font-semibold text-xs">{item.label}</span>
                </div>
                <span className="text-zinc-600 text-xs">→</span>
              </Link>
            );
          })}
          
          <div className="pt-3 border-t border-zinc-800/80 mt-3 flex flex-col gap-2">
            <a
              href="https://www.npmjs.com/package/@ourobx/shield"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-cyan-800/60 bg-cyan-950/40 text-cyan-300 font-semibold text-xs"
            >
              <div className="flex items-center gap-2">
                <span>📦</span>
                <span>npm @ourobx/shield</span>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono">v1.2.0 ↗</span>
            </a>
            <div className="flex items-center justify-between px-2 text-[11px] text-zinc-400">
              <span>Sovereignty: Ring-0</span>
              <span className="text-emerald-400 font-semibold">● 100% Kernel Guardrails</span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Quick Navigation App-Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/90 bg-zinc-950/95 backdrop-blur-xl px-2 py-1.5 safe-bottom flex items-center justify-around shadow-[0_-10px_25px_rgba(0,0,0,0.8)]">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[54px] min-h-[44px] ${
                isActive
                  ? "text-cyan-300 font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className={`text-base transition-transform ${isActive ? "scale-110" : "opacity-80"}`}>
                {item.icon}
              </span>
              <span className={`text-[9px] tracking-tight truncate max-w-[62px] ${isActive ? "text-cyan-400 font-bold" : "text-zinc-400"}`}>
                {item.label.split(" ")[0]}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-cyan-400 mt-0.5 shadow-[0_0_6px_#06b6d4]"></span>
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

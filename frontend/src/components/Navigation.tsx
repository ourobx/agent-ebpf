"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/docs", label: "Docs" },
  { href: "/policies", label: "Policies" },
  { href: "/dashboard/mesh", label: "Enterprise" },
];

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer automatically when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scrolling when drawer is open
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
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-black/80 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Brand Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-md p-1"
              aria-label="KSEC Home"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></span>
              </span>
              <span className="text-base font-bold tracking-widest text-zinc-100 font-mono uppercase group-hover:text-cyan-400 transition-colors">
                KSEC
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900/80 text-zinc-400 font-mono">
                v2.0
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 font-mono text-xs">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-md transition font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      isActive
                        ? "bg-zinc-900 text-cyan-400 border border-zinc-700/80 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Status & Actions */}
            <div className="flex items-center gap-3">
              {/* Clean Status Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-900/40 bg-emerald-950/20 text-[11px] font-mono text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Ring-0 Guarded</span>
              </div>

              {/* NPM Command Link */}
              <a
                href="https://www.npmjs.com/package/@ourobx/shield"
                target="_blank"
                rel="noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition"
              >
                <span>npm i @ourobx/shield</span>
              </a>

              {/* Mobile Hamburger Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-md border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-cyan-500"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Backdrop Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 top-14 bg-black/70 backdrop-blur-sm z-40 transition-opacity md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden relative z-50 border-b border-zinc-800 bg-zinc-950/98 backdrop-blur-xl px-4 pt-3 pb-5 space-y-1 font-mono text-xs shadow-2xl"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-md font-medium transition flex items-center justify-between ${
                    isActive
                      ? "bg-zinc-900 text-cyan-400 border border-zinc-800"
                      : "text-zinc-300 hover:bg-zinc-900/60 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-zinc-600 text-xs">→</span>
                </Link>
              );
            })}

            <div className="pt-3 border-t border-zinc-800/80 mt-2 flex flex-col gap-2">
              <a
                href="https://www.npmjs.com/package/@ourobx/shield"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 text-xs font-mono"
              >
                <span>npm i @ourobx/shield</span>
                <span className="text-zinc-500">v1.2.0 ↗</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/90 bg-zinc-950/95 backdrop-blur-xl px-4 py-2 flex items-center justify-around shadow-2xl"
        aria-label="Mobile Navigation"
      >
        <Link
          href="/"
          className={`flex flex-col items-center text-[10px] font-mono transition ${
            pathname === "/" ? "text-cyan-400 font-bold" : "text-zinc-400"
          }`}
        >
          <span className="text-xs">✦</span>
          <span>Home</span>
        </Link>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center text-[10px] font-mono transition ${
                isActive ? "text-cyan-400 font-bold" : "text-zinc-400"
              }`}
            >
              <span className="text-xs">
                {item.label === "Docs" ? "◈" : item.label === "Policies" ? "⚡" : "⬡"}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}



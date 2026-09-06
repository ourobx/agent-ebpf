import React from "react";
import type { Metadata, Viewport } from "next";
import Navigation from "@/components/Navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "KSEC // Agent-eBPF Enterprise AI Defense",
  description: "Deterministic Ring-0 eBPF Runtime Security and Observability for AI Agents",
  icons: {
    icon: "/assets/ksec_enterprise_ouroboros.svg",
    shortcut: "/assets/ksec_enterprise_ouroboros.svg",
    apple: "/assets/ksec_enterprise_ouroboros.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-black text-zinc-100 antialiased">
      <body className="min-h-screen flex flex-col bg-black text-zinc-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        <Navigation />
        <main className="flex-1 w-full pb-20 md:pb-0">{children}</main>
        <footer className="border-t border-zinc-800/80 bg-zinc-950 py-6 px-4 sm:px-6 lg:px-8 font-mono text-[11px] text-zinc-500 text-center">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© 2026 KSEC Space Inc. · Autonomous eBPF Guardrails</span>
            <div className="flex items-center gap-4 text-zinc-400">
              <span>Cloudflare Ingress</span>
              <span>•</span>
              <span>ClickHouse Columnar</span>
              <span>•</span>
              <span className="text-emerald-400">SLA: 99.999%</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

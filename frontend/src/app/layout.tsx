import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import KsecPreloader from "@/components/KsecPreloader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "KSEC // Sovereign AI Defense Substrate",
  description:
    "Zero-overhead eBPF LSM enforcement layer for AI workloads. Intercept prompt injections, model exfiltration, and unauthorized execution at Ring-0.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} dark antialiased`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className="min-h-screen bg-[#050706] text-[#E5F5EC] font-sans selection:bg-[#00FF66]/20 selection:text-[#00FF66]">
        {/* Full-Screen Cybernetic Loading Animation */}
        <KsecPreloader />
        <div className="relative flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}

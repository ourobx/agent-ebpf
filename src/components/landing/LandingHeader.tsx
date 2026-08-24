import React, { useState } from 'react';
import { KsecLogo } from '../brand/KsecLogo';

interface LandingHeaderProps {
  onOpenDemoModal?: () => void;
  onOpenDocs?: () => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = React.memo(({
  onOpenDemoModal,
  onOpenDocs,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-black/90 backdrop-blur-xl border-b border-[#1C1C1C] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Mark & Monogram */}
        <div className="flex items-center gap-3">
          <a href="#" className="flex items-center gap-2 group">
            <KsecLogo size={28} showText={true} />
          </a>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            v2.4 // SOC-2 TYPE II
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 font-sans text-xs font-medium text-slate-300">
          <a href="#platform" className="hover:text-cyan-400 transition">
            Platform
          </a>
          <a href="#architecture" className="hover:text-cyan-400 transition">
            Architecture
          </a>
          <a href="#benchmarks" className="hover:text-cyan-400 transition">
            Benchmarks
          </a>
          <a href="#compliance" className="hover:text-cyan-400 transition">
            Security &amp; Compliance
          </a>
          <a
            href="index.html"
            className="hover:text-cyan-400 text-sky-400 font-semibold transition flex items-center gap-1"
          >
            Mission Control
            <span className="text-[9px] font-mono text-slate-500">↗</span>
          </a>
        </nav>

        {/* Right Action Group */}
        <div className="hidden lg:flex items-center gap-3">
          <select
            className="bg-[#0A0A0A] border border-[#1C1C1C] text-slate-300 text-xs rounded px-2.5 py-1.5 font-mono outline-none cursor-pointer hover:border-[#27272A] transition"
            aria-label="Select Sovereign Region"
          >
            <option value="us_east">US-East (AWS us-east-1)</option>
            <option value="eu_central">EU-Central (Frankfurt Sovereign)</option>
            <option value="apac_tokyo">APAC (Tokyo Tier-4)</option>
          </select>

          <a
            href="index.html"
            className="text-xs font-mono text-slate-300 hover:text-white px-3 py-1.5 rounded hover:bg-white/5 transition"
          >
            Sign In
          </a>

          <button
            onClick={onOpenDemoModal}
            className="px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-sans font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
          >
            <span>Request Architecture Review</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-400 hover:text-white border border-white/10 rounded"
          aria-label="Toggle Menu"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0A0E18] border-b border-white/10 p-4 flex flex-col gap-3 font-sans text-sm">
          <a href="#platform" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 py-1">Platform</a>
          <a href="#architecture" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 py-1">Architecture</a>
          <a href="#benchmarks" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 py-1">Benchmarks</a>
          <a href="#compliance" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 py-1">Security &amp; Compliance</a>
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDemoModal && onOpenDemoModal();
              }}
              className="w-full py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded text-center"
            >
              Request Architecture Review
            </button>
          </div>
        </div>
      )}
    </header>
  );
});

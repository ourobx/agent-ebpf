import React, { useState } from 'react';
import { LandingHeader } from './LandingHeader';
import { LandingHero } from './LandingHero';
import { PerformanceRibbon } from './PerformanceRibbon';
import { ArchitectureSection } from './ArchitectureSection';
import { InteractiveDemo } from './InteractiveDemo';
import { TrustMatrix } from './TrustMatrix';
import { EnterpriseContactModal } from './EnterpriseContactModal';
import { LandingFooter } from './LandingFooter';

export const CorporateLandingPage: React.FC = React.memo(() => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Global Navigation Header */}
      <LandingHeader onOpenDemoModal={() => setIsDemoModalOpen(true)} />

      <main>
        {/* Enterprise Hero Section */}
        <LandingHero
          onRequestDemo={() => setIsDemoModalOpen(true)}
          onViewBenchmarks={() => {
            const el = document.getElementById('benchmarks');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Live Performance & Metric Ribbon */}
        <PerformanceRibbon />

        {/* Deep Architecture & Tabbed Showcase */}
        <ArchitectureSection />

        {/* Live Interactive AST Evaluation Testbench */}
        <InteractiveDemo />

        {/* Enterprise Trust & Compliance Matrix */}
        <TrustMatrix />
      </main>

      {/* Enterprise Footer */}
      <LandingFooter />

      {/* Request Demo & Architecture Review Modal */}
      <EnterpriseContactModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
});

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { TrustLogos } from "@/components/landing/trust-logos";
import { ArchitectureFlow } from "@/components/landing/architecture-flow";
import { FrontierMatrix } from "@/components/landing/frontier-matrix";
import { NeuralInterceptor } from "@/components/landing/neural-interceptor";
import { GlobalThreatMap } from "@/components/landing/global-threat-map";
import { Doctrine } from "@/components/landing/doctrine";
import { Features } from "@/components/landing/features";
import { Simulator } from "@/components/landing/simulator";
import { Benchmarks } from "@/components/landing/benchmarks";
import { Integration } from "@/components/landing/integration";
import { RoiCalculator } from "@/components/landing/roi-calculator";
import { ComplianceSeal } from "@/components/landing/compliance-seal";
import { Pricing } from "@/components/landing/pricing";
import { Testimonials } from "@/components/landing/testimonials";
import { Signup } from "@/components/landing/signup";
import { SiteFooter } from "@/components/landing/footer";
import type { PlanId } from "@/components/landing/content";

export const Route = createFileRoute("/")({ component: Home });

export function Home() {
  const [plan, setPlan] = useState<PlanId>("pro");

  function selectPlan(next: PlanId) {
    setPlan(next);
    document.getElementById("signup")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <a
        href="#architecture-flow"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <SiteNav />
      <main>
        <Hero />
        <TrustLogos />
        <ArchitectureFlow />
        <FrontierMatrix />
        <NeuralInterceptor />
        <GlobalThreatMap />
        <Doctrine />
        <Features />
        <Simulator />
        <Benchmarks />
        <Integration />
        <RoiCalculator />
        <ComplianceSeal />
        <Pricing onSelect={selectPlan} />
        <Testimonials />
        <Signup plan={plan} onPlanChange={setPlan} />
      </main>
      <SiteFooter />
    </div>
  );
}

"use client";

import "@/app/landing.css";
import { LandingNavbar } from "./landing-navbar";
import { HeroSection } from "./hero-section";
import { ProblemSection } from "./problem-section";
import { MissionSection } from "./mission-section";
import { SolutionSection } from "./solution-section";
import { CtaSection } from "./cta-section";
import { LandingFooter } from "./landing-footer";

export function LandingPage() {
  return (
    <div className="landing min-h-screen bg-black text-white">
      <LandingNavbar />
      <HeroSection />
      <ProblemSection />
      <MissionSection />
      <SolutionSection />
      <CtaSection />
      <LandingFooter />
    </div>
  );
}

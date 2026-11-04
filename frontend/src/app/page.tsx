'use client';

import React from 'react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingHero from '@/components/landing/LandingHero';
import LandingStats from '@/components/landing/LandingStats';
import LandingAbout from '@/components/landing/LandingAbout';
import LandingCapabilities from '@/components/landing/LandingCapabilities';
import LandingWorkflow from '@/components/landing/LandingWorkflow';
import LandingShowcase from '@/components/landing/LandingShowcase';
import LandingTechnology from '@/components/landing/LandingTechnology';
import LandingCTA from '@/components/landing/LandingCTA';
import LandingFooter from '@/components/landing/LandingFooter';
import ResearchPlatformView from '@/components/ResearchPlatformView';

export default function HomePage() {
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const legacyTab = React.useSyncExternalStore(
    () => () => {},
    () => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null),
    () => null
  );

  // If a legacy ?tab= query parameter was explicitly supplied, open the research platform directly
  if (isClient && legacyTab) {
    return <ResearchPlatformView initialTab={legacyTab} />;
  }

  // Otherwise, render the prestigious public landing page
  return (
    <div className="min-h-screen flex flex-col bg-[#F6F1E7] text-[#393331] selection:bg-[#642F38]/20 selection:text-[#642F38]">
      {/* 1. Dedicated Public Navigation Bar */}
      <LandingNavbar />

      {/* 2. Hero Section with Kailasa Monolith Plate */}
      <LandingHero />

      {/* 3. Authentic Archival Heritage Statistics */}
      <LandingStats />

      {/* 4. About DHAROHAR AI & Problem Context */}
      <LandingAbout />

      {/* 5. Six Platform Capabilities (Mixed Editorial Grid) */}
      <LandingCapabilities />

      {/* 6. Four-Stage Verification Workflow */}
      <LandingWorkflow />

      {/* 7. Curated Architectural Heritage Showcase */}
      <LandingShowcase />

      {/* 8. Archival Intelligence & Technical Rigour */}
      <LandingTechnology />

      {/* 9. Final Call to Action */}
      <LandingCTA />

      {/* 10. Refined Scholarly Footer */}
      <LandingFooter />
    </div>
  );
}

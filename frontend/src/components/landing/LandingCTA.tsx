'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, BookOpen, Sparkles } from 'lucide-react';

export default function LandingCTA() {
  return (
    <section className="py-20 md:py-28 bg-[#FFFCF5] border-t border-[#DED3C2] relative overflow-hidden">
      
      {/* Subtle Corner Heritage Decorative Motifs */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-[#A77C54]/30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-[#A77C54]/30 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFE8DC] border border-[#DED3C2] text-[#642F38] text-xs font-serif font-medium">
          <Sparkles className="w-3.5 h-3.5 text-[#A77C54]" />
          <span>Interactive Digital Heritage Platform</span>
        </div>

        {/* Heading */}
        <div className="space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#642F38] tracking-tight leading-tight">
            History Deserves More Than a Search Result.
          </h2>
          <p className="text-base sm:text-lg font-serif text-[#756D66] max-w-2xl mx-auto leading-relaxed">
            Explore archival knowledge, investigate architectural heritage, inspect 3D digital twins, and discover the verifiable evidence behind centuries of Indian history.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/platform?tab=dashboard"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] font-serif text-sm font-semibold shadow-md transition-all hover:gap-3 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-[#C8AD8D]" />
            <span>Enter DHAROHAR AI</span>
            <ArrowRight className="w-4 h-4 text-[#C8AD8D]" />
          </Link>

          <Link
            href="/platform?tab=archive"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#EFE8DC] hover:bg-[#DED3C2] text-[#393331] font-serif text-sm font-medium border border-[#DED3C2] transition-colors"
          >
            <BookOpen className="w-4 h-4 text-[#756D66]" />
            <span>Browse Monograph Folios</span>
          </Link>
        </div>

        {/* Citation Provenance Tag */}
        <p className="text-xs font-mono text-[#756D66]">
          IIT Gandhinagar Explorer Fellowship Archive · Problem Statement HC26-CULT01
        </p>

      </div>
    </section>
  );
}


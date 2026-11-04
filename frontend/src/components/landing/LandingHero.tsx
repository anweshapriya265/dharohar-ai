'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, Compass, ShieldCheck, Sparkles, Layers } from 'lucide-react';

export default function LandingHero() {
  return (
    <section id="home" className="relative pt-8 pb-16 md:pt-14 md:pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Editorial Headline & Actions (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Institutional Heritage Provenance Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFE8DC] border border-[#DED3C2] text-[#642F38] text-xs font-serif font-medium shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#52745E] animate-pulse" />
              <span>IIT Gandhinagar Explorer Fellowship Archive</span>
              <span className="text-[#A77C54]">·</span>
              <span className="font-mono text-[11px] text-[#756D66]">HC26-CULT01</span>
            </div>

            {/* Main Editorial Headings */}
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#642F38] tracking-tight leading-[1.12]">
                Preserving the Past.<br />
                <span className="text-[#393331] italic font-normal">Unlocking History.</span>
              </h1>
              <p className="text-lg sm:text-xl font-serif text-[#A77C54] font-medium">
                Where archival knowledge meets digital exploration.
              </p>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base font-sans text-[#756D66] leading-relaxed max-w-2xl">
              Discover India&rsquo;s architectural heritage through historical documents, interactive 3D digital twins, geospatial exploration, and evidence-grounded AI research. Connecting centuries-old architectural surveys with verified scholarship.
            </p>

            {/* Primary & Secondary Call to Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/platform?tab=archive"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] font-serif text-sm font-medium shadow-sm transition-all hover:gap-3 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#C8AD8D]" />
                <span>Explore the Archive</span>
                <ArrowRight className="w-4 h-4 text-[#C8AD8D]" />
              </Link>

              <a
                href="#about"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#FFFCF5] hover:bg-[#EFE8DC] text-[#393331] font-serif text-sm font-medium border border-[#DED3C2] shadow-2xs transition-colors"
              >
                <span>Discover Our Mission</span>
              </a>

              <Link
                href="/platform?tab=dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-[#642F38] hover:underline px-2 py-1"
              >
                <span>Launch Direct Platform &rarr;</span>
              </Link>
            </div>

            {/* Key Assurance Indicators */}
            <div className="pt-4 grid grid-cols-3 gap-4 border-t border-[#DED3C2]/70 text-xs text-[#756D66]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#52745E] shrink-0" />
                <span className="font-serif">Server-Controlled Citations</span>
              </div>
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#A77C54] shrink-0" />
                <span className="font-serif">Subterranean 3D Twins</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#642F38] shrink-0" />
                <span className="font-serif">Dual-Pagination Folios</span>
              </div>
            </div>
          </div>

          {/* Right Column: Architectural Heritage Composition (5 cols) */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl border-2 border-[#DED3C2] bg-[#FFFCF5] p-3 shadow-xl overflow-hidden group">
              
              {/* Authentic Archival Illustration Frame */}
              <div className="relative w-full h-[360px] sm:h-[420px] rounded-xl overflow-hidden bg-[#EFE8DC]">
                <Image
                  src="/heritage/kailasa_3d.png"
                  alt="Kailasa Temple monolithic rock-cut architectural model (Ellora Cave 16)"
                  fill
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-102"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#393331]/80 via-transparent to-transparent" />

                {/* Overlaid Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded bg-[#FFFCF5]/90 backdrop-blur-xs text-[#642F38] font-mono text-[10px] font-semibold border border-[#DED3C2]">
                    Rashtrakuta · 8th Century CE
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#642F38]/90 text-[#FFFCF5] font-serif text-[10px] font-medium shadow-xs">
                    Monolithic Cave 16
                  </span>
                </div>

                {/* Overlaid Bottom Title */}
                <div className="absolute bottom-3 left-3 right-3 text-[#FFFCF5]">
                  <p className="font-serif text-lg font-bold leading-tight drop-shadow-xs">
                    Kailasa Monolithic Temple
                  </p>
                  <p className="text-xs text-[#FFFCF5]/80 font-sans">
                    276 × 154 ft courtyard carved top-down from volcanic basalt
                  </p>
                </div>
              </div>

              {/* Archival Citation & Metadata Strip */}
              <div className="pt-3 px-1 flex items-start justify-between gap-3 text-[11px] text-[#756D66]">
                <div className="space-y-0.5">
                  <p className="font-serif text-[#393331] font-medium italic">
                    James Fergusson &amp; James Burgess (1880)
                  </p>
                  <p className="font-mono text-[10px] text-[#756D66]">
                    The Cave Temples of India · Archaeological Survey of Western India
                  </p>
                </div>
                <Link
                  href="/platform?tab=heritage-3d"
                  className="shrink-0 px-2.5 py-1 rounded bg-[#EFE8DC] hover:bg-[#642F38] text-[#642F38] hover:text-[#FFFCF5] font-serif text-[11px] transition-colors flex items-center gap-1"
                >
                  <span>Explore 3D</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

            </div>

            {/* Decorative Corner Stone Accent */}
            <div className="absolute -bottom-3 -right-3 w-16 h-16 border-r-2 border-b-2 border-[#A77C54]/50 pointer-events-none rounded-br-2xl -z-10" />
          </div>

        </div>
      </div>
    </section>
  );
}


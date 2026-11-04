'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MessageSquare,
  Compass,
  Sparkles,
  MapPin,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function LandingCapabilities() {
  return (
    <section id="capabilities" className="py-16 md:py-24 bg-[#FFFCF5] border-t border-[#DED3C2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="px-3 py-1 rounded-full text-xs font-serif font-medium bg-[#642F38]/10 text-[#642F38] border border-[#642F38]/20 uppercase tracking-wider">
            Integrated Platform Modules
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#642F38] tracking-tight">
            One Platform. Multiple Ways to Explore Heritage.
          </h2>
          <p className="text-sm sm:text-base font-sans text-[#756D66] leading-relaxed">
            Six interconnected digital capabilities engineered to make unstructured architectural archives searchable, visual, geospatial, and verifiable.
          </p>
        </div>

        {/* Modular Editorial Grid: 1 Large, 2 Medium, 3 Compact */}
        <div className="space-y-6">
          
          {/* A. Large Featured: Research Assistant */}
          <div className="rounded-2xl border-2 border-[#DED3C2] bg-[#F6F1E7] p-6 sm:p-8 shadow-md">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#642F38] text-[#FFFCF5] text-xs font-serif font-medium shadow-2xs">
                  <MessageSquare className="w-3.5 h-3.5 text-[#C8AD8D]" />
                  <span>Flagship Capability</span>
                </div>
                
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#642F38] tracking-tight">
                  Evidence-Grounded Research Assistant
                </h3>
                
                <p className="text-sm font-sans text-[#756D66] leading-relaxed">
                  Inquires across historical monographs and epigraphical folios using local retrieval-augmented generation. Claims are bound to server-validated evidence tokens; ungrounded statements are rejected transparently.
                </p>

                <div className="space-y-2 pt-1 text-xs text-[#393331]">
                  <div className="flex items-center gap-2 font-serif">
                    <CheckCircle2 className="w-4 h-4 text-[#52745E] shrink-0" />
                    <span>Server-controlled citation validation (prevents fabricated document IDs)</span>
                  </div>
                  <div className="flex items-center gap-2 font-serif">
                    <CheckCircle2 className="w-4 h-4 text-[#52745E] shrink-0" />
                    <span>Multi-query decomposition for complex comparative questions</span>
                  </div>
                  <div className="flex items-center gap-2 font-serif">
                    <CheckCircle2 className="w-4 h-4 text-[#52745E] shrink-0" />
                    <span>Full dual-pagination provenance (PDF page &amp; original printed label)</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/platform?tab=assistant"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] font-serif text-xs sm:text-sm font-medium shadow-xs transition-colors"
                  >
                    <span>Launch Research Assistant</span>
                    <ArrowRight className="w-4 h-4 text-[#C8AD8D]" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="rounded-xl border border-[#DED3C2] bg-[#FFFCF5] p-2 shadow-sm overflow-hidden">
                  <div className="relative w-full h-[260px] sm:h-[300px] rounded-lg overflow-hidden bg-[#EFE8DC]">
                    <Image
                      src="/heritage/assistant_preview.png"
                      alt="Research Assistant interactive preview with claim citations"
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* B & C. Two Medium Feature Sections: 3D Heritage & Stepwell Digital Twin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 3D Heritage Explorer */}
            <div className="rounded-2xl border border-[#DED3C2] bg-[#F6F1E7] p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="relative w-full h-[200px] sm:h-[220px] rounded-xl overflow-hidden bg-[#EFE8DC] border border-[#DED3C2]">
                  <Image
                    src="/heritage/kailasa_3d.png"
                    alt="Kailasa Temple Monolith 3D Interactive Viewport"
                    fill
                    className="object-cover object-center"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#FFFCF5]/90 text-[#642F38] font-mono text-[10px] font-semibold border border-[#DED3C2]">
                    Three.js Monolith
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#A77C54] font-serif font-bold">
                  <Compass className="w-4 h-4" />
                  <span>Interactive Architectural Models</span>
                </div>
                <h4 className="text-xl font-serif font-bold text-[#642F38]">
                  3D Heritage Explorer (Kailasa Monolith)
                </h4>
                <p className="text-xs text-[#756D66] font-sans leading-relaxed">
                  Interactive WebGL model of the monolithic rock-cut Kailasa temple (Cave 16, Ellora). Explore courtyard dimensions (276 × 154 ft), mandapa chambers, and architectural annotations.
                </p>
              </div>

              <Link
                href="/platform?tab=heritage-3d"
                className="inline-flex items-center justify-between px-4 py-2 rounded-lg bg-[#FFFCF5] hover:bg-[#EFE8DC] text-[#642F38] border border-[#DED3C2] font-serif text-xs font-medium transition-colors"
              >
                <span>Launch 3D Explorer</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#A77C54]" />
              </Link>
            </div>

            {/* Stepwell Digital Twin */}
            <div className="rounded-2xl border border-[#DED3C2] bg-[#F6F1E7] p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="relative w-full h-[200px] sm:h-[220px] rounded-xl overflow-hidden bg-[#EFE8DC] border border-[#DED3C2]">
                  <Image
                    src="/heritage/adalaj_3d.png"
                    alt="Adalaj Stepwell 3D WebGL Digital Twin"
                    fill
                    className="object-cover object-center"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#FFFCF5]/90 text-[#642F38] font-mono text-[10px] font-semibold border border-[#DED3C2]">
                    WebGL Digital Twin
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#A77C54] font-serif font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Subterranean Hydraulic Heritage</span>
                </div>
                <h4 className="text-xl font-serif font-bold text-[#642F38]">
                  Stepwell Digital Twin (Adalaj Ni Vav)
                </h4>
                <p className="text-xs text-[#756D66] font-sans leading-relaxed">
                  Five-storey subterranean stepped reservoir built in 1498 CE. Inspect stepped shafts, multi-level galleries, and microclimate daylight illumination across five underground storeys.
                </p>
              </div>

              <Link
                href="/platform?tab=3d-viewer"
                className="inline-flex items-center justify-between px-4 py-2 rounded-lg bg-[#FFFCF5] hover:bg-[#EFE8DC] text-[#642F38] border border-[#DED3C2] font-serif text-xs font-medium transition-colors"
              >
                <span>Explore Stepwell Twin</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#A77C54]" />
              </Link>
            </div>

          </div>

          {/* D, E, F. Three Compact Capability Sections: Map, Search, Corpus */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Expedition Map */}
            <div className="p-5 rounded-xl border border-[#DED3C2] bg-[#F6F1E7] space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#EFE8DC] border border-[#DED3C2] text-[#642F38] flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <h5 className="font-serif font-bold text-base text-[#642F38]">
                  Expedition Map
                </h5>
                <p className="text-xs text-[#756D66] leading-relaxed font-sans">
                  Interactive cartographic visualization mapping surveyed stepwells, caves, and forts across Gujarat, Maharashtra, and Rajasthan.
                </p>
              </div>
              <Link
                href="/platform?tab=cartography"
                className="text-xs font-serif font-medium text-[#642F38] hover:underline flex items-center gap-1"
              >
                <span>View Cartography &rarr;</span>
              </Link>
            </div>

            {/* Hybrid Archival Search */}
            <div className="p-5 rounded-xl border border-[#DED3C2] bg-[#F6F1E7] space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#EFE8DC] border border-[#DED3C2] text-[#642F38] flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>
                <h5 className="font-serif font-bold text-base text-[#642F38]">
                  Hybrid Archival Search
                </h5>
                <p className="text-xs text-[#756D66] leading-relaxed font-sans">
                  Combines dense neural sentence embeddings with SQLite FTS5 BM25 lexical search using Reciprocal Rank Fusion ($k=60$).
                </p>
              </div>
              <Link
                href="/platform?tab=search"
                className="text-xs font-serif font-medium text-[#642F38] hover:underline flex items-center gap-1"
              >
                <span>Search Passages &rarr;</span>
              </Link>
            </div>

            {/* Digital Heritage Corpus */}
            <div className="p-5 rounded-xl border border-[#DED3C2] bg-[#F6F1E7] space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#EFE8DC] border border-[#DED3C2] text-[#642F38] flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h5 className="font-serif font-bold text-base text-[#642F38]">
                  Digital Heritage Corpus
                </h5>
                <p className="text-xs text-[#756D66] leading-relaxed font-sans">
                  Grassroots field documentation records with curator verification, AI architectural typology suggestions, and audit logs.
                </p>
              </div>
              <Link
                href="/platform?tab=records"
                className="text-xs font-serif font-medium text-[#642F38] hover:underline flex items-center gap-1"
              >
                <span>Browse Corpus &rarr;</span>
              </Link>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}


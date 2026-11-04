'use client';

import React from 'react';
import { Search, Compass, MessageSquare, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LandingWorkflow() {
  const steps = [
    {
      num: '01',
      title: 'Discover',
      desc: 'Find archival documents, colonial monographs, Sanskrit/Persian epigraphs, and grassroots field documentation.',
      icon: Search,
      tag: 'Archival Ingestion',
    },
    {
      num: '02',
      title: 'Explore',
      desc: 'Inspect heritage architecture through interactive 3D WebGL models, subterranean cross-sections, and geospatial trails.',
      icon: Compass,
      tag: 'Spatial & 3D Twins',
    },
    {
      num: '03',
      title: 'Research',
      desc: 'Search historical sources using hybrid retrieval and submit natural language research questions to the Assistant.',
      icon: MessageSquare,
      tag: 'Evidence RAG',
    },
    {
      num: '04',
      title: 'Verify',
      desc: 'Inspect cited archival passages with dual-pagination citation display and direct folio inspection links.',
      icon: ShieldCheck,
      tag: 'Citation Provenance',
    },
  ];

  return (
    <section id="workflow" className="py-16 md:py-24 bg-[#F6F1E7] border-t border-[#DED3C2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="px-3 py-1 rounded-full text-xs font-serif font-medium bg-[#A77C54]/15 text-[#A77C54] border border-[#A77C54]/30 uppercase tracking-wider">
            Verification Pipeline
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#642F38] tracking-tight">
            From Historical Records to Verifiable Knowledge.
          </h2>
          <p className="text-sm font-sans text-[#756D66] leading-relaxed">
            A four-stage scholarship pipeline ensuring every generated observation can be traced back to an authentic, page-numbered archival folio.
          </p>
        </div>

        {/* 4 Steps: Horizontal Process on Desktop, Vertical on Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative p-6 rounded-2xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#642F38]/40 transition-colors group"
              >
                {/* Number & Icon Header */}
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-2xl text-[#A77C54] tracking-tight">
                    {step.num}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-[#EFE8DC] text-[#642F38] flex items-center justify-center transition-transform group-hover:scale-105">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#EFE8DC] text-[#756D66] border border-[#DED3C2]">
                    {step.tag}
                  </span>
                  <h3 className="text-lg font-serif font-bold text-[#642F38]">
                    {step.title}
                  </h3>
                  <p className="text-xs font-sans text-[#756D66] leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                {/* Desktop Step Connector Line Indicator */}
                {idx < 3 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-[#C8AD8D]">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}


'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Search, Database, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function LandingAbout() {
  return (
    <section id="about" className="py-16 md:py-24 bg-[#F6F1E7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left: Authentic Visual Artifact Preview (5 cols) */}
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="relative rounded-2xl border border-[#DED3C2] bg-[#FFFCF5] p-3 shadow-lg overflow-hidden">
              <div className="relative w-full h-[320px] sm:h-[380px] rounded-xl overflow-hidden bg-[#EFE8DC]">
                <Image
                  src="/heritage/assistant_preview.png"
                  alt="DHAROHAR AI evidence-grounded research assistant attribution interface"
                  fill
                  className="object-cover object-top"
                />
              </div>

              {/* Callout caption */}
              <div className="pt-3 px-1 text-xs text-[#756D66] font-serif leading-relaxed">
                <span className="font-bold text-[#642F38]">Server-Controlled Grounding:</span> Claims are verified against cited passages. Missing historical evidence is transparently reported as <span className="font-mono text-[10px] text-[#A67C3F]">insufficient_evidence</span>.
              </div>
            </div>
          </div>

          {/* Right: Editorial Narrative (7 cols) */}
          <div className="lg:col-span-7 order-1 lg:order-2 space-y-6">
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-serif font-medium bg-[#A77C54]/15 text-[#A77C54] border border-[#A77C54]/30 uppercase tracking-wider">
                The Heritage Challenge
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#642F38] tracking-tight leading-tight">
                Connecting Heritage, History and Evidence.
              </h2>
            </div>

            <p className="text-sm sm:text-base font-sans text-[#756D66] leading-relaxed">
              India&rsquo;s cultural and architectural heritage is recorded across thousands of fragmented sources: 19th-century colonial surveys, Sanskrit and Persian stone inscriptions, epigraphical bulletins, regional gazetteers, and grassroots field notebooks.
            </p>

            <p className="text-sm sm:text-base font-sans text-[#756D66] leading-relaxed">
              When researchers and students consult generic AI engines, they frequently encounter synthesized hallucinations: fabricated dates, mixed architectural dynasties, and invented quotations. Historical scholarship cannot rely on statistical guesswork.
            </p>

            {/* Solution Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] space-y-2">
                <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#642F38]">
                  <Database className="w-4 h-4 text-[#A77C54]" />
                  <span>Unstructured to Structured</span>
                </div>
                <p className="text-xs text-[#756D66] leading-relaxed font-sans">
                  Automated OCR and PDF folio extraction transform historical scans into indexed, searchable semantic chunks while preserving exact folio provenance.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] space-y-2">
                <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#642F38]">
                  <ShieldCheck className="w-4 h-4 text-[#52745E]" />
                  <span>Evidence-Grounded Inquiries</span>
                </div>
                <p className="text-xs text-[#756D66] leading-relaxed font-sans">
                  The LLM receives anonymized passage IDs (<span className="font-mono text-[10px]">E1, E2</span>). Citations are strictly validated by the backend server before presentation.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/platform?tab=assistant"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] font-serif text-xs sm:text-sm font-medium shadow-xs transition-colors"
              >
                <span>Experience the Research Assistant</span>
                <ArrowRight className="w-4 h-4 text-[#C8AD8D]" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}


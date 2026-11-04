'use client';

import React from 'react';
import Link from 'next/link';
import {
  Cpu,
  Layers,
  FileCheck,
  ShieldAlert,
  Server,
  Database,
  ArrowRight,
  GitBranch,
} from 'lucide-react';

export default function LandingTechnology() {
  const specs = [
    {
      title: 'Hybrid Semantic & Lexical Fusion',
      tech: 'SentenceTransformers + SQLite FTS5',
      desc: 'Retrieval blends dense neural embeddings (sentence-transformers/all-MiniLM-L6-v2) with exact BM25 keyword matching via Reciprocal Rank Fusion (k=60), ensuring rare historical names and precise measurements are captured.',
      icon: GitBranch,
    },
    {
      title: 'Dual-Pagination Citation Provenance',
      tech: 'Hierarchical Folio Alignment',
      desc: 'Colonial archives frequently have Roman numeral introductions and unnumbered plates. DHAROHAR AI maintains two independent coordinate systems: physical 1-based PDF page indices and original historical printed labels.',
      icon: Layers,
    },
    {
      title: 'OCR-Aware Lexical Normalization',
      tech: 'Diacritic & Line-Break Repair',
      desc: 'Historic texts suffer from broken hyphens, diacritic variance (e.g. Mhar vs Mbar, Elura vs Ellora), and faded typography. The search pipeline normalizes lexical variations without ever modifying the original source text.',
      icon: FileCheck,
    },
    {
      title: 'Evidence-Grounded Inquiries',
      tech: 'Server-Validated Citations',
      desc: 'The assistant engine receives anonymized evidence tokens (E1, E2). Citations are resolved strictly by backend logic; any fabricated claim or citation to non-existent evidence is discarded before display.',
      icon: ShieldAlert,
    },
  ];

  return (
    <section id="technology" className="py-16 md:py-24 bg-[#F6F1E7] border-t border-[#DED3C2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="px-3 py-1 rounded-full text-xs font-serif font-medium bg-[#642F38]/10 text-[#642F38] border border-[#642F38]/20 uppercase tracking-wider">
            Technical Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#642F38] tracking-tight">
            Archival Intelligence &amp; Technical Rigour
          </h2>
          <p className="text-sm sm:text-base font-sans text-[#756D66] leading-relaxed">
            Engineered to prioritize academic credibility, reproducible provenance, and verifiable evidence over statistical guesswork.
          </p>
        </div>

        {/* 4 Technical Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {specs.map((spec) => {
            const Icon = spec.icon;
            return (
              <div
                key={spec.title}
                className="p-6 rounded-2xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs space-y-3 flex flex-col justify-between hover:border-[#642F38]/50 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#EFE8DC] text-[#642F38] flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[10px] text-[#A77C54] bg-[#A77C54]/10 px-2 py-0.5 rounded border border-[#A77C54]/20">
                      {spec.tech}
                    </span>
                  </div>

                  <h3 className="text-lg font-serif font-bold text-[#642F38]">
                    {spec.title}
                  </h3>

                  <p className="text-xs font-sans text-[#756D66] leading-relaxed">
                    {spec.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#EBE4D8] flex items-center justify-between text-[11px] text-[#756D66] font-mono">
                  <span>Audited in Milestone 5.6.3</span>
                  <span className="text-[#52745E] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#52745E]" />
                    Verified
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Local Sovereign Deployment Note */}
        <div className="p-5 rounded-xl border border-[#DED3C2] bg-[#EFE8DC]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-serif font-bold text-sm text-[#642F38]">
              Cultural Data Sovereignty &amp; Zero Cloud Egress
            </h4>
            <p className="text-xs text-[#756D66] font-sans">
              All embeddings, BM25 indexing, and neural inferences run strictly on local hardware. No historical folios or archival queries are uploaded to third-party commercial cloud APIs.
            </p>
          </div>
          <Link
            href="/platform?tab=diagnostics"
            className="shrink-0 px-4 py-2 rounded-lg bg-[#FFFCF5] hover:bg-[#EFE8DC] text-[#642F38] border border-[#DED3C2] font-serif text-xs font-medium transition-colors"
          >
            <span>View Diagnostics &rarr;</span>
          </Link>
        </div>

      </div>
    </section>
  );
}


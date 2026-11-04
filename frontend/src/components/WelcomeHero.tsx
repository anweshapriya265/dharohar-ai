'use client';

import React from 'react';
import {
  Sparkles,
  Compass,
  FileText,
  ArrowRight,
  BookOpen,
  Database,
  Layers,
  Search,
  ExternalLink,
} from 'lucide-react';

interface WelcomeHeroProps {
  onOpenUpload: () => void;
  onNavigateTab: (tab: string) => void;
  documentCount?: number;
  totalPageCount?: number;
  totalChunkCount?: number;
}

export default function WelcomeHero({
  onOpenUpload,
  onNavigateTab,
  documentCount = 3,
  totalPageCount = 1188,
  totalChunkCount = 4901,
}: WelcomeHeroProps) {
  const pathways = [
    {
      id: 'assistant',
      title: 'Research Historical Records',
      subtitle: 'Evidence-Grounded Inquiries',
      description:
        'Query the archival repository using natural language. Every factual statement is strictly linked to verified page folios and dual-pagination citations.',
      actionLabel: 'Launch Research Assistant',
      icon: Sparkles,
      accentBorder: 'border-l-4 border-l-[#642F38]',
    },
    {
      id: 'heritage-3d',
      title: 'Explore Architectural Heritage in 3D',
      subtitle: 'Rock-Cut & Subterranean Twins',
      description:
        'Inspect the monolithic excavation of Kailasa Temple (Cave 16) and the subterranean 5-storey cutaway of Adalaj Stepwell with verified dimensional provenance.',
      actionLabel: 'Open 3D Explorer',
      icon: Compass,
      accentBorder: 'border-l-4 border-l-[#A77C54]',
    },
    {
      id: 'archive',
      title: 'Discover & Inspect Archival Documents',
      subtitle: 'Colonial Gazetteers & Epigraphy',
      description:
        'Examine original 19th and 20th-century monographs page-by-page, inspect high-resolution folios, and analyze OCR extractions alongside original plates.',
      actionLabel: 'Browse Digital Archive',
      icon: FileText,
      accentBorder: 'border-l-4 border-l-[#814B52]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section 1 — Editorial Introduction */}
      <div className="p-6 sm:p-8 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs">
        <div className="max-w-3xl space-y-3">
          <div className="inline-block text-[11px] font-mono tracking-wider uppercase text-[#814B52] font-semibold">
            Digital Heritage Intelligence
          </div>
          <h1 className="font-heritage text-2xl sm:text-3xl lg:text-4xl font-bold text-[#642F38] tracking-tight leading-tight">
            Explore the Archive.
          </h1>
          <p className="text-sm sm:text-base text-[#59524E] leading-relaxed font-serif">
            Discover historical records, investigate architectural heritage, explore digital reconstructions,
            and conduct evidence-grounded archival research across India&apos;s monument corpus.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab('assistant')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] text-xs font-serif font-medium transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFFCF5]" />
              <span>Ask Historical Inquiry</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('heritage-3d')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EFE8DC] hover:bg-[#E8E0D2] text-[#393331] text-xs font-serif font-medium border border-[#DED3C2] transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-[#A77C54]" />
              <span>Explore 3D Kailasa Monolith</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('search')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-transparent hover:bg-[#F6F1E7] text-[#642F38] text-xs font-serif font-medium transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-[#642F38]" />
              <span>Hybrid Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 2 — Archive Overview (Restrained Horizontal Metrics Bar) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] divide-y lg:divide-y-0 lg:divide-x divide-[#DED3C2] shadow-xs">
        <div className="p-4 sm:p-5 flex flex-col justify-center">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#756D66] font-semibold">
            Archived Volumes
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-heritage font-bold text-[#642F38]">
              {documentCount}
            </span>
            <span className="text-xs text-[#756D66]">monographs</span>
          </div>
          <span className="text-[11px] text-[#756D66] mt-0.5 font-serif">ASWI, Burgess, Percy Brown</span>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-center">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#756D66] font-semibold">
            Extracted Folios
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-heritage font-bold text-[#642F38]">
              {totalPageCount.toLocaleString()}
            </span>
            <span className="text-xs text-[#756D66]">pages</span>
          </div>
          <span className="text-[11px] text-[#756D66] mt-0.5 font-serif">Dual-pagination indexed</span>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-center">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#756D66] font-semibold">
            Indexed Chunks
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-heritage font-bold text-[#642F38]">
              {totalChunkCount.toLocaleString()}
            </span>
            <span className="text-xs text-[#756D66]">vectors</span>
          </div>
          <span className="text-[11px] text-[#756D66] mt-0.5 font-serif">all-MiniLM-L6-v2 + FTS5 BM25</span>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-center">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#756D66] font-semibold">
            Heritage Corpus
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-heritage font-bold text-[#52745E]">
              8
            </span>
            <span className="text-xs text-[#756D66]">documented sites</span>
          </div>
          <span className="text-[11px] text-[#756D66] mt-0.5 font-serif">IITGN Fellowship field records</span>
        </div>
      </div>

      {/* Section 3 — Research Pathways */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-heritage font-bold text-[#393331] uppercase tracking-wider">
            Research Pathways
          </h2>
          <span className="text-xs text-[#756D66] font-serif">Select an investigation pathway</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pathways.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className={`p-5 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs flex flex-col justify-between ${p.accentBorder} hover:border-[#642F38]/50 transition-colors`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#814B52] font-semibold">
                      {p.subtitle}
                    </span>
                    <Icon className="w-4 h-4 text-[#A77C54]" />
                  </div>
                  <h3 className="font-heritage text-base font-bold text-[#393331]">
                    {p.title}
                  </h3>
                  <p className="text-xs text-[#59524E] leading-relaxed font-serif">
                    {p.description}
                  </p>
                </div>

                <div className="pt-4 mt-2 border-t border-[#EBE4D8]">
                  <button
                    type="button"
                    onClick={() => onNavigateTab(p.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-serif font-semibold text-[#642F38] hover:text-[#50252C] transition-colors cursor-pointer group"
                  >
                    <span>{p.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 5 — Featured Heritage Exploration */}
      <div className="p-5 sm:p-6 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#642F38] font-semibold">
              <Compass className="w-3.5 h-3.5 text-[#A77C54]" />
              <span>Featured Architectural Study</span>
            </div>
            <h3 className="font-heritage text-lg sm:text-xl font-bold text-[#393331]">
              Monolithic Kailasa Temple (Cave 16, Ellora)
            </h3>
            <p className="text-xs sm:text-sm text-[#59524E] leading-relaxed font-serif">
              Vertical top-down excavation into the basalt Deccan trap hillside commissioned under Rashtrakuta monarch Krishna I (c. 756–774 CE). Excavated pit dimensions measure approximately 276 ft in depth and 154 ft in breadth, with the freestanding central vimana rising 96 ft from the courtyard floor.
            </p>
            <div className="pt-1 flex items-center gap-3 text-xs text-[#756D66] font-mono">
              <span>Source: ASWI Vol. V (Burgess, 1883)</span>
              <span>·</span>
              <span className="text-[#52745E]">Model: Basalt Chisel Reconstruction</span>
            </div>
          </div>

          <div className="shrink-0 flex sm:flex-col gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('heritage-3d')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] text-xs font-serif font-medium transition-colors shadow-xs cursor-pointer"
            >
              <span>Explore Kailasa 3D</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('3d-viewer')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#EFE8DC] hover:bg-[#E8E0D2] text-[#393331] text-xs font-serif font-medium border border-[#DED3C2] transition-colors cursor-pointer"
            >
              <span>Stepwell Twin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

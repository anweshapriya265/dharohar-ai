'use client';

import React from 'react';
import {
  Landmark,
  Upload,
  Sparkles,
  ShieldCheck,
  Compass,
  Box,
  Search,
} from 'lucide-react';
import DharoharLogo from '@/components/DharoharLogo';

interface WelcomeHeroProps {
  onOpenUpload: () => void;
  onExploreClick?: () => void;
  onOpenAssistant?: () => void;
  onNavigateTab?: (tab: string) => void;
  totalRecordsCount?: number;
}

export default function WelcomeHero({
  onOpenUpload,
  onExploreClick,
  onOpenAssistant,
  onNavigateTab,
  totalRecordsCount,
}: WelcomeHeroProps) {
  const handleNav = (tab: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else if (tab === 'assistant' && onOpenAssistant) {
      onOpenAssistant();
    } else if (onExploreClick) {
      onExploreClick();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#2e2923] bg-[#12100e] p-6 sm:p-8 shadow-xl text-[#ded6c5]">
      {/* Architectural decorative watermark */}
      <div className="absolute right-0 top-0 -mt-8 -mr-8 text-[#d4af37]/5 pointer-events-none select-none">
        <Landmark className="w-80 h-80 stroke-[0.7]" />
      </div>

      <div className="relative z-10 max-w-3xl space-y-4">
        {/* Institutional Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181613] border border-[#2e2923] text-xs font-mono text-[#eed27c]">
          <span className="w-2 h-2 rounded-full bg-[#3ba87e] animate-pulse" />
          <span>IIT Gandhinagar · Explorer Fellowship Cultural Heritage Archive</span>
        </div>

        {/* Headline */}
        <div className="flex items-start gap-4">
          <DharoharLogo size={56} className="mt-1 hidden sm:block drop-shadow-sm shrink-0" />
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#fcf9f2] tracking-tight font-heritage leading-tight">
              Intelligent Revitalisation of Cultural &amp; Architectural Archives
            </h1>
            <p className="text-sm sm:text-base text-[#ded6c5] leading-relaxed font-serif">
              Transforming thousands of subterranean stepwell photographs, colonial gazetteers,
              regional epigraphs, and expedition journals into interactive 3D digital twins,
              geospatial trails, and dual-pagination citation-grounded semantic intelligence.
            </p>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#181613] text-[#ded6c5] border border-[#2e2923]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3ba87e]" />
            <span>Dual-Pagination Provenance Grounding</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#181613] text-[#ded6c5] border border-[#2e2923]">
            <Sparkles className="w-3.5 h-3.5 text-[#eed27c]" />
            <span>Hybrid Dense MiniLM + SQLite FTS5 RRF</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#181613] text-[#ded6c5] border border-[#2e2923]">
            <Box className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Interactive 3D Volumetric Digital Twins</span>
          </span>
          {typeof totalRecordsCount === 'number' && totalRecordsCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a1714] text-[#eed27c] border border-[#d4af37]/40 font-mono text-[11px]">
              {totalRecordsCount} Heritage Assets Ingested
            </span>
          )}
        </div>

        {/* Pathway Quick Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3">
          <button
            type="button"
            onClick={() => handleNav('assistant')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b89124] text-[#080706] text-xs font-serif font-bold shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4 text-[#080706]" />
            <span>Ask Research Assistant</span>
          </button>

          <button
            type="button"
            onClick={() => handleNav('3d-viewer')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#2e2923] bg-[#181613] hover:bg-[#201d18] text-[#fcf9f2] text-xs font-serif font-medium transition-colors"
          >
            <Box className="w-4 h-4 text-[#eed27c]" />
            <span>Inspect 3D Stepwell Twin</span>
          </button>

          <button
            type="button"
            onClick={() => handleNav('cartography')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#2e2923] bg-[#181613] hover:bg-[#201d18] text-[#fcf9f2] text-xs font-serif font-medium transition-colors"
          >
            <Compass className="w-4 h-4 text-[#3ba87e]" />
            <span>Launch Geospatial Map</span>
          </button>

          <button
            type="button"
            onClick={() => handleNav('dashboard')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#2e2923] bg-[#181613] hover:bg-[#201d18] text-[#fcf9f2] text-xs font-serif font-medium transition-colors"
          >
            <Search className="w-4 h-4 text-[#eed27c]" />
            <span>Hybrid Search</span>
          </button>

          <button
            type="button"
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-[#d4af37]/40 hover:border-[#d4af37] bg-[#1a1714] hover:bg-[#221f1a] text-[#eed27c] text-xs font-serif font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>+ Ingest Field Note / PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}

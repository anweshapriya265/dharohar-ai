'use client';

import React from 'react';
import {
  Landmark,
  Upload,
  Compass,
  Box,
  Search,
  Sparkles,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import DharoharLogo from '@/components/DharoharLogo';

interface WelcomeHeroProps {
  onOpenUpload: () => void;
  onNavigateTab: (tab: string) => void;
  totalRecordsCount: number;
}

export default function WelcomeHero({
  onOpenUpload,
  onNavigateTab,
  totalRecordsCount,
}: WelcomeHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#e5dfd5] bg-white p-6 sm:p-8 shadow-heritage">
      {/* Subtle architectural decorative watermark */}
      <div className="absolute right-0 top-0 -mt-8 -mr-8 text-stone-200/50 pointer-events-none select-none">
        <Landmark className="w-80 h-80 stroke-[0.7]" />
      </div>

      <div className="relative z-10 max-w-3xl space-y-4">
        {/* Institutional Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#fbeee9] border border-[#f0d4ca] text-[#9c381e]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>IIT Gandhinagar · Explorer Fellowship Archival Intelligence</span>
        </div>

        {/* Headline */}
        <div className="flex items-start gap-4">
          <DharoharLogo size={56} className="mt-1 hidden sm:block drop-shadow-sm" />
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-stone-900 tracking-tight font-heritage leading-tight">
              Digital Revitalisation of Cultural &amp; Architectural Archives
            </h1>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Transforming thousands of subterranean stepwell photographs, colonial gazetteers,
              regional epigraphs, and student expedition journals into interactive 3D digital twins,
              geospatial routes, and zero-hallucination semantic knowledge.
            </p>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-stone-600">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#edf5f1] border border-[#c3dcd0] text-[#2d5e4a] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Zero-Hallucination Page Citations
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#fbf5eb] border border-[#f0dec3] text-[#b67322] font-medium">
            <Compass className="w-3.5 h-3.5" />
            Geotagged Expedition Trail
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200 text-stone-700 font-medium">
            <Box className="w-3.5 h-3.5 text-stone-500" />
            WebGL 3D Digital Twin
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200 text-stone-700 font-medium">
            <FileText className="w-3.5 h-3.5 text-stone-500" />
            {totalRecordsCount} Documented Landmarks
          </span>
        </div>

        {/* Pathway Quick Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3">
          <button
            type="button"
            onClick={() => onNavigateTab('cartography')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9c381e] hover:bg-[#832e17] text-[#f7f5f0] text-xs font-semibold shadow-2xs transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>Launch Geospatial Map</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('3d-viewer')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#e5dfd5] bg-white hover:bg-[#f7f5f0] text-stone-800 text-xs font-semibold transition-colors shadow-2xs"
          >
            <Box className="w-4 h-4 text-[#9c381e]" />
            <span>Inspect 3D Stepwell Twin</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('dashboard')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#e5dfd5] bg-white hover:bg-[#f7f5f0] text-stone-800 text-xs font-semibold transition-colors shadow-2xs"
          >
            <Search className="w-4 h-4 text-[#b67322]" />
            <span>Semantic Vector Search</span>
          </button>

          <button
            type="button"
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-[#9c381e]/40 hover:border-[#9c381e] bg-[#fbeee9]/40 hover:bg-[#fbeee9] text-[#9c381e] text-xs font-semibold transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>+ Ingest Field Note / PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}

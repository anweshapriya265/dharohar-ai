'use client';

import React from 'react';
import { Landmark, Upload, BookOpen, Compass, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface WelcomeHeroProps {
  onOpenUpload: () => void;
  onExploreClick: () => void;
}

export default function WelcomeHero({ onOpenUpload, onExploreClick }: WelcomeHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-gradient-to-br from-amber-50/70 via-stone-50 to-stone-100/90 dark:from-stone-900/80 dark:via-stone-950 dark:to-stone-900/60 p-6 sm:p-8 shadow-xs">
      {/* Decorative subtle heritage watermark */}
      <div className="absolute right-0 top-0 -mt-6 -mr-6 opacity-[0.04] dark:opacity-[0.03] pointer-events-none select-none">
        <Landmark className="w-96 h-96" />
      </div>

      <div className="relative z-10 max-w-3xl space-y-4">
        {/* Sub-badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-100/80 dark:bg-amber-950/70 border border-amber-300/50 dark:border-amber-800 text-amber-900 dark:text-amber-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
          <span>HackCult &apos;26 — Cultural & Architectural Heritage Revitalisation</span>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight font-heritage leading-snug">
            Intelligent Preservation of Cultural & Architectural Memory
          </h1>
          <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed">
            DHAROHAR AI ingests colonial-era gazetteers, architectural blueprints, epigraphical
            survey reports, and excavation notes into an evidence-linked, zero-hallucination digital
            knowledge repository.
          </p>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-stone-600 dark:text-stone-400">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-200/60 dark:bg-stone-800/80 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Direct Page-Level Citations
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-200/60 dark:bg-stone-800/80 font-medium">
            <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            Gazetteers &amp; Epigraphy
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-200/60 dark:bg-stone-800/80 font-medium">
            <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Geospatial &amp; 3D Linkage
          </span>
        </div>

        {/* Primary Call to Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-3">
          <button
            type="button"
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600 text-white text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Archive Document</span>
          </button>

          <button
            type="button"
            onClick={onExploreClick}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-sm font-medium transition-colors"
          >
            <span>Explore Corpus Schema</span>
            <ArrowRight className="w-4 h-4 text-stone-400" />
          </button>
        </div>
      </div>
    </div>
  );
}


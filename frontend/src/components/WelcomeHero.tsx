'use client';

import React from 'react';
import {
  Sparkles,
  Compass,
  Box,
  Search,
  Upload,
  BookOpen,
  ArrowRight,
  Database,
  Layers,
  MapPin,
  Cpu,
} from 'lucide-react';
import DharoharLogo from '@/components/DharoharLogo';

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
  const quickActions = [
    {
      id: 'assistant',
      title: 'Research Assistant',
      description: 'Ask natural-language historical questions grounded with dual-pagination citations.',
      icon: Sparkles,
      tag: 'Grounded AI',
      badgeColor: 'border-[#d4af37]/40 text-[#eed27c] bg-[#1a1714]',
      accentColor: 'group-hover:border-[#d4af37]/60',
    },
    {
      id: 'heritage-3d',
      title: '3D Heritage Explorer',
      description: 'Inspect Ellora Cave 16 monolithic court & architectural relief in interactive 3D.',
      icon: Compass,
      tag: 'Kailasa Model',
      badgeColor: 'border-[#eed27c]/40 text-[#eed27c] bg-[#1a1714]',
      accentColor: 'group-hover:border-[#eed27c]/60',
    },
    {
      id: '3d-viewer',
      title: 'Stepwell Digital Twin',
      description: 'Subterranean 5-storey cutaway of Adalaj Rudabai Vav with depth microclimate analysis.',
      icon: Box,
      tag: 'WebGL Twin',
      badgeColor: 'border-[#3ba87e]/40 text-[#3ba87e] bg-[#0d1e17]',
      accentColor: 'group-hover:border-[#3ba87e]/60',
    },
    {
      id: 'cartography',
      title: 'Expedition Map',
      description: 'Geospatial mapping across Gujarat, Maharashtra, and Karnataka heritage sites.',
      icon: MapPin,
      tag: 'Geospatial',
      badgeColor: 'border-[#38bdf8]/40 text-[#38bdf8] bg-[#0c1f2e]',
      accentColor: 'group-hover:border-[#38bdf8]/60',
    },
    {
      id: 'search',
      title: 'Hybrid Archival Search',
      description: 'Reciprocal Rank Fusion uniting 384-dim dense vectors with SQLite FTS5 BM25.',
      icon: Search,
      tag: 'Dense + BM25',
      badgeColor: 'border-[#c084fc]/40 text-[#c084fc] bg-[#1e102e]',
      accentColor: 'group-hover:border-[#c084fc]/60',
    },
    {
      id: 'records',
      title: 'Heritage Corpus',
      description: 'Archival monuments, photogrammetry plates, and epigraphical field journals.',
      icon: BookOpen,
      tag: 'Corpus Catalog',
      badgeColor: 'border-[#f59e0b]/40 text-[#f59e0b] bg-[#1f1910]',
      accentColor: 'group-hover:border-[#f59e0b]/60',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Platform Executive Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[#26221d] bg-gradient-to-br from-[#12100e] via-[#0f0d0b] to-[#080706] p-6 sm:p-8 shadow-xl">
        {/* Subtle Decorative Architectural Grid & Watermark */}
        <div className="absolute inset-0 heritage-grid-bg opacity-40 pointer-events-none" />
        <div className="absolute right-0 top-0 -mt-10 -mr-10 text-[#d4af37]/5 pointer-events-none select-none">
          <Layers className="w-96 h-96 stroke-[0.5]" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          {/* Institutional Label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181613] border border-[#26221d] text-xs font-mono text-[#ded6c5]">
            <span className="w-2 h-2 rounded-full bg-[#3ba87e] animate-pulse" />
            <span className="text-[#9c9282]">Institutional Fellowship:</span>
            <span className="text-[#fcf9f2] font-semibold">IIT Gandhinagar Cultural Heritage Archive</span>
          </div>

          {/* Main Title & Vision */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#fcf9f2] tracking-tight font-heritage leading-tight">
              Evidence-Grounded Digital Heritage Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-[#ded6c5] leading-relaxed">
              DHAROHAR AI transforms 19th-century colonial gazetteers, archaeological monographs,
              epigraphical folios, and subterranean stepwell surveys into interactive 3D digital twins,
              geospatial trails, and dual-pagination citation-verified knowledge.
            </p>
          </div>

          {/* Actual Database Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-[#171512]/90 border border-[#26221d]">
              <span className="text-[10px] font-mono uppercase text-[#9c9282] block">Archived Volumes</span>
              <span className="text-xl sm:text-2xl font-serif font-bold text-[#fcf9f2] font-heritage mt-0.5 block">
                {documentCount}
              </span>
              <span className="text-[10px] text-[#9c9282] font-mono">ASI &amp; Colonial Monographs</span>
            </div>

            <div className="p-3 rounded-xl bg-[#171512]/90 border border-[#26221d]">
              <span className="text-[10px] font-mono uppercase text-[#9c9282] block">Extracted Folios</span>
              <span className="text-xl sm:text-2xl font-serif font-bold text-[#eed27c] font-heritage mt-0.5 block">
                {totalPageCount.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#9c9282] font-mono">Dual-Pagination Verified</span>
            </div>

            <div className="p-3 rounded-xl bg-[#171512]/90 border border-[#26221d]">
              <span className="text-[10px] font-mono uppercase text-[#9c9282] block">Indexed Chunks</span>
              <span className="text-xl sm:text-2xl font-serif font-bold text-[#3ba87e] font-heritage mt-0.5 block">
                {totalChunkCount.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#9c9282] font-mono">Dense + SQLite FTS5 RRF</span>
            </div>

            <div className="p-3 rounded-xl bg-[#171512]/90 border border-[#26221d]">
              <span className="text-[10px] font-mono uppercase text-[#9c9282] block">Knowledge Store</span>
              <span className="text-xl sm:text-2xl font-serif font-bold text-[#ded6c5] font-heritage mt-0.5 block">
                SQLite
              </span>
              <span className="text-[10px] text-[#9c9282] font-mono">WAL &amp; FTS5 Triggers</span>
            </div>
          </div>

          {/* Primary Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigateTab('assistant')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#e5c158] text-[#080706] text-xs font-semibold shadow-md transition-all focus:outline-hidden"
            >
              <Sparkles className="w-4 h-4 text-[#080706]" />
              <span>Launch Research Assistant</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('heritage-3d')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#26221d] bg-[#171512] hover:bg-[#201d19] text-[#fcf9f2] text-xs font-medium transition-all"
            >
              <Compass className="w-4 h-4 text-[#eed27c]" />
              <span>Explore 3D Monolith</span>
            </button>

            <button
              type="button"
              onClick={onOpenUpload}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[#d4af37]/40 hover:border-[#d4af37] bg-[#171512] text-[#eed27c] text-xs font-medium transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>+ Ingest Historical Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Pathways Grid */}
      <div>
        <div className="flex items-center justify-between pb-3 px-1">
          <div>
            <h2 className="text-sm sm:text-base font-serif font-bold text-[#fcf9f2] font-heritage flex items-center gap-2">
              <span>Platform Research Workspaces</span>
            </h2>
            <p className="text-xs text-[#9c9282]">
              Select an investigative pathway to query documents, inspect architectural twins, or verify citations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <div
                key={action.id}
                onClick={() => onNavigateTab(action.id)}
                className={`group p-4 sm:p-5 rounded-2xl border border-[#26221d] bg-[#110f0d] hover:bg-[#171512] cursor-pointer transition-all shadow-md flex flex-col justify-between space-y-3 ${action.accentColor}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#1b1814] text-[#d4af37] border border-[#26221d] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${action.badgeColor}`}>
                      {action.tag}
                    </span>
                  </div>

                  <h3 className="text-sm font-serif font-bold text-[#fcf9f2] group-hover:text-[#eed27c] transition-colors font-heritage">
                    {action.title}
                  </h3>
                  <p className="text-xs text-[#9c9282] leading-relaxed">
                    {action.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#201d19] flex items-center justify-between text-xs text-[#eed27c] font-medium">
                  <span className="text-[11px] font-mono text-[#9c9282]">Open workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

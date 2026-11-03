'use client';

import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  Search,
  Box,
  Activity,
  ShieldCheck,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  backendConnected: boolean;
}

export default function Sidebar({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  backendConnected,
}: SidebarProps) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Intelligence Dashboard',
      subtitle: '3D Hero & Corpus Overview',
      icon: LayoutDashboard,
      badge: 'Live',
    },
    {
      id: 'assistant',
      label: 'Research Studio',
      subtitle: 'Evidence-Grounded AI',
      icon: Sparkles,
      badge: 'AI Core',
    },
    {
      id: 'archive',
      label: 'Archive Explorer',
      subtitle: 'Corpus & OCR Records',
      icon: BookOpen,
      badge: 'Corpus',
    },
    {
      id: 'heritage-3d',
      label: '3D Heritage Explorer',
      subtitle: 'Interactive Volumetric Lab',
      icon: Box,
      badge: '3D WebGL',
    },
    {
      id: 'search',
      label: 'Semantic Search',
      subtitle: 'Hybrid Dense + BM25',
      icon: Search,
      badge: 'Hybrid',
    },
    {
      id: 'diagnostics',
      label: 'Archive Analytics',
      subtitle: 'Telemetry & Integrity',
      icon: Activity,
      badge: 'Metrics',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#080706]/80 backdrop-blur-sm lg:hidden animate-in fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 z-40 h-full lg:h-[calc(100vh-4rem)] w-68 sm:w-72 shrink-0 bg-[#0c0a08] border-r border-[#2e2923] p-4 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Mobile Header Close */}
          <div className="flex items-center justify-between pb-3 border-b border-[#2e2923] lg:hidden">
            <span className="font-serif font-bold text-sm text-[#fcf9f2] font-heritage">
              Research Navigation
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#9c9282] hover:bg-[#1a1714]"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="space-y-1">
            <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#9c9282]">
              Archival Workspace
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group ${
                    isActive
                      ? 'bg-[#1a1714] border border-[#d4af37]/60 shadow-lg text-[#fcf9f2]'
                      : 'text-[#ded6c5] hover:bg-[#141210] hover:text-[#fcf9f2] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[#d4af37] text-[#080706]'
                          : 'bg-[#181613] text-[#ded6c5] group-hover:text-[#eed27c]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-serif font-semibold font-heritage line-clamp-1">
                        {item.label}
                      </div>
                      <div className="text-[10px] font-mono text-[#6e6659] line-clamp-1">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                      isActive
                        ? 'bg-[#1f1910] text-[#eed27c] border-[#d4af37]/40'
                        : 'bg-[#141210] text-[#6e6659] border-[#2e2923]'
                    }`}
                  >
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Grounding Protocol Status */}
        <div className="pt-4 border-t border-[#2e2923] space-y-2">
          <div className="p-3 rounded-xl bg-[#12100e] border border-[#2e2923] text-xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase">
              <span className="flex items-center gap-1.5 text-[#eed27c]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3ba87e]" />
                <span>Evidence Integrity</span>
              </span>
              <span
                className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-[#3ba87e]' : 'bg-rose-500'}`}
                title={backendConnected ? 'Backend Online' : 'Backend Offline'}
              />
            </div>
            <p className="text-[11px] text-[#9c9282] leading-tight">
              Dual-pagination verified citations across 19th-century colonial gazetteers.
            </p>
          </div>

          <div className="text-center">
            <span className="text-[10px] font-mono text-[#6e6659]">
              DHAROHAR AI v5.7 · Indian Heritage
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

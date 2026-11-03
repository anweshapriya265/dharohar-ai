'use client';

import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  MapPin,
  Box,
  ShieldCheck,
  Activity,
  X,
} from 'lucide-react';
import DharoharLogo from '@/components/DharoharLogo';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  backendConnected?: boolean;
}

export default function Sidebar({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  backendConnected = true,
}: SidebarProps) {
  const navItems = [
    {
      id: 'assistant',
      label: 'Research Assistant',
      subtitle: 'Evidence-Grounded AI Studio',
      icon: Sparkles,
      badge: 'AI Core',
    },
    {
      id: '3d-viewer',
      label: '3D Stepwell Twin',
      subtitle: 'Interactive subterranean twin',
      icon: Box,
      badge: 'WebGL',
    },
    {
      id: 'heritage-3d',
      label: '3D Monolith Explorer',
      subtitle: 'Kailasa Temple monolithic viewer',
      icon: Box,
      badge: 'Rock-Cut',
    },
    {
      id: 'cartography',
      label: 'Expedition Heritage Map',
      subtitle: 'Stepwells & expedition trails',
      icon: MapPin,
      badge: 'Geospatial',
    },
    {
      id: 'dashboard',
      label: 'Hybrid Semantic Search',
      subtitle: 'Dense MiniLM + SQLite FTS5 RRF',
      icon: LayoutDashboard,
      badge: 'Hybrid',
    },
    {
      id: 'records',
      label: 'Corpus & Field Records',
      subtitle: 'IITGN Explorer & ASI Monographs',
      icon: BookOpen,
      badge: 'Corpus',
    },
    {
      id: 'review-queue',
      label: 'Curator Review Queue',
      subtitle: 'Verification of AI suggestions',
      icon: ShieldCheck,
      badge: 'Human-in-Loop',
    },
    {
      id: 'diagnostics',
      label: 'System Analytics & Audit',
      subtitle: 'Telemetry & database integrity',
      icon: Activity,
      badge: 'Admin',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-xs lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-28 z-40 lg:z-10 h-full lg:h-[calc(100vh-7rem)] w-68 sm:w-72 shrink-0 bg-[#0c0a08] border-r border-[#2e2923] p-4 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-4">
          {/* Mobile Header Close */}
          <div className="flex items-center justify-between pb-3 border-b border-[#2e2923] lg:hidden">
            <div className="flex items-center gap-2">
              <DharoharLogo size={28} />
              <span className="font-serif font-bold text-sm text-[#fcf9f2] font-heritage">
                DHAROHAR AI
              </span>
            </div>
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
          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-18rem)] pr-1">
            <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#9c9282]">
              Archival Pathways
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all group ${
                    isActive
                      ? 'bg-[#d4af37] text-[#080706] shadow-sm font-semibold'
                      : 'text-[#ded6c5] hover:text-[#fcf9f2] hover:bg-[#181613]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-[#080706]' : 'text-[#d4af37] group-hover:text-[#eed27c]'
                      }`}
                    />
                    <div className="truncate">
                      <div className="text-xs font-serif leading-tight">{item.label}</div>
                      <div
                        className={`text-[10px] truncate ${
                          isActive ? 'text-[#382b09]' : 'text-[#9c9282]'
                        }`}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                      isActive
                        ? 'bg-black/20 text-[#080706]'
                        : 'bg-[#1a1714] text-[#9c9282] border border-[#2e2923]'
                    }`}
                  >
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Grounding Protocol Status & Institution */}
        <div className="pt-3 border-t border-[#2e2923] space-y-2">
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
              Dual-pagination verified citations across 19th-century colonial gazetteers &amp; field records.
            </p>
          </div>

          <div className="p-2 rounded-xl border border-[#2e2923]/60 bg-[#0e0c0a] text-[10px] text-center space-y-0.5">
            <div className="font-serif font-bold text-[#ded6c5] font-heritage">
              IIT Gandhinagar · Explorer Fellowship
            </div>
            <div className="text-[#6e6659] font-mono text-[9px]">
              DHAROHAR AI · Cultural Heritage Archive
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

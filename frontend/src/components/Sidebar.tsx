'use client';

import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Compass,
  Scroll,
  MapPin,
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
      label: 'Overview & Corpus',
      icon: LayoutDashboard,
      status: 'active',
      badge: 'Live',
    },
    {
      id: 'gazetteers',
      label: 'Gazetteers & Reports',
      icon: BookOpen,
      status: 'milestone2',
      badge: 'M2',
    },
    {
      id: 'blueprints',
      label: 'Architectural Plans',
      icon: Compass,
      status: 'milestone2',
      badge: 'M2',
    },
    {
      id: 'epigraphy',
      label: 'Epigraphical Inscriptions',
      icon: Scroll,
      status: 'milestone2',
      badge: 'M2',
    },
    {
      id: 'cartography',
      label: 'Geospatial Heritage Map',
      icon: MapPin,
      status: 'milestone3',
      badge: 'M3',
    },
    {
      id: '3d-viewer',
      label: '3D Monument Models',
      icon: Box,
      status: 'milestone3',
      badge: 'M3',
    },
    {
      id: 'diagnostics',
      label: 'System & Health',
      icon: Activity,
      status: 'active',
      badge: 'Live',
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-xs lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 z-40 lg:z-10 h-full lg:h-[calc(100vh-4rem)] w-64 border-r border-stone-200/80 dark:border-stone-800 bg-[#faf8f5] dark:bg-[#12100e] flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 lg:hidden">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-stone-900 dark:text-stone-100 font-heritage">
              DHAROHAR AI
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="p-3 space-y-1 overflow-y-auto flex-1">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-stone-500 uppercase">
            Archive Explorer
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentTab === item.id;
            const isPlanned = item.status.startsWith('milestone');

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-amber-100/80 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-semibold shadow-xs ring-1 ring-amber-300/40 dark:ring-amber-800/40'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100/80 dark:hover:bg-stone-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected
                        ? 'text-amber-800 dark:text-amber-400'
                        : 'text-stone-500 dark:text-stone-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.id === 'diagnostics' && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        backendConnected ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isSelected
                        ? 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                        : isPlanned
                        ? 'bg-stone-200/70 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info box */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
          <div className="p-3 rounded-lg bg-stone-100/70 dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-800 text-[11px] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                Evidence Protocol
              </span>
              <span className="text-[10px] text-amber-800 dark:text-amber-300 font-medium">
                Active
              </span>
            </div>
            <p className="text-stone-500 dark:text-stone-400 leading-tight">
              Strict page-level citation mapping enforced. Hallucinations prohibited.
            </p>
          </div>

          <div className="px-2 pt-1 flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-500">
            <span>HackCult &apos;26 | HC26-CULT01</span>
            <span className="font-mono">v0.1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}

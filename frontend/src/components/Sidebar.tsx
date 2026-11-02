'use client';

import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  MapPin,
  Box,
  ShieldCheck,
  Activity,
  Server,
  X,
  Compass,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  backendConnected: boolean;
  currentRole?: string;
}

export default function Sidebar({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  backendConnected: _backendConnected,
  currentRole: _currentRole = 'archivist',
}: SidebarProps) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Semantic Vector Search',
      icon: LayoutDashboard,
      badge: 'all-MiniLM',
      description: 'Zero-hallucination evidence search',
    },
    {
      id: 'records',
      label: 'Corpus & Field Records',
      icon: BookOpen,
      badge: 'Archive',
      description: 'IITGN Explorer documentation',
    },
    {
      id: 'cartography',
      label: 'Geospatial Heritage Map',
      icon: MapPin,
      badge: 'Leaflet',
      description: 'Stepwells & expedition trails',
    },
    {
      id: '3d-viewer',
      label: '3D Monument Twin',
      icon: Box,
      badge: 'Three.js',
      description: 'WebGL subterranean baoli twin',
    },
    {
      id: 'review-queue',
      label: 'Curator Review Queue',
      icon: ShieldCheck,
      badge: 'Human-in-Loop',
      description: 'Verification of AI suggestions',
    },
    {
      id: 'admin',
      label: 'Audit & Provenance',
      icon: Activity,
      badge: 'Admin',
      description: 'System metrics & audit trail',
    },
    {
      id: 'diagnostics',
      label: 'System & Health',
      icon: Server,
      badge: 'FastAPI',
      description: 'Live backend telemetry',
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
            <Compass className="w-5 h-5 text-amber-700" />
            <span className="font-serif font-bold text-stone-900 dark:text-stone-100">
              DHAROHAR AI
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
            Platform Capabilities
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                  isSelected
                    ? 'bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 shadow-xs'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected ? 'text-amber-400 dark:text-amber-600' : 'text-stone-500 dark:text-stone-400'
                    }`}
                  />
                  <div>
                    <span className="block leading-tight">{item.label}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isSelected
                      ? 'bg-stone-800 dark:bg-stone-200 text-stone-200 dark:text-stone-800'
                      : 'bg-stone-200/70 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                  }`}
                >
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer info: IIT Gandhinagar Institutional Banner */}
        <div className="p-3 m-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              IIT Gandhinagar
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
            Explorer Fellowship &amp; Grassroots Cultural Revitalization Archive
          </p>
          <div className="pt-1 border-t border-stone-100 dark:border-stone-800 text-[9px] font-mono text-stone-400">
            HackCult &apos;26 · HC26-CULT01
          </div>
        </div>
      </aside>
    </>
  );
}

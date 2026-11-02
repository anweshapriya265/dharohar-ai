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
  Landmark,
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
      id: 'cartography',
      label: 'Expedition Heritage Map',
      icon: MapPin,
      badge: 'Geospatial',
      description: 'Stepwells & expedition trails',
    },
    {
      id: '3d-viewer',
      label: '3D Stepwell Twin',
      icon: Box,
      badge: 'WebGL',
      description: 'Interactive subterranean twin',
    },
    {
      id: 'dashboard',
      label: 'Semantic Vector Search',
      icon: LayoutDashboard,
      badge: 'Embeddings',
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
        className={`fixed lg:sticky top-0 lg:top-28 z-40 lg:z-10 h-full lg:h-[calc(100vh-7rem)] w-64 border-r border-[#e5dfd5] bg-[#f7f5f0] flex flex-col justify-between transition-transform duration-200 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#e5dfd5] lg:hidden">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#9c381e]" />
            <span className="font-serif font-bold text-stone-900 font-heritage">
              DHAROHAR AI
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-500 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
            Platform Pathways
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                  isSelected
                    ? 'bg-[#9c381e] text-[#f7f5f0] shadow-2xs font-semibold'
                    : 'text-stone-700 hover:bg-[#ede7dc]/60 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected ? 'text-[#f7f5f0]' : 'text-stone-500'
                    }`}
                  />
                  <div>
                    <span className="block leading-tight">{item.label}</span>
                  </div>
                </div>

                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    isSelected
                      ? 'bg-black/20 text-[#fbeee9]'
                      : 'bg-stone-200/80 text-stone-600'
                  }`}
                >
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer info: IIT Gandhinagar Institutional Banner */}
        <div className="p-3 m-3 rounded-2xl border border-[#e5dfd5] bg-white text-[11px] space-y-1.5 shadow-heritage">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-800 font-heritage">
              IIT Gandhinagar
            </span>
            <span className="w-2 h-2 rounded-full bg-[#2d5e4a]" />
          </div>
          <p className="text-[10px] text-stone-500 leading-tight">
            Explorer Fellowship &amp; Cultural Heritage Revitalisation
          </p>
          <div className="pt-1 border-t border-stone-100 text-[9px] font-mono text-stone-400">
            HackCult &apos;26 · HC26-CULT01
          </div>
        </div>
      </aside>
    </>
  );
}

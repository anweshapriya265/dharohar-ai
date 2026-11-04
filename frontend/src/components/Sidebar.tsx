'use client';

import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Search,
  Box,
  Layers,
  MapPin,
  BookOpen,
  FileText,
  ShieldCheck,
  Activity,
  Server,
  X,
  Compass,
} from 'lucide-react';
import DharoharLogo from '@/components/DharoharLogo';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  backendConnected?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ElementType;
  badge?: string;
  tooltip: string;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

export default function Sidebar({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  isCollapsed = false,
  backendConnected = true,
}: SidebarProps) {
  const navGroups: NavGroup[] = [
    {
      groupTitle: 'Workspace',
      items: [
        {
          id: 'dashboard',
          label: 'Overview',
          shortLabel: 'Overview',
          icon: LayoutDashboard,
          tooltip: 'Executive summary & collection statistics',
        },
        {
          id: 'assistant',
          label: 'Research Assistant',
          shortLabel: 'Assistant',
          icon: Sparkles,
          badge: 'AI Core',
          tooltip: 'Evidence-grounded scholarly inquiry',
        },
        {
          id: 'search',
          label: 'Hybrid Search',
          shortLabel: 'Search',
          icon: Search,
          badge: 'RRF',
          tooltip: 'Dense semantic + SQLite FTS5 BM25 retrieval',
        },
      ],
    },
    {
      groupTitle: 'Heritage Exploration',
      items: [
        {
          id: 'heritage-3d',
          label: '3D Heritage Explorer',
          shortLabel: 'Kailasa',
          icon: Compass,
          badge: 'Monolith',
          tooltip: 'Ellora Kailasa 3D architectural study',
        },
        {
          id: '3d-viewer',
          label: 'Stepwell Digital Twin',
          shortLabel: 'Stepwell',
          icon: Box,
          badge: 'WebGL',
          tooltip: 'Adalaj subterranean 3D cutaway twin',
        },
        {
          id: 'cartography',
          label: 'Expedition Map',
          shortLabel: 'Map',
          icon: MapPin,
          badge: 'Geospatial',
          tooltip: 'Interactive cartography & field coordinates',
        },
      ],
    },
    {
      groupTitle: 'Archival Management',
      items: [
        {
          id: 'records',
          label: 'Heritage Corpus',
          shortLabel: 'Corpus',
          icon: BookOpen,
          badge: 'Catalog',
          tooltip: 'Documented architectural monuments & field notes',
        },
        {
          id: 'archive',
          label: 'Digital Archive',
          shortLabel: 'Archive',
          icon: FileText,
          badge: 'Folios',
          tooltip: 'Ingested monographs & page-by-page extractions',
        },
        {
          id: 'review-queue',
          label: 'Curator Review',
          shortLabel: 'Review',
          icon: ShieldCheck,
          badge: 'Human-in-Loop',
          tooltip: 'Verification queue for AI suggestions',
        },
      ],
    },
    {
      groupTitle: 'System & Audit',
      items: [
        {
          id: 'admin',
          label: 'Analytics & Audit',
          shortLabel: 'Audit',
          icon: Activity,
          badge: 'Admin',
          tooltip: 'System metrics & provenance audit logs',
        },
        {
          id: 'diagnostics',
          label: 'System Telemetry',
          shortLabel: 'Health',
          icon: Server,
          badge: 'FastAPI',
          tooltip: 'Service health, embeddings & WAL store',
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 z-50 lg:z-20 h-full lg:h-[calc(100vh-4rem)] border-r border-[#26221d] bg-[#0c0a08] flex flex-col justify-between transition-all duration-200 ease-in-out shrink-0 select-none ${
          /* Mobile Drawer Position */
          isOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${
          /* Desktop Width */
          isCollapsed ? 'lg:w-[68px]' : 'lg:w-64 xl:w-72'
        }`}
        aria-label="Application Navigation"
      >
        {/* Navigation Content Area */}
        <div className="flex-1 overflow-y-auto py-4 px-2.5 sm:px-3 space-y-5 scrollbar-thin">
          {/* Mobile Header with Brand & Close Button */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#26221d] lg:hidden">
            <div className="flex items-center gap-2">
              <DharoharLogo size={28} />
              <span className="font-serif font-bold text-sm text-[#fcf9f2] font-heritage">
                DHAROHAR AI
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#9c9282] hover:text-[#fcf9f2] hover:bg-[#171512]"
              aria-label="Close navigation drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Groups */}
          {navGroups.map((group) => (
            <div key={group.groupTitle} className="space-y-1">
              {/* Group Title (Hidden when collapsed on desktop) */}
              <div
                className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#9c9282] font-semibold ${
                  isCollapsed ? 'lg:hidden' : 'block'
                }`}
              >
                {group.groupTitle}
              </div>

              {/* Collapsed divider on desktop */}
              {isCollapsed && (
                <div className="hidden lg:block my-2 border-t border-[#26221d]/60 mx-2" />
              )}

              {/* Group Items */}
              {group.items.map((item) => {
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
                    title={isCollapsed ? `${item.label} (${group.groupTitle})` : item.tooltip}
                    className={`w-full flex items-center rounded-xl text-left transition-all group relative ${
                      isCollapsed
                        ? 'lg:justify-center lg:px-2.5 lg:py-2.5 px-3 py-2'
                        : 'justify-between px-3 py-2'
                    } ${
                      isActive
                        ? 'bg-[#d4af37] text-[#080706] font-semibold shadow-xs'
                        : 'text-[#ded6c5] hover:text-[#fcf9f2] hover:bg-[#171512]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-[#080706]'
                            : 'text-[#9c9282] group-hover:text-[#d4af37]'
                        }`}
                      />
                      <span
                        className={`text-xs font-medium truncate ${
                          isCollapsed ? 'lg:hidden' : 'block'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>

                    {/* Badge */}
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                          isCollapsed ? 'lg:hidden' : 'inline-block'
                        } ${
                          isActive
                            ? 'bg-black/20 text-[#080706] font-bold'
                            : 'bg-[#1b1814] text-[#9c9282] border border-[#26221d]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div
          className={`p-3 border-t border-[#26221d] bg-[#0a0807] space-y-2 ${
            isCollapsed ? 'lg:p-2' : 'p-3'
          }`}
        >
          {/* Integrity Pill (Hidden when collapsed on desktop) */}
          <div
            className={`p-2.5 rounded-xl bg-[#110f0d] border border-[#26221d] text-xs space-y-1 ${
              isCollapsed ? 'lg:hidden' : 'block'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono uppercase">
              <span className="flex items-center gap-1.5 text-[#eed27c]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3ba87e]" />
                <span>Strict Provenance</span>
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  backendConnected ? 'bg-[#3ba87e]' : 'bg-rose-500'
                }`}
                title={backendConnected ? 'FastAPI Connected' : 'Backend Disconnected'}
              />
            </div>
            <p className="text-[10px] text-[#9c9282] leading-tight">
              Dual-pagination verified evidence linkage for colonial archival gazetteers.
            </p>
          </div>

          {/* Institutional Stamp */}
          <div
            className={`text-center py-1 ${
              isCollapsed ? 'lg:hidden' : 'block'
            }`}
          >
            <div className="text-[10px] font-serif font-bold text-[#ded6c5] font-heritage">
              IIT Gandhinagar · Explorer Fellowship
            </div>
            <div className="text-[9px] font-mono text-[#6e6659]">
              Cultural Heritage Intelligence Platform
            </div>
          </div>

          {/* Collapsed Icon-Only Indicator */}
          {isCollapsed && (
            <div className="hidden lg:flex items-center justify-center py-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendConnected ? 'bg-[#3ba87e]' : 'bg-rose-500'
                }`}
                title={backendConnected ? 'FastAPI Connected' : 'Backend Disconnected'}
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

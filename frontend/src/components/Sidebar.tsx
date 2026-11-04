'use client';

import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Search,
  Box,
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
          tooltip: 'Archive overview & research pathways',
        },
        {
          id: 'assistant',
          label: 'Research Assistant',
          shortLabel: 'Assistant',
          icon: Sparkles,
          badge: 'Grounded AI',
          tooltip: 'Evidence-grounded historical inquiry',
        },
        {
          id: 'search',
          label: 'Hybrid Search',
          shortLabel: 'Search',
          icon: Search,
          badge: 'RRF',
          tooltip: 'Dense semantic + SQLite FTS5 lexical retrieval',
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
          tooltip: 'Ellora Kailasa 3D architectural workspace',
        },
        {
          id: '3d-viewer',
          label: 'Stepwell Digital Twin',
          shortLabel: 'Stepwell',
          icon: Box,
          badge: 'WebGL',
          tooltip: 'Adalaj Vav subterranean architectural model',
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
          badge: 'Curation',
          tooltip: 'Human-in-the-loop verification queue',
        },
      ],
    },
    {
      groupTitle: 'System',
      items: [
        {
          id: 'admin',
          label: 'Analytics & Audit',
          shortLabel: 'Audit',
          icon: Activity,
          badge: 'Audit',
          tooltip: 'System metrics & immutable provenance logs',
        },
        {
          id: 'diagnostics',
          label: 'System Telemetry',
          shortLabel: 'Health',
          icon: Server,
          tooltip: 'Service health, embeddings & storage status',
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
          className="fixed inset-0 z-40 bg-[#393331]/40 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 z-50 lg:z-20 h-full lg:h-[calc(100vh-4rem)] border-r border-[#DED3C2] bg-[#FFFCF5] flex flex-col justify-between transition-all duration-200 ease-in-out shrink-0 select-none ${
          /* Mobile Drawer Position */
          isOpen ? 'translate-x-0 w-56 shadow-xl' : '-translate-x-full lg:translate-x-0'
        } ${
          /* Desktop Width (208px expanded, 56px collapsed) */
          isCollapsed ? 'lg:w-14' : 'lg:w-52'
        }`}
        aria-label="Application Navigation"
      >
        {/* Navigation Content Area (Independently scrollable) */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
          {/* Mobile Header with Brand & Close Button */}
          <div className="flex items-center justify-between pb-3 mb-1 border-b border-[#DED3C2] lg:hidden">
            <div className="flex items-center gap-2">
              <DharoharLogo size={28} />
              <span className="font-heritage font-bold text-sm text-[#642F38]">
                DHAROHAR AI
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#756D66] hover:text-[#642F38] hover:bg-[#EFE8DC]"
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
                className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#756D66] font-semibold ${
                  isCollapsed ? 'lg:hidden' : 'block'
                }`}
              >
                {group.groupTitle}
              </div>

              {/* Collapsed divider on desktop */}
              {isCollapsed && (
                <div className="hidden lg:block my-2 border-t border-[#DED3C2] mx-2" />
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
                    className={`w-full flex items-center rounded-lg text-left transition-colors group relative cursor-pointer ${
                      isCollapsed
                        ? 'lg:justify-center lg:px-1.5 lg:py-2.5 px-3 py-2'
                        : 'justify-between px-2.5 py-2'
                    } ${
                      isActive
                        ? 'bg-[#642F38] text-[#FFFCF5] font-medium shadow-xs'
                        : 'text-[#393331] hover:text-[#642F38] hover:bg-[#F6F1E7]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-[#FFFCF5]'
                            : 'text-[#756D66] group-hover:text-[#642F38]'
                        }`}
                      />
                      <span
                        className={`text-xs truncate ${
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
                            ? 'bg-white/20 text-[#FFFCF5] font-medium'
                            : 'bg-[#EFE8DC] text-[#756D66] border border-[#DED3C2]'
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

        {/* Stable Sidebar Footer (Never overlaps navigation!) */}
        <div
          className={`p-3 border-t border-[#DED3C2] bg-[#F6F1E7] space-y-2 shrink-0 ${
            isCollapsed ? 'lg:p-2' : 'p-3'
          }`}
        >
          {/* Integrity Pill (Hidden when collapsed on desktop) */}
          <div
            className={`p-2.5 rounded-lg bg-[#FFFCF5] border border-[#DED3C2] text-xs space-y-1 ${
              isCollapsed ? 'lg:hidden' : 'block'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono uppercase">
              <span className="flex items-center gap-1.5 text-[#642F38]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#52745E]" />
                <span className="font-semibold">Provenance Verified</span>
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  backendConnected ? 'bg-[#52745E]' : 'bg-[#A94B43]'
                }`}
                title={backendConnected ? 'API Connected' : 'API Disconnected'}
              />
            </div>
            <p className="text-[10px] text-[#756D66] leading-tight font-serif">
              Dual-pagination evidence linkage for archival folios.
            </p>
          </div>

          {/* Institutional Stamp */}
          <div
            className={`text-center py-0.5 ${
              isCollapsed ? 'lg:hidden' : 'block'
            }`}
          >
            <div className="text-[10px] font-heritage font-bold text-[#642F38]">
              IIT Gandhinagar · Explorer Fellowship
            </div>
            <div className="text-[9px] font-mono text-[#756D66]">
              Digital Heritage Intelligence Platform
            </div>
          </div>

          {/* Collapsed Icon-Only Indicator */}
          {isCollapsed && (
            <div className="hidden lg:flex items-center justify-center py-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendConnected ? 'bg-[#52745E]' : 'bg-[#A94B43]'
                }`}
                title={backendConnected ? 'API Connected' : 'API Disconnected'}
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

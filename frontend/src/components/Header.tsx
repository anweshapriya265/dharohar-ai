'use client';

import React, { useState } from 'react';
import {
  Upload,
  RefreshCw,
  Server,
  UserCheck,
  Activity,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Database,
  Cpu,
} from 'lucide-react';
import DharoharLogo from '@/components/DharoharLogo';
import { HealthCheckState, getApiBaseUrl } from '@/lib/api';

interface HeaderProps {
  healthState: HealthCheckState;
  onRefreshHealth: () => void;
  onOpenUpload: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  currentRole?: string;
  onSelectRole?: (role: string) => void;
  documentCount?: number;
  totalPageCount?: number;
}

export default function Header({
  healthState,
  onRefreshHealth,
  onOpenUpload,
  onToggleSidebar,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  currentRole = 'archivist',
  onSelectRole,
  documentCount = 3,
  totalPageCount = 1188,
}: HeaderProps) {
  const [showHealthMenu, setShowHealthMenu] = useState(false);

  const roles = [
    { id: 'archivist', label: 'Archivist / Fellow', desc: 'Monograph ingestion & field notes' },
    { id: 'reviewer', label: 'Curator Reviewer', desc: 'Verify AI suggestions & claims' },
    { id: 'admin', label: 'System Administrator', desc: 'Provenance logs & audit trail' },
    { id: 'visitor', label: 'Public Researcher', desc: 'Read-only search & 3D explorer' },
  ];

  const isConnected = healthState.status === 'connected';

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-[#DED3C2] bg-[#FFFCF5] transition-colors w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
        {/* Left: Sidebar Toggle + Brand Identity + Collection Indicator */}
        <div className="flex items-center gap-3">
          {/* Mobile Drawer Toggle */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-[#393331] hover:text-[#642F38] hover:bg-[#EFE8DC] border border-[#DED3C2] focus:outline-none cursor-pointer"
              aria-label="Toggle navigation drawer"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Desktop Sidebar Collapse Toggle */}
          {onToggleSidebarCollapse && (
            <button
              type="button"
              onClick={onToggleSidebarCollapse}
              className="hidden lg:flex p-2 rounded-lg text-[#756D66] hover:text-[#642F38] hover:bg-[#EFE8DC] border border-[#DED3C2] transition-colors cursor-pointer"
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <DharoharLogo size={36} />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-heritage text-base sm:text-lg font-bold tracking-tight text-[#642F38]">
                  DHAROHAR AI
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-serif font-medium bg-[#EFE8DC] text-[#642F38] border border-[#DED3C2]">
                  धरोहर
                </span>
              </div>
              <span className="hidden md:inline-block text-[11px] text-[#756D66] leading-none mt-0.5">
                Digital Heritage Intelligence &amp; Archival Platform
              </span>
            </div>
          </div>

          {/* Collection Status Pill */}
          <div className="hidden xl:flex items-center gap-2 ml-4 pl-4 border-l border-[#DED3C2]">
            <span className="text-[11px] font-mono text-[#756D66] flex items-center gap-1.5 bg-[#F6F1E7] px-2.5 py-1 rounded-md border border-[#DED3C2]">
              <Database className="w-3.5 h-3.5 text-[#A77C54]" />
              <span>Corpus:</span>
              <strong className="text-[#393331] font-semibold">{documentCount} Vol ({totalPageCount} Folios)</strong>
            </span>
          </div>
        </div>

        {/* Right Actions: Role Selector + Telemetry Status + Contribution Action */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Active Persona / Role Switcher */}
          {onSelectRole && (
            <div className="hidden md:flex items-center">
              <label htmlFor="user-role-selector" className="sr-only">Role Profile</label>
              <div className="relative">
                <select
                  id="user-role-selector"
                  value={currentRole}
                  onChange={(e) => onSelectRole(e.target.value)}
                  className="text-xs bg-[#FFFCF5] hover:bg-[#F6F1E7] text-[#393331] border border-[#DED3C2] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#642F38] transition-colors cursor-pointer font-serif"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Backend Health Telemetry Indicator */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHealthMenu(!showHealthMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DED3C2] bg-[#FFFCF5] hover:bg-[#F6F1E7] text-xs font-mono text-[#393331] transition-colors cursor-pointer"
              title="Click to view API Telemetry"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-[#52745E]' : healthState.status === 'connecting' ? 'bg-[#A67C3F] animate-pulse' : 'bg-[#A94B43]'
                }`}
              />
              <span className="hidden sm:inline text-[11px]">
                {isConnected ? 'API Online' : healthState.status === 'connecting' ? 'Connecting...' : 'API Offline'}
              </span>
            </button>

            {/* Telemetry Popover */}
            {showHealthMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#FFFCF5] border border-[#DED3C2] p-4 shadow-lg z-50 text-xs text-[#393331] space-y-3">
                <div className="flex items-center justify-between border-b border-[#DED3C2] pb-2">
                  <span className="font-semibold text-xs text-[#642F38] font-heritage flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#642F38]" />
                    Backend Diagnostics
                  </span>
                  <button
                    onClick={onRefreshHealth}
                    className="p-1 hover:bg-[#EFE8DC] rounded text-[#756D66] transition-colors"
                    title="Refresh Status"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#756D66]">Service:</span>
                    <span className="font-semibold text-[#52745E]">{healthState.data?.app || 'FastAPI Service'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#756D66]">Latency:</span>
                    <span className="text-[#393331]">{healthState.latencyMs ? `${healthState.latencyMs}ms` : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#756D66]">PyMuPDF:</span>
                    <span className="text-[#393331]">{healthState.data?.services?.pdf_extraction || 'active'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#756D66]">all-MiniLM:</span>
                    <span className="text-[#393331]">{healthState.data?.services?.semantic_search || 'active'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#756D66]">FTS5 Lexical:</span>
                    <span className="text-[#52745E]">calibrated</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#DED3C2] text-[10px] text-[#756D66]">
                  Endpoint: <span className="font-mono text-[#642F38]">{getApiBaseUrl()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Button: Contribute / Ingest Record */}
          <button
            type="button"
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] text-xs font-serif font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#FFFCF5]" />
            <span>Contribute Record</span>
          </button>
        </div>
      </div>
    </header>
  );
}

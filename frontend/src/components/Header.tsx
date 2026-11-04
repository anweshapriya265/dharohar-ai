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
    <header className="sticky top-0 z-30 h-16 border-b border-[#26221d] bg-[#0c0a08]/95 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
        {/* Left: Sidebar Toggle + Brand Identity + Collection Indicator */}
        <div className="flex items-center gap-3">
          {/* Mobile Drawer Toggle */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-[#ded6c5] hover:text-[#fcf9f2] hover:bg-[#171512] border border-[#26221d] focus:outline-hidden"
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
              className="hidden lg:flex p-2 rounded-lg text-[#9c9282] hover:text-[#fcf9f2] hover:bg-[#171512] border border-[#26221d] transition-colors focus:outline-hidden"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 select-none">
            <DharoharLogo size={36} className="shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base sm:text-lg text-[#fcf9f2] tracking-wider font-heritage">
                  DHAROHAR AI
                </span>
                <span className="inline-block text-[10px] font-serif px-2 py-0.5 rounded-md bg-[#1c1813] text-[#eed27c] border border-[#d4af37]/35 font-medium">
                  धरोहर
                </span>
              </div>
              <p className="hidden md:block text-[10px] font-mono text-[#9c9282] tracking-tight">
                Digital Heritage Intelligence Platform
              </p>
            </div>
          </div>

          {/* Current Workspace & Collection Indicator (Desktop) */}
          <div className="hidden xl:flex items-center gap-2 ml-4 pl-4 border-l border-[#26221d] text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
            <span className="text-[#9c9282] font-mono text-[11px]">Archive Corpus:</span>
            <span className="font-mono text-[11px] text-[#ded6c5] font-semibold">
              {documentCount} Volumes • {totalPageCount.toLocaleString()} Folios Grounded
            </span>
          </div>
        </div>

        {/* Right Controls: Role Selector + Telemetry Pill + Primary Ingest Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Role Selector */}
          {onSelectRole && (
            <div className="relative hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#26221d] bg-[#110f0d] text-xs text-[#ded6c5]">
              <UserCheck className="w-3.5 h-3.5 text-[#d4af37]" />
              <span className="text-[10px] font-mono text-[#9c9282]">Role:</span>
              <select
                value={currentRole}
                onChange={(e) => onSelectRole(e.target.value)}
                className="bg-transparent font-medium text-xs text-[#fcf9f2] focus:outline-hidden cursor-pointer pr-1"
                aria-label="Select user role"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#110f0d] text-[#fcf9f2]">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live Telemetry Pill & Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHealthMenu(!showHealthMenu)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-mono border transition-all ${
                isConnected
                  ? 'bg-[#0b1712] border-[#2d5e4a]/50 text-[#3ba87e] hover:bg-[#10241b]'
                  : healthState.status === 'connecting'
                  ? 'bg-[#1c1813] border-[#eed27c]/40 text-[#eed27c] hover:bg-[#252019]'
                  : 'bg-[#1c0e0e] border-[#c53838]/40 text-[#c53838] hover:bg-[#261313]'
              }`}
              title="Click for real-time backend telemetry"
              aria-label={`Backend Status: ${healthState.status}`}
            >
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3ba87e] opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected
                      ? 'bg-[#3ba87e]'
                      : healthState.status === 'connecting'
                      ? 'bg-[#eed27c]'
                      : 'bg-[#c53838]'
                  }`}
                />
              </span>
              <span className="hidden sm:inline font-mono text-[11px]">
                {isConnected ? 'FastAPI 8000' : healthState.status}
              </span>
              {isConnected && healthState.latencyMs !== null && (
                <span className="text-[10px] opacity-80 font-mono hidden md:inline">
                  {healthState.latencyMs}ms
                </span>
              )}
            </button>

            {/* Diagnostics Popover Menu */}
            {showHealthMenu && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#141210] border border-[#26221d] shadow-2xl p-4 text-xs z-50 animate-in fade-in space-y-3">
                <div className="flex items-center justify-between border-b border-[#26221d] pb-2">
                  <span className="font-serif font-bold text-[#fcf9f2] flex items-center gap-1.5 font-heritage">
                    <Activity className="w-3.5 h-3.5 text-[#d4af37]" />
                    Backend Telemetry
                  </span>
                  <button
                    type="button"
                    onClick={onRefreshHealth}
                    className="p-1 text-[#9c9282] hover:text-[#d4af37] transition-colors rounded hover:bg-[#1a1714]"
                    title="Ping backend"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between py-1 border-b border-[#201d19]">
                    <span className="text-[#9c9282] flex items-center gap-1.5">
                      <Server className="w-3 h-3 text-[#eed27c]" />
                      FastAPI Base:
                    </span>
                    <span className="text-[#fcf9f2]">{getApiBaseUrl()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#201d19]">
                    <span className="text-[#9c9282] flex items-center gap-1.5">
                      <Cpu className="w-3 h-3 text-[#3ba87e]" />
                      Embeddings:
                    </span>
                    <span className="text-[#3ba87e]">all-MiniLM-L6-v2 (384-dim)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#201d19]">
                    <span className="text-[#9c9282] flex items-center gap-1.5">
                      <Database className="w-3 h-3 text-[#d4af37]" />
                      Hybrid Engine:
                    </span>
                    <span className="text-[#eed27c]">Dense + SQLite FTS5 (RRF)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#201d19]">
                    <span className="text-[#9c9282]">Database Mode:</span>
                    <span className="text-[#ded6c5]">SQLite WAL Mode</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#9c9282]">Active Role:</span>
                    <span className="text-[#d4af37] capitalize font-serif font-bold">
                      {currentRole}
                    </span>
                  </div>
                </div>

                {healthState.error && (
                  <p className="text-[11px] text-[#c53838] bg-[#221010] p-2 rounded-lg border border-[#c53838]/30">
                    {healthState.error}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Primary Action Button: Ingest Record */}
          <button
            type="button"
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg bg-[#d4af37] hover:bg-[#e5c158] text-[#080706] text-xs font-semibold shadow-sm transition-all focus:outline-hidden"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Contribute Record</span>
            <span className="sm:hidden">Ingest</span>
          </button>
        </div>
      </div>
    </header>
  );
}

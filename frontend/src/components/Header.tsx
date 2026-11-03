'use client';

import React, { useState } from 'react';
import {
  Upload,
  RefreshCw,
  Server,
  UserCheck,
  MapPin,
  Box,
  Search,
  BookOpen,
  ShieldCheck,
  Activity,
  Sparkles,
  Compass,
} from 'lucide-react';
import DharoharLogo from '@/components/DharoharLogo';
import { HealthCheckState, getApiBaseUrl } from '@/lib/api';

interface HeaderProps {
  healthState: HealthCheckState;
  onRefreshHealth: () => void;
  onOpenUpload: () => void;
  onToggleSidebar?: () => void;
  currentRole?: string;
  onSelectRole?: (role: string) => void;
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export default function Header({
  healthState,
  onRefreshHealth,
  onOpenUpload,
  currentRole = 'archivist',
  onSelectRole,
  currentTab,
  onSelectTab,
}: HeaderProps) {
  const [showHealthMenu, setShowHealthMenu] = useState(false);

  const roles = [
    { id: 'visitor', label: 'Visitor / Public', desc: 'Read-only search & 3D view' },
    { id: 'archivist', label: 'IITGN Fellow (Archivist)', desc: 'Upload field notes & photos' },
    { id: 'reviewer', label: 'Archival Reviewer', desc: 'Verify AI suggestions' },
    { id: 'admin', label: 'Administrator', desc: 'Full provenance & system logs' },
  ];

  const primaryTabs = [
    { id: 'assistant', label: 'Research Assistant', icon: Sparkles, badge: 'Grounded AI' },
    { id: '3d-viewer', label: '3D Stepwell Twin', icon: Box, badge: 'WebGL' },
    { id: 'heritage-3d', label: '3D Monolith', icon: Compass, badge: 'Kailasa' },
    { id: 'cartography', label: 'Expedition Map', icon: MapPin, badge: 'Geospatial' },
    { id: 'dashboard', label: 'Hybrid Search', icon: Search, badge: 'Dense+FTS5' },
    { id: 'records', label: 'Heritage Corpus', icon: BookOpen, badge: 'Archives' },
    { id: 'review-queue', label: 'Curator Queue', icon: ShieldCheck, badge: 'Review' },
    { id: 'diagnostics', label: 'System & Audit', icon: Activity, badge: 'Admin' },
  ];

  const isConnected = healthState.status === 'connected';

  return (
    <header className="sticky top-0 z-30 border-b border-[#2e2923] bg-[#0a0908]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Institution */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectTab('assistant')}
            className="flex items-center gap-3 text-left group focus:outline-hidden"
          >
            <DharoharLogo size={42} className="group-hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg text-[#fcf9f2] tracking-wider font-heritage group-hover:text-[#eed27c] transition-colors">
                  DHAROHAR AI
                </span>
                <span className="inline-block text-[11px] font-serif px-2 py-0.5 rounded-md bg-[#1f1910] text-[#eed27c] border border-[#d4af37]/40">
                  धरोहर
                </span>
              </div>
              <p className="hidden md:block text-[11px] font-mono text-[#9c9282]">
                IIT Gandhinagar · Explorer Fellowship Cultural Archive
              </p>
            </div>
          </button>
        </div>

        {/* Right Utility Belt: Role Switcher + Health Telemetry + Primary Ingestion */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* RBAC Role Selector */}
          {onSelectRole && (
            <div className="relative hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2e2923] bg-[#12100e] text-xs text-[#ded6c5] shadow-xs">
              <UserCheck className="w-3.5 h-3.5 text-[#d4af37]" />
              <span className="text-[11px] text-[#9c9282] font-mono">Role:</span>
              <select
                value={currentRole}
                onChange={(e) => onSelectRole(e.target.value)}
                className="bg-transparent font-serif font-semibold text-[#fcf9f2] focus:outline-hidden cursor-pointer pr-1"
                aria-label="Select User Role"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#12100e] text-[#fcf9f2]">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* System Health Telemetry Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHealthMenu(!showHealthMenu)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border transition-all ${
                isConnected
                  ? 'bg-[#0d1e17] border-[#3ba87e]/40 text-[#3ba87e] hover:bg-[#122820]'
                  : healthState.status === 'connecting'
                  ? 'bg-[#221c10] border-[#eed27c]/40 text-[#eed27c] hover:bg-[#2c2415]'
                  : 'bg-[#221010] border-[#c53838]/40 text-[#c53838] hover:bg-[#2c1515]'
              }`}
              title="Click to view live backend telemetry"
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
              <span className="capitalize hidden sm:inline">
                {isConnected ? 'Archive Online' : healthState.status}
              </span>
              {isConnected && healthState.latencyMs !== null && (
                <span className="font-mono text-[10px] opacity-80">{healthState.latencyMs}ms</span>
              )}
            </button>

            {/* Health Telemetry Dropdown Card */}
            {showHealthMenu && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#141210] border border-[#2e2923] shadow-2xl p-4 text-xs z-50 animate-in fade-in space-y-3">
                <div className="flex items-center justify-between border-b border-[#2e2923] pb-2">
                  <span className="font-serif font-bold text-[#fcf9f2] flex items-center gap-1.5 font-heritage">
                    <Server className="w-3.5 h-3.5 text-[#d4af37]" />
                    Backend Diagnostics
                  </span>
                  <button
                    type="button"
                    onClick={onRefreshHealth}
                    className="p-1 text-[#9c9282] hover:text-[#d4af37] transition-colors"
                    title="Refresh status"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between py-1 border-b border-[#2e2923]/60">
                    <span className="text-[#9c9282]">FastAPI Host:</span>
                    <span className="text-[#fcf9f2]">{getApiBaseUrl()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2e2923]/60">
                    <span className="text-[#9c9282]">Vector Embeddings:</span>
                    <span className="text-[#3ba87e]">all-MiniLM-L6-v2 (384-dim)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2e2923]/60">
                    <span className="text-[#9c9282]">Hybrid Engine:</span>
                    <span className="text-[#eed27c]">Dense + SQLite FTS5 (RRF)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2e2923]/60">
                    <span className="text-[#9c9282]">Database Engine:</span>
                    <span className="text-[#ded6c5]">SQLite WAL Repository</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2e2923]/60">
                    <span className="text-[#9c9282]">Active Role:</span>
                    <span className="text-[#d4af37] capitalize">{currentRole}</span>
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

          {/* Primary Ingestion Upload Action */}
          <button
            type="button"
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#d4af37] hover:bg-[#b89124] text-[#080706] text-xs font-serif font-semibold shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Contribute Record / Ingest</span>
            <span className="sm:hidden">Contribute</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#2e2923] overflow-x-auto scrollbar-none">
        <nav className="flex items-center gap-1 sm:gap-2 py-2 min-w-max" aria-label="Global Tabs">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#d4af37] text-[#080706] shadow-sm font-serif font-bold'
                    : 'text-[#ded6c5] hover:text-[#fcf9f2] hover:bg-[#1a1714]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#080706]' : 'text-[#9c9282]'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    isActive
                      ? 'bg-black/20 text-[#080706]'
                      : 'bg-[#221f1a] text-[#9c9282] border border-[#2e2923]'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

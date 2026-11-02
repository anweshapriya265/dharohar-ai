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
} from 'lucide-react';
import DharoharLogo from '@/components/DharoharLogo';
import { HealthCheckState, getApiBaseUrl } from '@/lib/api';

interface HeaderProps {
  healthState: HealthCheckState;
  onRefreshHealth: () => void;
  onOpenUpload: () => void;
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
    { id: 'cartography', label: 'Expedition Map', icon: MapPin, badge: 'Geospatial' },
    { id: '3d-viewer', label: '3D Stepwell Twin', icon: Box, badge: 'WebGL' },
    { id: 'dashboard', label: 'Semantic Search', icon: Search, badge: 'Vectors' },
    { id: 'records', label: 'Heritage Corpus', icon: BookOpen, badge: 'Archives' },
    { id: 'review-queue', label: 'Curator Queue', icon: ShieldCheck, badge: 'Human-in-Loop' },
    { id: 'diagnostics', label: 'Audit & Health', icon: Activity, badge: 'System' },
  ];

  const isConnected = healthState.status === 'connected';

  return (
    <header className="sticky top-0 z-30 bg-[#f7f5f0]/95 backdrop-blur-md border-b border-[#e5dfd5] transition-all">
      {/* Top Banner & Quick Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Institution */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab('cartography')}
            className="flex items-center gap-3 text-left group focus:outline-hidden"
          >
            <DharoharLogo size={42} className="group-hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg text-stone-900 tracking-tight font-heritage">
                  DHAROHAR AI
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#fbeee9] text-[#9c381e] border border-[#f0d4ca]">
                  धरोहर
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium">
                IIT Gandhinagar · Explorer Fellowship Cultural Archive
              </p>
            </div>
          </button>
        </div>

        {/* Right Utility Belt: Role Switcher + Health Telemetry + Primary Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* RBAC Role Selector */}
          {onSelectRole && (
            <div className="relative hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5dfd5] bg-white text-xs text-stone-700 shadow-2xs">
              <UserCheck className="w-3.5 h-3.5 text-[#9c381e]" />
              <span className="text-[11px] text-stone-400 font-medium">Role:</span>
              <select
                value={currentRole}
                onChange={(e) => onSelectRole(e.target.value)}
                className="bg-transparent font-semibold text-stone-800 focus:outline-hidden cursor-pointer pr-1"
                aria-label="Select User Role"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* System Health Status Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHealthMenu(!showHealthMenu)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isConnected
                  ? 'border-[#c3dcd0] bg-[#edf5f1] text-[#2d5e4a] hover:bg-[#e2f0e8]'
                  : 'border-[#f4cbc5] bg-[#fdf0ee] text-[#a6382a] hover:bg-[#fce6e3]'
              }`}
              title="Click to view live backend telemetry"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-[#2d5e4a] animate-pulse' : 'bg-[#a6382a]'
                }`}
              />
              <span className="hidden sm:inline">
                {isConnected ? 'Archive Online' : 'Connecting'}
              </span>
              {isConnected && healthState.latencyMs !== null && (
                <span className="text-[10px] opacity-75 font-mono">
                  {healthState.latencyMs}ms
                </span>
              )}
            </button>

            {/* Health Telemetry Dropdown */}
            {showHealthMenu && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[#e5dfd5] bg-white shadow-heritage-md p-4 space-y-3 z-50 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <div className="flex items-center gap-2 font-semibold text-stone-900">
                    <Server className="w-4 h-4 text-[#9c381e]" />
                    <span>Backend Diagnostics</span>
                  </div>
                  <button
                    onClick={() => {
                      onRefreshHealth();
                    }}
                    className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                    title="Refresh status"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-[11px] text-stone-600">
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-400">FastAPI Host:</span>
                    <span className="font-mono text-stone-800">{getApiBaseUrl()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-400">Vector Embeddings:</span>
                    <span className="text-[#2d5e4a] font-semibold">all-MiniLM-L6-v2 (384-dim)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-400">Database Engine:</span>
                    <span className="font-semibold text-stone-800">SQLite WAL Repository</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-400">OCR Fallback Engine:</span>
                    <span className="text-stone-500 font-mono">PyMuPDF Native + Tesseract</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <span className="text-stone-400">Active Role:</span>
                  <span className="font-semibold text-[#9c381e] capitalize">{currentRole}</span>
                </div>
              </div>
            )}
          </div>

          {/* Primary Ingestion Action */}
          <button
            type="button"
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#9c381e] hover:bg-[#832e17] text-[#f7f5f0] text-xs font-semibold shadow-2xs transition-all focus:outline-hidden"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Contribute Record</span>
            <span className="sm:hidden">Upload</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs: Highly visible, effortless 1-click switching */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#ede7dc] overflow-x-auto scrollbar-none">
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
                    ? 'bg-[#9c381e] text-[#f7f5f0] shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#ede7dc]/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#f7f5f0]' : 'text-stone-500'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                    isActive
                      ? 'bg-black/20 text-[#fbeee9]'
                      : 'bg-stone-200/70 text-stone-600'
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

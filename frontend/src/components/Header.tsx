'use client';

import React, { useState } from 'react';
import {
  Landmark,
  Upload,
  RefreshCw,
  Menu,
  Activity,
} from 'lucide-react';
import { HealthCheckState } from '@/lib/api';

interface HeaderProps {
  healthState: HealthCheckState;
  onRefreshHealth: () => void;
  onOpenUpload: () => void;
  onToggleSidebar?: () => void;
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
}

export default function Header({
  healthState,
  onRefreshHealth,
  onOpenUpload,
  onToggleSidebar,
  currentTab,
  onSelectTab,
}: HeaderProps) {
  const [showHealthMenu, setShowHealthMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-[#2e2923] bg-[#0a0908]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-[#ded6c5] hover:bg-[#181613] border border-[#2e2923] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => onSelectTab && onSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#8c6b1a] text-[#080706] flex items-center justify-center shadow-lg ring-1 ring-[#d4af37]/40 group-hover:ring-[#d4af37] transition-all">
              <Landmark className="w-5 h-5" />
            </div>
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
                Immersive Heritage Intelligence Platform
              </p>
            </div>
          </div>
        </div>

        {/* Center Navigation Shortcuts (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#12100e] p-1 rounded-xl border border-[#2e2923]">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'assistant', label: 'Research Studio' },
            { id: 'archive', label: 'Archive' },
            { id: 'heritage-3d', label: '3D Explorer' },
            { id: 'diagnostics', label: 'Diagnostics' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab && onSelectTab(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif font-medium transition-all ${
                currentTab === item.id
                  ? 'bg-[#d4af37] text-[#080706] font-bold shadow-xs'
                  : 'text-[#ded6c5] hover:text-[#fcf9f2] hover:bg-[#1a1714]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right: Health Telemetry Pill & Upload Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Health Status Telemetry Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHealthMenu(!showHealthMenu)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border transition-all ${
                healthState.status === 'connected'
                  ? 'bg-[#0d1e17] border-[#3ba87e]/40 text-[#3ba87e] hover:bg-[#122820]'
                  : healthState.status === 'connecting'
                  ? 'bg-[#221c10] border-[#eed27c]/40 text-[#eed27c] hover:bg-[#2c2415]'
                  : 'bg-[#221010] border-[#c53838]/40 text-[#c53838] hover:bg-[#2c1515]'
              }`}
              title="Click for real backend telemetry"
              aria-label={`Backend Status: ${healthState.status}`}
            >
              <span className="relative flex h-2 w-2">
                {healthState.status === 'connected' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3ba87e] opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    healthState.status === 'connected'
                      ? 'bg-[#3ba87e]'
                      : healthState.status === 'connecting'
                      ? 'bg-[#eed27c]'
                      : 'bg-[#c53838]'
                  }`}
                />
              </span>
              <span className="capitalize hidden sm:inline">
                {healthState.status === 'connected' ? 'FastAPI 8000' : healthState.status}
              </span>
              {healthState.latencyMs !== null && (
                <span className="font-mono text-[10px] opacity-80">{healthState.latencyMs}ms</span>
              )}
            </button>

            {/* Health Telemetry Dropdown Card */}
            {showHealthMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#141210] border border-[#2e2923] shadow-2xl p-4 text-xs z-50 animate-in fade-in space-y-3">
                <div className="flex items-center justify-between border-b border-[#2e2923] pb-2">
                  <span className="font-serif font-bold text-[#fcf9f2] flex items-center gap-1.5 font-heritage">
                    <Activity className="w-3.5 h-3.5 text-[#d4af37]" />
                    Backend Telemetry
                  </span>
                  <button
                    type="button"
                    onClick={onRefreshHealth}
                    className="p-1 text-[#9c9282] hover:text-[#d4af37] transition-colors"
                    title="Ping Backend"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-[#9c9282]">
                    <span>Status:</span>
                    <span className="text-[#3ba87e] uppercase">{healthState.status}</span>
                  </div>
                  <div className="flex justify-between text-[#9c9282]">
                    <span>Latency:</span>
                    <span className="text-[#eed27c]">{healthState.latencyMs ?? '—'} ms</span>
                  </div>
                  <div className="flex justify-between text-[#9c9282]">
                    <span>Embedding Model:</span>
                    <span className="text-[#ded6c5]">all-MiniLM-L6-v2</span>
                  </div>
                  <div className="flex justify-between text-[#9c9282]">
                    <span>Hybrid Engine:</span>
                    <span className="text-[#3ba87e]">Dense + SQLite FTS5</span>
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
            <span className="hidden sm:inline">Ingest PDF</span>
            <span className="sm:hidden">Ingest</span>
          </button>
        </div>
      </div>
    </header>
  );
}

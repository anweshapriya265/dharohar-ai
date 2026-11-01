'use client';

import React from 'react';
import {
  Landmark,
  Upload,
  RefreshCw,
  ExternalLink,
  Server,
  Menu,
} from 'lucide-react';
import { HealthCheckState } from '@/lib/api';

interface HeaderProps {
  healthState: HealthCheckState;
  onRefreshHealth: () => void;
  onOpenUpload: () => void;
  onToggleSidebar?: () => void;
}

export default function Header({
  healthState,
  onRefreshHealth,
  onOpenUpload,
  onToggleSidebar,
}: HeaderProps) {
  const [showHealthMenu, setShowHealthMenu] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 dark:border-stone-800 bg-[#faf8f5]/90 dark:bg-[#12100e]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 dark:from-amber-600 dark:to-amber-800 text-amber-50 flex items-center justify-center shadow-sm ring-1 ring-amber-600/30">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 tracking-wide font-heritage">
                  DHAROHAR AI
                </span>
                <span className="hidden sm:inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  धरोहर
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-stone-500 dark:text-stone-400">
                Cultural &amp; Architectural Heritage Archive
              </p>
            </div>
          </div>
        </div>

        {/* Right: Health Indicator + Upload Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Health Status Indicator */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHealthMenu(!showHealthMenu)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                healthState.status === 'connected'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70'
                  : healthState.status === 'connecting'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100/70'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 hover:bg-rose-100/70'
              }`}
              title="Click to view backend health telemetry"
              aria-label={`Backend Status: ${healthState.status}`}
            >
              <span className="relative flex h-2 w-2">
                {healthState.status === 'connected' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                {healthState.status === 'connecting' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    healthState.status === 'connected'
                      ? 'bg-emerald-500'
                      : healthState.status === 'connecting'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
              </span>

              <span className="font-medium capitalize">
                {healthState.status === 'connected'
                  ? 'Connected'
                  : healthState.status === 'connecting'
                  ? 'Connecting...'
                  : 'Connection Failed'}
              </span>

              {healthState.status === 'connected' && healthState.latencyMs !== null && (
                <span className="text-[10px] opacity-75 border-l border-emerald-300 dark:border-emerald-700 pl-1.5 hidden sm:inline">
                  {healthState.latencyMs}ms
                </span>
              )}
            </button>

            {/* Health Telemetry Dropdown */}
            {showHealthMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xl p-4 text-xs z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      Backend Telemetry
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefreshHealth();
                    }}
                    className="p-1 rounded text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                    title="Refresh health check"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="py-3 space-y-2 text-stone-600 dark:text-stone-300">
                  <div className="flex justify-between py-0.5">
                    <span className="text-stone-400">Service:</span>
                    <span className="font-mono font-medium text-stone-800 dark:text-stone-200">
                      {healthState.data?.app || 'DHAROHAR AI Backend'}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-stone-400">Endpoint:</span>
                    <span className="font-mono text-stone-700 dark:text-stone-300 text-[11px]">
                      GET /api/health
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-stone-400">Status:</span>
                    <span
                      className={`font-semibold ${
                        healthState.status === 'connected'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : healthState.status === 'connecting'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {healthState.data?.status || healthState.status}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-stone-400">Version:</span>
                    <span className="font-mono text-stone-700 dark:text-stone-300">
                      {healthState.data?.version || '0.1.0'}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-stone-400">API Gateway:</span>
                    <span className="font-medium text-stone-800 dark:text-stone-200">
                      {healthState.data?.services?.api || (healthState.status === 'connected' ? 'operational' : 'unreachable')}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-stone-400">Storage Service:</span>
                    <span className="font-medium text-stone-800 dark:text-stone-200">
                      {healthState.data?.services?.storage || (healthState.status === 'connected' ? 'initialized' : 'pending')}
                    </span>
                  </div>
                  {healthState.lastChecked && (
                    <div className="flex justify-between py-0.5 pt-1 text-[10px] text-stone-400 border-t border-stone-100 dark:border-stone-800">
                      <span>Last Verified:</span>
                      <span>{new Date(healthState.lastChecked).toLocaleTimeString()}</span>
                    </div>
                  )}
                  {healthState.error && (
                    <div className="mt-2 p-2 rounded bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] leading-relaxed">
                      <strong>Diagnostics:</strong> {healthState.error}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center">
                  <a
                    href="http://localhost:8000/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    Swagger Docs <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowHealthMenu(false)}
                    className="px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 text-[11px]"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Prominent Upload Document Action */}
          <button
            type="button"
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 hover:bg-amber-800 dark:hover:bg-amber-400 text-stone-50 dark:text-stone-950 text-xs sm:text-sm font-medium transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 active:scale-[0.98]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Ingest Document</span>
          </button>
        </div>
      </div>
    </header>
  );
}

'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Terminal,
  Database,
} from 'lucide-react';
import { HealthCheckState, getApiBaseUrl } from '@/lib/api';

interface HealthStatusCardProps {
  healthState: HealthCheckState;
  onRefresh: () => void;
}

export default function HealthStatusCard({ healthState, onRefresh }: HealthStatusCardProps) {
  const [isRetrying, setIsRetrying] = React.useState(false);
  const baseUrl = getApiBaseUrl();

  const handleManualRefresh = async () => {
    setIsRetrying(true);
    await onRefresh();
    setIsRetrying(false);
  };

  return (
    <div className="rounded-xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900/90 p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              healthState.status === 'connected'
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                : healthState.status === 'connecting'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
            }`}
          >
            {healthState.status === 'connected' && <CheckCircle2 className="w-5 h-5" />}
            {healthState.status === 'connecting' && <Loader2 className="w-5 h-5 animate-spin" />}
            {healthState.status === 'error' && <AlertCircle className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Backend System Status
              </h2>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                  healthState.status === 'connected'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : healthState.status === 'connecting'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {healthState.status === 'connected'
                  ? 'Connected'
                  : healthState.status === 'connecting'
                  ? 'Connecting...'
                  : 'Connection Failed'}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Live FastAPI service pinging at{' '}
              <code className="px-1 py-0.5 bg-stone-100 dark:bg-stone-800 rounded font-mono text-[11px]">
                {baseUrl}/api/health
              </code>
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRetrying || healthState.status === 'connecting'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRetrying || healthState.status === 'connecting' ? 'animate-spin' : ''
              }`}
            />
            <span>{isRetrying ? 'Checking...' : 'Ping Health Endpoint'}</span>
          </button>
        </div>
      </div>

      {/* State-specific Body */}
      {healthState.status === 'connected' && healthState.data && (
        <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950/60 border border-stone-200/60 dark:border-stone-800">
            <span className="text-stone-500 text-[11px] block">Application</span>
            <span className="font-semibold text-stone-900 dark:text-stone-100 font-mono mt-0.5 block truncate">
              {healthState.data.app}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950/60 border border-stone-200/60 dark:border-stone-800">
            <span className="text-stone-500 text-[11px] block">API Gateway</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {healthState.data.services.api}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950/60 border border-stone-200/60 dark:border-stone-800">
            <span className="text-stone-500 text-[11px] block">Storage Layer</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200 mt-0.5 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-stone-400" />
              {healthState.data.services.storage}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950/60 border border-stone-200/60 dark:border-stone-800">
            <span className="text-stone-500 text-[11px] block">Roundtrip Latency</span>
            <span className="font-semibold text-stone-900 dark:text-stone-100 font-mono mt-0.5 block">
              {healthState.latencyMs !== null ? `${healthState.latencyMs} ms` : 'N/A'}
            </span>
          </div>
        </div>
      )}

      {healthState.status === 'connecting' && (
        <div className="pt-4 flex items-center gap-3 text-xs text-amber-700 dark:text-amber-300">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
          <span>Attempting handshake with FastAPI backend server at {baseUrl}...</span>
        </div>
      )}

      {healthState.status === 'error' && (
        <div className="pt-4 space-y-3">
          <div className="p-3 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              Backend Connection Unreachable
            </p>
            <p className="text-[11px] leading-relaxed">
              {healthState.error ||
                `Failed to fetch health check from ${baseUrl}/api/health. The backend server might be stopped.`}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 space-y-2">
            <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200 font-medium">
              <Terminal className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>How to launch the backend server:</span>
            </div>
            <div className="font-mono text-[11px] bg-white dark:bg-stone-900 p-2.5 rounded border border-stone-200 dark:border-stone-800 overflow-x-auto select-all">
              cd backend ; .\.venv\Scripts\activate ; uvicorn app.main:app --reload --port 8000
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Once the server starts, click <strong>Ping Health Endpoint</strong> above to establish connection.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

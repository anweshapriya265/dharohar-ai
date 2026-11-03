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
    <div className="rounded-2xl border border-[#2e2923] bg-[#12100e] p-5 sm:p-6 shadow-xl text-[#ded6c5]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#24201a]">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              healthState.status === 'connected'
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80'
                : healthState.status === 'connecting'
                ? 'bg-[#1d1914] text-[#eed27c] border border-[#d4af37]/40'
                : 'bg-rose-950/60 text-rose-400 border border-rose-800/80'
            }`}
          >
            {healthState.status === 'connected' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {healthState.status === 'connecting' && <Loader2 className="w-5 h-5 animate-spin text-[#d4af37]" />}
            {healthState.status === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-serif font-bold text-[#fcf9f2]">
                Backend System Status
              </h2>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                  healthState.status === 'connected'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : healthState.status === 'connecting'
                    ? 'bg-[#1d1914] text-[#eed27c] border border-[#d4af37]/40'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {healthState.status === 'connected'
                  ? 'Connected'
                  : healthState.status === 'connecting'
                  ? 'Connecting...'
                  : 'Connection Failed'}
              </span>
            </div>
            <p className="text-xs text-[#a89f91] mt-0.5 font-serif">
              Live FastAPI service telemetry pinging at{' '}
              <code className="px-1.5 py-0.5 bg-[#1a1714] border border-[#2e2923] text-[#eed27c] rounded font-mono text-[11px]">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#2e2923] bg-[#1a1714] hover:bg-[#25201a] text-[#ded6c5] hover:text-[#eed27c] text-xs font-serif transition-colors disabled:opacity-40"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRetrying || healthState.status === 'connecting' ? 'animate-spin' : ''
              }`}
            />
            <span>{isRetrying ? 'Checking...' : 'Ping Telemetry Endpoint'}</span>
          </button>
        </div>
      </div>

      {/* State-specific Body */}
      {healthState.status === 'connected' && healthState.data && (
        <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#181512] border border-[#24201a]">
            <span className="text-[#a89f91] text-[11px] block font-serif">Application</span>
            <span className="font-semibold text-[#fcf9f2] font-mono mt-0.5 block truncate">
              {healthState.data.app}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#181512] border border-[#24201a]">
            <span className="text-[#a89f91] text-[11px] block font-serif">API Gateway</span>
            <span className="font-semibold text-emerald-400 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {healthState.data.services.api}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#181512] border border-[#24201a]">
            <span className="text-[#a89f91] text-[11px] block font-serif">Storage Layer</span>
            <span className="font-semibold text-[#fcf9f2] mt-0.5 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-[#d4af37]" />
              {healthState.data.services.storage}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#181512] border border-[#24201a]">
            <span className="text-[#a89f91] text-[11px] block font-serif">Roundtrip Latency</span>
            <span className="font-semibold text-[#eed27c] font-mono mt-0.5 block">
              {healthState.latencyMs !== null ? `${healthState.latencyMs} ms` : 'N/A'}
            </span>
          </div>
        </div>
      )}

      {healthState.status === 'connecting' && (
        <div className="pt-4 flex items-center gap-3 text-xs text-[#eed27c] font-serif">
          <Loader2 className="w-4 h-4 animate-spin text-[#d4af37]" />
          <span>Attempting handshake with FastAPI backend service at {baseUrl}...</span>
        </div>
      )}

      {healthState.status === 'error' && (
        <div className="pt-4 space-y-3">
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              Backend Connection Unreachable
            </p>
            <p className="text-[11px] leading-relaxed">
              {healthState.error ||
                `Failed to fetch health check from ${baseUrl}/api/health. The backend server might be stopped.`}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#141210] border border-[#24201a] text-xs text-[#ded6c5] space-y-2">
            <div className="flex items-center gap-2 text-[#fcf9f2] font-serif font-medium">
              <Terminal className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>How to launch the backend server:</span>
            </div>
            <div className="font-mono text-[11px] bg-[#0c0a09] text-[#eed27c] p-2.5 rounded-lg border border-[#2e2923] overflow-x-auto select-all">
              cd backend ; .\.venv\Scripts\activate ; uvicorn app.main:app --reload --port 8000
            </div>
            <p className="text-[11px] text-[#a89f91]">
              Once the server starts, click <strong>Ping Telemetry Endpoint</strong> above to establish connection.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

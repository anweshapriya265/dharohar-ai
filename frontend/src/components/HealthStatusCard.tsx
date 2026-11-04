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
    <div className="rounded-xl border border-[#DED3C2] bg-[#FFFCF5] p-5 sm:p-6 shadow-xs text-[#393331]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE4D8]">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              healthState.status === 'connected'
                ? 'bg-[#EDF3EF] text-[#52745E] border border-[#BCD0C3]'
                : healthState.status === 'connecting'
                ? 'bg-[#FAF4E9] text-[#A67C3F] border border-[#E8D3B2]'
                : 'bg-[#FAEEEE] text-[#A94B43] border border-[#E8BDB9]'
            }`}
          >
            {healthState.status === 'connected' && <CheckCircle2 className="w-5 h-5 text-[#52745E]" />}
            {healthState.status === 'connecting' && <Loader2 className="w-5 h-5 animate-spin text-[#A67C3F]" />}
            {healthState.status === 'error' && <AlertCircle className="w-5 h-5 text-[#A94B43]" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-heritage font-bold text-[#642F38]">
                Backend Service Telemetry
              </h2>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize font-mono ${
                  healthState.status === 'connected'
                    ? 'bg-[#EDF3EF] text-[#52745E] border border-[#BCD0C3]'
                    : healthState.status === 'connecting'
                    ? 'bg-[#FAF4E9] text-[#A67C3F] border border-[#E8D3B2]'
                    : 'bg-[#FAEEEE] text-[#A94B43] border border-[#E8BDB9]'
                }`}
              >
                {healthState.status === 'connected'
                  ? 'Connected'
                  : healthState.status === 'connecting'
                  ? 'Connecting...'
                  : 'Connection Failed'}
              </span>
            </div>
            <p className="text-xs text-[#756D66] mt-0.5 font-serif">
              Live FastAPI service telemetry pinging at{' '}
              <code className="px-1.5 py-0.5 bg-[#EFE8DC] border border-[#DED3C2] text-[#642F38] rounded font-mono text-[11px]">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DED3C2] bg-[#EFE8DC] hover:bg-[#E8E0D2] text-[#393331] text-xs font-serif transition-colors disabled:opacity-40 cursor-pointer"
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
          <div className="p-3 rounded-lg bg-[#F6F1E7] border border-[#DED3C2]">
            <span className="text-[#756D66] text-[11px] block font-serif">Application</span>
            <span className="font-semibold text-[#393331] font-mono mt-0.5 block truncate">
              {healthState.data.app}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#F6F1E7] border border-[#DED3C2]">
            <span className="text-[#756D66] text-[11px] block font-serif">Round-Trip Latency</span>
            <span className="font-semibold text-[#52745E] font-mono mt-0.5 block">
              {healthState.latencyMs !== null ? `${healthState.latencyMs} ms` : '—'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#F6F1E7] border border-[#DED3C2]">
            <span className="text-[#756D66] text-[11px] block font-serif">API Version</span>
            <span className="font-semibold text-[#393331] font-mono mt-0.5 block">
              v{healthState.data.version || '0.2.0'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#F6F1E7] border border-[#DED3C2]">
            <span className="text-[#756D66] text-[11px] block font-serif">Storage Backend</span>
            <span className="font-semibold text-[#52745E] font-mono mt-0.5 block capitalize">
              SQLite WAL Active
            </span>
          </div>
        </div>
      )}

      {healthState.status === 'error' && (
        <div className="pt-4 space-y-3">
          <div className="p-3.5 rounded-lg bg-[#FAEEEE] border border-[#E8BDB9] text-xs text-[#A94B43] space-y-1">
            <span className="font-semibold font-serif">Service Unreachable:</span>
            <p className="font-mono text-[11px]">{healthState.error}</p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#F6F1E7] border border-[#DED3C2] text-xs space-y-2">
            <div className="font-semibold text-[#642F38] flex items-center gap-1.5 font-serif">
              <Terminal className="w-3.5 h-3.5 text-[#642F38]" />
              <span>Diagnostic Steps:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[#59524E] font-serif">
              <li>Ensure the FastAPI server is running on <code className="bg-[#EFE8DC] px-1 rounded text-[#642F38]">http://127.0.0.1:8000</code></li>
              <li>Check terminal output for backend exceptions or missing virtualenv dependencies</li>
              <li>Verify that SQLite database tables were properly created</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

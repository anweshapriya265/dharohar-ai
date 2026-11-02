'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
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

  const isConnected = healthState.status === 'connected';

  return (
    <div className="rounded-2xl border border-[#e5dfd5] bg-white p-5 sm:p-6 shadow-heritage">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isConnected
                ? 'bg-[#edf5f1] text-[#2d5e4a]'
                : healthState.status === 'connecting'
                ? 'bg-[#fbf5eb] text-[#b67322]'
                : 'bg-[#fdf0ee] text-[#a6382a]'
            }`}
          >
            {isConnected && <CheckCircle2 className="w-5 h-5" />}
            {healthState.status === 'connecting' && <Loader2 className="w-5 h-5 animate-spin" />}
            {healthState.status === 'error' && <AlertCircle className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-serif font-bold text-stone-900 font-heritage">
                FastAPI &amp; Machine Learning Subsystem
              </h2>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                  isConnected
                    ? 'bg-[#edf5f1] text-[#2d5e4a] border border-[#c3dcd0]'
                    : healthState.status === 'connecting'
                    ? 'bg-[#fbf5eb] text-[#b67322] border border-[#f0dec3]'
                    : 'bg-[#fdf0ee] text-[#a6382a] border border-[#f4cbc5]'
                }`}
              >
                {isConnected
                  ? 'Active & Grounded'
                  : healthState.status === 'connecting'
                  ? 'Connecting...'
                  : 'Disconnected'}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Live FastAPI service pinging at{' '}
              <code className="px-1.5 py-0.5 bg-[#f7f5f0] border border-[#e5dfd5] rounded font-mono text-[11px] text-stone-800">
                {baseUrl}
              </code>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isRetrying || healthState.status === 'connecting'}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#e5dfd5] hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>Check Status</span>
        </button>
      </div>

      {/* Services breakdown */}
      {isConnected && healthState.data?.services && (
        <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#f7f5f0] border border-[#e5dfd5]">
            <span className="text-[10px] uppercase font-semibold text-stone-400 block">API Gateway</span>
            <span className="font-semibold text-[#2d5e4a] mt-0.5 block capitalize">
              {healthState.data.services.api}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#f7f5f0] border border-[#e5dfd5]">
            <span className="text-[10px] uppercase font-semibold text-stone-400 block">PDF Ingestion</span>
            <span className="font-semibold text-[#2d5e4a] mt-0.5 block capitalize">
              {healthState.data.services.pdf_extraction?.replace('_', ' ')}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#f7f5f0] border border-[#e5dfd5]">
            <span className="text-[10px] uppercase font-semibold text-stone-400 block">Vector Retrieval</span>
            <span className="font-semibold text-[#2d5e4a] mt-0.5 block">
              SentenceTransformers
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#f7f5f0] border border-[#e5dfd5]">
            <span className="text-[10px] uppercase font-semibold text-stone-400 block">Knowledge Store</span>
            <span className="font-semibold text-stone-900 mt-0.5 block">
              SQLite WAL Active
            </span>
          </div>
        </div>
      )}

      {/* Error troubleshooting block */}
      {healthState.status === 'error' && (
        <div className="mt-4 p-4 rounded-xl bg-[#fdf0ee] border border-[#f4cbc5] text-xs space-y-2">
          <div className="font-semibold text-[#a6382a] flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-[#a6382a]" />
            <span>Connection Failure</span>
          </div>
          <p className="text-stone-700 leading-relaxed font-mono text-[11px]">
            {healthState.error}
          </p>
          <div className="pt-2 border-t border-[#f4cbc5] space-y-1 text-stone-600">
            <p className="font-semibold text-stone-800">Resolution Checklist:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
              <li>Ensure the FastAPI backend is running: <code className="bg-white px-1 py-0.5 rounded border border-[#e5dfd5]">cd backend; uvicorn app.main:app --port 8000</code></li>
              <li>Verify CORS settings permit connections from <code className="bg-white px-1 py-0.5 rounded border border-[#e5dfd5]">http://localhost:3000</code></li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

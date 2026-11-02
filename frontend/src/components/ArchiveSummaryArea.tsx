'use client';

import React from 'react';
import {
  BookOpen,
  FileText,
  AlertTriangle,
  Database,
  Eye,
} from 'lucide-react';

interface ArchiveSummaryAreaProps {
  documentCount: number;
  pageCount: number;
  needsOcrCount: number;
  showSampleData: boolean;
  onToggleSampleData: (val: boolean) => void;
  storageStatus?: string;
}

export default function ArchiveSummaryArea({
  documentCount,
  pageCount,
  needsOcrCount,
  showSampleData,
  onToggleSampleData,
  storageStatus = 'initialized',
}: ArchiveSummaryAreaProps) {
  const metrics = [
    {
      id: 'documents',
      title: 'Indexed Monographs',
      actual: documentCount,
      sample: 14,
      unit: 'Documents',
      icon: BookOpen,
      desc: 'ASI gazetteers, surveys & expedition journals',
    },
    {
      id: 'pages',
      title: 'Extracted Folios',
      actual: pageCount,
      sample: 186,
      unit: 'Pages Grounded',
      icon: FileText,
      desc: 'One-based numbered pages with vector embeddings',
    },
    {
      id: 'needs_ocr',
      title: 'Scanned Archival Plates',
      actual: needsOcrCount,
      sample: 4,
      unit: 'Plates Detected',
      icon: AlertTriangle,
      desc: 'Photographic plates routed to OCR engine',
    },
    {
      id: 'storage',
      title: 'Knowledge Store',
      actual: storageStatus === 'initialized' ? 'Online' : 'Standby',
      sample: '100% Operational',
      unit: 'SQLite WAL',
      icon: Database,
      desc: 'Local SQLite WAL repository & 384-dim index',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Bar with title + toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-base font-serif font-bold text-stone-900 font-heritage flex items-center gap-2">
            <span>Archival Knowledge Base Metric Highlights</span>
            <span className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
              {showSampleData ? 'Preview Mode' : 'Live Archive'}
            </span>
          </h2>
          <p className="text-xs text-stone-500">
            {showSampleData
              ? 'Displaying simulated explorer collection metrics'
              : 'Live system stats from persistent local storage'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggleSampleData(!showSampleData)}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e5dfd5] bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-2xs transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-[#9c381e]" />
          <span>{showSampleData ? 'Show Real Metrics' : 'Preview Large Corpus'}</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          const displayVal = showSampleData ? m.sample : m.actual;

          return (
            <div
              key={m.id}
              className="p-4 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-600">{m.title}</span>
                <div className="w-8 h-8 rounded-xl bg-[#fbeee9] text-[#9c381e] flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-2xl font-serif font-bold text-stone-900 font-heritage tracking-tight">
                  {displayVal}
                </div>
                <div className="text-[11px] font-mono text-[#9c381e] font-semibold mt-0.5">
                  {m.unit}
                </div>
                <p className="text-[11px] text-stone-500 mt-1 leading-snug">{m.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

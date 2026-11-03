'use client';

import React from 'react';
import {
  BookOpen,
  FileText,
  AlertTriangle,
  Database,
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
      title: 'Archival Documents',
      actual: documentCount,
      sample: 14,
      unit: 'PDFs in SQLite',
      icon: BookOpen,
      desc: 'Colonial gazetteers, surveys & epigraphical reports',
    },
    {
      id: 'pages',
      title: 'Extracted Pages',
      actual: pageCount,
      sample: 186,
      unit: 'Dual-Paged Records',
      icon: FileText,
      desc: '1-based PDF index & printed book page labels',
    },
    {
      id: 'needs_ocr',
      title: 'Sparse / Scanned Pages',
      actual: needsOcrCount,
      sample: 4,
      unit: 'Flagged for OCR',
      icon: AlertTriangle,
      desc: 'Archival plates & stone inscription photographs',
    },
    {
      id: 'storage',
      title: 'Database Storage',
      actual: storageStatus === 'initialized' ? 'Online' : 'Standby',
      sample: '100% Synchronized',
      unit: 'SQLite WAL & FTS5',
      icon: Database,
      desc: 'Local SQLite tables: documents & document_chunks_fts',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Bar with title + toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm sm:text-base font-serif font-bold text-[#fcf9f2] font-heritage flex items-center gap-2">
            <span>Archive Telemetry Summary</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#181613] text-[#eed27c] border border-[#2e2923]">
              {showSampleData ? 'Preview Schema Mode' : 'Live SQLite Baseline'}
            </span>
          </h2>
          <p className="text-xs text-[#9c9282]">
            {showSampleData
              ? 'Displaying labeled temporary preview schema to preview full archive capacity'
              : 'Authentic metrics verified directly against local backend storage'}
          </p>
        </div>

        {/* Toggle between authentic empty state and labeled sample preview */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-[#ded6c5] bg-[#12100e] px-3 py-1.5 rounded-xl border border-[#2e2923] select-none hover:border-[#3d372f]">
            <input
              type="checkbox"
              checked={showSampleData}
              onChange={(e) => onToggleSampleData(e.target.checked)}
              className="rounded accent-[#d4af37]"
            />
            <span className="font-mono text-[11px]">Preview Full Capacity Schema</span>
          </label>
        </div>
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((item) => {
          const Icon = item.icon;
          const displayVal = showSampleData ? item.sample : item.actual;
          return (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-[#12100e] border border-[#2e2923] hover:border-[#d4af37]/40 shadow-xl transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-[#9c9282] tracking-wider">
                  {item.title}
                </span>
                <div className="p-2 rounded-lg bg-[#1a1714] text-[#eed27c] border border-[#2e2923]">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-2xl font-serif font-bold text-[#fcf9f2] font-heritage">
                  {displayVal}
                </div>
                <div className="text-[10px] font-mono text-[#d4af37] mt-0.5">{item.unit}</div>
              </div>

              <p className="text-[11px] text-[#6e6659] leading-snug pt-2 border-t border-[#1e1b17]">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

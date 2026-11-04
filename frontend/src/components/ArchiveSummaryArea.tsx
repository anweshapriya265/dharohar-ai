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
          <h2 className="text-sm font-heritage font-bold text-[#393331] uppercase tracking-wider flex items-center gap-2">
            <span>Archive Storage Telemetry</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EFE8DC] text-[#642F38] border border-[#DED3C2]">
              {showSampleData ? 'Preview Schema' : 'Live SQLite Baseline'}
            </span>
          </h2>
          <p className="text-xs text-[#756D66] font-serif">
            {showSampleData
              ? 'Displaying labeled temporary schema to preview full archive capacity'
              : 'Authentic metrics verified directly against local backend storage'}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-[#393331] bg-[#FFFCF5] px-3 py-1.5 rounded-lg border border-[#DED3C2] select-none hover:bg-[#F6F1E7]">
            <input
              type="checkbox"
              checked={showSampleData}
              onChange={(e) => onToggleSampleData(e.target.checked)}
              className="rounded accent-[#642F38]"
            />
            <span className="font-mono text-[11px]">Preview Full Schema</span>
          </label>
        </div>
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          const displayValue = showSampleData ? m.sample : m.actual;

          return (
            <div
              key={m.id}
              className="p-4 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs space-y-1.5"
            >
              <div className="flex items-center justify-between text-[#756D66]">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                  {m.title}
                </span>
                <Icon className="w-4 h-4 text-[#A77C54]" />
              </div>

              <div className="text-2xl font-heritage font-bold text-[#642F38]">
                {displayValue}
              </div>

              <div className="text-[11px] font-mono text-[#52745E] font-medium">
                {m.unit}
              </div>

              <p className="text-[11px] text-[#756D66] leading-tight font-serif pt-1 border-t border-[#EBE4D8]">
                {m.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

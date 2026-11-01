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
      title: 'Ingested Documents',
      actual: documentCount,
      sample: 14,
      unit: 'PDFs in SQLite',
      icon: BookOpen,
      desc: 'Colonial gazetteers, surveys & reports in storage',
    },
    {
      id: 'pages',
      title: 'Extracted Pages',
      actual: pageCount,
      sample: 186,
      unit: 'Pages Indexed',
      icon: FileText,
      desc: '1-based page numbered records with text content',
    },
    {
      id: 'needs_ocr',
      title: 'Scanned / Sparse Pages',
      actual: needsOcrCount,
      sample: 4,
      unit: 'Flagged for OCR',
      icon: AlertTriangle,
      desc: 'Plates & photos detected without digital text streams',
    },
    {
      id: 'storage',
      title: 'Archive Database',
      actual: storageStatus === 'initialized' ? 'Online' : 'Standby',
      sample: '100% Verified',
      unit: 'SQLite WAL',
      icon: Database,
      desc: 'Local SQLite tables: documents & document_pages',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Bar with title + toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 font-heritage flex items-center gap-2">
            <span>Archive Summary</span>
            <span className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-full bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {showSampleData ? 'Preview Schema Mode' : 'Live Archive Baseline'}
            </span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {showSampleData
              ? 'Displaying labeled temporary placeholder values to inspect future archive capacity'
              : 'Real counts of documents and pages stored in the local SQLite database'}
          </p>
        </div>

        {/* Toggle between authentic empty state and labeled sample preview */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800/80 px-3 py-1.5 rounded-lg border border-stone-200/80 dark:border-stone-700 select-none">
            <input
              type="checkbox"
              checked={showSampleData}
              onChange={(e) => onToggleSampleData(e.target.checked)}
              className="rounded border-stone-300 text-amber-700 focus:ring-amber-500"
            />
            <Eye className="w-3.5 h-3.5 text-stone-500" />
            <span>Show Sample Schema Preview</span>
          </label>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((item) => {
          const Icon = item.icon;
          const displayVal = showSampleData ? item.sample : item.actual;

          return (
            <div
              key={item.id}
              className="relative p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                  {item.title}
                </span>
                <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                </div>
              </div>

              <div className="my-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-100 font-heritage">
                    {displayVal}
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                    {item.unit}
                  </span>
                </div>

                {showSampleData && (
                  <span className="inline-block mt-1 text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900">
                    [SAMPLE PLACEHOLDER]
                  </span>
                )}
              </div>

              <p className="text-[11px] text-stone-500 dark:text-stone-400 border-t border-stone-100 dark:border-stone-800 pt-2 mt-1">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

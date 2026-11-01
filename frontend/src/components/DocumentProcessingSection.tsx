'use client';

import React from 'react';
import {
  FileCheck2,
  Cpu,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

export default function DocumentProcessingSection() {
  const pipelineStages = [
    {
      step: '01',
      title: 'Multimodal Ingestion',
      description: 'PDF format, %PDF- signature validation & 15 MB streaming limit',
      status: 'Operational',
      statusColor: 'emerald',
      icon: Layers,
      note: 'POST /api/documents/upload',
    },
    {
      step: '02',
      title: 'PyMuPDF Text Extraction',
      description: 'Page-by-page text extraction with 1-based numbering',
      status: 'Operational',
      statusColor: 'emerald',
      icon: Cpu,
      note: 'Active in Python 3.12 backend runtime',
    },
    {
      step: '03',
      title: 'Semantic Vector Embeddings',
      description: 'all-MiniLM-L6-v2 384-dimensional text chunk embeddings',
      status: 'Operational',
      statusColor: 'emerald',
      icon: Sparkles,
      note: 'Persistent in SQLite document_chunks',
    },
    {
      step: '04',
      title: 'Evidence-Grounded Search',
      description: 'Cosine similarity ranking with direct page & document citation',
      status: 'Enforced',
      statusColor: 'emerald',
      icon: FileCheck2,
      note: 'POST /api/search (Zero hallucinations)',
    },
  ];

  return (
    <div className="rounded-xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900/90 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
        <div>
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <span>Archival Processing Pipeline</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              Milestone 3 Active
            </span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Real-time pipeline architecture status for heritage documents and semantic retrieval
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
          <Info className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
          <span>Upload PDFs to automatically extract text &amp; index embeddings</span>
        </div>
      </div>

      {/* Grid of pipeline stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {pipelineStages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.step}
              className="p-3.5 rounded-xl border border-stone-200/70 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="w-7 h-7 rounded-lg bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-mono text-xs font-semibold">
                  {stage.step}
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    stage.statusColor === 'emerald'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : stage.statusColor === 'amber'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {stage.status}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                  <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                    {stage.title}
                  </h3>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
                  {stage.description}
                </p>
              </div>

              <div className="pt-2 border-t border-stone-200/50 dark:border-stone-800 text-[10px] text-stone-500 dark:text-stone-400">
                {stage.note}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

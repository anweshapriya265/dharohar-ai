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
      description: 'PDF, raster plates & field notes streaming validation',
      status: 'Operational',
      statusColor: 'patina',
      icon: Layers,
      note: 'POST /api/documents/upload',
    },
    {
      step: '02',
      title: 'PyMuPDF Folio Extraction',
      description: 'Page-by-page text stream extraction with 1-based numbering',
      status: 'Operational',
      statusColor: 'patina',
      icon: Cpu,
      note: 'Native Python runtime with OCR fallback',
    },
    {
      step: '03',
      title: 'Dense Vector Embeddings',
      description: 'all-MiniLM-L6-v2 384-dimensional text chunk vectors',
      status: 'Operational',
      statusColor: 'patina',
      icon: Sparkles,
      note: 'Stored in SQLite document_chunks',
    },
    {
      step: '04',
      title: 'Evidence-Grounded Search',
      description: 'Cosine ranking with strict page-level evidence attribution',
      status: 'Enforced',
      statusColor: 'patina',
      icon: FileCheck2,
      note: 'Zero-hallucination source grounding',
    },
  ];

  return (
    <div className="rounded-2xl border border-[#e5dfd5] bg-white p-5 shadow-heritage space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
        <div>
          <h2 className="text-sm font-serif font-bold text-stone-900 font-heritage flex items-center gap-2">
            <span>Archival Processing &amp; Verification Pipeline</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-[#edf5f1] text-[#2d5e4a] border border-[#c3dcd0]">
              Active &amp; Grounded
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            End-to-end ingestion pipeline from raw historical scans to verified vector knowledge
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <Info className="w-3.5 h-3.5 text-[#9c381e]" />
          <span>Ingest monographs to automatically extract text &amp; index embeddings</span>
        </div>
      </div>

      {/* Grid of pipeline stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {pipelineStages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.step}
              className="p-3.5 rounded-xl border border-[#e5dfd5] bg-[#f7f5f0]/50 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="w-7 h-7 rounded-lg bg-[#fbeee9] text-[#9c381e] flex items-center justify-center font-mono text-xs font-semibold">
                  {stage.step}
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#edf5f1] text-[#2d5e4a] border border-[#c3dcd0]">
                  {stage.status}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-stone-500" />
                  <h3 className="text-xs font-semibold text-stone-900">
                    {stage.title}
                  </h3>
                </div>
                <p className="text-[11px] text-stone-500 leading-normal">
                  {stage.description}
                </p>
              </div>

              <div className="pt-2 border-t border-stone-200 text-[10px] font-mono text-stone-400">
                {stage.note}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

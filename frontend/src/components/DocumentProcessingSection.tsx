'use client';

import React from 'react';
import {
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function DocumentProcessingSection() {
  const pipelineStages = [
    {
      step: '01',
      title: 'Multimodal Ingestion',
      description: 'PDF format, %PDF- signature validation & streaming upload limit',
      status: 'Operational',
      icon: Layers,
      note: 'POST /api/documents/upload',
    },
    {
      step: '02',
      title: 'OCR & Dual Pagination',
      description: 'PyMuPDF digital stream + Tesseract OCR with printed page labels',
      status: 'Operational',
      icon: Cpu,
      note: 'Dual pagination: PDF index & printed book labels',
    },
    {
      step: '03',
      title: 'Hybrid Indexing',
      description: 'all-MiniLM-L6-v2 (384-dim) vector embeddings + SQLite FTS5 BM25',
      status: 'Calibrated',
      icon: Sparkles,
      note: 'Reciprocal Rank Fusion (RRF k=60)',
    },
    {
      step: '04',
      title: 'Evidence-Grounded AI',
      description: 'Local Ollama llama3.2:3b inference with anti-hallucination verification',
      status: 'Enforced',
      icon: ShieldCheck,
      note: 'POST /api/assistant/ask (Ground-truth citations)',
    },
  ];

  return (
    <div className="rounded-2xl border border-[#2e2923] bg-[#12100e] p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2e2923]">
        <div>
          <h2 className="text-sm font-serif font-bold text-[#fcf9f2] font-heritage flex items-center gap-2">
            <span>Archival Processing &amp; Intelligence Pipeline</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-[#0d1e17] text-[#3ba87e] border border-[#3ba87e]/30">
              Pipeline Active
            </span>
          </h2>
          <p className="text-xs text-[#9c9282] mt-0.5">
            Architecture for archival text extraction, dual pagination, hybrid vector-lexical indexing, and grounded AI.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#eed27c]">
          <Zap className="w-3.5 h-3.5 text-[#d4af37]" />
          <span className="font-mono text-[11px]">Real-time RAG Pipeline</span>
        </div>
      </div>

      {/* Grid of pipeline stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {pipelineStages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.step}
              className="p-4 rounded-xl border border-[#2e2923] bg-[#161411] flex flex-col justify-between space-y-3 hover:border-[#d4af37]/40 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-[#d4af37]">{stage.step}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0d1e17] text-[#3ba87e] border border-[#3ba87e]/25">
                    {stage.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-serif font-semibold text-[#fcf9f2]">
                  <Icon className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                  <span>{stage.title}</span>
                </div>
                <p className="text-[11px] text-[#9c9282] leading-snug">{stage.description}</p>
              </div>

              <div className="pt-2 border-t border-[#24201a] font-mono text-[10px] text-[#6e6659]">
                {stage.note}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

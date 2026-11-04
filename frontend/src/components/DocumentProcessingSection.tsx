'use client';

import React from 'react';
import {
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function DocumentProcessingSection() {
  const pipelineStages = [
    {
      step: '01',
      title: 'Multimodal Ingestion',
      description: 'PDF format, signature validation & streaming upload limit',
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
    <div className="rounded-xl border border-[#DED3C2] bg-[#FFFCF5] p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DED3C2]">
        <div>
          <h2 className="text-sm font-heritage font-bold text-[#393331] uppercase tracking-wider flex items-center gap-2">
            <span>Archival Processing &amp; Intelligence Pipeline</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-[#EDF3EF] text-[#52745E] border border-[#BCD0C3]">
              Pipeline Active
            </span>
          </h2>
          <p className="text-xs text-[#756D66] font-serif mt-0.5">
            Architecture for archival text extraction, dual pagination, hybrid vector-lexical indexing, and grounded AI.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#52745E]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#52745E]" />
          <span className="font-mono text-[11px]">Validated Architecture</span>
        </div>
      </div>

      {/* Grid of pipeline stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {pipelineStages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.step}
              className="p-4 rounded-lg border border-[#DED3C2] bg-[#F6F1E7] flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-[#642F38]">{stage.step}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FFFCF5] text-[#52745E] border border-[#BCD0C3]">
                    {stage.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#A77C54]" />
                  <h3 className="text-xs font-heritage font-bold text-[#393331]">{stage.title}</h3>
                </div>

                <p className="text-[11px] text-[#59524E] leading-relaxed font-serif">
                  {stage.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#DED3C2] text-[10px] font-mono text-[#756D66] truncate">
                {stage.note}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  Box,
} from 'lucide-react';
import { DocumentItem } from '@/lib/api';

interface DigitalArchiveExplorerProps {
  documents: DocumentItem[];
  isLoading: boolean;
  error: string | null;
  onOpenUpload: () => void;
  onViewDocument: (doc: DocumentItem) => void;
  onOpen3DExplorer?: () => void;
}

export default function DigitalArchiveExplorer({
  documents,
  isLoading,
  error,
  onOpenUpload,
  onViewDocument,
  onOpen3DExplorer,
}: DigitalArchiveExplorerProps) {
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'extracted' | 'needs_ocr'>('all');

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        searchFilter.trim() === '' ||
        doc.original_filename.toLowerCase().includes(searchFilter.toLowerCase()) ||
        doc.id.toLowerCase().includes(searchFilter.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'extracted' && doc.extraction_status === 'extracted') ||
        (statusFilter === 'needs_ocr' && doc.extraction_status === 'needs_ocr');

      return matchesSearch && matchesStatus;
    });
  }, [documents, searchFilter, statusFilter]);

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return 'Archival scan';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Explorer Top Banner */}
      <div className="p-6 sm:p-8 rounded-2xl border border-[#2e2923] bg-gradient-to-br from-[#141210] via-[#110f0d] to-[#0a0908] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-serif bg-[#1d1914] border border-[#d4af37]/40 text-[#eed27c]">
            <BookOpen className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Digital Archival Repository &amp; Corpus Explorer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#fcf9f2] font-heritage tracking-tight">
            Archival Document Collection
          </h1>
          <p className="text-sm text-[#ded6c5] leading-relaxed">
            Browse and inspect high-resolution colonial-era archaeological survey reports, gazetteers, and epigraphical
            memoranda with dual pagination, OCR text extraction, and vector index status.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenUpload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b89124] text-[#080706] text-xs font-serif font-semibold shadow-md transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ingest New Archival PDF</span>
            </button>
            {onOpen3DExplorer && (
              <button
                type="button"
                onClick={onOpen3DExplorer}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1a1714] hover:bg-[#221e1a] text-[#eed27c] border border-[#d4af37]/30 text-xs font-mono transition-all"
              >
                <Box className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Open 3D Model Explorer</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-xl bg-[#12100e] border border-[#2e2923] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#9c9282] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter by document title, filename, or ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#181613] border border-[#2e2923] rounded-lg text-[#fcf9f2] placeholder-[#6e6659] focus:outline-none focus:border-[#d4af37]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-[#9c9282] mr-1 hidden sm:inline">Status:</span>
          {(['all', 'extracted', 'needs_ocr'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all ${
                statusFilter === st
                  ? 'bg-[#d4af37] text-[#080706] font-bold shadow-xs'
                  : 'bg-[#181613] border border-[#2e2923] text-[#ded6c5] hover:border-[#3d372f]'
              }`}
            >
              {st === 'all' ? `All (${documents.length})` : st === 'extracted' ? 'Extracted' : 'Needs OCR'}
            </button>
          ))}
        </div>
      </div>

      {/* Document Collection Grid */}
      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-[#12100e] border border-[#2e2923]">
          <div className="w-8 h-8 rounded-full border-2 border-[#d4af37] border-t-transparent animate-spin mx-auto mb-3" />
          <span className="text-xs font-serif text-[#ded6c5] uppercase tracking-wider">
            Loading Archival Collection ...
          </span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-[#1f1212] border border-[#c53838]/40 text-[#fcf9f2] text-xs">
          {error}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#12100e] border border-[#2e2923] space-y-3">
          <BookOpen className="w-10 h-10 text-[#6e6659] mx-auto" />
          <p className="text-sm font-serif text-[#ded6c5]">No documents match the active filter criteria.</p>
          <button
            type="button"
            onClick={() => {
              setSearchFilter('');
              setStatusFilter('all');
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono bg-[#1a1714] border border-[#2e2923] text-[#eed27c]"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-[#141210] border border-[#2e2923] hover:border-[#d4af37]/50 shadow-xl transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Header status pills */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#1d1914] border border-[#d4af37]/30 text-[#eed27c]">
                    PDF Archive
                  </span>

                  {doc.extraction_status === 'extracted' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#3ba87e] bg-[#0d1e17] px-2 py-0.5 rounded border border-[#3ba87e]/30">
                      <CheckCircle2 className="w-3 h-3" />
                      Extracted
                    </span>
                  ) : doc.extraction_status === 'needs_ocr' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#eed27c] bg-[#1e1910] px-2 py-0.5 rounded border border-[#eed27c]/30">
                      <Clock className="w-3 h-3" />
                      Needs OCR
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-[#9c9282]">{doc.extraction_status}</span>
                  )}
                </div>

                {/* Document Title & Filename */}
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#fcf9f2] font-heritage group-hover:text-[#eed27c] transition-colors line-clamp-2">
                    {doc.original_filename.replace('.pdf', '')}
                  </h3>
                  <p className="text-[11px] font-mono text-[#6e6659] mt-0.5 truncate">
                    ID: {doc.id}
                  </p>
                </div>

                {/* Metadata Table */}
                <div className="space-y-1.5 p-3 rounded-xl bg-[#181613] border border-[#2e2923] text-[11px]">
                  <div className="flex justify-between text-[#9c9282]">
                    <span>Page Count:</span>
                    <span className="font-mono text-[#fcf9f2] font-semibold">{doc.page_count || 1} pages</span>
                  </div>
                  <div className="flex justify-between text-[#9c9282]">
                    <span>File Size:</span>
                    <span className="font-mono text-[#ded6c5]">{formatFileSize(doc.file_size)}</span>
                  </div>
                  <div className="flex justify-between text-[#9c9282]">
                    <span>Pagination Mode:</span>
                    <span className="font-mono text-[#3ba87e]">Dual (Printed &amp; PDF)</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-[#2e2923] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onViewDocument(doc)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#d4af37] hover:bg-[#b89124] text-[#080706] text-xs font-serif font-semibold shadow-xs transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Inspect Document</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


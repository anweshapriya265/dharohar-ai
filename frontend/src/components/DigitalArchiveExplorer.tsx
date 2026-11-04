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
  Eye,
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
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Explorer Top Banner */}
      <div className="p-5 sm:p-6 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-block text-[11px] font-mono tracking-wider uppercase text-[#814B52] font-semibold">
              Archival Repository
            </div>
            <h1 className="text-xl sm:text-2xl font-heritage font-bold text-[#642F38] tracking-tight">
              Digital Document Collection
            </h1>
            <p className="text-xs sm:text-sm text-[#59524E] leading-relaxed font-serif">
              Browse and inspect colonial-era archaeological survey reports, gazetteers, and epigraphical
              memoranda with dual pagination, OCR text extraction, and vector index status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] text-xs font-serif font-medium shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ingest Monograph</span>
            </button>
            {onOpen3DExplorer && (
              <button
                type="button"
                onClick={onOpen3DExplorer}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#EFE8DC] hover:bg-[#E8E0D2] text-[#393331] border border-[#DED3C2] text-xs font-serif transition-colors cursor-pointer"
              >
                <Box className="w-3.5 h-3.5 text-[#A77C54]" />
                <span>3D Explorer</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-3.5 rounded-xl bg-[#FFFCF5] border border-[#DED3C2] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#756D66] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter by title, filename, or ID..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FFFCF5] border border-[#DED3C2] rounded-xl text-[#393331] placeholder:text-[#9E958D] font-serif focus:outline-none focus:ring-2 focus:ring-[#642F38]/20 focus:border-[#642F38] shadow-2xs"
          />
        </div>

        {/* Filter Status Pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-[#756D66] mr-1 hidden sm:inline">Status:</span>
          {(['all', 'extracted', 'needs_ocr'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-md text-xs font-mono capitalize transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#642F38] text-[#FFFCF5] font-semibold shadow-xs'
                  : 'bg-[#EFE8DC] border border-[#DED3C2] text-[#393331] hover:bg-[#E8E0D2]'
              }`}
            >
              {st === 'all' ? `All (${documents.length})` : st === 'extracted' ? 'Extracted' : 'Needs OCR'}
            </button>
          ))}
        </div>
      </div>

      {/* Document Management Table */}
      {isLoading ? (
        <div className="p-12 text-center rounded-xl bg-[#FFFCF5] border border-[#DED3C2]">
          <div className="w-6 h-6 rounded-full border-2 border-[#642F38] border-t-transparent animate-spin mx-auto mb-3" />
          <span className="text-xs font-serif text-[#756D66]">
            Loading Archival Collection ...
          </span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-[#FAEEEE] border border-[#E8BDB9] text-[#A94B43] text-xs font-serif">
          {error}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#FFFCF5] border border-[#DED3C2] space-y-3">
          <BookOpen className="w-8 h-8 text-[#A77C54] mx-auto" />
          <p className="text-xs sm:text-sm font-serif text-[#393331]">No documents match the active filter criteria.</p>
          <button
            type="button"
            onClick={() => {
              setSearchFilter('');
              setStatusFilter('all');
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-serif bg-[#EFE8DC] border border-[#DED3C2] text-[#393331] hover:bg-[#E8E0D2] cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#DED3C2] bg-[#F6F1E7] text-[10px] font-mono text-[#756D66] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Document Title</th>
                  <th className="py-3 px-3 font-semibold">Collection</th>
                  <th className="py-3 px-3 font-semibold text-right">Folios</th>
                  <th className="py-3 px-3 font-semibold">File Size</th>
                  <th className="py-3 px-3 font-semibold">Extraction Status</th>
                  <th className="py-3 px-3 font-semibold">Pagination</th>
                  <th className="py-3 px-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE4D8]">
                {filteredDocs.map((doc) => {
                  const isExtracted = doc.extraction_status === 'extracted';
                  const isOCR = doc.extraction_status === 'needs_ocr';

                  return (
                    <tr key={doc.id} className="hover:bg-[#F6F1E7]/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-[#A77C54] shrink-0" />
                          <div className="min-w-0">
                            <span className="font-serif font-bold text-[#393331] text-xs block truncate max-w-xs sm:max-w-md">
                              {doc.original_filename.replace('.pdf', '').replace(/_/g, ' ')}
                            </span>
                            <span className="font-mono text-[10px] text-[#756D66]">
                              ID: {doc.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-serif text-[#59524E]">
                        IITGN Explorer Fellowship
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-[11px] text-[#393331] font-semibold">
                        {doc.page_count ?? 1}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-[#756D66]">
                        {formatFileSize(doc.file_size)}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isExtracted
                              ? 'bg-[#EDF3EF] text-[#52745E] border border-[#BCD0C3]'
                              : isOCR
                              ? 'bg-[#FAF4E9] text-[#A67C3F] border border-[#E8D3B2]'
                              : 'bg-[#EFE8DC] text-[#756D66] border border-[#DED3C2]'
                          }`}
                        >
                          {isExtracted ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          <span className="capitalize">{doc.extraction_status}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[10px] text-[#52745E]">
                        Dual (Printed &amp; PDF)
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onViewDocument(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EFE8DC] hover:bg-[#642F38] text-[#393331] hover:text-[#FFFCF5] font-serif text-xs transition-all duration-150 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

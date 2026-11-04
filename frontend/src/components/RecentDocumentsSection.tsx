'use client';

import React from 'react';
import {
  FileText,
  Upload,
  Eye,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DocumentItem } from '@/lib/api';

interface RecentDocumentsSectionProps {
  documents: DocumentItem[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenUpload: () => void;
  onViewDocument: (doc: DocumentItem) => void;
  showSampleData: boolean;
  searchQuery: string;
  activeFilter: string;
}

export default function RecentDocumentsSection({
  documents,
  isLoading,
  error,
  onRefresh,
  onOpenUpload,
  onViewDocument,
  showSampleData,
  searchQuery,
  activeFilter,
}: RecentDocumentsSectionProps) {
  const filteredLiveDocs = documents.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      doc.original_filename.toLowerCase().includes(query) ||
      doc.id.toLowerCase().includes(query) ||
      doc.extraction_status.toLowerCase().includes(query)
    );
  });

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return 'Archival scan';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-sm font-heritage font-bold text-[#393331] uppercase tracking-wider flex items-center gap-2">
            <span>Recent Archival Monographs</span>
            {showSampleData && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF4E9] text-[#A67C3F] border border-[#E8D3B2]">
                Sample Schema Included
              </span>
            )}
          </h2>
          <p className="text-xs text-[#756D66] font-serif">
            Authentic volumes indexed in SQLite with PyMuPDF page-by-page extraction and dual pagination.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-[#DED3C2] bg-[#FFFCF5] p-12 text-center flex flex-col items-center justify-center gap-2 text-[#756D66]">
          <Loader2 className="w-5 h-5 animate-spin text-[#642F38]" />
          <span className="text-xs font-serif">Fetching archival repository records...</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-[#E8BDB9] bg-[#FAEEEE] p-4 text-xs text-[#A94B43] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#A94B43] shrink-0" />
            <span>Failed to load documents: {error}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="px-2.5 py-1 rounded bg-[#FFFCF5] text-[#A94B43] font-medium border border-[#E8BDB9] hover:bg-[#F6F1E7] transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#DED3C2] bg-[#FFFCF5] p-8 text-center space-y-3">
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-heritage font-bold text-[#393331]">
              No Documents Ingested
            </h3>
            <p className="text-xs text-[#756D66] font-serif leading-relaxed">
              Upload a colonial gazetteer, architectural survey, or epigraphical report in PDF format to index.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] text-xs font-serif transition-colors cursor-pointer shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload PDF Monograph</span>
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
                  <th className="py-3 px-3 font-semibold">Extraction</th>
                  <th className="py-3 px-3 font-semibold">Date Ingested</th>
                  <th className="py-3 px-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE4D8]">
                {filteredLiveDocs.map((doc) => {
                  const isExtracted = doc.extraction_status === 'extracted';
                  const isOCR = doc.extraction_status === 'ocr';

                  return (
                    <tr key={doc.id} className="hover:bg-[#F6F1E7]/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-[#A77C54] shrink-0" />
                          <div className="min-w-0">
                            <span className="font-serif font-bold text-[#393331] text-xs block truncate max-w-xs sm:max-w-md">
                              {doc.original_filename.replace(/_/g, ' ')}
                            </span>
                            <span className="font-mono text-[10px] text-[#756D66]">
                              ID: {doc.id} · {formatFileSize(doc.file_size)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-serif text-[#59524E]">
                        IITGN Explorer Archive
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[11px] text-[#393331] font-semibold">
                        {doc.page_count ?? '—'}
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
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{doc.extraction_status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#756D66]">
                        {doc.upload_timestamp
                          ? new Date(doc.upload_timestamp).toLocaleDateString([], {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Historical archive'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onViewDocument(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#EFE8DC] hover:bg-[#642F38] text-[#393331] hover:text-[#FFFCF5] font-serif text-xs transition-colors cursor-pointer"
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

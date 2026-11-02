'use client';

import React from 'react';
import {
  Scroll,
  Upload,
  Eye,
  AlertCircle,
  Loader2,
  FileText,
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

interface SampleHeritageRecord {
  id: string;
  title: string;
  provenance: string;
  year: string;
  type: 'gazetteer' | 'blueprint' | 'epigraphy' | 'survey';
  scriptOrLanguage: string;
  citationAnchor: string;
  coordinates: string;
  confidenceScore: string;
  summary: string;
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
  // Filter live documents
  const filteredLiveDocs = documents.filter((doc) => {
    if (activeFilter !== 'all' && activeFilter !== 'gazetteer') {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      doc.original_filename.toLowerCase().includes(query) ||
      doc.id.toLowerCase().includes(query) ||
      doc.extraction_status.toLowerCase().includes(query)
    );
  });

  // Labeled sample records for previewing the schema format
  const sampleRecords: SampleHeritageRecord[] = [
    {
      id: 'SAMPLE-GZ-1876',
      title: 'Archaeological Survey of Western India, Vol. IV',
      provenance: 'Bombay Presidency Records / British Library Collection',
      year: '1876 CE',
      type: 'gazetteer',
      scriptOrLanguage: 'English / Colonial Typography',
      citationAnchor: 'pp. 142-148, § 14 (Ellora Rock-Cut Caves)',
      coordinates: '20.0268° N, 75.1793° E',
      confidenceScore: '100% Page Veracity',
      summary:
        'Detailed architectural measurements and historical field documentation of Cave 16 (Kailasa) detailing monolith carving techniques.',
    },
    {
      id: 'SAMPLE-BP-1908',
      title: 'Kailasa Temple Ground Plan & Monolithic Section Elevation',
      provenance: 'Superintendent of Archaeological Survey of India (ASI Archives)',
      year: '1908 CE',
      type: 'blueprint',
      scriptOrLanguage: 'Architectural Plate / Orthographic Scale 1:200',
      citationAnchor: 'Plate XLVIII, Fig. 3 (Nandi Mandapa & Vimana Base)',
      coordinates: '20.0268° N, 75.1793° E',
      confidenceScore: 'Georeferenced to CAD Bounds',
      summary:
        'High-resolution architectural section delineating sikhara elevation, circumambulatory pradakshina path, and subsidiary river goddess shrines.',
    },
  ];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-serif font-bold text-stone-900 font-heritage flex items-center gap-2">
            <span>Ingested Heritage Documents</span>
            {documents.length > 0 && (
              <span className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-full bg-[#edf5f1] text-[#2d5e4a] border border-[#c3dcd0]">
                {documents.length} live {documents.length === 1 ? 'file' : 'files'}
              </span>
            )}
            {showSampleData && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#fbeee9] text-[#9c381e] border border-[#f0d4ca]">
                [SAMPLE SCHEMA PREVIEW INCLUDED]
              </span>
            )}
          </h2>
          <p className="text-xs text-stone-500">
            Real monographs stored in SQLite with page-by-page text extracted and vectorized
          </p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="rounded-2xl border border-[#e5dfd5] bg-white p-12 text-center flex flex-col items-center justify-center gap-2 text-stone-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#9c381e]" />
          <span className="text-xs">Fetching ingested archive records...</span>
        </div>
      ) : error ? (
        /* Error state */
        <div className="rounded-2xl border border-[#f4cbc5] bg-[#fdf0ee] p-4 text-xs text-[#a6382a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#a6382a] shrink-0" />
            <span>Failed to load documents: {error}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="px-2.5 py-1 rounded bg-white text-[#a6382a] border border-[#f4cbc5] font-semibold hover:bg-stone-50 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : documents.length === 0 && !showSampleData ? (
        /* Empty State */
        <div className="rounded-2xl border-2 border-dashed border-[#e5dfd5] bg-white p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#fbeee9] text-[#9c381e] flex items-center justify-center ring-1 ring-[#f0d4ca]">
            <Scroll className="w-7 h-7" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-serif font-bold text-stone-900 font-heritage">
              No Archival Documents Ingested Yet
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Upload historical PDF gazetteers, ASI excavation reports, or field survey monographs to extract page-by-page text and enable vector retrieval.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#9c381e] hover:bg-[#832e17] text-[#f7f5f0] text-xs font-semibold shadow-2xs transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload First Monograph</span>
          </button>
        </div>
      ) : (
        /* Grid of Live Document Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLiveDocs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl border border-[#e5dfd5] bg-white p-5 shadow-heritage hover:border-[#9c381e]/60 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#fbeee9] text-[#9c381e] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#edf5f1] text-[#2d5e4a] border border-[#c3dcd0] font-semibold">
                    Extracted (PyMuPDF)
                  </span>
                </div>

                <div>
                  <h3
                    className="font-serif font-bold text-sm sm:text-base text-stone-900 font-heritage line-clamp-1"
                    title={doc.original_filename}
                  >
                    {doc.original_filename}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                    ID: {doc.id.slice(0, 16)}...
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                  <div className="p-2 rounded-lg bg-[#f7f5f0] border border-[#e5dfd5]">
                    <span className="text-stone-400 block text-[9px] uppercase font-semibold">Pages</span>
                    <span className="font-semibold text-stone-900">{doc.page_count} Pages</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#f7f5f0] border border-[#e5dfd5]">
                    <span className="text-stone-400 block text-[9px] uppercase font-semibold">File Size</span>
                    <span className="font-semibold text-stone-900">{formatFileSize(doc.file_size)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[10px] text-stone-400 font-mono">
                  {new Date(doc.upload_timestamp).toLocaleDateString()}
                </span>

                <button
                  type="button"
                  onClick={() => onViewDocument(doc)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f7f5f0] hover:bg-[#fbeee9] text-stone-700 hover:text-[#9c381e] text-xs font-semibold transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Folios</span>
                </button>
              </div>
            </div>
          ))}

          {/* Sample records in preview mode */}
          {showSampleData &&
            sampleRecords.map((sample) => (
              <div
                key={sample.id}
                className="rounded-2xl border border-dashed border-[#b67322]/40 bg-[#fbf5eb]/30 p-5 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-[#fbf5eb] text-[#b67322] border border-[#f0dec3] font-semibold text-[10px]">
                    Schema Preview
                  </span>
                  <span className="font-mono text-[10px] text-stone-400">{sample.id}</span>
                </div>

                <h3 className="font-serif font-bold text-sm text-stone-900 font-heritage">
                  {sample.title}
                </h3>
                <p className="text-xs text-stone-600 line-clamp-2 font-serif">
                  {sample.summary}
                </p>

                <div className="text-[11px] text-stone-500 font-mono">
                  Citation Anchor: {sample.citationAnchor}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import {
  Scroll,
  Upload,
  Calendar,
  FileCheck,
  Eye,
  AlertCircle,
  Loader2,
  HardDrive,
  FileText,
  AlertTriangle,
  Scan,
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
      // In milestone 2 all uploads are PDFs / documents
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
          <h2 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 font-heritage flex items-center gap-2">
            <span>Ingested Cultural Records</span>
            {documents.length > 0 && (
              <span className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {documents.length} live {documents.length === 1 ? 'file' : 'files'}
              </span>
            )}
            {showSampleData && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                [SAMPLE SCHEMA PREVIEW INCLUDED]
              </span>
            )}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Real documents stored in SQLite with page-by-page text extracted via PyMuPDF
          </p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-900/40 p-12 text-center flex flex-col items-center justify-center gap-2 text-stone-500">
          <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
          <span className="text-xs">Fetching ingested archive records...</span>
        </div>
      ) : error ? (
        /* Error state */
        <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 p-4 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Failed to load documents: {error}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-medium hover:bg-rose-200 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : documents.length === 0 && !showSampleData ? (
        /* Empty State */
        <div className="rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/40 p-8 sm:p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 flex items-center justify-center ring-1 ring-amber-200 dark:ring-amber-800/50">
            <Scroll className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 font-heritage">
              No Cultural Records Ingested Yet
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Upload a colonial gazetteer, architectural survey, or epigraphical report in PDF format.
              The backend will extract page-level text using PyMuPDF and index it in the local SQLite database.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload PDF Document</span>
            </button>
          </div>
        </div>
      ) : (
        /* Document Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Live documents */}
          {filteredLiveDocs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-amber-400/80 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium text-[11px]">
                    <FileText className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                    <span>PDF Document</span>
                  </span>

                  <span className="text-[10px] font-mono text-stone-400">
                    {doc.id}
                  </span>
                </div>

                <h3
                  className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 leading-snug font-heritage line-clamp-2"
                  title={doc.original_filename}
                >
                  {doc.original_filename}
                </h3>
              </div>

              {/* Metadata */}
              <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-stone-400 shrink-0" />
                    <span>Uploaded:</span>
                  </span>
                  <span>{new Date(doc.upload_timestamp).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3 h-3 text-stone-400 shrink-0" />
                    <span>File Size:</span>
                  </span>
                  <span className="font-mono">{formatFileSize(doc.file_size)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Page Count:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200 font-mono">
                    {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
                  </span>
                </div>

                <div className="pt-1">
                  {doc.extraction_status === 'extracted' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <FileCheck className="w-3 h-3 text-emerald-600" />
                      <span>Extracted (Digital)</span>
                    </span>
                  ) : doc.extraction_status === 'ocr' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      <Scan className="w-3 h-3 text-sky-600" />
                      <span>OCR Extracted (Tesseract)</span>
                    </span>
                  ) : doc.extraction_status === 'hybrid' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                      <Sparkles className="w-3 h-3 text-violet-600" />
                      <span>Hybrid (PyMuPDF + OCR)</span>
                    </span>
                  ) : doc.extraction_status === 'ocr_failed' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      <span>OCR Failed</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>Scanned / Requires OCR</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onViewDocument(doc)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/70 text-stone-700 hover:text-amber-900 dark:text-stone-300 dark:hover:text-amber-200 text-xs font-medium transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Extracted Text</span>
                </button>
              </div>
            </div>
          ))}

          {/* If Sample Preview toggle is enabled, render the sample items */}
          {showSampleData &&
            sampleRecords.map((sample) => (
              <div
                key={sample.id}
                className="rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10 p-4 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      [SAMPLE PREVIEW]
                    </span>
                    <span className="text-[10px] font-mono text-stone-400">{sample.id}</span>
                  </div>

                  <h3 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 leading-snug font-heritage line-clamp-2">
                    {sample.title}
                  </h3>

                  <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed">
                    {sample.summary}
                  </p>
                </div>

                <div className="space-y-1 pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-stone-400 shrink-0" />
                    <span>Period: {sample.year}</span>
                  </div>
                  <div className="font-mono text-[10px] text-amber-800 dark:text-amber-300">
                    Citation: {sample.citationAnchor}
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-[10px] text-stone-400 italic">
                  Sample schema mockup for upcoming collections
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

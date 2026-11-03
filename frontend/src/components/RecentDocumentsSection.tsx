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
      scriptOrLanguage: 'Architectural Drafting Notes / English',
      citationAnchor: 'Plate XLVIII, Drawing 3 (Ground Section)',
      coordinates: '20.0268° N, 75.1793° E',
      confidenceScore: 'High Structural Precision',
      summary:
        'High-resolution measured elevation showing monolithic Dhwajastambha pillars, Nandi pavilion bridges, and main vimana sanctuary.',
    },
    {
      id: 'SAMPLE-EP-1881',
      title: 'Inscriptions from the Cave-Temples of Western India',
      provenance: 'Burgess & Indraji Archival Survey (1881)',
      year: '1881 CE',
      type: 'epigraphy',
      scriptOrLanguage: 'Sanskrit / Prakrit in Brahmi Script',
      citationAnchor: 'pp. 4-10, Inscription No. 2 (Kuda Cisterns)',
      coordinates: '18.2833° N, 73.0833° E',
      confidenceScore: 'Epigraphical Ground Truth',
      summary:
        'Epigraphical transliteration and translation of charitable rock-cut donations including the two cisterns: podhio be 2 deya dhamam.',
    },
  ];

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return 'Archival scan';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-base font-serif font-bold text-[#fcf9f2] font-heritage flex items-center gap-2">
            <span>Recent Ingested Heritage Documents</span>
            {showSampleData && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1f1910] text-[#eed27c] border border-[#d4af37]/40">
                [SAMPLE SCHEMA PREVIEW INCLUDED]
              </span>
            )}
          </h2>
          <p className="text-xs text-[#9c9282]">
            Real documents stored in SQLite with page-by-page text extracted via PyMuPDF and dual pagination.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-[#2e2923] bg-[#12100e] p-12 text-center flex flex-col items-center justify-center gap-2 text-[#9c9282]">
          <Loader2 className="w-6 h-6 animate-spin text-[#d4af37]" />
          <span className="text-xs font-serif">Fetching ingested archive records...</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[#c53838]/40 bg-[#221010] p-4 text-xs text-[#c53838] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#c53838] shrink-0" />
            <span>Failed to load documents: {error}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="px-2.5 py-1 rounded bg-[#2e1515] text-[#eed27c] font-medium hover:bg-[#3d1c1c] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : documents.length === 0 && !showSampleData ? (
        <div className="rounded-2xl border-2 border-dashed border-[#2e2923] bg-[#12100e] p-8 sm:p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#1a1714] text-[#d4af37] flex items-center justify-center ring-1 ring-[#d4af37]/30">
            <Scroll className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-serif font-bold text-[#fcf9f2] font-heritage">
              No Cultural Records Ingested Yet
            </h3>
            <p className="text-xs text-[#9c9282] leading-relaxed">
              Upload a colonial gazetteer, architectural survey, or epigraphical report in PDF format.
              The backend will extract page-level text using PyMuPDF and index it in the local SQLite database.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b89124] text-[#080706] text-xs sm:text-sm font-serif font-semibold transition-all shadow-md"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload PDF Document</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLiveDocs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl border border-[#2e2923] bg-[#141210] p-5 shadow-xl flex flex-col justify-between space-y-3 hover:border-[#d4af37]/60 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#1d1914] text-[#eed27c] font-medium text-[11px] border border-[#d4af37]/30">
                    <FileText className="w-3 h-3 text-[#d4af37]" />
                    <span>PDF Document</span>
                  </span>

                  <span className="text-[10px] font-mono text-[#6e6659]">
                    {doc.id}
                  </span>
                </div>

                <h3
                  className="text-sm font-serif font-bold text-[#fcf9f2] leading-snug font-heritage line-clamp-2"
                  title={doc.original_filename}
                >
                  {doc.original_filename}
                </h3>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#24201a] text-[11px] text-[#9c9282]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-[#6e6659] shrink-0" />
                    <span>Uploaded:</span>
                  </span>
                  <span className="text-[#ded6c5]">{new Date(doc.upload_timestamp).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3 h-3 text-[#6e6659] shrink-0" />
                    <span>File Size:</span>
                  </span>
                  <span className="font-mono text-[#ded6c5]">{formatFileSize(doc.file_size)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Page Count:</span>
                  <span className="font-semibold text-[#eed27c] font-mono">
                    {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
                  </span>
                </div>

                <div className="pt-1">
                  {doc.extraction_status === 'extracted' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0d1e17] text-[#3ba87e] border border-[#3ba87e]/30">
                      <FileCheck className="w-3 h-3" />
                      <span>Extracted (Digital)</span>
                    </span>
                  ) : doc.extraction_status === 'ocr' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#101b22] text-[#3ba0c5] border border-[#3ba0c5]/30">
                      <Scan className="w-3 h-3" />
                      <span>OCR Extracted</span>
                    </span>
                  ) : doc.extraction_status === 'hybrid' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1b1424] text-[#a074d6] border border-[#a074d6]/30">
                      <Sparkles className="w-3 h-3" />
                      <span>Hybrid (PyMuPDF + OCR)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1e1910] text-[#eed27c] border border-[#eed27c]/30">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Scanned / Requires OCR</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-[#24201a]">
                <button
                  type="button"
                  onClick={() => onViewDocument(doc)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1a1714] hover:bg-[#25211b] text-[#eed27c] text-xs font-serif font-medium border border-[#2e2923] transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Extracted Text</span>
                </button>
              </div>
            </div>
          ))}

          {showSampleData &&
            sampleRecords.map((sample) => (
              <div
                key={sample.id}
                className="rounded-2xl border border-dashed border-[#d4af37]/40 bg-[#161411]/60 p-5 shadow-xl flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1f1910] text-[#eed27c] border border-[#d4af37]/30">
                      [SAMPLE PREVIEW]
                    </span>
                    <span className="text-[10px] font-mono text-[#6e6659]">{sample.id}</span>
                  </div>

                  <h3 className="text-sm font-serif font-bold text-[#fcf9f2] leading-snug font-heritage line-clamp-2">
                    {sample.title}
                  </h3>

                  <p className="text-xs text-[#ded6c5] line-clamp-2 leading-relaxed">
                    {sample.summary}
                  </p>
                </div>

                <div className="space-y-1 pt-2 border-t border-[#24201a] text-[11px] text-[#9c9282]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-[#6e6659] shrink-0" />
                    <span>Period: {sample.year}</span>
                  </div>
                  <div className="font-mono text-[10px] text-[#eed27c]">
                    Citation: {sample.citationAnchor}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#24201a] text-[10px] text-[#6e6659] italic">
                  Sample schema preview for upcoming collections
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

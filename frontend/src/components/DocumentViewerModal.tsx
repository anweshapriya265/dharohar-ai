'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Scan,
} from 'lucide-react';
import { DocumentItem, DocumentPage, fetchDocumentPages } from '@/lib/api';

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  initialPageNumber?: number;
  onClose: () => void;
}

export default function DocumentViewerModal({
  document,
  initialPageNumber,
  onClose,
}: DocumentViewerModalProps) {
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (document) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [document, onClose]);

  // Fetch pages when document changes
  useEffect(() => {
    if (!document) return;

    let isMounted = true;
    fetchDocumentPages(document.id)
      .then((res) => {
        if (!isMounted) return;
        setPages(res.pages);
        setIsLoading(false);
        setError(null);
        if (initialPageNumber) {
          const targetIndex = res.pages.findIndex(
            (p) => p.page_number === initialPageNumber
          );
          setActivePageIndex(targetIndex >= 0 ? targetIndex : 0);
        } else {
          setActivePageIndex(0);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load document pages');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [document, initialPageNumber]);

  if (!document) return null;

  const currentPage = pages[activePageIndex];

  const handleCopyText = () => {
    if (!currentPage || !currentPage.text) return;
    navigator.clipboard.writeText(currentPage.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-stone-200 dark:border-stone-800 bg-[#faf8f5] dark:bg-stone-900 shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="viewer-modal-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 bg-white/70 dark:bg-stone-950/40">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h2
                id="viewer-modal-title"
                className="text-sm sm:text-base font-serif font-bold text-stone-900 dark:text-stone-100 font-heritage truncate"
                title={document.original_filename}
              >
                {document.original_filename}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                <span className="font-mono text-[11px] text-stone-400">{document.id}</span>
                <span>•</span>
                <span>{document.page_count} {document.page_count === 1 ? 'page' : 'pages'}</span>
                <span>•</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    document.extraction_status === 'extracted'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : document.extraction_status === 'ocr'
                      ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                      : document.extraction_status === 'hybrid'
                      ? 'bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}
                >
                  {document.extraction_status === 'extracted'
                    ? 'Extracted (Digital PyMuPDF)'
                    : document.extraction_status === 'ocr'
                    ? 'Extracted (Tesseract OCR)'
                    : document.extraction_status === 'hybrid'
                    ? 'Hybrid (PyMuPDF + OCR)'
                    : 'Requires OCR (Scanned / Sparse)'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors shrink-0"
            aria-label="Close document viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-500">
              <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
              <p className="text-xs">Loading extracted pages from database...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300">
              <p className="font-semibold">Error Loading Pages</p>
              <p className="mt-1">{error}</p>
            </div>
          ) : pages.length === 0 ? (
            <div className="py-16 text-center text-xs text-stone-500">
              No page records found for this document.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pagination controls & Page info */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-stone-100/80 dark:bg-stone-950/60 border border-stone-200/60 dark:border-stone-800 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                    disabled={activePageIndex === 0}
                    className="p-1.5 rounded-lg bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 disabled:opacity-40 hover:bg-stone-50 transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="font-medium text-stone-800 dark:text-stone-200 font-mono">
                    Page {currentPage?.page_number} of {pages.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                    disabled={activePageIndex === pages.length - 1}
                    className="p-1.5 rounded-lg bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 disabled:opacity-40 hover:bg-stone-50 transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Page Stats & Citation Anchor */}
                <div className="flex flex-wrap items-center gap-3 text-stone-500 dark:text-stone-400 text-[11px]">
                  <span>{currentPage?.character_count || 0} characters</span>
                  <span>•</span>
                  <span>{currentPage?.word_count || 0} words</span>
                  <span className="hidden sm:inline">•</span>
                  <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100/70 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 font-mono text-[10px]">
                    <ShieldCheck className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                    <span>Citation: [{document.id} · p.{currentPage?.page_number}]</span>
                  </div>
                </div>

                {/* Copy Page Text Button */}
                <button
                  type="button"
                  onClick={handleCopyText}
                  disabled={!currentPage?.text}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 transition-colors text-xs font-medium disabled:opacity-50"
                  title="Copy extracted text to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>

              {/* Page-level extraction status notification */}
              {currentPage?.extraction_status === 'ocr_extracted' && (
                <div className="p-3 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2">
                  <Scan className="w-4 h-4 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">OCR Extracted Page:</span>
                    <span className="ml-1 opacity-90">
                      Page {currentPage.page_number} was recognized via Tesseract OCR at 300 DPI from a scanned plate or raster image.
                    </span>
                  </div>
                </div>
              )}

              {currentPage?.extraction_status === 'ocr_failed' && (
                <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">OCR Processing Issue:</span>
                    <span className="ml-1 opacity-90">
                      Optical character recognition was attempted for Page {currentPage.page_number} but encountered an error or yielded no recognized characters.
                    </span>
                  </div>
                </div>
              )}

              {currentPage?.extraction_status === 'needs_ocr' && (
                <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Sparse / Scanned Page:</span>
                    <span className="ml-1 opacity-90">
                      Page {currentPage.page_number} contains little or no text. It may be a blank plate, architectural photograph, or blueprint without recognized typography.
                    </span>
                  </div>
                </div>
              )}

              {/* Text Container */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-4 sm:p-6 shadow-inner min-h-[300px]">
                {currentPage?.text ? (
                  <pre className="font-mono text-xs sm:text-[13px] leading-relaxed text-stone-800 dark:text-stone-200 whitespace-pre-wrap font-normal selection:bg-amber-200 dark:selection:bg-amber-900">
                    {currentPage.text}
                  </pre>
                ) : (
                  <div className="py-20 text-center space-y-2 text-stone-400">
                    <p className="text-xs italic">No digital text stream found on this page.</p>
                    <p className="text-[11px] text-stone-500">
                      (Page contains photographs, blueprints, or scanned raster plates)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-950/40 flex items-center justify-between text-xs text-stone-500">
          <span className="font-mono text-[11px]">DHAROHAR Evidence Protocol (Milestone 3)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

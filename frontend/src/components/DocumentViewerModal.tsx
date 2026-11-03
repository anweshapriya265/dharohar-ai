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
  const [prevInitialPage, setPrevInitialPage] = useState<number | undefined>(initialPageNumber);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Synchronize page index during render when initialPageNumber prop changes
  if (initialPageNumber !== prevInitialPage) {
    setPrevInitialPage(initialPageNumber);
    if (pages.length > 0 && initialPageNumber) {
      const targetIndex = pages.findIndex(
        (p) => (p.pdf_page_index ?? p.page_number) === initialPageNumber || p.page_number === initialPageNumber
      );
      if (targetIndex >= 0) {
        setActivePageIndex(targetIndex);
      }
    }
  }

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
            (p) => (p.pdf_page_index ?? p.page_number) === initialPageNumber || p.page_number === initialPageNumber
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-[#2e2923] bg-[#0c0a09] shadow-2xl overflow-hidden text-[#fcf9f2]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="viewer-modal-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#24201a] flex items-center justify-between gap-3 bg-[#12100e]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#1d1914] border border-[#d4af37]/40 text-[#eed27c] flex items-center justify-center shrink-0 shadow-inner">
              <FileText className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div className="overflow-hidden">
              <h2
                id="viewer-modal-title"
                className="text-sm sm:text-base font-serif font-bold text-[#fcf9f2] font-heritage truncate"
                title={document.original_filename}
              >
                {document.original_filename}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#a89f91] mt-0.5">
                <span className="font-mono text-[11px] text-[#eed27c]/80">{document.id}</span>
                <span>•</span>
                <span>{document.page_count} {document.page_count === 1 ? 'page' : 'pages'}</span>
                <span>•</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    document.extraction_status === 'extracted'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                      : document.extraction_status === 'ocr'
                      ? 'bg-sky-950/80 text-sky-300 border-sky-800/80'
                      : document.extraction_status === 'hybrid'
                      ? 'bg-violet-950/80 text-violet-300 border-violet-800/80'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800/80'
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
            className="p-1.5 rounded-lg text-[#a89f91] hover:text-[#fcf9f2] hover:bg-[#1d1914] border border-transparent hover:border-[#383127] transition-colors shrink-0"
            aria-label="Close document viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#0c0a09]">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#a89f91]">
              <Loader2 className="w-6 h-6 animate-spin text-[#d4af37]" />
              <p className="text-xs font-serif">Loading extracted pages from database...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300">
              <p className="font-semibold">Error Loading Pages</p>
              <p className="mt-1">{error}</p>
            </div>
          ) : pages.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#a89f91]">
              No page records found for this document.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pagination controls & Page info */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#141210] border border-[#24201a] text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                    disabled={activePageIndex === 0}
                    className="p-1.5 rounded-lg bg-[#1a1714] text-[#ded6c5] border border-[#2e2923] disabled:opacity-30 hover:bg-[#25201a] hover:text-[#eed27c] transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="font-medium text-[#fcf9f2] font-mono">
                    PDF Page {currentPage?.pdf_page_index ?? currentPage?.page_number} of {pages.length}
                  </span>

                  {currentPage?.printed_page_label ? (
                    <span className="font-medium text-[#eed27c] font-serif px-2.5 py-0.5 rounded bg-[#1e1913] border border-[#d4af37]/50 text-[11px] shadow-xs">
                      Printed page {currentPage.printed_page_label}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#a89f91] italic px-2 py-0.5 rounded bg-[#181512] border border-[#24201a]">
                      Printed page unavailable
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                    disabled={activePageIndex === pages.length - 1}
                    className="p-1.5 rounded-lg bg-[#1a1714] text-[#ded6c5] border border-[#2e2923] disabled:opacity-30 hover:bg-[#25201a] hover:text-[#eed27c] transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Page Stats & Citation Anchor */}
                <div className="flex flex-wrap items-center gap-3 text-[#a89f91] text-[11px]">
                  <span>{currentPage?.character_count || 0} characters</span>
                  <span>•</span>
                  <span>{currentPage?.word_count || 0} words</span>
                  <span className="hidden sm:inline">•</span>
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1a1714] border border-[#d4af37]/30 text-[#eed27c] font-mono text-[10px]">
                    <ShieldCheck className="w-3 h-3 text-[#d4af37]" />
                    <span>
                      Citation: [{document.original_filename} · {currentPage?.printed_page_label ? `Printed p. ${currentPage.printed_page_label} · PDF p. ${currentPage.pdf_page_index ?? currentPage.page_number}` : `PDF p. ${currentPage?.pdf_page_index ?? currentPage?.page_number} · Printed unavailable`}]
                    </span>
                  </div>
                </div>

                {/* Copy Page Text Button */}
                <button
                  type="button"
                  onClick={handleCopyText}
                  disabled={!currentPage?.text}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1d1914] border border-[#383127] text-[#ded6c5] hover:text-[#eed27c] hover:border-[#d4af37]/40 hover:bg-[#24201a] transition-colors text-xs font-medium disabled:opacity-40"
                  title="Copy extracted text to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#d4af37]" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>

              {/* Page-level extraction status notification */}
              {currentPage?.extraction_status === 'ocr_extracted' && (
                <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/60 text-xs text-sky-200 flex items-start gap-2">
                  <Scan className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">OCR Extracted Page:</span>
                    <span className="ml-1 opacity-90">
                      Page {currentPage.page_number} was recognized via Tesseract OCR at 300 DPI from a scanned plate or raster image.
                    </span>
                  </div>
                </div>
              )}

              {currentPage?.extraction_status === 'ocr_failed' && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">OCR Processing Issue:</span>
                    <span className="ml-1 opacity-90">
                      Optical character recognition was attempted for Page {currentPage.page_number} but encountered an error or yielded no recognized characters.
                    </span>
                  </div>
                </div>
              )}

              {currentPage?.extraction_status === 'needs_ocr' && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-900/60 text-xs text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Sparse / Scanned Page:</span>
                    <span className="ml-1 opacity-90">
                      Page {currentPage.page_number} contains little or no text. It may be a blank plate, architectural photograph, or blueprint without recognized typography.
                    </span>
                  </div>
                </div>
              )}

              {/* Text Container */}
              <div className="rounded-xl border border-[#24201a] bg-[#12100e] p-4 sm:p-6 shadow-inner min-h-[300px]">
                {currentPage?.text ? (
                  <pre className="font-serif text-xs sm:text-sm leading-relaxed text-[#fcf9f2] whitespace-pre-wrap font-heritage tracking-normal selection:bg-[#d4af37]/30 selection:text-[#fcf9f2]">
                    {currentPage.text}
                  </pre>
                ) : (
                  <div className="py-20 text-center space-y-2 text-[#a89f91]">
                    <p className="text-xs italic">No digital text stream found on this page.</p>
                    <p className="text-[11px] text-[#786e64]">
                      (Page contains photographs, blueprints, or scanned raster plates)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-[#24201a] bg-[#12100e] flex items-center justify-between text-xs text-[#a89f91]">
          <span className="font-mono text-[11px] text-[#eed27c]/80">DHAROHAR Evidence Protocol (Dual Pagination Verified)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#1d1914] border border-[#2e2923] hover:border-[#d4af37]/40 text-[#ded6c5] hover:text-[#fcf9f2] font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

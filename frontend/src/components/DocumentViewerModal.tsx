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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#393331]/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-[#DED3C2] bg-[#FFFCF5] shadow-2xl overflow-hidden text-[#393331]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="viewer-modal-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#DED3C2] flex items-center justify-between gap-3 bg-[#F6F1E7]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#FFFCF5] border border-[#DED3C2] text-[#642F38] flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5 text-[#642F38]" />
            </div>
            <div className="overflow-hidden">
              <h2
                id="viewer-modal-title"
                className="text-sm sm:text-base font-serif font-bold text-[#642F38] font-heritage truncate"
                title={document.original_filename}
              >
                {document.original_filename}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#756D66] mt-0.5">
                <span className="font-mono text-[11px] text-[#A77C54] font-medium">{document.id}</span>
                <span>•</span>
                <span>{document.page_count} {document.page_count === 1 ? 'page' : 'pages'}</span>
                <span>•</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    document.extraction_status === 'extracted'
                      ? 'bg-[#F0F5F2] text-[#52745E] border-[#D2DFD6]'
                      : document.extraction_status === 'ocr'
                      ? 'bg-[#F0F4F8] text-[#3D698E] border-[#C8D6E5]'
                      : document.extraction_status === 'hybrid'
                      ? 'bg-[#F5F0F8] text-[#6B4F82] border-[#DACFE5]'
                      : 'bg-[#FFF9EE] text-[#A67C3F] border-[#E8DCB8]'
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
            className="p-1.5 rounded-lg text-[#756D66] hover:text-[#393331] hover:bg-[#F0EAE1] transition-colors shrink-0"
            aria-label="Close document viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FFFCF5]">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#756D66]">
              <Loader2 className="w-6 h-6 animate-spin text-[#642F38]" />
              <p className="text-xs font-serif text-[#756D66]">Loading extracted pages from database...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-[#FDF2F2] border border-[#F5C2C0] text-xs text-[#A94B43]">
              <p className="font-semibold">Error Loading Pages</p>
              <p className="mt-1">{error}</p>
            </div>
          ) : pages.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#756D66]">
              No page records found for this document.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pagination controls & Page info */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#F6F1E7] border border-[#DED3C2] text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                    disabled={activePageIndex === 0}
                    className="p-1.5 rounded-lg bg-[#FFFCF5] text-[#393331] border border-[#DED3C2] disabled:opacity-30 hover:bg-[#F0EAE1] hover:text-[#642F38] transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="font-medium text-[#393331] font-mono">
                    PDF Page {currentPage?.pdf_page_index ?? currentPage?.page_number} of {pages.length}
                  </span>

                  {currentPage?.printed_page_label ? (
                    <span className="font-medium text-[#642F38] font-serif px-2.5 py-0.5 rounded bg-[#FFFCF5] border border-[#DED3C2] text-[11px] shadow-xs">
                      Printed page {currentPage.printed_page_label}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#756D66] italic px-2 py-0.5 rounded bg-[#F0EAE1] border border-[#DED3C2]">
                      Printed page unavailable
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                    disabled={activePageIndex === pages.length - 1}
                    className="p-1.5 rounded-lg bg-[#FFFCF5] text-[#393331] border border-[#DED3C2] disabled:opacity-30 hover:bg-[#F0EAE1] hover:text-[#642F38] transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Page Stats & Citation Anchor */}
                <div className="flex flex-wrap items-center gap-3 text-[#756D66] text-[11px]">
                  <span>{currentPage?.character_count || 0} characters</span>
                  <span>•</span>
                  <span>{currentPage?.word_count || 0} words</span>
                  <span className="hidden sm:inline">•</span>
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FFFCF5] border border-[#DED3C2] text-[#642F38] font-mono text-[10px]">
                    <ShieldCheck className="w-3 h-3 text-[#52745E]" />
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFCF5] border border-[#DED3C2] text-[#393331] hover:text-[#642F38] hover:border-[#642F38]/40 hover:bg-[#F0EAE1] transition-colors text-xs font-medium disabled:opacity-40"
                  title="Copy extracted text to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#52745E]" /> : <Copy className="w-3.5 h-3.5 text-[#642F38]" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>

              {/* Page-level extraction status notification */}
              {currentPage?.extraction_status === 'ocr_extracted' && (
                <div className="p-3 rounded-xl bg-[#F0F4F8] border border-[#C8D6E5] text-xs text-[#3D698E] flex items-start gap-2">
                  <Scan className="w-4 h-4 text-[#3D698E] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">OCR Extracted Page:</span>
                    <span className="ml-1 opacity-90">
                      Page {currentPage.page_number} was recognized via Tesseract OCR at 300 DPI from a scanned plate or raster image.
                    </span>
                  </div>
                </div>
              )}

              {currentPage?.extraction_status === 'ocr_failed' && (
                <div className="p-3 rounded-xl bg-[#FDF2F2] border border-[#F5C2C0] text-xs text-[#A94B43] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#A94B43] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">OCR Processing Issue:</span>
                    <span className="ml-1 opacity-90">
                      Optical character recognition was attempted for Page {currentPage.page_number} but encountered an error or yielded no recognized characters.
                    </span>
                  </div>
                </div>
              )}

              {currentPage?.extraction_status === 'needs_ocr' && (
                <div className="p-3 rounded-xl bg-[#FFF9EE] border border-[#E8DCB8] text-xs text-[#A67C3F] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#A67C3F] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Sparse / Scanned Page:</span>
                    <span className="ml-1 opacity-90">
                      Page {currentPage.page_number} contains little or no text. It may be a blank plate, architectural photograph, or blueprint without recognized typography.
                    </span>
                  </div>
                </div>
              )}

              {/* Text Container */}
              <div className="rounded-xl border border-[#DED3C2] bg-[#FAF6EE] p-4 sm:p-6 shadow-inner min-h-[300px]">
                {currentPage?.text ? (
                  <pre className="font-serif text-xs sm:text-sm leading-relaxed text-[#393331] whitespace-pre-wrap font-heritage tracking-normal selection:bg-[#642F38]/15 selection:text-[#393331]">
                    {currentPage.text}
                  </pre>
                ) : (
                  <div className="py-20 text-center space-y-2 text-[#a89f91]">
                    <p className="text-xs italic">No digital text stream found on this page.</p>
                    <p className="text-[11px] text-[#A77C54]">
                      (Page contains photographs, blueprints, or scanned raster plates)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-[#DED3C2] bg-[#F6F1E7] flex items-center justify-between text-xs text-[#756D66]">
          <span className="font-mono text-[11px] text-[#A77C54]">DHAROHAR Evidence Protocol (Dual Pagination Verified)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#FFFCF5] border border-[#DED3C2] hover:border-[#642F38]/40 text-[#393331] hover:text-[#642F38] font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

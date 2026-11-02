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
  Loader2,
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
          if (targetIndex !== -1) {
            setActivePageIndex(targetIndex);
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Failed to load document pages';
        setError(msg);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [document, initialPageNumber]);

  const currentPage = pages[activePageIndex];

  const handleCopyText = async () => {
    if (!currentPage?.text) return;
    try {
      await navigator.clipboard.writeText(currentPage.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage-md overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="viewer-modal-title"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-100 bg-[#f7f5f0] gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#fbeee9] text-[#9c381e] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h2
                id="viewer-modal-title"
                className="text-sm sm:text-base font-serif font-bold text-stone-900 font-heritage truncate"
                title={document.original_filename}
              >
                {document.original_filename}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-0.5">
                <span className="font-mono text-[11px] text-stone-400">{document.id}</span>
                <span>•</span>
                <span>{document.page_count} {document.page_count === 1 ? 'page' : 'pages'}</span>
                <span>•</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#edf5f1] text-[#2d5e4a] border border-[#c3dcd0]">
                  Grounded Citation Active
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0"
            aria-label="Close document viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-500">
              <Loader2 className="w-6 h-6 animate-spin text-[#9c381e]" />
              <p className="text-xs">Loading extracted pages from database...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-[#fdf0ee] border border-[#f4cbc5] text-xs text-[#a6382a]">
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
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#f7f5f0] border border-[#e5dfd5] text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                    disabled={activePageIndex === 0}
                    className="p-1.5 rounded-lg bg-white text-stone-700 border border-[#e5dfd5] disabled:opacity-40 hover:bg-stone-50 transition-colors shadow-2xs"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="font-semibold text-stone-800 font-mono">
                    Page {currentPage?.page_number} of {pages.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                    disabled={activePageIndex === pages.length - 1}
                    className="p-1.5 rounded-lg bg-white text-stone-700 border border-[#e5dfd5] disabled:opacity-40 hover:bg-stone-50 transition-colors shadow-2xs"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Citation Anchor */}
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fbeee9] border border-[#f0d4ca] text-[#9c381e] font-mono text-[10px] font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Exact Anchor: [{document.id} · p.{currentPage?.page_number}]</span>
                </div>

                {/* Copy Page Text Button */}
                <button
                  type="button"
                  onClick={handleCopyText}
                  disabled={!currentPage?.text}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-[#e5dfd5] text-stone-700 hover:text-stone-900 transition-colors text-xs font-semibold shadow-2xs disabled:opacity-50"
                  title="Copy extracted text to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#2d5e4a]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>

              {/* Text Container */}
              <div className="rounded-xl border border-[#e5dfd5] bg-[#f7f5f0]/40 p-5 sm:p-6 min-h-[300px]">
                {currentPage?.text ? (
                  <pre className="font-serif text-xs sm:text-[13px] leading-relaxed text-stone-800 whitespace-pre-wrap font-normal selection:bg-[#fbeee9]">
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
        <div className="p-3 sm:p-4 border-t border-stone-100 bg-[#f7f5f0] flex items-center justify-between text-xs text-stone-500">
          <span className="font-mono text-[11px]">DHAROHAR Strict Evidence Protocol</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-[#e5dfd5] text-stone-700 font-semibold hover:bg-stone-50 transition-colors shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

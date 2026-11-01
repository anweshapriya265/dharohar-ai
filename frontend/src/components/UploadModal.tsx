'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Eye,
} from 'lucide-react';
import { DocumentItem, uploadDocument } from '@/lib/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (doc: DocumentItem) => void;
  onViewDocument?: (doc: DocumentItem) => void;
}

export default function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  onViewDocument,
}: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<DocumentItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset modal state when opened/closed
  const handleClose = useCallback(() => {
    if (isUploading) return;
    setSelectedFile(null);
    setError(null);
    setUploadedDoc(null);
    onClose();
  }, [isUploading, onClose]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading) {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isUploading, handleClose]);

  const validateAndSetFile = (file: File) => {
    setError(null);
    setUploadedDoc(null);

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError(`Unsupported format: '${file.name}'. Only PDF (.pdf) files are supported.`);
      return;
    }

    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`File size (${sizeMb} MB) exceeds the maximum allowed limit of 15 MB.`);
      return;
    }

    if (file.size === 0) {
      setError('Cannot upload an empty file (0 bytes).');
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmitUpload = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setError(null);

    try {
      const doc = await uploadDocument(selectedFile);
      setUploadedDoc(doc);
      onUploadSuccess(doc);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during upload';
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl border border-stone-200 dark:border-stone-800 bg-[#faf8f5] dark:bg-stone-900 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-800 text-white flex items-center justify-center shadow-xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="upload-modal-title"
                className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 font-heritage"
              >
                Ingest Heritage PDF Document
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Milestone 2 Ingestion &amp; PyMuPDF Text Extraction
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {uploadedDoc ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Document Ingestion Successful!</span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                The document has been stored and text extracted page-by-page into the SQLite archive database.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/60 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                <span className="text-stone-400">Filename:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate max-w-[240px]">
                  {uploadedDoc.original_filename}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                <span className="text-stone-400">Document ID:</span>
                <span className="font-mono text-stone-700 dark:text-stone-300">
                  {uploadedDoc.id}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                <span className="text-stone-400">Pages Processed:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {uploadedDoc.page_count} {uploadedDoc.page_count === 1 ? 'page' : 'pages'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-400">Extraction Status:</span>
                <span
                  className={`font-semibold capitalize ${
                    uploadedDoc.extraction_status === 'extracted'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {uploadedDoc.extraction_status === 'extracted'
                    ? 'Extracted (PyMuPDF)'
                    : 'Requires OCR (Sparse / Scanned)'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setUploadedDoc(null);
                  setSelectedFile(null);
                }}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium transition-colors"
              >
                Upload Another
              </button>
              {onViewDocument && (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onViewDocument(uploadedDoc);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <Eye className="w-4 h-4" />
                  <span>Inspect Extracted Text</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Upload Form */
          <div className="space-y-4">
            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/40'
                  : selectedFile
                  ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-stone-300 dark:border-stone-700 bg-stone-100/50 dark:bg-stone-950/40 hover:border-amber-700'
              }`}
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center mb-3">
                <FileText className="w-6 h-6" />
              </div>

              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate max-w-sm mx-auto">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-stone-500 font-mono">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for ingestion
                  </p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 pt-1">
                    Click or drop to replace file
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Click to browse or drop historical PDF here
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Maximum upload size: 15 MB • PDF files with signature validation
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Evidence Policy Reminder */}
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>PyMuPDF extracts text page-by-page. Scanned plates are flagged for OCR.</span>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-200/50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitUpload}
                disabled={!selectedFile || isUploading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting Text...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Ingest &amp; Extract PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

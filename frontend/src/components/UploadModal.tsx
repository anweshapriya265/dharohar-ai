'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { DocumentItem, uploadDocument, uploadUnifiedAsset } from '@/lib/api';

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
  onViewDocument: _onViewDocument,
}: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<DocumentItem | null>(null);

  // Known metadata context
  const [title, setTitle] = useState<string>('');
  const [region, setRegion] = useState<string>('Gujarat');
  const [heritageType, setHeritageType] = useState<string>('Stepwell / Baoli');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    if (isUploading) return;
    setSelectedFile(null);
    setError(null);
    setUploadedDoc(null);
    setTitle('');
    onClose();
  }, [isUploading, onClose]);

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

    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.txt'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setError(`Unsupported format: '${file.name}'. Supported: PDF, JPG, PNG, WEBP, TXT.`);
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
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
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
      if (selectedFile.name.toLowerCase().endsWith('.pdf')) {
        const doc = await uploadDocument(selectedFile);
        setUploadedDoc(doc);
        onUploadSuccess(doc);
      } else {
        // Upload images or TXT notes to unified records pipeline
        const res = await uploadUnifiedAsset(selectedFile, {
          title,
          region,
          heritage_type: heritageType,
          source_attribution: 'IITGN Explorer Fellowship Fieldwork',
        });

        const docAdapter: DocumentItem = {
          id: res.record.id,
          original_filename: res.record.original_filename || selectedFile.name,
          file_size: res.record.file_size || selectedFile.size,
          content_type: selectedFile.type || 'text/plain',
          upload_timestamp: res.record.created_at,
          processing_status: 'completed',
          extraction_status: 'extracted',
          page_count: 1,
          storage_reference: res.record.storage_path || `${res.record.id}`,
          created_at: res.record.created_at,
          updated_at: res.record.updated_at,
        };

        setUploadedDoc(docAdapter);
        onUploadSuccess(docAdapter);
      }
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
        className="w-full max-w-lg rounded-2xl border border-stone-200 dark:border-stone-800 bg-[#faf8f5] dark:bg-stone-900 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
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
                Ingest Cultural Heritage Asset
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Unified Ingestion: PDFs, Architectural Photos &amp; Field Notes (SRS 7.2)
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
                <span>Ingestion &amp; AI Analysis Successful!</span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                The asset has been indexed and queued in the curator review workspace.
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
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg bg-stone-900 dark:bg-stone-100 hover:bg-amber-800 text-stone-50 dark:text-stone-900 font-medium text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Upload Form */
          <div className="space-y-4">
            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/30'
                  : selectedFile
                  ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-stone-300 dark:border-stone-700 hover:border-amber-500 bg-white dark:bg-stone-950/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>

                {selectedFile ? (
                  <div>
                    <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                      {selectedFile.name}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      Drag &amp; drop field document or click to browse
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      Accepts PDF, JPG, PNG, WEBP, and TXT field notes (up to 15 MB)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Context Fields */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-stone-600 dark:text-stone-400 mb-1">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200"
                >
                  <option value="Gujarat">Gujarat (IITGN Local)</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Karnataka">Karnataka</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 dark:text-stone-400 mb-1">Typology</label>
                <select
                  value={heritageType}
                  onChange={(e) => setHeritageType(e.target.value)}
                  className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200"
                >
                  <option value="Stepwell / Baoli">Stepwell / Baoli</option>
                  <option value="Temple">Temple / Kund</option>
                  <option value="Fort">Hill Fort</option>
                  <option value="Monolithic Rock-Cut Temple">Rock-Cut Cave</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                className="px-3.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs hover:bg-stone-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitUpload}
                disabled={!selectedFile || isUploading}
                className="px-4 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting &amp; Indexing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ingest &amp; Extract</span>
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

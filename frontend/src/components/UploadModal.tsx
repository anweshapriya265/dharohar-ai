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

  // Metadata context
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

  // Quick helper to test with a pre-created text note
  const handleLoadSampleNote = () => {
    const content = `IIT Gandhinagar Explorer Fellowship - Adalaj Stepwell (Rudabai Vav) Field Journal
Coordinates: 23.1667° N, 72.5833° E (Gandhinagar District, Gujarat)
Dynasty: Vaghela / Solanki Transition under Queen Rudabai, completed 1498 CE.
Architectural Observation:
The stepwell extends downwards across five descending storeys. Each subterranean pavilion level exhibits square mandapas with intricately carved Solanki pillars, rosette ceilings, and friezes of musicians, dancers, and royal processions.
The octagonal well shaft provides direct downward solar illumination while keeping subterranean temperatures approximately 5 degrees cooler than the ambient surface ground.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'iitgn_adalaj_field_notes.txt', { type: 'text/plain' });
    setTitle('Adalaj Stepwell Field Expedition Notes');
    setRegion('Gujarat');
    setHeritageType('Stepwell / Baoli');
    validateAndSetFile(file);
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
        const res = await uploadUnifiedAsset(selectedFile, {
          title: title || selectedFile.name,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage-md p-6 space-y-4 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#9c381e] text-[#f7f5f0] flex items-center justify-center shadow-2xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="upload-modal-title"
                className="text-base font-serif font-bold text-stone-900 font-heritage"
              >
                Contribute Cultural Heritage Asset
              </h2>
              <p className="text-xs text-stone-500">
                PDF Monographs, Scanned Plates, Field Notes &amp; Photos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {uploadedDoc ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-[#edf5f1] border border-[#c3dcd0] space-y-2">
              <div className="flex items-center gap-2 text-[#2d5e4a] font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-[#2d5e4a]" />
                <span>Asset Successfully Ingested &amp; Vectorized!</span>
              </div>
              <p className="text-xs text-[#2d5e4a]/90 leading-relaxed">
                Text extracted and indexed into 384-dimensional dense vectors. Record queued in the curator review workspace.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#e5dfd5] bg-[#f7f5f0] space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-stone-200">
                <span className="text-stone-500">Document Name:</span>
                <span className="font-semibold text-stone-900 truncate max-w-[240px]">
                  {uploadedDoc.original_filename}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-200">
                <span className="text-stone-500">Extracted Pages:</span>
                <span className="font-mono text-stone-800">{uploadedDoc.page_count}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-500">Search Grounding:</span>
                <span className="font-semibold text-[#2d5e4a]">Ready for Semantic Search</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-[#9c381e] hover:bg-[#832e17] text-[#f7f5f0] text-xs font-semibold shadow-2xs transition-colors"
            >
              Done &amp; Return to Archive
            </button>
          </div>
        ) : (
          /* Upload Form */
          <div className="space-y-4">
            {/* Metadata Context Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-stone-600 font-semibold block">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full p-2 rounded-lg border border-[#e5dfd5] bg-[#f7f5f0] text-stone-800 font-medium focus:outline-hidden"
                >
                  <option value="Gujarat">Gujarat</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-600 font-semibold block">Typology</label>
                <select
                  value={heritageType}
                  onChange={(e) => setHeritageType(e.target.value)}
                  className="w-full p-2 rounded-lg border border-[#e5dfd5] bg-[#f7f5f0] text-stone-800 font-medium focus:outline-hidden"
                >
                  <option value="Stepwell / Baoli">Stepwell (Baoli)</option>
                  <option value="Temple">Temple</option>
                  <option value="Monolithic Rock-Cut Temple">Monolithic Rock-Cut Temple</option>
                  <option value="Fortified Medieval City">Medieval Fort / City</option>
                </select>
              </div>
            </div>

            {/* Drag & Drop Target */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#9c381e] bg-[#fbeee9]'
                  : selectedFile
                  ? 'border-[#2d5e4a] bg-[#edf5f1]'
                  : 'border-[#e5dfd5] bg-[#f7f5f0]/60 hover:bg-[#f7f5f0] hover:border-stone-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center space-y-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedFile
                      ? 'bg-[#edf5f1] text-[#2d5e4a]'
                      : 'bg-[#fbeee9] text-[#9c381e]'
                  }`}
                >
                  {selectedFile ? <FileText className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                </div>

                {selectedFile ? (
                  <div>
                    <p className="text-xs font-semibold text-stone-900 truncate max-w-xs mx-auto">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-stone-500 font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Ready to ingest
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-stone-800">
                      Click to choose or drag &amp; drop file here
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      PDF monographs, architectural photographs (JPG/PNG), or TXT field notes up to 15 MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Sample Note Seeder for fast test */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-stone-400 font-medium">Testing quickly?</span>
              <button
                type="button"
                onClick={handleLoadSampleNote}
                className="inline-flex items-center gap-1.5 text-[#9c381e] hover:underline font-semibold text-[11px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample IITGN Adalaj Field Notes</span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-[#fdf0ee] border border-[#f4cbc5] text-xs text-[#a6382a] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl border border-[#e5dfd5] text-stone-600 hover:bg-stone-50 text-xs font-medium transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitUpload}
                disabled={!selectedFile || isUploading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#9c381e] hover:bg-[#832e17] text-[#f7f5f0] text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing &amp; Vectorizing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload &amp; Revitalize</span>
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

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
  ShieldCheck,
  Eye,
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
  onViewDocument,
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#393331]/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl border border-[#DED3C2] bg-[#FFFCF5] text-[#393331] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 relative z-10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#DED3C2]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F6F1E7] border border-[#DED3C2] text-[#642F38] flex items-center justify-center shadow-xs">
              <Upload className="w-4 h-4 text-[#642F38]" />
            </div>
            <div>
              <h2
                id="upload-modal-title"
                className="text-base font-serif font-bold text-[#642F38] font-heritage"
              >
                Contribute Cultural Heritage Asset
              </h2>
              <p className="text-xs text-[#756D66]">
                PDF Monographs, Scanned Plates, Field Notes &amp; Photographs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-[#756D66] hover:text-[#393331] hover:bg-[#F0EAE1] transition-colors disabled:opacity-40"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {uploadedDoc ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-[#F0F5F2] border border-[#D2DFD6] space-y-2">
              <div className="flex items-center gap-2 text-[#52745E] font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-[#52745E]" />
                <span>Asset Successfully Ingested &amp; Indexed!</span>
              </div>
              <p className="text-xs text-[#52745E]/90 leading-relaxed font-serif">
                Text extracted and indexed into the SQLite archive repository. Grounded retrieval and dual pagination ready.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#DED3C2] bg-[#F6F1E7] space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#DED3C2]">
                <span className="text-[#756D66]">Filename:</span>
                <span className="font-semibold text-[#393331] truncate max-w-[240px]">
                  {uploadedDoc.original_filename}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#DED3C2]">
                <span className="text-[#756D66]">Document ID:</span>
                <span className="font-mono text-[#642F38] font-medium">
                  {uploadedDoc.id}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#DED3C2]">
                <span className="text-[#756D66]">Pages Processed:</span>
                <span className="font-semibold text-[#393331]">
                  {uploadedDoc.page_count} {uploadedDoc.page_count === 1 ? 'page' : 'pages'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#756D66]">Extraction Status:</span>
                <span
                  className={`font-semibold capitalize ${
                    uploadedDoc.extraction_status === 'extracted'
                      ? 'text-[#52745E]'
                      : 'text-[#A67C3F]'
                  }`}
                >
                  {uploadedDoc.extraction_status === 'extracted'
                    ? 'Extracted (PyMuPDF / Text)'
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
                className="px-4 py-2 rounded-xl border border-[#DED3C2] hover:bg-[#F0EAE1] text-[#393331] text-xs font-medium transition-colors"
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#642F38] text-[#FFFCF5] font-semibold text-xs shadow-xs hover:bg-[#814B52] transition-all"
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
            {/* Metadata Context Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[#393331] font-semibold block">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full p-2 rounded-lg border border-[#DED3C2] bg-[#FFFCF5] text-[#393331] font-medium focus:border-[#642F38] focus:outline-hidden"
                >
                  <option value="Gujarat">Gujarat</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[#393331] font-semibold block">Typology</label>
                <select
                  value={heritageType}
                  onChange={(e) => setHeritageType(e.target.value)}
                  className="w-full p-2 rounded-lg border border-[#DED3C2] bg-[#FFFCF5] text-[#393331] font-medium focus:border-[#642F38] focus:outline-hidden"
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
                  ? 'border-[#642F38] bg-[#F0EAE1]'
                  : selectedFile
                  ? 'border-[#52745E] bg-[#F0F5F2]'
                  : 'border-[#DED3C2] bg-[#F6F1E7] hover:border-[#642F38]/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-12 h-12 mx-auto rounded-xl bg-[#FFFCF5] border border-[#DED3C2] text-[#642F38] flex items-center justify-center mb-3 shadow-xs">
                <FileText className="w-6 h-6 text-[#642F38]" />
              </div>

              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#393331] truncate max-w-sm mx-auto font-serif">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-[#642F38] font-mono font-medium">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for ingestion
                  </p>
                  <p className="text-[10px] text-[#756D66] pt-1">
                    Click or drop to replace file
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#393331] font-serif">
                    Click to browse or drop historical PDF / field notes here
                  </p>
                  <p className="text-[11px] text-[#756D66]">
                    Maximum upload size: 15 MB • PDF monographs, JPG/PNG plates, TXT notes
                  </p>
                  <p className="text-[10px] text-[#A77C54] italic">
                    Tip: For rapid testing, use the 10-page monographs in test_dataset/samples/ or sample data
                  </p>
                </div>
              )}
            </div>

            {/* Quick Sample Note Seeder for fast test */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[#756D66] font-medium">Testing quickly?</span>
              <button
                type="button"
                onClick={handleLoadSampleNote}
                className="inline-flex items-center gap-1.5 text-[#642F38] hover:underline font-semibold text-[11px]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#A77C54]" />
                <span>Load Sample IITGN Adalaj Field Notes</span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-[#FDF2F2] border border-[#F5C2C0] text-xs text-[#A94B43] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#A94B43] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Evidence Policy Reminder */}
            <div className="flex items-center gap-2 text-[#756D66] text-xs font-serif">
              <ShieldCheck className="w-4 h-4 text-[#52745E] shrink-0" />
              <span>PyMuPDF extracts text page-by-page. Scanned plates are flagged for OCR.</span>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#DED3C2] flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl border border-[#DED3C2] hover:bg-[#F0EAE1] text-[#756D66] hover:text-[#393331] text-xs font-medium transition-colors disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitUpload}
                disabled={!selectedFile || isUploading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#642F38] text-[#FFFCF5] text-xs font-semibold shadow-xs hover:bg-[#814B52] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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

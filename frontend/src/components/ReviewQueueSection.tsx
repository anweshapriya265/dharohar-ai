'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  FileText,
  MessageSquare,
  RefreshCw,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  fetchHeritageRecords,
  fetchHeritageRecordDetail,
  reviewHeritageRecord,
  HeritageRecordItem,
  AiSuggestionItem,
} from '@/lib/api';

export default function ReviewQueueSection() {
  const [records, setRecords] = useState<HeritageRecordItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRecord, setSelectedRecord] = useState<HeritageRecordItem | null>(null);
  const [suggestions, setSuggestions] = useState<AiSuggestionItem[]>([]);
  const [reviewerComment, setReviewerComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadPendingRecords = async () => {
    setLoading(true);
    try {
      const res = await fetchHeritageRecords('all', 'all', 'all');
      setRecords(res.records || []);
      if (res.records && res.records.length > 0 && !selectedRecord) {
        loadRecordDetails(res.records[0].id);
      }
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecordDetails = async (id: string) => {
    try {
      const res = await fetchHeritageRecordDetail(id);
      setSelectedRecord(res.record);
      setSuggestions(res.ai_suggestions || []);
      setReviewerComment('');
      setActionMessage(null);
    } catch (err) {
      console.error('Failed to load record details:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchHeritageRecords('all', 'all', 'all')
      .then((res) => {
        if (!isMounted) return;
        setRecords(res.records || []);
        if (res.records && res.records.length > 0) {
          loadRecordDetails(res.records[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load review queue:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleReviewAction = async (action: 'approved' | 'rejected' | 'changes_requested') => {
    if (!selectedRecord) return;
    setSubmitting(true);
    setActionMessage(null);
    try {
      const res = await reviewHeritageRecord(
        selectedRecord.id,
        action,
        'Senior Curator',
        'Fellowship Archival Reviewer',
        reviewerComment || `Action: ${action}`
      );
      setActionMessage(`Decision recorded: ${res.decision.toUpperCase()}`);
      loadPendingRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Review action failed';
      setActionMessage(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl border border-[#26221d] bg-[#110f0d] shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#1a1714] text-[#eed27c] border border-[#d4af37]/40 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3ba87e]" />
            <span>Human-in-the-Loop Curator Workspace</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#fcf9f2] font-heritage tracking-tight">
            Archival Verification &amp; Review Queue
          </h1>
          <p className="text-xs sm:text-sm text-[#9c9282] mt-0.5">
            Peer review and provenance sign-off for newly ingested heritage assets and AI field suggestions
          </p>
        </div>

        <button
          type="button"
          onClick={loadPendingRecords}
          className="p-2 rounded-xl border border-[#26221d] bg-[#171512] hover:bg-[#201d19] text-[#ded6c5] transition-colors self-start sm:self-auto"
          title="Refresh queue"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Split Layout: Records List (4 cols) + Inspection Panel (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        {/* Left: Queue List */}
        <div className="lg:col-span-4 rounded-2xl border border-[#26221d] bg-[#110f0d] p-4 shadow-xl space-y-3 overflow-y-auto max-h-[680px]">
          <div className="flex items-center justify-between pb-2 border-b border-[#201d19] text-xs">
            <span className="font-semibold text-[#fcf9f2] font-serif">Queue Entries</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#171512] text-[#eed27c] border border-[#26221d]">
              {records.length} records
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-[#9c9282] text-xs font-mono">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#d4af37] mb-2" />
              Loading review queue...
            </div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-[#9c9282] text-xs font-serif">
              Queue is clear. No records currently pending review.
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((r) => {
                const isSelected = selectedRecord?.id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => loadRecordDetails(r.id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                      isSelected
                        ? 'border-[#d4af37] bg-[#1c1813] shadow-xs'
                        : 'border-[#26221d] bg-[#141210] hover:bg-[#171512]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-[#9c9282] uppercase">{r.region}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          r.status === 'approved'
                            ? 'bg-[#0d1e17] text-[#3ba87e]'
                            : 'bg-[#1f1910] text-[#eed27c]'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="font-serif font-semibold text-[#fcf9f2] mt-1 truncate">
                      {r.title}
                    </div>
                    <div className="text-[11px] text-[#9c9282] truncate mt-0.5">
                      {r.heritage_type}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Record Review Detail Panel */}
        <div className="lg:col-span-8 rounded-2xl border border-[#26221d] bg-[#110f0d] p-5 shadow-xl space-y-4 flex flex-col justify-between overflow-y-auto">
          {selectedRecord ? (
            <div className="space-y-4">
              {/* Record Title & Metadata */}
              <div className="pb-3 border-b border-[#201d19] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] text-[#d4af37] uppercase">
                    ID: {selectedRecord.id}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#1c1813] text-[#eed27c] border border-[#d4af37]/30">
                    Status: {selectedRecord.status}
                  </span>
                </div>
                <h2 className="text-lg font-serif font-bold text-[#fcf9f2] font-heritage">
                  {selectedRecord.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-[#9c9282] font-mono">
                  <span>{selectedRecord.region}</span>
                  <span>•</span>
                  <span>{selectedRecord.heritage_type}</span>
                  <span>•</span>
                  <span>{selectedRecord.period || 'Medieval'}</span>
                </div>
              </div>

              {/* Archival Description */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-[#9c9282] tracking-wider block">
                  Field Documentation Note
                </span>
                <p className="text-xs text-[#ded6c5] leading-relaxed font-serif bg-[#171512] p-3 rounded-xl border border-[#26221d]">
                  {selectedRecord.description}
                </p>
              </div>

              {/* AI Extraction Suggestions */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#eed27c] font-semibold font-serif">
                    <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>AI Field Suggestions for Verification</span>
                  </div>

                  <div className="space-y-2">
                    {suggestions.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl border border-[#26221d] bg-[#141210] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-[#eed27c] uppercase">{s.field_name}</span>
                          <span className="font-mono text-[10px] text-[#3ba87e]">
                            Confidence: {(s.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="font-serif font-semibold text-[#fcf9f2]">
                          Suggested: &ldquo;{s.suggested_value}&rdquo;
                        </div>
                        {s.evidence && (
                          <div className="text-[11px] text-[#9c9282] italic">
                            Evidence: {s.evidence}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviewer Comment Box */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-[#9c9282] tracking-wider block">
                  Curator Sign-off Notes &amp; Observations
                </span>
                <textarea
                  value={reviewerComment}
                  onChange={(e) => setReviewerComment(e.target.value)}
                  placeholder="Record verification notes, epigraphical cross-references, or correction rationales..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#26221d] bg-[#171512] text-[#fcf9f2] text-xs placeholder-[#6e6659] focus:outline-hidden focus:border-[#d4af37] transition-colors"
                />
              </div>

              {actionMessage && (
                <div className="p-3 rounded-xl bg-[#1c1813] border border-[#d4af37]/40 text-xs text-[#eed27c] font-mono">
                  {actionMessage}
                </div>
              )}

              {/* Curator Decision Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-[#201d19]">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleReviewAction('rejected')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-900/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleReviewAction('changes_requested')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#26221d] bg-[#171512] hover:bg-[#201d19] text-[#ded6c5] text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#eed27c]" />
                  <span>Request Re-examination</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleReviewAction('approved')}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#2d5e4a] hover:bg-[#3ba87e] text-[#fcf9f2] text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sign &amp; Approve Record</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#9c9282] p-8 space-y-2">
              <FileText className="w-10 h-10 text-[#d4af37]/50" />
              <p className="text-xs font-serif">Select an entry from the queue to inspect metadata and verify AI suggestions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

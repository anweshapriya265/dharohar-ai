'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Clock,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs">
        <div>
          <div className="inline-block text-[11px] font-mono tracking-wider uppercase text-[#814B52] font-semibold mb-0.5">
            Curatorial Human-in-the-Loop
          </div>
          <h1 className="text-xl sm:text-2xl font-heritage font-bold text-[#642F38] tracking-tight">
            Archival Verification &amp; Review Queue
          </h1>
          <p className="text-xs sm:text-sm text-[#59524E] font-serif mt-0.5">
            Peer review and provenance sign-off for newly ingested heritage assets and AI field suggestions
          </p>
        </div>

        <button
          type="button"
          onClick={loadPendingRecords}
          className="p-2 rounded-lg border border-[#DED3C2] bg-[#FFFCF5] hover:bg-[#F6F1E7] text-[#393331] transition-colors self-start sm:self-auto cursor-pointer"
          title="Refresh queue"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Split Layout: Records List (4 cols) + Inspection Panel (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        {/* Left: Queue List */}
        <div className="lg:col-span-4 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] p-4 shadow-xs space-y-3 overflow-y-auto max-h-[680px]">
          <div className="flex items-center justify-between pb-2 border-b border-[#EBE4D8] text-xs">
            <span className="font-semibold text-[#393331] font-heritage">Queue Entries</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#EFE8DC] text-[#642F38] border border-[#DED3C2]">
              {records.length} records
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-[#756D66] text-xs font-serif">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#642F38] mb-2" />
              Loading review queue...
            </div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-[#756D66] text-xs font-serif">
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
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#642F38] bg-[#FAF2F3] shadow-xs'
                        : 'border-[#DED3C2] bg-[#EFE8DC] hover:bg-[#E8E0D2]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-[#756D66] uppercase">{r.region}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          r.status === 'approved'
                            ? 'bg-[#EDF3EF] text-[#52745E] border border-[#BCD0C3]'
                            : 'bg-[#FAF4E9] text-[#A67C3F] border border-[#E8D3B2]'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="font-heritage font-bold text-[#393331] mt-1 truncate">
                      {r.title}
                    </div>
                    <div className="text-[11px] text-[#756D66] font-serif truncate mt-0.5">
                      {r.heritage_type}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Record Review Detail Panel */}
        <div className="lg:col-span-8 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] p-5 shadow-xs space-y-4 flex flex-col justify-between overflow-y-auto">
          {selectedRecord ? (
            <div className="space-y-4">
              {/* Record Title & Metadata */}
              <div className="pb-3 border-b border-[#EBE4D8] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] text-[#814B52] uppercase">
                    ID: {selectedRecord.id}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#EFE8DC] text-[#642F38] border border-[#DED3C2]">
                    Status: {selectedRecord.status}
                  </span>
                </div>
                <h2 className="text-lg font-heritage font-bold text-[#642F38]">
                  {selectedRecord.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-[#756D66] font-mono">
                  <span>{selectedRecord.region}</span>
                  <span>•</span>
                  <span>{selectedRecord.heritage_type}</span>
                  <span>•</span>
                  <span>{selectedRecord.period || 'Medieval'}</span>
                </div>
              </div>

              {/* Archival Description */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-[#756D66] tracking-wider block font-semibold">
                  Field Documentation Note
                </span>
                <p className="text-xs text-[#393331] leading-relaxed font-serif bg-[#F6F1E7] p-3 rounded-lg border border-[#DED3C2]">
                  {selectedRecord.description}
                </p>
              </div>

              {/* AI Extraction Suggestions */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#642F38] font-semibold font-serif">
                    <Sparkles className="w-3.5 h-3.5 text-[#A77C54]" />
                    <span>AI Field Suggestions for Verification</span>
                  </div>

                  <div className="space-y-2">
                    {suggestions.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-lg border border-[#DED3C2] bg-[#F6F1E7] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-[#393331] font-mono">{s.field_name}:</span>
                          <span className="text-[10px] font-mono text-[#52745E]">
                            {((s.confidence ?? 0) * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <p className="text-[#59524E] font-serif">{s.suggested_value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Decision Message Notification */}
              {actionMessage && (
                <div className="p-3 rounded-lg bg-[#EDF3EF] border border-[#BCD0C3] text-xs text-[#52745E] font-serif font-medium">
                  {actionMessage}
                </div>
              )}

              {/* Curator Decision Form */}
              <div className="space-y-3 pt-3 border-t border-[#EBE4D8]">
                <div>
                  <label htmlFor="curator-comment" className="block text-xs font-semibold text-[#393331] font-heritage mb-1">
                    Curator Notes &amp; Verification Rationale
                  </label>
                  <textarea
                    id="curator-comment"
                    rows={2}
                    value={reviewerComment}
                    onChange={(e) => setReviewerComment(e.target.value)}
                    placeholder="Enter peer-review rationale, verified citation citations, or revision instructions..."
                    className="w-full px-3 py-2 rounded-lg border border-[#DED3C2] bg-[#FFFCF5] text-xs text-[#393331] placeholder:text-[#9E958D] font-serif focus:outline-none focus:border-[#642F38]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleReviewAction('approved')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#EDF3EF] hover:bg-[#52745E] text-[#52745E] hover:text-[#FFFCF5] border border-[#BCD0C3] text-xs font-serif font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve &amp; Sign Off</span>
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleReviewAction('changes_requested')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FAF4E9] hover:bg-[#A67C3F] text-[#A67C3F] hover:text-[#FFFCF5] border border-[#E8D3B2] text-xs font-serif font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Request Revisions</span>
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleReviewAction('rejected')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FAEEEE] hover:bg-[#A94B43] text-[#A94B43] hover:text-[#FFFCF5] border border-[#E8BDB9] text-xs font-serif font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Record</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#756D66] space-y-2 p-6 font-serif">
              <ShieldCheck className="w-8 h-8 text-[#A77C54]" />
              <p className="text-xs">Select any record from the queue to review and sign off.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

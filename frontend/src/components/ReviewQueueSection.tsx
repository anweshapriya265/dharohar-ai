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
          fetchHeritageRecordDetail(res.records[0].id)
            .then((d) => {
              if (isMounted) {
                setSelectedRecord(d.record);
                setSuggestions(d.ai_suggestions || []);
              }
            })
            .catch(() => {});
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

  const handleDecision = async (decision: 'approved' | 'rejected' | 'changes_requested') => {
    if (!selectedRecord) return;
    setSubmitting(true);
    setActionMessage(null);
    try {
      await reviewHeritageRecord(
        selectedRecord.id,
        decision,
        'Lead Cultural Curator',
        'Reviewer',
        reviewerComment || `Action ${decision} applied by curator.`
      );
      setActionMessage(`Record successfully ${decision}!`);
      await loadPendingRecords();
    } catch (err) {
      console.error('Error submitting review:', err);
      setActionMessage('Failed to submit decision.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#edf5f1] text-[#2d5e4a] mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Human-in-the-Loop Verification</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 font-heritage tracking-tight">
            Curator Curation &amp; Review Workspace
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Strict human oversight verifying AI-generated architectural typology suggestions before public catalog publication
          </p>
        </div>

        <button
          onClick={loadPendingRecords}
          className="text-xs px-3.5 py-2 rounded-xl border border-[#e5dfd5] hover:bg-stone-50 text-stone-700 font-semibold flex items-center gap-2 transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Main Grid: Queue List + Inspection/Decision Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pending Records Queue List */}
        <div className="p-4 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <span className="text-xs font-semibold text-stone-800">
              Submissions Queue
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-stone-100 text-stone-600">
              {records.length} items
            </span>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {records.map((r) => {
              const isSelected = selectedRecord?.id === r.id;
              const isPending = r.status === 'pending_review' || r.status === 'pending';
              const isApproved = r.status === 'approved';

              return (
                <div
                  key={r.id}
                  onClick={() => loadRecordDetails(r.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#9c381e] bg-[#fbeee9] shadow-2xs'
                      : 'border-[#e5dfd5] bg-white hover:bg-[#f7f5f0]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-stone-900 truncate">
                      {r.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 ${
                        isApproved
                          ? 'bg-[#edf5f1] text-[#2d5e4a] border border-[#c3dcd0]'
                          : isPending
                          ? 'bg-[#fbf5eb] text-[#b67322] border border-[#f0dec3]'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {r.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1.5">
                    <span>{r.region} · {r.heritage_type}</span>
                    <span className="font-mono text-[10px]">{r.period || 'Historical'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Curator Decision Workspace */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage space-y-4">
          {selectedRecord ? (
            <div className="space-y-4">
              {/* Record Title & Metadata Header */}
              <div className="border-b border-stone-100 pb-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-stone-100 text-stone-600">
                    ID: {selectedRecord.id}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Logged by: {selectedRecord.created_by || 'IITGN Fellow'}
                  </span>
                </div>
                <h2 className="text-lg font-serif font-bold text-stone-900 font-heritage mt-2">
                  {selectedRecord.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-stone-500 mt-1">
                  <span>Typology: <strong className="text-stone-800">{selectedRecord.heritage_type}</strong></span>
                  <span>Region: <strong className="text-stone-800">{selectedRecord.region}</strong></span>
                  <span>Status: <strong className="text-[#9c381e] uppercase">{selectedRecord.status.replace('_', ' ')}</strong></span>
                </div>
              </div>

              {/* Original Field Notes Text */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#9c381e]" />
                  <span>Archival Documentation Text</span>
                </h3>
                <div className="p-3.5 rounded-xl bg-[#f7f5f0] border border-[#e5dfd5] text-xs leading-relaxed text-stone-800 font-serif">
                  {selectedRecord.description}
                </div>
              </div>

              {/* AI-Generated Suggestions for Curator Review */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#b67322]" />
                  <span>AI Structural Suggestions (Awaiting Human Verdict)</span>
                </h3>

                {suggestions.length === 0 ? (
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-500">
                    No pending AI suggestions for this record.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suggestions.map((sug) => (
                      <div
                        key={sug.id}
                        className="p-3 rounded-xl border border-[#e5dfd5] bg-white flex items-center justify-between gap-3 text-xs shadow-2xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-mono text-[10px] text-stone-400 uppercase">
                            Field: {sug.field_name}
                          </span>
                          <p className="font-semibold text-stone-900">
                            Suggested: &ldquo;{sug.suggested_value}&rdquo;
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#edf5f1] text-[#2d5e4a] border border-[#c3dcd0] font-semibold">
                            {Math.round((sug.confidence || 0.85) * 100)}% Confidence
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Curator Feedback & Decision Actions */}
              <div className="pt-2 border-t border-stone-100 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-stone-500" />
                    <span>Curator Audit Rationale / Verification Notes</span>
                  </label>
                  <textarea
                    rows={2}
                    value={reviewerComment}
                    onChange={(e) => setReviewerComment(e.target.value)}
                    placeholder="Document justification for approving or requesting revisions on this archival record..."
                    className="w-full p-2.5 rounded-xl border border-[#e5dfd5] bg-[#f7f5f0]/60 text-xs text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-1 focus:ring-[#9c381e]"
                  />
                </div>

                {actionMessage && (
                  <div className="p-2.5 rounded-xl bg-[#edf5f1] border border-[#c3dcd0] text-xs text-[#2d5e4a] font-medium">
                    {actionMessage}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    disabled={submitting}
                    onClick={() => handleDecision('approved')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2d5e4a] hover:bg-[#234a3b] text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve &amp; Publish to Public Catalog</span>
                  </button>

                  <button
                    disabled={submitting}
                    onClick={() => handleDecision('changes_requested')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#f0dec3] bg-[#fbf5eb] hover:bg-[#faebd5] text-[#b67322] text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Request Changes</span>
                  </button>

                  <button
                    disabled={submitting}
                    onClick={() => handleDecision('rejected')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#f4cbc5] bg-[#fdf0ee] hover:bg-[#fadcd8] text-[#a6382a] text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Submission</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 p-8 space-y-2">
              <ShieldCheck className="w-10 h-10 stroke-1" />
              <p className="text-xs">Select a record from the submissions queue to inspect and curate.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

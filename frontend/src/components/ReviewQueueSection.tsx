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
      // Fetch both pending and all records
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
      // Refresh list
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
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
              Human-in-the-Loop Curation &amp; Review Workspace
            </h1>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Section 6.2 &amp; 12.1 SRS: Verified knowledge protocol ensuring zero hallucinations before public catalog publication
          </p>
        </div>

        <button
          onClick={loadPendingRecords}
          className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium flex items-center gap-1.5 hover:bg-stone-100 dark:hover:bg-stone-750"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </button>
      </div>

      {/* Main Grid: Queue List + Inspection/Decision Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pending Records Queue List */}
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
            <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
              Submissions Queue
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              {records.length} items
            </span>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {records.map((r) => {
              const isSelected = selectedRecord?.id === r.id;
              const isPending = r.status === 'pending_review';

              return (
                <div
                  key={r.id}
                  onClick={() => loadRecordDetails(r.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 shadow-xs'
                      : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-850'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {r.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 ${
                        isPending
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                          : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      {r.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 mt-1.5">
                    <span>{r.region} · {r.heritage_type}</span>
                    <span className="font-mono text-[10px]">{r.period?.split(' ')[0] || 'Historical'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Curator Decision Workspace */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
          {selectedRecord ? (
            <div className="space-y-4">
              {/* Record Title & Metadata Header */}
              <div className="border-b border-stone-100 dark:border-stone-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                    ID: {selectedRecord.id}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Uploader: {selectedRecord.created_by}
                  </span>
                </div>
                <h2 className="text-base font-bold font-serif text-stone-900 dark:text-stone-100 mt-2">
                  {selectedRecord.title}
                </h2>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                  {selectedRecord.description}
                </p>
              </div>

              {/* AI-Generated Suggestions vs Human Ground Truth */}
              <div>
                <h3 className="text-xs font-semibold text-stone-800 dark:text-stone-200 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  AI Model Suggestions (all-MiniLM-L6-v2 + Heuristic Matcher)
                </h3>

                <div className="space-y-2">
                  {suggestions.length > 0 ? (
                    suggestions.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                            <span>{s.field_name.replace('_', ' ').toUpperCase()}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                              {(s.confidence * 100).toFixed(0)}% Confidence
                            </span>
                          </div>
                          <div className="text-stone-700 dark:text-stone-300 font-mono mt-1 text-[11px]">
                            {s.suggested_value}
                          </div>
                          {s.evidence && (
                            <div className="text-[10px] text-stone-400 mt-0.5">
                              Evidence: {s.evidence}
                            </div>
                          )}
                        </div>

                        <span className="px-2 py-1 rounded-md text-[10px] uppercase font-semibold border border-stone-200 dark:border-stone-700 self-start sm:self-center">
                          {s.review_status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-lg border border-dashed border-stone-200 dark:border-stone-800 text-xs text-stone-400 text-center">
                      No automated suggestions recorded for this legacy asset.
                    </div>
                  )}
                </div>
              </div>

              {/* Curator Notes & Decision Controls */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-3">
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                  Curator / Reviewer Notes
                </label>
                <textarea
                  value={reviewerComment}
                  onChange={(e) => setReviewerComment(e.target.value)}
                  placeholder="Enter peer-review feedback, epigraph verification notes, or reason for rejection..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />

                {actionMessage && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{actionMessage}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    disabled={submitting}
                    onClick={() => handleDecision('approved')}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve &amp; Publish to Corpus
                  </button>

                  <button
                    disabled={submitting}
                    onClick={() => handleDecision('changes_requested')}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Request Field Note Changes
                  </button>

                  <button
                    disabled={submitting}
                    onClick={() => handleDecision('rejected')}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject Submission
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center text-stone-400">
              <FileText className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-xs">Select a record from the queue to start curation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


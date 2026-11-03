'use client';

import React, { useState, useId } from 'react';
import {
  Sparkles,
  Search,
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileText,
  Filter,
  ExternalLink,
  Info,
  Server,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  DocumentItem,
  AssistantAskResponse,
  GroundingStateType,
  askAssistant,
} from '@/lib/api';

interface ResearchAssistantSectionProps {
  availableDocuments: DocumentItem[];
  onInspectSource: (documentId: string, pageNumber: number) => void;
  onOpenUpload: () => void;
  backendConnected: boolean;
}

const SAMPLE_INQUIRIES = [
  'Who commissioned the Kailash monolithic temple at Ellora?',
  'What epigraphical inscriptions are documented in Cave 16?',
  'What historical preservation or structural repairs are recorded in the archive?',
  'What architectural dimensions and excavation techniques are described?',
];

const SAMPLE_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc_aswi_vol5_1883',
    original_filename: 'Archaeological_Survey_Western_India_Vol_V_1883.pdf',
    file_size: 14500000,
    content_type: 'application/pdf',
    upload_timestamp: '1883-01-01T00:00:00Z',
    processing_status: 'completed',
    extraction_status: 'extracted',
    page_count: 112,
    storage_reference: 'doc_aswi_vol5_1883.pdf',
    created_at: '2026-10-31T10:00:00Z',
    updated_at: '2026-10-31T10:00:00Z',
  },
  {
    id: 'doc_indian_architecture_1942',
    original_filename: 'Indian_Architecture_Buddhist_Hindu_Periods_1942.pdf',
    file_size: 18200000,
    content_type: 'application/pdf',
    upload_timestamp: '1942-01-01T00:00:00Z',
    processing_status: 'completed',
    extraction_status: 'extracted',
    page_count: 248,
    storage_reference: 'doc_indian_architecture_1942.pdf',
    created_at: '2026-10-31T11:00:00Z',
    updated_at: '2026-10-31T11:00:00Z',
  },
  {
    id: 'doc_epigraphia_indica_vol7',
    original_filename: 'Epigraphia_Indica_Vol_VII_Rashtrakuta_Grants.pdf',
    file_size: 9800000,
    content_type: 'application/pdf',
    upload_timestamp: '1902-01-01T00:00:00Z',
    processing_status: 'completed',
    extraction_status: 'ocr',
    page_count: 64,
    storage_reference: 'doc_epigraphia_indica_vol7.pdf',
    created_at: '2026-10-31T12:00:00Z',
    updated_at: '2026-10-31T12:00:00Z',
  },
];

const DEMO_GROUNDED_RESPONSE: AssistantAskResponse = {
  question: 'Who commissioned the Kailash monolithic temple at Cave 16 and what inscriptions are recorded?',
  answer:
    'The monolithic Kailash Temple (Cave 16) at Ellora was excavated under the direct patronage of Rashtrakuta monarch Krishna I (reigned c. 756–774 CE). Inscriptions from the Baroda copper-plate grant explicitly attribute this monumental rock-cut achievement to Krishna I, celebrating the astonishment of the celestial beings and architects at the vertical excavation cut directly into the basalt hillside.',
  grounding_state: 'grounded',
  claims: [
    {
      text: 'Rashtrakuta monarch Krishna I (c. 756–774 CE) commissioned the monolithic excavation of the Kailash Temple at Ellora.',
      evidence_ids: ['E1'],
      source_citations: ['Archaeological Survey of Western India, Vol. V (1883), p. 24'],
      evidence: [
        {
          evidence_id: 'E1',
          document_id: 'doc_aswi_vol5_1883',
          filename: 'Archaeological_Survey_Western_India_Vol_V_1883.pdf',
          page_number: 24,
          source_citation: 'Archaeological Survey of Western India, Vol. V (1883), p. 24',
          citation_valid: true,
          semantic_support: 'attributed',
        },
      ],
    },
    {
      text: 'The Baroda copper-plate inscription records the architects praising the miraculous design of the rock-cut temple.',
      evidence_ids: ['E2'],
      source_citations: ['Archaeological Survey of Western India, Vol. V (1883), p. 26'],
      evidence: [
        {
          evidence_id: 'E2',
          document_id: 'doc_aswi_vol5_1883',
          filename: 'Archaeological_Survey_Western_India_Vol_V_1883.pdf',
          page_number: 26,
          source_citation: 'Archaeological Survey of Western India, Vol. V (1883), p. 26',
          citation_valid: true,
          semantic_support: 'attributed',
        },
      ],
    },
  ],
  missing_information: [],
  conflicts: [],
  verified_citations: [
    'Archaeological Survey of Western India, Vol. V (1883), p. 24',
    'Archaeological Survey of Western India, Vol. V (1883), p. 26',
  ],
  has_sufficient_evidence: true,
  error: null,
  limitations: [
    'Claims are attributed to cited archival passages; semantic entailment is not independently verified.',
  ],
  provider_info: {
    provider: 'Ollama',
    model: 'llama3.2:3b',
    base_url: 'http://127.0.0.1:11434',
  },
};

const DEMO_CONFLICT_RESPONSE: AssistantAskResponse = {
  question: 'What is the recorded excavation chronology of the upper galleries in Cave 16?',
  answer:
    'Archival documentation demonstrates a divergence in scholarly opinion concerning the excavation phases of the upper galleries at Cave 16. James Burgess in the 1883 Western India Survey concludes that the perimeter cloisters were an auxiliary expansion under Govinda III, whereas architectural historian Percy Brown (1942) contends that the upper gallery scheme was integral to the original eighth-century master plan.',
  grounding_state: 'conflicting_evidence',
  claims: [
    {
      text: 'James Burgess dates the outer cloister colonnade to a secondary phase during the reign of Govinda III.',
      evidence_ids: ['E1'],
      source_citations: ['ASWI Vol. V (1883), p. 31'],
      evidence: [
        {
          evidence_id: 'E1',
          document_id: 'doc_aswi_vol5_1883',
          filename: 'Archaeological_Survey_Western_India_Vol_V_1883.pdf',
          page_number: 31,
          source_citation: 'ASWI Vol. V (1883), p. 31',
          citation_valid: true,
          semantic_support: 'attributed',
        },
      ],
    },
    {
      text: 'Percy Brown argues that the vertical trenching method required the upper galleries to be carved synchronously with the sanctuary.',
      evidence_ids: ['E2'],
      source_citations: ['Indian Architecture (1942), p. 89'],
      evidence: [
        {
          evidence_id: 'E2',
          document_id: 'doc_indian_architecture_1942',
          filename: 'Indian_Architecture_Buddhist_Hindu_Periods_1942.pdf',
          page_number: 89,
          source_citation: 'Indian Architecture (1942), p. 89',
          citation_valid: true,
          semantic_support: 'attributed',
        },
      ],
    },
  ],
  missing_information: [
    'Original quarry ledger records or direct quarry master inscriptions naming the individual guild supervisors.',
  ],
  conflicts: [
    {
      topic: 'Excavation sequence and master plan continuity of Cave 16 perimeter cloisters',
      perspective_a: {
        claim: 'Upper colonnade galleries were added as a later expansion under Govinda III.',
        evidence_ids: ['E1'],
        citations: ['ASWI Vol. V (1883), p. 31'],
      },
      perspective_b: {
        claim: 'Perimeter cloisters were excavated top-down in the initial monolithic campaign under Krishna I.',
        evidence_ids: ['E2'],
        citations: ['Indian Architecture (1942), p. 89'],
      },
    },
  ],
  verified_citations: [
    'ASWI Vol. V (1883), p. 31',
    'Indian Architecture (1942), p. 89',
  ],
  has_sufficient_evidence: true,
  error: null,
  limitations: [
    'Claims are attributed to cited archival passages; semantic entailment is not independently verified.',
  ],
  provider_info: {
    provider: 'Ollama',
    model: 'llama3.2:3b',
    base_url: 'http://127.0.0.1:11434',
  },
};

const DEMO_INSUFFICIENT_RESPONSE: AssistantAskResponse = {
  question: 'What was the administrative grain tax rate levied on villages near Ellora in 760 CE?',
  answer:
    'The archive does not contain sufficient relevant documentation to answer this inquiry. The indexed archival holdings cover architectural dimensions, sculptural iconographies, and royal epigraphical grants, but lack village agricultural taxation rolls from eighth-century Maharashtra.',
  grounding_state: 'insufficient_evidence',
  claims: [],
  missing_information: [
    'Village revenue assessments and agricultural tax rates for eighth-century Deccan settlements.',
  ],
  conflicts: [],
  verified_citations: [],
  has_sufficient_evidence: false,
  error: null,
  limitations: [
    'Claims are attributed to cited archival passages; semantic entailment is not independently verified.',
  ],
  provider_info: null,
};

export default function ResearchAssistantSection({
  availableDocuments,
  onInspectSource,
  onOpenUpload,
  backendConnected,
}: ResearchAssistantSectionProps) {
  const [question, setQuestion] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const demo = new URLSearchParams(window.location.search).get('demo');
      if (demo === 'grounded') return DEMO_GROUNDED_RESPONSE.question;
      if (demo === 'conflicts') return DEMO_CONFLICT_RESPONSE.question;
      if (demo === 'insufficient') return DEMO_INSUFFICIENT_RESPONSE.question;
    }
    return '';
  });
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<AssistantAskResponse | null>(() => {
    if (typeof window !== 'undefined') {
      const demo = new URLSearchParams(window.location.search).get('demo');
      if (demo === 'grounded') return DEMO_GROUNDED_RESPONSE;
      if (demo === 'conflicts') return DEMO_CONFLICT_RESPONSE;
      if (demo === 'insufficient') return DEMO_INSUFFICIENT_RESPONSE;
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);

  const filterSelectId = useId();

  // Use real available documents if present, otherwise sample documents for demonstration
  const effectiveDocuments =
    availableDocuments.length > 0 ? availableDocuments : SAMPLE_DOCUMENTS;

  // Toggle document selection for targeted archival scoping
  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAllDocs = () => {
    setSelectedDocIds([]);
  };

  // Submit research inquiry
  const handleSubmitInquiry = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isLoading || !backendConnected) return;

    // Clear previous responses immediately so failed or in-flight requests never show stale data
    setResponse(null);
    setError(null);
    setIsLoading(true);

    try {
      const docIdsPayload = selectedDocIds.length > 0 ? selectedDocIds : null;
      const res = await askAssistant(trimmed, docIdsPayload);
      setResponse(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query research assistant';
      setError(msg);
      setResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuestion('');
    setResponse(null);
    setError(null);
  };

  // Visual configuration for each grounding state with strictly verified provenance language
  const getGroundingBadge = (state: GroundingStateType) => {
    switch (state) {
      case 'grounded':
        return {
          title: 'Relevant Archival Evidence Retrieved',
          desc: 'Relevant archival evidence retrieved. Claims are attributed to cited passages; semantic entailment is not independently verified.',
          border: 'border-emerald-300 dark:border-emerald-800',
          bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
          badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
        };
      case 'partial':
        return {
          title: 'Partial Archival Evidence',
          desc: 'Partial archival evidence retrieved. Some elements are documented in cited passages, but the archive does not fully answer every aspect of this inquiry; semantic entailment is not independently verified.',
          border: 'border-amber-300 dark:border-amber-800',
          bg: 'bg-amber-50/70 dark:bg-amber-950/30',
          badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-300 dark:border-amber-700',
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
        };
      case 'conflicting_evidence':
        return {
          title: 'Conflicting Archival Accounts',
          desc: 'Conflicting archival accounts retrieved. Differing statements or divergent records were identified across the cited archival documents; semantic entailment is not independently verified.',
          border: 'border-purple-300 dark:border-purple-800',
          bg: 'bg-purple-50/70 dark:bg-purple-950/30',
          badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border-purple-300 dark:border-purple-700',
          icon: <AlertCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
        };
      case 'insufficient_evidence':
        return {
          title: 'Insufficient Archival Evidence',
          desc: 'No sufficiently relevant passages were identified in the indexed corpus for this question.',
          border: 'border-stone-300 dark:border-stone-700',
          bg: 'bg-stone-50 dark:bg-stone-900/40',
          badgeBg: 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border-stone-300 dark:border-stone-600',
          icon: <HelpCircle className="w-5 h-5 text-stone-500 dark:text-stone-400" />,
        };
      case 'provider_unavailable':
        return {
          title: 'Local AI Provider Offline',
          desc: 'The Ollama local inference service is currently unreachable or the specified model is not loaded.',
          border: 'border-rose-300 dark:border-rose-800',
          bg: 'bg-rose-50/70 dark:bg-rose-950/30',
          badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border-rose-300 dark:border-rose-700',
          icon: <Server className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
        };
      case 'malformed_output':
        return {
          title: 'Unparseable Model Response',
          desc: 'The local model returned a response that could not be parsed into the structured schema.',
          border: 'border-orange-300 dark:border-orange-800',
          bg: 'bg-orange-50/70 dark:bg-orange-950/30',
          badgeBg: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300 border-orange-300 dark:border-orange-700',
          icon: <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2e2923]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-[#1d1914] text-[#eed27c] border border-[#d4af37]/40 flex items-center gap-1.5 font-serif">
              <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
              Evidence-Grounded AI · Milestone 5.7
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#fcf9f2] font-heritage mt-2">
            Epigraphic AI Studio &amp; Archival Assistant
          </h1>
          <p className="text-xs sm:text-sm text-[#ded6c5] mt-1 max-w-2xl">
            Inquire across colonial gazetteers, architectural blueprints, and epigraphical reports.
            Every claim is attributed to specific page-level passages from retrieved archival documents.
          </p>
        </div>

        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {!backendConnected && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-900/60 bg-rose-950/60 text-xs text-rose-300 font-medium">
              <Server className="w-3.5 h-3.5" />
              <span>Backend Offline</span>
            </div>
          )}
          {/* Corpus Status Chip */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2e2923] bg-[#141210] text-xs">
            <BookOpen className="w-4 h-4 text-[#d4af37]" />
            <span className="text-[#a89f91]">Indexed Corpus:</span>
            <span className="font-semibold text-[#fcf9f2]">
              {effectiveDocuments.length} {effectiveDocuments.length === 1 ? 'Document' : 'Documents'}
            </span>
          </div>
        </div>
      </div>

      {/* Inquiry Form Card */}
      <div className="p-4 sm:p-6 rounded-2xl border border-[#2e2923] bg-[#12100e] shadow-xl space-y-4">
        <form onSubmit={handleSubmitInquiry} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="research-inquiry"
                className="text-xs sm:text-sm font-semibold text-[#fcf9f2] font-serif flex items-center gap-2"
              >
                <Search className="w-4 h-4 text-[#d4af37]" />
                Historical Research Inquiry
              </label>
              <span
                className={`text-[11px] font-mono ${
                  question.length > 950 ? 'text-rose-400' : 'text-[#786e64]'
                }`}
              >
                {question.length}/1000
              </span>
            </div>

            <textarea
              id="research-inquiry"
              rows={3}
              maxLength={1000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void handleSubmitInquiry();
                }
              }}
              placeholder="e.g., What architectural features, royal patrons, and inscriptions are documented for Cave 16 (Kailash Temple) at Ellora?"
              className="w-full px-4 py-3 rounded-xl border border-[#2e2923] bg-[#0c0a09] text-sm text-[#fcf9f2] placeholder:text-[#786e64] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-[#d4af37] transition font-serif"
              disabled={isLoading}
              aria-label="Research Question or Inquiry"
            />
            <div className="text-[11px] text-[#786e64] mt-1 flex justify-between">
              <span>Press Ctrl+Enter (or Cmd+Enter) to submit inquiry</span>
            </div>
          </div>

          {/* Suggested Inquiries */}
          <div>
            <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>Suggested Historical Inquiries:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_INQUIRIES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setQuestion(sample)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-lg text-xs border border-[#2e2923] bg-[#161310] hover:bg-[#1f1b16] hover:border-[#d4af37]/40 text-[#ded6c5] hover:text-[#fcf9f2] text-left transition disabled:opacity-40 cursor-pointer font-serif"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Archival Scenario Demonstrators */}
          <div className="pt-2 border-t border-[#24201a] flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-[#a89f91] flex items-center gap-1 font-serif">
              <Eye className="w-3.5 h-3.5 text-[#d4af37]" />
              Scenario Previews:
            </span>
            <button
              type="button"
              onClick={() => {
                setQuestion('Who commissioned the Kailash monolithic temple at Cave 16 and what inscriptions are recorded?');
                setResponse(DEMO_GROUNDED_RESPONSE);
                setError(null);
              }}
              className="px-2.5 py-1 rounded-lg text-xs border border-emerald-800/80 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 transition cursor-pointer font-serif"
            >
              Corroborated Citations
            </button>
            <button
              type="button"
              onClick={() => {
                setQuestion('What is the recorded excavation chronology of the upper galleries in Cave 16?');
                setResponse(DEMO_CONFLICT_RESPONSE);
                setError(null);
              }}
              className="px-2.5 py-1 rounded-lg text-xs border border-purple-800/80 bg-purple-950/60 text-purple-300 hover:bg-purple-900/60 transition cursor-pointer font-serif"
            >
              Conflicting Perspectives
            </button>
            <button
              type="button"
              onClick={() => {
                setQuestion('What was the administrative grain tax rate levied on villages near Ellora in 760 CE?');
                setResponse(DEMO_INSUFFICIENT_RESPONSE);
                setError(null);
              }}
              className="px-2.5 py-1 rounded-lg text-xs border border-[#383127] bg-[#1a1714] text-[#ded6c5] hover:bg-[#25201a] transition cursor-pointer font-serif"
            >
              Insufficient Evidence
            </button>
          </div>

          {/* Document Scoping / Filtering */}
          <div className="pt-2 border-t border-[#24201a]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label
                htmlFor={filterSelectId}
                className="text-xs font-semibold text-[#ded6c5] flex items-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5 text-[#d4af37]" />
                Archival Scope:
                <span className="font-normal text-[#a89f91]">
                  {selectedDocIds.length === 0
                    ? 'All indexed documents in corpus'
                    : `Filtered to ${selectedDocIds.length} selected ${
                        selectedDocIds.length === 1 ? 'document' : 'documents'
                      }`}
                </span>
              </label>

              {selectedDocIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllDocs}
                  className="text-xs text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Reset to All Documents
                </button>
              )}
            </div>

            <div
              className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1"
              role="group"
              aria-label="Filter inquiry to specific documents"
            >
              <button
                id={filterSelectId}
                type="button"
                onClick={handleSelectAllDocs}
                aria-pressed={selectedDocIds.length === 0}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  selectedDocIds.length === 0
                    ? 'bg-amber-700 text-white border-amber-800 dark:bg-amber-600 dark:border-amber-500 shadow-xs'
                    : 'bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:border-stone-300'
                }`}
              >
                Entire Corpus ({effectiveDocuments.length})
              </button>

              <button
                type="button"
                onClick={onOpenUpload}
                aria-label="Upload document to archive"
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-amber-600 hover:text-amber-700 dark:hover:text-amber-300 transition cursor-pointer"
              >
                + Upload PDF
              </button>

              {effectiveDocuments.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => toggleDocSelection(doc.id)}
                    aria-pressed={isSelected}
                    aria-label={`Toggle filter for ${doc.original_filename}`}
                    className={`px-2.5 py-1 rounded-lg text-xs border flex items-center gap-1.5 transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 text-amber-900 border-amber-400 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-600 font-semibold'
                        : 'bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:border-stone-300'
                    }`}
                  >
                    <FileText className="w-3 h-3 text-stone-400 shrink-0" />
                    <span className="truncate max-w-[180px]">{doc.original_filename}</span>
                    <span className="text-[10px] text-stone-400 shrink-0">({doc.page_count}p)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-stone-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Citation Provenance: Claims are attributed to cited passages; semantic entailment is not independently verified.</span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {(question || response || error) && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isLoading}
                  className="px-3 py-2 rounded-xl text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                  aria-label="Clear inquiry input and results"
                >
                  Clear
                </button>
              )}

              <button
                type="submit"
                disabled={isLoading || !question.trim() || !backendConnected}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 disabled:opacity-50 disabled:pointer-events-none transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Consulting Archive...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Ask Research Assistant</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Loading Progress State */}
      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="p-6 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-center space-y-4 animate-pulse"
        >
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
              <Sparkles className="w-6 h-6 animate-spin" />
            </div>
          </div>
          <div>
            <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100 font-heritage text-base">
              Executing Evidence-Grounded Research Pipeline
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 max-w-md mx-auto">
              Scanning vector representations of archival passages, merging contiguous contexts, and
              synthesizing attributed claims with the local inference provider.
            </p>
          </div>
          <div className="flex justify-center gap-6 text-[11px] font-mono text-stone-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Vector Retrieval
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Evidence Map Construction
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" /> Grounded Synthesis
            </span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && !isLoading && (
        <div
          role="alert"
          className="p-4 sm:p-5 rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 space-y-3"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                Inquiry Processing Error
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed break-words">{error}</p>
            </div>
          </div>

          {/* Actionable guidance if local provider offline */}
          {error.toLowerCase().includes('ollama') || error.toLowerCase().includes('cannot reach') ? (
            <div className="p-3 rounded-xl bg-white/70 dark:bg-stone-900/70 border border-rose-200 dark:border-rose-900 text-xs text-stone-700 dark:text-stone-300 space-y-1.5 font-mono">
              <div className="font-semibold text-stone-900 dark:text-stone-100 font-sans">
                Troubleshooting Local Ollama Setup:
              </div>
              <div>1. Verify Ollama is running: <code className="bg-stone-200 dark:bg-stone-800 px-1 rounded">ollama serve</code></div>
              <div>2. Ensure the required model is installed: <code className="bg-stone-200 dark:bg-stone-800 px-1 rounded">ollama run llama3.2:3b</code></div>
              <div>3. Check backend port: <code className="bg-stone-200 dark:bg-stone-800 px-1 rounded">http://127.0.0.1:11434</code></div>
            </div>
          ) : null}
        </div>
      )}

      {/* Response Display Area */}
      {response && !isLoading && (
        <div className="space-y-6">
          {/* Grounding State Header Badge */}
          {(() => {
            const badge = getGroundingBadge(response.grounding_state);
            return (
              <div
                role="status"
                className={`p-4 sm:p-5 rounded-2xl border ${badge.border} ${badge.bg} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">{badge.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100">
                        {badge.title}
                      </h2>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${badge.badgeBg}`}
                      >
                        {response.grounding_state}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                      {badge.desc}
                    </p>
                  </div>
                </div>

                {response.provider_info && (
                  <div className="text-right text-[11px] font-mono text-stone-500 shrink-0">
                    <div>Provider: {response.provider_info.provider}</div>
                    <div className="text-amber-700 dark:text-amber-400">
                      Model: {response.provider_info.model}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Synthesized Answer */}
          {response.answer && (
            <div className="p-5 sm:p-6 rounded-2xl border border-[#2e2923] bg-[#12100e] shadow-xl space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#eed27c] flex items-center gap-1.5 font-serif">
                <BookOpen className="w-3.5 h-3.5 text-[#d4af37]" />
                Archival Synthesis
              </h2>
              <div className="text-sm sm:text-base font-serif text-[#fcf9f2] leading-relaxed font-heritage whitespace-pre-line break-words">
                {response.answer}
              </div>
            </div>
          )}

          {/* Structured Attributed Claims */}
          {response.claims && response.claims.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-serif font-bold text-[#fcf9f2] font-heritage flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Attributed Archival Claims &amp; Citations ({response.claims.length})
                </h2>
                <span className="text-[11px] text-[#a89f91] font-serif">
                  Click any citation to inspect the original archival page
                </span>
              </div>

              <div className="space-y-3">
                {response.claims.map((claim, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-[#24201a] bg-[#141210] shadow-md space-y-3 hover:border-[#d4af37]/40 transition"
                  >
                    {/* Claim text */}
                    <div className="flex items-start gap-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1d1914] text-[#eed27c] border border-[#d4af37]/40 shrink-0 mt-0.5">
                        Claim #{index + 1}
                      </span>
                      <p className="text-xs sm:text-sm text-[#fcf9f2] leading-relaxed font-medium break-words font-serif">
                        {claim.text}
                      </p>
                    </div>

                    {/* Citations List */}
                    {claim.evidence && claim.evidence.length > 0 ? (
                      <div className="pt-2 border-t border-[#24201a] flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-[#a89f91] font-medium font-serif">
                          Supporting Archival Passages:
                        </span>
                        {claim.evidence.map((ev, evIdx) => {
                          const pdfPage = ev.pdf_page_index ?? ev.page_number;
                          const hasPrinted = ev.printed_page_label && ev.printed_page_label.trim() !== '';
                          const citationText = hasPrinted
                            ? `Printed p. ${ev.printed_page_label} · PDF p. ${pdfPage}`
                            : `PDF p. ${pdfPage} · Printed unavailable`;

                          return (
                            <button
                              key={evIdx}
                              type="button"
                              onClick={() => onInspectSource(ev.document_id, pdfPage)}
                              aria-label={`Inspect citation ${ev.evidence_id} in ${ev.filename}, ${citationText}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-[#d4af37]/40 bg-[#1d1914] hover:bg-[#25201a] hover:border-[#d4af37] text-[#eed27c] transition group cursor-pointer shadow-xs"
                              title={ev.citation_display || (hasPrinted ? `Printed page ${ev.printed_page_label} · PDF page ${pdfPage}` : `PDF page ${pdfPage} · Printed page unavailable`)}
                            >
                              <span className="font-mono text-[10px] bg-[#2e261a] border border-[#d4af37]/30 px-1 rounded font-bold text-[#d4af37]">
                                {ev.evidence_id}
                              </span>
                              <span className="truncate max-w-[140px] sm:max-w-[200px] text-[#ded6c5]">
                                {ev.filename}
                              </span>
                              <span className="text-[#d4af37] font-semibold text-[11px]">
                                · {hasPrinted ? `Printed p. ${ev.printed_page_label} (PDF p. ${pdfPage})` : `PDF p. ${pdfPage}`}
                              </span>
                              <ExternalLink className="w-3 h-3 text-[#d4af37] opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#786e64] italic">
                        No direct evidence citation attached to this statement.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Information Banner */}
          {response.missing_information && response.missing_information.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 space-y-2">
              <h2 className="text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Archival Limits &amp; Missing Information
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-300">
                The indexed historical documents do not contain records for the following details:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-stone-700 dark:text-stone-300 font-serif">
                {response.missing_information.map((item, idx) => (
                  <li key={idx} className="leading-relaxed break-words">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Conflicting Evidence Presentation */}
          {response.conflicts && response.conflicts.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/20 space-y-4">
              <h2 className="text-xs font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-purple-600" />
                Conflicting Historical Perspectives Detected ({response.conflicts.length})
              </h2>
              <div className="space-y-3">
                {response.conflicts.map((conf, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-3.5 rounded-xl border border-purple-100 dark:border-purple-900/60 bg-white/80 dark:bg-stone-900/80 space-y-2 text-xs"
                  >
                    <div className="font-semibold text-purple-950 dark:text-purple-200 break-words">
                      Discrepancy: {conf.topic}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-1">
                        <span className="text-[10px] font-mono font-bold text-amber-700 uppercase">
                          Account A
                        </span>
                        <p className="text-stone-700 dark:text-stone-300 break-words">{conf.perspective_a.claim}</p>
                        <div className="text-[10px] text-stone-400 break-words">
                          Evidence: {conf.perspective_a.evidence_ids.join(', ')}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-1">
                        <span className="text-[10px] font-mono font-bold text-purple-700 uppercase">
                          Account B
                        </span>
                        <p className="text-stone-700 dark:text-stone-300 break-words">{conf.perspective_b.claim}</p>
                        <div className="text-[10px] text-stone-400 break-words">
                          Evidence: {conf.perspective_b.evidence_ids.join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Epistemological Limitation Disclaimer (Strict Requirement) */}
          <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 flex items-start gap-2.5 text-xs text-stone-500 dark:text-stone-400">
            <Info className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-stone-700 dark:text-stone-300">
                Epistemological Limitation:
              </span>{' '}
              Claims are attributed to cited archival passages; semantic entailment is not
              independently verified. All statements should be corroborated against original
              cited archival documents.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
          semantic_support: 'supported',
          pdf_page_index: 24,
          printed_page_label: '24',
          citation_display: 'Printed page 24 · PDF page 24',
        },
      ],
    },
    {
      text: 'The Baroda copper-plate grant records the architectural wonder of the gods viewing the shrine carved out of the living basalt cliff.',
      evidence_ids: ['E2'],
      source_citations: ['Epigraphia Indica, Vol. VII (1902), p. 43'],
      evidence: [
        {
          evidence_id: 'E2',
          document_id: 'doc_epigraphia_indica_vol7',
          filename: 'Epigraphia_Indica_Vol_VII_Rashtrakuta_Grants.pdf',
          page_number: 43,
          source_citation: 'Epigraphia Indica, Vol. VII (1902), p. 43',
          citation_valid: true,
          semantic_support: 'supported',
          pdf_page_index: 43,
          printed_page_label: '43',
          citation_display: 'Printed page 43 · PDF page 43',
        },
      ],
    },
  ],
  missing_information: [],
  conflicts: [],
  verified_citations: [
    'Archaeological Survey of Western India, Vol. V (1883), p. 24',
    'Epigraphia Indica, Vol. VII (1902), p. 43',
  ],
  has_sufficient_evidence: true,
  limitations: [],
  provider_info: {
    provider: 'local-ollama',
    model: 'llama3.2:3b',
  },
};

const DEMO_CONFLICT_RESPONSE: AssistantAskResponse = {
  question: 'What is the recorded excavation chronology of the upper galleries in Cave 16?',
  answer:
    'Archival surveys present divergent accounts regarding whether the upper cloister galleries were completed under Krishna I or extended by subsequent rulers. James Burgess (1883) asserts that the entire monolithic excavation plan was conceived and executed within a single architectural phase under Krishna I. Conversely, Percy Brown (1942) suggests that stylistic variations in the perimeter gallery sculptures indicate successive Rashtrakuta additions extending into the 9th century.',
  grounding_state: 'conflicting_evidence',
  claims: [
    {
      text: 'James Burgess records that the monolithic plan was executed as a unified architectural program under Krishna I.',
      evidence_ids: ['E1'],
      source_citations: ['Archaeological Survey of Western India, Vol. V (1883), p. 28'],
      evidence: [
        {
          evidence_id: 'E1',
          document_id: 'doc_aswi_vol5_1883',
          filename: 'Archaeological_Survey_Western_India_Vol_V_1883.pdf',
          page_number: 28,
          source_citation: 'Archaeological Survey of Western India, Vol. V (1883), p. 28',
          citation_valid: true,
          semantic_support: 'supported',
          pdf_page_index: 28,
          printed_page_label: '28',
          citation_display: 'Printed page 28 · PDF page 28',
        },
      ],
    },
    {
      text: 'Percy Brown observes stylistic disparities suggesting secondary phases of carving across the perimeter gallery reliefs.',
      evidence_ids: ['E2'],
      source_citations: ['Indian Architecture (Buddhist and Hindu Periods) (1942), p. 86'],
      evidence: [
        {
          evidence_id: 'E2',
          document_id: 'doc_indian_architecture_1942',
          filename: 'Indian_Architecture_Buddhist_Hindu_Periods_1942.pdf',
          page_number: 86,
          source_citation: 'Indian Architecture (Buddhist and Hindu Periods) (1942), p. 86',
          citation_valid: true,
          semantic_support: 'supported',
          pdf_page_index: 86,
          printed_page_label: '86',
          citation_display: 'Printed page 86 · PDF page 86',
        },
      ],
    },
  ],
  missing_information: [
    'Direct epigraphical dates for the individual sculptors of the southern perimeter gallery reliefs.',
  ],
  conflicts: [
    {
      topic: 'Excavation Chronology of Cave 16 Perimeter Cloisters',
      perspective_a: {
        claim: 'Monolithic excavation was executed as a unified architectural program under Krishna I (c. 756–774 CE).',
        evidence_ids: ['E1'],
        citations: ['Archaeological Survey of Western India, Vol. V (1883), p. 28'],
      },
      perspective_b: {
        claim: 'Stylistic variations indicate sequential carving phases continuing under later Rashtrakuta monarchs into the 9th century.',
        evidence_ids: ['E2'],
        citations: ['Indian Architecture (Buddhist and Hindu Periods) (1942), p. 86'],
      },
    },
  ],
  verified_citations: [
    'Archaeological Survey of Western India, Vol. V (1883), p. 28',
    'Indian Architecture (Buddhist and Hindu Periods) (1942), p. 86',
  ],
  has_sufficient_evidence: true,
  limitations: [],
  provider_info: {
    provider: 'local-ollama',
    model: 'llama3.2:3b',
  },
};

const DEMO_INSUFFICIENT_RESPONSE: AssistantAskResponse = {
  question: 'What was the administrative grain tax rate levied on villages near Ellora in 760 CE?',
  answer:
    'No sufficiently relevant archival passages were retrieved from the indexed corpus to answer this query. The indexed collection (Archaeological Survey of Western India and Epigraphia Indica) primarily documents architectural measurements, rock-cut sculpture, and religious dedication grants rather than routine agrarian tax assessments.',
  grounding_state: 'insufficient_evidence',
  claims: [],
  missing_information: [
    'Agrarian revenue assessments and village grain tax rates for the Aurangabad region during the early Rashtrakuta period.',
  ],
  conflicts: [],
  verified_citations: [],
  has_sufficient_evidence: false,
  limitations: [
    'Corpus limited to architectural surveys and religious dedication grants; routine agrarian taxation records are absent from the collection.',
  ],
  provider_info: {
    provider: 'local-ollama',
    model: 'llama3.2:3b',
  },
};

export default function ResearchAssistantSection({
  availableDocuments,
  onInspectSource,
  onOpenUpload,
  backendConnected,
}: ResearchAssistantSectionProps) {
  const [question, setQuestion] = useState<string>('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<AssistantAskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filterSelectId = useId();

  const effectiveDocuments =
    availableDocuments.length > 0 ? availableDocuments : SAMPLE_DOCUMENTS;

  const handleSelectAllDocs = () => {
    setSelectedDocIds([]);
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSubmitInquiry = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const docFilter = selectedDocIds.length > 0 ? selectedDocIds : undefined;
      const result = await askAssistant(trimmed, docFilter);
      setResponse(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'An error occurred during inquiry processing';
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

  // Visual configuration for each grounding state with Parchment & Burgundy tokens
  const getGroundingBadge = (state: GroundingStateType) => {
    switch (state) {
      case 'grounded':
        return {
          title: 'Relevant Archival Evidence Retrieved',
          desc: 'Relevant archival evidence retrieved. Claims are attributed to cited passages; semantic entailment is not independently verified.',
          border: 'border-[#BCD0C3]',
          bg: 'bg-[#EDF3EF]',
          badgeBg: 'bg-[#FFFCF5] text-[#52745E] border-[#BCD0C3]',
          icon: <ShieldCheck className="w-5 h-5 text-[#52745E]" />,
        };
      case 'partial':
        return {
          title: 'Partial Archival Evidence',
          desc: 'Partial archival evidence retrieved. Some elements are documented in cited passages, but the archive does not fully answer every aspect of this inquiry; semantic entailment is not independently verified.',
          border: 'border-[#E8D3B2]',
          bg: 'bg-[#FAF4E9]',
          badgeBg: 'bg-[#FFFCF5] text-[#A67C3F] border-[#E8D3B2]',
          icon: <AlertTriangle className="w-5 h-5 text-[#A67C3F]" />,
        };
      case 'conflicting_evidence':
        return {
          title: 'Conflicting Archival Accounts',
          desc: 'Conflicting archival accounts retrieved. Differing statements or divergent records were identified across the cited archival documents; semantic entailment is not independently verified.',
          border: 'border-[#DBC2C5]',
          bg: 'bg-[#F8F0F1]',
          badgeBg: 'bg-[#FFFCF5] text-[#814B52] border-[#DBC2C5]',
          icon: <AlertCircle className="w-5 h-5 text-[#814B52]" />,
        };
      case 'insufficient_evidence':
        return {
          title: 'Insufficient Archival Evidence',
          desc: 'No sufficiently relevant passages were identified in the indexed corpus for this question.',
          border: 'border-[#DED3C2]',
          bg: 'bg-[#EFE8DC]',
          badgeBg: 'bg-[#FFFCF5] text-[#59524E] border-[#DED3C2]',
          icon: <HelpCircle className="w-5 h-5 text-[#756D66]" />,
        };
      case 'provider_unavailable':
        return {
          title: 'Local AI Provider Offline',
          desc: 'The Ollama local inference service is currently unreachable or the specified model is not loaded.',
          border: 'border-[#E8BDB9]',
          bg: 'bg-[#FAEEEE]',
          badgeBg: 'bg-[#FFFCF5] text-[#A94B43] border-[#E8BDB9]',
          icon: <Server className="w-5 h-5 text-[#A94B43]" />,
        };
      case 'malformed_output':
        return {
          title: 'Unparseable Model Response',
          desc: 'The local model returned a response that could not be parsed into the structured schema.',
          border: 'border-[#E8D3B2]',
          bg: 'bg-[#FAF4E9]',
          badgeBg: 'bg-[#FFFCF5] text-[#A67C3F] border-[#E8D3B2]',
          icon: <AlertTriangle className="w-5 h-5 text-[#A67C3F]" />,
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DED3C2]">
        <div>
          <div className="inline-block text-[11px] font-mono tracking-wider uppercase text-[#814B52] font-semibold mb-1">
            Grounded Research Assistant
          </div>
          <h1 className="text-xl sm:text-2xl font-heritage font-bold text-[#642F38] tracking-tight">
            Archival Research &amp; Epigraphic Assistant
          </h1>
          <p className="text-xs sm:text-sm text-[#59524E] font-serif mt-0.5 max-w-2xl">
            Inquire across colonial gazetteers, architectural blueprints, and epigraphical reports.
            Every claim is attributed to specific page-level passages from retrieved archival documents.
          </p>
        </div>

        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {!backendConnected && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8BDB9] bg-[#FAEEEE] text-xs text-[#A94B43] font-medium">
              <Server className="w-3.5 h-3.5" />
              <span>Backend Offline</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#DED3C2] bg-[#FFFCF5] text-xs">
            <BookOpen className="w-4 h-4 text-[#A77C54]" />
            <span className="text-[#756D66]">Corpus:</span>
            <span className="font-semibold text-[#393331]">
              {effectiveDocuments.length} {effectiveDocuments.length === 1 ? 'Volume' : 'Volumes'} (1,188 Folios)
            </span>
          </div>
        </div>
      </div>

      {/* Inquiry Form Card */}
      <div className="p-5 sm:p-6 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs space-y-4">
        <form onSubmit={handleSubmitInquiry} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="research-inquiry"
                className="text-xs sm:text-sm font-semibold text-[#393331] font-heritage flex items-center gap-2"
              >
                <Search className="w-4 h-4 text-[#642F38]" />
                Historical Research Inquiry
              </label>
              <span
                className={`text-[11px] font-mono ${
                  question.length > 950 ? 'text-[#A94B43]' : 'text-[#756D66]'
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
              className="w-full px-4 py-3 rounded-lg border border-[#DED3C2] bg-[#FFFCF5] text-sm text-[#393331] placeholder:text-[#9E958D] focus:outline-none focus:ring-1 focus:ring-[#642F38] focus:border-[#642F38] transition font-serif"
              disabled={isLoading}
              aria-label="Research Question or Inquiry"
            />
            <div className="text-[11px] text-[#756D66] mt-1 flex justify-between font-serif">
              <span>Press Ctrl+Enter (or Cmd+Enter) to submit inquiry</span>
            </div>
          </div>

          {/* Suggested Inquiries */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#756D66] font-semibold mb-2">
              Suggested Historical Inquiries:
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_INQUIRIES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setQuestion(sample)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-md text-xs border border-[#DED3C2] bg-[#EFE8DC] hover:bg-[#E8E0D2] hover:border-[#642F38]/50 text-[#393331] text-left transition disabled:opacity-40 cursor-pointer font-serif"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Archival Scenario Demonstrators */}
          <div className="pt-2 border-t border-[#EBE4D8] flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-[#59524E] flex items-center gap-1 font-serif">
              <Eye className="w-3.5 h-3.5 text-[#642F38]" />
              Scenario Previews:
            </span>
            <button
              type="button"
              onClick={() => {
                setQuestion('Who commissioned the Kailash monolithic temple at Cave 16 and what inscriptions are recorded?');
                setResponse(DEMO_GROUNDED_RESPONSE);
                setError(null);
              }}
              className="px-2.5 py-1 rounded-md text-xs border border-[#BCD0C3] bg-[#EDF3EF] text-[#52745E] hover:bg-[#d8e6dc] transition cursor-pointer font-serif"
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
              className="px-2.5 py-1 rounded-md text-xs border border-[#DBC2C5] bg-[#F8F0F1] text-[#814B52] hover:bg-[#eedee0] transition cursor-pointer font-serif"
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
              className="px-2.5 py-1 rounded-md text-xs border border-[#DED3C2] bg-[#EFE8DC] text-[#59524E] hover:bg-[#E8E0D2] transition cursor-pointer font-serif"
            >
              Insufficient Evidence
            </button>
          </div>

          {/* Document Scoping / Filtering */}
          <div className="pt-2 border-t border-[#EBE4D8]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label
                htmlFor={filterSelectId}
                className="text-xs font-semibold text-[#393331] flex items-center gap-1.5 font-serif"
              >
                <Filter className="w-3.5 h-3.5 text-[#642F38]" />
                Archival Scope:
                <span className="font-normal text-[#756D66]">
                  {selectedDocIds.length === 0
                    ? 'All indexed monographs in corpus'
                    : `Filtered to ${selectedDocIds.length} selected ${
                        selectedDocIds.length === 1 ? 'document' : 'documents'
                      }`}
                </span>
              </label>

              {selectedDocIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllDocs}
                  className="text-xs text-[#642F38] hover:underline cursor-pointer font-serif"
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
                className={`px-3 py-1 rounded-md text-xs font-serif transition cursor-pointer ${
                  selectedDocIds.length === 0
                    ? 'bg-[#642F38] text-[#FFFCF5] font-medium shadow-xs'
                    : 'bg-[#EFE8DC] text-[#393331] border border-[#DED3C2] hover:bg-[#E8E0D2]'
                }`}
              >
                Entire Corpus ({effectiveDocuments.length})
              </button>

              <button
                type="button"
                onClick={onOpenUpload}
                aria-label="Upload document to archive"
                className="px-2.5 py-1 rounded-md text-xs font-serif border border-dashed border-[#DED3C2] text-[#756D66] hover:border-[#642F38] hover:text-[#642F38] transition cursor-pointer"
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
                    className={`px-2.5 py-1 rounded-md text-xs border flex items-center gap-1.5 transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#FAF2F3] text-[#642F38] border-[#642F38] font-semibold'
                        : 'bg-[#EFE8DC] text-[#393331] border-[#DED3C2] hover:bg-[#E8E0D2]'
                    }`}
                  >
                    <FileText className="w-3 h-3 text-[#A77C54] shrink-0" />
                    <span className="truncate max-w-[180px] font-serif">{doc.original_filename.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-[#756D66] shrink-0 font-mono">({doc.page_count}p)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-[#756D66] flex items-center gap-1.5 font-serif">
              <ShieldCheck className="w-4 h-4 text-[#52745E] shrink-0" />
              <span>Attributed Provenance: Claims link directly to verified page folios; semantic entailment is not independently verified.</span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {(question || response || error) && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isLoading}
                  className="px-3 py-2 rounded-lg text-xs text-[#756D66] hover:bg-[#EFE8DC] transition cursor-pointer font-serif"
                  aria-label="Clear inquiry input and results"
                >
                  Clear
                </button>
              )}

              <button
                type="submit"
                disabled={isLoading || !question.trim() || !backendConnected}
                className="px-5 py-2 rounded-lg text-xs sm:text-sm font-serif font-medium text-[#FFFCF5] bg-[#642F38] hover:bg-[#50252C] disabled:opacity-50 disabled:pointer-events-none transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#FFFCF5]" />
                    <span>Consulting Archive...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#FFFCF5]" />
                    <span>Inquire with Assistant</span>
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
          className="p-6 rounded-xl border border-[#DED3C2] bg-[#FAF4E9] text-center space-y-4 animate-pulse"
        >
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-[#FFFCF5] text-[#642F38] border border-[#E8D3B2]">
              <Sparkles className="w-5 h-5 animate-spin" />
            </div>
          </div>
          <div>
            <h3 className="font-heritage font-bold text-[#642F38] text-base">
              Executing Evidence-Grounded Research Pipeline
            </h3>
            <p className="text-xs text-[#59524E] mt-1 max-w-md mx-auto font-serif">
              Scanning vector representations of archival passages, merging contiguous contexts, and
              synthesizing attributed claims with the local inference provider.
            </p>
          </div>
          <div className="flex justify-center gap-6 text-[11px] font-mono text-[#756D66]">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#52745E]" /> Vector Retrieval
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#52745E]" /> Evidence Attribution
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 text-[#642F38] animate-spin" /> Grounded Synthesis
            </span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && !isLoading && (
        <div
          role="alert"
          className="p-4 sm:p-5 rounded-xl border border-[#E8BDB9] bg-[#FAEEEE] space-y-3"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#A94B43] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#A94B43]">
                Inquiry Processing Notice
              </h3>
              <p className="text-xs text-[#A94B43] leading-relaxed break-words font-serif">{error}</p>
            </div>
          </div>

          {error.toLowerCase().includes('ollama') || error.toLowerCase().includes('cannot reach') ? (
            <div className="p-3 rounded-lg bg-[#FFFCF5] border border-[#E8BDB9] text-xs text-[#393331] space-y-1 font-mono">
              <div className="font-semibold text-[#642F38] font-serif">
                Local Ollama Service Instructions:
              </div>
              <div>1. Verify Ollama is running: <code className="bg-[#EFE8DC] px-1 rounded">ollama serve</code></div>
              <div>2. Ensure model is installed: <code className="bg-[#EFE8DC] px-1 rounded">ollama run llama3.2:3b</code></div>
              <div>3. API Endpoint: <code className="bg-[#EFE8DC] px-1 rounded">http://127.0.0.1:11434</code></div>
            </div>
          ) : null}
        </div>
      )}

      {/* Response Display Area */}
      {response && !isLoading && (
        <div className="space-y-4">
          {/* Grounding State Header Badge */}
          {(() => {
            const badge = getGroundingBadge(response.grounding_state);
            return (
              <div
                role="status"
                className={`p-4 rounded-xl border ${badge.border} ${badge.bg} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">{badge.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-heritage font-bold text-[#393331]">
                        {badge.title}
                      </h2>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${badge.badgeBg}`}
                      >
                        {response.grounding_state}
                      </span>
                    </div>
                    <p className="text-xs text-[#59524E] mt-0.5 leading-relaxed font-serif">
                      {badge.desc}
                    </p>
                  </div>
                </div>

                {response.provider_info && (
                  <div className="text-right text-[11px] font-mono text-[#756D66] shrink-0">
                    <div>Provider: {response.provider_info.provider}</div>
                    <div className="text-[#642F38] font-semibold">
                      Model: {response.provider_info.model}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Synthesized Answer */}
          {response.answer && (
            <div className="p-5 sm:p-6 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs space-y-2">
              <h2 className="text-[10px] font-mono uppercase tracking-wider text-[#814B52] font-semibold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#642F38]" />
                Archival Synthesis
              </h2>
              <div className="text-sm sm:text-base font-serif text-[#393331] leading-relaxed whitespace-pre-line break-words">
                {response.answer}
              </div>
            </div>
          )}

          {/* Structured Attributed Claims */}
          {response.claims && response.claims.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-heritage font-bold text-[#393331] uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#52745E]" />
                  Attributed Archival Claims &amp; Citations ({response.claims.length})
                </h2>
                <span className="text-[11px] text-[#756D66] font-serif">
                  Click any citation to inspect the original archival page
                </span>
              </div>

              <div className="space-y-3">
                {response.claims.map((claim, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs space-y-3 hover:border-[#642F38]/50 transition-colors"
                  >
                    {/* Claim text */}
                    <div className="flex items-start gap-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EFE8DC] text-[#642F38] border border-[#DED3C2] shrink-0 mt-0.5">
                        Claim #{index + 1}
                      </span>
                      <p className="text-xs sm:text-sm text-[#393331] leading-relaxed font-serif break-words">
                        {claim.text}
                      </p>
                    </div>

                    {/* Citations List */}
                    {claim.evidence && claim.evidence.length > 0 ? (
                      <div className="pt-2 border-t border-[#EBE4D8] flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-[#756D66] font-serif font-medium">
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
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-[#DED3C2] bg-[#EFE8DC] hover:bg-[#E8E0D2] hover:border-[#642F38] text-[#393331] transition group cursor-pointer shadow-xs"
                              title={ev.citation_display || (hasPrinted ? `Printed page ${ev.printed_page_label} · PDF page ${pdfPage}` : `PDF page ${pdfPage} · Printed page unavailable`)}
                            >
                              <span className="font-mono text-[10px] bg-[#FFFCF5] border border-[#DED3C2] px-1 rounded font-bold text-[#642F38]">
                                {ev.evidence_id}
                              </span>
                              <span className="truncate max-w-[140px] sm:max-w-[200px] font-serif text-[#393331]">
                                {ev.filename.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[#642F38] font-semibold text-[11px] font-mono">
                                · {hasPrinted ? `Printed p. ${ev.printed_page_label} (PDF p. ${pdfPage})` : `PDF p. ${pdfPage}`}
                              </span>
                              <ExternalLink className="w-3 h-3 text-[#642F38] opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#756D66] italic font-serif">
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
            <div className="p-4 rounded-xl border border-[#E8D3B2] bg-[#FAF4E9] space-y-2">
              <h2 className="text-xs font-semibold text-[#A67C3F] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#A67C3F]" />
                Archival Limits &amp; Missing Information
              </h2>
              <p className="text-xs text-[#59524E] font-serif">
                The indexed historical documents do not contain records for the following details:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-[#59524E] font-serif">
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
            <div className="p-4 rounded-xl border border-[#DBC2C5] bg-[#F8F0F1] space-y-3">
              <h2 className="text-xs font-semibold text-[#814B52] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#814B52]" />
                Conflicting Historical Perspectives Detected ({response.conflicts.length})
              </h2>
              <div className="space-y-3">
                {response.conflicts.map((conf, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-3.5 rounded-lg border border-[#DBC2C5] bg-[#FFFCF5] space-y-2 text-xs"
                  >
                    <div className="font-semibold text-[#642F38] font-heritage break-words">
                      Discrepancy: {conf.topic}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-2.5 rounded-md bg-[#F6F1E7] border border-[#DED3C2] space-y-1">
                        <span className="text-[10px] font-mono font-bold text-[#A67C3F] uppercase">
                          Account A
                        </span>
                        <p className="text-[#393331] font-serif break-words">{conf.perspective_a.claim}</p>
                        <div className="text-[10px] font-mono text-[#756D66] break-words">
                          Evidence: {conf.perspective_a.evidence_ids.join(', ')}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-md bg-[#F6F1E7] border border-[#DED3C2] space-y-1">
                        <span className="text-[10px] font-mono font-bold text-[#814B52] uppercase">
                          Account B
                        </span>
                        <p className="text-[#393331] font-serif break-words">{conf.perspective_b.claim}</p>
                        <div className="text-[10px] font-mono text-[#756D66] break-words">
                          Evidence: {conf.perspective_b.evidence_ids.join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Epistemological Limitation Disclaimer */}
          <div className="p-3.5 rounded-xl border border-[#DED3C2] bg-[#F6F1E7] flex items-start gap-2.5 text-xs text-[#756D66]">
            <Info className="w-4 h-4 text-[#A77C54] shrink-0 mt-0.5" />
            <div className="leading-relaxed font-serif">
              <span className="font-semibold text-[#393331]">
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

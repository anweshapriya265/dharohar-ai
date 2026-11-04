'use client';

import React, { useState } from 'react';
import {
  Search,
  X,
  Sparkles,
  Loader2,
  FileText,
  ShieldCheck,
  Eye,
  AlertCircle,
  Database,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { SearchResultItem, SearchResponse } from '@/lib/api';

interface SearchSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  isSearching: boolean;
  searchResults: SearchResultItem[];
  searchResponse: SearchResponse | null;
  searchError: string | null;
  hasSearched: boolean;
  totalIndexedDocs: number;
  onInspectSource: (documentId: string, pageNumber: number) => void;
  onClearSearch: () => void;
}

export default function SearchSection({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  isSearching,
  searchResults,
  searchResponse,
  searchError,
  hasSearched,
  totalIndexedDocs,
  onInspectSource,
  onClearSearch,
}: SearchSectionProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && !isSearching) {
      onSearchSubmit(searchQuery);
    }
  };

  const formatScore = (score: number): string => {
    const pct = Math.max(0, Math.min(100, Math.round(score * 100)));
    return `${pct}% Relevance`;
  };

  return (
    <div className="rounded-xl border border-[#DED3C2] bg-[#FFFCF5] p-5 sm:p-6 shadow-xs space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DED3C2]">
        <div>
          <div className="inline-block text-[11px] font-mono tracking-wider uppercase text-[#814B52] font-semibold mb-0.5">
            Archival Research Search
          </div>
          <h2 className="text-lg sm:text-xl font-heritage font-bold text-[#642F38]">
            Hybrid Archival Retrieval
          </h2>
          <p className="text-xs sm:text-sm text-[#59524E] font-serif mt-0.5">
            Search across historical gazetteers, architectural blueprints, and epigraphical reports with dual-pagination citation linkage.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#52745E]">
          <ShieldCheck className="w-4 h-4 text-[#52745E]" />
          <span className="font-mono text-[11px]">Strict Provenance Grounding</span>
        </div>
      </div>

      {/* Search Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#756D66]">
              <Search className="w-4 h-4" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search historical terms, dimensions, or inscriptions (e.g. '107 feet deep', 'Dantidurga reign', 'Cave 16')..."
              className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] text-[#393331] placeholder:text-[#9E958D] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#642F38]/20 focus:border-[#642F38] transition font-serif shadow-2xs"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute inset-y-0 right-10 pr-2 flex items-center text-[#756D66] hover:text-[#642F38]"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-mono text-[#756D66]">
              <kbd className="px-1.5 py-0.5 rounded bg-[#EFE8DC] border border-[#DED3C2]">
                /
              </kbd>
            </div>
          </div>

          <button
            type="submit"
            disabled={!searchQuery.trim() || isSearching}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] text-xs sm:text-sm font-serif font-medium shadow-xs hover:shadow-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#FFFCF5]" />
                <span className="hidden sm:inline">Searching...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#FFFCF5]" />
                <span>Search</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Expandable Technical Information Panel */}
      <div className="border border-[#EBE4D8] rounded-lg bg-[#F6F1E7] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full px-3.5 py-2 flex items-center justify-between text-xs text-[#756D66] hover:text-[#393331] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5 font-serif font-medium">
            <Info className="w-3.5 h-3.5 text-[#A77C54]" />
            How Hybrid Retrieval Works (Dense Semantic + FTS5 BM25)
          </span>
          {showTechnicalDetails ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showTechnicalDetails && (
          <div className="p-3.5 border-t border-[#EBE4D8] bg-[#FFFCF5] text-xs text-[#59524E] space-y-2 font-serif leading-relaxed">
            <p>
              Archival research requires both <strong>conceptual understanding</strong> (e.g. &ldquo;monolithic excavation methods&rdquo;) and <strong>exact keyword precision</strong> (e.g. dates, measurements, Sanskrit titles, and inscription citations).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px] font-sans">
              <div className="p-2.5 rounded bg-[#F6F1E7] border border-[#DED3C2]">
                <strong className="block text-[#642F38] font-mono text-[10px] uppercase">1. Dense Semantic</strong>
                Encodes inquiries into 384-dimensional vectors with all-MiniLM-L6-v2. Matches conceptually related text even when exact words differ.
              </div>
              <div className="p-2.5 rounded bg-[#F6F1E7] border border-[#DED3C2]">
                <strong className="block text-[#642F38] font-mono text-[10px] uppercase">2. SQLite FTS5 BM25</strong>
                Matches exact historical names, transliterations, and numbers with Porter stemming and OCR-aware token normalization.
              </div>
              <div className="p-2.5 rounded bg-[#F6F1E7] border border-[#DED3C2]">
                <strong className="block text-[#642F38] font-mono text-[10px] uppercase">3. Rank Fusion (RRF)</strong>
                Blends both result sets via Reciprocal Rank Fusion ($k=60$) with an eligible candidate floor (0.10) to avoid false exclusions.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search State Outputs */}
      {isSearching && (
        <div className="p-8 rounded-lg bg-[#F6F1E7] border border-[#DED3C2] text-center flex flex-col items-center justify-center gap-2 text-[#756D66]">
          <Loader2 className="w-5 h-5 animate-spin text-[#642F38]" />
          <p className="text-xs font-serif">Computing vector embeddings &amp; querying FTS5 index...</p>
        </div>
      )}

      {/* Error state */}
      {!isSearching && searchError && (
        <div className="p-3.5 rounded-lg bg-[#FAEEEE] border border-[#E8BDB9] text-xs text-[#A94B43] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#A94B43] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold">Search Request Notice:</span>
            <p className="opacity-95 font-serif">{searchError}</p>
          </div>
        </div>
      )}

      {/* Results state */}
      {!isSearching && hasSearched && !searchError && (
        <div className="space-y-3 pt-1">
          {totalIndexedDocs === 0 ? (
            <div className="p-8 rounded-lg border border-[#DED3C2] bg-[#F6F1E7] text-center space-y-1.5">
              <Database className="w-6 h-6 mx-auto text-[#756D66]" />
              <h3 className="text-xs sm:text-sm font-heritage font-bold text-[#393331]">
                Archive Has No Indexed Documents
              </h3>
              <p className="text-xs text-[#756D66] max-w-md mx-auto font-serif">
                Upload historical PDFs to begin semantic and keyword retrieval.
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 rounded-lg border border-[#DED3C2] bg-[#F6F1E7] text-center space-y-1">
              <Search className="w-6 h-6 mx-auto text-[#756D66]" />
              <h3 className="text-xs sm:text-sm font-heritage font-bold text-[#393331]">
                No Relevant Archival Passages Found
              </h3>
              <p className="text-xs text-[#756D66] font-serif">
                No indexed passages matched &quot;{searchQuery}&quot;. Try different historical terms or general architectural concepts.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#756D66] px-1 font-serif">
                <span className="font-medium text-[#393331]">
                  Found {searchResults.length} {searchResults.length === 1 ? 'passage' : 'passages'} for &quot;{searchResponse?.query}&quot;
                </span>
                <span className="font-mono text-[11px] text-[#642F38]">
                  Engine: Calibrated Hybrid (RRF k=60)
                </span>
              </div>

              {/* Passages List */}
              <div className="space-y-3">
                {searchResults.map((item) => (
                  <div
                    key={item.chunk_id}
                    className="p-4 sm:p-5 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] space-y-3 hover:border-[#642F38] hover:shadow-[0_4px_16px_-2px_rgba(57,51,49,0.08)] transition-all duration-150 shadow-2xs group"
                  >
                    {/* Header: Document, Page, Score */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden flex-wrap">
                        <FileText className="w-4 h-4 text-[#A77C54] shrink-0" />
                        <span className="font-bold text-[#393331] truncate max-w-xs sm:max-w-md font-heritage">
                          {item.original_filename.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#EFE8DC] text-[#393331] border border-[#DED3C2]">
                          PDF Page {item.pdf_page_index ?? item.page_number}
                        </span>
                        {item.printed_page_label ? (
                          <span className="font-serif text-[10px] px-2 py-0.5 rounded bg-[#FAF2F3] text-[#642F38] border border-[#642F38]/30 font-medium">
                            Printed Page {item.printed_page_label}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#EFE8DC] text-[#756D66] italic border border-[#DED3C2]">
                            Printed page unavailable
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {item.retrieval_source && (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#EFE8DC] text-[#642F38] border border-[#DED3C2]">
                            {item.retrieval_source === 'both' ? 'Hybrid Match' : `${item.retrieval_source} Match`}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                            item.similarity_score >= 0.5
                              ? 'bg-[#EDF3EF] text-[#52745E] border border-[#BCD0C3]'
                              : 'bg-[#FAF4E9] text-[#A67C3F] border border-[#E8D3B2]'
                          }`}
                        >
                          {formatScore(item.similarity_score)}
                        </span>
                      </div>
                    </div>

                    {/* Passage Quote */}
                    <div className="p-3.5 rounded-lg bg-[#F6F1E7] border border-[#DED3C2] text-xs sm:text-[13px] leading-relaxed text-[#393331] font-serif">
                      &ldquo;{item.text}&rdquo;
                    </div>

                    {/* Footer: Provenance link & inspect action */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#756D66]">
                      <div className="flex items-center gap-1.5 font-mono text-[#642F38] text-[10px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#52745E]" />
                        <span>Citation: {item.source_citation}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onInspectSource(item.document_id, item.pdf_page_index ?? item.page_number)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#EFE8DC] hover:bg-[#642F38] text-[#393331] hover:text-[#FFFCF5] text-xs font-serif font-medium border border-[#DED3C2] hover:border-[#642F38] transition-all duration-150 shadow-2xs cursor-pointer"
                        title={item.citation_display || (item.printed_page_label ? `Printed page ${item.printed_page_label} · PDF page ${item.pdf_page_index ?? item.page_number}` : `PDF page ${item.pdf_page_index ?? item.page_number} · Printed page unavailable`)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect PDF Page {item.pdf_page_index ?? item.page_number}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

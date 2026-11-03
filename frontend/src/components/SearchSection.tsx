'use client';

import React from 'react';
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && !isSearching) {
      onSearchSubmit(searchQuery);
    }
  };

  const formatScore = (score: number): string => {
    const pct = Math.max(0, Math.min(100, Math.round(score * 100)));
    return `${pct}% Match (${score.toFixed(2)})`;
  };

  return (
    <div className="rounded-2xl border border-[#2e2923] bg-[#12100e] p-5 sm:p-6 shadow-xl space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2e2923]">
        <div>
          <h2 className="text-base font-serif font-bold text-[#fcf9f2] font-heritage flex items-center gap-2">
            <span>Semantic Hybrid Retrieval</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-[#1f1910] text-[#eed27c] border border-[#d4af37]/40">
              Dense Vector + FTS5 BM25
            </span>
          </h2>
          <p className="text-xs text-[#9c9282] mt-0.5">
            Query across historical gazetteers, blue-prints, and epigraphical reports with dual-pagination citation linkage.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#eed27c]">
          <ShieldCheck className="w-4 h-4 text-[#3ba87e]" />
          <span className="font-mono text-[11px]">Strict Provenance Grounding</span>
        </div>
      </div>

      {/* Search Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9c9282]">
              <Search className="w-4 h-4" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search historical terms, dimensions, or inscriptions (e.g. '107 feet deep', 'Dantidurga reign', 'z.c. 200')..."
              className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-[#2e2923] bg-[#181613] text-[#fcf9f2] placeholder-[#6e6659] text-xs sm:text-sm focus:outline-none focus:border-[#d4af37] transition-all"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute inset-y-0 right-10 pr-2 flex items-center text-[#9c9282] hover:text-[#fcf9f2]"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-mono text-[#9c9282]">
              <kbd className="px-1.5 py-0.5 rounded bg-[#100e0c] border border-[#2e2923]">
                /
              </kbd>
            </div>
          </div>

          <button
            type="submit"
            disabled={!searchQuery.trim() || isSearching}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b89124] text-[#080706] text-xs sm:text-sm font-serif font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Retrieving...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Search</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Search State Outputs */}
      {isSearching && (
        <div className="p-8 rounded-xl bg-[#161411] border border-[#2e2923] text-center flex flex-col items-center justify-center gap-2 text-[#9c9282]">
          <Loader2 className="w-6 h-6 animate-spin text-[#d4af37]" />
          <p className="text-xs font-serif">Computing 384-dimensional dense vectors &amp; SQLite FTS5 ranks...</p>
        </div>
      )}

      {/* Error state */}
      {!isSearching && searchError && (
        <div className="p-3.5 rounded-xl bg-[#221010] border border-[#c53838]/40 text-xs text-[#c53838] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#c53838] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold">Search Request Error:</span>
            <p className="opacity-90">{searchError}</p>
          </div>
        </div>
      )}

      {/* Results state */}
      {!isSearching && hasSearched && !searchError && (
        <div className="space-y-3 pt-1">
          {totalIndexedDocs === 0 ? (
            <div className="p-8 rounded-xl border border-[#2e2923] bg-[#161411] text-center space-y-2">
              <Database className="w-8 h-8 mx-auto text-[#6e6659]" />
              <h3 className="text-xs sm:text-sm font-serif font-bold text-[#fcf9f2]">
                Archive Has No Indexed Documents
              </h3>
              <p className="text-xs text-[#9c9282] max-w-md mx-auto">
                No documents are currently indexed in the semantic knowledge repository. Ingest historical PDFs to enable semantic search.
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 rounded-xl border border-[#2e2923] bg-[#161411] text-center space-y-1.5">
              <Search className="w-6 h-6 mx-auto text-[#6e6659]" />
              <h3 className="text-xs sm:text-sm font-serif font-bold text-[#fcf9f2]">
                No Relevant Archival Passages Found
              </h3>
              <p className="text-xs text-[#9c9282]">
                No indexed passages matched &quot;{searchQuery}&quot;. Try different historical terms or general architectural concepts.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#9c9282] px-1">
                <span className="font-medium text-[#ded6c5]">
                  Found {searchResults.length} {searchResults.length === 1 ? 'passage' : 'passages'} for &quot;{searchResponse?.query}&quot;
                </span>
                <span className="font-mono text-[11px] text-[#eed27c]">
                  Engine: Calibrated Hybrid (RRF k=60)
                </span>
              </div>

              {/* Passages List */}
              <div className="space-y-3">
                {searchResults.map((item) => (
                  <div
                    key={item.chunk_id}
                    className="p-4 rounded-xl border border-[#2e2923] bg-[#161411] space-y-3 hover:border-[#d4af37]/60 transition-all"
                  >
                    {/* Header: Document, Page, Score */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden flex-wrap">
                        <FileText className="w-4 h-4 text-[#d4af37] shrink-0" />
                        <span className="font-semibold text-[#fcf9f2] truncate max-w-xs sm:max-w-md font-serif font-heritage">
                          {item.original_filename}
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#100e0c] text-[#ded6c5] border border-[#2e2923]">
                          PDF Page {item.pdf_page_index ?? item.page_number}
                        </span>
                        {item.printed_page_label ? (
                          <span className="font-serif text-[10px] px-2 py-0.5 rounded bg-[#1f1910] text-[#eed27c] border border-[#d4af37]/40 font-medium">
                            Printed Page {item.printed_page_label}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#100e0c] text-[#6e6659] italic border border-[#2e2923]">
                            Printed page unavailable
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {item.retrieval_source && (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#100e0c] text-[#eed27c] border border-[#2e2923]">
                            {item.retrieval_source === 'both' ? 'Hybrid Match' : `${item.retrieval_source} Match`}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                            item.similarity_score >= 0.5
                              ? 'bg-[#0d1e17] text-[#3ba87e] border border-[#3ba87e]/30'
                              : 'bg-[#1f1910] text-[#eed27c] border border-[#d4af37]/30'
                          }`}
                        >
                          {formatScore(item.similarity_score)}
                        </span>
                      </div>
                    </div>

                    {/* Passage Quote */}
                    <div className="p-3.5 rounded-xl bg-[#12100e] border border-[#2e2923] text-xs sm:text-[13px] leading-relaxed text-[#ded6c5] font-serif">
                      &ldquo;{item.text}&rdquo;
                    </div>

                    {/* Footer: Provenance link & inspect action */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#9c9282]">
                      <div className="flex items-center gap-1.5 font-mono text-[#eed27c] text-[10px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#3ba87e]" />
                        <span>Citation: {item.source_citation}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onInspectSource(item.document_id, item.pdf_page_index ?? item.page_number)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1c1915] hover:bg-[#25211b] text-[#eed27c] text-xs font-serif font-medium border border-[#2e2923] transition-colors cursor-pointer"
                        title={item.citation_display || (item.printed_page_label ? `Printed page ${item.printed_page_label} · PDF page ${item.pdf_page_index ?? item.page_number}` : `PDF page ${item.pdf_page_index ?? item.page_number} · Printed page unavailable`)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect PDF Page {item.pdf_page_index ?? item.page_number}</span>
                        <ArrowRight className="w-3 h-3 text-[#9c9282]" />
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

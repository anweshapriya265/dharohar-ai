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
  const sampleQueries = [
    'Adalaj Stepwell subterranean water architecture',
    'Kailasa Temple monolithic rock-cut carving technique',
    'Hampi Vijayanagara aqueducts & water distribution',
    'Modhera Sun Temple Solanki architecture',
    'Rashtrakuta dynasty epigraphical inscriptions',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && !isSearching) {
      onSearchSubmit(searchQuery);
    }
  };

  const handleChipClick = (query: string) => {
    onSearchChange(query);
    onSearchSubmit(query);
  };

  const formatScore = (score: number): string => {
    const pct = Math.max(0, Math.min(100, Math.round(score * 100)));
    return `${pct}% Match (${score.toFixed(2)})`;
  };

  return (
    <div className="rounded-2xl border border-[#e5dfd5] bg-white p-5 sm:p-6 shadow-heritage space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
        <div>
          <h2 className="text-base sm:text-lg font-serif font-bold text-stone-900 font-heritage flex items-center gap-2">
            <span>Semantic Vector Knowledge Retrieval</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-[#fbeee9] text-[#9c381e] border border-[#f0d4ca]">
              384-dim Embeddings
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Query across historical gazetteers, architectural monographs, and epigraphical field reports with strict page-level evidence
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#2d5e4a] bg-[#edf5f1] border border-[#c3dcd0] px-2.5 py-1 rounded-full shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="font-semibold text-[11px]">Strict Zero-Hallucination Grounding</span>
        </div>
      </div>

      {/* Search Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <Search className="w-4 h-4" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Ask an architectural or historical question (e.g. 'subterranean stepwell cooling engineering')..."
              className="w-full pl-10 pr-20 py-3 rounded-xl border border-[#e5dfd5] bg-[#f7f5f0]/60 text-stone-900 placeholder-stone-400 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#9c381e]/30 focus:border-[#9c381e] transition-all"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute inset-y-0 right-10 pr-2 flex items-center text-stone-400 hover:text-stone-700"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-mono text-stone-400">
              <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">
                /
              </kbd>
            </div>
          </div>

          <button
            type="submit"
            disabled={!searchQuery.trim() || isSearching}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#9c381e] hover:bg-[#832e17] text-[#f7f5f0] text-xs sm:text-sm font-semibold shadow-2xs transition-all focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Searching...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Search</span>
              </>
            )}
          </button>
        </div>

        {/* 1-Click Quick Inquiry Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-stone-400 font-medium mr-1">Try Inquiring:</span>
          {sampleQueries.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleChipClick(q)}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-[#e5dfd5] bg-[#f7f5f0] hover:bg-[#ede7dc] text-stone-700 hover:text-stone-900 transition-colors text-left font-medium"
            >
              {q}
            </button>
          ))}
        </div>
      </form>

      {/* Loading state */}
      {isSearching && (
        <div className="p-8 rounded-xl bg-[#f7f5f0]/80 border border-[#e5dfd5] text-center flex flex-col items-center justify-center gap-2 text-stone-600">
          <Loader2 className="w-6 h-6 animate-spin text-[#9c381e]" />
          <p className="text-xs font-medium">Computing dense query vector &amp; ranking historical passages...</p>
        </div>
      )}

      {/* Error state */}
      {!isSearching && searchError && (
        <div className="p-3.5 rounded-xl bg-[#fdf0ee] border border-[#f4cbc5] text-xs text-[#a6382a] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold">Search Request Error:</span>
            <p className="opacity-90">{searchError}</p>
          </div>
        </div>
      )}

      {/* Results state */}
      {!isSearching && hasSearched && !searchError && (
        <div className="space-y-3 pt-2">
          {totalIndexedDocs === 0 ? (
            <div className="p-6 rounded-xl border border-[#e5dfd5] bg-[#f7f5f0]/60 text-center space-y-2">
              <Database className="w-8 h-8 mx-auto text-stone-400" />
              <h3 className="text-xs sm:text-sm font-semibold text-stone-800">
                No Documents Currently Indexed
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                No documents are currently indexed in the knowledge base. Ingest sample field notes or PDFs to enable semantic search.
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-6 rounded-xl border border-[#e5dfd5] bg-[#f7f5f0]/60 text-center space-y-1.5">
              <Search className="w-6 h-6 mx-auto text-stone-400" />
              <h3 className="text-xs sm:text-sm font-semibold text-stone-800">
                No Relevant Archival Passages Found
              </h3>
              <p className="text-xs text-stone-500">
                No indexed passages matched &quot;{searchQuery}&quot;. Try selecting one of the suggested query chips above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500 px-1">
                <span className="font-semibold text-stone-800">
                  Retrieved {searchResults.length} {searchResults.length === 1 ? 'passage' : 'passages'} for &quot;{searchResponse?.query}&quot;
                </span>
                <span className="font-mono text-[11px] text-[#9c381e]">
                  Cosine Similarity Ranking
                </span>
              </div>

              {/* Passages List */}
              <div className="space-y-3">
                {searchResults.map((item) => (
                  <div
                    key={item.chunk_id}
                    className="p-4 rounded-xl border border-[#e5dfd5] bg-[#f7f5f0]/40 space-y-3 hover:border-[#9c381e]/60 transition-colors shadow-2xs"
                  >
                    {/* Header: Document, Page, Score */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-[#9c381e] shrink-0" />
                        <span className="font-semibold text-stone-900 truncate max-w-xs sm:max-w-md font-serif font-heritage">
                          {item.original_filename}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                          Page {item.page_number}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                            item.similarity_score >= 0.4
                              ? 'bg-[#edf5f1] text-[#2d5e4a] border border-[#c3dcd0]'
                              : 'bg-[#fbf5eb] text-[#b67322] border border-[#f0dec3]'
                          }`}
                        >
                          {formatScore(item.similarity_score)}
                        </span>
                      </div>
                    </div>

                    {/* Passage Quote in serif editorial text */}
                    <div className="p-3 rounded-lg bg-white border border-[#e5dfd5] text-xs sm:text-[13px] leading-relaxed text-stone-800 font-serif">
                      &ldquo;{item.text}&rdquo;
                    </div>

                    {/* Footer: Provenance citation & inspect action */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-stone-500">
                      <div className="flex items-center gap-1.5 font-mono text-[#9c381e] text-[10px] font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Source Grounding: {item.source_citation}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onInspectSource(item.document_id, item.page_number)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-[#e5dfd5] hover:bg-[#fbeee9] hover:border-[#9c381e]/40 text-stone-700 hover:text-[#9c381e] text-xs font-semibold transition-colors shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Page {item.page_number}</span>
                        <ArrowRight className="w-3 h-3 text-stone-400" />
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

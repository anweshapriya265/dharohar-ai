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
    // Cosine similarity is [-1, 1], typically [0, 1] for positive similarity
    const pct = Math.max(0, Math.min(100, Math.round(score * 100)));
    return `${pct}% Match (${score.toFixed(2)})`;
  };

  return (
    <div className="rounded-xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900/90 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
        <div>
          <h2 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 font-heritage flex items-center gap-2">
            <span>Semantic Knowledge Retrieval</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              all-MiniLM-L6-v2 Embeddings
            </span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Query across historical gazetteers, architectural plans, and epigraphical reports with page-level citations
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Zero Hallucinations: Grounded to source pages</span>
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
              placeholder="Ask a question or search concepts (e.g. 'monolithic cave temple carving', 'Rashtrakuta dynasty inscription')..."
              className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-[#faf8f5]/60 dark:bg-stone-950/60 text-stone-900 dark:text-stone-100 placeholder-stone-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute inset-y-0 right-10 pr-2 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-mono text-stone-400">
              <kbd className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                /
              </kbd>
            </div>
          </div>

          <button
            type="submit"
            disabled={!searchQuery.trim() || isSearching}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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
      </form>

      {/* Search State Outputs */}
      {isSearching && (
        <div className="p-8 rounded-xl bg-stone-50/70 dark:bg-stone-950/40 border border-stone-200/60 dark:border-stone-800 text-center flex flex-col items-center justify-center gap-2 text-stone-500">
          <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
          <p className="text-xs">Computing semantic query vector &amp; ranking passages...</p>
        </div>
      )}

      {/* Error state */}
      {!isSearching && searchError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
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
            <div className="p-6 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/30 text-center space-y-2">
              <Database className="w-8 h-8 mx-auto text-stone-400" />
              <h3 className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200">
                Archive Has No Indexed Documents
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                No documents are currently indexed in the semantic knowledge repository. Ingest historical PDFs to enable semantic search.
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-6 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/30 text-center space-y-1.5">
              <Search className="w-6 h-6 mx-auto text-stone-400" />
              <h3 className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200">
                No Relevant Heritage Passages Found
              </h3>
              <p className="text-xs text-stone-500">
                No indexed passages matched &quot;{searchQuery}&quot;. Try different historical terms or general architectural themes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500 px-1">
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  Found {searchResults.length} {searchResults.length === 1 ? 'passage' : 'passages'} for &quot;{searchResponse?.query}&quot;
                </span>
                <span className="font-mono text-[11px] text-amber-800 dark:text-amber-400">
                  Mode: Semantic Vector Cosine Ranking
                </span>
              </div>

              {/* Passages List */}
              <div className="space-y-3">
                {searchResults.map((item) => (
                  <div
                    key={item.chunk_id}
                    className="p-4 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-950/40 space-y-3 hover:border-amber-400/80 transition-colors"
                  >
                    {/* Header: Document, Page, Score */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-amber-700 shrink-0" />
                        <span className="font-semibold text-stone-900 dark:text-stone-100 truncate max-w-xs sm:max-w-md font-serif font-heritage">
                          {item.original_filename}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          Page {item.page_number}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                            item.similarity_score >= 0.5
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {formatScore(item.similarity_score)}
                        </span>
                      </div>
                    </div>

                    {/* Passage Quote */}
                    <div className="p-3 rounded-lg bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 text-xs sm:text-[13px] leading-relaxed text-stone-800 dark:text-stone-200 font-serif">
                      &ldquo;{item.text}&rdquo;
                    </div>

                    {/* Footer: Provenance link & inspect action */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-stone-500">
                      <div className="flex items-center gap-1.5 font-mono text-amber-800 dark:text-amber-300 text-[10px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                        <span>Citation: {item.source_citation}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onInspectSource(item.document_id, item.page_number)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-stone-700 hover:text-amber-900 dark:text-stone-300 dark:hover:text-amber-200 text-xs font-medium transition-colors"
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

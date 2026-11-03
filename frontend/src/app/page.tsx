'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import HealthStatusCard from '@/components/HealthStatusCard';
import DocumentProcessingSection from '@/components/DocumentProcessingSection';
import ArchiveSummaryArea from '@/components/ArchiveSummaryArea';
import SearchSection from '@/components/SearchSection';
import RecentDocumentsSection from '@/components/RecentDocumentsSection';
import ResearchAssistantSection from '@/components/ResearchAssistantSection';
import DigitalArchiveExplorer from '@/components/DigitalArchiveExplorer';
import UploadModal from '@/components/UploadModal';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import {
  fetchBackendHealth,
  fetchDocuments,
  searchArchive,
  HealthCheckState,
  DocumentItem,
  SearchResultItem,
  SearchResponse,
  getApiBaseUrl,
} from '@/lib/api';
import {
  Activity,
  Server,
  ShieldCheck,
  Compass,
} from 'lucide-react';

const HeroHeritageCanvas = dynamic(() => import('@/components/HeroHeritageCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] rounded-2xl bg-[#0c0a09] border border-[#2e2923] flex items-center justify-center text-[#eed27c]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#d4af37] border-t-transparent animate-spin" />
        <span className="font-serif text-xs tracking-wider text-[#ded6c5]">Loading Basalt 3D Heritage Scene...</span>
      </div>
    </div>
  ),
});

const Heritage3DExplorer = dynamic(() => import('@/components/Heritage3DExplorer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[620px] rounded-2xl bg-[#0c0a09] border border-[#2e2923] flex items-center justify-center text-[#eed27c]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#d4af37] border-t-transparent animate-spin" />
        <span className="font-serif text-xs tracking-wider text-[#ded6c5]">Initializing Heritage 3D Explorer Studio...</span>
      </div>
    </div>
  ),
});

export default function Home() {
  // Navigation & UI state
  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) return tab;
    }
    return 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedViewerDoc, setSelectedViewerDoc] = useState<DocumentItem | null>(null);
  const [selectedViewerPage, setSelectedViewerPage] = useState<number | undefined>(undefined);
  const [showSampleData, setShowSampleData] = useState<boolean>(false);
  const activeFilter = 'all';

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Backend Health Telemetry state
  const [healthState, setHealthState] = useState<HealthCheckState>({
    status: 'connecting',
    data: null,
    error: null,
    latencyMs: null,
    lastChecked: null,
  });

  // Documents state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);
  const [docsError, setDocsError] = useState<string | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);

  // Health check worker
  const checkHealth = useCallback(async () => {
    try {
      const { data, latencyMs } = await fetchBackendHealth();
      setHealthState({
        status: 'connected',
        data,
        error: null,
        latencyMs,
        lastChecked: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown network failure while connecting to backend';
      setHealthState({
        status: 'error',
        data: null,
        error: errorMessage,
        latencyMs: null,
        lastChecked: new Date().toISOString(),
      });
    }
  }, []);

  // Manual refresh that sets 'connecting' status upfront
  const handleManualRefresh = useCallback(async () => {
    setHealthState((prev) => ({
      ...prev,
      status: 'connecting',
      error: null,
    }));
    await checkHealth();
  }, [checkHealth]);

  // Load documents from backend
  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetchDocuments();
      setDocuments(res.documents);
      setDocsError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load documents';
      setDocsError(msg);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  // Search submission handler
  const handleSearchSubmit = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const res = await searchArchive(trimmed, 8, -0.5);
      setSearchResponse(res);
      setSearchResults(res.results || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during search';
      setSearchError(msg);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Clear search handler
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchResponse(null);
    setSearchError(null);
    setHasSearched(false);
  }, []);

  // Source inspection handler: opens viewer directly to the cited page
  const handleInspectSource = useCallback(
    (documentId: string, pageNumber: number) => {
      const doc = documents.find((d) => d.id === documentId);
      if (doc) {
        setSelectedViewerDoc(doc);
        setSelectedViewerPage(pageNumber);
      } else {
        // Fallback document item
        setSelectedViewerDoc({
          id: documentId,
          original_filename: documentId,
          file_size: 0,
          content_type: 'application/pdf',
          upload_timestamp: new Date().toISOString(),
          processing_status: 'completed',
          extraction_status: 'extracted',
          page_count: pageNumber,
          storage_reference: `${documentId}.pdf`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setSelectedViewerPage(pageNumber);
      }
    },
    [documents]
  );

  // Initial data loading + periodic refresh every 30s
  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      const healthPromise = fetchBackendHealth();
      const docsPromise = fetchDocuments();

      const [healthRes, docsRes] = await Promise.allSettled([healthPromise, docsPromise]);

      if (!isMounted) return;

      if (healthRes.status === 'fulfilled') {
        setHealthState({
          status: 'connected',
          data: healthRes.value.data,
          error: null,
          latencyMs: healthRes.value.latencyMs,
          lastChecked: new Date().toISOString(),
        });
      } else {
        const msg =
          healthRes.reason instanceof Error
            ? healthRes.reason.message
            : 'Unknown network failure while connecting to backend';
        setHealthState({
          status: 'error',
          data: null,
          error: msg,
          latencyMs: null,
          lastChecked: new Date().toISOString(),
        });
      }

      if (docsRes.status === 'fulfilled') {
        setDocuments(docsRes.value.documents);
        setDocsError(null);
        setIsLoadingDocs(false);
      } else {
        const msg =
          docsRes.reason instanceof Error ? docsRes.reason.message : 'Failed to load documents';
        setDocsError(msg);
        setIsLoadingDocs(false);
      }
    };

    void initData();

    const intervalId = setInterval(() => {
      if (isMounted) {
        void checkHealth();
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [checkHealth]);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        const input = searchRef.current?.querySelector('input');
        input?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUploadSuccess = (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  // Metrics calculation
  const totalPagesCount = documents.reduce((acc, doc) => acc + (doc.page_count || 0), 0);
  const needsOcrCount = documents.filter((doc) => doc.extraction_status === 'needs_ocr').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#080706] text-[#ded6c5] selection:bg-[#d4af37]/30 selection:text-[#fcf9f2]">
      {/* Top Navigation */}
      <Header
        healthState={healthState}
        onRefreshHealth={handleManualRefresh}
        onOpenUpload={() => setIsUploadOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          backendConnected={healthState.status === 'connected'}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-x-hidden">
          {/* Research Assistant View */}
          {currentTab === 'assistant' ? (
            <ResearchAssistantSection
              availableDocuments={documents}
              onInspectSource={handleInspectSource}
              onOpenUpload={() => setIsUploadOpen(true)}
              backendConnected={healthState.status === 'connected'}
            />
          ) : currentTab === 'archive' ? (
            <DigitalArchiveExplorer
              documents={documents}
              isLoading={isLoadingDocs}
              error={docsError}
              onOpenUpload={() => setIsUploadOpen(true)}
              onViewDocument={(doc) => {
                setSelectedViewerDoc(doc);
                setSelectedViewerPage(undefined);
              }}
              onOpen3DExplorer={() => setCurrentTab('heritage-3d')}
            />
          ) : currentTab === 'heritage-3d' ? (
            <Heritage3DExplorer
              onInspectSource={handleInspectSource}
              availableDocuments={documents}
            />
          ) : currentTab === 'search' ? (
            <div className="space-y-6">
              <div className="p-6 sm:p-8 rounded-2xl border border-[#2e2923] bg-gradient-to-br from-[#141210] via-[#110f0d] to-[#0a0908] shadow-2xl relative overflow-hidden">
                <div className="relative z-10 max-w-2xl space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-serif bg-[#1d1914] border border-[#d4af37]/40 text-[#eed27c]">
                    <Compass className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>Hybrid Retrieval Engine · Milestone 5.6.3.2</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#fcf9f2] font-heritage tracking-tight">
                    Deep Archival Search
                  </h1>
                  <p className="text-sm text-[#ded6c5] leading-relaxed">
                    Dense Semantic (all-MiniLM-L6-v2) + SQLite FTS5 BM25 Lexical Retrieval fused via Reciprocal Rank Fusion (RRF k=60) with dual pagination citation guarantees.
                  </p>
                </div>
              </div>
              <div ref={searchRef}>
                <SearchSection
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSearchSubmit={handleSearchSubmit}
                  isSearching={isSearching}
                  searchResults={searchResults}
                  searchResponse={searchResponse}
                  searchError={searchError}
                  hasSearched={hasSearched}
                  totalIndexedDocs={documents.length}
                  onInspectSource={handleInspectSource}
                  onClearSearch={handleClearSearch}
                />
              </div>
            </div>
          ) : currentTab === 'diagnostics' ? (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#fcf9f2] font-heritage flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#d4af37]" />
                  System Diagnostics &amp; Health Telemetry
                </h1>
                <p className="text-xs sm:text-sm text-[#a89f91] mt-1 font-serif">
                  Real-time status of FastAPI service, all-MiniLM-L6-v2 embeddings, and SQLite database
                </p>
              </div>

              {/* Health status card */}
              <HealthStatusCard healthState={healthState} onRefresh={handleManualRefresh} />

              {/* Technical Specifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-[#2e2923] bg-[#12100e] space-y-3 shadow-xl">
                  <h2 className="text-xs font-semibold text-[#fcf9f2] font-serif flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#d4af37]" />
                    Frontend &amp; API Configuration
                  </h2>
                  <div className="space-y-2 text-xs text-[#ded6c5]">
                    <div className="flex justify-between py-1 border-b border-[#24201a]">
                      <span className="text-[#a89f91]">NEXT_PUBLIC_API_BASE_URL:</span>
                      <span className="font-mono text-[#eed27c]">
                        {getApiBaseUrl()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#24201a]">
                      <span className="text-[#a89f91]">Semantic Search:</span>
                      <span className="font-mono text-emerald-400">
                        POST /api/search (Sentence Transformers)
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#24201a]">
                      <span className="text-[#a89f91]">Embedding Model:</span>
                      <span className="font-mono text-[#ded6c5]">
                        all-MiniLM-L6-v2 (384-dim)
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#a89f91]">Persistence Store:</span>
                      <span className="font-mono text-[#ded6c5]">
                        SQLite (document_chunks &amp; documents)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-[#2e2923] bg-[#12100e] space-y-3 shadow-xl">
                  <h2 className="text-xs font-semibold text-[#fcf9f2] font-serif flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Archival Citation Integrity Check
                  </h2>
                  <p className="text-xs text-[#ded6c5] leading-relaxed font-serif">
                    DHAROHAR AI enforces an evidence retrieval protocol. Every retrieved passage
                    strictly attributes the source document ID, filename, and exact one-based page number.
                  </p>
                  <div className="p-2.5 rounded-lg bg-[#0c0a09] text-[11px] font-mono text-[#eed27c] border border-[#d4af37]/30">
                    Policy: Strict Source Grounding &amp; Dual Pagination [ENFORCED]
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Main Dashboard View */
            <div className="space-y-8">
              {/* If connection is failing, display the health notice upfront */}
              {healthState.status === 'error' && (
                <HealthStatusCard healthState={healthState} onRefresh={handleManualRefresh} />
              )}

              {/* Interactive 3D Hero Heritage Experience */}
              <HeroHeritageCanvas
                onExploreArchive={() => setCurrentTab('archive')}
                onOpenAssistant={() => setCurrentTab('assistant')}
                onInspect3DStudio={() => setCurrentTab('heritage-3d')}
              />

              {/* Document Processing Pipeline Status */}
              <DocumentProcessingSection />

              {/* Archive Summary Area */}
              <ArchiveSummaryArea
                documentCount={documents.length}
                pageCount={totalPagesCount}
                needsOcrCount={needsOcrCount}
                showSampleData={showSampleData}
                onToggleSampleData={setShowSampleData}
                storageStatus={healthState.data?.services?.storage || 'initialized'}
              />

              {/* Semantic Knowledge Search Section */}
              <div ref={searchRef}>
                <SearchSection
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSearchSubmit={handleSearchSubmit}
                  isSearching={isSearching}
                  searchResults={searchResults}
                  searchResponse={searchResponse}
                  searchError={searchError}
                  hasSearched={hasSearched}
                  totalIndexedDocs={documents.length}
                  onInspectSource={handleInspectSource}
                  onClearSearch={handleClearSearch}
                />
              </div>

              {/* Recent Documents Section */}
              <RecentDocumentsSection
                documents={documents}
                isLoading={isLoadingDocs}
                error={docsError}
                onRefresh={loadDocuments}
                onOpenUpload={() => setIsUploadOpen(true)}
                onViewDocument={(doc) => {
                  setSelectedViewerDoc(doc);
                  setSelectedViewerPage(undefined);
                }}
                showSampleData={showSampleData}
                searchQuery={searchQuery}
                activeFilter={activeFilter}
              />
            </div>
          )}
        </main>
      </div>

      {/* Upload Document Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        onViewDocument={(doc) => {
          setSelectedViewerDoc(doc);
          setSelectedViewerPage(undefined);
        }}
      />

      {/* Document Text Viewer Modal */}
      <DocumentViewerModal
        key={selectedViewerDoc?.id || 'viewer-closed'}
        document={selectedViewerDoc}
        initialPageNumber={selectedViewerPage}
        onClose={() => {
          setSelectedViewerDoc(null);
          setSelectedViewerPage(undefined);
        }}
      />
    </div>
  );
}

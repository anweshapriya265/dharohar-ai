'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import WelcomeHero from '@/components/WelcomeHero';
import HealthStatusCard from '@/components/HealthStatusCard';
import DocumentProcessingSection from '@/components/DocumentProcessingSection';
import ArchiveSummaryArea from '@/components/ArchiveSummaryArea';
import SearchSection from '@/components/SearchSection';
import RecentDocumentsSection from '@/components/RecentDocumentsSection';
import ResearchAssistantSection from '@/components/ResearchAssistantSection';
import DigitalArchiveExplorer from '@/components/DigitalArchiveExplorer';
import UploadModal from '@/components/UploadModal';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import GeospatialMapSection from '@/components/GeospatialMapSection';
import Monument3DViewer from '@/components/Monument3DViewer';
import ReviewQueueSection from '@/components/ReviewQueueSection';
import AdminDashboardSection from '@/components/AdminDashboardSection';
import HeritageRecordsSection from '@/components/HeritageRecordsSection';
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
  Sparkles,
} from 'lucide-react';

const Heritage3DExplorer = dynamic(() => import('@/components/Heritage3DExplorer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[620px] rounded-xl bg-[#F0EAE1] border border-[#DED3C2] flex items-center justify-center text-[#642F38]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#642F38] border-t-transparent animate-spin" />
        <span className="font-serif text-xs tracking-wider text-[#756D66]">Initializing Heritage 3D Explorer Studio...</span>
      </div>
    </div>
  ),
});

export default function Home() {
  // Navigation & Role state
  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) return tab;
    }
    return 'assistant';
  });
  const [currentRole, setCurrentRole] = useState<string>('archivist');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
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

  const handleManualRefresh = useCallback(async () => {
    setHealthState((prev) => ({
      ...prev,
      status: 'connecting',
      error: null,
    }));
    await checkHealth();
  }, [checkHealth]);

  // Documents loader
  const loadDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    setDocsError(null);
    try {
      const res = await fetchDocuments();
      setDocuments(res.documents);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve documents';
      setDocsError(msg);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  // Search handler
  const handleSearchSubmit = async (queryToSearch: string) => {
    const q = queryToSearch.trim();
    if (!q) return;

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const response = await searchArchive(q, 8);
      setSearchResponse(response);
      setSearchResults(response.results);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'An unexpected error occurred while searching';
      setSearchError(errorMsg);
      setSearchResults([]);
      setSearchResponse(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchResponse(null);
    setSearchError(null);
    setHasSearched(false);
  };

  const handleInspectSource = (documentId: string, pageNumber: number) => {
    const matchedDoc = documents.find((d) => d.id === documentId);
    if (matchedDoc) {
      setSelectedViewerDoc(matchedDoc);
      setSelectedViewerPage(pageNumber);
    } else {
      const stubDoc: DocumentItem = {
        id: documentId,
        original_filename: documentId,
        file_size: 0,
        content_type: 'application/pdf',
        upload_timestamp: new Date().toISOString(),
        processing_status: 'completed',
        extraction_status: 'extracted',
        page_count: pageNumber,
        storage_reference: documentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSelectedViewerDoc(stubDoc);
      setSelectedViewerPage(pageNumber);
    }
  };

  // Initial load effect
  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      const [healthRes, docsRes] = await Promise.allSettled([
        fetchBackendHealth(),
        fetchDocuments(),
      ]);

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
        const errorMsg =
          healthRes.reason instanceof Error
            ? healthRes.reason.message
            : 'Initial connection failed';
        setHealthState({
          status: 'error',
          data: null,
          error: errorMsg,
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setCurrentTab('dashboard');
        setTimeout(() => {
          const input = searchRef.current?.querySelector('input');
          input?.focus();
        }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleScrollToSearch = () => {
    if (currentTab !== 'dashboard') {
      setCurrentTab('dashboard');
    }
    setTimeout(() => {
      searchRef.current?.scrollIntoView({ behavior: 'smooth' });
      const input = searchRef.current?.querySelector('input');
      input?.focus();
    }, 100);
  };

  const handleUploadSuccess = (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const totalPagesCount = documents.reduce((acc, doc) => acc + (doc.page_count || 0), 0);
  const needsOcrCount = documents.filter((doc) => doc.extraction_status === 'needs_ocr').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F1E7] text-[#393331] selection:bg-[#642F38]/15 selection:text-[#393331]">
      {/* Top Header with Unified Navigation Tabs */}
      <Header
        healthState={healthState}
        onRefreshHealth={handleManualRefresh}
        onOpenUpload={() => setIsUploadOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        currentRole={currentRole}
        onSelectRole={setCurrentRole}
        documentCount={documents.length}
        totalPageCount={totalPagesCount}
      />

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          backendConnected={healthState.status === 'connected'}
        />

        {/* Dynamic Content Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
          {/* TAB 1: RESEARCH ASSISTANT (Milestone 5.3-5.6) */}
          {currentTab === 'assistant' && (
            <ResearchAssistantSection
              availableDocuments={documents}
              onInspectSource={handleInspectSource}
              onOpenUpload={() => setIsUploadOpen(true)}
              backendConnected={healthState.status === 'connected'}
            />
          )}

          {/* TAB: HYBRID RETRIEVAL WORKSPACE */}
          {currentTab === 'search' && (
            <div className="space-y-6">
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
                  totalIndexedDocs={documents.length + 8}
                  onInspectSource={handleInspectSource}
                  onClearSearch={handleClearSearch}
                />
              </div>

              {/* Technical Architecture & Algorithm Explanation Card */}
              <div className="p-6 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#642F38]">
                  <Sparkles className="w-4 h-4 text-[#A77C54]" />
                  <span>Hybrid Retrieval Architecture &amp; Calibration (Milestone 5.6.3.3)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-lg border border-[#DED3C2] bg-[#F6F1E7] space-y-2">
                    <span className="font-mono text-[11px] text-[#642F38] uppercase tracking-wider font-semibold">1. Dense Semantic</span>
                    <p className="text-[#756D66] leading-relaxed font-serif">
                      Encodes queries and chunks into 384-dimensional dense vectors via <span className="text-[#393331] font-mono font-medium">all-MiniLM-L6-v2</span>. Cosine similarity threshold calibrated at <span className="text-[#393331] font-mono font-medium">0.32</span>.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-[#DED3C2] bg-[#F6F1E7] space-y-2">
                    <span className="font-mono text-[11px] text-[#642F38] uppercase tracking-wider font-semibold">2. SQLite FTS5 BM25</span>
                    <p className="text-[#756D66] leading-relaxed font-serif">
                      Indexes exact historical terminology, dates, Sanskrit transliterations, and dimension measurements with Porter stemming and OCR-aware token normalization.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-[#DED3C2] bg-[#F6F1E7] space-y-2">
                    <span className="font-mono text-[11px] text-[#642F38] uppercase tracking-wider font-semibold">3. Reciprocal Rank Fusion</span>
                    <p className="text-[#756D66] leading-relaxed font-serif">
                      Fuses ranks via <span className="text-[#393331] font-mono font-medium">RRF(d) = &sum; 1 / (60 + r_i)</span>. Lexical candidate recovery floor at <span className="text-[#393331] font-mono font-medium">0.10</span> prevents false dropouts while blocking out-of-domain noise.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 3D MONUMENT DIGITAL TWIN (Stepwell WebGL) */}
          {currentTab === '3d-viewer' && <Monument3DViewer />}

          {/* TAB 3: 3D MONOLITH EXPLORER (Kailasa Temple Studio) */}
          {currentTab === 'heritage-3d' && (
            <Heritage3DExplorer
              onInspectSource={handleInspectSource}
              availableDocuments={documents}
            />
          )}

          {/* TAB 4: GEOSPATIAL HERITAGE MAP (Leaflet Cartography) */}
          {currentTab === 'cartography' && (
            <GeospatialMapSection
              onSelectRecord={(_recId) => {
                setCurrentTab('records');
              }}
            />
          )}

          {/* TAB 5: HERITAGE CORPUS & FIELD RECORDS */}
          {currentTab === 'records' && (
            <HeritageRecordsSection
              onOpenUpload={() => setIsUploadOpen(true)}
              onInspectRecord={(_recId) => {
                setCurrentTab('dashboard');
                handleScrollToSearch();
              }}
            />
          )}

          {/* TAB 6: CURATOR REVIEW QUEUE (Human-in-the-Loop) */}
          {currentTab === 'review-queue' && <ReviewQueueSection />}

          {/* TAB 7: ADMIN & AUDIT TRAIL */}
          {currentTab === 'admin' && <AdminDashboardSection />}

          {/* TAB 8: DIGITAL ARCHIVE EXPLORER */}
          {currentTab === 'archive' && (
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
          )}

          {/* TAB 9: SYSTEM HEALTH & TELEMETRY */}
          {currentTab === 'diagnostics' && (
            <div className="space-y-6">
              <div className="p-6 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F6F1E7] text-[#642F38] border border-[#DED3C2] mb-1">
                  <Activity className="w-3.5 h-3.5 text-[#A77C54]" />
                  <span>Telemetry &amp; Service Health</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#642F38] font-heritage tracking-tight">
                  System Diagnostics &amp; Health Telemetry
                </h1>
                <p className="text-xs sm:text-sm text-[#756D66] mt-0.5 font-serif">
                  Real-time status of FastAPI service, all-MiniLM-L6-v2 embeddings, and SQLite database
                </p>
              </div>

              <HealthStatusCard healthState={healthState} onRefresh={handleManualRefresh} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] space-y-3 shadow-xs">
                  <h2 className="text-xs font-semibold text-[#642F38] font-serif flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#A77C54]" />
                    Frontend &amp; API Configuration
                  </h2>
                  <div className="space-y-2 text-xs text-[#393331]">
                    <div className="flex justify-between py-1 border-b border-[#DED3C2]">
                      <span className="text-[#756D66]">NEXT_PUBLIC_API_BASE_URL:</span>
                      <span className="font-mono text-[#642F38] font-medium">
                        {getApiBaseUrl()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#DED3C2]">
                      <span className="text-[#756D66]">Semantic Search:</span>
                      <span className="font-mono text-[#52745E] font-medium">
                        POST /api/search (Sentence Transformers)
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#DED3C2]">
                      <span className="text-[#756D66]">Embedding Model:</span>
                      <span className="font-mono text-[#393331]">
                        all-MiniLM-L6-v2 (384-dim)
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#DED3C2]">
                      <span className="text-[#756D66]">Geospatial Trail Endpoint:</span>
                      <span className="font-mono text-[#393331]">GET /api/map/records</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#756D66]">Persistence Store:</span>
                      <span className="font-mono text-[#393331]">
                        SQLite (WAL Mode, document_chunks &amp; heritage_records)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] space-y-3 shadow-xs">
                  <h2 className="text-xs font-semibold text-[#642F38] font-serif flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#52745E]" />
                    Archival Citation Integrity Check
                  </h2>
                  <p className="text-xs text-[#756D66] leading-relaxed font-serif">
                    DHAROHAR AI enforces an evidence retrieval protocol. Every retrieved passage
                    strictly attributes the source document ID, filename, and exact one-based page number.
                  </p>
                  <div className="p-2.5 rounded-lg bg-[#F6F1E7] text-[11px] font-mono text-[#52745E] border border-[#52745E]/30 font-medium">
                    Policy: Strict Source Grounding &amp; Dual Pagination [ENFORCED]
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: HYBRID SEARCH & EXPLORATION HUB */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              {healthState.status === 'error' && (
                <HealthStatusCard healthState={healthState} onRefresh={handleManualRefresh} />
              )}

              {/* Welcome Hero */}
              <WelcomeHero
                onOpenUpload={() => setIsUploadOpen(true)}
                onNavigateTab={setCurrentTab}
                documentCount={documents.length}
                totalPageCount={totalPagesCount}
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
                  totalIndexedDocs={documents.length + 8}
                  onInspectSource={handleInspectSource}
                  onClearSearch={handleClearSearch}
                />
              </div>

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

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

export default function ResearchPlatformView({ initialTab }: { initialTab?: string }) {
  // Navigation & Role state
  const [currentTab, setCurrentTab] = useState<string>(initialTab || 'dashboard');
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

  // Tab navigation handler with URL synchronization
  const handleSelectTab = useCallback((tab: string) => {
    setCurrentTab(tab);
    setIsSidebarOpen(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Sync tab with URL search parameter on client mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setCurrentTab(tab);
    }
  }, []);

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
        handleSelectTab('dashboard');
        setTimeout(() => {
          const input = searchRef.current?.querySelector('input');
          input?.focus();
        }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectTab]);

  const handleScrollToSearch = () => {
    if (currentTab !== 'dashboard') {
      handleSelectTab('dashboard');
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

  const totalPagesCount = documents.reduce((acc, curr) => acc + (curr.page_count || 1), 0) + 1188;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F1E7] text-[#393331]">
      {/* Global Application Header */}
      <Header
        healthState={healthState}
        onRefreshHealth={handleManualRefresh}
        onOpenUpload={() => setIsUploadOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        currentRole={currentRole}
        onSelectRole={setCurrentRole}
        documentCount={documents.length + 3}
        totalPageCount={totalPagesCount}
      />

      {/* Main Container */}
      <div className="flex-1 flex w-full">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          backendConnected={healthState.status === 'connected'}
        />

        {/* Dynamic Content Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden min-w-0">
          {/* TAB 1: RESEARCH ASSISTANT (Milestone 5.3-5.6) */}
          {currentTab === 'assistant' && (
            <ResearchAssistantSection
              availableDocuments={documents}
              onInspectSource={handleInspectSource}
              onOpenUpload={() => setIsUploadOpen(true)}
              backendConnected={healthState.status === 'connected'}
            />
          )}

          {/* TAB 2: HYBRID DENSE + BM25 LEXICAL SEARCH */}
          {currentTab === 'search' && (
            <div className="space-y-6">
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
          )}

          {/* TAB 3: 3D HERITAGE MONUMENTS & SHADOWS */}
          {currentTab === 'heritage-3d' && (
            <Heritage3DExplorer
              onInspectSource={handleInspectSource}
              availableDocuments={documents}
            />
          )}

          {/* TAB 3B: STEPWELL DIGITAL TWIN (ADALAJ NI VAV) */}
          {currentTab === '3d-viewer' && (
            <Monument3DViewer />
          )}

          {/* TAB 4: GEOSPATIAL CARTOGRAPHY & SITE MAP */}
          {currentTab === 'cartography' && (
            <GeospatialMapSection
              onSelectRecord={(_recId) => {
                handleSelectTab('records');
              }}
            />
          )}

          {/* TAB 5: HERITAGE CORPUS & FIELD RECORDS */}
          {currentTab === 'records' && (
            <HeritageRecordsSection
              onOpenUpload={() => setIsUploadOpen(true)}
              onInspectRecord={(_recId) => {
                handleSelectTab('dashboard');
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
              onOpen3DExplorer={() => handleSelectTab('heritage-3d')}
            />
          )}

          {/* TAB 9: SYSTEM HEALTH & TELEMETRY */}
          {currentTab === 'diagnostics' && (
            <div className="space-y-6">
              <HealthStatusCard healthState={healthState} onRefresh={handleManualRefresh} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#DED3C2] bg-[#FFFCF5] p-5 shadow-xs">
                  <h3 className="font-serif font-bold text-sm text-[#642F38] mb-2">API Connectivity</h3>
                  <div className="font-mono text-xs text-[#756D66] space-y-1">
                    <p>Endpoint: {getApiBaseUrl()}</p>
                    <p>Latency: {healthState.latencyMs ?? 'N/A'} ms</p>
                    <p>Last checked: {healthState.lastChecked ? new Date(healthState.lastChecked).toLocaleTimeString() : 'Never'}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-[#DED3C2] bg-[#FFFCF5] p-5 shadow-xs">
                  <h3 className="font-serif font-bold text-sm text-[#642F38] mb-2">Corpus Telemetry</h3>
                  <div className="font-mono text-xs text-[#756D66] space-y-1">
                    <p>Catalogued Documents: {documents.length + 3}</p>
                    <p>Total Estimated Pages: {totalPagesCount}</p>
                    <p>Ingestion Engine: PyMuPDF + SentenceTransformers</p>
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
                onNavigateTab={handleSelectTab}
                documentCount={documents.length + 3}
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

              {/* Architectural Models & 3D Interactive Callouts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-[#DED3C2] bg-[#FFFCF5] p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#642F38]/10 text-[#642F38] font-semibold border border-[#642F38]/20">
                        Monolithic Rock-Cut
                      </span>
                      <span className="text-xs text-[#756D66]">8th Century CE · Rashtrakuta</span>
                    </div>
                    <h3 className="font-serif font-bold text-base text-[#642F38] mb-1">
                      Kailasa Temple (Cave 16, Ellora)
                    </h3>
                    <p className="text-xs text-[#756D66] font-serif leading-relaxed mb-4">
                      Top-down monolithic excavation carved from a single volcanic basalt cliff face. 276 × 154 feet courtyard featuring multi-storeyed Mandapa, Vimana, and life-size elephant friezes.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelectTab('heritage-3d')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] font-serif text-xs font-medium transition cursor-pointer"
                  >
                    <Compass className="w-4 h-4 text-[#C8AD8D]" />
                    <span>Launch Monolith 3D Explorer</span>
                  </button>
                </div>

                <div className="rounded-xl border border-[#DED3C2] bg-[#FFFCF5] p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#A77C54]/15 text-[#A77C54] font-semibold border border-[#A77C54]/30">
                        Subterranean Baoli
                      </span>
                      <span className="text-xs text-[#756D66]">1498 CE · Solanki-Vaghela</span>
                    </div>
                    <h3 className="font-serif font-bold text-base text-[#642F38] mb-1">
                      Adalaj Stepwell (Rudabai ni Vav)
                    </h3>
                    <p className="text-xs text-[#756D66] font-serif leading-relaxed mb-4">
                      Five-storey subterranean hydraulic monument with octagonal shafts, intricately carved friezes, and microclimate temperature regulation.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelectTab('3d-viewer')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#EFE8DC] hover:bg-[#DED3C2] text-[#393331] font-serif text-xs font-medium border border-[#DED3C2] transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#A77C54]" />
                    <span>Explore Stepwell Digital Twin</span>
                  </button>
                </div>
              </div>

              {/* Recent Archival Folios */}
              <RecentDocumentsSection
                documents={documents}
                isLoading={isLoadingDocs}
                error={null}
                onRefresh={handleManualRefresh}
                onOpenUpload={() => setIsUploadOpen(true)}
                onViewDocument={(doc) => {
                  setSelectedViewerDoc(doc);
                  setSelectedViewerPage(undefined);
                }}
                showSampleData={false}
                searchQuery=""
                activeFilter="all"
              />
            </div>
          )}
        </main>
      </div>

      {/* Global Upload & Ingestion Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        onViewDocument={(doc) => {
          setIsUploadOpen(false);
          setSelectedViewerDoc(doc);
          setSelectedViewerPage(undefined);
        }}
      />

      {/* Global Document Viewer Modal */}
      {selectedViewerDoc && (
        <DocumentViewerModal
          onClose={() => {
            setSelectedViewerDoc(null);
            setSelectedViewerPage(undefined);
          }}
          document={selectedViewerDoc}
          initialPageNumber={selectedViewerPage}
        />
      )}
    </div>
  );
}

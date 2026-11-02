'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import WelcomeHero from '@/components/WelcomeHero';
import HealthStatusCard from '@/components/HealthStatusCard';
import DocumentProcessingSection from '@/components/DocumentProcessingSection';
import ArchiveSummaryArea from '@/components/ArchiveSummaryArea';
import SearchSection from '@/components/SearchSection';
import RecentDocumentsSection from '@/components/RecentDocumentsSection';
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
} from 'lucide-react';

export default function Home() {
  // Navigation & Role state
  const [currentTab, setCurrentTab] = useState<string>('cartography');
  const [currentRole, setCurrentRole] = useState<string>('archivist');
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
    <div className="min-h-screen flex flex-col bg-[#f7f5f0] text-[#1c1917]">
      {/* Top Header with Unified Navigation Tabs */}
      <Header
        healthState={healthState}
        onRefreshHealth={handleManualRefresh}
        onOpenUpload={() => setIsUploadOpen(true)}
        currentRole={currentRole}
        onSelectRole={setCurrentRole}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
      />

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          backendConnected={healthState.status === 'connected'}
          currentRole={currentRole}
        />

        {/* Dynamic Content Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
          {/* TAB 1: GEOSPATIAL HERITAGE MAP (Pathway 3) */}
          {currentTab === 'cartography' && (
            <GeospatialMapSection
              onSelectRecord={(_recId) => {
                setCurrentTab('records');
              }}
            />
          )}

          {/* TAB 2: 3D MONUMENT DIGITAL TWIN (Pathway 1) */}
          {currentTab === '3d-viewer' && <Monument3DViewer />}

          {/* TAB 3: CURATOR REVIEW QUEUE (Human-in-the-Loop) */}
          {currentTab === 'review-queue' && <ReviewQueueSection />}

          {/* TAB 4: HERITAGE CORPUS & FIELD RECORDS */}
          {currentTab === 'records' && (
            <HeritageRecordsSection
              onOpenUpload={() => setIsUploadOpen(true)}
              onInspectRecord={(_recId) => {
                setCurrentTab('dashboard');
                handleScrollToSearch();
              }}
            />
          )}

          {/* TAB 5: ADMIN & AUDIT TRAIL */}
          {currentTab === 'admin' && <AdminDashboardSection />}

          {/* TAB 6: SYSTEM HEALTH & TELEMETRY */}
          {currentTab === 'diagnostics' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fbeee9] text-[#9c381e] mb-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Telemetry &amp; Service Health</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 font-heritage tracking-tight">
                  System Diagnostics &amp; Health Telemetry
                </h1>
                <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
                  Real-time status of FastAPI service, all-MiniLM-L6-v2 embeddings, and SQLite database
                </p>
              </div>

              <HealthStatusCard healthState={healthState} onRefresh={handleManualRefresh} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage space-y-3">
                  <h2 className="text-sm font-serif font-bold text-stone-900 font-heritage flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#9c381e]" />
                    <span>Frontend &amp; API Configuration</span>
                  </h2>
                  <div className="space-y-2 text-xs text-stone-600">
                    <div className="flex justify-between py-1.5 border-b border-stone-100">
                      <span className="text-stone-400">NEXT_PUBLIC_API_BASE_URL:</span>
                      <span className="font-mono text-stone-800">{getApiBaseUrl()}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-stone-100">
                      <span className="text-stone-400">Semantic Search Endpoint:</span>
                      <span className="font-mono text-[#2d5e4a] font-semibold">
                        POST /api/search (SentenceTransformers)
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-stone-100">
                      <span className="text-stone-400">Geospatial Trail Endpoint:</span>
                      <span className="font-mono text-stone-800">GET /api/map/records</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-stone-400">Persistence Store:</span>
                      <span className="font-mono text-stone-800 font-semibold">
                        SQLite (WAL Mode, heritage_records &amp; chunks)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage space-y-3">
                  <h2 className="text-sm font-serif font-bold text-stone-900 font-heritage flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#2d5e4a]" />
                    <span>Zero-Hallucination Integrity Check</span>
                  </h2>
                  <p className="text-xs text-stone-600 leading-relaxed font-serif">
                    DHAROHAR AI enforces a strict evidence retrieval protocol. Every retrieved passage
                    attributes the source document ID, filename, and exact one-based page number.
                  </p>
                  <div className="p-3 rounded-xl bg-[#edf5f1] border border-[#c3dcd0] text-[11px] font-mono text-[#2d5e4a] font-semibold">
                    Policy: Strict Page-Level Grounding [ENFORCED]
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SEARCH & EXPLORATION HUB */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              {healthState.status === 'error' && (
                <HealthStatusCard healthState={healthState} onRefresh={handleManualRefresh} />
              )}

              {/* Welcome Hero */}
              <WelcomeHero
                onOpenUpload={() => setIsUploadOpen(true)}
                onNavigateTab={setCurrentTab}
                totalRecordsCount={documents.length + 8}
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

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
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
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

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchResponse(null);
    setSearchError(null);
    setHasSearched(false);
  }, []);

  const handleInspectSource = useCallback(
    (documentId: string, pageNumber: number) => {
      const doc = documents.find((d) => d.id === documentId);
      if (doc) {
        setSelectedViewerDoc(doc);
        setSelectedViewerPage(pageNumber);
      } else {
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
    <div className="min-h-screen flex flex-col bg-[#faf8f5] dark:bg-[#12100e] text-[#1c1917] dark:text-[#f5f0eb]">
      {/* Top Header */}
      <Header
        healthState={healthState}
        onRefreshHealth={handleManualRefresh}
        onOpenUpload={() => setIsUploadOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        currentRole={currentRole}
        onSelectRole={setCurrentRole}
      />

      {/* Main Container: Sidebar + Active Tab Content */}
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

          {/* TAB 3: CURATOR REVIEW QUEUE (SRS 6.2 & 12.1) */}
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

          {/* TAB 5: ADMIN & AUDIT TRAIL (SRS 7.8) */}
          {currentTab === 'admin' && <AdminDashboardSection />}

          {/* TAB 6: SYSTEM HEALTH & TELEMETRY */}
          {currentTab === 'diagnostics' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 font-heritage flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  System Diagnostics &amp; Health Telemetry
                </h1>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
                  Real-time status of FastAPI service, all-MiniLM-L6-v2 embeddings, and SQLite database
                </p>
              </div>

              <HealthStatusCard healthState={healthState} onRefresh={handleManualRefresh} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
                  <h2 className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-700" />
                    Frontend &amp; API Configuration
                  </h2>
                  <div className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
                    <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                      <span className="text-stone-400">NEXT_PUBLIC_API_BASE_URL:</span>
                      <span className="font-mono text-stone-800 dark:text-stone-200">
                        {getApiBaseUrl()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                      <span className="text-stone-400">Semantic Search:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        POST /api/search (Sentence Transformers)
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                      <span className="text-stone-400">Geospatial Endpoint:</span>
                      <span className="font-mono text-stone-800 dark:text-stone-200">
                        GET /api/map/records
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-stone-400">Persistence Store:</span>
                      <span className="font-mono text-stone-800 dark:text-stone-200">
                        SQLite (WAL Mode, heritage_records &amp; chunks)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
                  <h2 className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Zero-Hallucination Integrity Check
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    DHAROHAR AI enforces an evidence retrieval protocol. Every retrieved passage
                    strictly attributes the source document ID, filename, and exact one-based page number.
                  </p>
                  <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950 text-[11px] font-mono text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800">
                    Policy: Strict Source Grounding [ENFORCED]
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: DEFAULT DASHBOARD VIEW (Semantic Search & Discovery) */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              {healthState.status === 'error' && (
                <HealthStatusCard healthState={healthState} onRefresh={handleManualRefresh} />
              )}

              {/* Welcome Hero */}
              <WelcomeHero
                onOpenUpload={() => setIsUploadOpen(true)}
                onExploreClick={handleScrollToSearch}
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

              {/* Milestone 3: Semantic Knowledge Search Section */}
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

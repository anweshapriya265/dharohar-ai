/**
 * DHAROHAR AI - API Client Utility
 * Handles communication with the FastAPI backend service.
 */

export interface HealthServices {
  api: string;
  storage: string;
  pdf_extraction?: string;
  semantic_search?: string;
  ocr?: string;
  [key: string]: string | undefined;
}

export interface HealthResponse {
  status: string;
  app: string;
  version: string;
  timestamp: string;
  services: HealthServices;
}

export type HealthStatusType = 'connecting' | 'connected' | 'error';

export interface HealthCheckState {
  status: HealthStatusType;
  data: HealthResponse | null;
  error: string | null;
  latencyMs: number | null;
  lastChecked: string | null;
}

export interface DocumentItem {
  id: string;
  original_filename: string;
  file_size: number;
  content_type: string;
  upload_timestamp: string;
  processing_status: 'completed' | 'processing' | 'failed' | string;
  extraction_status: 'extracted' | 'ocr' | 'hybrid' | 'needs_ocr' | 'failed' | string;
  page_count: number;
  storage_reference: string;
  created_at: string;
  updated_at: string;
  indexing_status?: string;
}

export interface DocumentListResponse {
  documents: DocumentItem[];
  total: number;
}

export interface DocumentPage {
  page_number: number;
  text: string;
  character_count: number;
  word_count: number;
  extraction_status: 'extracted' | 'ocr_extracted' | 'ocr_failed' | 'needs_ocr' | string;
  created_at: string;
}

export interface DocumentPagesResponse {
  document_id: string;
  total_pages: number;
  pages: DocumentPage[];
}

export interface SearchResultItem {
  chunk_id: string;
  document_id: string;
  original_filename: string;
  page_number: number;
  chunk_index: number;
  text: string;
  character_count: number;
  word_count: number;
  similarity_score: number;
  source_citation: string;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  results: SearchResultItem[];
  search_mode: string;
  message?: string | null;
}

export interface DocumentChunkItem {
  id: string;
  document_id: string;
  page_number: number;
  chunk_index: number;
  text: string;
  character_count: number;
  word_count: number;
  has_embedding: boolean;
  created_at: string;
}

export interface DocumentChunksResponse {
  document_id: string;
  total_chunks: number;
  chunks: DocumentChunkItem[];
}

export interface IndexDocumentResponse {
  document_id: string;
  original_filename: string;
  chunks_created: number;
  status: string;
  message: string;
}

/**
 * Resolves the backend API base URL with fallback to local development server.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:8000';
}

/**
 * Fetches the backend health status from GET /api/health.
 */
export async function fetchBackendHealth(): Promise<{ data: HealthResponse; latencyMs: number }> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/health`;
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const controller = new AbortController();
  const timeoutMs = 5000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Backend returned HTTP ${response.status}: ${response.statusText}`);
    }

    const data: unknown = await response.json();

    if (!data || typeof data !== 'object') {
      throw new Error('Received non-object response from health check endpoint');
    }

    const payload = data as Partial<HealthResponse>;
    if (typeof payload.status !== 'string' || typeof payload.app !== 'string') {
      throw new Error('Invalid health payload format: missing status or app fields');
    }

    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const latencyMs = Math.max(1, Math.round(endTime - startTime));

    return {
      data: payload as HealthResponse,
      latencyMs,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms while connecting to ${baseUrl}`);
    }

    if (err instanceof TypeError && err.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(`Cannot reach backend at ${baseUrl}. Ensure FastAPI is running on port 8000.`);
    }

    if (err instanceof Error) {
      throw err;
    }

    throw new Error('An unexpected network error occurred while contacting the health endpoint');
  }
}

/**
 * Uploads a PDF document to POST /api/documents/upload.
 */
export async function uploadDocument(file: File): Promise<DocumentItem> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/documents/upload`;

  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timeoutMs = 60000; // 60s for larger PDF extraction
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let detail = `Upload failed with HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson && typeof errorJson.detail === 'string') {
          detail = errorJson.detail;
        }
      } catch {
        if (response.statusText) {
          detail = `${detail}: ${response.statusText}`;
        }
      }
      throw new Error(detail);
    }

    const data: DocumentItem = await response.json();
    return data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Upload timed out. The file may be too large or the server is busy.');
    }

    if (err instanceof TypeError && err.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(`Cannot reach backend at ${baseUrl}. Ensure FastAPI is running.`);
    }

    if (err instanceof Error) {
      throw err;
    }

    throw new Error('An unexpected network error occurred during document upload');
  }
}

/**
 * Retrieves the list of ingested documents from GET /api/documents.
 */
export async function fetchDocuments(limit: number = 50, offset: number = 0): Promise<DocumentListResponse> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/documents?limit=${limit}&offset=${offset}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to list documents: HTTP ${response.status} ${response.statusText}`);
    }

    const data: DocumentListResponse = await response.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(`Cannot reach backend at ${baseUrl}. Ensure FastAPI is running.`);
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to retrieve documents list');
  }
}

/**
 * Retrieves extracted pages for a document from GET /api/documents/{id}/pages.
 */
export async function fetchDocumentPages(documentId: string): Promise<DocumentPagesResponse> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/documents/${encodeURIComponent(documentId)}/pages`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pages: HTTP ${response.status} ${response.statusText}`);
    }

    const data: DocumentPagesResponse = await response.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(`Cannot reach backend at ${baseUrl}. Ensure FastAPI is running.`);
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to retrieve extracted document pages');
  }
}

/**
 * Executes a semantic vector search across indexed document chunks via POST /api/search.
 */
export async function searchArchive(
  query: string,
  limit: number = 5,
  minScore: number = 0.0
): Promise<SearchResponse> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/search`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        limit,
        min_score: minScore,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      let detail = `Search failed with HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson && typeof errorJson.detail === 'string') {
          detail = errorJson.detail;
        }
      } catch {
        if (response.statusText) {
          detail = `${detail}: ${response.statusText}`;
        }
      }
      throw new Error(detail);
    }

    const data: SearchResponse = await response.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(`Cannot reach backend at ${baseUrl}. Ensure FastAPI is running.`);
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('An unexpected network error occurred while executing search');
  }
}

/**
 * Triggers semantic indexing for a document via POST /api/documents/{id}/index.
 */
export async function indexDocument(documentId: string): Promise<IndexDocumentResponse> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/documents/${encodeURIComponent(documentId)}/index`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Indexing failed: HTTP ${response.status} ${response.statusText}`);
    }

    const data: IndexDocumentResponse = await response.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(`Cannot reach backend at ${baseUrl}. Ensure FastAPI is running.`);
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to index document');
  }
}

/**
 * Retrieves chunks for a document via GET /api/documents/{id}/chunks.
 */
export async function fetchDocumentChunks(documentId: string): Promise<DocumentChunksResponse> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/documents/${encodeURIComponent(documentId)}/chunks`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch chunks: HTTP ${response.status} ${response.statusText}`);
    }

    const data: DocumentChunksResponse = await response.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(`Cannot reach backend at ${baseUrl}. Ensure FastAPI is running.`);
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to retrieve document chunks');
  }
}

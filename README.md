# DHAROHAR AI (धरोहर AI)
> **HackCult '26 | Problem Statement: HC26-CULT01**  
> *Digital Revitalisation of Unstructured Cultural & Architectural Heritage Archives*

---

## 🏛️ Project Overview
**DHAROHAR AI** transforms fragmented and unstructured historical materials—colonial-era gazetteers, architectural blueprints, epigraphical survey reports, historical photographs, and excavation field notes—into an intelligent, evidence-linked, and interactive digital knowledge repository.

### Core Value Proposition
- **Preserves Historical Veracity:** Every retrieval citation directly maps back to the document and page number. Zero hallucinations.
- **Multimodal Heritage Retrieval:** Cross-links architectural texts, epigraphs, and geospatial site coordinates.
- **Real PDF Ingestion & Text Extraction (Milestone 2):** PyMuPDF 2.0 extracts page-level text with 1-based page numbering, persists to a local SQLite database, and detects scanned/sparse pages requiring OCR.
- **Semantic Knowledge Archive (Milestone 3):** Sentence Transformers (`all-MiniLM-L6-v2`) generate 384-dimensional persistent dense vectors stored in SQLite (`document_chunks`). Overlapping text chunks preserve 1-based page numbers and provide cosine similarity passage retrieval with exact source citations.
- **Hybrid PDF Extraction with OCR (Milestone 4):** Intelligent dual-engine extraction pipeline combining PyMuPDF for digitally generated pages and Tesseract OCR (via `pytesseract` and Pillow) for scanned raster plates and sparse text pages. Mixed documents are processed on a per-page basis with automatic classification into `extracted`, `ocr`, or `hybrid`.
- **Interactive Exploration:** Integrated interactive cartography (Leaflet/OSM) and 3D architectural viewer (Three.js).
- **Live Health Diagnostics:** Resilient frontend telemetry connected to FastAPI health monitoring.

---

## 🏗️ System Architecture
```
dharohar-ai/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application, lifespan & health check
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── config.py        # Configurable upload limits (15 MB), chunk sizes, model
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── database.py      # SQLite connection, tables (documents, pages, chunks)
│   │   │   └── repository.py    # DocumentRepository DAO isolating database access
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── documents.py     # Ingestion, listing, metadata, pages & chunk inspection
│   │   │   └── search.py        # Semantic vector search API (POST /api/search)
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── pdf_service.py   # Signature validation, stream sizing, PyMuPDF extraction
│       ├── ocr_service.py   # Tesseract discovery, PyMuPDF-to-Pillow rendering, contrast preprocessing, OCR
│   │       ├── chunking_service.py # Non-crossing page chunking with sliding overlap
│   │       ├── embedding_service.py # SentenceTransformer (all-MiniLM-L6-v2) singleton
│   │       └── search_service.py # Idempotent document indexing & cosine similarity search
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_health.py       # Health check test suite
│   │   ├── test_documents.py    # Ingestion, validation, 1-based pages & persistence tests
│   │   ├── test_search.py       # Chunking, embeddings, ranking, idempotency, attribution
│   │   └── test_ocr.py          # Hybrid OCR, scanned vs. digital extraction, resilience & e2e tests
│   ├── data/                    # Document and SQLite storage (local dev)
│   │   ├── dharohar.db          # SQLite archive database (documents, pages, chunks)
│   │   └── uploads/             # Dedicated upload storage (server-side doc IDs)
│   ├── requirements.txt         # Python dependencies (PyMuPDF, sentence-transformers, etc.)
│   └── .venv/                   # CPython 3.12 virtual environment
├── frontend/                    # Next.js 16 App Router application
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css      # Museum-inspired styling & theme variables
│   │   │   ├── layout.tsx       # Root layout & heritage metadata
│   │   │   └── page.tsx         # Dashboard page with semantic search & live telemetry
│   │   ├── components/
│   │   │   ├── Header.tsx       # Brand header, health telemetry pill, ingest trigger
│   │   │   ├── Sidebar.tsx      # Navigation & evidence protocol tracker
│   │   │   ├── WelcomeHero.tsx  # Hero banner & action triggers
│   │   │   ├── HealthStatusCard.tsx # Detailed backend connection status & diagnostics
│   │   │   ├── DocumentProcessingSection.tsx # Archival pipeline status tracker
│   │   │   ├── ArchiveSummaryArea.tsx # Live counts (docs, pages, needs OCR)
│   │   │   ├── SearchSection.tsx# Semantic search bar with result cards & inspect triggers
│   │   │   ├── RecentDocumentsSection.tsx # Live document cards & inspect triggers
│   │   │   ├── UploadModal.tsx  # Functional PDF upload & extraction dropzone
│   │   │   └── DocumentViewerModal.tsx # Extracted text viewer with direct page navigation
│   │   └── lib/
│   │       └── api.ts           # Resilient API client: health, upload, list, pages, search
│   ├── .env.example             # Template for API base URL
│   ├── .env.local               # Local development environment configuration
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
└── README.md
```

---

## 📡 API Endpoints (Milestones 2 & 3)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API status and root service metadata |
| `GET` | `/api/health` | Live backend health, storage status, PyMuPDF & semantic search readiness |
| `POST` | `/api/documents/upload` | Upload and ingest a PDF document (auto-extracts & auto-indexes) |
| `GET` | `/api/documents` | List uploaded documents with pagination & total count |
| `GET` | `/api/documents/{id}` | Retrieve document metadata by server-side document ID |
| `GET` | `/api/documents/{id}/pages` | Retrieve 1-based page-level text, character counts, and extraction status |
| `POST` | `/api/documents/{id}/index` | Idempotently index or re-index document chunks and embeddings |
| `GET` | `/api/documents/{id}/chunks` | Inspect indexed chunks for debugging and source verification |
| `POST` | `/api/search` | Natural language semantic vector search across all indexed chunks |

---

## 🚀 Running the Applications

To run the complete system locally, start the backend and frontend in separate terminals:

### Terminal 1: Backend (FastAPI on Port 8000)
```powershell
# Navigate to the backend directory
cd backend

# Activate the Python 3.12 virtual environment
.\.venv\Scripts\activate

# Launch the FastAPI development server
uvicorn app.main:app --reload --port 8000
```
- **Health Check Endpoint:** [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive Swagger Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Terminal 2: Frontend (Next.js on Port 3000)
```powershell
# Navigate to the frontend directory
cd frontend

# Run the development server
npm run dev
```
- **Web Application:** [http://localhost:3000](http://localhost:3000)

---

## 🧪 Verification & Testing

### 1. Backend Verification
Run the complete backend test suite (32 tests covering health checks, PDF upload, PyMuPDF extraction, Tesseract OCR hybrid processing, text chunking, persistent embeddings, semantic ranking, and idempotency):
```powershell
cd backend
.\.venv\Scripts\activate
python -m pytest tests
```

### 2. Frontend Lint & Production Build
Run ESLint and build the production bundle:
```powershell
cd frontend
npm run lint
npm run build
```

---

## 🔍 Semantic Search Quickstart

1. In the DHAROHAR AI dashboard ([http://localhost:3000](http://localhost:3000)), click **"Ingest Document"** and upload a heritage PDF (e.g. an archaeological survey report or gazetteer).
2. The document is automatically extracted page-by-page and chunked into overlapping passages embedded with `sentence-transformers/all-MiniLM-L6-v2`.
3. Enter any natural language query in the search bar (e.g., `monolithic rock temple carving` or `Rashtrakuta dynasty inscription`) and press **Enter** or click **Search**.
4. The system ranks relevant passages with cosine similarity scores, filenames, 1-based page numbers, and exact citations.
5. Click **"Inspect Page X"** on any search result to open the full extracted page text in the document viewer.

---

## 👁️ Hybrid PDF Extraction & OCR (Milestone 4)

DHAROHAR AI incorporates an intelligent hybrid extraction pipeline that seamlessly handles digital, scanned, and mixed historical documents:

1. **Digital Pages:** Pages with extractable text streams (>= 15 characters by default) are processed with high-speed PyMuPDF extraction. Tesseract OCR is bypassed for these pages to conserve system resources.
2. **Scanned & Sparse Pages:** Pages containing fewer than 15 characters (e.g. photographic plates, architectural blueprint drawings, scanned survey sheets) are rendered at 300 DPI, preprocessed (grayscale conversion and contrast enhancement via Pillow), and processed through Tesseract OCR (`pytesseract`).
3. **Mixed Heritage Documents:** Multi-page documents with both digital text and scanned photo plates are processed page-by-page. Original page order and strict 1-based page numbers are preserved.
4. **Document Classification:**
   - `extracted`: All pages contain sufficient digital text streams.
   - `ocr`: All pages required and completed Tesseract OCR.
   - `hybrid`: Document contains a combination of digital and OCR-processed pages.
   - `needs_ocr`: Document contains sparse or blank pages where OCR yielded insufficient text.
5. **Search Integration:** OCR-extracted text flows directly into the chunking and semantic vector embedding pipeline (`all-MiniLM-L6-v2`), making historical scanned plates searchable via natural language queries with exact page citations.

### Tesseract Configuration & Verification

Tesseract OCR 5.5+ is required for scanned document processing.

- **Check Tesseract Installation:**
  ```powershell
  tesseract --version
  ```
- **Supported Initial Language:** English (`eng`). *(Note: Hindi traineddata is not configured in this milestone).*
- **Pre-downloading Embedding Model (Fresh/Air-Gapped Setup):**
  To pre-cache the sentence transformer model before taking the backend offline:
  ```powershell
  python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"
  ```
- **Configurable Environment Variables:**
  - `DHAROHAR_TESSERACT_CMD`: Path to `tesseract.exe` (defaults to auto-detection on PATH and `C:\Program Files\Tesseract-OCR\tesseract.exe`).
  - `DHAROHAR_OCR_DPI`: Rendering resolution for scanned pages (default: `300`).
  - `DHAROHAR_OCR_CHAR_THRESHOLD`: Minimum characters before triggering OCR on a page (default: `15`).

---

## ⚙️ Environment Configuration

The frontend reads the backend API URL from `NEXT_PUBLIC_API_BASE_URL` with a default fallback to `http://localhost:8000`.

- An example file is available at `frontend/.env.example`:
  ```ini
  NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
  ```
- A local configuration is configured in `frontend/.env.local`.

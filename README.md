# DHAROHAR AI (धरोहर AI)
> **Blithchron '27, IIT Gandhinagar | Problem Statement: HC26-CULT01**  
> *Digital Revitalisation of Unstructured Cultural & Architectural Heritage Archives*  
> **Evaluation: NxtWave Technical Experts | Category: Software (Open Innovation)**

---

## 🏛️ Project Overview
**DHAROHAR AI** transforms fragmented and unstructured historical materials—grassroots expedition field logs from the **IIT Gandhinagar Explorer Fellowship**, colonial-era gazetteers, architectural blueprints, epigraphical survey reports, historical photographs, and excavation notes—into an intelligent, evidence-linked, and interactive digital knowledge repository.

### Core Value Proposition & Hackathon Pathways
1. **Pathway 1: The Computer Vision & 3D Approach (Three.js / WebGL)**
   - Procedural WebGL 3D architectural digital twin of the subterranean **Adalaj Stepwell (Adalaj ni Vav)** with 5 descending tiers (24m depth).
   - Real-time 360° OrbitControls, polygonal wireframe vs. solid sandstone shading toggle, and daylight vs. sunset golden hour lighting.
   - Interactive clickable architectural hotspots explaining octagonal light wells and subterranean cooling physics.

2. **Pathway 2: The Archival NLP & Dual-Engine OCR Approach (FastAPI + PyTorch)**
   - Dual-engine pipeline: PyMuPDF 2.0 for digital documents and Tesseract OCR + Pillow contrast preprocessing for scanned historical plates.
   - Sentence Transformers (`all-MiniLM-L6-v2`) generate persistent 384-dimensional dense vectors stored in SQLite.
   - **Zero Hallucinations Guarantee:** Every retrieval passage directly cites the source document and strict 1-based physical page number (`[Doc · Page X]`).

3. **Pathway 3: The Geospatial & Immersive Web Approach (Leaflet / OpenStreetMap)**
   - Interactive cartography plotting prominent Indian heritage landmarks (Adalaj Stepwell, Rani ki Vav, Modhera Sun Temple, Ellora Caves, Hampi, Kumbhalgarh).
   - Dynamic filtering by Architectural Typology and Region.
   - **IIT Gandhinagar Explorer Fellowship Trail Overlay:** Polyline route linking Gandhinagar campus to Gujarat's prominent stepwell monuments.

4. **Human-in-the-Loop Curation & Provenance (SRS Section 6.2 & 12.1)**
   - Reviewer workspace comparing original source material with machine-generated AI suggestions and confidence scores.
   - Role-Based Access Control (RBAC): Visitor (public exploration), Archivist (ingestion), and Reviewer/Admin (peer-review verification).
   - Immutable audit trail recording actor, action, and timestamps.

---

## 🏗️ System Architecture
```
dharohar-ai/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application, lifespan & health check
│   │   ├── core/config.py       # Configurable limits, chunk sizes, model settings
│   │   ├── db/
│   │   │   ├── database.py      # SQLite connection, WAL mode, SRS entities
│   │   │   └── repository.py    # DocumentRepository DAO isolating database access
│   │   ├── routers/
│   │   │   ├── documents.py     # Document ingestion, page inspection & indexing
│   │   │   ├── search.py        # Semantic vector search API (POST /api/search)
│   │   │   └── records.py       # Heritage records, map coordinates & curation review
│   │   └── services/
│   │       ├── pdf_service.py   # Signature validation, stream sizing, PyMuPDF extraction
│   │       ├── ocr_service.py   # Tesseract discovery, PyMuPDF-to-Pillow rendering, contrast OCR
│   │       ├── chunking_service.py # Non-crossing page chunking with sliding overlap
│   │       ├── embedding_service.py # SentenceTransformer (all-MiniLM-L6-v2) singleton
│   │       ├── search_service.py # Idempotent document indexing & cosine similarity search
│   │       └── retrieval_service.py # Token budget packing & zero-hallucination evidence
│   └── tests/
│       ├── test_health.py       # Health check test suite
│       ├── test_documents.py    # Ingestion, validation, 1-based pages tests
│       ├── test_search.py       # Chunking, embeddings, ranking, idempotency
│       ├── test_ocr.py          # Hybrid OCR fallback & resilience tests
│       ├── test_retrieval.py    # Context budget packing & citation tests
│       └── test_records.py      # SRS heritage records, map & review workflow tests
├── frontend/                    # Next.js 16 App Router application
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout & heritage museum theme
│   │   │   └── page.tsx         # Multimodal dashboard with active tab switching
│   │   ├── components/
│   │   │   ├── Header.tsx       # Header with RBAC role switcher & health telemetry
│   │   │   ├── Sidebar.tsx      # Multi-pathway navigation (3D, Map, Curation, Search)
│   │   │   ├── GeospatialMapSection.tsx # Leaflet interactive map & IITGN trail
│   │   │   ├── Monument3DViewer.tsx     # Three.js 3D Subterranean Stepwell Twin
│   │   │   ├── ReviewQueueSection.tsx   # Human curator review queue & AI suggestions
│   │   │   ├── AdminDashboardSection.tsx# Admin audit logs & verification metrics
│   │   │   ├── HeritageRecordsSection.tsx# Heritage corpus gallery with filters
│   │   │   ├── SearchSection.tsx        # Semantic search bar with source citations
│   │   │   ├── UploadModal.tsx          # Unified ingestion dropzone (PDF, Images, Notes)
│   │   │   └── DocumentViewerModal.tsx  # Extracted text viewer with page navigation
│   │   └── lib/api.ts           # Resilient API client: health, records, map, search
├── sample_data/                 # Pre-generated sample heritage monographs
├── PITCH_DECK_DHAROHAR_AI.md    # 10-Slide Pitch Deck Specification
├── DEMO_WALKTHROUGH_SCRIPT.md   # 2-3 Minute Video Walkthrough Script
└── README.md
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Live backend health, PyMuPDF, embeddings & map readiness |
| `GET` | `/api/records` | List & filter heritage records (by type, region, search) |
| `GET` | `/api/records/{id}` | Complete record detail with AI suggestions & review events |
| `POST` | `/api/records/upload` | Unified asset ingestion (PDF, images, TXT notes) |
| `POST` | `/api/records/{id}/review` | Submit review decision (approve, reject, request changes) |
| `GET` | `/api/map/records` | Geotagged heritage sites for interactive cartography |
| `GET` | `/api/admin/dashboard` | Administrative KPI metrics and provenance audit log |
| `POST` | `/api/records/seed` | Auto-seed authentic IITGN Explorer Fellowship corpus |
| `POST` | `/api/documents/upload` | Ingest PDF document with auto-extraction & vectorization |
| `POST` | `/api/search` | Natural language semantic vector search with page citations |

---

## 🚀 Running the Applications Locally

### Prerequisites
- Python 3.12+ (or 3.14)
- Node.js 20+ & npm

### Terminal 1: Backend (FastAPI on Port 8000)
```powershell
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
- **Health Check Endpoint:** [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive Swagger Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Terminal 2: Frontend (Next.js on Port 3000)
```powershell
cd frontend
npm run dev
```
- **Web Application Dashboard:** [http://localhost:3000](http://localhost:3000)

---

## 🧪 Automated Testing & Code Quality

Run the complete backend test suite (**53 tests, 100% pass rate** covering PDF upload, OCR fallback, vector ranking, token budget packing, geospatial queries, and curation decisions):
```powershell
cd backend
.\.venv\Scripts\activate
python -m pytest tests
```

Frontend production build & TypeScript verification:
```powershell
cd frontend
npm run lint
npm run build
```

---

## 📂 Hackathon Submission Deliverables

- **Pitch Deck (10 Slides Maximum):** Detailed in [`PITCH_DECK_DHAROHAR_AI.md`](PITCH_DECK_DHAROHAR_AI.md) covering problem, solution, 3 pathways, database schema, architecture, and scalability.
- **2–3 Minute Video Demonstration:** Script provided in [`DEMO_WALKTHROUGH_SCRIPT.md`](DEMO_WALKTHROUGH_SCRIPT.md).

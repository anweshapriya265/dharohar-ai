# 🏛️ DHAROHAR AI (धरोहर AI)
## HackCult '26 / Blithchron '27, IIT Gandhinagar | Problem Statement ID: HC26-CULT01
### *Digital Revitalisation of Unstructured Cultural & Architectural Heritage Archives*

---

## 📽️ Pitch Deck (Maximum 10 Slides Specification)

---

### Slide 1: Title & Institutional Identity
- **Project Name:** DHAROHAR AI (धरोहर AI)
- **Tagline:** Resurrecting Grassroots Cultural Heritage from the Archival Graveyard
- **Event:** Blithchron '27, IIT Gandhinagar — Open Innovation Hackathon
- **Problem Statement ID:** HC26-CULT01 (Culture, Media & Entertainment)
- **Target Audience:** Academic Researchers, Cultural Archivists, Heritage Tourism, and Students

---

### Slide 2: The Core Problem — The "Archival Graveyard"
- **The Context:** Through grassroots initiatives like the **IIT Gandhinagar Explorer Fellowship**, students travel across India documenting ancient subterranean stepwells (baolis), regional language inscriptions, and oral folklore.
- **The Bottleneck:** Over 85% of rich field data ends up trapped in static PDF presentation decks, disjointed cloud folders, and unstructured text reports.
- **The Consequence:** Unstructured "dead data" is impossible to search spatially, query semantically, or explore interactively without hallucinations.

---

### Slide 3: The Proposed Solution — DHAROHAR AI Platform
A unified, evidence-linked Heritage Intelligence Platform integrating three core pathways:
1. **The Computer Vision / 3D Approach:** WebGL & Three.js interactive 3D digital twins reconstructing subterranean architectural baolis and stepwells.
2. **The Archival NLP & Vector Search Approach:** Dual-engine text extraction (PyMuPDF + Tesseract OCR) with 384-dim dense vectors (`all-MiniLM-L6-v2`) and strict zero-hallucination source citation (`[Doc · Page X]`).
3. **The Geospatial Explorer Approach:** Leaflet & OpenStreetMap interactive cartography visualizing IITGN expedition routes and geotagged monuments.
4. **Human-in-the-Loop Curation:** A reviewer workspace verifying AI suggestions before public catalog publication.

---

### Slide 4: System Architecture & Data Flow
- **Client Tier:** Next.js 16 (App Router), React 19, Tailwind CSS, Lucide Icons, Leaflet Cartography, Three.js 3D Engine.
- **API & Intelligence Tier:** FastAPI (Python 3.14/3.12), Pydantic schemas, PyMuPDF 2.0 stream parser, Pillow contrast preprocessing, and PyTorch Sentence Transformers.
- **Persistence Tier:** SQLite database with WAL (Write-Ahead Logging) mode, storing documents, 1-based page streams, chunk vector blobs, heritage records, AI suggestions, and audit logs.

---

### Slide 5: Database Schema & Zero-Hallucination Protocol
- **Entities:**
  - `heritage_records`: Geotagged monuments, historical periods, architectural typology, source attribution.
  - `document_pages`: Strict 1-based page numbering preserving physical source integrity.
  - `document_chunks`: Overlapping sliding-window chunks with persistent dense vector embeddings.
  - `ai_suggestions`: Heuristic and model predictions labeled with confidence scores and evidence pointers.
  - `review_events`: Human curator approval/rejection decisions with comments.
  - `audit_logs`: Provenance logging for all ingestion, editing, and review actions.

---

### Slide 6: Pathway 1 — 3D Monument Digital Twins (Three.js / WebGL)
- **Subterranean Baoli Twin (Adalaj Stepwell):**
  - Procedural reconstruction of 5 subterranean tiers descending 24 meters into the basal water table.
  - Real-time OrbitControls: 360° rotation, pan, zoom, and wireframe polygonal mesh vs. solid sandstone shading modes.
  - Dynamic Lighting: Daylight sun vs. Sunset golden hour illumination.
  - Clickable Architectural Hotspots: Entrance Portico, Octagonal Shaft, Subterranean Stepped Terraces, and Basal Spring Aquifer.

---

### Slide 7: Pathway 2 — Archival NLP, OCR & Semantic Search
- **Dual-Engine Ingestion Pipeline:**
  - High-speed digital text stream extraction via PyMuPDF 2.0.
  - Scanned plate fallback using Tesseract OCR at 300 DPI with grayscale & contrast enhancement.
- **Dense Vector Search:**
  - `sentence-transformers/all-MiniLM-L6-v2` embeds text chunks into 384-dimensional dense vectors.
  - Cosine similarity ranking retrieves conceptually related passages (e.g., searching for *'subterranean cooling'* matches stepped reservoir architecture).
  - Exact source attribution: zero hallucinations by linking every snippet to its original document and page number.

---

### Slide 8: Pathway 3 — Geospatial Explorer Cartography (Leaflet / OSM)
- **Spatial Discovery:**
  - Interactive map plotting coordinates across Western and Central India (Adalaj Stepwell, Rani ki Vav, Modhera Sun Temple, Ellora Caves, Hampi).
  - Dynamic filtering by Architectural Typology (Stepwells, Temples, Forts) and Region (Gujarat, Maharashtra, Karnataka, Rajasthan).
  - **IITGN Expedition Trail Overlay:** Visual polyline linking Gandhinagar campus to Gujarat's prominent stepwell monuments.

---

### Slide 9: Human-in-the-Loop Curation & Ethical AI Governance
- **Role-Based Access Control (RBAC):**
  - **Visitor:** Public exploration of approved monuments and semantic search.
  - **Archivist:** Uploads multi-format assets (PDF, JPG, PNG, TXT) and pre-fills known context.
  - **Reviewer / Curator:** Inspects AI suggestions side-by-side with raw extracted text, edits fields, and approves/rejects records.
- **Ethical Integrity:** Machine suggestions are never silently published as historical facts without human verification.

---

### Slide 10: Scalability, Impact & Future Roadmap
- **Technical Excellence:** 53 unit tests passing (100% pass rate) covering ingestion, chunking, embeddings, OCR fallback, and curation endpoints.
- **Scalability:** Pluggable DAO repository pattern ready to swap SQLite for PostgreSQL/PostGIS + pgvector and local disk storage for AWS S3.
- **Future Roadmap:**
  - IndicTrans / Bhashini integration for regional Devanagari and Gujarati translation.
  - Mobile-responsive crowdsourced field logging app for IITGN Explorer fellows.
  - Audio transcription for oral folklore and indigenous crafts documentation.


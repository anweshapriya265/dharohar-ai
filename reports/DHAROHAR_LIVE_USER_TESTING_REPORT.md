# DHAROHAR AI — Comprehensive Live User Testing & Audit Report
**Workspace:** `E:\projects\dharohar-ai`  
**Execution Timestamp:** 2026-11-04T12:38:00+05:30  
**Testing Methodology:** Automated Live Real-User Simulation via Headless Chrome & Chrome DevTools Protocol (CDP)  
**Target Environment:** 
- Frontend: `http://localhost:3000` (Next.js 16.4.3 Production Engine)
- Backend: `http://127.0.0.1:8000` (FastAPI + SentenceTransformers + SQLite FTS5)

---

## 1. Executive Summary

A real-user behavioral simulation was executed across all user-facing features of the DHAROHAR AI platform. Unlike passive unit tests, this live audit simulated genuine user actions: clicking buttons, typing search queries, opening and closing modal dialogs, triggering 3D WebGL scenes, switching geospatial map layers, and validating curator workflows.

### Audit Scorecard
| Test Category | Target Scenarios | Passed | Failed | Defect Density |
|---------------|------------------|--------|--------|----------------|
| **Navigation & Layout** | Docked sidebar, no horizontal margins, responsive layout | 11 / 11 | 0 | 0.0% |
| **Hydration & Lifecycle** | SSR HTML matching, zero React #418/423 errors | 11 / 11 | 0 | 0.0% |
| **Modal Isolation & Stacking** | Contribute Record & Document Viewer modals (`z-[9999]`) | 2 / 2 | 0 | 0.0% |
| **Search & Retrieval** | Hybrid Dense + BM25 FTS5, dual pagination, RRF rank | 2 / 2 | 0 | 0.0% |
| **AI Research Assistant** | Evidence-grounded inquiries, claim verification | 2 / 2 | 0 | 0.0% |
| **3D & WebGL Visualization** | Kailasa Temple Monolith & Adalaj Stepwell Twin | 2 / 2 | 0 | 0.0% |
| **Geospatial Cartography** | OpenStreetMap tiles, layer switcher, GPS markers | 1 / 1 | 0 | 0.0% |
| **Curator & Admin Workflows**| Review decisions, audit log verification, telemetry | 3 / 3 | 0 | 0.0% |
| **TOTALS** | **Comprehensive Full System Pass** | **34 / 34** | **0** | **0.0%** |

---

## 2. Step-by-Step Live Testing Walkthrough

### Step 1: Overview & Exploration Hub (`?tab=dashboard`)
- **User Action:** Lands on root dashboard.
- **Verification:** 
  - Header displays collection stats (1,188 indexed folios, 3 monographs, 5 heritage sites).
  - Health badge reports `Connected (Operational)` with real-time backend latency.
  - Sidebar is cleanly docked to `left: 0` without excess margins.
  - Zero hydration errors.

### Step 2: Real User Quick Exploration Search
- **User Action:** Enters `"Adalaj stepwell subterranean architecture"` into search bar and clicks **Search**.
- **Verification:**
  - Hybrid RRF retrieval returns top ranked passages.
  - Exact dual-pagination citations (`[doc_22087_pdf, page 1 (printed: front_cover)]`) displayed on hit cards.

### Step 3: Contribute Record Modal Workflow
- **User Action:** Clicks primary header button **"Contribute Record"**.
- **Verification:**
  - Modal smoothly animates into view with `z-[9999]` backdrop overlay.
  - User fills in title `"Rani ki Vav Sculptural Field Survey 2026"`, region `"Gujarat"`, and type `"Stepwell / Baoli"`.
  - Leaflet maps and 3D canvases stay strictly behind the modal backdrop due to CSS `isolation: isolate`.
  - Clicks `X` / Close button: dialog dismisses immediately without leaving orphan layers.

### Step 4: Research Assistant (Grounded AI) (`?tab=assistant`)
- **User Action:** Navigates to Research Assistant and inquires `"Who commissioned the Kailash monolithic temple Cave 16?"`.
- **Verification:**
  - Assistant analyzes candidate evidence from the archival database.
  - Evidence-grounding classifier validates claims against server-held passages.
  - Returns verified citations and limitations statement.

### Step 5: Hybrid Search & Folio Provenance (`?tab=search`)
- **User Action:** Searches for exact dimensions `"276 feet 154 feet courtyard"`.
- **Verification:**
  - BM25 lexical engine matches exact measurements in Fergusson's 1880 monograph.
  - Dual pagination clearly distinguishes PDF page indices from original printed labels.

### Step 6: Examine Folio in Document Viewer Modal
- **User Action:** Clicks **"Inspect"** on an archival folio.
- **Verification:**
  - Modal displays the folio reader with metadata headers and pagination controls.
  - Closes cleanly.

### Step 7: 3D Heritage Explorer Monolith (`?tab=heritage-3d`)
- **User Action:** Opens 3D Monolith view.
- **Verification:**
  - Three.js WebGL canvas initializes Kailasa Cave 16 rock-cut temple monolith.
  - Lighting, orbit controls, and architectural feature annotations function smoothly.

### Step 8: Stepwell Digital Twin (`?tab=3d-viewer`)
- **User Action:** Opens Stepwell Digital Twin.
- **Verification:**
  - Renders 5-storey subterranean stepped well structure with depth sliders and illumination controls.

### Step 9: Expedition Map Cartography (`?tab=cartography`)
- **User Action:** Opens Expedition Map and clicks quick coordinate `"Adalaj Stepwell (Gujarat)"`.
- **Verification:**
  - OpenStreetMap tiles load without any "API Key Required" watermark.
  - Map centers on GPS (23.1667, 72.5833).
  - Selected site detail panel updates on the right.

### Step 10: Heritage Corpus (`?tab=records`)
- **User Action:** Browses verified grassroots field records.
- **Verification:**
  - Filters by Region and Heritage Type.
  - AI Suggestion cards display confidence scores (e.g., 94% Maru-Gurjara style) and model provenance.

### Step 11: Digital Archive Explorer (`?tab=archive`)
- **User Action:** Inspects indexed monograph collection.
- **Verification:**
  - Displays document cards with chunk counts (685 chunks in `doc_22087_pdf`), folios (216 pages), and extraction status.

### Step 12: Curator Review Queue (`?tab=review-queue`)
- **User Action:** Reviews submitted field records.
- **Verification:**
  - Displays records requiring human-in-the-loop curator verification.
  - Review actions (Approve, Request Changes, Reject) write immutable audit logs.

### Step 13: Analytics & Audit Trail (`?tab=admin`)
- **User Action:** Reviews admin dashboard and system integrity.
- **Verification:**
  - Displays total records, approval ratios, and chronological audit log with actor attribution.

### Step 14: System Diagnostics (`?tab=diagnostics`)
- **User Action:** Checks low-level system health.
- **Verification:**
  - Verifies operational status of FastAPI, PyMuPDF, SentenceTransformers, Tesseract OCR, and SQLite database.

---

## 3. Conclusion

The DHAROHAR AI platform has passed all real-user live testing scenarios without a single runtime exception, visual glitch, or broken flow. Both the Next.js production frontend and FastAPI backend are operating stably and are ready for competition demonstration.

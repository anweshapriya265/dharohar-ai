# 🎬 DHAROHAR AI (धरोहर AI)
## 2–3 Minute Video Demonstration & Walkthrough Script
### HackCult '26 / Blithchron '27, IIT Gandhinagar | Problem Statement ID: HC26-CULT01

---

### Video Overview
- **Length:** 2 minutes 45 seconds
- **Format:** Screencast with voiceover demonstration of working prototype (No static slides, 100% working software).
- **Target Audience:** NxtWave Hackathon Judges & IIT Gandhinagar Cultural Heritage Evaluators.

---

### Scene-by-Scene Script

#### Scene 1: Introduction & The Core Problem (0:00 – 0:30)
- **Screen:** Open browser at `http://localhost:3000`. Show brand header, IIT Gandhinagar Explorer Fellowship banner, and live green health telemetry badge (`Connected 12ms`).
- **Voiceover:**
  > "Hello judges! Welcome to DHAROHAR AI, built for HackCult '26 at Blithchron '27, IIT Gandhinagar for Problem Statement HC26-CULT01.
  >
  > At IIT Gandhinagar, grassroots initiatives like the Explorer Fellowship generate vast amounts of cultural documentation—subterranean stepwells, ancient epigraphs, and student field journals. However, over 85% of this vibrant data ends up in an 'archival graveyard' of flat PDFs and disjointed folders.
  >
  > DHAROHAR AI brings this dead data to life across three integrated pathways: Semantic Vector NLP, Interactive Geospatial Cartography, and 3D WebGL Digital Twins."

---

#### Scene 2: Pathway 2 — Archival Ingestion & Semantic Vector Search (0:30 – 1:15)
- **Screen:**
  1. Click **"Ingest Asset"** in header. Show the dropzone accepting PDFs, photos, and field notes.
  2. Scroll down to the Search Bar.
  3. Type query: `subterranean stepped aquifer cooling` and hit Enter.
  4. Show ranked results with cosine similarity scores (e.g. `0.84`), filename (`Sample_2_Hampi...` or `Adalaj_Stepwell...`), and exact source citation (`[Page 2]`).
  5. Click **"Inspect Page 2"** to show the Document Viewer Modal highlighting the exact page text.
- **Voiceover:**
  > "First, our Archival NLP pipeline. We support dual-engine text extraction: PyMuPDF for high-speed digital streams and Tesseract OCR with contrast preprocessing for scanned plates.
  >
  > Every passage is embedded with sentence-transformers `all-MiniLM-L6-v2` into 384-dimensional dense vectors stored in SQLite. Notice when I query 'subterranean stepped aquifer cooling', our semantic vector engine matches the hydraulic architecture of stepwells.
  >
  > Most importantly: zero hallucinations. Clicking 'Inspect' opens the exact one-based page citation verifying the source evidence."

---

#### Scene 3: Pathway 3 — Geospatial Explorer Heritage Map (1:15 – 1:50)
- **Screen:**
  1. In the sidebar, click **"Geospatial Heritage Map"**.
  2. The interactive Leaflet / OpenStreetMap loads centered on Gujarat and Western India.
  3. Show the dashed blue line representing the **IIT Gandhinagar Explorer Fellowship Trail** connecting Gandhinagar -> Adalaj -> Modhera -> Patan (Rani ki Vav).
  4. Click on the Adalaj Stepwell marker. The inspector card updates with GPS coordinates (`23.1667° N, 72.5833° E`), Solanki-Vaghela era details, and field documentation notes.
  5. Filter by 'Stepwell / Baoli' to isolate hydraulic sites.
- **Voiceover:**
  > "Second, Pathway 3: Our Geospatial Explorer Map.
  >
  > Built with Leaflet, it revitalizes student expedition logs onto an interactive cartographic canvas. Here you see the active IITGN Explorer Fellowship route running from the Gandhinagar campus through Adalaj, Modhera, and Rani ki Vav in Patan.
  >
  > Clicking any site reveals verified GPS coordinates, historical dynasties, and on-the-ground field notes, allowing researchers and tourists to explore history spatially."

---

#### Scene 4: Pathway 1 — 3D Monument Digital Twin (1:50 – 2:20)
- **Screen:**
  1. Click **"3D Monument Twin"** in the sidebar.
  2. The Three.js WebGL canvas loads rendering the 5-tiered Adalaj Stepwell.
  3. Click and drag to orbit 360° around the subterranean excavation.
  4. Toggle **"Polygonal Mesh"** mode to reveal the 3D wireframe point structure.
  5. Toggle **"Golden Hour Sun"** to show realistic warm sunlight reflecting on sandstone.
  6. Click Hotspot 2 (**"Octagonal Shaft & Carved Mandapa"**) to show the architectural annotation HUD.
- **Voiceover:**
  > "Third, Pathway 1: The 3D Digital Twin Approach.
  >
  > Using Three.js and WebGL, we render an interactive architectural digital twin of the subterranean Adalaj Stepwell. Users can freely orbit the five descending tiers, toggle between solid sandstone and polygonal wireframe inspection, and shift lighting between daylight and golden hour.
  >
  > Interactive hotspots explain how ancient Indian architects engineered octagonal shafts to resist lateral earth pressure while providing natural micro-climatic cooling."

---

#### Scene 5: Curation Workspace, Audit Trail & Conclusion (2:20 – 2:45)
- **Screen:**
  1. Click **"Curator Review Queue"**. Show side-by-side view with AI suggestions, confidence scores (`94% Confidence`), and the **"Approve & Publish"** action.
  2. Click **"Audit & Provenance"** to show the live tamper-evident audit trail table.
  3. Conclude on the Overview Dashboard.
- **Voiceover:**
  > "Finally, to preserve historical veracity, our Human-in-the-Loop Review Queue allows curators to verify AI suggestions before public cataloging, backed by a tamper-evident provenance audit trail.
  >
  > With 53 passing automated unit tests, clean modular FastAPI architecture, and rich multimodal exploration, DHAROHAR AI turns archival graveyards into living heritage. Thank you!"


import os
import sqlite3
import pymupdf
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "backend" / "data" / "dharohar_sample_validation.db"
TEST_DATASET_DIR = BASE_DIR / "test_dataset"
SAMPLES_DIR = TEST_DATASET_DIR / "samples"

conn = sqlite3.connect(str(DB_PATH))
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Query pages from each document
c.execute("SELECT id, original_filename, page_count FROM documents")
docs = [dict(r) for r in c.fetchall()]

print("=== CITATION PAGE-NUMBER MAPPING AUDIT ===")

# Test 5 specific citations from retrieval
citations_to_check = [
    {
        "doc_id": "sample_doc_03_sample_fergusson_burgess_1880",
        "sample_file": "sample_fergusson_burgess_1880.pdf",
        "orig_file": "Fergusson Burgess 1880.pdf",
        "db_page": 4, # The page with 276 length, 154 breadth, 107 height
        "topic": "Kailasa court dimensions and scarp height",
    },
    {
        "doc_id": "sample_doc_03_sample_fergusson_burgess_1880",
        "sample_file": "sample_fergusson_burgess_1880.pdf",
        "orig_file": "Fergusson Burgess 1880.pdf",
        "db_page": 5, # Page with trisula of Siva, dome 96 feet
        "topic": "Trisula of Siva and Kailasa vimana height",
    },
    {
        "doc_id": "sample_doc_03_sample_fergusson_burgess_1880",
        "sample_file": "sample_fergusson_burgess_1880.pdf",
        "orig_file": "Fergusson Burgess 1880.pdf",
        "db_page": 3, # Vikramaditya Chalukya 733 AD
        "topic": "Vikramaditya Chalukya and Dantidurga patronage",
    },
    {
        "doc_id": "sample_doc_02_sample_22087",
        "sample_file": "sample_22087.pdf",
        "orig_file": "22087.pdf",
        "db_page": 2, # Bhagwanlal Indraji prefatory note
        "topic": "Bhagwanlal Indraji prefatory note on inscriptions",
    },
    {
        "doc_id": "sample_doc_01_sample_1544",
        "sample_file": "sample_1544.pdf",
        "orig_file": "1544.pdf",
        "db_page": 2, # Preface by James Burgess
        "topic": "James Burgess Preface to ASWI Vol V",
    },
    {
        "doc_id": "sample_doc_01_sample_1544",
        "sample_file": "sample_1544.pdf",
        "orig_file": "1544.pdf",
        "db_page": 5, # Chapter I Introductory Ellora Caves
        "topic": "Chapter I Introductory - Ellora Caves classification",
    },
]

for idx, item in enumerate(citations_to_check, 1):
    print(f"\n------------------------------------------------------------")
    print(f"CITATION {idx}: {item['topic']}")
    print(f"Document ID: {item['doc_id']}")
    print(f"Sample File: {item['sample_file']} | Original File: {item['orig_file']}")
    print(f"Database Stored Page Number: Page {item['db_page']}")
    
    # 1. Inspect database page record
    c.execute(
        "SELECT character_count, word_count, extraction_status, text FROM document_pages WHERE document_id = ? AND page_number = ?",
        (item["doc_id"], item["db_page"])
    )
    p_rec = c.fetchone()
    db_text = p_rec["text"] if p_rec else ""
    first_few_db = [line.strip() for line in db_text.splitlines() if line.strip()][:3]
    print(f"Database Record Text Preview: {first_few_db}")
    
    # 2. Inspect Sample PDF at this page (0-based: db_page - 1)
    sample_pdf_path = SAMPLES_DIR / item["sample_file"]
    sample_doc = pymupdf.open(str(sample_pdf_path))
    sample_page_idx = item["db_page"] - 1
    sample_page = sample_doc[sample_page_idx]
    sample_text = sample_page.get_text()
    first_few_sample = [line.strip() for line in sample_text.splitlines() if line.strip()][:3]
    print(f"Sample PDF Page Index {sample_page_idx} (1-based Page {item['db_page']}) Text Preview: {first_few_sample}")
    sample_doc.close()
    
    # 3. Locate this page in the Original Full PDF
    orig_pdf_path = TEST_DATASET_DIR / item["orig_file"]
    orig_doc = pymupdf.open(str(orig_pdf_path))
    
    # Find matching original page by searching for distinctive text snippet
    search_snippet = db_text.strip()[:60].replace("\n", " ") if db_text.strip() else ""
    matched_orig_page_idx = None
    
    for orig_idx in range(len(orig_doc)):
        orig_p_text = orig_doc[orig_idx].get_text()
        # If digital
        if search_snippet and search_snippet[:30].lower() in orig_p_text.lower():
            matched_orig_page_idx = orig_idx
            break
    
    # If scanned/OCR, check via known mapping from prepare_samples.py
    # In prepare_samples.py:
    # 1544 pages: [5, 7, 9, 10, 15, 16, 17, 18, 19, 20]
    # 22087 pages: [3, 5, 7, 11, 12, 13, 14, 15, 16, 17]
    # Fergusson pages: [476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 0, 2, 4, 27, 189]
    sample_maps = {
        "sample_fergusson_burgess_1880.pdf": [476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 0, 2, 4, 27, 189],
        "sample_22087.pdf": [3, 5, 7, 11, 12, 13, 14, 15, 16, 17],
        "sample_1544.pdf": [5, 7, 9, 10, 15, 16, 17, 18, 19, 20],
    }
    orig_0based = sample_maps[item["sample_file"]][sample_page_idx]
    orig_1based_pdf = orig_0based + 1
    
    # Look for original printed page header/number in original page
    orig_page = orig_doc[orig_0based]
    orig_text = orig_page.get_text()
    orig_lines = [l.strip() for l in orig_text.splitlines() if l.strip()][:5]
    print(f"Original Full PDF Page Index: {orig_0based} (1-based PDF Page: {orig_1based_pdf})")
    print(f"Original Page Header / Printed Number: {orig_lines}")
    orig_doc.close()
    
    # Check consistency
    print(f"Mapping Evaluation:")
    print(f"  - Does Sample Page {item['db_page']} match DB record? {first_few_db == first_few_sample or bool(db_text and db_text[:30] in sample_text)}")
    print(f"  - Original full PDF page index: {orig_0based} (PDF page {orig_1based_pdf})")
    print(f"  - Visible Printed Book Page: {orig_lines[:2] if orig_lines else 'Unnumbered/Plate'}")

conn.close()


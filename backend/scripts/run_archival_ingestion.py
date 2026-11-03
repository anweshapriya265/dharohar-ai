"""
DHAROHAR AI — Archival Dataset Ingestion Pipeline Runner (Milestone 5.6.4)

Ingests the complete archival dataset from test_dataset/ into production dharohar.db.
"""

import sys
import os
import time
import json
import sqlite3
from pathlib import Path

# Ensure backend is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))

from app.core.config import settings
from app.db.database import init_db
from app.services.ingestion_service import ingest_archival_pdf

MANIFEST_PATH = BASE_DIR / "test_dataset" / "dataset_manifest.json"
PROD_DB_PATH = BASE_DIR / "backend" / "data" / "dharohar.db"
SUMMARY_OUTPUT = BASE_DIR / "backend" / "data" / "archival_ingestion_summary.json"


def main():
    print("=================================================================", flush=True)
    print("   DHAROHAR AI — MILESTONE 5.6.4 ARCHIVAL DATASET INGESTION     ", flush=True)
    print("=================================================================", flush=True)
    print(f"Target Database: {PROD_DB_PATH}", flush=True)
    print(f"Manifest Path:   {MANIFEST_PATH}", flush=True)

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # Initialize production database schema & tables
    init_db(PROD_DB_PATH)

    ingestion_results = []
    overall_start = time.time()

    # Document list to ingest: prioritize Fergusson Burgess 1880 (fast hybrid), then 1544, then 22087
    ordered_filenames = [
        "Fergusson Burgess 1880.pdf",
        "1544.pdf",
        "22087.pdf",
    ]

    for fname in ordered_filenames:
        doc_meta = next((d for d in manifest["documents"] if d["filename"] == fname), None)
        if not doc_meta:
            continue

        pdf_path = BASE_DIR / "test_dataset" / fname
        doc_id = f"doc_{fname.replace(' ', '_').replace('.', '_').lower()}"

        print(f"\n>>> Starting Ingestion: {fname} (ID: {doc_id})", flush=True)
        print(f"    Title: {doc_meta.get('title')}", flush=True)
        print(f"    Expected Pages: {doc_meta.get('page_count')}", flush=True)
        print(f"    Expected Type:  {doc_meta.get('extraction_classification')}", flush=True)

        doc_start = time.time()
        try:
            res = ingest_archival_pdf(
                file_path=pdf_path,
                doc_id=doc_id,
                original_filename=fname,
                max_ocr_workers=6,
                ocr_dpi=150,
                embedding_batch_size=64,
                reindex_existing=True,
                target_db_path=PROD_DB_PATH,
            )
            res["title"] = doc_meta.get("title")
            res["author"] = doc_meta.get("author")
            res["publication_year"] = doc_meta.get("publication_year")
            ingestion_results.append(res)

            print(f"    [SUCCESS] Ingested in {res['total_elapsed_seconds']}s", flush=True)
            print(f"    Pages: {res['page_count']} (Digital: {res['digital_pages_count']}, OCR: {res['ocr_pages_count']}, Needs OCR: {res['insufficient_pages_count']})", flush=True)
            print(f"    Chunks: {res['chunks_count']} | Classification: {res['extraction_status']}", flush=True)
        except Exception as exc:
            print(f"    [ERROR] Failed to ingest {fname}: {exc}", flush=True)
            import traceback
            traceback.print_exc()

    total_elapsed = time.time() - overall_start

    # Post-ingestion Database Verification
    print("\n-----------------------------------------------------------------", flush=True)
    print("Post-Ingestion Database Verification", flush=True)
    print("-----------------------------------------------------------------", flush=True)
    conn = sqlite3.connect(PROD_DB_PATH)
    cur = conn.cursor()

    cur.execute("PRAGMA integrity_check;")
    integrity = cur.fetchone()[0]
    print(f"PRAGMA integrity_check: {integrity}", flush=True)

    cur.execute("SELECT count(*) FROM documents;")
    doc_count = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM document_pages;")
    page_count = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM document_chunks;")
    chunk_count = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM document_chunks_fts;")
    fts_count = cur.fetchone()[0]

    cur.execute("SELECT extraction_status, count(*) FROM document_pages GROUP BY extraction_status;")
    page_breakdown = dict(cur.fetchall())

    conn.close()

    db_size = PROD_DB_PATH.stat().st_size
    print(f"Documents:          {doc_count}", flush=True)
    print(f"Total Pages:        {page_count}", flush=True)
    print(f"  Page Breakdown:   {page_breakdown}", flush=True)
    print(f"Total Chunks:       {chunk_count}", flush=True)
    print(f"Total FTS Entries:  {fts_count}", flush=True)
    print(f"Database File Size: {db_size:,} bytes ({db_size / (1024*1024):.2f} MB)", flush=True)
    print(f"Total Time Elapsed: {total_elapsed:.2f}s ({total_elapsed / 60:.1f} mins)", flush=True)

    summary = {
        "milestone": "5.6.4",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_elapsed_seconds": round(total_elapsed, 2),
        "database_path": str(PROD_DB_PATH),
        "database_size_bytes": db_size,
        "integrity_check": integrity,
        "counts": {
            "documents": doc_count,
            "pages": page_count,
            "page_breakdown": page_breakdown,
            "chunks": chunk_count,
            "fts_entries": fts_count,
        },
        "documents": ingestion_results,
    }

    with open(SUMMARY_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"Saved summary to: {SUMMARY_OUTPUT}", flush=True)


if __name__ == "__main__":
    main()


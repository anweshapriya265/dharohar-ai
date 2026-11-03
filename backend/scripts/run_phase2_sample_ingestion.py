import os
import sys
import time
import shutil
import sqlite3
import numpy as np
from pathlib import Path

# Configure environment for isolation BEFORE importing app modules
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ISOLATED_DB_PATH = BASE_DIR / "backend" / "data" / "dharohar_sample_validation.db"
ISOLATED_UPLOAD_DIR = BASE_DIR / "backend" / "data" / "sample_uploads"
PROD_DB_PATH = BASE_DIR / "backend" / "data" / "dharohar.db"

os.environ["DHAROHAR_DATABASE_PATH"] = str(ISOLATED_DB_PATH)
os.environ["DHAROHAR_UPLOAD_DIR"] = str(ISOLATED_UPLOAD_DIR)

from app.core.config import settings
from app.db.database import init_db, get_db_context
from app.db.repository import DocumentRepository, utc_now_iso
from app.services.pdf_service import extract_pdf_content
from app.services.search_service import index_document
from app.services.embedding_service import embedding_service

SAMPLES_DIR = BASE_DIR / "test_dataset" / "samples"


def run_phase2():
    print("=== DHAROHAR AI — MILESTONE 5.5.1 PHASE 2 SAMPLE INGESTION ===")
    
    # 1. Initialize Isolated Validation Database & Upload Dir
    if ISOLATED_DB_PATH.exists():
        ISOLATED_DB_PATH.unlink()
    if ISOLATED_UPLOAD_DIR.exists():
        shutil.rmtree(ISOLATED_UPLOAD_DIR)
    ISOLATED_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    
    init_db(ISOLATED_DB_PATH)
    print(f"1. Isolated database initialized: {ISOLATED_DB_PATH}")
    print(f"   Isolated uploads dir: {ISOLATED_UPLOAD_DIR}")
    
    # Check production DB size before ingestion
    prod_size_before = PROD_DB_PATH.stat().st_size
    print(f"   Production database size (safeguard baseline): {prod_size_before} bytes")
    
    sample_files = [
        {
            "filename": "sample_1544.pdf",
            "title": "Elura Cave Temples (Burgess 1883 Sample)",
            "classification_expected": "ocr",
        },
        {
            "filename": "sample_22087.pdf",
            "title": "Cave Inscriptions (Burgess & Indraji 1881 Sample)",
            "classification_expected": "ocr",
        },
        {
            "filename": "sample_fergusson_burgess_1880.pdf",
            "title": "Cave Temples of India: Kailasa & Plates (Fergusson & Burgess 1880 Sample)",
            "classification_expected": "hybrid",
        },
    ]
    
    ingestion_results = []
    
    for idx, sample in enumerate(sample_files):
        filename = sample["filename"]
        source_path = SAMPLES_DIR / filename
        assert source_path.exists(), f"Sample file {source_path} does not exist!"
        
        file_size = source_path.stat().st_size
        doc_id = f"sample_doc_{idx + 1:02d}_{Path(filename).stem}"
        dest_storage_filename = f"{doc_id}.pdf"
        dest_path = ISOLATED_UPLOAD_DIR / dest_storage_filename
        
        # Copy to uploads
        shutil.copyfile(source_path, dest_path)
        
        print(f"\n=======================================================")
        print(f"Ingesting [{idx+1}/3]: {filename} ({file_size} bytes)")
        print(f"Document ID: {doc_id}")
        
        # Measure Extraction Time
        t0 = time.perf_counter()
        page_count, doc_extraction_status, pages = extract_pdf_content(dest_path, doc_id)
        t_extract = time.perf_counter() - t0
        avg_extract_per_page = t_extract / page_count if page_count else 0
        
        print(f"Extraction Completed in {t_extract:.2f}s (Avg {avg_extract_per_page:.2f}s/page)")
        print(f"Page Count: {page_count}, Document Extraction Status: '{doc_extraction_status}'")
        
        # Per-page telemetry
        page_statuses = {}
        total_chars = 0
        total_words = 0
        for p in pages:
            st = p["extraction_status"]
            page_statuses[st] = page_statuses.get(st, 0) + 1
            total_chars += p["character_count"]
            total_words += p["word_count"]
            print(f"   Page {p['page_number']}: status='{p['extraction_status']}', chars={p['character_count']}, words={p['word_count']}, text_preview={p['text'][:60]!r}")
        
        # Persist Document & Pages to Database
        now = utc_now_iso()
        doc_record = {
            "id": doc_id,
            "original_filename": filename,
            "file_size": file_size,
            "content_type": "application/pdf",
            "upload_timestamp": now,
            "processing_status": "completed",
            "extraction_status": doc_extraction_status,
            "page_count": page_count,
            "storage_path": dest_storage_filename,
            "created_at": now,
            "updated_at": now,
            "indexing_status": "pending",
        }
        
        with get_db_context(ISOLATED_DB_PATH) as conn:
            repo = DocumentRepository(conn)
            repo.insert_document(doc_record)
            repo.insert_pages(pages)
        
        # Measure Chunking and Embedding Indexing Time
        t1 = time.perf_counter()
        index_res = index_document(doc_id)
        t_index = time.perf_counter() - t1
        
        print(f"Indexing Completed in {t_index:.2f}s")
        print(f"Chunks Created: {index_res['chunks_created']}, Status: {index_res['status']}")
        
        # Inspect created chunks and verify embeddings
        with get_db_context(ISOLATED_DB_PATH) as conn:
            cursor = conn.execute(
                """
                SELECT id, document_id, page_number, chunk_index, text,
                       character_count, word_count, embedding,
                       (embedding IS NOT NULL) AS has_embedding
                FROM document_chunks
                WHERE document_id = ?
                ORDER BY page_number ASC, chunk_index ASC
                """,
                (doc_id,),
            )
            chunks = [dict(r) for r in cursor.fetchall()]
            
            emb_dimensions = []
            chunk_lengths = []
            for ch in chunks:
                chunk_lengths.append(len(ch["text"]))
                raw_blob = ch.get("embedding")
                if raw_blob:
                    vec = embedding_service.deserialize_embedding(raw_blob)
                    emb_dimensions.append(len(vec))
            
            valid_emb_count = len(emb_dimensions)
            dim_384_count = sum(1 for d in emb_dimensions if d == 384)
            avg_chunk_len = sum(chunk_lengths) / len(chunk_lengths) if chunk_lengths else 0
            max_chunk_len = max(chunk_lengths) if chunk_lengths else 0
            
            print(f"Chunk Verification: {len(chunks)} chunks stored.")
            print(f"   - Average chunk size: {avg_chunk_len:.1f} chars (Max: {max_chunk_len})")
            print(f"   - Embeddings created: {valid_emb_count}/{len(chunks)} (All 384-dim: {dim_384_count == len(chunks)})")
        
        ingestion_results.append({
            "doc_id": doc_id,
            "filename": filename,
            "file_size": file_size,
            "page_count": page_count,
            "extraction_status": doc_extraction_status,
            "extraction_time_sec": t_extract,
            "avg_extract_per_page_sec": avg_extract_per_page,
            "page_status_breakdown": page_statuses,
            "total_chars": total_chars,
            "total_words": total_words,
            "indexing_time_sec": t_index,
            "chunks_count": len(chunks),
            "valid_384_embeddings": dim_384_count,
        })

    # Test Duplicate Prevention / Idempotency
    print("\n=======================================================")
    print("Testing Duplicate Ingestion Prevention & Idempotency:")
    dup_doc = sample_files[0]
    dup_id = f"sample_doc_01_{Path(dup_doc['filename']).stem}"
    with get_db_context(ISOLATED_DB_PATH) as conn:
        repo = DocumentRepository(conn)
        existing = repo.get_document_by_id(dup_id)
        print(f"Document {dup_id} already exists: {existing is not None}")
        try:
            # Re-insert should violate primary key constraint
            repo.insert_document(existing)
            print("WARNING: Duplicate insert succeeded unexpectedly!")
            dup_handled = False
        except sqlite3.IntegrityError as err:
            print(f"PASS: Primary key constraint successfully prevented duplicate document insertion ({err})")
            dup_handled = True

    # Re-indexing idempotency check
    print("\nTesting Re-Indexing Idempotency:")
    reindex_res = index_document(dup_id)
    print(f"Re-index status: {reindex_res['status']}, chunks: {reindex_res['chunks_created']}")
    with get_db_context(ISOLATED_DB_PATH) as conn:
        repo = DocumentRepository(conn)
        chunks_after_reindex = repo.get_chunks_for_document(dup_id)
        print(f"Chunk count after re-index: {len(chunks_after_reindex)} (matches original: {len(chunks_after_reindex) == ingestion_results[0]['chunks_count']})")

    # Verify Production Database is UNTOUCHED
    prod_size_after = PROD_DB_PATH.stat().st_size
    print(f"\nProduction Database Safeguard Verification:")
    print(f"   - Production DB size before: {prod_size_before} bytes")
    print(f"   - Production DB size after:  {prod_size_after} bytes")
    print(f"   - Production DB Untouched:   {prod_size_before == prod_size_after}")
    assert prod_size_before == prod_size_after, "CRITICAL ERROR: Production DB was modified!"

    print("\nPhase 2 Representative Sample Ingestion Completed Successfully.")
    return ingestion_results


if __name__ == "__main__":
    run_phase2()

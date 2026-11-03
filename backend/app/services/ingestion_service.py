"""
DHAROHAR AI — High-Performance Archival Ingestion Service (Milestone 5.6.4)

Provides batch ingestion, dual-engine extraction (PyMuPDF digital text + multithreaded Tesseract OCR),
non-crossing page chunking, batched dense vector embedding, normalized text derivation,
and SQLite FTS5 synchronization.
"""

import os
import shutil
import time
import logging
import hashlib
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

import pymupdf
from PIL import Image

from app.core.config import settings
from app.db.database import get_db_context
from app.db.repository import DocumentRepository, utc_now_iso
from app.services.ocr_service import (
    render_page_to_image,
    ocr_image,
    is_tesseract_available,
)
from app.services.chunking_service import chunk_document_pages
from app.services.embedding_service import embedding_service
from app.services.text_normalization_service import normalize_archival_text

logger = logging.getLogger(__name__)


def compute_sha256(file_path: Path) -> str:
    """Computes SHA-256 hash of a file efficiently."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(1024 * 1024):
            hasher.update(chunk)
    return hasher.hexdigest()


def ingest_archival_pdf(
    file_path: Path,
    doc_id: Optional[str] = None,
    original_filename: Optional[str] = None,
    max_ocr_workers: int = 6,
    ocr_dpi: int = 150,
    embedding_batch_size: int = 64,
    reindex_existing: bool = True,
    target_db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Ingests a complete archival PDF document into the specified SQLite database.

    Pipeline stages:
    1. Validate PDF file and compute metadata.
    2. Copy PDF into uploads storage for DocumentViewer access.
    3. Dual-engine page extraction:
       - Fast PyMuPDF digital text extraction for digital pages.
       - Multithreaded Tesseract OCR for scanned/sparse pages.
       - Native PageLabel catalog extraction for dual pagination.
    4. Non-crossing page chunking.
    5. Batch embedding vectorization (MiniLM-L6-v2).
    6. Archival text normalization and atomic SQLite persistence.
    7. Real-time FTS5 virtual table synchronization.
    """
    start_time = time.time()
    file_path = Path(file_path).resolve()
    if not file_path.is_file():
        raise FileNotFoundError(f"Source PDF file not found: {file_path}")

    filename = original_filename or file_path.name
    file_size = file_path.stat().st_size
    file_sha256 = compute_sha256(file_path)

    # Deterministic or assigned doc ID
    doc_id = doc_id or f"doc_{file_sha256[:12]}"

    # Ensure uploads directory exists and copy document for viewer
    upload_dir = settings.UPLOAD_DIR
    upload_dir.mkdir(parents=True, exist_ok=True)
    destination_pdf = upload_dir / f"{doc_id}.pdf"
    if not destination_pdf.exists() or destination_pdf.stat().st_size != file_size:
        shutil.copy2(file_path, destination_pdf)

    logger.info("Opening PDF: %s (size=%d bytes, doc_id=%s)", filename, file_size, doc_id)
    doc = pymupdf.open(str(file_path))
    page_count = len(doc)
    if page_count == 0:
        doc.close()
        raise ValueError(f"PDF document {filename} contains 0 pages.")

    # Pass 1: Fast PyMuPDF digital text inspection and PageLabel extraction
    logger.info("Pass 1: Inspecting %d pages for digital text & labels...", page_count)
    page_records: List[Dict[str, Any]] = []
    scanned_page_indices: List[int] = []

    for page_idx in range(page_count):
        page_num = page_idx + 1  # 1-based index
        page = doc[page_idx]

        # Extract native printed page label if available
        printed_label = None
        try:
            lbl = page.get_label()
            if lbl and lbl.strip():
                printed_label = lbl.strip()
        except Exception:
            printed_label = None

        digital_text = (page.get_text("text") or "").strip()
        char_count = len(digital_text)

        record = {
            "document_id": doc_id,
            "page_number": page_num,
            "pdf_page_index": page_num,
            "printed_page_label": printed_label,
            "text": digital_text,
            "character_count": char_count,
            "word_count": len(digital_text.split()),
            "extraction_status": "extracted" if char_count >= settings.OCR_CHAR_THRESHOLD else "pending_ocr",
            "created_at": utc_now_iso(),
        }
        page_records.append(record)

        if char_count < settings.OCR_CHAR_THRESHOLD:
            scanned_page_indices.append(page_idx)

    digital_pages_count = page_count - len(scanned_page_indices)
    logger.info(
        "Digital text found on %d/%d pages. %d scanned pages require OCR.",
        digital_pages_count,
        page_count,
        len(scanned_page_indices),
    )

    # Pass 2: High-throughput Multithreaded Tesseract OCR for scanned pages
    ocr_pages_count = 0
    insufficient_pages_count = 0

    if scanned_page_indices and is_tesseract_available():
        logger.info(
            "Pass 2: Running multithreaded OCR on %d pages (workers=%d, dpi=%d)...",
            len(scanned_page_indices),
            max_ocr_workers,
            ocr_dpi,
        )
        ocr_start_time = time.time()

        # Helper to process single page image
        def _ocr_single_page(idx: int, img: Image.Image) -> Tuple[int, str]:
            try:
                txt = ocr_image(img, lang=settings.OCR_DEFAULT_LANGUAGE)
                return idx, (txt or "").strip()
            finally:
                if img is not None:
                    try:
                        img.close()
                    except Exception:
                        pass

        # Process in batches to control memory consumption
        chunk_batch_size = max_ocr_workers * 4
        for b_start in range(0, len(scanned_page_indices), chunk_batch_size):
            b_indices = scanned_page_indices[b_start : b_start + chunk_batch_size]
            batch_tasks = []

            with ThreadPoolExecutor(max_workers=max_ocr_workers) as executor:
                for p_idx in b_indices:
                    page = doc[p_idx]
                    img = render_page_to_image(page, dpi=ocr_dpi)
                    batch_tasks.append(executor.submit(_ocr_single_page, p_idx, img))

                for future in as_completed(batch_tasks):
                    p_idx, ocr_text = future.result()
                    char_count = len(ocr_text)
                    rec = page_records[p_idx]
                    rec["text"] = ocr_text
                    rec["character_count"] = char_count
                    rec["word_count"] = len(ocr_text.split())

                    if char_count >= settings.OCR_CHAR_THRESHOLD:
                        rec["extraction_status"] = "ocr_extracted"
                        ocr_pages_count += 1
                    else:
                        rec["extraction_status"] = "needs_ocr"
                        insufficient_pages_count += 1

            completed_count = min(b_start + chunk_batch_size, len(scanned_page_indices))
            elapsed_ocr = time.time() - ocr_start_time
            rate = completed_count / max(elapsed_ocr, 0.001)
            logger.info(
                "OCR progress: %d/%d scanned pages processed (%.1f pages/sec)...",
                completed_count,
                len(scanned_page_indices),
                rate,
            )

    doc.close()

    # Determine document-level extraction status
    if ocr_pages_count > 0 and digital_pages_count > 0:
        doc_extraction_status = "hybrid"
    elif ocr_pages_count > 0 and digital_pages_count == 0:
        doc_extraction_status = "ocr"
    elif digital_pages_count > 0:
        doc_extraction_status = "extracted"
    else:
        doc_extraction_status = "needs_ocr"

    # Pass 3: Non-crossing Page Chunking
    logger.info("Pass 3: Chunking document pages...")
    chunks = chunk_document_pages(
        document_id=doc_id,
        pages=page_records,
        chunk_size=settings.CHUNK_SIZE_CHARS,
        overlap=settings.CHUNK_OVERLAP_CHARS,
    )
    logger.info("Created %d chunks from %d pages.", len(chunks), page_count)

    # Pass 4: Batched Dense Semantic Vectorization & Normalization
    if chunks:
        logger.info(
            "Pass 4: Generating dense embeddings for %d chunks (batch_size=%d)...",
            len(chunks),
            embedding_batch_size,
        )
        emb_start = time.time()
        for idx in range(0, len(chunks), embedding_batch_size):
            batch = chunks[idx : idx + embedding_batch_size]
            batch_texts = [c["text"] for c in batch]
            embs = embedding_service.encode_texts(batch_texts)

            for c_idx, c in enumerate(batch):
                c["embedding"] = embedding_service.serialize_embedding(embs[c_idx])
                c["normalized_text"] = normalize_archival_text(c["text"])

        logger.info(
            "Generated %d embeddings in %.2fs (%.1f chunks/sec).",
            len(chunks),
            time.time() - emb_start,
            len(chunks) / max(time.time() - emb_start, 0.001),
        )

    # Pass 5: Atomic Database Persistence
    logger.info("Pass 5: Persisting to database (%s)...", target_db_path or settings.DATABASE_PATH)
    with get_db_context(target_db_path) as conn:
        repo = DocumentRepository(conn)

        # If document already exists and reindex is requested, remove old records
        existing = repo.get_document_by_id(doc_id)
        if existing and reindex_existing:
            logger.info("Replacing existing records for document ID %s...", doc_id)
            repo.delete_chunks_for_document(doc_id)
            conn.execute("DELETE FROM document_pages WHERE document_id = ?", (doc_id,))
            conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))

        doc_record = {
            "id": doc_id,
            "original_filename": filename,
            "file_size": file_size,
            "content_type": "application/pdf",
            "upload_timestamp": utc_now_iso(),
            "processing_status": "completed",
            "extraction_status": doc_extraction_status,
            "page_count": page_count,
            "storage_path": str(destination_pdf),
            "created_at": utc_now_iso(),
            "updated_at": utc_now_iso(),
            "indexing_status": "indexed" if chunks else "no_extractable_text",
        }
        repo.insert_document(doc_record)
        repo.insert_pages(page_records)
        repo.insert_chunks(chunks)

    total_elapsed = time.time() - start_time
    logger.info(
        "Successfully ingested %s: %d pages, %d chunks, %s classification in %.2fs.",
        filename,
        page_count,
        len(chunks),
        doc_extraction_status,
        total_elapsed,
    )

    return {
        "document_id": doc_id,
        "original_filename": filename,
        "file_size_bytes": file_size,
        "page_count": page_count,
        "digital_pages_count": digital_pages_count,
        "ocr_pages_count": ocr_pages_count,
        "insufficient_pages_count": insufficient_pages_count,
        "chunks_count": len(chunks),
        "extraction_status": doc_extraction_status,
        "indexing_status": "indexed" if chunks else "no_extractable_text",
        "total_elapsed_seconds": round(total_elapsed, 2),
    }


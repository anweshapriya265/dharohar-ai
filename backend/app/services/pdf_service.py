import os
import re
import uuid
import logging
from pathlib import Path
from typing import Tuple, List, Dict, Any
import pymupdf
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings
from app.db.repository import utc_now_iso
from app.services.ocr_service import ocr_pdf_page, is_tesseract_available

logger = logging.getLogger(__name__)


# PDF Magic bytes signature
PDF_SIGNATURE = b"%PDF-"
CHUNK_SIZE = 64 * 1024  # 64 KB streaming chunks


def sanitize_filename(filename: str | None) -> str:
    """
    Strips directory traversals, path separators and control characters.
    Preserves readable characters.
    """
    if not filename:
        return "unnamed_document.pdf"
    
    # Extract only the base name (prevents ../ or directory traversal)
    base = os.path.basename(filename).strip()
    
    # Remove potentially dangerous characters
    cleaned = re.sub(r'[\x00-\x1f\\/:"*?<>|]', '_', base)
    cleaned = re.sub(r'^\.+', '', cleaned)  # Remove leading dots
    
    if not cleaned:
        return "unnamed_document.pdf"
        
    return cleaned


def validate_file_metadata(file: UploadFile) -> str:
    """
    Validates declared extension and content-type.
    Returns sanitized original filename.
    """
    raw_name = file.filename or ""
    sanitized = sanitize_filename(raw_name)
    
    if not sanitized.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Only PDF documents (.pdf) are supported. Received: '{raw_name}'",
        )

    # Validate content-type if provided
    declared_type = (file.content_type or "").lower().strip()
    valid_mime_types = {
        "application/pdf",
        "application/x-pdf",
        "application/acrobat",
        "applications/vnd.pdf",
        "text/pdf",
    }
    
    if declared_type and declared_type not in valid_mime_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MIME content type: '{declared_type}'. Expected 'application/pdf'.",
        )

    return sanitized


async def save_and_validate_stream(
    file: UploadFile,
    dest_path: Path,
    max_size: int = settings.MAX_UPLOAD_SIZE_BYTES,
) -> int:
    """
    Streams file chunks directly to disk while:
    1. Validating the file signature on the first chunk.
    2. Enforcing max size limit without loading the entire file into memory.
    3. Ensuring the file is not empty.
    Returns total byte size.
    """
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    total_bytes = 0
    first_chunk = True

    try:
        with open(dest_path, "wb") as f_out:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                
                if first_chunk:
                    if len(chunk) < 5 or not chunk.startswith(PDF_SIGNATURE):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid file format: file header does not match PDF signature (%PDF-).",
                        )
                    first_chunk = False
                
                total_bytes += len(chunk)
                if total_bytes > max_size:
                    raise HTTPException(
                        status_code=getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413),
                        detail=(
                            f"File size exceeds the configured maximum limit of "
                            f"{max_size // (1024 * 1024)} MB."
                        ),
                    )
                f_out.write(chunk)

        if total_bytes == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file uploaded. The uploaded PDF contains 0 bytes.",
            )

        return total_bytes

    except Exception:
        # Clean up partially written file on failure
        if dest_path.exists():
            try:
                dest_path.unlink()
            except OSError:
                pass
        raise


def extract_pdf_content(
    file_path: Path,
    doc_id: str,
) -> Tuple[int, str, List[Dict[str, Any]]]:
    """
    Milestone 4: Hybrid PDF Text Extraction.
    - Digitally generated pages: extracted directly using PyMuPDF.
    - Scanned / sparse pages (< OCR_CHAR_THRESHOLD): rendered and processed via Tesseract OCR.
    - Preserves 1-based page numbering and exact page sequence.
    - Returns (page_count, document_extraction_status, pages_list).
      document_extraction_status is one of:
      - 'extracted' (purely digital)
      - 'ocr' (all pages extracted via OCR)
      - 'hybrid' (mix of digital and OCR pages)
      - 'needs_ocr' (insufficient text across all pages, e.g. blank/drawings)
    """
    try:
        doc = pymupdf.open(str(file_path))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed or corrupted PDF file. Could not parse document structure: {str(exc)}",
        )

    try:
        page_count = doc.page_count
        if page_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF document contains zero pages.",
            )

        pages: List[Dict[str, Any]] = []
        digital_pages_count = 0
        ocr_pages_count = 0
        insufficient_pages_count = 0

        for page_idx in range(page_count):
            page_num = page_idx + 1  # 1-based indexing
            page = doc[page_idx]
            
            # Step 1: Attempt digital extraction
            raw_text = page.get_text("text")
            cleaned_text = raw_text.strip()
            char_count = len(cleaned_text)

            # Step 2: Check if digital text meets the threshold
            if char_count >= settings.OCR_CHAR_THRESHOLD:
                # Digital extraction succeeded
                page_status = "extracted"
                digital_pages_count += 1
                word_count = len(cleaned_text.split())
            else:
                # Page contains sparse or no extractable digital text (scanned page)
                # Step 3: Trigger OCR on this individual page
                ocr_text, ocr_success = ocr_pdf_page(
                    page,
                    dpi=settings.OCR_DPI,
                    lang=settings.OCR_DEFAULT_LANGUAGE,
                )

                if ocr_success and len(ocr_text) >= settings.OCR_CHAR_THRESHOLD:
                    # OCR succeeded and extracted meaningful text
                    cleaned_text = ocr_text
                    char_count = len(cleaned_text)
                    word_count = len(cleaned_text.split())
                    page_status = "ocr_extracted"
                    ocr_pages_count += 1
                elif ocr_success:
                    # OCR completed, but page yielded little or no text (< threshold, e.g. blank page or illustration)
                    if len(ocr_text) > len(cleaned_text):
                        cleaned_text = ocr_text
                        char_count = len(cleaned_text)
                    word_count = len(cleaned_text.split()) if cleaned_text else 0
                    page_status = "needs_ocr"
                    insufficient_pages_count += 1
                else:
                    # OCR failed or Tesseract is unavailable
                    word_count = len(cleaned_text.split()) if cleaned_text else 0
                    if is_tesseract_available():
                        page_status = "ocr_failed"
                    else:
                        page_status = "needs_ocr"
                    insufficient_pages_count += 1

            pages.append(
                {
                    "document_id": doc_id,
                    "page_number": page_num,
                    "text": cleaned_text,
                    "character_count": char_count,
                    "word_count": word_count,
                    "extraction_status": page_status,
                    "created_at": utc_now_iso(),
                }
            )

        # Document-level classification:
        if ocr_pages_count > 0 and digital_pages_count > 0:
            doc_extraction_status = "hybrid"
        elif ocr_pages_count > 0 and digital_pages_count == 0:
            doc_extraction_status = "ocr"
        elif digital_pages_count > 0 and ocr_pages_count == 0:
            # Preserves backward compatibility with existing tests expecting 'extracted'
            doc_extraction_status = "extracted"
        else:
            doc_extraction_status = "needs_ocr"

        return page_count, doc_extraction_status, pages

    finally:
        doc.close()

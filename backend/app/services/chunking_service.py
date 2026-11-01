import re
from typing import List, Dict, Any
from app.core.config import settings


def split_text_into_chunks(
    text: str,
    chunk_size: int = settings.CHUNK_SIZE_CHARS,
    overlap: int = settings.CHUNK_OVERLAP_CHARS,
) -> List[str]:
    """
    Splits a single text stream into overlapping segments.
    Attempts natural splits along sentence or paragraph boundaries.
    Avoids creating empty or whitespace-only chunks.
    """
    cleaned = text.strip()
    if not cleaned:
        return []

    if len(cleaned) <= chunk_size:
        return [cleaned]

    chunks: List[str] = []
    start = 0
    text_len = len(cleaned)

    while start < text_len:
        end = min(start + chunk_size, text_len)

        # If not at the end of the text, look for a natural break point (paragraph or sentence)
        if end < text_len:
            # Look for paragraph break
            para_break = cleaned.rfind("\n\n", start, end)
            if para_break != -1 and para_break > start + (chunk_size // 2):
                end = para_break + 2
            else:
                # Look for sentence break: period, exclamation, question mark followed by space
                match = None
                for m in re.finditer(r"([.!?])\s+", cleaned[start:end]):
                    match = m
                if match and (start + match.end()) > start + (chunk_size // 3):
                    end = start + match.end()
                else:
                    # Look for whitespace break
                    space_break = cleaned.rfind(" ", start, end)
                    if space_break != -1 and space_break > start + (chunk_size // 3):
                        end = space_break + 1

        chunk_str = cleaned[start:end].strip()
        if chunk_str:
            chunks.append(chunk_str)

        if end >= text_len:
            break

        # Advance start with overlap
        start = max(start + 1, end - overlap)

    return chunks


def chunk_page(
    document_id: str,
    page_number: int,
    page_text: str,
    chunk_size: int = settings.CHUNK_SIZE_CHARS,
    overlap: int = settings.CHUNK_OVERLAP_CHARS,
) -> List[Dict[str, Any]]:
    """
    Chunks a single page's text while strictly preserving 1-based page attribution.
    Returns list of chunk dictionaries with deterministic IDs.
    """
    raw_chunks = split_text_into_chunks(page_text, chunk_size=chunk_size, overlap=overlap)
    page_chunks: List[Dict[str, Any]] = []

    for idx, chunk_text in enumerate(raw_chunks):
        chunk_id = f"{document_id}_p{page_number}_c{idx}"
        page_chunks.append(
            {
                "id": chunk_id,
                "document_id": document_id,
                "page_number": page_number,
                "chunk_index": idx,
                "text": chunk_text,
                "character_count": len(chunk_text),
                "word_count": len(chunk_text.split()),
            }
        )

    return page_chunks


def chunk_document_pages(
    document_id: str,
    pages: List[Dict[str, Any]],
    chunk_size: int = settings.CHUNK_SIZE_CHARS,
    overlap: int = settings.CHUNK_OVERLAP_CHARS,
) -> List[Dict[str, Any]]:
    """
    Processes all pages of a document and returns a flat list of chunk records.
    Never crosses page boundaries to ensure zero loss of page-level attribution.
    """
    all_chunks: List[Dict[str, Any]] = []
    for page in pages:
        p_num = page.get("page_number", 1)
        p_text = page.get("text", "")
        chunks = chunk_page(
            document_id=document_id,
            page_number=p_num,
            page_text=p_text,
            chunk_size=chunk_size,
            overlap=overlap,
        )
        all_chunks.extend(chunks)

    return all_chunks


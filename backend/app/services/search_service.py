from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status
from app.core.config import settings
from app.db.database import get_db_context
from app.db.repository import DocumentRepository
from app.services.chunking_service import chunk_document_pages
from app.services.embedding_service import embedding_service


def index_document(document_id: str) -> Dict[str, Any]:
    """
    Idempotently chunks and embeds extracted pages for a document.
    Re-indexing replaces existing chunks without creating duplicates.
    """
    with get_db_context() as conn:
        repo = DocumentRepository(conn)
        doc = repo.get_document_by_id(document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{document_id}' not found.",
            )

        pages = repo.get_document_pages(document_id)
        if not pages:
            # Document has no page records
            repo.delete_chunks_for_document(document_id)
            repo.update_document_indexing_status(document_id, "no_pages")
            return {
                "document_id": document_id,
                "original_filename": doc["original_filename"],
                "chunks_created": 0,
                "status": "no_pages",
                "message": "Document contains no extracted page records to index.",
            }

        # Check total extractable text
        total_text_chars = sum(len(p.get("text", "").strip()) for p in pages)
        if total_text_chars < 15:
            # Document has no or minimal extractable text (e.g. scanned plates without recognizable text)
            repo.delete_chunks_for_document(document_id)
            repo.update_document_indexing_status(document_id, "no_extractable_text")
            return {
                "document_id": document_id,
                "original_filename": doc["original_filename"],
                "chunks_created": 0,
                "status": "no_extractable_text",
                "message": "Document has no extractable digital or OCR text stream.",
            }

        # 1. Generate text chunks without crossing page boundaries
        chunks = chunk_document_pages(
            document_id=document_id,
            pages=pages,
            chunk_size=settings.CHUNK_SIZE_CHARS,
            overlap=settings.CHUNK_OVERLAP_CHARS,
        )

        if not chunks:
            repo.delete_chunks_for_document(document_id)
            repo.update_document_indexing_status(document_id, "no_extractable_text")
            return {
                "document_id": document_id,
                "original_filename": doc["original_filename"],
                "chunks_created": 0,
                "status": "no_extractable_text",
                "message": "No non-empty text chunks could be formed.",
            }

        # 2. Vectorize chunks using the loaded embedding model
        texts = [c["text"] for c in chunks]
        embeddings = embedding_service.encode_texts(texts)

        # 3. Attach serialized embedding vectors to chunk dicts
        for idx, chunk in enumerate(chunks):
            chunk["embedding"] = embedding_service.serialize_embedding(embeddings[idx])

        # 4. Atomic replacement: delete existing chunks and insert new ones
        repo.delete_chunks_for_document(document_id)
        repo.insert_chunks(chunks)
        repo.update_document_indexing_status(document_id, "indexed")

        return {
            "document_id": document_id,
            "original_filename": doc["original_filename"],
            "chunks_created": len(chunks),
            "status": "indexed",
            "message": f"Successfully indexed {len(chunks)} chunks with semantic embeddings.",
        }


def search_archive(
    query: str,
    limit: int = settings.DEFAULT_SEARCH_LIMIT,
    min_score: float = 0.0,
) -> Dict[str, Any]:
    """
    Ranks indexed archive chunks by cosine similarity to the vectorized search query.
    Enforces exact provenance mapping with document ID and 1-based page number.
    """
    cleaned_query = (query or "").strip()
    if not cleaned_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty.",
        )

    clamped_limit = max(1, min(limit, settings.MAX_SEARCH_LIMIT))

    with get_db_context() as conn:
        repo = DocumentRepository(conn)
        chunks_with_embeddings = repo.get_all_chunks_with_embeddings()

    # Empty archive check
    if not chunks_with_embeddings:
        return {
            "query": cleaned_query,
            "total_results": 0,
            "results": [],
            "search_mode": "semantic",
            "message": "Archive has no indexed document chunks yet. Ingest documents to enable search.",
        }

    # Generate query embedding
    try:
        query_emb = embedding_service.encode_query(cleaned_query)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic embedding generation failed: {str(exc)}",
        )

    # Score each chunk
    scored_items: List[Dict[str, Any]] = []
    for chunk in chunks_with_embeddings:
        chunk_emb_blob = chunk.get("embedding")
        if not chunk_emb_blob:
            continue
        chunk_emb = embedding_service.deserialize_embedding(chunk_emb_blob)
        similarity = embedding_service.compute_cosine_similarity(query_emb, chunk_emb)

        if similarity >= min_score:
            doc_filename = chunk["original_filename"]
            page_num = chunk["page_number"]
            citation = f"[{doc_filename} · Page {page_num}]"

            scored_items.append(
                {
                    "chunk_id": chunk["id"],
                    "document_id": chunk["document_id"],
                    "original_filename": doc_filename,
                    "page_number": page_num,
                    "chunk_index": chunk["chunk_index"],
                    "text": chunk["text"],
                    "character_count": chunk["character_count"],
                    "word_count": chunk["word_count"],
                    "similarity_score": round(similarity, 4),
                    "source_citation": citation,
                }
            )

    # Rank descending by similarity score
    scored_items.sort(key=lambda x: x["similarity_score"], reverse=True)
    top_results = scored_items[:clamped_limit]

    return {
        "query": cleaned_query,
        "total_results": len(top_results),
        "results": top_results,
        "search_mode": "semantic",
    }


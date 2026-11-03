from typing import Dict, Any, List, Optional
import logging
from fastapi import HTTPException, status
from app.core.config import settings
from app.db.database import get_db_context
from app.db.repository import DocumentRepository
from app.services.chunking_service import chunk_document_pages
from app.services.embedding_service import embedding_service
from app.services.retrieval_service import (
    sanitize_fts5_query,
    compute_rrf_rankings,
    format_citation_display,
)

logger = logging.getLogger(__name__)


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
    retrieval_mode: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Ranks indexed archive chunks using Hybrid (Dense + SQLite FTS5 BM25 with RRF),
    Dense semantic, or Lexical search modes.
    Enforces exact provenance mapping with document ID and dual pagination metadata.
    """
    cleaned_query = (query or "").strip()
    if not cleaned_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty.",
        )

    clamped_limit = max(1, min(limit, settings.MAX_SEARCH_LIMIT))
    effective_mode = retrieval_mode.lower() if retrieval_mode else "semantic"

    with get_db_context() as conn:
        repo = DocumentRepository(conn)
        chunks_with_embeddings = repo.get_all_chunks_with_embeddings()

    # Empty archive check
    if not chunks_with_embeddings:
        return {
            "query": cleaned_query,
            "total_results": 0,
            "results": [],
            "search_mode": effective_mode,
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

    # Score each chunk for dense semantic retrieval
    scored_dense_map: Dict[str, Dict[str, Any]] = {}
    scored_dense_list: List[Dict[str, Any]] = []

    for chunk in chunks_with_embeddings:
        chunk_emb_blob = chunk.get("embedding")
        if not chunk_emb_blob:
            continue
        chunk_emb = embedding_service.deserialize_embedding(chunk_emb_blob)
        similarity = embedding_service.compute_cosine_similarity(query_emb, chunk_emb)

        if similarity >= min_score:
            doc_filename = chunk["original_filename"]
            page_num = chunk["page_number"]
            pdf_idx = chunk.get("pdf_page_index", page_num)
            printed_label = chunk.get("printed_page_label")
            doc_title = chunk.get("document_title") or doc_filename
            citation_disp = format_citation_display(pdf_idx, printed_label)

            if printed_label and str(printed_label).strip():
                citation = f"[{doc_filename} · Printed page {str(printed_label).strip()} · PDF page {pdf_idx}]"
            else:
                citation = f"[{doc_filename} · Page {pdf_idx}]"

            item = {
                "chunk_id": chunk["id"],
                "document_id": chunk["document_id"],
                "original_filename": doc_filename,
                "document_title": doc_title,
                "page_number": page_num,
                "pdf_page_index": pdf_idx,
                "printed_page_label": printed_label,
                "citation_display": citation_disp,
                "chunk_index": chunk["chunk_index"],
                "text": chunk["text"],
                "character_count": chunk["character_count"],
                "word_count": chunk["word_count"],
                "similarity_score": round(similarity, 4),
                "source_citation": citation,
            }
            scored_dense_map[chunk["id"]] = item
            scored_dense_list.append(item)

    # Lexical retrieval via SQLite FTS5 (if hybrid or lexical mode)
    lexical_candidates: List[Dict[str, Any]] = []
    if effective_mode in ("hybrid", "lexical"):
        sanitized_fts = sanitize_fts5_query(cleaned_query)
        if sanitized_fts:
            try:
                with get_db_context() as conn:
                    repo = DocumentRepository(conn)
                    lexical_hits = repo.search_chunks_fts(
                        sanitized_fts,
                        limit=settings.RAG_LEXICAL_POOL_SIZE,
                    )

                for hit in lexical_hits:
                    cid = hit["id"]
                    if cid in scored_dense_map:
                        lex_item = dict(scored_dense_map[cid])
                        lex_item["bm25_score"] = hit.get("bm25_score")
                    else:
                        blob = hit.get("embedding")
                        sim = (
                            embedding_service.compute_cosine_similarity(
                                query_emb, embedding_service.deserialize_embedding(blob)
                            )
                            if blob
                            else 0.0
                        )
                        if sim < min_score:
                            continue

                        doc_filename = hit["original_filename"]
                        page_num = hit["page_number"]
                        pdf_idx = hit.get("pdf_page_index", page_num)
                        printed_label = hit.get("printed_page_label")
                        doc_title = hit.get("document_title") or doc_filename
                        citation_disp = format_citation_display(pdf_idx, printed_label)

                        if printed_label and str(printed_label).strip():
                            citation = f"[{doc_filename} · Printed page {str(printed_label).strip()} · PDF page {pdf_idx}]"
                        else:
                            citation = f"[{doc_filename} · Page {pdf_idx}]"

                        lex_item = {
                            "chunk_id": cid,
                            "document_id": hit["document_id"],
                            "original_filename": doc_filename,
                            "document_title": doc_title,
                            "page_number": page_num,
                            "pdf_page_index": pdf_idx,
                            "printed_page_label": printed_label,
                            "citation_display": citation_disp,
                            "chunk_index": hit["chunk_index"],
                            "text": hit["text"],
                            "character_count": hit["character_count"],
                            "word_count": hit["word_count"],
                            "similarity_score": round(sim, 4),
                            "source_citation": citation,
                            "bm25_score": hit.get("bm25_score"),
                        }
                    lexical_candidates.append(lex_item)
            except Exception as fts_exc:
                logger.warning("FTS5 search error; defaulting to dense: %s", fts_exc)

    # Rank fusion
    if effective_mode == "hybrid":
        scored_dense_list.sort(key=lambda x: x["similarity_score"], reverse=True)
        top_results = compute_rrf_rankings(
            scored_dense_list,
            lexical_candidates,
            k=settings.RAG_RRF_K,
            dense_weight=settings.RAG_DENSE_WEIGHT,
            lexical_weight=settings.RAG_LEXICAL_WEIGHT,
        )[:clamped_limit]
    elif effective_mode == "lexical":
        lexical_candidates.sort(key=lambda x: x.get("bm25_score", 0.0))
        top_results = lexical_candidates[:clamped_limit]
    else:  # dense / semantic
        scored_dense_list.sort(key=lambda x: x["similarity_score"], reverse=True)
        top_results = scored_dense_list[:clamped_limit]

    return {
        "query": cleaned_query,
        "total_results": len(top_results),
        "results": top_results,
        "search_mode": effective_mode,
    }


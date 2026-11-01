import logging
import re
from collections import defaultdict
from typing import Dict, Any, List, Optional, Tuple, Set
from fastapi import HTTPException, status
from app.core.config import settings
from app.db.database import get_db_context
from app.db.repository import DocumentRepository
from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)


def estimate_token_count(text: str) -> int:
    """
    Heuristic token count estimation based on ~4 characters per token.
    
    Rationale & Limitations:
    - Standard rule-of-thumb across subword tokenizers (BPE, WordPiece, SentencePiece)
      for English and cultural heritage vocabulary.
    - Yields approximately 1 token per 0.75 words, guarding against context budget
      exhaustion without introducing heavy C-extensions or external tokenizer dependencies.
    - Actual token counts for specialized production LLMs (e.g. tiktoken/Llama/Gemini)
      may vary by ±10-15%, especially for non-Latin scripts or fragmented OCR text.
    """
    cleaned = (text or "").strip()
    if not cleaned:
        return 0
    return max(1, int(len(cleaned) / 4.0 + 0.5))


def merge_texts_with_overlap(text_a: str, text_b: str, max_overlap: int = 300) -> str:
    """
    Deduplicates overlapping text between two consecutive passages.
    Finds the longest suffix of text_a that matches a prefix of text_b.
    """
    clean_a = (text_a or "").rstrip()
    clean_b = (text_b or "").lstrip()

    if not clean_a:
        return clean_b
    if not clean_b:
        return clean_a

    max_check = min(len(clean_a), len(clean_b), max_overlap)

    # Search for longest matching overlap from max_check down to 10 characters
    for k in range(max_check, 9, -1):
        suffix = clean_a[-k:]
        prefix = clean_b[:k]
        if suffix == prefix:
            remainder = clean_b[k:].lstrip()
            if remainder:
                return f"{clean_a} {remainder}"
            return clean_a

    # No exact overlap substring found; join with single space separation
    return f"{clean_a} {clean_b}"


def merge_consecutive_chunks(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Merges adjacent, consecutive chunks originating from the SAME document and SAME page.
    Deduplicates the overlapping characters introduced during initial chunking.
    
    STRICT ATTRIBUTION INVARIANTS:
    - Never merges across different page numbers.
    - Never merges across different document IDs.
    - Preserves all constituent chunk IDs in `chunk_ids`.
    - Sets merged block similarity score to the maximum of constituent chunk scores.
    """
    if not chunks:
        return []

    # Group by (document_id, page_number)
    grouped: Dict[Tuple[str, int], List[Dict[str, Any]]] = defaultdict(list)
    for c in chunks:
        grouped[(c["document_id"], c["page_number"])].append(c)

    merged_blocks: List[Dict[str, Any]] = []

    for (doc_id, page_num), page_chunks in grouped.items():
        # Sort chunks strictly by chunk_index
        sorted_chunks = sorted(page_chunks, key=lambda x: x["chunk_index"])

        current_block: Optional[Dict[str, Any]] = None

        for chunk in sorted_chunks:
            if current_block is None:
                current_block = {
                    "document_id": doc_id,
                    "original_filename": chunk["original_filename"],
                    "page_number": page_num,
                    "chunk_ids": [chunk["chunk_id"]],
                    "start_chunk_index": chunk["chunk_index"],
                    "last_chunk_index": chunk["chunk_index"],
                    "text": chunk["text"],
                    "similarity_score": chunk["similarity_score"],
                }
            elif chunk["chunk_index"] == current_block["last_chunk_index"] + 1:
                # Consecutive chunk on identical page: merge text with overlap deduplication
                current_block["text"] = merge_texts_with_overlap(
                    current_block["text"], chunk["text"]
                )
                current_block["chunk_ids"].append(chunk["chunk_id"])
                current_block["last_chunk_index"] = chunk["chunk_index"]
                current_block["similarity_score"] = max(
                    current_block["similarity_score"], chunk["similarity_score"]
                )
            else:
                # Non-consecutive chunk on same page: close current block and start new
                current_block["character_count"] = len(current_block["text"])
                current_block["word_count"] = len(current_block["text"].split())
                current_block["estimated_tokens"] = estimate_token_count(current_block["text"])
                merged_blocks.append(current_block)

                current_block = {
                    "document_id": doc_id,
                    "original_filename": chunk["original_filename"],
                    "page_number": page_num,
                    "chunk_ids": [chunk["chunk_id"]],
                    "start_chunk_index": chunk["chunk_index"],
                    "last_chunk_index": chunk["chunk_index"],
                    "text": chunk["text"],
                    "similarity_score": chunk["similarity_score"],
                }

        if current_block is not None:
            current_block["character_count"] = len(current_block["text"])
            current_block["word_count"] = len(current_block["text"].split())
            current_block["estimated_tokens"] = estimate_token_count(current_block["text"])
            merged_blocks.append(current_block)

    # Sort merged blocks descending by similarity score
    merged_blocks.sort(key=lambda x: x["similarity_score"], reverse=True)
    return merged_blocks


def apply_source_diversity(
    blocks: List[Dict[str, Any]],
    max_per_page: int = settings.RAG_MAX_CHUNKS_PER_PAGE,
    max_pages_per_doc: int = settings.RAG_MAX_PAGES_PER_DOC,
) -> List[Dict[str, Any]]:
    """
    Enforces diversity limits so a single verbose page or document does not monopolize
    the evidence pool.
    
    - max_per_page: Maximum number of merged passages from any single page.
    - max_pages_per_doc: Maximum number of distinct pages contributing from any single document.
    """
    if not blocks:
        return []

    page_counts: Dict[Tuple[str, int], int] = defaultdict(int)
    doc_pages: Dict[str, Set[int]] = defaultdict(set)
    filtered_blocks: List[Dict[str, Any]] = []

    for block in blocks:
        doc_id = block["document_id"]
        page_num = block["page_number"]

        # Check page quota
        if page_counts[(doc_id, page_num)] >= max_per_page:
            continue

        # Check doc page diversity quota
        if (
            page_num not in doc_pages[doc_id]
            and len(doc_pages[doc_id]) >= max_pages_per_doc
        ):
            continue

        # Accept block
        page_counts[(doc_id, page_num)] += 1
        doc_pages[doc_id].add(page_num)
        filtered_blocks.append(block)

    return filtered_blocks


def pack_context_budget(
    blocks: List[Dict[str, Any]],
    max_tokens: int = settings.RAG_MAX_CONTEXT_TOKENS,
) -> List[Dict[str, Any]]:
    """
    Greedily packs highest-ranking evidence passages into the allocated context token budget.
    Guarantees no mid-sentence or mid-word truncation: blocks are included in full or excluded.
    """
    packed: List[Dict[str, Any]] = []
    accumulated_tokens = 0

    for block in blocks:
        tokens = block.get("estimated_tokens") or estimate_token_count(block["text"])
        if accumulated_tokens + tokens <= max_tokens:
            block["estimated_tokens"] = tokens
            packed.append(block)
            accumulated_tokens += tokens

    return packed


def assign_evidence_ids(
    blocks: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    """
    Assigns sequential ephemeral evidence identifiers (E1, E2, E3, ...) to packed evidence.
    Constructs server-verified evidence map ensuring ground-truth citation integrity.
    
    Returns:
    - evidence_list: List of evidence items formatted for context assembly.
    - evidence_map: Dict mapping evidence_id -> verified ground-truth metadata.
    """
    evidence_list: List[Dict[str, Any]] = []
    evidence_map: Dict[str, Dict[str, Any]] = {}

    for idx, block in enumerate(blocks, start=1):
        evidence_id = f"E{idx}"
        citation = f"[{block['original_filename']} · Page {block['page_number']}]"

        evidence_item = {
            "evidence_id": evidence_id,
            "document_id": block["document_id"],
            "original_filename": block["original_filename"],
            "page_number": block["page_number"],
            "chunk_ids": block["chunk_ids"],
            "text": block["text"],
            "similarity_score": round(block["similarity_score"], 4),
            "token_count": block.get("estimated_tokens") or estimate_token_count(block["text"]),
            "source_citation": citation,
        }

        evidence_list.append(evidence_item)
        evidence_map[evidence_id] = evidence_item

    return evidence_list, evidence_map


def retrieve_evidence(
    query: str,
    document_ids: Optional[List[str]] = None,
    threshold: Optional[float] = None,
    max_tokens: Optional[int] = None,
    max_chunks_per_page: Optional[int] = None,
    max_pages_per_doc: Optional[int] = None,
    candidate_pool_size: Optional[int] = None,
) -> Dict[str, Any]:
    """
    High-level evidence retrieval and context preparation orchestrator for Dharohar RAG.
    
    Pipeline:
    1. Clean and validate query.
    2. Retrieve vectorized candidate chunks from archive (with optional document_ids filter).
    3. Calculate cosine similarity against vectorized query.
    4. Filter candidates below the similarity threshold.
    5. Deduplicate and merge adjacent chunks on the same page.
    6. Apply source diversity limits (per page and per document).
    7. Pack into context token budget without text truncation.
    8. Assign server-generated evidence IDs (E1, E2, ...).
    9. Return verified evidence payload and evidence map.
    """
    cleaned_query = (query or "").strip()
    if not cleaned_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Retrieval query cannot be empty.",
        )

    effective_threshold = (
        threshold if threshold is not None else settings.RAG_SIMILARITY_THRESHOLD
    )
    effective_max_tokens = (
        max_tokens if max_tokens is not None else settings.RAG_MAX_CONTEXT_TOKENS
    )
    effective_max_per_page = (
        max_chunks_per_page
        if max_chunks_per_page is not None
        else settings.RAG_MAX_CHUNKS_PER_PAGE
    )
    effective_max_pages_per_doc = (
        max_pages_per_doc
        if max_pages_per_doc is not None
        else settings.RAG_MAX_PAGES_PER_DOC
    )
    effective_pool_size = (
        candidate_pool_size
        if candidate_pool_size is not None
        else settings.RAG_CANDIDATE_POOL_SIZE
    )

    with get_db_context() as conn:
        repo = DocumentRepository(conn)
        chunks_with_embeddings = repo.get_all_chunks_with_embeddings(document_ids=document_ids)

    # Empty candidate pool check
    if not chunks_with_embeddings:
        return {
            "query": cleaned_query,
            "has_sufficient_evidence": False,
            "max_similarity_score": 0.0,
            "threshold_used": effective_threshold,
            "total_candidates_found": 0,
            "token_budget_used": 0,
            "max_token_budget": effective_max_tokens,
            "evidence": [],
            "evidence_map": {},
        }

    # Vectorize query
    try:
        query_emb = embedding_service.encode_query(cleaned_query)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query vector generation failed: {str(exc)}",
        )

    # Score candidates
    scored_candidates: List[Dict[str, Any]] = []
    max_score = 0.0

    for chunk in chunks_with_embeddings:
        chunk_blob = chunk.get("embedding")
        if not chunk_blob:
            continue
        chunk_emb = embedding_service.deserialize_embedding(chunk_blob)
        similarity = embedding_service.compute_cosine_similarity(query_emb, chunk_emb)

        if similarity > max_score:
            max_score = similarity

        if similarity >= effective_threshold:
            scored_candidates.append(
                {
                    "chunk_id": chunk["id"],
                    "document_id": chunk["document_id"],
                    "original_filename": chunk["original_filename"],
                    "page_number": chunk["page_number"],
                    "chunk_index": chunk["chunk_index"],
                    "text": chunk["text"],
                    "character_count": chunk["character_count"],
                    "word_count": chunk["word_count"],
                    "similarity_score": similarity,
                }
            )

    # If no candidate passed the threshold
    if not scored_candidates:
        return {
            "query": cleaned_query,
            "has_sufficient_evidence": False,
            "max_similarity_score": round(max_score, 4),
            "threshold_used": effective_threshold,
            "total_candidates_found": 0,
            "token_budget_used": 0,
            "max_token_budget": effective_max_tokens,
            "evidence": [],
            "evidence_map": {},
        }

    # Sort candidates by similarity score descending and take top candidate pool
    scored_candidates.sort(key=lambda x: x["similarity_score"], reverse=True)
    candidate_pool = scored_candidates[:effective_pool_size]

    # Merge adjacent chunks on same page of same document
    merged_blocks = merge_consecutive_chunks(candidate_pool)

    # Apply source diversity constraints
    diverse_blocks = apply_source_diversity(
        merged_blocks,
        max_per_page=effective_max_per_page,
        max_pages_per_doc=effective_max_pages_per_doc,
    )

    # Pack into context token budget
    packed_blocks = pack_context_budget(
        diverse_blocks,
        max_tokens=effective_max_tokens,
    )

    # Assign server-generated evidence IDs (E1, E2, ...)
    evidence_list, evidence_map = assign_evidence_ids(packed_blocks)

    total_tokens_used = sum(item["token_count"] for item in evidence_list)

    return {
        "query": cleaned_query,
        "has_sufficient_evidence": len(evidence_list) > 0,
        "max_similarity_score": round(max_score, 4),
        "threshold_used": effective_threshold,
        "total_candidates_found": len(scored_candidates),
        "token_budget_used": total_tokens_used,
        "max_token_budget": effective_max_tokens,
        "evidence": evidence_list,
        "evidence_map": evidence_map,
    }


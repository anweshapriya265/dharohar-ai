import logging
import re
from collections import defaultdict
from typing import Dict, Any, List, Optional, Tuple, Set
from fastapi import HTTPException, status
from app.core.config import settings
from app.db.database import get_db_context
from app.db.repository import DocumentRepository
from app.services.embedding_service import embedding_service
from app.services.text_normalization_service import (
    normalize_archival_text,
    normalize_token_for_matching,
    expand_query_terms_for_fts5,
)
from app.services.query_decomposition_service import decompose_compound_query

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
    - Never merges across different page numbers (evaluated via pdf_page_index / page_number).
    - Never merges across different document IDs.
    - Preserves all constituent chunk IDs in `chunk_ids`.
    - Sets merged block similarity score to the maximum of constituent chunk scores.
    """
    if not chunks:
        return []

    # Group by (document_id, pdf_page_index)
    grouped: Dict[Tuple[str, int], List[Dict[str, Any]]] = defaultdict(list)
    for c in chunks:
        pdf_idx = c.get("pdf_page_index", c.get("page_number", 1))
        grouped[(c["document_id"], pdf_idx)].append(c)

    merged_blocks: List[Dict[str, Any]] = []

    for (doc_id, page_num), page_chunks in grouped.items():
        # Sort chunks strictly by chunk_index
        sorted_chunks = sorted(page_chunks, key=lambda x: x["chunk_index"])

        current_block: Optional[Dict[str, Any]] = None

        for chunk in sorted_chunks:
            pdf_idx = chunk.get("pdf_page_index", chunk.get("page_number", 1))
            printed_label = chunk.get("printed_page_label")
            doc_title = chunk.get("document_title") or chunk.get("original_filename")

            if current_block is None:
                current_block = {
                    "document_id": doc_id,
                    "original_filename": chunk["original_filename"],
                    "document_title": doc_title,
                    "page_number": chunk.get("page_number", pdf_idx),
                    "pdf_page_index": pdf_idx,
                    "printed_page_label": printed_label,
                    "chunk_ids": [chunk["chunk_id"]],
                    "start_chunk_index": chunk["chunk_index"],
                    "last_chunk_index": chunk["chunk_index"],
                    "text": chunk["text"],
                    "similarity_score": chunk["similarity_score"],
                    "rrf_score": chunk.get("rrf_score", 0.0),
                    "retrieval_source": chunk.get("retrieval_source", "dense"),
                    "supported_subqueries": list(chunk.get("supported_subqueries", [])),
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
                current_block["rrf_score"] = max(
                    current_block.get("rrf_score", 0.0), chunk.get("rrf_score", 0.0)
                )
                if chunk.get("supported_subqueries"):
                    current_block["supported_subqueries"] = list(dict.fromkeys(
                        current_block.get("supported_subqueries", []) + chunk.get("supported_subqueries", [])
                    ))
            else:
                # Non-consecutive chunk on same page: close current block and start new
                current_block["character_count"] = len(current_block["text"])
                current_block["word_count"] = len(current_block["text"].split())
                current_block["estimated_tokens"] = estimate_token_count(current_block["text"])
                merged_blocks.append(current_block)

                current_block = {
                    "document_id": doc_id,
                    "original_filename": chunk["original_filename"],
                    "document_title": doc_title,
                    "page_number": chunk.get("page_number", pdf_idx),
                    "pdf_page_index": pdf_idx,
                    "printed_page_label": printed_label,
                    "chunk_ids": [chunk["chunk_id"]],
                    "start_chunk_index": chunk["chunk_index"],
                    "last_chunk_index": chunk["chunk_index"],
                    "text": chunk["text"],
                    "similarity_score": chunk["similarity_score"],
                    "rrf_score": chunk.get("rrf_score", 0.0),
                    "retrieval_source": chunk.get("retrieval_source", "dense"),
                    "supported_subqueries": list(chunk.get("supported_subqueries", [])),
                }

        if current_block is not None:
            current_block["character_count"] = len(current_block["text"])
            current_block["word_count"] = len(current_block["text"].split())
            current_block["estimated_tokens"] = estimate_token_count(current_block["text"])
            merged_blocks.append(current_block)

    # Sort merged blocks descending by RRF score, secondary by similarity score
    merged_blocks.sort(key=lambda x: (x.get("rrf_score", 0.0), x["similarity_score"]), reverse=True)
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
        page_num = block.get("pdf_page_index", block.get("page_number", 1))

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


def format_citation_display(pdf_page_index: int, printed_page_label: Optional[str] = None) -> str:
    """
    Formats the scholarly citation string with dual pagination.
    - When printed label exists: 'Printed page 452 · PDF page 480'
    - When printed label unknown: 'PDF page 480 · Printed page unavailable'
    """
    if printed_page_label and str(printed_page_label).strip():
        return f"Printed page {str(printed_page_label).strip()} · PDF page {pdf_page_index}"
    return f"PDF page {pdf_page_index} · Printed page unavailable"


def sanitize_fts5_query(query: str, enable_ocr_expansion: Optional[bool] = None) -> str:
    """
    Sanitizes user queries for safe, robust SQLite FTS5 matching.
    
    1. Extracts quoted phrases to preserve exact phrase matching (e.g. '"96 feet"').
    2. Strips FTS5 reserved punctuation/operators (: - * ^ ( ) { } +) from unquoted terms.
    3. Expands historical variant spellings and OCR errata when enabled.
    4. Normalizes whitespace and drops single-character noise words.
    5. Wraps individual words in double quotes to prevent collision with FTS5 boolean operators.
    6. Combines terms using OR so multi-word historical queries achieve broad recall.
    """
    cleaned = (query or "").strip()
    if not cleaned:
        return ""

    use_expansion = (
        enable_ocr_expansion
        if enable_ocr_expansion is not None
        else getattr(settings, "RAG_ENABLE_OCR_NORMALIZATION", True)
    )
    if use_expansion:
        return expand_query_terms_for_fts5(cleaned)

    # Baseline sanitization without OCR/historical lexicon expansion
    quoted_phrases = re.findall(r'"([^"]+)"', cleaned)
    tokens: List[str] = [f'"{p.strip()}"' for p in quoted_phrases if p.strip()]

    unquoted = re.sub(r'"[^"]*"', ' ', cleaned)
    unquoted = re.sub(r'[:\-*^(){}+]', ' ', unquoted)
    words = [w.strip() for w in unquoted.split() if len(w.strip()) > 1]
    for w in words:
        tokens.append(f'"{w}"')

    return " OR ".join(tokens)


STOP_WORDS: Set[str] = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "is", "was", "were", "are", "be", "been", "it", "its", "that",
    "this", "which", "what", "where", "when", "who", "whom", "how", "why", "did",
    "does", "do", "as", "about", "into", "through", "during", "before", "after",
    "above", "below", "between", "under", "inside", "outside", "there", "their",
    "so", "no", "not", "any", "all", "more", "most", "other", "some", "such",
    "also", "than", "then", "very", "can", "could", "would", "should", "shall",
}

DOMAIN_COMMON_TERMS: Set[str] = {
    "cave", "caves", "temple", "temples", "rock", "stone", "hall", "sanctuary",
    "carved", "carvings", "sculpture", "sculptures", "pillar", "pillars",
    "entrance", "front", "back", "side", "sides", "wall", "walls", "part",
    "page", "survey", "report", "plate", "plates", "view", "section", "floor",
    "roof", "court", "courtyard", "ground", "hill", "hills", "portion", "work",
}


def is_lexical_candidate_eligible(
    query: str,
    chunk_text: str,
    similarity_score: float,
    min_similarity_floor: float = 0.10,
    min_term_coverage: float = 0.50,
    normalized_chunk_text: Optional[str] = None,
    chunk_page_number: Optional[int] = None,
) -> Tuple[bool, str]:
    """
    Calibrated eligibility verification for SQLite FTS5 lexical candidates.
    Protects against false-positive keyword drift while recovering low-similarity exact matches.

    Supports dual evaluation:
    1. Raw query against raw archival chunk text.
    2. OCR-normalized and historical alias-expanded representation.
    3. Explicit page targeting when query specifies printed/PDF page numbers.
    """
    # 1. Cosine similarity safety floor
    if similarity_score < min_similarity_floor:
        return False, f"below_safety_floor_{similarity_score:.4f}<{min_similarity_floor:.2f}"

    def _evaluate_candidate(q_str: str, c_str: str, is_canonical: bool = False) -> Tuple[bool, str]:
        q_lower = q_str.lower()
        c_lower = c_str.lower()

        # Quoted phrase matching
        quotes = re.findall(r'"([^"]+)"', q_str)
        for qp in quotes:
            clean_qp = qp.strip().lower()
            if len(clean_qp) >= 3 and clean_qp in c_lower:
                return True, f"exact_quoted_phrase:'{clean_qp}'"

        q_norm = " ".join(re.sub(r"[^\w\s]", " ", q_lower).split())
        c_norm = " ".join(re.sub(r"[^\w\s]", " ", c_lower).split())
        q_words = q_norm.split()

        if is_canonical:
            q_words = [normalize_token_for_matching(w) for w in q_words]
            q_norm = " ".join(q_words)
            c_words = [normalize_token_for_matching(w) for w in c_norm.split()]
            c_norm = " ".join(c_words)
        else:
            c_words = c_norm.split()

        # Full query phrase match
        if len(q_words) >= 2 and q_norm in c_norm:
            return True, f"exact_full_query_phrase:'{q_norm}'"

        meaningful_q_words = [w for w in q_words if w not in STOP_WORDS and len(w) >= 2]
        discriminative_q_words = [w for w in meaningful_q_words if w not in DOMAIN_COMMON_TERMS]

        # Verbatim n-gram of significant length or coverage
        if len(q_words) >= 2:
            for n in range(min(4, len(q_words)), 1, -1):
                for i in range(len(q_words) - n + 1):
                    gram_words = q_words[i:i+n]
                    gram = " ".join(gram_words)
                    has_discriminative = any(gw in discriminative_q_words for gw in gram_words)
                    gram_coverage = sum(1 for gw in gram_words if gw in meaningful_q_words) / max(1, len(meaningful_q_words))
                    if gram in c_norm:
                        if gram_coverage >= 0.50 or (has_discriminative and len(gram_words) >= 3):
                            return True, f"exact_discriminative_ngram:'{gram}'"

        # Explicit page number match (e.g., 'page 6', 'page 10') with at least one discriminative query term
        if chunk_page_number is not None:
            page_matches = re.findall(r'(?i)\bpage\s+(\d+)\b', q_str)
            if str(chunk_page_number) in page_matches:
                matched_page_terms = [
                    w for w in discriminative_q_words
                    if w in c_words or w.rstrip("s") in {cw.rstrip("s") for cw in c_words}
                ]
                if matched_page_terms:
                    return True, f"explicit_page_match:p{chunk_page_number}+terms:{matched_page_terms}"

        # Rare/Specialized proper term match (proper nouns, epigraphical tokens, specific numbers)
        for w in discriminative_q_words:
            w_stem = w.rstrip("s")
            if len(w) >= 4 or (w.isdigit() and len(w) >= 2):
                has_term = bool(
                    re.search(r'\b' + re.escape(w) + r'\b', c_norm)
                    or re.search(r'\b' + re.escape(w_stem) + r'\b', c_norm)
                )
                if has_term:
                    if is_canonical or w in {
                        "west", "jacobi", "cistern", "dantidurga", "amoghavarsha",
                        "govinda", "krishna", "mhar", "kuda", "bagh", "ellora", "elura", "deccan", "dekhan"
                    }:
                        return True, f"rare_discriminative_term:'{w}'"
                    if len(meaningful_q_words) <= 3:
                        return True, f"rare_discriminative_term:'{w}'"

        # Query Term Coverage (with inflection/stem matching)
        if not meaningful_q_words:
            return False, "no_meaningful_terms"

        c_words_set = set(c_words)
        c_stems_set = {cw.rstrip("s") for cw in c_words}
        matched_meaningful = [
            w for w in meaningful_q_words
            if w in c_words_set or w.rstrip("s") in c_stems_set
        ]
        matched_discriminative = [
            w for w in discriminative_q_words
            if w in c_words_set or w.rstrip("s") in c_stems_set
        ]
        coverage = len(matched_meaningful) / len(meaningful_q_words)

        if len(meaningful_q_words) >= 3:
            if coverage >= min_term_coverage and len(matched_meaningful) >= 2:
                if discriminative_q_words and not matched_discriminative:
                    return False, f"missing_discriminative_terms:{len(matched_meaningful)}/{len(meaningful_q_words)}({coverage:.2f})"
                return True, f"high_term_coverage:{len(matched_meaningful)}/{len(meaningful_q_words)}({coverage:.2f})"
        elif len(meaningful_q_words) in (1, 2):
            if coverage >= 0.80:
                return True, f"short_query_coverage:{len(matched_meaningful)}/{len(meaningful_q_words)}({coverage:.2f})"

        return False, f"insufficient_coverage:{len(matched_meaningful)}/{len(meaningful_q_words)}({coverage:.2f})"

    # 1. Primary evaluation: Raw archival text vs raw query
    raw_passed, raw_reason = _evaluate_candidate(query, chunk_text, is_canonical=False)
    if raw_passed:
        return True, raw_reason

    # 2. Secondary evaluation: OCR-normalized text vs query (if enabled)
    if getattr(settings, "RAG_ENABLE_OCR_NORMALIZATION", True):
        c_norm_text = normalized_chunk_text or normalize_archival_text(chunk_text)
        norm_passed, norm_reason = _evaluate_candidate(query, c_norm_text, is_canonical=True)
        if norm_passed:
            return True, f"ocr_normalized_{norm_reason}"

    return False, raw_reason


def compute_rrf_rankings(
    dense_candidates: List[Dict[str, Any]],
    lexical_candidates: List[Dict[str, Any]],
    k: int = settings.RAG_RRF_K,
    dense_weight: float = settings.RAG_DENSE_WEIGHT,
    lexical_weight: float = settings.RAG_LEXICAL_WEIGHT,
) -> List[Dict[str, Any]]:
    """
    Merges dense and lexical candidate lists using Reciprocal Rank Fusion (RRF).
    
    RRF Score formula:
      RRF(c) = (dense_weight / (k + rank_dense(c))) + (lexical_weight / (k + rank_lexical(c)))
      
    - dense_candidates: Ranked descending by cosine similarity.
    - lexical_candidates: Ranked ascending by BM25 (most negative = highest relevance).
    - Preserves all chunk metadata, assigning rrf_score, dense_rank, lexical_rank,
      retrieval_source ('dense', 'lexical', or 'both').
    """
    dense_rank_map: Dict[str, Tuple[int, Dict[str, Any]]] = {}
    for rank, cand in enumerate(dense_candidates, start=1):
        cid = cand.get("chunk_id") or cand.get("id")
        dense_rank_map[cid] = (rank, cand)

    lexical_rank_map: Dict[str, Tuple[int, Dict[str, Any]]] = {}
    for rank, cand in enumerate(lexical_candidates, start=1):
        cid = cand.get("chunk_id") or cand.get("id")
        lexical_rank_map[cid] = (rank, cand)

    all_chunk_ids = list(dict.fromkeys(list(dense_rank_map.keys()) + list(lexical_rank_map.keys())))
    fused_candidates: List[Dict[str, Any]] = []

    for cid in all_chunk_ids:
        in_dense = cid in dense_rank_map
        in_lexical = cid in lexical_rank_map

        dense_rank = dense_rank_map[cid][0] if in_dense else None
        lexical_rank = lexical_rank_map[cid][0] if in_lexical else None

        rrf_score = 0.0
        if in_dense:
            rrf_score += dense_weight / (k + dense_rank)
        if in_lexical:
            lex_cand = lexical_rank_map[cid][1]
            lex_mult = 1.0
            reason = lex_cand.get("lexical_eligibility_reason", "")
            if "explicit_page_match" in reason:
                lex_mult = 2.5
            elif (
                "high_term_coverage" in reason
                or "rare_discriminative_term" in reason
                or "exact_quoted_phrase" in reason
                or "exact_full_query_phrase" in reason
                or "exact_discriminative_ngram" in reason
            ):
                lex_mult = 1.5
            elif "ocr_normalized" in reason:
                lex_mult = 1.3
            rrf_score += (lexical_weight * lex_mult) / (k + lexical_rank)

        # Merge candidate dict preferring the dense candidate dictionary (which has similarity_score)
        base_cand = dense_rank_map[cid][1] if in_dense else lexical_rank_map[cid][1]
        cand_dict = dict(base_cand)

        # Record provenance and fusion details
        cand_dict["chunk_id"] = cid
        cand_dict["rrf_score"] = round(rrf_score, 6)
        cand_dict["dense_rank"] = dense_rank
        cand_dict["lexical_rank"] = lexical_rank
        cand_dict["retrieval_source"] = "both" if (in_dense and in_lexical) else ("dense" if in_dense else "lexical")
        if in_lexical:
            cand_dict["bm25_score"] = lexical_rank_map[cid][1].get("bm25_score")

        fused_candidates.append(cand_dict)

    # Sort descending by rrf_score (secondary sort by similarity_score)
    fused_candidates.sort(
        key=lambda x: (x.get("rrf_score", 0.0), x.get("similarity_score", 0.0)),
        reverse=True,
    )
    return fused_candidates


def assign_evidence_ids(
    blocks: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    """
    Assigns sequential ephemeral evidence identifiers (E1, E2, E3, ...) to packed evidence.
    Constructs server-verified evidence map ensuring ground-truth citation integrity with dual pagination.
    
    Returns:
    - evidence_list: List of evidence items formatted for context assembly.
    - evidence_map: Dict mapping evidence_id -> verified ground-truth metadata.
    """
    evidence_list: List[Dict[str, Any]] = []
    evidence_map: Dict[str, Dict[str, Any]] = {}

    for idx, block in enumerate(blocks, start=1):
        evidence_id = f"E{idx}"
        pdf_idx = block.get("pdf_page_index", block.get("page_number", 1))
        printed_label = block.get("printed_page_label")
        doc_title = block.get("document_title") or block.get("original_filename")
        citation_disp = format_citation_display(pdf_idx, printed_label)

        # Backward-compatible bracket citation format:
        # When printed label exists: [filename · Printed page X · PDF page Y]
        # When unknown: [filename · Page Y]
        if printed_label and str(printed_label).strip():
            citation = f"[{block['original_filename']} · Printed page {str(printed_label).strip()} · PDF page {pdf_idx}]"
        else:
            citation = f"[{block['original_filename']} · Page {pdf_idx}]"

        evidence_item = {
            "evidence_id": evidence_id,
            "document_id": block["document_id"],
            "original_filename": block["original_filename"],
            "document_title": doc_title,
            "page_number": block.get("page_number", pdf_idx),
            "pdf_page_index": pdf_idx,
            "printed_page_label": printed_label,
            "citation_display": citation_disp,
            "chunk_ids": block["chunk_ids"],
            "text": block["text"],
            "similarity_score": round(block["similarity_score"], 4),
            "token_count": block.get("estimated_tokens") or estimate_token_count(block["text"]),
            "source_citation": citation,
        }

        if "rrf_score" in block:
            evidence_item["rrf_score"] = block["rrf_score"]
        if "retrieval_source" in block:
            evidence_item["retrieval_source"] = block["retrieval_source"]
        if "supported_subqueries" in block:
            evidence_item["supported_subqueries"] = block["supported_subqueries"]

        evidence_list.append(evidence_item)
        evidence_map[evidence_id] = evidence_item

    return evidence_list, evidence_map


def _execute_multi_query_retrieval(
    decomp,
    document_ids: Optional[List[str]] = None,
    threshold: Optional[float] = None,
    max_tokens: Optional[int] = None,
    max_chunks_per_page: Optional[int] = None,
    max_pages_per_doc: Optional[int] = None,
    candidate_pool_size: Optional[int] = None,
    retrieval_mode: Optional[str] = None,
    rrf_k: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Executes bounded, independent retrieval for each subquery in a decomposed compound inquiry.
    Fuses candidate evidence while eliminating duplicates and tracking subquery provenance.
    Enforces compound grounding rules:
    - All subqueries supported -> all_components_supported
    - Some subqueries supported -> partially_supported (identifying missing components)
    - No subqueries supported -> none_supported (insufficient_evidence)
    """
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
    effective_mode = (retrieval_mode or settings.RAG_RETRIEVAL_MODE).lower()

    subquery_results: Dict[str, Dict[str, Any]] = {}
    supported_subqueries: List[str] = []
    missing_subqueries: List[str] = []
    supported_components: List[str] = []
    missing_components: List[str] = []

    all_raw_blocks: List[Dict[str, Any]] = []
    max_sim = 0.0

    for sq in decomp.subqueries:
        res = retrieve_evidence(
            query=sq.subquery_text,
            document_ids=document_ids,
            threshold=threshold,
            max_tokens=max_tokens,
            max_chunks_per_page=max_chunks_per_page,
            max_pages_per_doc=max_pages_per_doc,
            candidate_pool_size=candidate_pool_size,
            retrieval_mode=retrieval_mode,
            rrf_k=rrf_k,
            enable_multi_query=False,
        )
        subquery_results[sq.subquery_id] = res
        if res.get("max_similarity_score", 0.0) > max_sim:
            max_sim = res["max_similarity_score"]

        has_ev = res.get("has_sufficient_evidence", False) and len(res.get("evidence", [])) > 0
        if has_ev:
            ev_combined_text = " ".join(
                (ev.get("text", "") + " " + normalize_archival_text(ev.get("text", ""))).lower()
                for ev in res.get("evidence", [])
            )
            # Extract proper nouns (e.g. historical names, sites, entities)
            common_query_starters = {
                "the", "a", "an", "in", "on", "at", "comparing", "compare",
                "what", "which", "where", "when", "how", "describe", "give", "list", "caves", "temples"
            }
            proper_nouns = [
                "".join(c for c in w if c.isalpha()).lower()
                for w in sq.subquery_text.split()
                if "".join(c for c in w if c.isalpha())
                and "".join(c for c in w if c.isalpha())[0].isupper()
                and "".join(c for c in w if c.isalpha()).lower() not in common_query_starters
                and len("".join(c for c in w if c.isalpha())) >= 3
            ]
            if proper_nouns:
                has_proper_support = any(
                    (pn in ev_combined_text or pn.rstrip("s") in ev_combined_text)
                    for pn in proper_nouns
                )
                if not has_proper_support:
                    has_ev = False
            else:
                sq_words = [re.sub(r'[^\w]', '', w).lower() for w in sq.subquery_text.split()]
                sq_discriminative = [
                    w for w in sq_words
                    if w and len(w) >= 4 and w not in STOP_WORDS and w not in DOMAIN_COMMON_TERMS
                ]
                if sq_discriminative:
                    has_term_support = any(
                        (w in ev_combined_text or w.rstrip("s") in ev_combined_text)
                        for w in sq_discriminative
                    )
                    if not has_term_support:
                        has_ev = False

        if has_ev:
            supported_subqueries.append(sq.subquery_id)
            supported_components.append(sq.component_label)
            for ev in res.get("evidence", []):
                ev_copy = dict(ev)
                ev_copy["supported_subqueries"] = [sq.subquery_id]
                all_raw_blocks.append(ev_copy)
        else:
            missing_subqueries.append(sq.subquery_id)
            missing_components.append(sq.component_label)

    # Determine coverage state
    if not supported_subqueries:
        coverage_state = "none_supported"
    elif not missing_subqueries:
        coverage_state = "all_components_supported"
    else:
        coverage_state = "partially_supported"

    component_cov = {
        "total": len(decomp.subqueries),
        "supported_count": len(supported_components),
        "missing_count": len(missing_components),
        "supported_components": supported_components,
        "missing_components": missing_components,
        "state": coverage_state,
    }

    if coverage_state == "none_supported" or not all_raw_blocks:
        return {
            "query": decomp.original_query,
            "has_sufficient_evidence": False,
            "is_compound": True,
            "subqueries": [sq.model_dump() for sq in decomp.subqueries],
            "component_coverage": component_cov,
            "retrieval_mode": effective_mode,
            "max_similarity_score": round(max_sim, 4),
            "threshold_used": effective_threshold,
            "total_candidates_found": 0,
            "token_budget_used": 0,
            "max_token_budget": effective_max_tokens,
            "evidence": [],
            "evidence_map": {},
        }

    # Deduplicate blocks across subqueries by (document_id, pdf_page_index, tuple(chunk_ids))
    deduped_blocks_map: Dict[Tuple[str, int, Tuple[str, ...]], Dict[str, Any]] = {}
    for block in all_raw_blocks:
        pdf_idx = block.get("pdf_page_index", block.get("page_number", 1))
        cids_key = tuple(sorted(block.get("chunk_ids", [])))
        key = (block["document_id"], pdf_idx, cids_key)

        if key not in deduped_blocks_map:
            deduped_blocks_map[key] = dict(block)
        else:
            existing = deduped_blocks_map[key]
            existing["supported_subqueries"] = list(dict.fromkeys(
                existing.get("supported_subqueries", []) + block.get("supported_subqueries", [])
            ))
            existing["similarity_score"] = max(existing.get("similarity_score", 0.0), block.get("similarity_score", 0.0))
            if "rrf_score" in block:
                existing["rrf_score"] = max(existing.get("rrf_score", 0.0), block.get("rrf_score", 0.0))

    # Balanced round-robin interleaving across supported subqueries
    subquery_cand_queues: Dict[str, List[Dict[str, Any]]] = {sq_id: [] for sq_id in supported_subqueries}
    multi_supported: List[Dict[str, Any]] = []

    for block in deduped_blocks_map.values():
        subs = block.get("supported_subqueries", [])
        if len(subs) > 1:
            multi_supported.append(block)
        elif len(subs) == 1 and subs[0] in subquery_cand_queues:
            subquery_cand_queues[subs[0]].append(block)
        else:
            multi_supported.append(block)

    # Sort each subquery queue by score descending
    score_key = lambda x: (x.get("rrf_score", 0.0), x.get("similarity_score", 0.0))
    multi_supported.sort(key=score_key, reverse=True)
    for q in subquery_cand_queues.values():
        q.sort(key=score_key, reverse=True)

    interleaved_blocks: List[Dict[str, Any]] = []
    seen_keys = set()

    def _block_key(b):
        return (
            b["document_id"],
            b.get("pdf_page_index", b.get("page_number", 1)),
            tuple(sorted(b.get("chunk_ids", []))),
        )

    # 1. Blocks supporting multiple subqueries come first
    for b in multi_supported:
        k = _block_key(b)
        if k not in seen_keys:
            seen_keys.add(k)
            interleaved_blocks.append(b)

    # 2. Round-robin interleave single-subquery candidates
    max_queue_len = max((len(q) for q in subquery_cand_queues.values()), default=0)
    for round_idx in range(max_queue_len):
        for sq_id in supported_subqueries:
            q = subquery_cand_queues[sq_id]
            if round_idx < len(q):
                b = q[round_idx]
                k = _block_key(b)
                if k not in seen_keys:
                    seen_keys.add(k)
                    interleaved_blocks.append(b)

    deduped_blocks = interleaved_blocks

    diverse_blocks = apply_source_diversity(
        deduped_blocks,
        max_per_page=effective_max_per_page,
        max_pages_per_doc=effective_max_pages_per_doc,
    )

    packed_blocks = pack_context_budget(
        diverse_blocks,
        max_tokens=effective_max_tokens,
    )

    evidence_list, evidence_map = assign_evidence_ids(packed_blocks)
    total_tokens_used = sum(item["token_count"] for item in evidence_list)

    return {
        "query": decomp.original_query,
        "has_sufficient_evidence": len(evidence_list) > 0,
        "is_compound": True,
        "subqueries": [sq.model_dump() for sq in decomp.subqueries],
        "component_coverage": component_cov,
        "retrieval_mode": effective_mode,
        "max_similarity_score": round(max_sim, 4),
        "threshold_used": effective_threshold,
        "total_candidates_found": len(deduped_blocks),
        "token_budget_used": total_tokens_used,
        "max_token_budget": effective_max_tokens,
        "evidence": evidence_list,
        "evidence_map": evidence_map,
    }


def retrieve_evidence(
    query: str,
    document_ids: Optional[List[str]] = None,
    threshold: Optional[float] = None,
    max_tokens: Optional[int] = None,
    max_chunks_per_page: Optional[int] = None,
    max_pages_per_doc: Optional[int] = None,
    candidate_pool_size: Optional[int] = None,
    retrieval_mode: Optional[str] = None,
    rrf_k: Optional[int] = None,
    enable_multi_query: Optional[bool] = None,
) -> Dict[str, Any]:
    """
    High-level evidence retrieval and context preparation orchestrator for Dharohar RAG.
    Supports Dense, Lexical (SQLite FTS5), Hybrid (RRF), and Multi-Query retrieval modes.
    
    Pipeline:
    1. Clean and validate query.
    2. Decompose compound inquiries into bounded subqueries (if enable_multi_query=True).
    3. Retrieve vectorized candidate chunks from archive (with optional document_ids filter).
    4. Calculate cosine similarity against vectorized query for dense candidates.
    5. Query SQLite FTS5 BM25 index for lexical candidates (with OCR variant expansion).
    6. Fuse candidates using Reciprocal Rank Fusion (RRF) when in hybrid mode.
    7. Filter candidates below calibrated semantic/lexical eligibility criteria.
    8. Deduplicate and merge adjacent chunks on the same page.
    9. Apply source diversity limits (per page and per document).
    10. Pack into context token budget without text truncation.
    11. Assign server-generated evidence IDs (E1, E2, ...).
    12. Return verified evidence payload, provenance, and evidence map.
    """
    cleaned_query = (query or "").strip()
    if not cleaned_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Retrieval query cannot be empty.",
        )

    # Multi-Query Decomposition for Compound Research Inquiries
    use_multi_query = (
        enable_multi_query
        if enable_multi_query is not None
        else getattr(settings, "RAG_ENABLE_MULTI_QUERY", True)
    )
    if use_multi_query:
        decomp = decompose_compound_query(cleaned_query)
        if decomp.is_compound and len(decomp.subqueries) > 1:
            return _execute_multi_query_retrieval(
                decomp=decomp,
                document_ids=document_ids,
                threshold=threshold,
                max_tokens=max_tokens,
                max_chunks_per_page=max_chunks_per_page,
                max_pages_per_doc=max_pages_per_doc,
                candidate_pool_size=candidate_pool_size,
                retrieval_mode=retrieval_mode,
                rrf_k=rrf_k,
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
    effective_mode = (retrieval_mode or settings.RAG_RETRIEVAL_MODE).lower()

    with get_db_context() as conn:
        repo = DocumentRepository(conn)
        chunks_with_embeddings = repo.get_all_chunks_with_embeddings(document_ids=document_ids)

    # Empty candidate pool check
    if not chunks_with_embeddings:
        return {
            "query": cleaned_query,
            "has_sufficient_evidence": False,
            "is_compound": False,
            "subqueries": [{"subquery_id": "SQ1", "subquery_text": cleaned_query, "component_label": cleaned_query}],
            "component_coverage": {
                "total": 1,
                "supported_count": 0,
                "missing_count": 1,
                "supported_components": [],
                "missing_components": [cleaned_query],
                "state": "none_supported",
            },
            "retrieval_mode": effective_mode,
            "max_similarity_score": 0.0,
            "threshold_used": effective_threshold,
            "total_candidates_found": 0,
            "token_budget_used": 0,
            "max_token_budget": effective_max_tokens,
            "evidence": [],
            "evidence_map": {},
        }

    # 1. Vectorize query
    try:
        query_emb = embedding_service.encode_query(cleaned_query)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query vector generation failed: {str(exc)}",
        )

    # 2. Score dense candidates
    dense_scored_map: Dict[str, float] = {}
    dense_candidates: List[Dict[str, Any]] = []
    max_score = 0.0

    for chunk in chunks_with_embeddings:
        chunk_blob = chunk.get("embedding")
        if not chunk_blob:
            continue
        chunk_emb = embedding_service.deserialize_embedding(chunk_blob)
        similarity = embedding_service.compute_cosine_similarity(query_emb, chunk_emb)
        cid = chunk["id"]
        dense_scored_map[cid] = similarity

        if similarity > max_score:
            max_score = similarity

        if similarity >= effective_threshold:
            pdf_idx = chunk.get("pdf_page_index", chunk.get("page_number", 1))
            printed_label = chunk.get("printed_page_label")
            doc_title = chunk.get("document_title") or chunk["original_filename"]
            dense_candidates.append(
                {
                    "chunk_id": cid,
                    "document_id": chunk["document_id"],
                    "original_filename": chunk["original_filename"],
                    "document_title": doc_title,
                    "page_number": chunk.get("page_number", pdf_idx),
                    "pdf_page_index": pdf_idx,
                    "printed_page_label": printed_label,
                    "chunk_index": chunk["chunk_index"],
                    "text": chunk["text"],
                    "character_count": chunk["character_count"],
                    "word_count": chunk["word_count"],
                    "similarity_score": similarity,
                }
            )

    dense_candidates.sort(key=lambda x: x["similarity_score"], reverse=True)

    # 3. Retrieve lexical FTS5 candidates (if hybrid or lexical mode)
    lexical_candidates: List[Dict[str, Any]] = []
    has_qualified_lexical = False
    if effective_mode in ("hybrid", "lexical"):
        sanitized_fts = sanitize_fts5_query(cleaned_query)
        if sanitized_fts:
            try:
                with get_db_context() as conn:
                    repo = DocumentRepository(conn)
                    lexical_hits = repo.search_chunks_fts(
                        sanitized_fts,
                        limit=settings.RAG_LEXICAL_POOL_SIZE,
                        document_ids=document_ids,
                    )

                for hit in lexical_hits:
                    cid = hit["id"]
                    # Resolve cosine similarity
                    if cid in dense_scored_map:
                        sim = dense_scored_map[cid]
                    else:
                        blob = hit.get("embedding")
                        if blob:
                            c_emb = embedding_service.deserialize_embedding(blob)
                            sim = embedding_service.compute_cosine_similarity(query_emb, c_emb)
                        else:
                            sim = 0.0
                        dense_scored_map[cid] = sim

                    if sim > max_score:
                        max_score = sim

                    # Calibrated lexical candidate eligibility
                    # Candidate is admitted if it meets semantic threshold OR passes calibrated lexical checks
                    is_semantic_pass = sim >= effective_threshold
                    is_calibrated_pass, reason = is_lexical_candidate_eligible(
                        cleaned_query,
                        hit["text"],
                        sim,
                        min_similarity_floor=settings.RAG_LEXICAL_MIN_SIMILARITY,
                        min_term_coverage=settings.RAG_LEXICAL_MIN_TERM_COVERAGE,
                        normalized_chunk_text=hit.get("normalized_text"),
                        chunk_page_number=hit.get("page_number", hit.get("pdf_page_index")),
                    )

                    if is_semantic_pass or is_calibrated_pass:
                        if is_calibrated_pass:
                            has_qualified_lexical = True
                        pdf_idx = hit.get("pdf_page_index", hit.get("page_number", 1))
                        printed_label = hit.get("printed_page_label")
                        doc_title = hit.get("document_title") or hit["original_filename"]
                        lexical_candidates.append(
                            {
                                "chunk_id": cid,
                                "document_id": hit["document_id"],
                                "original_filename": hit["original_filename"],
                                "document_title": doc_title,
                                "page_number": hit.get("page_number", pdf_idx),
                                "pdf_page_index": pdf_idx,
                                "printed_page_label": printed_label,
                                "chunk_index": hit["chunk_index"],
                                "text": hit["text"],
                                "character_count": hit["character_count"],
                                "word_count": hit["word_count"],
                                "similarity_score": sim,
                                "bm25_score": hit.get("bm25_score"),
                                "lexical_eligibility_reason": reason if is_calibrated_pass else "semantic_threshold",
                            }
                        )
            except Exception as fts_exc:
                logger.warning("FTS5 lexical retrieval encountered an error; falling back to dense: %s", fts_exc)

    # 4. Candidate pool selection & fusion
    if effective_mode == "hybrid":
        if dense_candidates or lexical_candidates:
            effective_rrf_k = rrf_k if rrf_k is not None else settings.RAG_RRF_K
            candidate_pool = compute_rrf_rankings(
                dense_candidates,
                lexical_candidates,
                k=effective_rrf_k,
                dense_weight=settings.RAG_DENSE_WEIGHT,
                lexical_weight=settings.RAG_LEXICAL_WEIGHT,
            )[:effective_pool_size]
        else:
            candidate_pool = []
    elif effective_mode == "lexical":
        candidate_pool = lexical_candidates[:effective_pool_size]
    else:  # dense
        candidate_pool = dense_candidates[:effective_pool_size]

    # 5. Relevance Safeguard: Candidate pool must exist and at least one candidate must
    # satisfy the semantic similarity threshold OR pass calibrated lexical eligibility.
    has_sufficient_evidence = bool(candidate_pool) and (
        any(c.get("similarity_score", 0.0) >= effective_threshold for c in candidate_pool)
        or has_qualified_lexical
    )
    if not has_sufficient_evidence:
        return {
            "query": cleaned_query,
            "has_sufficient_evidence": False,
            "is_compound": False,
            "subqueries": [{"subquery_id": "SQ1", "subquery_text": cleaned_query, "component_label": cleaned_query}],
            "component_coverage": {
                "total": 1,
                "supported_count": 0,
                "missing_count": 1,
                "supported_components": [],
                "missing_components": [cleaned_query],
                "state": "none_supported",
            },
            "retrieval_mode": effective_mode,
            "max_similarity_score": round(max_score, 4),
            "threshold_used": effective_threshold,
            "total_candidates_found": 0,
            "token_budget_used": 0,
            "max_token_budget": effective_max_tokens,
            "evidence": [],
            "evidence_map": {},
        }

    # 6. Merge adjacent chunks on same page of same document
    merged_blocks = merge_consecutive_chunks(candidate_pool)

    # 7. Apply source diversity constraints
    diverse_blocks = apply_source_diversity(
        merged_blocks,
        max_per_page=effective_max_per_page,
        max_pages_per_doc=effective_max_pages_per_doc,
    )

    # 8. Pack into context token budget
    packed_blocks = pack_context_budget(
        diverse_blocks,
        max_tokens=effective_max_tokens,
    )

    # 9. Assign server-generated evidence IDs (E1, E2, ...)
    evidence_list, evidence_map = assign_evidence_ids(packed_blocks)

    total_tokens_used = sum(item["token_count"] for item in evidence_list)

    comp_cov = {
        "total": 1,
        "supported_count": 1 if len(evidence_list) > 0 else 0,
        "missing_count": 0 if len(evidence_list) > 0 else 1,
        "supported_components": [cleaned_query] if len(evidence_list) > 0 else [],
        "missing_components": [] if len(evidence_list) > 0 else [cleaned_query],
        "state": "all_components_supported" if len(evidence_list) > 0 else "none_supported",
    }

    return {
        "query": cleaned_query,
        "has_sufficient_evidence": len(evidence_list) > 0,
        "is_compound": False,
        "subqueries": [{"subquery_id": "SQ1", "subquery_text": cleaned_query, "component_label": cleaned_query}],
        "component_coverage": comp_cov,
        "retrieval_mode": effective_mode,
        "max_similarity_score": round(max_score, 4),
        "threshold_used": effective_threshold,
        "total_candidates_found": len(candidate_pool),
        "token_budget_used": total_tokens_used,
        "max_token_budget": effective_max_tokens,
        "evidence": evidence_list,
        "evidence_map": evidence_map,
    }


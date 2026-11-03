import sqlite3
import pytest
from pathlib import Path

from app.core.config import settings
from app.db.database import (
    init_db,
    get_db_context,
    is_fts5_available,
    migrate_schema_add_fts5,
)
from app.db.repository import DocumentRepository
from app.services.chunking_service import chunk_document_pages
from app.services.retrieval_service import (
    sanitize_fts5_query,
    compute_rrf_rankings,
    retrieve_evidence,
    format_citation_display,
)
from app.services.search_service import search_archive
from app.services.llm_service import BaseLLMProvider
from app.services.assistant_service import ask_assistant, AssistantAskRequest


class ControlledMockEmbeddingService:
    """Deterministic mock embedding service for hybrid retrieval tests."""
    def encode_query(self, query: str):
        q = query.lower()
        v = [0.0, 0.0]
        if "kailasa" in q or "temple" in q or "ellora" in q:
            v[0] = 1.0
        if "ajanta" in q or "mural" in q or "painting" in q:
            v[1] = 1.0
        norm = (v[0]**2 + v[1]**2) ** 0.5
        return [v[0]/norm, v[1]/norm] if norm > 0 else [0.0, 0.0]

    def encode_texts(self, texts):
        results = []
        for text in texts:
            t = text.lower()
            v = [0.0, 0.0]
            if "kailasa" in t or "temple" in t or "ellora" in t:
                v[0] = 1.0
            if "ajanta" in t or "mural" in t or "painting" in t:
                v[1] = 1.0
            norm = (v[0]**2 + v[1]**2) ** 0.5
            results.append([v[0]/norm, v[1]/norm] if norm > 0 else [0.0, 0.0])
        return results

    def serialize_embedding(self, emb):
        import json
        return json.dumps(emb).encode("utf-8")

    def deserialize_embedding(self, blob):
        import json
        return json.loads(blob.decode("utf-8"))

    def compute_cosine_similarity(self, a, b):
        import numpy as np
        dot = float(np.dot(a, b))
        return max(-1.0, min(1.0, dot))


class DeterministicMockProvider(BaseLLMProvider):
    def __init__(self, response_text: str = ""):
        self.response_text = response_text

    def is_available(self) -> bool:
        return True

    def check_model_status(self) -> dict:
        return {"available": True, "model": settings.OLLAMA_MODEL}

    def generate(self, prompt: str, system_prompt: str | None = None) -> str:
        return self.response_text


@pytest.fixture
def hybrid_test_db(tmp_path: Path, monkeypatch):
    """Sets up an isolated SQLite database with FTS5 virtual tables and test chunks."""
    test_db = tmp_path / "test_hybrid.db"
    monkeypatch.setattr(settings, "DATABASE_PATH", test_db)
    init_db(test_db)

    mock_embed = ControlledMockEmbeddingService()
    monkeypatch.setattr("app.services.retrieval_service.embedding_service", mock_embed)
    monkeypatch.setattr("app.services.search_service.embedding_service", mock_embed)

    with get_db_context(test_db) as conn:
        repo = DocumentRepository(conn)

        # Document 1: Ellora Monograph (has printed page labels)
        repo.insert_document({
            "id": "doc_ellora",
            "original_filename": "Fergusson_Burgess_1880.pdf",
            "file_size": 100000,
            "content_type": "application/pdf",
            "upload_timestamp": "2026-11-01T12:00:00Z",
            "processing_status": "completed",
            "extraction_status": "extracted",
            "page_count": 764,
            "storage_path": "doc_ellora.pdf",
            "indexing_status": "indexed",
        })

        p1_text = (
            "The monolithic Kailasa temple at Cave 16 was carved from top to bottom. "
            "Commissioned under the patronage of Rashtrakuta King Krishna I (reigned c. 756-773 CE). "
            "The shikhara rises 96 feet above the courtyard floor."
        )
        pages_1 = [
            {
                "document_id": "doc_ellora",
                "page_number": 480,
                "pdf_page_index": 480,
                "printed_page_label": "452",
                "text": p1_text,
                "character_count": len(p1_text),
                "word_count": len(p1_text.split()),
                "extraction_status": "extracted",
            }
        ]
        repo.insert_pages(pages_1)

        chunks_1 = chunk_document_pages("doc_ellora", pages_1, chunk_size=150, overlap=30)
        c_vecs_1 = mock_embed.encode_texts([c["text"] for c in chunks_1])
        for idx, c in enumerate(chunks_1):
            c["embedding"] = mock_embed.serialize_embedding(c_vecs_1[idx])
        repo.insert_chunks(chunks_1)

        # Document 2: Inscriptions Report (unlabelled pages)
        repo.insert_document({
            "id": "doc_inscriptions",
            "original_filename": "1544.pdf",
            "file_size": 50000,
            "content_type": "application/pdf",
            "upload_timestamp": "2026-11-01T12:05:00Z",
            "processing_status": "completed",
            "extraction_status": "ocr",
            "page_count": 208,
            "storage_path": "1544.pdf",
            "indexing_status": "indexed",
        })

        p2_text = (
            "Archaeological Survey: Inscriptions from Western India edited by Pandit Bhagwanlal Indraji. "
            "Records copper plate grants and epigraphical notes dated February 1880."
        )
        pages_2 = [
            {
                "document_id": "doc_inscriptions",
                "page_number": 15,
                "pdf_page_index": 15,
                "printed_page_label": None,
                "text": p2_text,
                "character_count": len(p2_text),
                "word_count": len(p2_text.split()),
                "extraction_status": "ocr_extracted",
            }
        ]
        repo.insert_pages(pages_2)

        chunks_2 = chunk_document_pages("doc_inscriptions", pages_2, chunk_size=150, overlap=30)
        c_vecs_2 = mock_embed.encode_texts([c["text"] for c in chunks_2])
        for idx, c in enumerate(chunks_2):
            c["embedding"] = mock_embed.serialize_embedding(c_vecs_2[idx])
        repo.insert_chunks(chunks_2)

    yield test_db


# ---------------------------------------------------------------------------
# Test 1: FTS5 Virtual Table & Idempotent Migration
# ---------------------------------------------------------------------------
def test_fts5_virtual_table_and_migration(hybrid_test_db):
    with get_db_context(hybrid_test_db) as conn:
        assert is_fts5_available(conn) is True

        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
        assert "document_chunks_fts" in tables

        # Verify initial FTS indexing of seeded chunks
        fts_count = conn.execute("SELECT COUNT(*) FROM document_chunks_fts").fetchone()[0]
        chunk_count = conn.execute("SELECT COUNT(*) FROM document_chunks").fetchone()[0]
        assert fts_count == chunk_count
        assert fts_count > 0

        # Migration idempotency
        migrate_schema_add_fts5(conn)
        fts_count_after = conn.execute("SELECT COUNT(*) FROM document_chunks_fts").fetchone()[0]
        assert fts_count_after == fts_count


# ---------------------------------------------------------------------------
# Test 2: Trigger Synchronization (Insert, Update, Delete)
# ---------------------------------------------------------------------------
def test_fts5_trigger_synchronization(hybrid_test_db):
    with get_db_context(hybrid_test_db) as conn:
        repo = DocumentRepository(conn)

        # 1. Insert new chunk -> automatically synchronized to FTS
        test_chunk = [{
            "id": "sync_test_c1",
            "document_id": "doc_ellora",
            "page_number": 10,
            "pdf_page_index": 10,
            "printed_page_label": "X",
            "chunk_index": 0,
            "text": "Unique epigraphic keyword: VakatakaHarishenaDynasty.",
            "character_count": 52,
            "word_count": 4,
            "embedding": None,
        }]
        repo.insert_chunks(test_chunk)

        res = conn.execute(
            "SELECT chunk_id FROM document_chunks_fts WHERE document_chunks_fts MATCH 'VakatakaHarishenaDynasty'"
        ).fetchall()
        assert len(res) == 1
        assert res[0][0] == "sync_test_c1"

        # 2. Update chunk -> updated in FTS
        conn.execute(
            "UPDATE document_chunks SET text = 'Updated keyword: KadambaMayurasharma.' WHERE id = 'sync_test_c1'"
        )
        res_old = conn.execute(
            "SELECT chunk_id FROM document_chunks_fts WHERE document_chunks_fts MATCH 'VakatakaHarishenaDynasty'"
        ).fetchall()
        assert len(res_old) == 0

        res_new = conn.execute(
            "SELECT chunk_id FROM document_chunks_fts WHERE document_chunks_fts MATCH 'KadambaMayurasharma'"
        ).fetchall()
        assert len(res_new) == 1
        assert res_new[0][0] == "sync_test_c1"

        # 3. Delete chunk -> removed from FTS
        conn.execute("DELETE FROM document_chunks WHERE id = 'sync_test_c1'")
        res_del = conn.execute(
            "SELECT chunk_id FROM document_chunks_fts WHERE document_chunks_fts MATCH 'KadambaMayurasharma'"
        ).fetchall()
        assert len(res_del) == 0


# ---------------------------------------------------------------------------
# Test 3: FTS5 Exact Phrase Matching
# ---------------------------------------------------------------------------
def test_fts5_exact_phrase_matching(hybrid_test_db):
    with get_db_context(hybrid_test_db) as conn:
        repo = DocumentRepository(conn)

        # Quoted exact phrase
        sanitized = sanitize_fts5_query('"96 feet"')
        assert sanitized == '"96 feet"'

        hits = repo.search_chunks_fts(sanitized, limit=5)
        assert len(hits) >= 1
        assert any("96 feet" in h["text"] for h in hits)

        # Non-matching phrase
        sanitized_none = sanitize_fts5_query('"150 meters"')
        hits_none = repo.search_chunks_fts(sanitized_none, limit=5)
        assert len(hits_none) == 0


# ---------------------------------------------------------------------------
# Test 4: Query Sanitizer Resilience Against Reserved Punctuation
# ---------------------------------------------------------------------------
def test_fts5_sanitizer_resilience():
    # Dangerous characters that would normally trigger SQLite FTS5 syntax errors
    q1 = "Krishna I (reigned c. 756-773 CE): Cave 16"
    sanitized1 = sanitize_fts5_query(q1)
    assert "(" not in sanitized1 and ")" not in sanitized1
    assert ":" not in sanitized1

    # Boolean operators collision
    q2 = "temple AND NOT OR NEAR mandapa"
    sanitized2 = sanitize_fts5_query(q2)
    # Must wrap terms so they are treated as string literals, not syntax errors
    assert ' "AND" ' in f" {sanitized2} " or '"AND"' in sanitized2
    assert ' "OR" ' in f" {sanitized2} " or '"OR"' in sanitized2

    # Empty / whitespace
    assert sanitize_fts5_query("") == ""
    assert sanitize_fts5_query("   ") == ""


# ---------------------------------------------------------------------------
# Test 5: Reciprocal Rank Fusion Formula & Deduplication
# ---------------------------------------------------------------------------
def test_rrf_scoring_and_deduplication():
    dense = [
        {"chunk_id": "c1", "similarity_score": 0.95},
        {"chunk_id": "c2", "similarity_score": 0.85},
        {"chunk_id": "c3", "similarity_score": 0.75},
    ]
    lexical = [
        {"chunk_id": "c3", "bm25_score": -1.5},
        {"chunk_id": "c1", "bm25_score": -1.0},
        {"chunk_id": "c4", "bm25_score": -0.5},
    ]

    fused = compute_rrf_rankings(dense, lexical, k=60, dense_weight=1.0, lexical_weight=1.0)

    # c1 is rank 1 in dense, rank 2 in lexical -> (1/61) + (1/62) = 0.016393 + 0.016129 = 0.032522
    # c3 is rank 3 in dense, rank 1 in lexical -> (1/63) + (1/61) = 0.015873 + 0.016393 = 0.032266
    # c2 is rank 2 in dense, missing in lexical -> (1/62) = 0.016129
    # c4 is missing in dense, rank 3 in lexical -> (1/63) = 0.015873

    chunk_ids = [c["chunk_id"] for c in fused]
    assert chunk_ids == ["c1", "c3", "c2", "c4"]

    c1 = next(c for c in fused if c["chunk_id"] == "c1")
    assert c1["retrieval_source"] == "both"
    assert c1["dense_rank"] == 1
    assert c1["lexical_rank"] == 2
    assert c1["rrf_score"] == pytest.approx(1/61 + 1/62, rel=1e-3)

    c2 = next(c for c in fused if c["chunk_id"] == "c2")
    assert c2["retrieval_source"] == "dense"
    assert c2["dense_rank"] == 2
    assert c2["lexical_rank"] is None

    c4 = next(c for c in fused if c["chunk_id"] == "c4")
    assert c4["retrieval_source"] == "lexical"
    assert c4["dense_rank"] is None
    assert c4["lexical_rank"] == 3


# ---------------------------------------------------------------------------
# Test 6: Missing Lexical Hits Fallback to Dense
# ---------------------------------------------------------------------------
def test_missing_lexical_fallback_to_dense(hybrid_test_db):
    # Conceptual query with no exact word matches in FTS5 ("ellora" matches mock dense space)
    res = retrieve_evidence(
        query="Ellora basalt sanctuary",
        retrieval_mode="hybrid",
        threshold=0.1,
    )
    assert res["has_sufficient_evidence"] is True
    assert len(res["evidence"]) >= 1
    assert res["retrieval_mode"] == "hybrid"
    assert res["evidence"][0]["retrieval_source"] == "dense"


# ---------------------------------------------------------------------------
# Test 7: Dual Pagination Metadata & Evidence ID Integrity
# ---------------------------------------------------------------------------
def test_hybrid_dual_pagination_and_evidence_ids(hybrid_test_db):
    res = retrieve_evidence(
        query="Kailasa temple 96 feet shikhara",
        retrieval_mode="hybrid",
        threshold=0.1,
    )
    assert res["has_sufficient_evidence"] is True
    evidence = res["evidence"]
    assert len(evidence) >= 1

    top = evidence[0]
    assert top["evidence_id"] == "E1"
    assert top["pdf_page_index"] == 480
    assert top["printed_page_label"] == "452"
    assert top["citation_display"] == "Printed page 452 · PDF page 480"
    assert "Printed page 452 · PDF page 480" in top["source_citation"]
    assert "rrf_score" in top
    assert top["rrf_score"] > 0.0


# ---------------------------------------------------------------------------
# Test 8: Insufficient Evidence Protection Preserved (0.32 Threshold)
# ---------------------------------------------------------------------------
def test_insufficient_evidence_safeguard(hybrid_test_db):
    # Completely unrelated query
    res = retrieve_evidence(
        query="steam locomotives railway transportation network",
        retrieval_mode="hybrid",
        threshold=0.32,
    )
    assert res["has_sufficient_evidence"] is False
    assert len(res["evidence"]) == 0
    assert res["max_similarity_score"] < 0.32


# ---------------------------------------------------------------------------
# Test 9: Search Archive Endpoint in Hybrid Mode
# ---------------------------------------------------------------------------
def test_search_archive_hybrid_mode(hybrid_test_db):
    res = search_archive("Kailasa temple", limit=5, min_score=0.1, retrieval_mode="hybrid")
    assert res["search_mode"] == "hybrid"
    assert res["total_results"] >= 1
    item = res["results"][0]
    assert item["pdf_page_index"] == 480
    assert item["printed_page_label"] == "452"
    assert item["citation_display"] == "Printed page 452 · PDF page 480"
    assert "rrf_score" in item


# ---------------------------------------------------------------------------
# Test 10: Assistant Ask Endpoint Integration with Hybrid Retrieval
# ---------------------------------------------------------------------------
def test_assistant_ask_hybrid_mode(hybrid_test_db):
    mock_json = """{
      "claims": [
        {
          "text": "The monolithic Kailasa temple was carved top to bottom under Krishna I.",
          "evidence_ids": ["E1"]
        }
      ],
      "missing_information": [],
      "conflicts": []
    }"""
    mock_provider = DeterministicMockProvider(response_text=mock_json)

    req = AssistantAskRequest(
        question="Who built the monolithic Kailasa temple at Cave 16?",
        retrieval_mode="hybrid",
    )
    resp = ask_assistant(req, provider=mock_provider)

    assert resp.grounding_state == "grounded"
    assert len(resp.claims) == 1
    ev = resp.claims[0].evidence[0]
    assert ev.pdf_page_index == 480
    assert ev.printed_page_label == "452"
    assert ev.citation_display == "Printed page 452 · PDF page 480"
    assert ev.rrf_score is not None


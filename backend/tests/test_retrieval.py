from pathlib import Path
import pytest
import numpy as np
from app.core.config import settings
from app.db.database import init_db, get_db_context
from app.db.repository import DocumentRepository
from app.services.chunking_service import chunk_document_pages
from app.services.embedding_service import embedding_service
from app.services.search_service import search_archive
from app.services.retrieval_service import (
    estimate_token_count,
    merge_texts_with_overlap,
    merge_consecutive_chunks,
    apply_source_diversity,
    pack_context_budget,
    assign_evidence_ids,
    retrieve_evidence,
)


class ControlledMockEmbeddingService:
    """Deterministic mock embedding service for unit testing retrieval engine."""

    def __init__(self):
        self.model_name = "mock-mini-lm"

    def is_available(self) -> bool:
        return True

    def encode_texts(self, texts: list[str]) -> np.ndarray:
        vectors = []
        for text in texts:
            t = text.lower()
            v = np.zeros(384, dtype=np.float32)
            matched = False
            if "kailash" in t:
                v[0] = 1.0
                matched = True
            if "temple" in t:
                v[1] = 1.0
                matched = True
            if "monolithic" in t:
                v[2] = 1.0
                matched = True
            if "inscription" in t or "epigraph" in t:
                v[3] = 1.0
                matched = True
            if "sanskrit" in t:
                v[4] = 1.0
                matched = True
            if "painting" in t or "mural" in t or "fresco" in t:
                v[5] = 1.0
                matched = True
            if "buddhist" in t or "bodhisattva" in t:
                v[6] = 1.0
                matched = True

            if matched:
                v = v / np.linalg.norm(v)
            else:
                # Deterministic pseudo-random vector for un-matched texts
                # Generates orthogonal or distinct low-similarity direction
                rng = np.random.RandomState(abs(hash(t)) % (2**31))
                rnd_v = rng.randn(384).astype(np.float32)
                rnd_v[:10] = 0.0  # Zero out the keyword signal dimensions
                v = rnd_v / np.linalg.norm(rnd_v)
            vectors.append(v)
        return np.array(vectors, dtype=np.float32)

    def encode_query(self, query: str) -> np.ndarray:
        return self.encode_texts([query])[0]

    def serialize_embedding(self, vector: np.ndarray) -> bytes:
        return vector.astype(np.float32).tobytes()

    def deserialize_embedding(self, blob: bytes) -> np.ndarray:
        return np.frombuffer(blob, dtype=np.float32)

    def compute_cosine_similarity(self, query_emb: np.ndarray, doc_emb: np.ndarray) -> float:
        score = float(np.dot(query_emb, doc_emb))
        return max(-1.0, min(1.0, score))


@pytest.fixture
def mock_retrieval_db(tmp_path: Path, monkeypatch):
    """Sets up an isolated database seeded with multi-document heritage test records."""
    temp_db = tmp_path / "test_retrieval.db"
    monkeypatch.setattr(settings, "DATABASE_PATH", temp_db)
    init_db(temp_db)

    mock_embed = ControlledMockEmbeddingService()
    monkeypatch.setattr("app.services.retrieval_service.embedding_service", mock_embed)
    monkeypatch.setattr("app.services.search_service.embedding_service", mock_embed)

    with get_db_context(temp_db) as conn:
        repo = DocumentRepository(conn)

        # Doc 1: Ellora Caves (Temple & Inscriptions)
        repo.insert_document({
            "id": "doc_ellora",
            "original_filename": "Ellora_Monograph.pdf",
            "file_size": 50000,
            "content_type": "application/pdf",
            "upload_timestamp": "2026-11-01T12:00:00Z",
            "processing_status": "completed",
            "extraction_status": "success",
            "page_count": 2,
            "storage_path": "/tmp/ellora.pdf",
            "indexing_status": "indexed",
        })
        pages_1 = [
            {
                "document_id": "doc_ellora",
                "page_number": 1,
                "text": "The monolithic Kailash temple at Cave 16 is a wonder of rock-cut architecture. It was carved from top to bottom.",
                "character_count": 113,
                "word_count": 20,
                "extraction_status": "success",
            },
            {
                "document_id": "doc_ellora",
                "page_number": 2,
                "text": "Sanskrit inscription records benefactions by Rashtrakuta kings. The epigraph describes copper plate grants.",
                "character_count": 107,
                "word_count": 14,
                "extraction_status": "success",
            },
        ]
        repo.insert_pages(pages_1)

        # Chunk and insert with mock embeddings
        chunks_1 = chunk_document_pages("doc_ellora", pages_1, chunk_size=70, overlap=20)
        c_texts_1 = [c["text"] for c in chunks_1]
        c_vecs_1 = mock_embed.encode_texts(c_texts_1)
        for idx, c in enumerate(chunks_1):
            c["embedding"] = mock_embed.serialize_embedding(c_vecs_1[idx])
        repo.insert_chunks(chunks_1)

        # Doc 2: Ajanta Murals (Paintings & Buddhist)
        repo.insert_document({
            "id": "doc_ajanta",
            "original_filename": "Ajanta_Murals.pdf",
            "file_size": 40000,
            "content_type": "application/pdf",
            "upload_timestamp": "2026-11-01T12:05:00Z",
            "processing_status": "completed",
            "extraction_status": "success",
            "page_count": 1,
            "storage_path": "/tmp/ajanta.pdf",
            "indexing_status": "indexed",
        })
        pages_2 = [
            {
                "document_id": "doc_ajanta",
                "page_number": 1,
                "text": "Buddhist painting and mural art in Cave 1 depicts Bodhisattva figures using natural mineral pigments.",
                "character_count": 103,
                "word_count": 15,
                "extraction_status": "success",
            }
        ]
        repo.insert_pages(pages_2)

        chunks_2 = chunk_document_pages("doc_ajanta", pages_2, chunk_size=70, overlap=20)
        c_texts_2 = [c["text"] for c in chunks_2]
        c_vecs_2 = mock_embed.encode_texts(c_texts_2)
        for idx, c in enumerate(chunks_2):
            c["embedding"] = mock_embed.serialize_embedding(c_vecs_2[idx])
        repo.insert_chunks(chunks_2)

    yield temp_db


# -------------------------------------------------------------------------
# Scenario 1: Retrieval Ranking (Highest similarity first)
# -------------------------------------------------------------------------
def test_retrieval_ranking(mock_retrieval_db):
    res = retrieve_evidence("Kailash temple monolithic rock-cut", threshold=0.1)
    assert res["has_sufficient_evidence"] is True
    evidence = res["evidence"]
    assert len(evidence) >= 1
    scores = [item["similarity_score"] for item in evidence]
    assert scores == sorted(scores, reverse=True)
    assert evidence[0]["document_id"] == "doc_ellora"
    assert evidence[0]["page_number"] == 1


# -------------------------------------------------------------------------
# Scenario 2: Configurable Threshold Filtering
# -------------------------------------------------------------------------
def test_configurable_threshold_filtering(mock_retrieval_db):
    # With threshold 0.8, only highly relevant temple chunks should pass
    res_high = retrieve_evidence("Kailash temple", threshold=0.8)
    for ev in res_high["evidence"]:
        assert ev["similarity_score"] >= 0.8

    # With threshold 0.999, non-perfect matches should be filtered
    res_ultra = retrieve_evidence("random text with temple", threshold=0.999)
    assert res_ultra["has_sufficient_evidence"] is False
    assert len(res_ultra["evidence"]) == 0


# -------------------------------------------------------------------------
# Scenario 3: Insufficient Candidate Evidence Behavior
# -------------------------------------------------------------------------
def test_insufficient_evidence_behavior(mock_retrieval_db):
    # Completely unrelated query
    res = retrieve_evidence("quantum computing hardware semiconductor", threshold=0.32)
    assert res["has_sufficient_evidence"] is False
    assert res["evidence"] == []
    assert res["evidence_map"] == {}
    assert res["total_candidates_found"] == 0
    assert res["token_budget_used"] == 0
    # max_similarity_score reflects highest score observed among stored chunks
    assert isinstance(res["max_similarity_score"], float)
    assert res["max_similarity_score"] < 0.32


# -------------------------------------------------------------------------
# Scenario 4: Adjacent Chunk Merging (Consecutive chunks on same page)
# -------------------------------------------------------------------------
def test_adjacent_chunk_merging_same_page():
    chunks = [
        {
            "chunk_id": "doc1_p1_c0",
            "document_id": "doc1",
            "original_filename": "Monograph.pdf",
            "page_number": 1,
            "chunk_index": 0,
            "text": "The monolithic Kailash temple is an architectural feat. It was carved",
            "similarity_score": 0.85,
        },
        {
            "chunk_id": "doc1_p1_c1",
            "document_id": "doc1",
            "original_filename": "Monograph.pdf",
            "page_number": 1,
            "chunk_index": 1,
            "text": "It was carved from top to bottom out of a single basalt cliff.",
            "similarity_score": 0.78,
        },
    ]

    merged = merge_consecutive_chunks(chunks)
    assert len(merged) == 1
    block = merged[0]
    assert block["document_id"] == "doc1"
    assert block["page_number"] == 1
    assert block["chunk_ids"] == ["doc1_p1_c0", "doc1_p1_c1"]
    assert block["similarity_score"] == 0.85  # Max score preserved
    # Overlap "It was carved" should only appear once
    assert block["text"].count("It was carved") == 1
    assert "single basalt cliff" in block["text"]


# -------------------------------------------------------------------------
# Scenario 5: Overlap Removal / Deduplication
# -------------------------------------------------------------------------
def test_overlap_removal_deduplication():
    text_a = "Epigraphical records confirm royal patronage of Rashtrakuta kings in the Deccan plateau."
    text_b = "Rashtrakuta kings in the Deccan plateau. Land grants were issued to Brahmin scholars."
    merged = merge_texts_with_overlap(text_a, text_b)

    assert "Land grants were issued" in merged
    assert merged.count("Rashtrakuta kings in the Deccan plateau") == 1


# -------------------------------------------------------------------------
# Scenario 6: No Merging Across Different Pages
# -------------------------------------------------------------------------
def test_no_merging_across_different_pages():
    chunks = [
        {
            "chunk_id": "doc1_p1_c0",
            "document_id": "doc1",
            "original_filename": "Monograph.pdf",
            "page_number": 1,
            "chunk_index": 0,
            "text": "Text from page 1 describing architectural layout.",
            "similarity_score": 0.80,
        },
        {
            "chunk_id": "doc1_p2_c0",
            "document_id": "doc1",
            "original_filename": "Monograph.pdf",
            "page_number": 2,
            "chunk_index": 0,
            "text": "Text from page 2 describing epigraphical inscriptions.",
            "similarity_score": 0.75,
        },
    ]

    merged = merge_consecutive_chunks(chunks)
    # Must remain 2 separate blocks because page numbers differ!
    assert len(merged) == 2
    assert merged[0]["page_number"] == 1
    assert merged[0]["chunk_ids"] == ["doc1_p1_c0"]
    assert merged[1]["page_number"] == 2
    assert merged[1]["chunk_ids"] == ["doc1_p2_c0"]


# -------------------------------------------------------------------------
# Scenario 7: No Merging Across Different Documents
# -------------------------------------------------------------------------
def test_no_merging_across_different_documents():
    chunks = [
        {
            "chunk_id": "docA_p1_c0",
            "document_id": "docA",
            "original_filename": "DocA.pdf",
            "page_number": 1,
            "chunk_index": 0,
            "text": "Document A page 1 text.",
            "similarity_score": 0.90,
        },
        {
            "chunk_id": "docB_p1_c0",
            "document_id": "docB",
            "original_filename": "DocB.pdf",
            "page_number": 1,
            "chunk_index": 0,
            "text": "Document B page 1 text.",
            "similarity_score": 0.88,
        },
    ]

    merged = merge_consecutive_chunks(chunks)
    assert len(merged) == 2
    docs = {m["document_id"] for m in merged}
    assert docs == {"docA", "docB"}


# -------------------------------------------------------------------------
# Scenario 8: Source Diversity Constraints (Page and Doc limits)
# -------------------------------------------------------------------------
def test_source_diversity_page_and_doc_limits():
    # 3 passages on page 1 of doc1, 2 passages on page 2 of doc1, 2 on page 3 of doc1, 1 on page 4 of doc1
    blocks = [
        {"document_id": "doc1", "page_number": 1, "text": "Block 1", "similarity_score": 0.95},
        {"document_id": "doc1", "page_number": 1, "text": "Block 2", "similarity_score": 0.94},
        {"document_id": "doc1", "page_number": 1, "text": "Block 3", "similarity_score": 0.93},  # Should be dropped (page limit = 2)
        {"document_id": "doc1", "page_number": 2, "text": "Block 4", "similarity_score": 0.90},
        {"document_id": "doc1", "page_number": 3, "text": "Block 5", "similarity_score": 0.85},
        {"document_id": "doc1", "page_number": 4, "text": "Block 6", "similarity_score": 0.80},  # Should be dropped (doc page limit = 3)
        {"document_id": "doc2", "page_number": 1, "text": "Block 7", "similarity_score": 0.78},  # Allowed from doc2
    ]

    diverse = apply_source_diversity(blocks, max_per_page=2, max_pages_per_doc=3)

    # From doc1 page 1: at most 2
    doc1_p1 = [b for b in diverse if b["document_id"] == "doc1" and b["page_number"] == 1]
    assert len(doc1_p1) == 2

    # Distinct pages from doc1: at most 3
    doc1_pages = {b["page_number"] for b in diverse if b["document_id"] == "doc1"}
    assert len(doc1_pages) <= 3
    assert 4 not in doc1_pages  # page 4 rejected by doc page limit

    # doc2 accepted
    assert any(b["document_id"] == "doc2" for b in diverse)


# -------------------------------------------------------------------------
# Scenario 9: Context Budget Enforcement (No mid-sentence truncation)
# -------------------------------------------------------------------------
def test_context_budget_enforcement():
    # Token estimation: len(text) / 4
    # Block A: 80 chars ~ 20 tokens
    # Block B: 120 chars ~ 30 tokens
    # Block C: 200 chars ~ 50 tokens
    blocks = [
        {"document_id": "d1", "page_number": 1, "text": "A" * 80, "similarity_score": 0.9, "estimated_tokens": 20},
        {"document_id": "d1", "page_number": 2, "text": "B" * 120, "similarity_score": 0.8, "estimated_tokens": 30},
        {"document_id": "d2", "page_number": 1, "text": "C" * 200, "similarity_score": 0.7, "estimated_tokens": 50},
    ]

    # Budget = 45 tokens -> Block A (20) fits, Block B (30) does not fit (20+30=50 > 45)
    packed = pack_context_budget(blocks, max_tokens=45)
    assert len(packed) == 1
    assert packed[0]["text"] == "A" * 80  # Full block included, no truncation

    # Budget = 60 tokens -> Block A (20) and Block B (30) fit (50 <= 60), Block C (50) does not
    packed2 = pack_context_budget(blocks, max_tokens=60)
    assert len(packed2) == 2
    total_tokens = sum(b["estimated_tokens"] for b in packed2)
    assert total_tokens <= 60


# -------------------------------------------------------------------------
# Scenario 10: Evidence ID Assignment (E1, E2, E3...)
# -------------------------------------------------------------------------
def test_evidence_id_assignment():
    blocks = [
        {"document_id": "d1", "original_filename": "Survey.pdf", "page_number": 1, "chunk_ids": ["c1"], "text": "Text 1", "similarity_score": 0.95},
        {"document_id": "d1", "original_filename": "Survey.pdf", "page_number": 2, "chunk_ids": ["c2"], "text": "Text 2", "similarity_score": 0.85},
        {"document_id": "d2", "original_filename": "Report.pdf", "page_number": 5, "chunk_ids": ["c3"], "text": "Text 3", "similarity_score": 0.75},
    ]

    ev_list, ev_map = assign_evidence_ids(blocks)
    assert len(ev_list) == 3
    assert [e["evidence_id"] for e in ev_list] == ["E1", "E2", "E3"]
    assert set(ev_map.keys()) == {"E1", "E2", "E3"}
    assert ev_map["E1"]["evidence_id"] == "E1"
    assert ev_map["E2"]["evidence_id"] == "E2"
    assert ev_map["E3"]["evidence_id"] == "E3"


# -------------------------------------------------------------------------
# Scenario 11: Exact Metadata Mapping
# -------------------------------------------------------------------------
def test_exact_metadata_mapping():
    blocks = [
        {
            "document_id": "doc_arch_123",
            "original_filename": "Baroda_Plates_1910.pdf",
            "page_number": 7,
            "chunk_ids": ["doc_arch_123_p7_c0", "doc_arch_123_p7_c1"],
            "text": "Sanskrit grant transcription of King Krishna I.",
            "similarity_score": 0.8842,
        }
    ]

    ev_list, ev_map = assign_evidence_ids(blocks)
    item = ev_map["E1"]

    assert item["evidence_id"] == "E1"
    assert item["document_id"] == "doc_arch_123"
    assert item["original_filename"] == "Baroda_Plates_1910.pdf"
    assert item["page_number"] == 7
    assert item["chunk_ids"] == ["doc_arch_123_p7_c0", "doc_arch_123_p7_c1"]
    assert item["text"] == "Sanskrit grant transcription of King Krishna I."
    assert item["similarity_score"] == 0.8842
    assert item["source_citation"] == "[Baroda_Plates_1910.pdf · Page 7]"
    assert item["token_count"] > 0


# -------------------------------------------------------------------------
# Scenario 12: Document ID Filtering
# -------------------------------------------------------------------------
def test_document_id_filtering(mock_retrieval_db):
    # Query matching temple, but restricted to doc_ajanta (which doesn't have temple)
    res_filtered = retrieve_evidence(
        query="Kailash temple",
        document_ids=["doc_ajanta"],
        threshold=0.1,
    )
    for ev in res_filtered["evidence"]:
        assert ev["document_id"] == "doc_ajanta"

    # Restricted to doc_ellora
    res_ellora = retrieve_evidence(
        query="Kailash temple",
        document_ids=["doc_ellora"],
        threshold=0.1,
    )
    assert res_ellora["has_sufficient_evidence"] is True
    for ev in res_ellora["evidence"]:
        assert ev["document_id"] == "doc_ellora"


# -------------------------------------------------------------------------
# Scenario 13: Existing Semantic Search Regression
# -------------------------------------------------------------------------
def test_existing_semantic_search_regression(mock_retrieval_db):
    # Existing search_archive must continue working identically
    res = search_archive("Kailash temple monolithic", limit=3)
    assert "query" in res
    assert "total_results" in res
    assert "results" in res
    assert res["search_mode"] == "semantic"
    assert res["total_results"] > 0
    top = res["results"][0]
    assert "chunk_id" in top
    assert "document_id" in top
    assert "original_filename" in top
    assert "page_number" in top
    assert "similarity_score" in top
    assert "source_citation" in top
    assert "[Ellora_Monograph.pdf · Page 1]" in top["source_citation"]

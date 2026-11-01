from pathlib import Path
import pytest
import numpy as np
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.db.database import init_db, get_db_context
from app.db.repository import DocumentRepository
from app.services.chunking_service import chunk_document_pages, split_text_into_chunks
from app.services.embedding_service import embedding_service
from app.services.search_service import index_document


class ControlledMockEmbeddingService:
    """
    Mock embedding service for deterministic unit tests.
    Generates controlled unit vectors based on keywords to test similarity ranking accurately.
    """

    def __init__(self):
        self.model_name = "mock-mini-lm"

    def is_available(self) -> bool:
        return True

    def encode_texts(self, texts: list[str]) -> np.ndarray:
        vectors = []
        for text in texts:
            t = text.lower()
            # Dimension 0: temples / architectural vimana
            # Dimension 1: epigraphy / inscriptions / rock edicts
            # Dimension 2: gazetteer / colonial surveys
            v = np.zeros(384, dtype=np.float32)
            if "temple" in t or "vimana" in t or "architecture" in t:
                v[0] = 1.0
            if "inscription" in t or "epigraph" in t or "brahmi" in t:
                v[1] = 1.0
            if "gazetteer" in t or "survey" in t:
                v[2] = 1.0
            norm = np.linalg.norm(v)
            if norm > 0:
                v = v / norm
            else:
                v[383] = 1.0  # fallback unit vector
            vectors.append(v)
        return np.array(vectors, dtype=np.float32)

    def encode_query(self, query: str) -> np.ndarray:
        return self.encode_texts([query])[0]

    def serialize_embedding(self, vector: np.ndarray) -> bytes:
        return vector.astype(np.float32).tobytes()

    def deserialize_embedding(self, blob: bytes) -> np.ndarray:
        return np.frombuffer(blob, dtype=np.float32)

    def compute_cosine_similarity(self, query_emb: np.ndarray, doc_emb: np.ndarray) -> float:
        return float(np.dot(query_emb, doc_emb))


@pytest.fixture(autouse=True)
def isolated_test_env(tmp_path: Path, monkeypatch):
    """
    Ensures tests run in an isolated directory with clean SQLite database
    and mocked embeddings to maintain speed and determinism.
    """
    test_upload_dir = tmp_path / "uploads"
    test_upload_dir.mkdir(parents=True, exist_ok=True)
    test_db_path = tmp_path / "test_search_dharohar.db"

    monkeypatch.setattr(settings, "UPLOAD_DIR", test_upload_dir)
    monkeypatch.setattr(settings, "DATABASE_PATH", test_db_path)

    # Use controlled mock embedding service for deterministic ranking
    mock_service = ControlledMockEmbeddingService()
    monkeypatch.setattr("app.services.search_service.embedding_service", mock_service)

    init_db(test_db_path)
    yield


@pytest.fixture
def client():
    return TestClient(app)


def seed_document_with_pages(
    doc_id: str,
    filename: str,
    pages_text: list[str],
) -> None:
    """Helper to seed a document and its pages in the database."""
    with get_db_context() as conn:
        repo = DocumentRepository(conn)
        repo.insert_document(
            {
                "id": doc_id,
                "original_filename": filename,
                "file_size": 1024,
                "content_type": "application/pdf",
                "upload_timestamp": "2026-10-30T00:00:00Z",
                "processing_status": "completed",
                "extraction_status": "extracted",
                "page_count": len(pages_text),
                "storage_path": f"{doc_id}.pdf",
                "indexing_status": "unindexed",
            }
        )
        pages = [
            {
                "document_id": doc_id,
                "page_number": idx + 1,
                "text": text,
                "character_count": len(text),
                "word_count": len(text.split()),
                "extraction_status": "extracted" if len(text.strip()) > 15 else "needs_ocr",
            }
            for idx, text in enumerate(pages_text)
        ]
        repo.insert_pages(pages)


def test_chunk_creation_and_page_number_preservation():
    """Verify that chunking preserves 1-based page numbers and does not cross boundaries."""
    pages = [
        {
            "page_number": 1,
            "text": (
                "Kailasa Temple monolithic rock-cut cave excavation at Ellora. "
                "Detailed architectural ground plan notes describing the Dravidian vimana tower. "
                "The central sanctum sanctorum houses the monolithic lingam."
            ),
        },
        {
            "page_number": 2,
            "text": (
                "Second page documenting epigraphical stone inscriptions in Nagari script. "
                "Donative records mention the Rashtrakuta monarch Krishna I."
            ),
        },
    ]

    chunks = chunk_document_pages("doc_ellora", pages, chunk_size=120, overlap=30)
    assert len(chunks) >= 2

    # Check page 1 chunks
    p1_chunks = [c for c in chunks if c["page_number"] == 1]
    assert len(p1_chunks) > 0
    for c in p1_chunks:
        assert c["document_id"] == "doc_ellora"
        assert c["id"].startswith("doc_ellora_p1_c")
        assert "Kailasa" in c["text"] or "vimana" in c["text"] or "sanctum" in c["text"]

    # Check page 2 chunks
    p2_chunks = [c for c in chunks if c["page_number"] == 2]
    assert len(p2_chunks) > 0
    for c in p2_chunks:
        assert c["document_id"] == "doc_ellora"
        assert c["id"].startswith("doc_ellora_p2_c")
        assert "inscription" in c["text"] or "Rashtrakuta" in c["text"]


def test_embedding_persistence_across_restarts():
    """Verify that chunk embeddings are stored as BLOBs in SQLite and survive connection resets."""
    doc_id = "doc_persist_test"
    seed_document_with_pages(
        doc_id,
        "historical_report.pdf",
        ["Archaeological architectural survey of Badami cave temples and Chalukyan monuments."],
    )

    index_result = index_document(doc_id)
    assert index_result["status"] == "indexed"
    assert index_result["chunks_created"] > 0

    # Simulate restart by reading from fresh DB connection
    with get_db_context() as fresh_conn:
        repo = DocumentRepository(fresh_conn)
        chunks_with_emb = repo.get_all_chunks_with_embeddings()
        assert len(chunks_with_emb) == index_result["chunks_created"]

        first_chunk = chunks_with_emb[0]
        assert first_chunk["document_id"] == doc_id
        assert first_chunk["embedding"] is not None

        # Deserialization test
        mock_service = ControlledMockEmbeddingService()
        vec = mock_service.deserialize_embedding(first_chunk["embedding"])
        assert isinstance(vec, np.ndarray)
        assert vec.shape == (384,)
        assert vec.dtype == np.float32


def test_semantic_ranking_using_controlled_embeddings(client):
    """Verify semantic search ranks passages matching the conceptual theme highest."""
    # Seed doc 1: Architecture / Temple
    seed_document_with_pages(
        "doc_arch",
        "ellora_architecture.pdf",
        ["The monolithic temple vimana shikhara displays remarkable Rashtrakuta rock architecture."],
    )
    # Seed doc 2: Inscriptions
    seed_document_with_pages(
        "doc_epig",
        "girnar_epigraph.pdf",
        ["The Sanskrit rock inscription records the repair of the lake dam under Mahakshatrapa."],
    )

    # Index both documents
    resp1 = client.post("/api/documents/doc_arch/index")
    resp2 = client.post("/api/documents/doc_epig/index")
    assert resp1.status_code == 200
    assert resp2.status_code == 200

    # Search for architectural temple concept
    search_resp = client.post("/api/search", json={"query": "temple vimana architecture", "limit": 2})
    assert search_resp.status_code == 200
    data = search_resp.json()
    assert data["total_results"] > 0
    top_result = data["results"][0]

    # Temple doc should rank first
    assert top_result["document_id"] == "doc_arch"
    assert "ellora_architecture.pdf" in top_result["original_filename"]
    assert top_result["similarity_score"] > 0.9

    # Search for epigraphical inscription concept
    epig_search = client.post("/api/search", json={"query": "rock inscription edict", "limit": 2})
    assert epig_search.status_code == 200
    epig_data = epig_search.json()
    assert epig_data["results"][0]["document_id"] == "doc_epig"
    assert "girnar_epigraph.pdf" in epig_data["results"][0]["original_filename"]


def test_empty_query_handling(client):
    """Verify that empty queries return 400 Bad Request."""
    resp1 = client.post("/api/search", json={"query": ""})
    assert resp1.status_code == 400
    assert "empty" in resp1.json()["detail"].lower()

    resp2 = client.post("/api/search", json={"query": "    "})
    assert resp2.status_code == 400
    assert "empty" in resp2.json()["detail"].lower()


def test_search_against_empty_archive(client):
    """Verify searching when no documents exist returns empty results gracefully without errors."""
    resp = client.post("/api/search", json={"query": "Kailasa Temple"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_results"] == 0
    assert data["results"] == []
    assert data["search_mode"] == "semantic"
    assert "no indexed document" in data["message"].lower()


def test_source_attribution_in_every_result(client):
    """Verify that every search result provides complete provenance and citation data."""
    seed_document_with_pages(
        "doc_citation_test",
        "imperial_gazetteer_vol4.pdf",
        [
            "Page 1: General geographical description of western ghats.",
            "Page 2: Temple elevation details and architectural stone friezes.",
        ],
    )
    client.post("/api/documents/doc_citation_test/index")

    resp = client.post("/api/search", json={"query": "temple stone", "limit": 5})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_results"] > 0

    for item in data["results"]:
        assert item["chunk_id"].startswith("doc_citation_test_p")
        assert item["document_id"] == "doc_citation_test"
        assert item["original_filename"] == "imperial_gazetteer_vol4.pdf"
        assert isinstance(item["page_number"], int)
        assert item["page_number"] >= 1
        assert "imperial_gazetteer_vol4.pdf" in item["source_citation"]
        assert f"Page {item['page_number']}" in item["source_citation"]
        assert isinstance(item["similarity_score"], float)
        assert len(item["text"]) > 0


def test_reindexing_without_duplicate_chunks(client):
    """Verify that indexing the same document multiple times is strictly idempotent."""
    seed_document_with_pages(
        "doc_idempotent",
        "monuments.pdf",
        ["First page description of architectural temple structures across Gujarat."],
    )

    # First indexing
    resp1 = client.post("/api/documents/doc_idempotent/index")
    assert resp1.status_code == 200
    count1 = resp1.json()["chunks_created"]
    assert count1 > 0

    # Second indexing
    resp2 = client.post("/api/documents/doc_idempotent/index")
    assert resp2.status_code == 200
    count2 = resp2.json()["chunks_created"]
    assert count2 == count1

    # Inspect chunks endpoint to verify no duplicates exist
    chunks_resp = client.get("/api/documents/doc_idempotent/chunks")
    assert chunks_resp.status_code == 200
    data = chunks_resp.json()
    assert data["total_chunks"] == count1
    chunk_ids = [c["id"] for c in data["chunks"]]
    assert len(chunk_ids) == len(set(chunk_ids))  # All IDs must be unique


def test_handling_documents_without_extractable_text(client):
    """Verify that documents with sparse/scanned pages are flagged without fabricating chunks."""
    seed_document_with_pages(
        "doc_scanned",
        "scanned_blueprint_plate.pdf",
        ["", "   "],
    )

    resp = client.post("/api/documents/doc_scanned/index")
    assert resp.status_code == 200
    data = resp.json()
    assert data["chunks_created"] == 0
    assert data["status"] == "no_extractable_text"
    assert "OCR" in data["message"]


def test_get_document_chunks_endpoint(client):
    """Verify GET /api/documents/{document_id}/chunks endpoint."""
    seed_document_with_pages(
        "doc_inspect",
        "survey_notes.pdf",
        ["Archaeological survey notes page 1 detailing monolithic rock temples."],
    )
    client.post("/api/documents/doc_inspect/index")

    # Valid document
    resp = client.get("/api/documents/doc_inspect/chunks")
    assert resp.status_code == 200
    data = resp.json()
    assert data["document_id"] == "doc_inspect"
    assert data["total_chunks"] > 0
    assert data["chunks"][0]["has_embedding"] is True

    # Non-existent document
    bad_resp = client.get("/api/documents/doc_nonexistent_9999/chunks")
    assert bad_resp.status_code == 404


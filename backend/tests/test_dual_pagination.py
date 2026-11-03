import sqlite3
import pytest
from pathlib import Path
import fitz

from app.core.config import settings
from app.db.database import init_db, get_db_context, migrate_schema_add_dual_pagination
from app.db.repository import DocumentRepository
from app.services.chunking_service import chunk_page, chunk_document_pages
from app.services.retrieval_service import (
    format_citation_display,
    assign_evidence_ids,
    merge_consecutive_chunks,
    apply_source_diversity,
    retrieve_evidence,
)
from app.services.search_service import search_archive
from app.services.llm_service import BaseLLMProvider
from app.services.assistant_service import ask_assistant, AssistantAskRequest


class DeterministicMockProvider(BaseLLMProvider):
    def __init__(self, response_text: str = ""):
        self.response_text = response_text

    def is_available(self) -> bool:
        return True

    def check_model_status(self) -> dict:
        return {"available": True, "model": settings.OLLAMA_MODEL}

    def generate(self, prompt: str, system_prompt: str | None = None) -> str:
        return self.response_text


class ControlledMockEmbeddingService:
    """Mock embedding service deterministic for testing."""
    def encode_query(self, query: str):
        return [1.0, 0.0]

    def encode_texts(self, texts):
        return [[1.0, 0.0] for _ in texts]

    def serialize_embedding(self, emb):
        import json
        return json.dumps(emb).encode("utf-8")

    def deserialize_embedding(self, blob):
        import json
        return json.loads(blob.decode("utf-8"))

    def compute_cosine_similarity(self, a, b):
        return 0.95


@pytest.fixture
def dual_pagination_db(tmp_path: Path, monkeypatch):
    """Sets up an isolated test database with dual pagination schema and mock data."""
    test_db = tmp_path / "test_dual_pagination.db"
    monkeypatch.setattr(settings, "DATABASE_PATH", test_db)
    init_db(test_db)

    mock_embed = ControlledMockEmbeddingService()
    monkeypatch.setattr("app.services.retrieval_service.embedding_service", mock_embed)
    monkeypatch.setattr("app.services.search_service.embedding_service", mock_embed)

    with get_db_context(test_db) as conn:
        repo = DocumentRepository(conn)

        # Document 1: Cave Temples of India (1880) - has printed page labels
        repo.insert_document({
            "id": "doc_fergusson_1880",
            "original_filename": "Fergusson_Burgess_1880.pdf",
            "file_size": 100000,
            "content_type": "application/pdf",
            "upload_timestamp": "2026-11-01T12:00:00Z",
            "processing_status": "completed",
            "extraction_status": "extracted",
            "page_count": 764,
            "storage_path": "doc_fergusson_1880.pdf",
            "indexing_status": "indexed",
        })

        # PDF page 480 corresponds to printed book page 452
        pages_1 = [
            {
                "document_id": "doc_fergusson_1880",
                "page_number": 480,
                "pdf_page_index": 480,
                "printed_page_label": "452",
                "text": "The monolithic temple of Kailasa at Ellora is one of the most remarkable rock-cut structures.",
                "character_count": 94,
                "word_count": 15,
                "extraction_status": "extracted",
            }
        ]
        repo.insert_pages(pages_1)

        chunks_1 = chunk_document_pages("doc_fergusson_1880", pages_1, chunk_size=100, overlap=20)
        c_vecs_1 = mock_embed.encode_texts([c["text"] for c in chunks_1])
        for idx, c in enumerate(chunks_1):
            c["embedding"] = mock_embed.serialize_embedding(c_vecs_1[idx])
        repo.insert_chunks(chunks_1)

        # Document 2: Arch Report 1544 (1883) - lacks printed page labels (NULL)
        repo.insert_document({
            "id": "doc_burgess_1883",
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

        pages_2 = [
            {
                "document_id": "doc_burgess_1883",
                "page_number": 15,
                "pdf_page_index": 15,
                "printed_page_label": None,
                "text": "Report on the Buddhist Cave Temples and their Inscriptions.",
                "character_count": 58,
                "word_count": 9,
                "extraction_status": "ocr_extracted",
            }
        ]
        repo.insert_pages(pages_2)

        chunks_2 = chunk_document_pages("doc_burgess_1883", pages_2, chunk_size=100, overlap=20)
        c_vecs_2 = mock_embed.encode_texts([c["text"] for c in chunks_2])
        for idx, c in enumerate(chunks_2):
            c["embedding"] = mock_embed.serialize_embedding(c_vecs_2[idx])
        repo.insert_chunks(chunks_2)

    yield test_db


# ---------------------------------------------------------------------------
# Test 1: Schema Migration & Idempotency
# ---------------------------------------------------------------------------
def test_schema_migration_idempotent(tmp_path: Path):
    """Verifies that dual pagination migration adds columns and is safely idempotent."""
    db_file = tmp_path / "legacy_test.db"
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row

    # Create pre-5.6.2 legacy schema without dual pagination columns
    conn.execute("""
    CREATE TABLE document_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        text TEXT NOT NULL,
        character_count INTEGER NOT NULL,
        word_count INTEGER NOT NULL,
        extraction_status TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    conn.execute("""
    CREATE TABLE document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        chunk_index INTEGER NOT NULL,
        text TEXT NOT NULL,
        character_count INTEGER NOT NULL,
        word_count INTEGER NOT NULL,
        embedding BLOB,
        created_at TEXT NOT NULL
    )
    """)

    # Seed legacy rows
    conn.execute(
        "INSERT INTO document_pages (document_id, page_number, text, character_count, word_count, extraction_status, created_at) "
        "VALUES ('doc1', 480, 'Sample text', 11, 2, 'extracted', '2026-11-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO document_chunks (id, document_id, page_number, chunk_index, text, character_count, word_count, created_at) "
        "VALUES ('chunk1', 'doc1', 480, 0, 'Sample text', 11, 2, '2026-11-01T00:00:00Z')"
    )
    conn.commit()

    # Run migration first time
    migrate_schema_add_dual_pagination(conn)

    # Check that columns were added and populated
    row_page = conn.execute("SELECT * FROM document_pages WHERE id = 1").fetchone()
    assert row_page["pdf_page_index"] == 480
    assert row_page["printed_page_label"] is None

    row_chunk = conn.execute("SELECT * FROM document_chunks WHERE id = 'chunk1'").fetchone()
    assert row_chunk["pdf_page_index"] == 480
    assert row_chunk["printed_page_label"] is None

    # Run migration second time: must not raise error (idempotent)
    migrate_schema_add_dual_pagination(conn)
    conn.close()


# ---------------------------------------------------------------------------
# Test 2: Native PDF Page Label Extraction (PyMuPDF)
# ---------------------------------------------------------------------------
def test_native_page_label_extraction_fergusson():
    """Verifies page.get_label() on Fergusson Burgess 1880 PDF."""
    pdf_path = Path("test_dataset/Fergusson Burgess 1880.pdf")
    if not pdf_path.exists():
        pytest.skip("Test dataset PDF Fergusson Burgess 1880.pdf not found.")

    doc = fitz.open(pdf_path)
    assert len(doc) == 764

    # 1-based page 480 is 0-based index 479
    p480 = doc[479]
    label_480 = p480.get_label().strip()
    # Verified ground truth: PDF page 480 is printed book page 452
    assert label_480 == "452"

    # Front-matter page check: 1-based page 29 is printed page 3
    p29 = doc[28]
    label_29 = p29.get_label().strip()
    assert label_29 == "3"
    doc.close()


def test_native_page_label_extraction_unlabelled_pdf():
    """Verifies that PDFs without PageLabels return empty string and normalize to None."""
    pdf_path = Path("test_dataset/1544.pdf")
    if not pdf_path.exists():
        pytest.skip("Test dataset PDF 1544.pdf not found.")

    doc = fitz.open(pdf_path)
    p1 = doc[0]
    label = p1.get_label().strip()
    assert label == ""  # PyMuPDF returns empty string when not defined
    doc.close()


# ---------------------------------------------------------------------------
# Test 3: Citation Formatting Helper
# ---------------------------------------------------------------------------
def test_format_citation_display():
    # With printed page label
    assert format_citation_display(480, "452") == "Printed page 452 · PDF page 480"
    assert format_citation_display(12, "xii") == "Printed page xii · PDF page 12"
    assert format_citation_display(15, "Plate IV") == "Printed page Plate IV · PDF page 15"

    # Without printed page label (None or empty)
    assert format_citation_display(480, None) == "PDF page 480 · Printed page unavailable"
    assert format_citation_display(15, "") == "PDF page 15 · Printed page unavailable"
    assert format_citation_display(15, "   ") == "PDF page 15 · Printed page unavailable"


# ---------------------------------------------------------------------------
# Test 4: Chunking Propagation of Dual Pagination
# ---------------------------------------------------------------------------
def test_chunking_preserves_dual_pagination():
    page_data = {
        "page_number": 480,
        "pdf_page_index": 480,
        "printed_page_label": "452",
        "text": "The monolithic Kailasa temple was carved from top to bottom.",
    }
    # Test via chunk_document_pages
    doc_chunks = chunk_document_pages("doc1", [page_data], chunk_size=50, overlap=10)
    assert len(doc_chunks) > 0
    for c in doc_chunks:
        assert c["page_number"] == 480
        assert c["pdf_page_index"] == 480
        assert c["printed_page_label"] == "452"

    # Test via chunk_page direct
    page_chunks = chunk_page(
        "doc1",
        page_number=480,
        page_text=page_data["text"],
        chunk_size=50,
        overlap=10,
        pdf_page_index=480,
        printed_page_label="452",
    )
    assert len(page_chunks) > 0
    for c in page_chunks:
        assert c["page_number"] == 480
        assert c["pdf_page_index"] == 480
        assert c["printed_page_label"] == "452"


# ---------------------------------------------------------------------------
# Test 5: Retrieval Service Dual Pagination Integration
# ---------------------------------------------------------------------------
def test_retrieval_service_dual_pagination(dual_pagination_db):
    res = retrieve_evidence("monolithic Kailasa temple", threshold=0.1)
    assert res["has_sufficient_evidence"] is True
    evidence = res["evidence"]
    assert len(evidence) >= 1

    fergusson_ev = next(e for e in evidence if e["document_id"] == "doc_fergusson_1880")
    assert fergusson_ev["pdf_page_index"] == 480
    assert fergusson_ev["page_number"] == 480
    assert fergusson_ev["printed_page_label"] == "452"
    assert fergusson_ev["citation_display"] == "Printed page 452 · PDF page 480"
    assert "Printed page 452 · PDF page 480" in fergusson_ev["source_citation"]

    burgess_ev = next(e for e in evidence if e["document_id"] == "doc_burgess_1883")
    assert burgess_ev["pdf_page_index"] == 15
    assert burgess_ev["printed_page_label"] is None
    assert burgess_ev["citation_display"] == "PDF page 15 · Printed page unavailable"
    assert "[1544.pdf · Page 15]" in burgess_ev["source_citation"]


# ---------------------------------------------------------------------------
# Test 6: Search Archive Dual Pagination Integration
# ---------------------------------------------------------------------------
def test_search_archive_dual_pagination(dual_pagination_db):
    res = search_archive("monolithic Kailasa", limit=5)
    assert res["total_results"] >= 1
    results = res["results"]

    item_480 = next(r for r in results if r["document_id"] == "doc_fergusson_1880")
    assert item_480["pdf_page_index"] == 480
    assert item_480["printed_page_label"] == "452"
    assert item_480["citation_display"] == "Printed page 452 · PDF page 480"


# ---------------------------------------------------------------------------
# Test 7: Assistant Service Claim Evidence Provenance
# ---------------------------------------------------------------------------
def test_assistant_claim_evidence_dual_pagination(dual_pagination_db):
    mock_json = """{
      "claims": [
        {
          "text": "The monolithic Kailasa temple was carved out of basalt.",
          "evidence_ids": ["E1"]
        }
      ],
      "missing_information": [],
      "conflicts": []
    }"""
    mock_provider = DeterministicMockProvider(response_text=mock_json)

    req = AssistantAskRequest(
        question="What is the architecture of the Kailasa temple?",
        document_ids=["doc_fergusson_1880"]
    )
    resp = ask_assistant(req, provider=mock_provider)

    assert resp.grounding_state == "grounded"
    assert len(resp.claims) == 1
    ev = resp.claims[0].evidence[0]
    assert ev.pdf_page_index == 480
    assert ev.printed_page_label == "452"
    assert ev.citation_display == "Printed page 452 · PDF page 480"
    assert ev.page_number == 480  # backward-compatible navigation target

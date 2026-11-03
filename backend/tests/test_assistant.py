from pathlib import Path
import json
import pytest
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.db.database import init_db, get_db_context
from app.db.repository import DocumentRepository
from app.services.chunking_service import chunk_document_pages
from app.services.llm_service import BaseLLMProvider


class ControlledMockEmbeddingService:
    """Deterministic mock embedding service for assistant integration tests."""

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

            if matched:
                v = v / np.linalg.norm(v)
            else:
                rng = np.random.RandomState(abs(hash(t)) % (2**31))
                rnd_v = rng.randn(384).astype(np.float32)
                rnd_v[:10] = 0.0
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


class DeterministicMockProvider(BaseLLMProvider):
    """Mock LLM provider returning pre-configured outputs for assistant tests."""

    def __init__(self, response_text: str = "", is_available_val: bool = True, model_installed: bool = True):
        self.response_text = response_text
        self.is_available_val = is_available_val
        self.model_installed = model_installed
        self.recorded_calls = 0

    def is_available(self) -> bool:
        return self.is_available_val

    def check_model_status(self) -> dict:
        if not self.is_available_val:
            return {
                "available": False,
                "reason": "connection_refused",
                "message": "Cannot connect to local Ollama daemon.",
                "setup_instructions": "Run 'ollama serve'.",
            }
        if not self.model_installed:
            return {
                "available": False,
                "reason": "model_missing",
                "message": f"Model '{settings.OLLAMA_MODEL}' not installed.",
                "setup_instructions": f"Run 'ollama pull {settings.OLLAMA_MODEL}'.",
            }
        return {
            "available": True,
            "model": settings.OLLAMA_MODEL,
            "message": "Model is installed and ready.",
        }

    def generate(self, prompt: str, system_prompt: str) -> str:
        self.recorded_calls += 1
        return self.response_text


@pytest.fixture
def seeded_assistant_client(tmp_path: Path, monkeypatch):
    """Initializes isolated database, client, and mock embedding/LLM providers."""
    temp_db = tmp_path / "test_assistant.db"
    monkeypatch.setattr(settings, "DATABASE_PATH", temp_db)
    init_db(temp_db)

    mock_embed = ControlledMockEmbeddingService()
    monkeypatch.setattr("app.services.retrieval_service.embedding_service", mock_embed)
    monkeypatch.setattr("app.services.search_service.embedding_service", mock_embed)

    with get_db_context(temp_db) as conn:
        repo = DocumentRepository(conn)

        # Seed Document 1: Ellora Survey
        repo.insert_document({
            "id": "doc_ellora",
            "original_filename": "Ellora_Monograph_1920.pdf",
            "file_size": 100000,
            "content_type": "application/pdf",
            "upload_timestamp": "2026-11-01T12:00:00Z",
            "processing_status": "completed",
            "extraction_status": "success",
            "page_count": 2,
            "storage_path": "/tmp/ellora.pdf",
            "indexing_status": "indexed",
        })
        pages = [
            {
                "document_id": "doc_ellora",
                "page_number": 1,
                "text": "Cave 16 Kailash temple is a monolithic rock-cut monument excavated from top to bottom.",
                "character_count": 89,
                "word_count": 14,
                "extraction_status": "success",
            },
            {
                "document_id": "doc_ellora",
                "page_number": 2,
                "text": "Sanskrit inscription records that King Krishna I was the patron of the Kailash monolithic temple.",
                "character_count": 97,
                "word_count": 16,
                "extraction_status": "success",
            },
        ]
        repo.insert_pages(pages)

        chunks = chunk_document_pages("doc_ellora", pages, chunk_size=80, overlap=20)
        c_texts = [c["text"] for c in chunks]
        c_vecs = mock_embed.encode_texts(c_texts)
        for idx, c in enumerate(chunks):
            c["embedding"] = mock_embed.serialize_embedding(c_vecs[idx])
        repo.insert_chunks(chunks)

        # Seed Document 2: Other Doc (No temple text)
        repo.insert_document({
            "id": "doc_other",
            "original_filename": "Other_Survey.pdf",
            "file_size": 50000,
            "content_type": "application/pdf",
            "upload_timestamp": "2026-11-01T12:10:00Z",
            "processing_status": "completed",
            "extraction_status": "success",
            "page_count": 1,
            "storage_path": "/tmp/other.pdf",
            "indexing_status": "indexed",
        })
        pages_other = [
            {
                "document_id": "doc_other",
                "page_number": 1,
                "text": "Modern colonial tax assessment records from 1890 with agricultural surveys.",
                "character_count": 75,
                "word_count": 10,
                "extraction_status": "success",
            }
        ]
        repo.insert_pages(pages_other)
        chunks_other = chunk_document_pages("doc_other", pages_other, chunk_size=80, overlap=20)
        c_texts_other = [c["text"] for c in chunks_other]
        c_vecs_other = mock_embed.encode_texts(c_texts_other)
        for idx, c in enumerate(chunks_other):
            c["embedding"] = mock_embed.serialize_embedding(c_vecs_other[idx])
        repo.insert_chunks(chunks_other)

    client = TestClient(app)
    return client


def apply_mock_provider(monkeypatch, provider):
    monkeypatch.setattr("app.services.assistant_service.get_llm_provider", lambda: provider)
    monkeypatch.setattr("app.services.llm_service.get_llm_provider", lambda: provider)


# ---------------------------------------------------------------------------
# Test 1: Valid Question with Grounded Response
# ---------------------------------------------------------------------------
def test_valid_question_grounded_response(seeded_assistant_client, monkeypatch):
    mock_llm_json = json.dumps({
        "claims": [
            {
                "text": "King Krishna I was the patron of the Kailash monolithic temple.",
                "evidence_ids": ["E1"]
            }
        ],
        "missing_information": [],
        "conflicts": []
    })
    mock_provider = DeterministicMockProvider(response_text=mock_llm_json)
    apply_mock_provider(monkeypatch, mock_provider)

    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": "Who was the patron of the Kailash temple?"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["question"] == "Who was the patron of the Kailash temple?"
    assert data["grounding_state"] == "grounded"
    assert len(data["claims"]) == 1
    assert data["claims"][0]["evidence_ids"] == ["E1"]
    assert any("Ellora_Monograph_1920.pdf" in c and ("Page 1" in c or "Page 2" in c) for c in data["claims"][0]["source_citations"])
    assert len(data["verified_citations"]) == 1
    assert "semantic entailment is not independently verified" in data["limitations"][0]


# ---------------------------------------------------------------------------
# Test 2: Empty Question Rejection
# ---------------------------------------------------------------------------
def test_empty_question_rejection(seeded_assistant_client):
    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": ""},
    )
    assert resp.status_code == 400
    assert "cannot be empty" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Test 3: Whitespace-Only Question Rejection
# ---------------------------------------------------------------------------
def test_whitespace_only_question_rejection(seeded_assistant_client):
    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": "    \n\t   "},
    )
    assert resp.status_code == 400
    assert "cannot be empty or whitespace" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Test 4: Maximum Question Length Enforcement
# ---------------------------------------------------------------------------
def test_max_question_length_enforcement(seeded_assistant_client):
    too_long = "Kailash temple query? " + ("A" * 1050)
    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": too_long},
    )
    assert resp.status_code == 400
    assert "exceeds maximum allowed length" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Test 5: Optional Document Filtering
# ---------------------------------------------------------------------------
def test_optional_document_filtering(seeded_assistant_client, monkeypatch):
    mock_llm_json = json.dumps({
        "claims": [{"text": "Monolithic temple.", "evidence_ids": ["E1"]}],
        "missing_information": [],
        "conflicts": []
    })
    mock_provider = DeterministicMockProvider(response_text=mock_llm_json)
    apply_mock_provider(monkeypatch, mock_provider)

    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={
            "question": "Kailash monolithic temple",
            "document_ids": ["doc_ellora"]
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["grounding_state"] == "grounded"
    # Evidence must come exclusively from doc_ellora
    for claim in data["claims"]:
        for ev in claim["evidence"]:
            assert ev["document_id"] == "doc_ellora"


# ---------------------------------------------------------------------------
# Test 6: Invalid Document ID Rejection
# ---------------------------------------------------------------------------
def test_invalid_document_id_rejection(seeded_assistant_client):
    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={
            "question": "Kailash temple",
            "document_ids": ["doc_non_existent_12345"]
        },
    )
    assert resp.status_code == 400
    assert "does not exist in the archive" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Test 7: Retrieval with No Relevant Evidence
# ---------------------------------------------------------------------------
def test_retrieval_no_relevant_evidence(seeded_assistant_client):
    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": "quantum computing gpu tensor core acceleration"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["grounding_state"] == "insufficient_evidence"
    assert data["has_sufficient_evidence"] is False
    assert len(data["claims"]) == 0
    assert "does not contain sufficient relevant documentation" in data["answer"]


# ---------------------------------------------------------------------------
# Test 8: Retrieval Short-Circuit Without LLM Invocation
# ---------------------------------------------------------------------------
def test_retrieval_short_circuit_without_llm(seeded_assistant_client, monkeypatch):
    mock_provider = DeterministicMockProvider()
    apply_mock_provider(monkeypatch, mock_provider)

    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": "quantum semiconductor computing"},
    )
    assert resp.status_code == 200
    assert resp.json()["grounding_state"] == "insufficient_evidence"
    # Zero calls made to the LLM provider!
    assert mock_provider.recorded_calls == 0


# ---------------------------------------------------------------------------
# Test 9: Successful Mocked Ollama Generation
# ---------------------------------------------------------------------------
def test_successful_mocked_ollama_generation(seeded_assistant_client, monkeypatch):
    mock_llm_json = json.dumps({
        "claims": [
            {
                "text": "Cave 16 is a monolithic structure excavated from top to bottom.",
                "evidence_ids": ["E1"]
            }
        ],
        "missing_information": [],
        "conflicts": []
    })
    mock_provider = DeterministicMockProvider(response_text=mock_llm_json)
    apply_mock_provider(monkeypatch, mock_provider)

    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": "How was the Kailash monolithic Cave 16 carved?"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "Cave 16 is a monolithic structure excavated from top to bottom."
    assert mock_provider.recorded_calls == 1


# ---------------------------------------------------------------------------
# Test 10: Provider Unavailable
# ---------------------------------------------------------------------------
def test_provider_unavailable(seeded_assistant_client, monkeypatch):
    mock_provider = DeterministicMockProvider(is_available_val=False)
    apply_mock_provider(monkeypatch, mock_provider)

    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": "Kailash monolithic temple"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["grounding_state"] == "provider_unavailable"
    assert data["answer"] is None
    assert "Cannot connect to local Ollama daemon" in data["error"]


# ---------------------------------------------------------------------------
# Test 11: Missing Local Model
# ---------------------------------------------------------------------------
def test_missing_local_model(seeded_assistant_client, monkeypatch):
    mock_provider = DeterministicMockProvider(is_available_val=True, model_installed=False)
    apply_mock_provider(monkeypatch, mock_provider)

    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": "Kailash monolithic temple"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["grounding_state"] == "provider_unavailable"
    assert "ollama pull" in data["error"]


# ---------------------------------------------------------------------------
# Test 12: Malformed LLM Response
# ---------------------------------------------------------------------------
def test_malformed_llm_response(seeded_assistant_client, monkeypatch):
    mock_provider = DeterministicMockProvider(response_text="This is raw broken text not JSON")
    apply_mock_provider(monkeypatch, mock_provider)

    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": "Kailash monolithic temple"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["grounding_state"] == "malformed_output"
    assert data["answer"] is None
    assert "error" in data


# ---------------------------------------------------------------------------
# Test 13: Valid Citation Resolution
# ---------------------------------------------------------------------------
def test_valid_citation_resolution(seeded_assistant_client, monkeypatch):
    mock_llm_json = json.dumps({
        "claims": [
            {
                "text": "The monolithic Kailash temple is Cave 16.",
                "evidence_ids": ["E1"]
            }
        ],
        "missing_information": [],
        "conflicts": []
    })
    mock_provider = DeterministicMockProvider(response_text=mock_llm_json)
    apply_mock_provider(monkeypatch, mock_provider)

    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": "What cave is the Kailash monolithic temple?"},
    )
    assert resp.status_code == 200
    ev = resp.json()["claims"][0]["evidence"][0]
    assert ev["evidence_id"] == "E1"
    assert ev["document_id"] == "doc_ellora"
    assert ev["filename"] == "Ellora_Monograph_1920.pdf"
    assert ev["citation_valid"] is True
    assert ev["semantic_support"] == "not_independently_verified"


# ---------------------------------------------------------------------------
# Test 14: Unknown Evidence ID Rejection
# ---------------------------------------------------------------------------
def test_unknown_evidence_id_rejection(seeded_assistant_client, monkeypatch):
    mock_llm_json = json.dumps({
        "claims": [
            {
                "text": "Hallucinated claim with fake evidence ID.",
                "evidence_ids": ["E999"]
            },
            {
                "text": "Valid claim with real evidence ID.",
                "evidence_ids": ["E1"]
            }
        ],
        "missing_information": [],
        "conflicts": []
    })
    mock_provider = DeterministicMockProvider(response_text=mock_llm_json)
    apply_mock_provider(monkeypatch, mock_provider)

    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": "Kailash monolithic temple"},
    )
    assert resp.status_code == 200
    data = resp.json()
    # Fake claim dropped; only valid claim kept
    assert len(data["claims"]) == 1
    assert data["claims"][0]["evidence_ids"] == ["E1"]
    assert "E999" not in str(data["claims"])


# ---------------------------------------------------------------------------
# Test 15: Conflicting Evidence Response
# ---------------------------------------------------------------------------
def test_conflicting_evidence_response(seeded_assistant_client, monkeypatch):
    mock_llm_json = json.dumps({
        "claims": [],
        "missing_information": [],
        "conflicts": [
            {
                "topic": "Commission Date",
                "claim_a": "Begun under Krishna I.",
                "evidence_ids_a": ["E1"],
                "claim_b": "Begun under earlier dynasty.",
                "evidence_ids_b": ["E2"]
            }
        ]
    })
    mock_provider = DeterministicMockProvider(response_text=mock_llm_json)
    apply_mock_provider(monkeypatch, mock_provider)

    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": "Kailash monolithic temple inscription"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["grounding_state"] == "conflicting_evidence"
    assert len(data["conflicts"]) == 1
    assert "differing historical accounts" in data["answer"].lower()


# ---------------------------------------------------------------------------
# Test 16: Partial Answer with Missing Information
# ---------------------------------------------------------------------------
def test_partial_answer_with_missing_information(seeded_assistant_client, monkeypatch):
    mock_llm_json = json.dumps({
        "claims": [
            {
                "text": "King Krishna I commissioned the temple.",
                "evidence_ids": ["E1"]
            }
        ],
        "missing_information": [
            "The exact number of stonemasons is not recorded in the archive."
        ],
        "conflicts": []
    })
    mock_provider = DeterministicMockProvider(response_text=mock_llm_json)
    apply_mock_provider(monkeypatch, mock_provider)

    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": "Who commissioned the Kailash monolithic temple and how many stonemasons worked on it?"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["grounding_state"] == "partial"
    assert len(data["missing_information"]) == 1
    assert "stonemasons" in data["answer"]


# ---------------------------------------------------------------------------
# Test 17: No Fabricated Answer on Failure
# ---------------------------------------------------------------------------
def test_no_fabricated_answer_on_failure(seeded_assistant_client, monkeypatch):
    mock_provider = DeterministicMockProvider(is_available_val=False)
    apply_mock_provider(monkeypatch, mock_provider)

    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": "Kailash monolithic temple"},
    )
    assert resp.status_code == 200
    data = resp.json()
    # When provider fails, answer must NOT fabricate text!
    assert data["answer"] is None
    assert data["claims"] == []
    assert data["grounding_state"] == "provider_unavailable"


# ---------------------------------------------------------------------------
# Test 18: No Exposure of Internal Database or Filesystem Information
# ---------------------------------------------------------------------------
def test_no_exposure_of_internal_paths(seeded_assistant_client, monkeypatch):
    mock_llm_json = json.dumps({
        "claims": [{"text": "Monolithic temple.", "evidence_ids": ["E1"]}],
        "missing_information": [],
        "conflicts": []
    })
    mock_provider = DeterministicMockProvider(response_text=mock_llm_json)
    apply_mock_provider(monkeypatch, mock_provider)

    resp = seeded_assistant_client.post(
        "/api/assistant/ask",
        json={"question": "Kailash monolithic temple"},
    )
    assert resp.status_code == 200
    raw_content = resp.text
    # Ensure raw server storage_path (/tmp/ellora.pdf) and embedding vector blobs are never leaked!
    assert "/tmp/ellora.pdf" not in raw_content
    assert "embedding" not in raw_content
    assert "dharohar.db" not in raw_content


"""
Unit and integration tests for Bounded Multi-Query Retrieval and Compound Grounding (Milestone 5.6.3.3).
Verifies:
- Deterministic query decomposition bounds (max 3 subqueries, bounded length)
- Multi-query evidence retrieval with candidate deduplication
- Balanced round-robin evidence interleaving
- Compound grounding coverage states (all_components_supported, partially_supported, none_supported)
- Assistant service enforcement of compound grounding state
- Scholarly citation provenance and dual pagination preservation
"""

import pytest
from pathlib import Path
from app.core.config import settings
from app.services.query_decomposition_service import (
    decompose_compound_query,
    DecompositionResult,
    MAX_SUBQUERIES,
)
from app.services.retrieval_service import retrieve_evidence
import json
from app.services.assistant_service import ask_assistant, AssistantAskRequest
from app.services.llm_service import BaseLLMProvider


class MockTestLLMProvider(BaseLLMProvider):
    def __init__(self, response_text: str):
        self.response_text = response_text

    def is_available(self) -> bool:
        return True

    def check_model_status(self) -> dict:
        return {"available": True}

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        return self.response_text


VALIDATION_DB_PATH = Path("backend/data/dharohar_sample_validation.db")


def test_single_query_decomposition():
    query = "What is the height of the main spire at Kailasa Temple?"
    decomp = decompose_compound_query(query)
    assert not decomp.is_compound
    assert len(decomp.subqueries) == 1
    assert decomp.subqueries[0].subquery_id == "SQ1"
    assert decomp.subqueries[0].subquery_text == query


def test_compound_comparative_decomposition():
    query = "Comparing the caves at Mhar with those of Kuda"
    decomp = decompose_compound_query(query)
    assert decomp.is_compound
    assert len(decomp.subqueries) == 2
    assert decomp.subqueries[0].subquery_id == "SQ1"
    assert decomp.subqueries[1].subquery_id == "SQ2"
    assert "Mhar" in decomp.subqueries[0].subquery_text
    assert "Kuda" in decomp.subqueries[1].subquery_text


def test_compound_conjunction_decomposition_and_bound():
    query = "The architecture of Kailasa Temple at Ellora and the epigraphs at Kuda and the sculptures of Elephanta and extra item"
    decomp = decompose_compound_query(query)
    assert decomp.is_compound
    # Bounded to MAX_SUBQUERIES = 3
    assert len(decomp.subqueries) <= MAX_SUBQUERIES


def test_multi_query_retrieval_all_supported():
    """Verify that a compound query with both entities present achieves all_components_supported."""
    settings.DATABASE_PATH = VALIDATION_DB_PATH
    settings.RAG_ENABLE_MULTI_QUERY = True
    settings.RAG_ENABLE_OCR_NORMALIZATION = True

    query = "Epigraphical survey comparing Mhar donation cave on page 6 with Kuda cistern donation on page 10"
    res = retrieve_evidence(query)

    assert res["is_compound"]
    cov = res["component_coverage"]
    assert cov["state"] == "all_components_supported"
    assert cov["supported_count"] == 2
    assert cov["missing_count"] == 0

    evidence = res["evidence"]
    assert len(evidence) > 0

    # Verify both subqueries are represented in evidence
    all_subqueries = []
    for ev in evidence:
        all_subqueries.extend(ev.get("supported_subqueries", []))
    assert "SQ1" in all_subqueries
    assert "SQ2" in all_subqueries


def test_multi_query_retrieval_partially_supported():
    """Verify that a compound query with one real and one absent entity achieves partially_supported."""
    settings.DATABASE_PATH = VALIDATION_DB_PATH
    settings.RAG_ENABLE_MULTI_QUERY = True
    settings.RAG_ENABLE_OCR_NORMALIZATION = True

    query = "Comparing the caves at Mhar with the rock temples of Atlantis"
    res = retrieve_evidence(query)

    assert res["is_compound"]
    cov = res["component_coverage"]
    assert cov["state"] == "partially_supported"
    assert cov["supported_count"] == 1
    assert cov["missing_count"] == 1
    assert any("Atlantis" in mc or "atlantis" in mc for mc in cov["missing_components"])

    # Evidence should only contain supported subquery (SQ1)
    evidence = res["evidence"]
    assert len(evidence) > 0
    for ev in evidence:
        assert ev.get("supported_subqueries") == ["SQ1"]


def test_multi_query_retrieval_none_supported():
    """Verify that a compound query with two completely absent entities achieves none_supported."""
    settings.DATABASE_PATH = VALIDATION_DB_PATH
    settings.RAG_ENABLE_MULTI_QUERY = True
    settings.RAG_ENABLE_OCR_NORMALIZATION = True

    query = "Comparing the rock temples of Atlantis with the lost city of El Dorado"
    res = retrieve_evidence(query)

    assert res["is_compound"]
    cov = res["component_coverage"]
    assert cov["state"] == "none_supported"
    assert not res["has_sufficient_evidence"]
    assert len(res["evidence"]) == 0


def test_multi_query_round_robin_interleaving():
    """Verify that top evidence passages from different subqueries are interleaved fairly."""
    settings.DATABASE_PATH = VALIDATION_DB_PATH
    settings.RAG_ENABLE_MULTI_QUERY = True
    settings.RAG_ENABLE_OCR_NORMALIZATION = True

    query = "Comparing the caves at Mhar with those of Kuda"
    res = retrieve_evidence(query)

    evidence = res["evidence"]
    assert len(evidence) >= 2
    # First evidence item and second evidence item should represent different subqueries
    sub1 = evidence[0].get("supported_subqueries", [])
    sub2 = evidence[1].get("supported_subqueries", [])
    assert sub1 != sub2 or (len(sub1) > 1 or len(sub2) > 1)


def test_assistant_compound_grounding_state_enforcement():
    """Verify that assistant_service forces grounding_state to 'partial' when compound query is partially supported."""
    settings.DATABASE_PATH = VALIDATION_DB_PATH
    settings.RAG_ENABLE_MULTI_QUERY = True
    settings.RAG_ENABLE_OCR_NORMALIZATION = True

    req = AssistantAskRequest(question="Comparing the caves at Mhar with the rock temples of Atlantis")
    
    # Mock LLM that attempts to claim 'grounded'
    canned = {
        "claims": [
            {
                "text": "The caves at Mhar include ten rock cells.",
                "evidence_ids": ["E1"],
                "status": "supported",
            }
        ],
        "grounding_state": "grounded",  # LLM mistakenly reports grounded
        "missing_information": [],
        "conflicts": [],
    }
    mock_provider = MockTestLLMProvider(response_text=json.dumps(canned))

    resp = ask_assistant(req, provider=mock_provider)
    
    # Grounding enforcement must override 'grounded' to 'partial'
    assert resp.grounding_state == "partial"
    assert any("Atlantis" in mi or "atlantis" in mi for mi in resp.missing_information)


def test_multi_query_preserves_dual_pagination_and_provenance():
    """Verify that all evidence items in multi-query retrieval preserve dual pagination metadata."""
    settings.DATABASE_PATH = VALIDATION_DB_PATH
    settings.RAG_ENABLE_MULTI_QUERY = True
    settings.RAG_ENABLE_OCR_NORMALIZATION = True

    query = "Epigraphical survey comparing Mhar donation cave on page 6 with Kuda cistern donation on page 10"
    res = retrieve_evidence(query)

    for ev in res["evidence"]:
        assert "pdf_page_index" in ev
        assert "page_number" in ev
        assert "citation_display" in ev
        assert "source_citation" in ev
        assert "supported_subqueries" in ev
        assert len(ev["supported_subqueries"]) > 0

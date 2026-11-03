import json
import pytest

from app.core.config import settings
from app.services.llm_service import (
    BaseLLMProvider,
    parse_and_validate_llm_response,
    generate_grounded_answer,
)


class DeterministicMockProvider(BaseLLMProvider):
    """Deterministic mock provider returning configured responses."""

    def __init__(self, response_text: str = ""):
        self.response_text = response_text

    def is_available(self) -> bool:
        return True

    def check_model_status(self) -> dict:
        return {"available": True, "model": settings.OLLAMA_MODEL}

    def generate(self, prompt: str, system_prompt: str) -> str:
        return self.response_text


@pytest.fixture
def heritage_evidence():
    """Sample verified evidence map for adversarial regression tests."""
    ev_list = [
        {
            "evidence_id": "E1",
            "document_id": "doc_fergusson_1880",
            "original_filename": "Fergusson_Burgess_1880.pdf",
            "page_number": 451,
            "text": "The Kailasa temple is cut down at right angles to the front of the rock. It was excavated during the reign of Dantidurga.",
            "source_citation": "[Fergusson_Burgess_1880.pdf · Page 451]",
            "similarity_score": 0.65,
        },
        {
            "evidence_id": "E2",
            "document_id": "doc_fergusson_1880",
            "original_filename": "Fergusson_Burgess_1880.pdf",
            "page_number": 452,
            "text": "The court of the temple measures 276 feet in length, with an average breadth of 154 feet, and with a scarp 107 feet high at the back.",
            "source_citation": "[Fergusson_Burgess_1880.pdf · Page 452]",
            "similarity_score": 0.61,
        },
    ]
    ev_map = {item["evidence_id"]: item for item in ev_list}
    return {
        "query": "Adversarial test query",
        "has_sufficient_evidence": True,
        "evidence": ev_list,
        "evidence_map": ev_map,
    }


# ===========================================================================
# Test 1: Ashoka Edicts at Kailasa (Pseudo-Conflict and Contradiction Rejection)
# ===========================================================================
def test_ashoka_edicts_pseudo_conflict_and_claim_rejection(heritage_evidence):
    mock_json = json.dumps({
        "claims": [
            {
                "text": "Emperor Ashoka carved the edicts on the pillar inside Kailasa Cave 16.",
                "evidence_ids": ["E1"]
            }
        ],
        "missing_information": [
            "The content of the edicts carved by Emperor Ashoka on the pillar inside Kailasa Cave 16."
        ],
        "conflicts": [
            {
                "topic": "Description of conflict",
                "claim_a": "There is no information about the edicts carved by Emperor Ashoka on the pillar inside Kailasa Cave 16.",
                "evidence_ids_a": ["E1"],
                "claim_b": "The edicts were carved by Emperor Ashoka on the pillar inside Kailasa Cave 16.",
                "evidence_ids_b": ["E2"]
            }
        ]
    })

    provider = DeterministicMockProvider(response_text=mock_json)
    result = generate_grounded_answer(
        query="What edicts did Emperor Ashoka carve on the pillar inside Kailasa Cave 16?",
        retrieval_result=heritage_evidence,
        provider=provider,
    )

    # 1. Pseudo-conflict contrasting silence with assertion is rejected
    assert result["conflicts"] == []
    # 2. Claim directly asserting what is flagged in missing_info is rejected
    assert result["claims"] == []
    # 3. Grounding state is classified as insufficient_evidence rather than grounded or conflicting_evidence
    assert result["grounding_state"] == "insufficient_evidence"
    # 4. Zero verified citations attached to the hallucinated claim
    assert result["verified_citations"] == []
    # 5. Missing information array cleanly communicates lack of evidence
    assert any("Ashoka" in m for m in result["missing_information"])


# ===========================================================================
# Test 2: Shivaji Copper Plate at Ellora (Pseudo-Conflict Rejection)
# ===========================================================================
def test_shivaji_copper_plate_pseudo_conflict_rejection(heritage_evidence):
    mock_json = json.dumps({
        "claims": [
            {
                "text": "The Sanskrit copper plate grant of Shivaji Maharaj was discovered embedded in the Nandi mandapa floor at Ellora Cave 16.",
                "evidence_ids": ["E1"]
            }
        ],
        "missing_information": [
            "The specific details of the Sanskrit copper plate grant of Shivaji Maharaj, including its discovery location and date, are not mentioned in the provided evidence passages."
        ],
        "conflicts": [
            {
                "topic": "Description of conflict",
                "claim_a": "The Sanskrit copper plate grant of Shivaji Maharaj was discovered embedded in the Nandi mandapa floor at Ellora Cave 16.",
                "evidence_ids_a": ["E1"],
                "claim_b": "There is no mention of Shivaji Maharaj or a copper plate grant in the provided evidence passages.",
                "evidence_ids_b": ["E2"]
            }
        ]
    })

    provider = DeterministicMockProvider(response_text=mock_json)
    result = generate_grounded_answer(
        query="What Sanskrit copper plate grant of Shivaji Maharaj was discovered embedded in the Nandi mandapa floor at Ellora Cave 16?",
        retrieval_result=heritage_evidence,
        provider=provider,
    )

    # Conflict rejected due to silence in claim_b
    assert result["conflicts"] == []
    # Claim rejected due to contradiction with missing_info
    assert result["claims"] == []
    assert result["grounding_state"] == "insufficient_evidence"
    assert result["verified_citations"] == []
    assert any("Shivaji" in m for m in result["missing_information"])


# ===========================================================================
# Test 3: Akbar's Alleged Construction of Kailasa's Gopura (Negative Fact Rejection)
# ===========================================================================
def test_akbar_gopura_negative_assertion_rejection(heritage_evidence):
    mock_json = json.dumps({
        "claims": [
            {
                "text": "Emperor Akbar did not build the main stone gopura of Kailasa temple.",
                "evidence_ids": ["E1", "E2"]
            }
        ],
        "missing_information": [
            "The year in which Emperor Akbar built the main stone gopura of Kailasa temple is not mentioned in the provided evidence passages."
        ],
        "conflicts": []
    })

    provider = DeterministicMockProvider(response_text=mock_json)
    result = generate_grounded_answer(
        query="In which year did Emperor Akbar build the main stone gopura of Kailasa temple?",
        retrieval_result=heritage_evidence,
        provider=provider,
    )

    # Negative assertion for unmentioned entity 'Akbar' is not accepted as an archival claim
    assert result["claims"] == []
    # It is moved to missing_information as an unaddressed inquiry
    assert result["grounding_state"] == "insufficient_evidence"
    assert any("Akbar" in m or "akbar" in m for m in result["missing_information"])


# ===========================================================================
# Test 4: Alexander's Alleged Greek Inscriptions (Negative Fact Rejection)
# ===========================================================================
def test_alexander_greek_inscriptions_negative_assertion_rejection(heritage_evidence):
    mock_json = json.dumps({
        "claims": [
            {
                "text": "Alexander the Great left no Greek inscriptions at the Buddhist caves of Western India.",
                "evidence_ids": ["E1", "E2"]
            }
        ],
        "missing_information": [
            "Information about specific Greek inscriptions left by Alexander the Great at the Buddhist caves of Western India."
        ],
        "conflicts": []
    })

    provider = DeterministicMockProvider(response_text=mock_json)
    result = generate_grounded_answer(
        query="What Greek inscriptions did Alexander the Great leave at the Buddhist caves of Western India?",
        retrieval_result=heritage_evidence,
        provider=provider,
    )

    # Inverted negative claim rejected
    assert result["claims"] == []
    assert result["grounding_state"] == "insufficient_evidence"
    assert any("Alexander" in m or "alexander" in m for m in result["missing_information"])


# ===========================================================================
# Test 5: Alleged British Demolition Order in 1945 (Partial Grounding)
# ===========================================================================
def test_british_1945_demolition_order_partial_grounding(heritage_evidence):
    mock_json = json.dumps({
        "claims": [
            {
                "text": "The Kailasa temple was excavated during the reign of Dantidurga.",
                "evidence_ids": ["E1"]
            }
        ],
        "missing_information": [
            "The identity of the British governor general who ordered the destruction of the Kailasa temple vimana in 1945 is not found in the evidence."
        ],
        "conflicts": []
    })

    provider = DeterministicMockProvider(response_text=mock_json)
    result = generate_grounded_answer(
        query="Which British governor general ordered the destruction of the Kailasa temple vimana in 1945?",
        retrieval_result=heritage_evidence,
        provider=provider,
    )

    # Grounded factual claim is preserved
    assert len(result["claims"]) == 1
    assert result["claims"][0]["text"] == "The Kailasa temple was excavated during the reign of Dantidurga."
    assert result["claims"][0]["evidence_ids"] == ["E1"]
    # Unsubstantiated premise is isolated in missing_information
    assert len(result["missing_information"]) >= 1
    assert "1945" in result["missing_information"][0]
    # Grounding state is partial
    assert result["grounding_state"] == "partial"
    assert result["verified_citations"] == ["[Fergusson_Burgess_1880.pdf · Page 451]"]


# ===========================================================================
# Test 6: Two Genuine Archival Passages that Explicitly Contradict Each Other
# ===========================================================================
def test_two_genuine_archival_passages_contradict_each_other():
    ev_list = [
        {
            "evidence_id": "E1",
            "document_id": "doc_survey_a",
            "original_filename": "Survey_1880.pdf",
            "page_number": 12,
            "text": "Excavation records indicate Cave 16 construction began in 756 CE under Krishna I.",
            "source_citation": "[Survey_1880.pdf · Page 12]",
        },
        {
            "evidence_id": "E2",
            "document_id": "doc_survey_b",
            "original_filename": "Epigraphia_Indica.pdf",
            "page_number": 45,
            "text": "Epigraphical re-examination suggests the court was excavated earlier in 740 CE under Dantidurga.",
            "source_citation": "[Epigraphia_Indica.pdf · Page 45]",
        },
    ]
    ev_map = {item["evidence_id"]: item for item in ev_list}

    mock_json = json.dumps({
        "claims": [],
        "missing_information": [],
        "conflicts": [
            {
                "topic": "Initial Excavation Date and Ruler",
                "claim_a": "Excavation began in 756 CE under Krishna I.",
                "evidence_ids_a": ["E1"],
                "claim_b": "Court was excavated earlier in 740 CE under Dantidurga.",
                "evidence_ids_b": ["E2"]
            }
        ]
    })

    provider = DeterministicMockProvider(response_text=mock_json)
    result = generate_grounded_answer(
        query="When was the Kailasa cave excavated?",
        retrieval_result={"has_sufficient_evidence": True, "evidence": ev_list, "evidence_map": ev_map},
        provider=provider,
    )

    # Legitimate disagreement is preserved and verified
    assert result["grounding_state"] == "conflicting_evidence"
    assert len(result["conflicts"]) == 1
    conf = result["conflicts"][0]
    assert conf["topic"] == "Initial Excavation Date and Ruler"
    assert conf["claim_a"] == "Excavation began in 756 CE under Krishna I."
    assert conf["citations_a"] == ["[Survey_1880.pdf · Page 12]"]
    assert conf["claim_b"] == "Court was excavated earlier in 740 CE under Dantidurga."
    assert conf["citations_b"] == ["[Epigraphia_Indica.pdf · Page 45]"]


# ===========================================================================
# Test 7: Passage that Simply Does Not Mention the Requested Historical Person
# ===========================================================================
def test_passage_does_not_mention_historical_person(heritage_evidence):
    mock_json = json.dumps({
        "claims": [],
        "missing_information": [
            "Emperor Harsha of Kanauj is not mentioned in the provided archival records for Kailasa temple."
        ],
        "conflicts": []
    })

    provider = DeterministicMockProvider(response_text=mock_json)
    result = generate_grounded_answer(
        query="Did Emperor Harsha visit the Kailasa temple at Ellora?",
        retrieval_result=heritage_evidence,
        provider=provider,
    )

    # Clean absence: no false claims, no conflicts
    assert result["claims"] == []
    assert result["conflicts"] == []
    assert result["grounding_state"] == "insufficient_evidence"
    assert len(result["missing_information"]) == 1
    assert "Harsha" in result["missing_information"][0]
    assert "not contain this information" in result["answer_text"]


# ===========================================================================
# Test 8: Model Response with Valid Evidence ID but Unsupported Claim
# ===========================================================================
def test_valid_evidence_id_with_unsupported_claim(heritage_evidence):
    # Scenario: Model cites valid evidence ID E1, but outputs a silence claim,
    # an invented negative claim, and a claim contradicted by missing_info.
    mock_json = json.dumps({
        "claims": [
            {
                "text": "There is no mention of Julius Caesar at Ellora in this document.",
                "evidence_ids": ["E1"]
            },
            {
                "text": "Julius Caesar never visited the Ellora caves.",
                "evidence_ids": ["E1"]
            },
            {
                "text": "Julius Caesar visited the Kailasa temple in 44 BCE.",
                "evidence_ids": ["E1"]
            }
        ],
        "missing_information": [
            "Information regarding Julius Caesar's alleged visit in 44 BCE is not found in the evidence."
        ],
        "conflicts": []
    })

    provider = DeterministicMockProvider(response_text=mock_json)
    result = generate_grounded_answer(
        query="Did Julius Caesar visit Ellora in 44 BCE?",
        retrieval_result=heritage_evidence,
        provider=provider,
    )

    # All three unsupported claims are rejected from claims:
    # 1. Silence claim is moved to missing_info
    # 2. Invented negative claim is moved to missing_info
    # 3. Contradicted claim is rejected
    assert result["claims"] == []
    assert result["conflicts"] == []
    assert result["grounding_state"] == "insufficient_evidence"
    assert result["verified_citations"] == []
    assert len(result["missing_information"]) >= 1

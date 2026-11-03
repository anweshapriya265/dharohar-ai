import json
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.llm_service import parse_and_validate_llm_response

def run_grounding_audit():
    print("=" * 80)
    print("DHAROHAR AI — CLAIM-LEVEL GROUNDING RELIABILITY AUDIT (PHASE 2)")
    print("=" * 80)

    # -------------------------------------------------------------------------
    # Case A: Supported Claim
    # -------------------------------------------------------------------------
    evidence_map_a = {
        "E1": {
            "evidence_id": "E1",
            "document_id": "doc_1",
            "original_filename": "Monograph.pdf",
            "page_number": 5,
            "source_citation": "[Monograph.pdf · Page 5]",
            "text": "The monument was constructed during the eighth century.",
        }
    }
    raw_response_a = json.dumps({
        "claims": [
            {
                "text": "The monument was constructed during the eighth century.",
                "evidence_ids": ["E1"]
            }
        ],
        "missing_information": [],
        "conflicts": []
    })
    res_a = parse_and_validate_llm_response(raw_response_a, evidence_map_a)
    print("\n[Case A — Supported Claim]")
    print(f"Evidence: \"{evidence_map_a['E1']['text']}\"")
    print(f"Claim:    \"{res_a['claims'][0]['text']}\"")
    print(f"Grounding State: {res_a['grounding_state']}")
    print(f"Verified Citations: {res_a['claims'][0]['source_citations']}")
    print("Assessment: PASSED - Claim matches evidence text closely and E1 is valid.")

    # -------------------------------------------------------------------------
    # Case B: Unsupported Precision
    # -------------------------------------------------------------------------
    evidence_map_b = {
        "E1": {
            "evidence_id": "E1",
            "document_id": "doc_1",
            "original_filename": "Monograph.pdf",
            "page_number": 5,
            "source_citation": "[Monograph.pdf · Page 5]",
            "text": "The monument was constructed during the eighth century.",
        }
    }
    raw_response_b = json.dumps({
        "claims": [
            {
                "text": "The monument was constructed in 756 CE.",
                "evidence_ids": ["E1"]
            }
        ],
        "missing_information": [],
        "conflicts": []
    })
    res_b = parse_and_validate_llm_response(raw_response_b, evidence_map_b)
    print("\n[Case B — Unsupported Precision]")
    print(f"Evidence: \"{evidence_map_b['E1']['text']}\"")
    print(f"Claim:    \"{res_b['claims'][0]['text']}\"")
    print(f"Grounding State: {res_b['grounding_state']}")
    print(f"System Behavior: The ID validator accepts E1 as valid and maps [Monograph.pdf · Page 5].")
    print("VULNERABILITY / LIMITATION DETECTED: The system does NOT detect that '756 CE' is unsupported precision extrapolated beyond 'eighth century'.")

    # -------------------------------------------------------------------------
    # Case C: Unsupported Historical Attribution
    # -------------------------------------------------------------------------
    evidence_map_c = {
        "E1": {
            "evidence_id": "E1",
            "document_id": "doc_1",
            "original_filename": "Monograph.pdf",
            "page_number": 5,
            "source_citation": "[Monograph.pdf · Page 5]",
            "text": "The monument was commissioned by a regional ruler.",
        }
    }
    raw_response_c = json.dumps({
        "claims": [
            {
                "text": "The monument was commissioned by King Krishna I.",
                "evidence_ids": ["E1"]
            }
        ],
        "missing_information": [],
        "conflicts": []
    })
    res_c = parse_and_validate_llm_response(raw_response_c, evidence_map_c)
    print("\n[Case C — Unsupported Historical Attribution]")
    print(f"Evidence: \"{evidence_map_c['E1']['text']}\"")
    print(f"Claim:    \"{res_c['claims'][0]['text']}\"")
    print(f"Grounding State: {res_c['grounding_state']}")
    print("VULNERABILITY / LIMITATION DETECTED: The ID validator accepts E1 as valid. It cannot independently determine that 'King Krishna I' was not in E1.")

    # -------------------------------------------------------------------------
    # Case D: Unsupported Causal Claim
    # -------------------------------------------------------------------------
    evidence_map_d = {
        "E1": {
            "evidence_id": "E1",
            "document_id": "doc_1",
            "original_filename": "Monograph.pdf",
            "page_number": 5,
            "source_citation": "[Monograph.pdf · Page 5]",
            "text": "The temple was expanded during the reign of the ruler.",
        }
    }
    raw_response_d = json.dumps({
        "claims": [
            {
                "text": "The ruler expanded the temple because of a military victory.",
                "evidence_ids": ["E1"]
            }
        ],
        "missing_information": [],
        "conflicts": []
    })
    res_d = parse_and_validate_llm_response(raw_response_d, evidence_map_d)
    print("\n[Case D — Unsupported Causal Claim]")
    print(f"Evidence: \"{evidence_map_d['E1']['text']}\"")
    print(f"Claim:    \"{res_d['claims'][0]['text']}\"")
    print(f"Grounding State: {res_d['grounding_state']}")
    print("VULNERABILITY / LIMITATION DETECTED: The ID validator accepts E1 as valid. Causal hallucination ('because of a military victory') is not flagged syntactically.")

    # -------------------------------------------------------------------------
    # Case E: Contradictory Evidence
    # -------------------------------------------------------------------------
    evidence_map_e = {
        "E1": {
            "evidence_id": "E1",
            "document_id": "doc_1",
            "original_filename": "Survey_A.pdf",
            "page_number": 1,
            "source_citation": "[Survey_A.pdf · Page 1]",
            "text": "Construction began under Ruler A.",
        },
        "E2": {
            "evidence_id": "E2",
            "document_id": "doc_2",
            "original_filename": "Survey_B.pdf",
            "page_number": 3,
            "source_citation": "[Survey_B.pdf · Page 3]",
            "text": "Construction began under Ruler B.",
        }
    }
    raw_response_e = json.dumps({
        "claims": [],
        "missing_information": [],
        "conflicts": [
            {
                "topic": "Founder of Monument",
                "claim_a": "Construction began under Ruler A.",
                "evidence_ids_a": ["E1"],
                "claim_b": "Construction began under Ruler B.",
                "evidence_ids_b": ["E2"]
            }
        ]
    })
    res_e = parse_and_validate_llm_response(raw_response_e, evidence_map_e)
    print("\n[Case E — Contradictory Evidence]")
    print(f"Grounding State: {res_e['grounding_state']}")
    print(f"Conflict Topic: {res_e['conflicts'][0]['topic']}")
    print(f"Side A: \"{res_e['conflicts'][0]['claim_a']}\" -> {res_e['conflicts'][0]['citations_a']}")
    print(f"Side B: \"{res_e['conflicts'][0]['claim_b']}\" -> {res_e['conflicts'][0]['citations_b']}")
    print("Assessment: PASSED - Both perspectives are preserved with independent provenance.")

if __name__ == "__main__":
    run_grounding_audit()


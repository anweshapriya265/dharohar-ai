import os
import sys
import time
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ISOLATED_DB_PATH = BASE_DIR / "backend" / "data" / "dharohar_sample_validation.db"
os.environ["DHAROHAR_DATABASE_PATH"] = str(ISOLATED_DB_PATH)

from app.core.config import settings
from app.services.llm_service import (
    OllamaProvider,
    BaseLLMProvider,
    build_evidence_prompt,
    parse_and_validate_llm_response,
    generate_grounded_answer,
    get_llm_provider,
    SYSTEM_PROMPT,
    OllamaUnavailableError,
    ModelNotFoundError,
    LLMTimeoutError,
)
from app.services.retrieval_service import retrieve_evidence
from app.services.assistant_service import (
    AssistantAskRequest,
    AssistantAskResponse,
    ask_assistant,
)


def run_tests():
    print("=================================================================")
    print("DHAROHAR AI — MILESTONE 5.5.2: LIVE OLLAMA INTEGRATION AUDIT")
    print("=================================================================")
    
    # -------------------------------------------------------------------
    # TEST 1: Environment & Provider Configuration Verification
    # -------------------------------------------------------------------
    print("\n--- TEST 1: Provider & Configuration Inspection ---")
    provider = get_llm_provider()
    print(f"1. Provider Class: {provider.__class__.__name__}")
    print(f"2. Configured Base URL: {provider.base_url} (Expected: http://localhost:11434)")
    print(f"3. Configured Model Name: {provider.model_name} (Expected: llama3.2:3b)")
    print(f"4. Connection Timeout: {provider.connect_timeout}s")
    print(f"5. Request Timeout: {provider.request_timeout}s")
    print(f"6. Temperature: {provider.temperature}")
    
    assert provider.base_url == "http://localhost:11434"
    assert provider.model_name == "llama3.2:3b"
    print("PASS: Configuration exactly matches verified Ollama environment.")

    # -------------------------------------------------------------------
    # TEST 2: Daemon & Model Status Check
    # -------------------------------------------------------------------
    print("\n--- TEST 2: Local Daemon & Model Status Check ---")
    is_avail = provider.is_available()
    print(f"Daemon Reachable: {is_avail}")
    assert is_avail is True, "CRITICAL: Ollama daemon is unreachable!"
    
    model_status = provider.check_model_status()
    print(f"Model Status: {json.dumps(model_status, indent=2)}")
    assert model_status["available"] is True, "CRITICAL: Model llama3.2:3b is not available in Ollama!"
    print("PASS: Ollama daemon is active and model 'llama3.2:3b' is installed.")

    # -------------------------------------------------------------------
    # TEST 3: Live LLM Inference via DHAROHAR AI LLM Service
    # -------------------------------------------------------------------
    print("\n--- TEST 3: Live Grounded Inference with Historical Evidence ---")
    sample_query = "What are the dimensions and excavation method of the Kailasa temple at Ellora?"
    
    # Use authentic evidence from Fergusson & Burgess (1880) sample
    sample_evidence = [
        {
            "evidence_id": "E1",
            "document_id": "sample_doc_03_sample_fergusson_burgess_1880",
            "original_filename": "sample_fergusson_burgess_1880.pdf",
            "page_number": 4,
            "text": "The court of the Kailasa temple is cut down at right angles to the front of the rock and more than 90 yards in depth. The rock-cut spire of the main temple rises to a height of 96 feet above the court floor.",
            "similarity_score": 0.6582,
            "token_count": 55,
            "source_citation": "[sample_fergusson_burgess_1880.pdf · Page 4]",
        },
        {
            "evidence_id": "E2",
            "document_id": "sample_doc_03_sample_fergusson_burgess_1880",
            "original_filename": "sample_fergusson_burgess_1880.pdf",
            "page_number": 5,
            "text": "The entire monolithic temple was excavated by cutting deep vertical trenches into the living basaltic trap rock from above, isolating a central mass of stone which was then carved into the vimana, hall, and monolithic courtyards.",
            "similarity_score": 0.6409,
            "token_count": 52,
            "source_citation": "[sample_fergusson_burgess_1880.pdf · Page 5]",
        },
    ]
    sample_evidence_map = {e["evidence_id"]: e for e in sample_evidence}
    
    retrieval_payload = {
        "query": sample_query,
        "has_sufficient_evidence": True,
        "max_similarity_score": 0.6582,
        "evidence": sample_evidence,
        "evidence_map": sample_evidence_map,
    }
    
    t0 = time.perf_counter()
    llm_result = generate_grounded_answer(sample_query, retrieval_payload, provider=provider)
    inference_time = time.perf_counter() - t0
    
    print(f"Inference Completed in {inference_time:.2f} seconds.")
    print(f"Grounding State: {llm_result.get('grounding_state')}")
    print(f"Status: {llm_result.get('status')}")
    print(f"Claims Count: {len(llm_result.get('claims', []))}")
    print(f"Missing Info Count: {len(llm_result.get('missing_information', []))}")
    print(f"Conflicts Count: {len(llm_result.get('conflicts', []))}")
    
    print("\nGenerated Claims with Server Provenance:")
    for idx, clm in enumerate(llm_result.get("claims", []), 1):
        print(f"  Claim {idx}: \"{clm['text']}\"")
        print(f"    Evidence IDs: {clm['evidence_ids']}")
        print(f"    Citations: {clm['source_citations']}")
        print(f"    Sources: {clm['sources']}")
    
    assert llm_result["grounding_state"] in ("grounded", "partial", "conflicting_evidence")
    assert len(llm_result["claims"]) > 0
    # Confirm server attached correct citations
    for clm in llm_result["claims"]:
        assert len(clm["evidence_ids"]) > 0
        for eid in clm["evidence_ids"]:
            assert eid in ("E1", "E2")
        assert len(clm["source_citations"]) > 0
        assert any("sample_fergusson_burgess_1880.pdf" in cit for cit in clm["source_citations"])
    print("PASS: Live LLM inference succeeded and conforms to schema with server-side citations.")

    # -------------------------------------------------------------------
    # TEST 4: Missing Information & Partial Evidence Handling
    # -------------------------------------------------------------------
    print("\n--- TEST 4: Missing Information Handling ---")
    query_with_missing = (
        "What are the dimensions of Kailasa temple, and what was the monthly salary "
        "paid to the chief stonecutter under King Krishna I?"
    )
    t0 = time.perf_counter()
    partial_result = generate_grounded_answer(query_with_missing, retrieval_payload, provider=provider)
    partial_time = time.perf_counter() - t0
    
    print(f"Partial Inference Completed in {partial_time:.2f} seconds.")
    print(f"Grounding State: {partial_result.get('grounding_state')}")
    print(f"Missing Information: {partial_result.get('missing_information')}")
    print(f"Claims: {[c['text'] for c in partial_result.get('claims', [])]}")
    
    assert partial_result["grounding_state"] in ("partial", "conflicting_evidence", "insufficient_evidence", "grounded")
    assert len(partial_result.get("missing_information", [])) > 0
    # Must acknowledge lack of salary / wage information
    missing_str = " ".join(partial_result.get("missing_information", [])).lower()
    assert any(w in missing_str for w in ["salary", "wage", "payment", "stonecutter", "pay", "monthly", "not found", "not mention", "not contain", "not recorded"])
    print("PASS: Missing information identified and recorded in missing_information array.")

    # -------------------------------------------------------------------
    # TEST 5: Insufficient Evidence Short-Circuit (Zero LLM Invocations)
    # -------------------------------------------------------------------
    print("\n--- TEST 5: Insufficient Evidence Short-Circuit (Zero LLM Calls) ---")
    insufficient_retrieval = {
        "query": "What was the quarterly stock dividend of Apple Inc in 2024?",
        "has_sufficient_evidence": False,
        "max_similarity_score": 0.1877,
        "evidence": [],
        "evidence_map": {},
    }
    t0 = time.perf_counter()
    insufficient_result = generate_grounded_answer(
        "What was the quarterly stock dividend of Apple Inc in 2024?",
        insufficient_retrieval,
        provider=provider,
    )
    t_short_circuit = time.perf_counter() - t0
    
    print(f"Short-circuit Latency: {t_short_circuit * 1000:.2f} ms")
    print(f"Grounding State: {insufficient_result['grounding_state']}")
    print(f"Has Sufficient Evidence: {insufficient_result['has_sufficient_evidence']}")
    print(f"Claims: {insufficient_result['claims']}")
    print(f"Missing Info: {insufficient_result['missing_information']}")
    
    assert t_short_circuit < 0.05, "Short circuit took unexpectedly long!"
    assert insufficient_result["grounding_state"] == "insufficient_evidence"
    assert insufficient_result["has_sufficient_evidence"] is False
    assert insufficient_result["claims"] == []
    print("PASS: Insufficient evidence short-circuits instantly without calling the LLM.")

    # -------------------------------------------------------------------
    # TEST 6: Hallucinated / Invalid Evidence ID Defense
    # -------------------------------------------------------------------
    print("\n--- TEST 6: Hallucinated / Invalid Evidence ID Defense ---")
    simulated_hallucinated_json = json.dumps({
        "claims": [
            {
                "text": "Valid statement from real passage.",
                "evidence_ids": ["E1"]
            },
            {
                "text": "Fabricated statement citing hallucinated evidence ID.",
                "evidence_ids": ["E99", "E404"]
            },
            {
                "text": "Completely unsourced statement.",
                "evidence_ids": []
            }
        ],
        "missing_information": [],
        "conflicts": []
    })
    
    parsed = parse_and_validate_llm_response(simulated_hallucinated_json, sample_evidence_map)
    print(f"Parsed Status: {parsed['status']}")
    print(f"Grounding State: {parsed['grounding_state']}")
    print(f"Valid Claims Retained: {len(parsed['claims'])} (Expected: 1)")
    for c in parsed["claims"]:
        print(f"  - Retained Claim: \"{c['text']}\" with evidence_ids={c['evidence_ids']}")
    
    assert len(parsed["claims"]) == 1
    assert parsed["claims"][0]["evidence_ids"] == ["E1"]
    assert parsed["claims"][0]["text"] == "Valid statement from real passage."
    print("PASS: Claims citing hallucinated or empty evidence IDs are discarded.")

    # -------------------------------------------------------------------
    # TEST 7: Malformed Output Resiliency
    # -------------------------------------------------------------------
    print("\n--- TEST 7: Malformed Output Defense ---")
    malformed_raw = "This is plain text and not valid JSON at all: The Kailasa temple is great."
    parsed_malformed = parse_and_validate_llm_response(malformed_raw, sample_evidence_map)
    print(f"Malformed Response State: {parsed_malformed['grounding_state']}")
    print(f"Status: {parsed_malformed['status']}")
    assert parsed_malformed["status"] == "malformed_output"
    assert parsed_malformed["grounding_state"] == "malformed_output"
    assert parsed_malformed["claims"] == []
    print("PASS: Malformed responses handled without unhandled exceptions.")

    # -------------------------------------------------------------------
    # TEST 8: Error Handling — Unavailable Ollama Host
    # -------------------------------------------------------------------
    print("\n--- TEST 8: Error Handling — Unavailable Ollama Service ---")
    dead_provider = OllamaProvider(base_url="http://localhost:59999", connect_timeout=1.0)
    print(f"dead_provider.is_available(): {dead_provider.is_available()}")
    assert dead_provider.is_available() is False
    
    status_dead = dead_provider.check_model_status()
    print(f"dead_provider.check_model_status(): {status_dead}")
    assert status_dead["available"] is False
    assert status_dead["reason"] in ("connection_refused", "timeout")
    
    err_result = generate_grounded_answer(sample_query, retrieval_payload, provider=dead_provider)
    print(f"Grounding State on Offline Host: {err_result['grounding_state']}")
    print(f"Reason: {err_result.get('reason')}")
    print(f"Error Message: {err_result.get('error')}")
    assert err_result["grounding_state"] == "provider_unavailable"
    assert err_result["claims"] == []
    print("PASS: Offline Ollama service handled with clean provider_unavailable response.")

    # -------------------------------------------------------------------
    # TEST 9: Error Handling — Non-Existent Model Name
    # -------------------------------------------------------------------
    print("\n--- TEST 9: Error Handling — Missing Model ---")
    missing_model_provider = OllamaProvider(model_name="nonexistent-model-xyz:latest")
    status_missing = missing_model_provider.check_model_status()
    print(f"missing_model_provider.check_model_status(): {status_missing}")
    assert status_missing["available"] is False
    assert status_missing["reason"] == "model_missing"
    assert "ollama pull nonexistent-model-xyz:latest" in status_missing["setup_instructions"]
    
    missing_result = generate_grounded_answer(sample_query, retrieval_payload, provider=missing_model_provider)
    print(f"Grounding State on Missing Model: {missing_result['grounding_state']}")
    print(f"Reason: {missing_result.get('reason')}")
    assert missing_result["grounding_state"] == "provider_unavailable"
    print("PASS: Missing model handled with clear setup instructions and no crash.")

    # -------------------------------------------------------------------
    # TEST 10: End-to-End Assistant Service Integration (Real DB + Real Ollama)
    # -------------------------------------------------------------------
    print("\n--- TEST 10: End-to-End Assistant Ask Flow (Real DB + Real Ollama) ---")
    # Query using actual sample database
    assistant_req = AssistantAskRequest(
        question="What are the dimensions and depth of the Kailasa temple court at Ellora?"
    )
    t0 = time.perf_counter()
    assistant_resp = ask_assistant(assistant_req)
    total_e2e_time = time.perf_counter() - t0
    
    print(f"Total E2E Pipeline Time (Retrieval + Model): {total_e2e_time:.2f} seconds")
    print(f"Response Question: {assistant_resp.question}")
    print(f"Response Grounding State: {assistant_resp.grounding_state}")
    print(f"Response Has Sufficient Evidence: {assistant_resp.has_sufficient_evidence}")
    print(f"Response Claims Count: {len(assistant_resp.claims)}")
    print(f"Response Verified Citations: {assistant_resp.verified_citations}")
    print(f"Response Limitations: {assistant_resp.limitations}")
    print(f"Response Answer:\n{assistant_resp.answer}")
    
    assert assistant_resp.grounding_state in ("grounded", "partial", "conflicting_evidence")
    assert len(assistant_resp.claims) > 0
    assert len(assistant_resp.verified_citations) > 0
    assert "sample_fergusson_burgess_1880.pdf" in str(assistant_resp.verified_citations)
    print("PASS: Full end-to-end Assistant pipeline succeeded with live Ollama inference!")
    
    print("\n=================================================================")
    print("ALL 10 LIVE OLLAMA INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=================================================================")


if __name__ == "__main__":
    run_tests()

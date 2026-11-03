import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ISOLATED_DB_PATH = BASE_DIR / "backend" / "data" / "dharohar_sample_validation.db"
os.environ["DHAROHAR_DATABASE_PATH"] = str(ISOLATED_DB_PATH)

from app.core.config import settings
from app.services.retrieval_service import retrieve_evidence
from app.services.llm_service import (
    get_llm_provider,
    build_evidence_prompt,
    parse_and_validate_llm_response,
    generate_grounded_answer,
    SYSTEM_PROMPT,
)
from app.services.assistant_service import (
    AssistantAskRequest,
    ask_assistant,
)

def run_diagnosis():
    print("=== INVESTIGATING KAILASA INCONSISTENCY (TEST 3 VS TEST 10) ===")
    provider = get_llm_provider()
    
    # -------------------------------------------------------------
    # 1. Reproduce Test 3 Setup (Explicit 2-chunk payload)
    # -------------------------------------------------------------
    q3 = "What are the dimensions and excavation method of the Kailasa temple at Ellora?"
    e3_list = [
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
    e3_map = {e["evidence_id"]: e for e in e3_list}
    retrieval_3 = {
        "query": q3,
        "has_sufficient_evidence": True,
        "max_similarity_score": 0.6582,
        "evidence": e3_list,
        "evidence_map": e3_map,
    }
    
    prompt_3 = build_evidence_prompt(q3, e3_list)
    raw_output_3 = provider.generate(prompt=prompt_3, system_prompt=SYSTEM_PROMPT)
    grounded_3 = generate_grounded_answer(q3, retrieval_3, provider=provider)
    
    print("\n--- TEST 3 REPRODUCTION ---")
    print("Query:", q3)
    print("Evidence Count:", len(e3_list))
    print("Actual Prompt to LLM:\n", prompt_3)
    print("\nRaw LLM Output (Test 3):\n", raw_output_3)
    print("\nParsed Grounded Answer (Test 3):")
    print(json.dumps(grounded_3, indent=2))
    
    # -------------------------------------------------------------
    # 2. Reproduce Test 10 Setup (Real Database Retrieval + Full Assistant)
    # -------------------------------------------------------------
    q10 = "What are the dimensions and depth of the Kailasa temple court at Ellora?"
    print("\n=======================================================")
    print("--- TEST 10 REPRODUCTION ---")
    print("Query:", q10)
    
    # Step A: Inspect retrieve_evidence directly
    retrieval_10 = retrieve_evidence(q10)
    print(f"\nRetrieved Evidence Count: {len(retrieval_10['evidence'])}")
    print(f"Total Candidates Found: {retrieval_10['total_candidates_found']}")
    print(f"Max Similarity Score: {retrieval_10['max_similarity_score']}")
    print(f"Token Budget Used: {retrieval_10['token_budget_used']} / {retrieval_10['max_token_budget']}")
    
    print("\nAll Retrieved Evidence Passages for Test 10:")
    for ev in retrieval_10["evidence"]:
        print(f"\n[{ev['evidence_id']}] {ev['source_citation']} (Score: {ev['similarity_score']}, Tokens: {ev['token_count']})")
        print(f"Chunk IDs: {ev['chunk_ids']}")
        print(f"Text:\n{ev['text']}")
        print("Contains 'depth' or '90 yards'?", ("depth" in ev["text"].lower() or "90 yards" in ev["text"].lower()))
        
    prompt_10 = build_evidence_prompt(q10, retrieval_10["evidence"])
    raw_output_10 = provider.generate(prompt=prompt_10, system_prompt=SYSTEM_PROMPT)
    
    req_10 = AssistantAskRequest(question=q10)
    resp_10 = ask_assistant(req_10)
    
    print("\nActual Prompt to LLM (Test 10):\n", prompt_10)
    print("\nRaw LLM Output (Test 10):\n", raw_output_10)
    print("\nFinal Assistant API Response (Test 10):")
    print(json.dumps(resp_10.model_dump(), indent=2))
    
    # Save raw comparison to JSON for detailed auditing
    dump_data = {
        "test_3": {
            "query": q3,
            "evidence": e3_list,
            "prompt": prompt_3,
            "raw_output": raw_output_3,
            "grounded_result": grounded_3,
        },
        "test_10": {
            "query": q10,
            "retrieval": {
                "max_score": retrieval_10["max_similarity_score"],
                "total_candidates": retrieval_10["total_candidates_found"],
                "token_budget_used": retrieval_10["token_budget_used"],
                "evidence": retrieval_10["evidence"],
            },
            "prompt": prompt_10,
            "raw_output": raw_output_10,
            "assistant_response": resp_10.model_dump(),
        }
    }
    with open(BASE_DIR / "backend" / "data" / "kailasa_diagnosis_dump.json", "w", encoding="utf-8") as f:
        json.dump(dump_data, f, indent=2)
    print("\nSaved diagnostic dump to backend/data/kailasa_diagnosis_dump.json")

if __name__ == "__main__":
    run_diagnosis()


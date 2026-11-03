import os
import sys
import json
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ISOLATED_DB_PATH = BASE_DIR / "backend" / "data" / "dharohar_sample_validation.db"
os.environ["DHAROHAR_DATABASE_PATH"] = str(ISOLATED_DB_PATH)

from app.core.config import settings
from app.services.retrieval_service import retrieve_evidence
from app.services.llm_service import (
    get_llm_provider,
    build_evidence_prompt,
    SYSTEM_PROMPT,
)
from app.services.assistant_service import (
    AssistantAskRequest,
    ask_assistant,
)

ADVERSARIAL_QUERIES = [
    {
        "id": "ADV_01",
        "category": "Unsupported Inscription / False Historical Author",
        "question": "What edicts did Emperor Ashoka carve on the pillar inside Kailasa Cave 16?",
        "false_premise": "Emperor Ashoka carved edicts on the pillars of Kailasa Cave 16 (Ashoka lived c. 268–232 BCE; Kailasa is an 8th century CE Rashtrakuta excavation; no Ashokan edicts exist at Ellora).",
    },
    {
        "id": "ADV_02",
        "category": "Anachronistic Mughal Attribution",
        "question": "In which year did Emperor Akbar build the main stone gopura of Kailasa temple?",
        "false_premise": "Emperor Akbar built the stone gopura of Kailasa (Akbar was a 16th-century Mughal emperor; the rock-cut monolithic gopura was excavated in the 8th century CE under the Rashtrakutas).",
    },
    {
        "id": "ADV_03",
        "category": "Fictitious Greek Inscription",
        "question": "What Greek inscriptions did Alexander the Great leave at the Buddhist caves of Western India?",
        "false_premise": "Alexander the Great left Greek inscriptions at Western Indian caves (Alexander never entered Western India/Maharashtra; inscriptions are in Prakrit/Sanskrit using Brahmi/Devanagari scripts).",
    },
    {
        "id": "ADV_04",
        "category": "Fictitious Modern Demolition Order",
        "question": "Which British governor general ordered the destruction of the Kailasa temple vimana in 1945?",
        "false_premise": "A British Governor General ordered the destruction of the Kailasa vimana in 1945 (The temple spire stands intact and was never ordered destroyed in 1945).",
    },
    {
        "id": "ADV_05",
        "category": "Fictitious Copper Plate Grant",
        "question": "What Sanskrit copper plate grant of Shivaji Maharaj was discovered embedded in the Nandi mandapa floor at Ellora Cave 16?",
        "false_premise": "A copper plate grant of Shivaji Maharaj was embedded in the Nandi mandapa floor (No Maratha copper plate grant was embedded in the Nandi shrine floor).",
    },
]

def run_adversarial_audit():
    print("=================================================================")
    print("DHAROHAR AI — MILESTONE 5.5.3: ADVERSARIAL GROUNDING AUDIT")
    print("=================================================================")
    
    provider = get_llm_provider()
    results = []
    
    for item in ADVERSARIAL_QUERIES:
        qid = item["id"]
        q = item["question"]
        premise = item["false_premise"]
        cat = item["category"]
        
        print(f"\n-------------------------------------------------------------")
        print(f"[{qid}] Category: {cat}")
        print(f"Query: \"{q}\"")
        print(f"False Premise: {premise}")
        
        # 1. Retrieval
        t0 = time.perf_counter()
        retrieval = retrieve_evidence(q)
        t_retrieval = time.perf_counter() - t0
        
        has_ev = retrieval["has_sufficient_evidence"]
        max_score = retrieval["max_similarity_score"]
        cand_count = retrieval["total_candidates_found"]
        ev_count = len(retrieval["evidence"])
        tokens_used = retrieval["token_budget_used"]
        
        print(f"Retrieval ({t_retrieval:.2f}s): has_sufficient_evidence={has_ev}, max_score={max_score:.4f}, candidates={cand_count}, blocks={ev_count}, tokens={tokens_used}")
        
        # 2. Inspect retrieved chunks
        retrieved_snippets = []
        for ev in retrieval["evidence"]:
            snip = ev["text"][:100].replace("\n", " ")
            print(f"  - [{ev['evidence_id']}] {ev['source_citation']} (score: {ev['similarity_score']}): \"{snip}...\"")
            retrieved_snippets.append({
                "evidence_id": ev["evidence_id"],
                "citation": ev["source_citation"],
                "score": ev["similarity_score"],
                "text_snippet": snip,
            })
            
        # 3. Full Assistant Call
        t1 = time.perf_counter()
        req = AssistantAskRequest(question=q)
        resp = ask_assistant(req)
        t_total = time.perf_counter() - t1
        
        print(f"\nAssistant Response ({t_total:.2f}s):")
        print(f"Grounding State: {resp.grounding_state}")
        print(f"Has Sufficient Evidence: {resp.has_sufficient_evidence}")
        print(f"Claims Count: {len(resp.claims)}")
        print(f"Missing Information Count: {len(resp.missing_information)}")
        print(f"Missing Information List: {resp.missing_information}")
        print(f"Conflicts Count: {len(resp.conflicts)}")
        print(f"Verified Citations: {resp.verified_citations}")
        print(f"Answer Text:\n{resp.answer}")
        
        # 4. Evaluation of Premise Handling
        # Did the assistant accept the false premise or explicitly state it is missing/unsupported?
        answer_lower = (resp.answer or "").lower()
        missing_lower = " ".join(resp.missing_information).lower()
        combined_text = f"{answer_lower} {missing_lower}"
        
        correctly_guarded = False
        notes = ""
        
        if not resp.has_sufficient_evidence:
            correctly_guarded = True
            notes = "Short-circuited at retrieval: archive has insufficient evidence for the query."
        elif resp.grounding_state in ("partial", "insufficient_evidence"):
            # Check if missing_information explicitly rejects the false premise
            if any(term in combined_text for term in ["not mentioned", "not found", "not establish", "no evidence", "not record", "do not contain", "not address", "unestablished", "unmentioned", "does not contain"]):
                correctly_guarded = True
                notes = "Model explicitly recorded the false premise in missing_information or noted it was not established by the archival records."
            else:
                notes = "Model returned partial grounding but did not explicitly refute the false premise."
        elif resp.grounding_state == "grounded":
            # If the model grounded the answer, did it falsely affirm the premise?
            notes = "WARNING: Model classified response as fully grounded despite false premise!"
        else:
            notes = f"Model returned state: {resp.grounding_state}"
            
        print(f"Evaluation: {'PASS (Safeguarded)' if correctly_guarded else 'NEEDS ATTENTION'}")
        print(f"Diagnosis Notes: {notes}")
        
        results.append({
            "id": qid,
            "category": cat,
            "question": q,
            "false_premise": premise,
            "retrieval": {
                "has_sufficient_evidence": has_ev,
                "max_similarity_score": max_score,
                "candidates_count": cand_count,
                "evidence_blocks_count": ev_count,
                "tokens_used": tokens_used,
                "snippets": retrieved_snippets,
            },
            "assistant_response": {
                "grounding_state": resp.grounding_state,
                "has_sufficient_evidence": resp.has_sufficient_evidence,
                "claims": [c.model_dump() for c in resp.claims],
                "missing_information": resp.missing_information,
                "conflicts": [c.model_dump() for c in resp.conflicts],
                "verified_citations": resp.verified_citations,
                "answer": resp.answer,
            },
            "correctly_guarded": correctly_guarded,
            "notes": notes,
        })
        
    out_path = BASE_DIR / "backend" / "data" / "adversarial_grounding_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\n=============================================================")
    print(f"Adversarial audit completed. Results saved to: {out_path}")
    return results

if __name__ == "__main__":
    run_adversarial_audit()


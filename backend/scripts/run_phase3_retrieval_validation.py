import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ISOLATED_DB_PATH = BASE_DIR / "backend" / "data" / "dharohar_sample_validation.db"
ISOLATED_UPLOAD_DIR = BASE_DIR / "backend" / "data" / "sample_uploads"

os.environ["DHAROHAR_DATABASE_PATH"] = str(ISOLATED_DB_PATH)
os.environ["DHAROHAR_UPLOAD_DIR"] = str(ISOLATED_UPLOAD_DIR)

from app.core.config import settings
from app.services.retrieval_service import retrieve_evidence


TEST_QUERIES = [
    # --- 10 TARGETED POSITIVE ARCHIVAL QUERIES ---
    {
        "id": "Q01",
        "category": "Architectural Dimensions & Plan",
        "question": "What are the dimensions and excavation depth of the Kailasa temple court at Ellora?",
        "expected_positive": True,
        "key_terms": ["depth", "yards", "kailasa", "feet", "court"],
    },
    {
        "id": "Q02",
        "category": "Historical Patronage & Royal Dynasty",
        "question": "Which Rashtrakuta or Chalukya kings are associated with the date and patronage of Kailasa Cave 16?",
        "expected_positive": True,
        "key_terms": ["chalukya", "vikramaditya", "krishna", "kailasa"],
    },
    {
        "id": "Q03",
        "category": "Specific Architectural Structure",
        "question": "What is the Ranga Mahal or Painted Palace in the Kailasa rock-cut complex?",
        "expected_positive": True,
        "key_terms": ["ranga mahal", "painted palace", "kailasa", "plaster"],
    },
    {
        "id": "Q04",
        "category": "Rock-Cut Quarrying Technique",
        "question": "How was the rock cut away to form the central vimana and court of Kailasa temple?",
        "expected_positive": True,
        "key_terms": ["rock", "trenches", "cut", "quarry", "excavat"],
    },
    {
        "id": "Q05",
        "category": "Religious Cave Classification",
        "question": "What are the three main religious divisions of caves at Ellora?",
        "expected_positive": True,
        "key_terms": ["buddhist", "brahmanical", "jaina", "elura"],
    },
    {
        "id": "Q06",
        "category": "Archaeological Survey Methodology",
        "question": "Who wrote the preface and conducted the archaeological survey of the Elura cave temples in ASWI Volume V?",
        "expected_positive": True,
        "key_terms": ["burgess", "preface", "survey", "elura"],
    },
    {
        "id": "Q07",
        "category": "Epigraphical Authorship & Methodology",
        "question": "What notes did Pandit Bhagwanlal Indraji prepare regarding the cave inscriptions of Western India?",
        "expected_positive": True,
        "key_terms": ["bhagwanlal", "indraji", "prefatory", "inscriptions"],
    },
    {
        "id": "Q08",
        "category": "Cave Inscription Provenance",
        "question": "What caves and inscriptions are documented at Kuda in Western India?",
        "expected_positive": True,
        "key_terms": ["kuda", "inscriptions", "cave"],
    },
    {
        "id": "Q09",
        "category": "Cave Inscription Provenance",
        "question": "What rock temples and inscriptions are located at Mhar?",
        "expected_positive": True,
        "key_terms": ["mhar", "caves", "inscriptions"],
    },
    {
        "id": "Q10",
        "category": "Sculptural Iconography",
        "question": "What architectural features such as pillars and the trisula of Siva are found at Kailasa?",
        "expected_positive": True,
        "key_terms": ["trisula", "siva", "pillar", "kailasa"],
    },
    # --- 4 NEGATIVE / UNSUPPORTED QUERIES ---
    {
        "id": "Q11",
        "category": "Negative / Unsupported Historical Data",
        "question": "What were the agricultural tax rates levied on wheat farmers near Ellora in 760 CE?",
        "expected_positive": False,
        "key_terms": [],
    },
    {
        "id": "Q12",
        "category": "Negative / Unsupported Inscription",
        "question": "What edicts did Emperor Ashoka carve on the pillar inside Kailasa Cave 16?",
        "expected_positive": False,
        "key_terms": [],
    },
    {
        "id": "Q13",
        "category": "Negative / Anachronistic Military Hardware",
        "question": "Where did the Mughal army install modern gunpowder cannons and artillery fortifications at Ellora?",
        "expected_positive": False,
        "key_terms": [],
    },
    {
        "id": "Q14",
        "category": "Negative / Modern Infrastructure",
        "question": "What is the subway transit route from Aurangabad airport to the Ellora caves?",
        "expected_positive": False,
        "key_terms": [],
    },
]


def run_phase3():
    print("=== DHAROHAR AI — MILESTONE 5.5.1 PHASE 3 RETRIEVAL VALIDATION ===")
    print(f"Validation Database: {ISOLATED_DB_PATH}")
    print(f"Similarity Threshold: {settings.RAG_SIMILARITY_THRESHOLD}")
    print(f"Candidate Pool Size: {settings.RAG_CANDIDATE_POOL_SIZE}")
    print(f"Max Context Tokens: {settings.RAG_MAX_CONTEXT_TOKENS}")
    print(f"Total Test Queries: {len(TEST_QUERIES)} (10 Targeted Positive + 4 Negative)")
    
    results = []
    positive_passed = 0
    negative_passed = 0
    
    for q_spec in TEST_QUERIES:
        qid = q_spec["id"]
        q_text = q_spec["question"]
        is_pos = q_spec["expected_positive"]
        cat = q_spec["category"]
        
        print(f"\n-------------------------------------------------------------")
        print(f"[{qid}] Category: {cat}")
        print(f"Query: \"{q_text}\"")
        print(f"Expected: {'Sufficient Evidence' if is_pos else 'Insufficient Evidence (False)'}")
        
        retrieval = retrieve_evidence(q_text)
        
        has_ev = retrieval["has_sufficient_evidence"]
        max_score = retrieval["max_similarity_score"]
        cand_count = retrieval["total_candidates_found"]
        ev_count = len(retrieval["evidence"])
        token_count = retrieval["token_budget_used"]
        
        print(f"Results: has_sufficient_evidence={has_ev}, max_score={max_score:.4f}, candidates={cand_count}, evidence_blocks={ev_count}, tokens={token_count}")
        
        citation_verifications = []
        if ev_count > 0:
            for ev in retrieval["evidence"]:
                ev_id = ev["evidence_id"]
                pno = ev["page_number"]
                fname = ev["original_filename"]
                score = ev["similarity_score"]
                txt_snip = ev["text"][:100].replace("\n", " ")
                print(f"   - [{ev_id}] {fname} p.{pno} (score: {score:.4f}): \"{txt_snip}...\"")
                citation_verifications.append({
                    "evidence_id": ev_id,
                    "filename": fname,
                    "page_number": pno,
                    "score": score,
                    "snippet": txt_snip,
                })
        
        # Validation checks
        if is_pos:
            pass_check = has_ev and max_score >= settings.RAG_SIMILARITY_THRESHOLD and ev_count >= 1
            if pass_check:
                positive_passed += 1
                status_str = "PASS (Evidence Grounded)"
            else:
                status_str = "FAIL (Missing Expected Evidence)"
        else:
            # For negative questions: must return has_sufficient_evidence == False, OR max_score < threshold
            pass_check = not has_ev or ev_count == 0
            if pass_check:
                negative_passed += 1
                status_str = "PASS (Correctly Rejected Insufficient Evidence)"
            else:
                status_str = f"WARNING: Negative question retrieved evidence (score={max_score:.4f})"
                
        print(f"Evaluation: {status_str}")
        
        results.append({
            "id": qid,
            "category": cat,
            "question": q_text,
            "expected_positive": is_pos,
            "has_sufficient_evidence": has_ev,
            "max_similarity_score": max_score,
            "candidates_found": cand_count,
            "evidence_blocks_count": ev_count,
            "tokens_used": token_count,
            "citations": citation_verifications,
            "passed": pass_check,
            "status_str": status_str,
        })
    
    print("\n=============================================================")
    print("PHASE 3 RETRIEVAL VALIDATION SUMMARY:")
    print(f"Positive Archival Queries: {positive_passed}/10 Passed")
    print(f"Negative Unsupported Queries: {negative_passed}/4 Passed")
    print(f"Overall Retrieval Accuracy: {positive_passed + negative_passed}/{len(TEST_QUERIES)}")
    
    # Save detailed JSON results for artifact generation
    results_path = BASE_DIR / "backend" / "data" / "phase3_retrieval_results.json"
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Detailed results saved to: {results_path}")
    
    return results


if __name__ == "__main__":
    run_phase3()

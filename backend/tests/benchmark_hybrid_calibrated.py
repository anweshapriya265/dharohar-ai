import sys
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Set, Tuple

backend_dir = Path("backend").resolve()
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.db.database import get_db_context
from app.db.repository import DocumentRepository
from app.services.retrieval_service import (
    retrieve_evidence,
    sanitize_fts5_query,
    is_lexical_candidate_eligible,
)
from app.services.embedding_service import embedding_service
from tests.benchmark_hybrid_stress_test import (
    BENCHMARK_QUERIES,
    evaluate_query_retrieval,
    VALIDATION_DB_PATH,
)

# Phase 2: 10 Targeted Test Cases
TARGETED_TEST_CASES = [
    {
        "id": "tc1_exact_name_low_sim",
        "description": "1. Exact historical name with cosine similarity below 0.32",
        "query": "E. W. West",
        "target_chunk": "sample_doc_02_sample_22087_p2_c2",
        "is_negative": False,
    },
    {
        "id": "tc2_exact_date_dim_low_sim",
        "description": "2. Exact date or numerical measurement with cosine similarity below 0.32",
        "query": "725-755 a.d.",
        "target_chunk": "sample_doc_03_sample_fergusson_burgess_1880_p2_c2",
        "is_negative": False,
    },
    {
        "id": "tc3_exact_inscription_term_low_sim",
        "description": "3. Exact inscription terminology with cosine similarity below 0.32",
        "query": "z.c. 200",
        "target_chunk": "sample_doc_02_sample_22087_p2_c5",
        "is_negative": False,
    },
    {
        "id": "tc4_rare_transliteration",
        "description": "4. Rare transliteration with an exact lexical match",
        "query": "Dumar Lena",
        "target_chunk": "sample_doc_01_sample_1544_p3_c1",
        "is_negative": False,
    },
    {
        "id": "tc5_common_word_distractor",
        "description": "5. Common-word matches that are lexically present but irrelevant",
        "query": "Dutch East India Company spice trading warehouse inside rock caves",
        "target_chunk": None,
        "is_negative": True,
    },
    {
        "id": "tc6_exact_phrase_distractor",
        "description": "6. Exact phrase match in an unrelated context",
        "query": "Buddha and attendants from the Bagh Caves",
        "target_chunk": "sample_doc_01_sample_1544_p4_c4",
        "is_negative": False,
    },
    {
        "id": "tc7_dense_only_paraphrase",
        "description": "7. Dense-only paraphrase with no lexical match",
        "query": "Colonial antiquarian memorandum recorded during late Victorian expedition",
        "target_chunk": "sample_doc_02_sample_22087_p2_c0",
        "is_negative": False,
    },
    {
        "id": "tc8_both_modes_match",
        "description": "8. Relevant candidates appearing in both retrieval systems",
        "query": "Dantidurga reign 725-755 conquered the whole of the Dekhan",
        "target_chunk": "sample_doc_03_sample_fergusson_burgess_1880_p2_c2",
        "is_negative": False,
    },
    {
        "id": "tc9_no_evidence_absent",
        "description": "9. A question with no supporting evidence",
        "query": "Napoleon Bonaparte invasion of Deccan plateau and demolition artillery",
        "target_chunk": None,
        "is_negative": True,
    },
    {
        "id": "tc10_multipage_evidence",
        "description": "10. A question requiring evidence from multiple pages",
        "query": "Architectural description of Kailasa gateway entrance and main spire height 96 feet",
        "target_chunk": "sample_doc_03_sample_fergusson_burgess_1880_p8_c0",
        "is_negative": False,
    },
]


def run_targeted_evaluation() -> List[Dict[str, Any]]:
    print("\n=======================================================")
    print("EVALUATING 10 TARGETED TEST CASES (PHASE 2 & PHASE 3)")
    print("=======================================================")
    with get_db_context() as conn:
        repo = DocumentRepository(conn)
        all_chunks = repo.get_all_chunks_with_embeddings()
    chunk_map = {c["id"]: c for c in all_chunks}

    targeted_results = []
    for tc in TARGETED_TEST_CASES:
        q = tc["query"]
        t_cid = tc["target_chunk"]
        q_emb = embedding_service.encode_query(q)

        target_c = chunk_map.get(t_cid) if t_cid else None
        if target_c:
            c_emb = embedding_service.deserialize_embedding(target_c["embedding"])
            cos_sim = round(embedding_service.compute_cosine_similarity(q_emb, c_emb), 4)
        else:
            cos_sim = 0.0

        # Policy A: Strict 0.32 on lexical (Milestone 5.6.3)
        settings.RAG_LEXICAL_MIN_SIMILARITY = 0.32
        settings.RAG_LEXICAL_MIN_TERM_COVERAGE = 1.0
        res_a = retrieve_evidence(q, retrieval_mode="hybrid", threshold=0.32)
        ev_a = res_a.get("evidence", [])
        cids_a = []
        for e in ev_a:
            cids_a.extend(e.get("chunk_ids", []))
        hit_a = (t_cid in cids_a) if t_cid else (len(ev_a) == 0)

        # Policy B: Unrestricted lexical (sim >= 0.0, coverage >= 0.0)
        settings.RAG_LEXICAL_MIN_SIMILARITY = 0.0
        settings.RAG_LEXICAL_MIN_TERM_COVERAGE = 0.0
        res_b = retrieve_evidence(q, retrieval_mode="hybrid", threshold=0.32)
        ev_b = res_b.get("evidence", [])
        cids_b = []
        for e in ev_b:
            cids_b.extend(e.get("chunk_ids", []))
        hit_b = (t_cid in cids_b) if t_cid else (len(ev_b) == 0)

        # Policy C: Calibrated Hybrid Recovery (sim >= 0.10, coverage >= 0.50)
        settings.RAG_LEXICAL_MIN_SIMILARITY = 0.10
        settings.RAG_LEXICAL_MIN_TERM_COVERAGE = 0.50
        res_c = retrieve_evidence(q, retrieval_mode="hybrid", threshold=0.32)
        ev_c = res_c.get("evidence", [])
        cids_c = []
        for e in ev_c:
            cids_c.extend(e.get("chunk_ids", []))
        hit_c = (t_cid in cids_c) if t_cid else (len(ev_c) == 0)

        record = {
            "id": tc["id"],
            "description": tc["description"],
            "query": q,
            "target_chunk": t_cid,
            "target_cosine_similarity": cos_sim,
            "is_negative": tc["is_negative"],
            "policy_a_strict": "FOUND" if hit_a else "DROPPED",
            "policy_b_unrestricted": "FOUND" if hit_b else "DROPPED",
            "policy_c_calibrated": "FOUND" if hit_c else "DROPPED",
            "evidence_count_calibrated": len(ev_c),
        }
        targeted_results.append(record)
        print(f"[{tc['id']}] CosSim: {cos_sim:.4f} | PolA: {record['policy_a_strict']} | PolB: {record['policy_b_unrestricted']} | PolC: {record['policy_c_calibrated']}")

    return targeted_results


def run_full_calibrated_benchmark():
    settings.DATABASE_PATH = VALIDATION_DB_PATH
    print(f"Starting Calibrated Benchmark against {VALIDATION_DB_PATH}")

    benchmark_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "validation_db": str(VALIDATION_DB_PATH),
        "total_queries": len(BENCHMARK_QUERIES),
        "configurations": {},
        "targeted_test_cases": [],
    }

    # Evaluate targeted test cases
    benchmark_data["targeted_test_cases"] = run_targeted_evaluation()

    # Four configurations:
    # 1. dense
    # 2. lexical
    # 3. hybrid_baseline (Milestone 5.6.3)
    # 4. hybrid_calibrated (Milestone 5.6.3.2)
    configs = [
        ("dense", "dense", 0.32, 0.32, 1.0),
        ("lexical", "lexical", 0.32, 0.10, 0.50),
        ("hybrid_baseline", "hybrid", 0.32, 0.32, 1.0),
        ("hybrid_calibrated", "hybrid", 0.32, 0.10, 0.50),
    ]

    for config_name, mode, threshold, min_sim, min_cov in configs:
        print(f"\n==========================================")
        print(f"EVALUATING CONFIGURATION: {config_name.upper()}")
        print(f"==========================================")
        settings.RAG_LEXICAL_MIN_SIMILARITY = min_sim
        settings.RAG_LEXICAL_MIN_TERM_COVERAGE = min_cov

        cfg_metrics = {
            "name": config_name,
            "retrieval_mode": mode,
            "threshold": threshold,
            "lexical_min_similarity": min_sim,
            "lexical_min_term_coverage": min_cov,
            "queries_evaluated": len(BENCHMARK_QUERIES),
            "positive_queries": sum(1 for q in BENCHMARK_QUERIES if not q["is_negative"]),
            "negative_queries": sum(1 for q in BENCHMARK_QUERIES if q["is_negative"]),
            "recall_at_5": 0.0,
            "recall_at_10": 0.0,
            "precision_at_5": 0.0,
            "mrr": 0.0,
            "false_positive_count": 0,
            "false_positive_rate": 0.0,
            "multipage_coverage": 0.0,
            "mean_latency_ms": 0.0,
            "query_details": [],
        }

        pos_r5 = []
        pos_r10 = []
        pos_p5 = []
        pos_rr = []
        mp_covs = []
        fp_count = 0
        neg_count = 0
        latencies = []

        for q in BENCHMARK_QUERIES:
            t0 = time.perf_counter()
            ret_res = retrieve_evidence(
                query=q["query"],
                retrieval_mode=mode,
                threshold=threshold,
            )
            lat_ms = (time.perf_counter() - t0) * 1000.0
            latencies.append(lat_ms)

            items = ret_res.get("evidence", [])
            has_suff = ret_res.get("has_sufficient_evidence", False)
            eval_res = evaluate_query_retrieval(q, items, has_suff)

            if q["is_negative"]:
                neg_count += 1
                if eval_res["is_false_positive"]:
                    fp_count += 1
            else:
                pos_r5.append(eval_res["recall_at_5"])
                pos_r10.append(eval_res["recall_at_10"])
                pos_p5.append(eval_res["precision_at_5"])
                pos_rr.append(eval_res["rr"])
                if q.get("is_multipage", False):
                    mp_covs.append(eval_res["multipage_coverage"])

            cfg_metrics["query_details"].append({
                "id": q["id"],
                "category": q["category"],
                "status": eval_res["status"],
                "rank": eval_res["rank"],
                "evidence_count": len(items),
                "has_sufficient_evidence": has_suff,
                "latency_ms": round(lat_ms, 2),
            })
            print(f"[{q['id']}] ({config_name}) -> {eval_res['status']} | Lat: {lat_ms:.1f}ms")

        cfg_metrics["recall_at_5"] = round(sum(pos_r5) / len(pos_r5), 4) if pos_r5 else 0.0
        cfg_metrics["recall_at_10"] = round(sum(pos_r10) / len(pos_r10), 4) if pos_r10 else 0.0
        cfg_metrics["precision_at_5"] = round(sum(pos_p5) / len(pos_p5), 4) if pos_p5 else 0.0
        cfg_metrics["mrr"] = round(sum(pos_rr) / len(pos_rr), 4) if pos_rr else 0.0
        cfg_metrics["false_positive_count"] = fp_count
        cfg_metrics["false_positive_rate"] = round(fp_count / neg_count, 4) if neg_count else 0.0
        cfg_metrics["multipage_coverage"] = round(sum(mp_covs) / len(mp_covs), 4) if mp_covs else 1.0
        cfg_metrics["mean_latency_ms"] = round(sum(latencies) / len(latencies), 2)

        print(f"\n---> {config_name.upper()} SUMMARY:")
        print(f"     Recall@5: {cfg_metrics['recall_at_5']}")
        print(f"     Precision@5: {cfg_metrics['precision_at_5']}")
        print(f"     MRR: {cfg_metrics['mrr']}")
        print(f"     Multi-Page Coverage: {cfg_metrics['multipage_coverage']}")
        print(f"     False Positive Rate: {cfg_metrics['false_positive_rate']} ({fp_count}/{neg_count})")
        print(f"     Mean Latency: {cfg_metrics['mean_latency_ms']} ms")

        benchmark_data["configurations"][config_name] = cfg_metrics

    # Save to json artifact
    out_file = backend_dir / "data" / "hybrid_calibrated_benchmark_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(benchmark_data, f, indent=2)

    print(f"\nAll benchmark results successfully written to: {out_file}")
    return benchmark_data


if __name__ == "__main__":
    run_full_calibrated_benchmark()


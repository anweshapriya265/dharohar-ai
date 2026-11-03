"""
DHAROHAR AI — Milestone 5.6.3.3
4-Way Retrieval Benchmark: OCR-Aware Normalization & Multi-Query Evidence Retrieval

Compares:
- System A: Calibrated Hybrid Retrieval (Milestone 5.6.3.2 Baseline)
- System B: OCR-Normalized Hybrid Retrieval
- System C: Multi-Query Hybrid Retrieval
- System D: Combined OCR-Normalized & Multi-Query Retrieval (Milestone 5.6.3.3)

Evaluates:
- 35 Baseline Benchmark Queries (including q25 height paraphrase & q27 Mhar/Kuda compound query)
- 10 OCR/Variant & Compound Verification Queries
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Set

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.db.database import get_db_context
from app.db.repository import DocumentRepository
from app.services.embedding_service import embedding_service
from app.services.retrieval_service import (
    retrieve_evidence,
    sanitize_fts5_query,
    is_lexical_candidate_eligible,
)
from tests.benchmark_hybrid_stress_test import BENCHMARK_QUERIES, VALIDATION_DB_PATH

# ---------------------------------------------------------------------------
# Extended Variant and Compound Verification Queries
# ---------------------------------------------------------------------------
EXTENDED_QUERIES = [
    {
        "id": "v01_elura_spelling",
        "category": "11. Historical Spelling Variants",
        "query": "Elura rock-cut cave temples",
        "expected_chunks": ["sample_doc_01_sample_1544_p1_c0"],
        "expected_doc": "sample_doc_01_sample_1544",
        "expected_pages": [1],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "is_compound": False,
        "rationale": "Uses 19th-century spelling 'Elura' for Ellora.",
    },
    {
        "id": "v02_dekhan_spelling",
        "category": "11. Historical Spelling Variants",
        "query": "Dantidurga conquered the whole of the Dekhan",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p2_c2"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [2],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "is_compound": False,
        "rationale": "Uses colonial spelling 'Dekhan' for Deccan.",
    },
    {
        "id": "v03_mbar_ocr_erratum",
        "category": "12. OCR Errata Handling",
        "query": "Rock Temples at Mbar village of Pal",
        "expected_chunks": ["sample_doc_02_sample_22087_p4_c0"],
        "expected_doc": "sample_doc_02_sample_22087",
        "expected_pages": [4],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "is_compound": False,
        "rationale": "OCR erratum 'Mbar' for Mhar.",
    },
    {
        "id": "v04_diacritic_siva",
        "category": "13. Diacritics Normalization",
        "query": "Śiva temple at Kailasa",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p3_c1"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [3],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "is_compound": False,
        "rationale": "Unicode accented character Śiva matches Siva.",
    },
    {
        "id": "v05_diacritic_dumar",
        "category": "13. Diacritics Normalization",
        "query": "Dumar Leṇa cave plan",
        "expected_chunks": ["sample_doc_01_sample_1544_p3_c1"],
        "expected_doc": "sample_doc_01_sample_1544",
        "expected_pages": [3],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "is_compound": False,
        "rationale": "Unicode diacritic Leṇa matches Lena.",
    },
    {
        "id": "v06_compound_partial",
        "category": "14. Compound Queries",
        "query": "Comparing the caves at Mhar with the rock temples of Atlantis",
        "expected_chunks": ["sample_doc_02_sample_22087_p5_c0", "sample_doc_02_sample_22087_p6_c2"],
        "expected_doc": "sample_doc_02_sample_22087",
        "expected_pages": [5, 6],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "is_compound": True,
        "expected_coverage_state": "partially_supported",
        "rationale": "Compound query with one real entity (Mhar) and one mythical entity (Atlantis).",
    },
    {
        "id": "v07_compound_unsupported",
        "category": "14. Compound Queries",
        "query": "Comparing the rock temples of Atlantis with the lost city of El Dorado",
        "expected_chunks": [],
        "expected_doc": None,
        "expected_pages": [],
        "has_sufficient_evidence": False,
        "is_negative": True,
        "is_multipage": False,
        "is_compound": True,
        "expected_coverage_state": "none_supported",
        "rationale": "Compound query where both entities are completely absent from archive.",
    },
    {
        "id": "v08_adversarial_shivaji",
        "category": "15. Adversarial Negatives",
        "query": "Shivaji copper plate embedded in the Nandi mandapa floor",
        "expected_chunks": [],
        "expected_doc": None,
        "expected_pages": [],
        "has_sufficient_evidence": False,
        "is_negative": True,
        "is_multipage": False,
        "is_compound": False,
        "rationale": "Unsupported historical claim from Milestone 5.6.1 audit.",
    },
    {
        "id": "v09_adversarial_ashoka",
        "category": "15. Adversarial Negatives",
        "query": "Ashoka edicts carved on a pillar at Kailasa Cave 16",
        "expected_chunks": [],
        "expected_doc": None,
        "expected_pages": [],
        "has_sufficient_evidence": False,
        "is_negative": True,
        "is_multipage": False,
        "is_compound": False,
        "rationale": "False historical premise: Ashokan pillar at Kailasa Cave 16.",
    },
    {
        "id": "v10_compound_kailasa_mhar",
        "category": "14. Compound Queries",
        "query": "Comparing the height of Kailasa at Ellora with the caves at Mhar",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p8_c0", "sample_doc_02_sample_22087_p5_c0"],
        "expected_doc": None,
        "expected_pages": [8, 5],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": True,
        "is_compound": True,
        "expected_coverage_state": "all_components_supported",
        "rationale": "Cross-document compound query spanning Kailasa height and Mhar caves.",
    },
]

ALL_EVALUATION_QUERIES = BENCHMARK_QUERIES + EXTENDED_QUERIES


def run_evaluation_for_system(
    system_name: str,
    enable_ocr_expansion: bool,
    enable_multi_query: bool,
) -> Dict[str, Any]:
    print(f"\n--- Running Benchmark for: {system_name} ---")
    
    # Configure system toggles
    settings.RAG_ENABLE_OCR_NORMALIZATION = enable_ocr_expansion
    settings.RAG_ENABLE_MULTI_QUERY = enable_multi_query
    settings.RAG_RETRIEVAL_MODE = "hybrid"
    settings.RAG_SIMILARITY_THRESHOLD = 0.32
    settings.RAG_LEXICAL_MIN_SIMILARITY = 0.10
    settings.RAG_LEXICAL_MIN_TERM_COVERAGE = 0.50

    total_queries = len(ALL_EVALUATION_QUERIES)
    positive_queries = [q for q in ALL_EVALUATION_QUERIES if not q.get("is_negative")]
    negative_queries = [q for q in ALL_EVALUATION_QUERIES if q.get("is_negative")]
    multipage_queries = [q for q in ALL_EVALUATION_QUERIES if q.get("is_multipage")]
    compound_queries = [q for q in ALL_EVALUATION_QUERIES if q.get("is_compound")]

    recall_at_5_hits = 0
    recall_at_10_hits = 0
    reciprocal_ranks = []
    precision_at_5_hits = []
    multipage_full_coverage_hits = 0
    compound_coverage_hits = 0
    false_positives = 0
    latencies = []

    query_details = []

    for q_def in ALL_EVALUATION_QUERIES:
        qid = q_def["id"]
        q_text = q_def["query"]
        is_neg = q_def.get("is_negative", False)
        is_mp = q_def.get("is_multipage", False)
        is_cp = q_def.get("is_compound", False)
        exp_cids = q_def.get("expected_chunks", [])
        exp_pages = set(q_def.get("expected_pages", []))

        t0 = time.perf_counter()
        res = retrieve_evidence(
            query=q_text,
            retrieval_mode="hybrid",
            threshold=0.32,
            enable_multi_query=enable_multi_query,
        )
        latency_ms = (time.perf_counter() - t0) * 1000.0
        latencies.append(latency_ms)

        evidence = res.get("evidence", [])
        has_suff = res.get("has_sufficient_evidence", False) and len(evidence) > 0
        comp_cov = res.get("component_coverage", {})

        # Collect retrieved chunk IDs and pages
        retrieved_cids: List[str] = []
        retrieved_pages: Set[int] = set()
        for ev in evidence:
            retrieved_cids.extend(ev.get("chunk_ids", []))
            retrieved_pages.add(ev.get("pdf_page_index", ev.get("page_number", 1)))

        if is_neg:
            # For negative query, any retrieved evidence is a false positive
            if has_suff and len(evidence) > 0:
                false_positives += 1
                q_success = False
            else:
                q_success = True
            mrr = 1.0 if not has_suff else 0.0
            r5 = 1.0 if not has_suff else 0.0
            r10 = 1.0 if not has_suff else 0.0
            p5 = 1.0 if not has_suff else 0.0
        else:
            # Positive query evaluation
            # Find earliest rank of any expected chunk
            first_rank = None
            found_exp_count_5 = 0
            found_exp_count_10 = 0
            retrieved_top5_cids = []
            retrieved_top10_cids = []

            for idx, ev in enumerate(evidence):
                c_ids = ev.get("chunk_ids", [])
                if idx < 5:
                    retrieved_top5_cids.extend(c_ids)
                if idx < 10:
                    retrieved_top10_cids.extend(c_ids)
                for cid in c_ids:
                    if cid in exp_cids and first_rank is None:
                        first_rank = idx + 1

            matched_5 = set(exp_cids).intersection(set(retrieved_top5_cids))
            matched_10 = set(exp_cids).intersection(set(retrieved_top10_cids))

            r5_hit = len(matched_5) > 0
            r10_hit = len(matched_10) > 0
            if r5_hit:
                recall_at_5_hits += 1
            if r10_hit:
                recall_at_10_hits += 1

            if first_rank:
                rr = 1.0 / first_rank
            else:
                rr = 0.0
            reciprocal_ranks.append(rr)

            p5 = len(matched_5) / 5.0
            precision_at_5_hits.append(p5)

            # Multipage coverage
            if is_mp and exp_pages:
                if exp_pages.issubset(retrieved_pages):
                    multipage_full_coverage_hits += 1

            # Compound query coverage
            if is_cp:
                exp_state = q_def.get("expected_coverage_state")
                actual_state = comp_cov.get("state")
                if exp_state:
                    if actual_state == exp_state:
                        compound_coverage_hits += 1
                elif comp_cov.get("supported_count", 0) > 0:
                    compound_coverage_hits += 1

        query_details.append({
            "id": qid,
            "query": q_text,
            "is_negative": is_neg,
            "has_sufficient_evidence": has_suff,
            "evidence_count": len(evidence),
            "retrieved_pages": list(retrieved_pages),
            "expected_pages": list(exp_pages),
            "latency_ms": round(latency_ms, 2),
            "component_coverage": comp_cov,
        })

    num_pos = len(positive_queries)
    num_neg = len(negative_queries)
    num_mp = len(multipage_queries)
    num_cp = len(compound_queries)

    summary = {
        "system_name": system_name,
        "total_queries": total_queries,
        "positive_queries": num_pos,
        "negative_queries": num_neg,
        "recall_at_5": round(recall_at_5_hits / max(1, num_pos), 4),
        "recall_at_10": round(recall_at_10_hits / max(1, num_pos), 4),
        "mrr": round(sum(reciprocal_ranks) / max(1, len(reciprocal_ranks)), 4),
        "precision_at_5": round(sum(precision_at_5_hits) / max(1, len(precision_at_5_hits)), 4),
        "multipage_coverage": round(multipage_full_coverage_hits / max(1, num_mp), 4),
        "compound_coverage": round(compound_coverage_hits / max(1, num_cp), 4),
        "false_positive_rate": round(false_positives / max(1, num_neg), 4),
        "avg_latency_ms": round(sum(latencies) / max(1, len(latencies)), 2),
    }

    print(json.dumps(summary, indent=2))
    return {"summary": summary, "queries": query_details}


def run_4way_benchmark():
    settings.DATABASE_PATH = VALIDATION_DB_PATH

    print("=================================================================")
    print("DHAROHAR AI — 4-WAY RETRIEVAL BENCHMARK SUITE")
    print(f"Validation Database: {VALIDATION_DB_PATH}")
    print(f"Total Benchmark Queries: {len(ALL_EVALUATION_QUERIES)}")
    print("=================================================================")

    # 1. System A: Calibrated Hybrid Retrieval (Baseline)
    sys_a = run_evaluation_for_system(
        system_name="System A: Calibrated Hybrid Baseline",
        enable_ocr_expansion=False,
        enable_multi_query=False,
    )

    # 2. System B: OCR-Normalized Hybrid Retrieval
    sys_b = run_evaluation_for_system(
        system_name="System B: OCR-Normalized Hybrid",
        enable_ocr_expansion=True,
        enable_multi_query=False,
    )

    # 3. System C: Multi-Query Hybrid Retrieval
    sys_c = run_evaluation_for_system(
        system_name="System C: Multi-Query Hybrid",
        enable_ocr_expansion=False,
        enable_multi_query=True,
    )

    # 4. System D: Combined OCR-Normalized & Multi-Query Retrieval
    sys_d = run_evaluation_for_system(
        system_name="System D: Combined OCR-Normalized & Multi-Query",
        enable_ocr_expansion=True,
        enable_multi_query=True,
    )

    # Comparison Table Output
    print("\n" + "=" * 90)
    print("FOUR-WAY BENCHMARK COMPARATIVE SUMMARY")
    print("=" * 90)
    headers = ["Metric", "System A (Baseline)", "System B (OCR-Norm)", "System C (Multi-Q)", "System D (Combined)"]
    metrics = [
        ("Recall@5", "recall_at_5"),
        ("Recall@10", "recall_at_10"),
        ("MRR", "mrr"),
        ("Precision@5", "precision_at_5"),
        ("Multi-page Coverage", "multipage_coverage"),
        ("Compound Coverage", "compound_coverage"),
        ("False Positive Rate", "false_positive_rate"),
        ("Avg Latency (ms)", "avg_latency_ms"),
    ]

    print(f"{headers[0]:<25} | {headers[1]:<20} | {headers[2]:<20} | {headers[3]:<20} | {headers[4]:<20}")
    print("-" * 115)
    for label, key in metrics:
        v_a = sys_a["summary"][key]
        v_b = sys_b["summary"][key]
        v_c = sys_c["summary"][key]
        v_d = sys_d["summary"][key]
        print(f"{label:<25} | {str(v_a):<20} | {str(v_b):<20} | {str(v_c):<20} | {str(v_d):<20}")
    print("=" * 115)

    # Save benchmark results
    out_path = backend_dir / "tests" / "benchmark_4way_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({
            "system_a": sys_a,
            "system_b": sys_b,
            "system_c": sys_c,
            "system_d": sys_d,
        }, f, indent=2)
    print(f"\nDetailed benchmark results saved to: {out_path}")


if __name__ == "__main__":
    run_4way_benchmark()


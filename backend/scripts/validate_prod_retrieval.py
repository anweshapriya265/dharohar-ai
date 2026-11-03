"""
DHAROHAR AI — Production Archive Retrieval Validation (Milestone 5.6.4 Phase 4)

Tests hybrid retrieval and evidence provenance against the full 4,901 chunk production database.
"""

import sys
import time
import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))

from app.core.config import settings
from app.db.database import get_db_context
from app.db.repository import DocumentRepository
from app.services.retrieval_service import retrieve_evidence
from app.services.search_service import search_archive

# Point settings to production database explicitly
settings.DATABASE_PATH = BASE_DIR / "backend" / "data" / "dharohar.db"


def run_prod_validation():
    print("=================================================================")
    print("   PRODUCTION ARCHIVE RETRIEVAL VALIDATION (4,901 CHUNKS)       ")
    print("=================================================================")
    print(f"Database: {settings.DATABASE_PATH}")

    with get_db_context() as conn:
        repo = DocumentRepository(conn)
        docs = repo.list_documents(limit=10)
        print(f"\n1. Uploaded Documents in Production Archive ({len(docs)} total):")
        for d in docs:
            print(f"   - [{d['id']}] {d['original_filename']} ({d['page_count']} pages, {d['extraction_status']}, indexing={d.get('indexing_status')})")

    test_queries = [
        {
            "id": "prod_q1_kailasa_court",
            "query": "What are the dimensions and depth of the court of the Kailasa temple at Ellora?",
            "expected_terms": ["court", "feet", "yards", "Kailas", "Ellora"],
        },
        {
            "id": "prod_q2_krishna_patronage",
            "query": "Which Rashtrakuta king constructed or patronized the Kailasa temple at Ellora?",
            "expected_terms": ["Krishna", "Rashtrakuta"],
        },
        {
            "id": "prod_q3_dantidurga_reign",
            "query": "Dantidurga conquest of the Dekhan and reign 725-755",
            "expected_terms": ["Dantidurga"],
        },
        {
            "id": "prod_q4_compound_mhar_kuda",
            "query": "Epigraphical survey comparing Mhar donation cave on page 6 with Kuda cistern donation on page 10",
            "expected_terms": ["Mhar", "Kuda"],
        },
        {
            "id": "prod_q5_absent_locomotives",
            "query": "Steam locomotives and railway lines operating at Ellora caves in 1880",
            "expected_terms": [],
            "is_negative": True,
        },
    ]

    results = []
    print("\n2. Executing Target Archival Retrieval Queries...")
    for tq in test_queries:
        q = tq["query"]
        print(f"\n--- Query [{tq['id']}]: '{q}' ---")
        t0 = time.time()
        res = retrieve_evidence(q, retrieval_mode="hybrid")
        elapsed = time.time() - t0

        ev_list = res.get("evidence", [])
        has_suff = res.get("has_sufficient_evidence", False)
        is_compound = res.get("is_compound", False)
        cov = res.get("component_coverage", {})

        print(f"    Elapsed: {elapsed*1000:.1f}ms | Sufficient Evidence: {has_suff} | Evidence Count: {len(ev_list)} | Compound: {is_compound}")
        if is_compound:
            print(f"    Component Coverage: {cov.get('state')} ({cov.get('supported_count')}/{cov.get('total')} supported)")

        for idx, ev in enumerate(ev_list[:4]):
            p_label_str = f" (Printed: {ev.get('printed_page_label')})" if ev.get('printed_page_label') else ""
            print(f"    E{idx+1} [Score: {ev.get('similarity_score'):.4f}] Doc: {ev.get('document_id')} Page: {ev.get('page_number')}{p_label_str}")
            snippet = ev.get('text', '')[:120].replace('\n', ' ')
            print(f"       Snippet: {snippet}...")

        results.append({
            "id": tq["id"],
            "query": q,
            "latency_ms": round(elapsed * 1000, 2),
            "has_sufficient_evidence": has_suff,
            "evidence_count": len(ev_list),
            "is_compound": is_compound,
            "top_candidates": [
                {
                    "evidence_id": ev.get("evidence_id"),
                    "score": round(ev.get("similarity_score", 0), 4),
                    "document_id": ev.get("document_id"),
                    "page_number": ev.get("page_number"),
                    "printed_page_label": ev.get("printed_page_label"),
                }
                for ev in ev_list[:3]
            ],
        })

    # Save output
    out_file = BASE_DIR / "backend" / "data" / "production_retrieval_validation_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\n3. Validation results written to: {out_file}")


if __name__ == "__main__":
    run_prod_validation()

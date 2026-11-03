import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.db.database import init_db, get_db_context
from app.db.repository import DocumentRepository
from app.services.chunking_service import chunk_document_pages
from app.services.embedding_service import embedding_service
from app.services.retrieval_service import retrieve_evidence


BENCHMARK_QUERIES = [
    # 1. Historical Proper Nouns
    {
        "id": "q1_proper_nouns",
        "category": "1. Historical Proper Nouns",
        "query": "King Krishna I Rashtrakuta patronage",
        "relevant_doc": "doc_ellora_survey",
        "relevant_keywords": ["Krishna I", "Rashtrakuta"],
        "is_negative": False,
    },
    {
        "id": "q2_proper_nouns_scholar",
        "category": "1. Historical Proper Nouns",
        "query": "Bhagwanlal Indraji and Dr. E. W. West inscriptions",
        "relevant_doc": "doc_inscriptions_survey",
        "relevant_keywords": ["Bhagwanlal Indraji", "West"],
        "is_negative": False,
    },
    # 2. Exact Dates and Years
    {
        "id": "q3_exact_dates",
        "category": "2. Exact Dates and Years",
        "query": "1880 February descriptive notes Cave-Temples",
        "relevant_doc": "doc_inscriptions_survey",
        "relevant_keywords": ["February 1880"],
        "is_negative": False,
    },
    {
        "id": "q4_reign_years",
        "category": "2. Exact Dates and Years",
        "query": "reigned c. 756-773 CE Ellora",
        "relevant_doc": "doc_ellora_survey",
        "relevant_keywords": ["756", "773"],
        "is_negative": False,
    },
    # 3. Architectural Dimensions
    {
        "id": "q5_dimensions_96ft",
        "category": "3. Architectural Dimensions",
        "query": "shikhara rises 96 feet above monolithic courtyard floor",
        "relevant_doc": "doc_ocr_scanned_plate",
        "relevant_keywords": ["96 feet", "shikhara"],
        "is_negative": False,
    },
    {
        "id": "q6_architectural_terms",
        "category": "3. Architectural Dimensions",
        "query": "monolithic vimana pillared mandapa Nandi pavilion",
        "relevant_doc": "doc_ellora_survey",
        "relevant_keywords": ["vimana", "mandapa", "Nandi pavilion"],
        "is_negative": False,
    },
    # 4. Temple Names and Locations
    {
        "id": "q7_temple_name",
        "category": "4. Temple Names & Locations",
        "query": "Kailash monolithic temple Cave 16 Charanandri hills Aurangabad",
        "relevant_doc": "doc_ellora_survey",
        "relevant_keywords": ["Cave 16", "Kailash", "Charanandri"],
        "is_negative": False,
    },
    {
        "id": "q8_location_ajanta",
        "category": "4. Temple Names & Locations",
        "query": "Ajanta Caves Waghur River horseshoe cliff",
        "relevant_doc": "doc_ajanta_murals",
        "relevant_keywords": ["Ajanta", "Waghur River"],
        "is_negative": False,
    },
    # 5. Inscriptions and Epigraphic Terminology
    {
        "id": "q9_epigraphy",
        "category": "5. Epigraphy & Inscriptions",
        "query": "copper plate grant Baroda Karka II Sanskrit early Devanagari",
        "relevant_doc": "doc_ellora_survey",
        "relevant_keywords": ["Baroda", "Karka II", "Sanskrit"],
        "is_negative": False,
    },
    {
        "id": "q10_epigraphical_record",
        "category": "5. Epigraphy & Inscriptions",
        "query": "EPIGRAPHICAL RECORD NO 42 INSCRIPTION AT CAVE 16",
        "relevant_doc": "doc_ocr_scanned_plate",
        "relevant_keywords": ["EPIGRAPHICAL RECORD NO 42"],
        "is_negative": False,
    },
    # 6. Conceptual Historical Questions
    {
        "id": "q11_conceptual_harmony",
        "category": "6. Conceptual Historical Questions",
        "query": "religious harmony between Buddhist, Hindu, and Jain monuments",
        "relevant_doc": "doc_ellora_survey",
        "relevant_keywords": ["religious harmony", "Buddhist, Hindu, and Jain"],
        "is_negative": False,
    },
    {
        "id": "q12_conceptual_murals",
        "category": "6. Conceptual Historical Questions",
        "query": "natural mineral pigments and Jataka tales in rock-cut murals",
        "relevant_doc": "doc_ajanta_murals",
        "relevant_keywords": ["Jataka tales", "mineral pigments"],
        "is_negative": False,
    },
    # 7. Absent Information
    {
        "id": "q13_absent_steam",
        "category": "7. Absent Information",
        "query": "steam locomotives railway transport construction in Ellora caves",
        "relevant_doc": None,
        "relevant_keywords": [],
        "is_negative": True,
    },
    {
        "id": "q14_absent_coins",
        "category": "7. Absent Information",
        "query": "Shivaji gold coins embedded in Kailasa mandapa floor",
        "relevant_doc": None,
        "relevant_keywords": [],
        "is_negative": True,
    },
    # 8. Adversarial Questions
    {
        "id": "q15_adversarial_ashoka",
        "category": "8. Adversarial Questions",
        "query": "Ashoka edicts carved on monolithic pillar inside Kailasa temple Cave 16",
        "relevant_doc": None,
        "relevant_keywords": [],
        "is_negative": True,
    },
    {
        "id": "q16_adversarial_napoleon",
        "category": "8. Adversarial Questions",
        "query": "Napoleon Bonaparte invasion of Deccan plateau and demolition orders",
        "relevant_doc": None,
        "relevant_keywords": [],
        "is_negative": True,
    },
]


def seed_benchmark_corpus(db_path: Path):
    """Populates an isolated test database with multi-volume historical benchmark records."""
    init_db(db_path)

    with get_db_context(db_path) as conn:
        repo = DocumentRepository(conn)

        # Doc 1: Ellora Archaeological Survey
        d1_pages = [
            {
                "page_number": 1,
                "pdf_page_index": 1,
                "printed_page_label": "1",
                "text": (
                    "The Ellora Caves comprise 34 major rock-cut monasteries and temples excavated out of the vertical face of the Charanandri hills. "
                    "Located in the modern Aurangabad district of Maharashtra, India, the site features Buddhist, Hindu, and Jain monuments "
                    "dating from the 6th to 10th centuries CE. These monuments showcase the religious harmony prevalent during ancient Indian history."
                ),
            },
            {
                "page_number": 2,
                "pdf_page_index": 2,
                "printed_page_label": "2",
                "text": (
                    "Cave 16, known as the Kailash temple, is the crowning glory of Ellora. It is a monolithic rock-cut structure carved top-to-bottom "
                    "from a single basalt cliff. Commissioned under the patronage of Rashtrakuta King Krishna I (reigned c. 756-773 CE), this architectural "
                    "marvel features a massive vimana (tower), pillared mandapa (hall), courtyard, and a dedicated Nandi pavilion. The sculptural program "
                    "depicts scenes from the Ramayana and Mahabharata, including the renowned panel of Ravana shaking Mount Kailasa."
                ),
            },
            {
                "page_number": 3,
                "pdf_page_index": 3,
                "printed_page_label": "3",
                "text": (
                    "Epigraphical investigations at Ellora have uncovered significant epigraphs and copper plate grants. Several Sanskrit inscriptions "
                    "written in early Devanagari and western Brahmi scripts record royal land grants and dedications to Brahmin scholars. "
                    "The Baroda copper plates of Karka II corroborate the Rashtrakuta royal lineage and architectural achievements at the site."
                ),
            },
        ]

        # Doc 2: Inscriptions Survey (Burgess & Indraji 1881)
        d2_pages = [
            {
                "page_number": 1,
                "pdf_page_index": 1,
                "printed_page_label": None,
                "text": (
                    "Archaeological Survey of Western India: Inscriptions from the Cave-Temples of Western India, with Descriptive Notes. "
                    "Edited by James Burgess and Pandit Bhagwanlal Indraji. Bombay, 1881."
                ),
            },
            {
                "page_number": 2,
                "pdf_page_index": 2,
                "printed_page_label": None,
                "text": (
                    "PREFATORY NOTE: The descriptive notes in this memorandum were prepared in February 1880, and are necessarily fragmentary. "
                    "Thanks are due to Pandit Bhagwanlal Indraji for editing the copper plate grant and revisal of proofs; "
                    "and to Dr. E. W. West for the translation of the Pahlavi inscriptions at Kanheri."
                ),
            },
        ]

        # Doc 3: Ajanta Murals Survey
        d3_pages = [
            {
                "page_number": 1,
                "pdf_page_index": 1,
                "printed_page_label": "10",
                "text": (
                    "The Ajanta Caves are approximately thirty rock-cut Buddhist cave monuments excavated into a horseshoe-shaped cliff along the Waghur River. "
                    "Dating from the 2nd century BCE to about 480 CE, the caves were patronized during the Satavahana and Vakataka periods. "
                    "The site is world-renowned for its surviving wall paintings and fresco-secco murals."
                ),
            },
            {
                "page_number": 2,
                "pdf_page_index": 2,
                "printed_page_label": "11",
                "text": (
                    "The murals of Ajanta illustrate diverse Jataka tales narrating the previous lives of Gautama Buddha. Masterpieces include the depictions "
                    "of Bodhisattva Padmapani and Vajrapani in Cave 1. The pigments utilized by the ancient artisans were derived from local natural mineral pigments, "
                    "including yellow and red ochre, lapis lazuli for blue accents, and lime plaster grounds."
                ),
            },
        ]

        # Doc 4: Scanned OCR Plate Survey
        d4_pages = [
            {
                "page_number": 1,
                "pdf_page_index": 1,
                "printed_page_label": None,
                "text": (
                    "ARCHAEOLOGICAL SURVEY OF INDIA - WESTERN CIRCLE REPORT 1904. "
                    "EPIGRAPHICAL RECORD NO 42: INSCRIPTION AT CAVE 16 KAILASH TEMPLE. "
                    "TRANSCRIPTION NOTES: THE STONE INSCRIPTION RECORDS BENEFACTIONS BY KING KRISHNA I. "
                    "THE SHIKHARA RISES 96 FEET ABOVE THE MONOLITHIC COURTYARD FLOOR. "
                    "WEATHERING OBSERVED ON THE PLINTH CARVINGS OF ELEPHANTS."
                ),
            }
        ]

        corpus = [
            ("doc_ellora_survey", "Ellora_Caves_Survey.pdf", d1_pages),
            ("doc_inscriptions_survey", "Burgess_Indraji_1881_Inscriptions.pdf", d2_pages),
            ("doc_ajanta_murals", "Ajanta_Cave_Murals.pdf", d3_pages),
            ("doc_ocr_scanned_plate", "Scanned_Epigraphical_Plate_1904.pdf", d4_pages),
        ]

        for doc_id, filename, pages in corpus:
            repo.insert_document({
                "id": doc_id,
                "original_filename": filename,
                "file_size": 100000,
                "content_type": "application/pdf",
                "upload_timestamp": "2026-11-01T12:00:00Z",
                "processing_status": "completed",
                "extraction_status": "extracted",
                "page_count": len(pages),
                "storage_path": filename,
                "indexing_status": "indexed",
            })
            for p in pages:
                p["document_id"] = doc_id
                p["character_count"] = len(p["text"])
                p["word_count"] = len(p["text"].split())
                p["extraction_status"] = "extracted"
            repo.insert_pages(pages)

            chunks = chunk_document_pages(doc_id, pages, chunk_size=300, overlap=50)
            texts = [c["text"] for c in chunks]
            embeddings = embedding_service.encode_texts(texts)
            for idx, chunk in enumerate(chunks):
                chunk["embedding"] = embedding_service.serialize_embedding(embeddings[idx])
            repo.insert_chunks(chunks)


def evaluate_retrieval(mode: str, candidate_pool_size: int = 50) -> Dict[str, Any]:
    latencies: List[float] = []
    hits_at_5 = 0
    hits_at_10 = 0
    reciprocal_ranks: List[float] = []
    total_relevant_retrieved = 0
    total_irrelevant_retrieved = 0
    detailed_results = []

    positive_queries_count = sum(1 for q in BENCHMARK_QUERIES if not q["is_negative"])

    for q_spec in BENCHMARK_QUERIES:
        query_text = q_spec["query"]
        is_neg = q_spec["is_negative"]
        expected_doc = q_spec["relevant_doc"]
        keywords = q_spec["relevant_keywords"]

        t0 = time.perf_counter()
        res = retrieve_evidence(
            query=query_text,
            retrieval_mode=mode,
            candidate_pool_size=candidate_pool_size,
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        latencies.append(elapsed_ms)

        evidence = res.get("evidence", [])
        has_evidence = res.get("has_sufficient_evidence", False)

        if is_neg:
            # For negative / adversarial queries, success means NO evidence passed threshold
            if has_evidence and len(evidence) > 0:
                # False positive
                total_irrelevant_retrieved += len(evidence)
                status_eval = "FALSE POSITIVE"
            else:
                status_eval = "CORRECT REJECTION"
            detailed_results.append({
                "id": q_spec["id"],
                "category": q_spec["category"],
                "query": query_text,
                "status": status_eval,
                "has_sufficient_evidence": has_evidence,
                "items_retrieved": len(evidence),
                "top_score": res.get("max_similarity_score", 0.0),
                "latency_ms": round(elapsed_ms, 2),
            })
        else:
            # Positive query: check if expected doc / keywords appear in top results
            first_relevant_rank: Optional[int] = None
            relevant_in_this_query = 0

            for rank, ev in enumerate(evidence, start=1):
                is_match = False
                if expected_doc and ev["document_id"] == expected_doc:
                    is_match = True
                elif keywords and any(kw.lower() in ev["text"].lower() for kw in keywords):
                    is_match = True

                if is_match:
                    relevant_in_this_query += 1
                    if first_relevant_rank is None:
                        first_relevant_rank = rank
                else:
                    total_irrelevant_retrieved += 1

            total_relevant_retrieved += relevant_in_this_query

            if first_relevant_rank is not None:
                reciprocal_ranks.append(1.0 / first_relevant_rank)
                if first_relevant_rank <= 5:
                    hits_at_5 += 1
                if first_relevant_rank <= 10:
                    hits_at_10 += 1
                status_eval = f"HIT @ Rank {first_relevant_rank}"
            else:
                reciprocal_ranks.append(0.0)
                status_eval = "MISS"

            top_item = evidence[0] if evidence else None
            detailed_results.append({
                "id": q_spec["id"],
                "category": q_spec["category"],
                "query": query_text,
                "status": status_eval,
                "rank": first_relevant_rank,
                "has_sufficient_evidence": has_evidence,
                "items_retrieved": len(evidence),
                "top_doc": top_item["document_id"] if top_item else None,
                "top_score": res.get("max_similarity_score", 0.0),
                "rrf_score": top_item.get("rrf_score") if top_item else None,
                "retrieval_source": top_item.get("retrieval_source") if top_item else None,
                "latency_ms": round(elapsed_ms, 2),
            })

    recall_at_5 = (hits_at_5 / positive_queries_count) if positive_queries_count else 0.0
    recall_at_10 = (hits_at_10 / positive_queries_count) if positive_queries_count else 0.0
    mrr = (sum(reciprocal_ranks) / len(reciprocal_ranks)) if reciprocal_ranks else 0.0

    sorted_latencies = sorted(latencies)
    mean_latency = sum(latencies) / len(latencies)
    median_latency = sorted_latencies[len(sorted_latencies) // 2]
    p95_latency = sorted_latencies[int(len(sorted_latencies) * 0.95)]

    return {
        "mode": mode,
        "candidate_pool_size": candidate_pool_size,
        "queries_evaluated": len(BENCHMARK_QUERIES),
        "positive_queries": positive_queries_count,
        "negative_queries": len(BENCHMARK_QUERIES) - positive_queries_count,
        "recall_at_5": round(recall_at_5, 4),
        "recall_at_10": round(recall_at_10, 4),
        "mrr": round(mrr, 4),
        "total_relevant_retrieved": total_relevant_retrieved,
        "total_irrelevant_retrieved": total_irrelevant_retrieved,
        "latency_ms": {
            "mean": round(mean_latency, 2),
            "median": round(median_latency, 2),
            "p95": round(p95_latency, 2),
        },
        "details": detailed_results,
    }


def run_benchmark():
    import tempfile
    temp_dir = tempfile.mkdtemp()
    bench_db = Path(temp_dir) / "hybrid_benchmark.db"
    settings.DATABASE_PATH = bench_db

    print("=" * 80)
    print("DHAROHAR AI — MILESTONE 5.6.3 HYBRID RETRIEVAL BENCHMARK")
    print("Dense-Only Semantic vs. Hybrid (Dense + SQLite FTS5 BM25 with RRF)")
    print("=" * 80)

    print("1. Seeding isolated multi-volume heritage benchmark database...")
    seed_benchmark_corpus(bench_db)
    print(f"Corpus initialized at: {bench_db}")

    print("\n2. Evaluating Dense-Only Retrieval (pool_size=50)...")
    dense_metrics = evaluate_retrieval(mode="dense", candidate_pool_size=50)

    print("3. Evaluating Hybrid Retrieval (Dense + FTS5 RRF, pool_size=50)...")
    hybrid_metrics = evaluate_retrieval(mode="hybrid", candidate_pool_size=50)

    print("\n" + "=" * 80)
    print(f"{'METRIC':<30} | {'DENSE-ONLY':<20} | {'HYBRID (RRF)':<20} | {'DELTA':<15}")
    print("-" * 80)
    r5_delta = hybrid_metrics["recall_at_5"] - dense_metrics["recall_at_5"]
    r10_delta = hybrid_metrics["recall_at_10"] - dense_metrics["recall_at_10"]
    mrr_delta = hybrid_metrics["mrr"] - dense_metrics["mrr"]
    rel_delta = hybrid_metrics["total_relevant_retrieved"] - dense_metrics["total_relevant_retrieved"]
    irrel_delta = hybrid_metrics["total_irrelevant_retrieved"] - dense_metrics["total_irrelevant_retrieved"]
    lat_delta = hybrid_metrics["latency_ms"]["mean"] - dense_metrics["latency_ms"]["mean"]

    print(f"{'Recall @ 5':<30} | {dense_metrics['recall_at_5']:<20.4f} | {hybrid_metrics['recall_at_5']:<20.4f} | {r5_delta:+.4f}")
    print(f"{'Recall @ 10':<30} | {dense_metrics['recall_at_10']:<20.4f} | {hybrid_metrics['recall_at_10']:<20.4f} | {r10_delta:+.4f}")
    print(f"{'Mean Reciprocal Rank (MRR)':<30} | {dense_metrics['mrr']:<20.4f} | {hybrid_metrics['mrr']:<20.4f} | {mrr_delta:+.4f}")
    print(f"{'Relevant Evidence Retrieved':<30} | {dense_metrics['total_relevant_retrieved']:<20} | {hybrid_metrics['total_relevant_retrieved']:<20} | {rel_delta:+d}")
    print(f"{'Irrelevant / False Positives':<30} | {dense_metrics['total_irrelevant_retrieved']:<20} | {hybrid_metrics['total_irrelevant_retrieved']:<20} | {irrel_delta:+d}")
    print(f"{'Mean Latency (ms)':<30} | {dense_metrics['latency_ms']['mean']:<20.2f} | {hybrid_metrics['latency_ms']['mean']:<20.2f} | {lat_delta:+.2f} ms")
    print(f"{'Median Latency (ms)':<30} | {dense_metrics['latency_ms']['median']:<20.2f} | {hybrid_metrics['latency_ms']['median']:<20.2f} |")
    print(f"{'P95 Latency (ms)':<30} | {dense_metrics['latency_ms']['p95']:<20.2f} | {hybrid_metrics['latency_ms']['p95']:<20.2f} |")
    print("=" * 80)

    print("\nQUERY-BY-QUERY DETAILED COMPARISON:")
    print("-" * 80)
    for idx, (d_q, h_q) in enumerate(zip(dense_metrics["details"], hybrid_metrics["details"]), 1):
        q_id = d_q["id"]
        cat = d_q["category"]
        d_status = d_q["status"]
        h_status = h_q["status"]
        src = h_q.get("retrieval_source") or "none"
        print(f"[{idx:02d}] {cat:<32} | Dense: {d_status:<18} | Hybrid: {h_status:<18} | Source: {src}")

    # Save to JSON
    output_path = Path("backend/data/hybrid_retrieval_benchmark_results.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    report_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "candidate_pool_size": 50,
        "rrf_k": settings.RAG_RRF_K,
        "dense_weight": settings.RAG_DENSE_WEIGHT,
        "lexical_weight": settings.RAG_LEXICAL_WEIGHT,
        "dense_metrics": dense_metrics,
        "hybrid_metrics": hybrid_metrics,
        "delta": {
            "recall_at_5": round(r5_delta, 4),
            "recall_at_10": round(r10_delta, 4),
            "mrr": round(mrr_delta, 4),
            "relevant_retrieved_delta": rel_delta,
            "irrelevant_retrieved_delta": irrel_delta,
            "latency_mean_delta_ms": round(lat_delta, 2),
        },
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)
    print(f"\nBenchmark results saved to: {output_path}")


if __name__ == "__main__":
    run_benchmark()

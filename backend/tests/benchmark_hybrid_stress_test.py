import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.db.database import get_db_context
from app.db.repository import DocumentRepository
from app.services.embedding_service import embedding_service
from app.services.retrieval_service import (
    retrieve_evidence,
    sanitize_fts5_query,
    compute_rrf_rankings,
)

VALIDATION_DB_PATH = backend_dir / "data" / "dharohar_sample_validation.db"

# ---------------------------------------------------------------------------
# 35 Reproducible Benchmark Queries Across 13 Historical Phenomenon Categories
# ---------------------------------------------------------------------------
BENCHMARK_QUERIES = [
    # 1. Exact Historical Proper Nouns
    {
        "id": "q01_west_pahlavi",
        "category": "1. Historical Proper Nouns",
        "query": "Dr. E. W. West translations of Pahlavi inscriptions",
        "expected_chunks": ["sample_doc_02_sample_22087_p2_c2"],
        "expected_doc": "sample_doc_02_sample_22087",
        "expected_pages": [2],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Directly mentions Dr. E. W. West translating Pahlavi inscriptions.",
    },
    {
        "id": "q02_dantidurga_reign",
        "category": "1. Historical Proper Nouns",
        "query": "Dantidurga conquest of the Dekhan and reign 725-755",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p2_c2"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [2],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Dantidurga reign (725-755 AD) conquering the whole of the Dekhan.",
    },
    {
        "id": "q03_jacobi_kuda",
        "category": "1. Historical Proper Nouns",
        "query": "Prof. H. Jacobi transliteration of Kuda inscription",
        "expected_chunks": ["sample_doc_02_sample_22087_p7_c6"],
        "expected_doc": "sample_doc_02_sample_22087",
        "expected_pages": [7],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Prof. H. Jacobi of Munster transliterating Kuda inscription.",
    },
    {
        "id": "q04_vikramaditya_733",
        "category": "1. Historical Proper Nouns",
        "query": "Vikramaditya Chalukya in the year 733 a.d.",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p3_c0"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [3],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Chronological reference to Vikramaditya Chalukya in 733 AD.",
    },

    # 2. Alternative Spellings & Transliterations
    {
        "id": "q05_elura_brahmanical",
        "category": "2. Alternative Spellings",
        "query": "Elura cave temples Brahmanical and Jaina",
        "expected_chunks": ["sample_doc_01_sample_1544_p1_c0", "sample_doc_01_sample_1544_p5_c0"],
        "expected_doc": "sample_doc_01_sample_1544",
        "expected_pages": [1, 5],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Historical 19th-century spelling 'Elura' instead of modern 'Ellora'.",
    },
    {
        "id": "q06_kailasa_rock_temple",
        "category": "2. Alternative Spellings",
        "query": "Kailasa rock temple excavation from top to bottom",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p4_c0", "sample_doc_01_sample_1544_p4_c0"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [4],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Classical spelling 'Kailasa' instead of 'Kailash'.",
    },
    {
        "id": "q07_dwajastambha_pillars",
        "category": "2. Alternative Spellings",
        "query": "Dwajastambha ensign staff square pillar",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p4_c5"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [4],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Historical spelling 'dwajastambha' vs modern 'dhvajastambha'.",
    },
    {
        "id": "q08_digoba_cells_mhar",
        "category": "2. Alternative Spellings",
        "query": "Digoba in rock cut cells at Mhar",
        "expected_chunks": ["sample_doc_02_sample_22087_p4_c2", "sample_doc_02_sample_22087_p6_c2"],
        "expected_doc": "sample_doc_02_sample_22087",
        "expected_pages": [4, 6],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Historical term 'digoba' vs modern 'dagoba' or 'stupa'.",
    },

    # 3. Numerical Dimensions
    {
        "id": "q09_court_276_154_107",
        "category": "3. Numerical Dimensions",
        "query": "court of the temple measures 276 in length breadth 154 scarp 107 feet",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p4_c4"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [4],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Exact courtyard dimensions 276 by 154, with 107 ft back scarp.",
    },
    {
        "id": "q10_spire_96_feet",
        "category": "3. Numerical Dimensions",
        "query": "spire rises to a height of 96 feet from the court below",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p8_c0"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [8],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Exact shikhara height of 96 feet.",
    },
    {
        "id": "q11_nandi_26_square",
        "category": "3. Numerical Dimensions",
        "query": "mandapa or shrine for the Bull Nandi 26 feet square",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p4_c5"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [4],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Exact Nandi shrine dimension of 26 feet square.",
    },
    {
        "id": "q12_verandah_61_by_22",
        "category": "3. Numerical Dimensions",
        "query": "verandah is 61 feet by 22 inclusive of the two pillars",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p9_c5"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [9],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Exact verandah dimension of 61 by 22 feet.",
    },

    # 4. Dates & Historical Periods
    {
        "id": "q13_february_1880",
        "category": "4. Dates & Periods",
        "query": "descriptive notes in this memorandum were prepared in February 1880",
        "expected_chunks": ["sample_doc_02_sample_22087_p2_c0"],
        "expected_doc": "sample_doc_02_sample_22087",
        "expected_pages": [2],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Exact publication memo date: February 1880.",
    },
    {
        "id": "q14_maurya_period",
        "category": "4. Dates & Periods",
        "query": "Indian paleography from the later Maurya period about 200 BC to 7th century AD",
        "expected_chunks": ["sample_doc_02_sample_22087_p2_c5"],
        "expected_doc": "sample_doc_02_sample_22087",
        "expected_pages": [2],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Epigraphical span from later Maurya 200 BC to 7th century AD.",
    },
    {
        "id": "q15_successors_govinda_amoghavarsha",
        "category": "4. Dates & Periods",
        "query": "successors Govinda III AD 785-810 and Amoghavarsha 810",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p2_c3"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [2],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Rashtrakuta successors Govinda III (785-810) and Amoghavarsha (810).",
    },

    # 5. Inscription Terminology
    {
        "id": "q16_sagharakhita_deyadhama",
        "category": "5. Inscription Terminology",
        "query": "Gahapatiputasa sethisa agharakhitasa deyadhama lena",
        "expected_chunks": ["sample_doc_02_sample_22087_p6_c3"],
        "expected_doc": "sample_doc_02_sample_22087",
        "expected_pages": [6],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Prakrit epigraph: religious gift of Seth Sagharakhita.",
    },
    {
        "id": "q17_podhio_be_2_cisterns",
        "category": "5. Inscription Terminology",
        "query": "podhio be 2 deya dhamam charitable gift of two cisterns",
        "expected_chunks": ["sample_doc_02_sample_22087_p10_c6"],
        "expected_doc": "sample_doc_02_sample_22087",
        "expected_pages": [10],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Prakrit epigraph: charitable gift of two cisterns at Kuda.",
    },
    {
        "id": "q18_vishnu_prakrit_vhenu",
        "category": "5. Inscription Terminology",
        "query": "Sanskrit Vishnu changed to Prakrit Vhenu",
        "expected_chunks": ["sample_doc_02_sample_22087_p5_c3"],
        "expected_doc": "sample_doc_02_sample_22087",
        "expected_pages": [5],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Philological note on Vishnu changing to Prakrit Vhenu.",
    },

    # 6. Temple & Cave References
    {
        "id": "q19_dumar_lena_caves",
        "category": "6. Temple & Cave References",
        "query": "Caves North of Kailasa Cave XXIX Dumar Lena",
        "expected_chunks": ["sample_doc_01_sample_1544_p3_c1"],
        "expected_doc": "sample_doc_01_sample_1544",
        "expected_pages": [3],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Cave XXIX Dumar Lena listed in chapter contents.",
    },
    {
        "id": "q20_mhar_caves_pal",
        "category": "6. Temple & Cave References",
        "query": "Rock Temples at Mhar small village of Pal Savitri river",
        "expected_chunks": ["sample_doc_02_sample_22087_p4_c0", "sample_doc_02_sample_22087_p6_c2"],
        "expected_doc": "sample_doc_02_sample_22087",
        "expected_pages": [4, 6],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Location of Mhar caves near village of Pal on the Savitri.",
    },
    {
        "id": "q21_kuda_caves_kalwa_mohola",
        "category": "6. Temple & Cave References",
        "query": "Kuda caves Kalwa khadi creek hill Mohola",
        "expected_chunks": ["sample_doc_02_sample_22087_p6_c6"],
        "expected_doc": "sample_doc_02_sample_22087",
        "expected_pages": [6],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Geographical location of Kuda caves by Kalwa khadi creek and Mohola hill.",
    },

    # 7. Multi-Concept Questions
    {
        "id": "q22_multiconcept_dantidurga_dravidian",
        "category": "7. Multi-Concept Questions",
        "query": "Dantidurga reign, Dravidian rock-cut temple, and Pattadkal structural style",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p2_c2", "sample_doc_03_sample_fergusson_burgess_1880_p3_c0"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [2, 3],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": True,
        "rationale": "Dantidurga reign compared to Dravidian style and Pattadkal temple.",
    },
    {
        "id": "q23_multiconcept_gopura_nandi_bridge",
        "category": "7. Multi-Concept Questions",
        "query": "Gopura gateway pyramid two storeys connected by bridges to Nandi mandapa",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p4_c1", "sample_doc_03_sample_fergusson_burgess_1880_p4_c5"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [4],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Two-storey Gopura gateway connected via bridge to Nandi pavilion.",
    },

    # 8. Paraphrased Questions
    {
        "id": "q24_paraphrase_memorandum",
        "category": "8. Paraphrased Questions",
        "query": "Colonial archaeological survey memorandum compiled in early 1880 on western rock sanctuaries",
        "expected_chunks": ["sample_doc_02_sample_22087_p2_c0"],
        "expected_doc": "sample_doc_02_sample_22087",
        "expected_pages": [2],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Paraphrase of Burgess's February 1880 prefatory note.",
    },
    {
        "id": "q25_paraphrase_monolithic_height",
        "category": "8. Paraphrased Questions",
        "query": "Total elevation from bottom of courtyard to top of main temple sanctuary roof",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p8_c0"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [8],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Paraphrase of 'spire rises to a height of 96 feet from the court below'.",
    },

    # 9. Multi-Page Evidence Questions
    {
        "id": "q26_multipage_kailasa_gopura_to_spire",
        "category": "9. Multi-Page Evidence",
        "query": "Architectural description of Kailasa gateway entrance on page 4 and main spire height on page 8",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p4_c0", "sample_doc_03_sample_fergusson_burgess_1880_p8_c0"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [4, 8],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": True,
        "rationale": "Requires evidence spanning across page 4 (Gopura/court) and page 8 (96ft spire).",
    },
    {
        "id": "q27_multipage_mhar_and_kuda_epigraphy",
        "category": "9. Multi-Page Evidence",
        "query": "Epigraphical survey comparing Mhar donation cave on page 6 with Kuda cistern donation on page 10",
        "expected_chunks": ["sample_doc_02_sample_22087_p6_c3", "sample_doc_02_sample_22087_p10_c6"],
        "expected_doc": "sample_doc_02_sample_22087",
        "expected_pages": [6, 10],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": True,
        "rationale": "Requires evidence spanning page 6 (Mhar gift) and page 10 (Kuda cisterns).",
    },

    # 10. Exact Terms in Irrelevant Contexts
    {
        "id": "q28_distractor_bagh_caves",
        "category": "10. Exact Terms in Irrelevant Contexts",
        "query": "Buddha and attendants sculpture from the Bagh Caves plate illustration",
        "expected_chunks": ["sample_doc_01_sample_1544_p4_c4"],
        "expected_doc": "sample_doc_01_sample_1544",
        "expected_pages": [4],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Bagh Caves appears only as a plate comparison caption in the Elura report.",
    },
    {
        "id": "q29_distractor_barbosa_mandabad",
        "category": "10. Exact Terms in Irrelevant Contexts",
        "query": "Barbosa 1514 account of Mandabad river",
        "expected_chunks": ["sample_doc_02_sample_22087_p7_c5"],
        "expected_doc": "sample_doc_02_sample_22087",
        "expected_pages": [7],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Duarte Barbosa 1514 citation appears only in an etymological footnote.",
    },

    # 11. Partially Supported Questions
    {
        "id": "q30_partial_support_krishna_dantidurga",
        "category": "11. Partially Supported",
        "query": "Did King Krishna I construct the Kailasa court measuring 276 feet in length?",
        "expected_chunks": ["sample_doc_03_sample_fergusson_burgess_1880_p4_c4"],
        "expected_doc": "sample_doc_03_sample_fergusson_burgess_1880",
        "expected_pages": [4],
        "has_sufficient_evidence": True,
        "is_negative": False,
        "is_multipage": False,
        "rationale": "Court dimensions (276 ft) are present, but Krishna I is unsupported (text attributes to Dantidurga).",
    },

    # 12. Completely Absent Information
    {
        "id": "q31_absent_locomotives",
        "category": "12. Absent Information",
        "query": "steam locomotives and railway transport lines constructed inside Ellora caves",
        "expected_chunks": [],
        "expected_doc": None,
        "expected_pages": [],
        "has_sufficient_evidence": False,
        "is_negative": True,
        "is_multipage": False,
        "rationale": "Completely absent from the archive; must trigger correct rejection.",
    },
    {
        "id": "q32_absent_napoleon",
        "category": "12. Absent Information",
        "query": "Napoleon Bonaparte invasion of Deccan plateau and demolition artillery orders",
        "expected_chunks": [],
        "expected_doc": None,
        "expected_pages": [],
        "has_sufficient_evidence": False,
        "is_negative": True,
        "is_multipage": False,
        "rationale": "Completely absent from the archive; must trigger correct rejection.",
    },
    {
        "id": "q33_absent_dutch_voc",
        "category": "12. Absent Information",
        "query": "Dutch East India Company VOC spice trading warehouse inside Kuda rock caves",
        "expected_chunks": [],
        "expected_doc": None,
        "expected_pages": [],
        "has_sufficient_evidence": False,
        "is_negative": True,
        "is_multipage": False,
        "rationale": "Completely absent from the archive; must trigger correct rejection.",
    },

    # 13. False Historical Premises
    {
        "id": "q34_false_premise_shivaji_coins",
        "category": "13. False Historical Premises",
        "query": "Shivaji gold coins embedded in the Kailasa mandapa floor",
        "expected_chunks": [],
        "expected_doc": None,
        "expected_pages": [],
        "has_sufficient_evidence": False,
        "is_negative": True,
        "is_multipage": False,
        "rationale": "False historical premise. Kailasa mandapa floor exists, but Shivaji coins are fabricated.",
    },
    {
        "id": "q35_false_premise_ashoka_edicts",
        "category": "13. False Historical Premises",
        "query": "Ashoka edicts carved on a monolithic pillar inside Kailasa Temple Cave 16",
        "expected_chunks": [],
        "expected_doc": None,
        "expected_pages": [],
        "has_sufficient_evidence": False,
        "is_negative": True,
        "is_multipage": False,
        "rationale": "False historical premise. Monolithic pillars exist, but Ashoka edicts inside Cave 16 are fabricated.",
    },
]


def evaluate_query_retrieval(
    query_def: Dict[str, Any],
    retrieved_items: List[Dict[str, Any]],
    has_sufficient_evidence: bool,
) -> Dict[str, Any]:
    """
    Computes Recall@5, Recall@10, Precision@5, Reciprocal Rank (RR),
    multi-page coverage, and false positive status.
    """
    is_neg = query_def["is_negative"]
    expected_chunks = set(query_def["expected_chunks"])
    expected_pages = set(query_def.get("expected_pages", []))
    expected_doc = query_def.get("expected_doc")

    retrieved_pages = [item.get("page_number", item.get("pdf_page_index")) for item in retrieved_items]

    # Negative query evaluation (absent info or false premises)
    if is_neg:
        # A false positive occurs if the retrieval pipeline declared has_sufficient_evidence = True
        # and retrieved evidence items for an inquiry whose premise is completely absent.
        is_false_positive = has_sufficient_evidence and len(retrieved_items) > 0
        return {
            "status": "FALSE POSITIVE" if is_false_positive else "CORRECT REJECTION",
            "is_false_positive": is_false_positive,
            "rank": None,
            "rr": 0.0,
            "recall_at_5": 1.0 if not is_false_positive else 0.0,
            "recall_at_10": 1.0 if not is_false_positive else 0.0,
            "precision_at_5": 1.0 if not is_false_positive else 0.0,
            "multipage_coverage": 1.0,
        }

    # Positive query evaluation
    # Extract chunk IDs from the items (each item may contain merged chunk_ids)
    first_rank = None
    for rank, item in enumerate(retrieved_items, start=1):
        item_cids = set(item.get("chunk_ids") or ([item.get("chunk_id")] if item.get("chunk_id") else []))
        if expected_chunks.intersection(item_cids):
            first_rank = rank
            break

    top5_cids = set()
    for item in retrieved_items[:5]:
        top5_cids.update(item.get("chunk_ids") or ([item.get("chunk_id")] if item.get("chunk_id") else []))

    top10_cids = set()
    for item in retrieved_items[:10]:
        top10_cids.update(item.get("chunk_ids") or ([item.get("chunk_id")] if item.get("chunk_id") else []))

    matches_5 = top5_cids.intersection(expected_chunks)
    matches_10 = top10_cids.intersection(expected_chunks)

    rr = 1.0 / first_rank if first_rank else 0.0
    r_at_5 = 1.0 if matches_5 else 0.0
    r_at_10 = 1.0 if matches_10 else 0.0
    p_at_5 = len(matches_5) / 5.0

    # Multi-page coverage check
    if query_def.get("is_multipage", False) and expected_pages:
        covered_pages = set(retrieved_pages).intersection(expected_pages)
        mp_cov = len(covered_pages) / len(expected_pages)
    else:
        mp_cov = 1.0

    return {
        "status": f"HIT @ Rank {first_rank}" if first_rank else "MISS",
        "is_false_positive": False,
        "rank": first_rank,
        "rr": rr,
        "recall_at_5": r_at_5,
        "recall_at_10": r_at_10,
        "precision_at_5": p_at_5,
        "multipage_coverage": mp_cov,
    }


def run_benchmark():
    print(f"Connecting to isolated validation database: {VALIDATION_DB_PATH}")
    settings.DATABASE_PATH = VALIDATION_DB_PATH

    results = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "validation_db": str(VALIDATION_DB_PATH),
        "total_queries": len(BENCHMARK_QUERIES),
        "modes": {},
        "parameter_sweep": {},
        "category_breakdown": {},
    }

    modes_to_test = ["dense", "lexical", "hybrid"]

    for mode in modes_to_test:
        print(f"\n==========================================")
        print(f"EVALUATING RETRIEVAL MODE: {mode.upper()}")
        print(f"==========================================")

        mode_metrics = {
            "mode": mode,
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
            "latencies_ms": [],
            "query_details": [],
        }

        pos_r5 = []
        pos_r10 = []
        pos_p5 = []
        pos_rr = []
        mp_covs = []
        fp_count = 0
        neg_count = 0

        for q in BENCHMARK_QUERIES:
            t0 = time.perf_counter()
            ret_res = retrieve_evidence(
                query=q["query"],
                retrieval_mode=mode,
                threshold=0.32,
            )
            lat_ms = (time.perf_counter() - t0) * 1000.0
            mode_metrics["latencies_ms"].append(lat_ms)

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

            top_score = ret_res.get("max_similarity_score", 0.0)
            top_src = items[0].get("retrieval_source") if items else None
            top_cid = items[0].get("evidence_id") if items else None

            detail = {
                "id": q["id"],
                "category": q["category"],
                "query": q["query"],
                "status": eval_res["status"],
                "rank": eval_res["rank"],
                "has_sufficient_evidence": has_suff,
                "items_count": len(items),
                "top_similarity_score": top_score,
                "top_retrieval_source": top_src,
                "latency_ms": round(lat_ms, 2),
            }
            mode_metrics["query_details"].append(detail)
            print(f"[{q['id']}] ({mode}) -> {eval_res['status']} | Lat: {lat_ms:.2f}ms | Items: {len(items)}")

        # Compute aggregate scores
        mode_metrics["recall_at_5"] = round(sum(pos_r5) / len(pos_r5), 4) if pos_r5 else 0.0
        mode_metrics["recall_at_10"] = round(sum(pos_r10) / len(pos_r10), 4) if pos_r10 else 0.0
        mode_metrics["precision_at_5"] = round(sum(pos_p5) / len(pos_p5), 4) if pos_p5 else 0.0
        mode_metrics["mrr"] = round(sum(pos_rr) / len(pos_rr), 4) if pos_rr else 0.0
        mode_metrics["false_positive_count"] = fp_count
        mode_metrics["false_positive_rate"] = round(fp_count / neg_count, 4) if neg_count else 0.0
        mode_metrics["multipage_coverage"] = round(sum(mp_covs) / len(mp_covs), 4) if mp_covs else 1.0

        # Category breakdown for this mode
        cat_map: Dict[str, Dict[str, Any]] = {}
        for d in mode_metrics["query_details"]:
            cat = d["category"]
            if cat not in cat_map:
                cat_map[cat] = {"total": 0, "hits_top5": 0, "rr_sum": 0.0, "lats": []}
            cat_map[cat]["total"] += 1
            if d.get("rank") and d["rank"] <= 5:
                cat_map[cat]["hits_top5"] += 1
                cat_map[cat]["rr_sum"] += 1.0 / d["rank"]
            cat_map[cat]["lats"].append(d["latency_ms"])

        mode_metrics["category_breakdown"] = {}
        for cat, data in cat_map.items():
            mode_metrics["category_breakdown"][cat] = {
                "total_queries": data["total"],
                "recall_at_5": round(data["hits_top5"] / data["total"], 4),
                "mrr": round(data["rr_sum"] / data["total"], 4),
                "mean_latency_ms": round(sum(data["lats"]) / len(data["lats"]), 2),
            }

        lats = sorted(mode_metrics["latencies_ms"])
        mode_metrics["latency_ms_stats"] = {
            "mean": round(sum(lats) / len(lats), 2),
            "median": round(lats[len(lats) // 2], 2),
            "p95": round(lats[int(len(lats) * 0.95)], 2),
        }
        del mode_metrics["latencies_ms"]

        results["modes"][mode] = mode_metrics

    # -----------------------------------------------------------------------
    # Phase 4 Parameter Sweep: Pool Sizes (15, 30, 50) & RRF k (30, 60, 100)
    # -----------------------------------------------------------------------
    print("\n==========================================")
    print("RUNNING PARAMETER SWEEP: POOL SIZES & RRF K")
    print("==========================================")
    
    sweep_results = {}
    pool_sizes = [15, 30, 50]
    k_values = [30, 60, 100]

    for pool in pool_sizes:
        for k in k_values:
            key = f"pool_{pool}_k_{k}"
            pos_r5 = []
            pos_rr = []
            lats = []

            for q in [q for q in BENCHMARK_QUERIES if not q["is_negative"]]:
                t0 = time.perf_counter()
                ret_res = retrieve_evidence(
                    query=q["query"],
                    retrieval_mode="hybrid",
                    threshold=0.32,
                    candidate_pool_size=pool,
                    rrf_k=k,
                )
                lats.append((time.perf_counter() - t0) * 1000.0)
                items = ret_res.get("evidence", [])
                eval_res = evaluate_query_retrieval(q, items, ret_res.get("has_sufficient_evidence", False))
                pos_r5.append(eval_res["recall_at_5"])
                pos_rr.append(eval_res["rr"])

            sweep_results[key] = {
                "pool_size": pool,
                "rrf_k": k,
                "recall_at_5": round(sum(pos_r5) / len(pos_r5), 4),
                "mrr": round(sum(pos_rr) / len(pos_rr), 4),
                "mean_latency_ms": round(sum(lats) / len(lats), 2),
            }
            print(f"Sweep Config: {key} -> Recall@5: {sweep_results[key]['recall_at_5']}, MRR: {sweep_results[key]['mrr']}, Lat: {sweep_results[key]['mean_latency_ms']}ms")

    results["parameter_sweep"] = sweep_results

    # Output file
    out_path = backend_dir / "data" / "hybrid_stress_test_benchmark_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\nStress test benchmark results saved to: {out_path}")
    return results


if __name__ == "__main__":
    run_benchmark()


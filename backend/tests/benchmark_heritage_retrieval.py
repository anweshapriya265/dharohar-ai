import os
import sys
import tempfile
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.db.database import init_db, get_db_context
from app.db.repository import DocumentRepository
from app.services.chunking_service import chunk_document_pages
from app.services.embedding_service import embedding_service
from app.services.retrieval_service import retrieve_evidence, estimate_token_count
import sqlite3


def run_benchmark():
    # Setup temporary database
    temp_dir = tempfile.mkdtemp()
    temp_db_path = Path(temp_dir) / "benchmark.db"
    settings.DATABASE_PATH = temp_db_path

    init_db(temp_db_path)
    with get_db_context(temp_db_path) as conn:
        repo = DocumentRepository(conn)

        # 1. Seed Heritage Documents
        doc1_id = "doc_ellora_survey"
        doc1_pages = [
            {
                "page_number": 1,
                "text": (
                    "The Ellora Caves comprise 34 major rock-cut monasteries and temples excavated out of the vertical face of the Charanandri hills. "
                    "Located in the modern Aurangabad district of Maharashtra, India, the site features Buddhist, Hindu, and Jain monuments "
                    "dating from the 6th to 10th centuries CE. These monuments showcase the religious harmony prevalent during ancient Indian history."
                ),
            },
            {
                "page_number": 2,
                "text": (
                    "Cave 16, known as the Kailash temple, is the crowning glory of Ellora. It is a monolithic rock-cut structure carved top-to-bottom "
                    "from a single basalt cliff. Commissioned under the patronage of Rashtrakuta King Krishna I (reigned c. 756–773 CE), this architectural "
                    "marvel features a massive vimana (tower), pillared mandapa (hall), courtyard, and a dedicated Nandi pavilion. The sculptural program "
                    "depicts scenes from the Ramayana and Mahabharata, including the renowned panel of Ravana shaking Mount Kailasa."
                ),
            },
            {
                "page_number": 3,
                "text": (
                    "Epigraphical investigations at Ellora have uncovered significant epigraphs and copper plate grants. Several Sanskrit inscriptions "
                    "written in early Devanagari and western Brahmi scripts record royal land grants and dedications to Brahmin scholars and ascetic orders. "
                    "The Baroda copper plates of Karka II corroborate the Rashtrakuta royal lineage and architectural achievements at the site."
                ),
            },
        ]

        doc2_id = "doc_ajanta_paintings"
        doc2_pages = [
            {
                "page_number": 1,
                "text": (
                    "The Ajanta Caves are approximately thirty rock-cut Buddhist cave monuments excavated into a horseshoe-shaped cliff along the Waghur River. "
                    "Dating from the 2nd century BCE to about 480 CE, the caves were patronized during the Satavahana and Vakataka periods, especially under "
                    "the reign of Emperor Harishena. The site is world-renowned for its surviving wall paintings and fresco-secco murals."
                ),
            },
            {
                "page_number": 2,
                "text": (
                    "The murals of Ajanta illustrate diverse Jataka tales narrating the previous lives of Gautama Buddha. Masterpieces include the depictions "
                    "of Bodhisattva Padmapani and Vajrapani in Cave 1. The pigments utilized by the ancient artisans were derived from local minerals, "
                    "including yellow and red ochre, lapis lazuli for blue accents, and lime plaster grounds."
                ),
            },
        ]

        doc3_id = "doc_ocr_scanned_plate"
        doc3_pages = [
            {
                "page_number": 1,
                "text": (
                    "ARCHEOLOGICAL SURVEY OF INDIA - WESTERN CIRCLE REPORT 1904. "
                    "EPIGRAPHICAL RECORD NO 42: INSCRIPTION AT CAVE 16 KAILASH TEMPLE. "
                    "TRANSCRIPTION NOTES: THE STONE INSCRIPTION RECORDS BENEFACTIONS BY KING KRISHNA I. "
                    "THE SHIKHARA RISES 96 FEET ABOVE THE MONOLITHIC COURTYARD FLOOR. "
                    "WEATHERING OBSERVED ON THE PLINTH CARVINGS OF ELEPHANTS."
                ),
            }
        ]

        docs_data = [
            ("doc_ellora_survey", "Ellora_Caves_Archaeological_Survey.pdf", doc1_pages),
            ("doc_ajanta_paintings", "Ajanta_Cave_Paintings_Report.pdf", doc2_pages),
            ("doc_ocr_scanned_plate", "Scanned_Epigraphical_Plate_Survey.pdf", doc3_pages),
        ]

        for d_id, filename, pages in docs_data:
            repo.insert_document({
                "id": d_id,
                "original_filename": filename,
                "file_size": 1024 * 100,
                "content_type": "application/pdf",
                "upload_timestamp": "2026-11-01T10:00:00Z",
                "processing_status": "completed",
                "extraction_status": "success",
                "page_count": len(pages),
                "storage_path": f"/tmp/{filename}",
                "indexing_status": "indexed",
            })

            db_pages = []
            for p in pages:
                db_pages.append({
                    "document_id": d_id,
                    "page_number": p["page_number"],
                    "text": p["text"],
                    "character_count": len(p["text"]),
                    "word_count": len(p["text"].split()),
                    "extraction_status": "success",
                })
            repo.insert_pages(db_pages)

            # Chunk and embed
            chunks = chunk_document_pages(d_id, db_pages, chunk_size=300, overlap=60)
            texts = [c["text"] for c in chunks]
            embeddings = embedding_service.encode_texts(texts)
            for idx, chunk in enumerate(chunks):
                chunk["embedding"] = embedding_service.serialize_embedding(embeddings[idx])
            repo.insert_chunks(chunks)

    # 2. Benchmark Queries
    queries = [
        # (Category, Query, Expected Top Doc ID, Expected Min Score)
        ("1. Monument / Entity", "Kailash temple Cave 16 monolithic rock-cut", "doc_ellora_survey", 0.40),
        ("2. Architectural Terms", "mandapa vimana Dravidian architecture shikhara Nandi pavilion", "doc_ellora_survey", 0.35),
        ("3. Historical Dates & Rulers", "Rashtrakuta dynasty King Krishna I 8th century CE", "doc_ellora_survey", 0.45),
        ("4. Epigraphy & Inscriptions", "copper plate grant Sanskrit inscription Brahmi script", "doc_ellora_survey", 0.40),
        ("5. Scanned / OCR Text", "ARCHEOLOGICAL SURVEY OF INDIA REPORT ON EPIGRAPHY", "doc_ocr_scanned_plate", 0.40),
        ("6. Natural Paraphrase", "Who commissioned the great rock temple at Ellora and when was it built?", "doc_ellora_survey", 0.50),
        ("7. Cross-Domain Negative", "quantum computing neural network transformer model GPU acceleration", None, None),
        ("8. Financial Negative", "quarterly earnings balance sheet stock market dividend yield", None, None),
        ("9. European History Negative", "French revolution storming of the Bastille Napoleon Bonaparte", None, None),
    ]

    print("\n" + "=" * 80)
    print("DHAROHAR AI — HERITAGE RETRIEVAL BENCHMARK & SIMILARITY CALIBRATION")
    print("=" * 80)

    results = []
    for category, q, expected_doc, expected_min in queries:
        # Test with low threshold 0.10 to observe raw max score
        raw_res = retrieve_evidence(q, threshold=0.10)
        max_score = raw_res["max_similarity_score"]
        
        # Test with candidate threshold 0.32
        res_32 = retrieve_evidence(q, threshold=0.32)
        has_ev_32 = res_32["has_sufficient_evidence"]
        num_ev_32 = len(res_32["evidence"])
        top_doc = res_32["evidence"][0]["document_id"] if num_ev_32 > 0 else "None"
        top_citation = res_32["evidence"][0]["source_citation"] if num_ev_32 > 0 else "None"

        # Test with threshold 0.30 and 0.35
        res_30 = retrieve_evidence(q, threshold=0.30)
        res_35 = retrieve_evidence(q, threshold=0.35)

        results.append({
            "category": category,
            "query": q,
            "max_score": max_score,
            "pass_030": res_30["has_sufficient_evidence"],
            "pass_032": has_ev_32,
            "pass_035": res_35["has_sufficient_evidence"],
            "top_doc": top_doc,
            "citation": top_citation,
            "expected_doc": expected_doc,
        })

        print(f"\nCategory: {category}")
        print(f"Query: \"{q}\"")
        print(f"Max Similarity Score: {max_score:.4f}")
        print(f"Passes @0.30: {res_30['has_sufficient_evidence']} | @0.32: {has_ev_32} | @0.35: {res_35['has_sufficient_evidence']}")
        if num_ev_32 > 0:
            print(f"Top Retrieved Citation: {top_citation} (Score: {res_32['evidence'][0]['similarity_score']})")
            print(f"Constituent Chunks: {res_32['evidence'][0]['chunk_ids']}")
        else:
            print("No evidence passed threshold 0.32 (Out of Domain / Insufficient Evidence)")

    print("\n" + "=" * 80)
    print("SUMMARY OF BENCHMARK OBSERVATIONS:")
    print("=" * 80)
    for r in results:
        status_eval = "PASS"
        if r["expected_doc"] is not None:
            if not r["pass_032"] or r["top_doc"] != r["expected_doc"]:
                status_eval = "FAIL"
        else:
            if r["pass_032"]:
                status_eval = "FALSE POSITIVE"
        print(f"[{status_eval}] {r['category'][:22]:<22} | Max: {r['max_score']:.4f} | @0.32: {r['pass_032']} | Top: {r['top_doc']}")


if __name__ == "__main__":
    run_benchmark()

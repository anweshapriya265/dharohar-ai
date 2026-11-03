import os
from pathlib import Path
import pymupdf

BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEST_DATASET_DIR = BASE_DIR / "test_dataset"
SAMPLES_DIR = TEST_DATASET_DIR / "samples"
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

SAMPLES_SPEC = [
    {
        "source": "1544.pdf",
        "output": "sample_1544.pdf",
        # 1-based: 6, 8, 10, 11, 16, 17, 18, 19, 20, 21 (10 pages)
        "pages_0based": [5, 7, 9, 10, 15, 16, 17, 18, 19, 20],
        "description": "James Burgess 1883 - Elura Cave Temples: Title, Preface, Contents, Plates List, and Chapter I Introductory on Ellora Caves",
    },
    {
        "source": "22087.pdf",
        "output": "sample_22087.pdf",
        # 1-based: 4, 6, 8, 12, 13, 14, 15, 16, 17, 18 (10 pages)
        "pages_0based": [3, 5, 7, 11, 12, 13, 14, 15, 16, 17],
        "description": "Burgess & Indraji 1881 - Cave Inscriptions: Title, Prefatory Note by Burgess/Indraji, Contents, Mhar & Kuda Cave Inscriptions",
    },
    {
        "source": "Fergusson Burgess 1880.pdf",
        "output": "sample_fergusson_burgess_1880.pdf",
        # 1-based: 477-486 (10 digital text pages on Kailasa Elura) + 1, 3, 5, 28, 190 (5 plates) = 15 pages
        "pages_0based": [476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 0, 2, 4, 27, 189],
        "description": "Fergusson & Burgess 1880 - The Cave Temples of India: Kailasa Monolith Chapter (10 digital pages) + Frontispiece/Map/Plates (5 scanned plates)",
    },
]


def extract_sample_pdfs():
    print("=== EXTRACTING CONTROLLED ARCHIVAL SAMPLE PDFS ===")
    results = []
    for spec in SAMPLES_SPEC:
        src_path = TEST_DATASET_DIR / spec["source"]
        out_path = SAMPLES_DIR / spec["output"]
        
        src_doc = pymupdf.open(str(src_path))
        out_doc = pymupdf.open()
        
        for pno in spec["pages_0based"]:
            out_doc.insert_pdf(src_doc, from_page=pno, to_page=pno)
        
        out_doc.save(str(out_path))
        src_len = len(src_doc)
        out_len = len(out_doc)
        out_size = out_path.stat().st_size
        src_doc.close()
        out_doc.close()
        
        print(f"\nCreated: {out_path.name}")
        print(f"  - Source: {spec['source']} (Total pages: {src_len})")
        print(f"  - Selected pages (0-based): {spec['pages_0based']}")
        print(f"  - Sample page count: {out_len}")
        print(f"  - File size: {out_size} bytes ({out_size / 1024:.1f} KB)")
        print(f"  - Description: {spec['description']}")
        
        results.append({
            "source": spec["source"],
            "sample_filename": spec["output"],
            "sample_path": str(out_path),
            "pages_count": out_len,
            "file_size": out_size,
            "source_pages": [p + 1 for p in spec["pages_0based"]],
        })
        
    print("\nAll representative sample PDFs prepared successfully.")
    return results


if __name__ == "__main__":
    extract_sample_pdfs()


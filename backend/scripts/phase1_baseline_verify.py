import hashlib
import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "backend" / "data" / "dharohar.db"
BACKUP_PATH = BASE_DIR / "backend" / "data" / "backups" / "dharohar_pre_m5_5_1.db"
TEST_DATASET_DIR = BASE_DIR / "test_dataset"
MANIFEST_PATH = TEST_DATASET_DIR / "dataset_manifest.json"


def sha256_file(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(1024 * 1024):
            h.update(chunk)
    return h.hexdigest()


def run_phase1_baseline():
    print("=== DHAROHAR AI — MILESTONE 5.5.1 PHASE 1 BASELINE VERIFICATION ===")
    
    # 1. Verify backup
    print(f"\n1. Database Backup Status:")
    print(f"   - Database path: {DB_PATH} (Exists: {DB_PATH.exists()}, Size: {DB_PATH.stat().st_size if DB_PATH.exists() else 0} bytes)")
    print(f"   - Backup path:   {BACKUP_PATH} (Exists: {BACKUP_PATH.exists()}, Size: {BACKUP_PATH.stat().st_size if BACKUP_PATH.exists() else 0} bytes)")
    assert BACKUP_PATH.exists(), "Backup does not exist!"
    
    # 2. Inspect Existing Database Schema and Row Counts
    print(f"\n2. Existing Database Inspection:")
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [r["name"] for r in cursor.fetchall() if not r["name"].startswith("sqlite_")]
    print(f"   - Tables found: {tables}")
    
    table_counts = {}
    for t in tables:
        cursor.execute(f"SELECT COUNT(*) as cnt FROM {t};")
        cnt = cursor.fetchone()["cnt"]
        table_counts[t] = cnt
        print(f"   - Table '{t}' row count: {cnt}")
    
    cursor.execute("SELECT id, original_filename FROM documents;")
    existing_docs = cursor.fetchall()
    print(f"   - Existing documents list: {[dict(d) for d in existing_docs]}")
    
    # Check schema definition
    print(f"\n3. Database Schema Definitions:")
    for t in tables:
        cursor.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{t}';")
        sql = cursor.fetchone()["sql"]
        print(f"   Table '{t}' SQL:\n     " + "\n     ".join(sql.strip().splitlines()))
    
    conn.close()
    
    # 3. Verify All Three PDFs and SHA-256 Checksums
    print(f"\n4. Dataset Verification vs Inspection Manifest:")
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    
    all_matched = True
    for item in manifest["documents"]:
        filename = item["filename"]
        pdf_path = TEST_DATASET_DIR / filename
        exists = pdf_path.exists()
        print(f"\n   Checking: {filename}")
        print(f"   - Exists: {exists}")
        if not exists:
            all_matched = False
            continue
        
        actual_size = pdf_path.stat().st_size
        actual_sha256 = sha256_file(pdf_path)
        
        size_match = actual_size == item["file_size_bytes"]
        hash_match = actual_sha256 == item["sha256"]
        print(f"   - Size: {actual_size} bytes (Manifest: {item['file_size_bytes']}) -> Match: {size_match}")
        print(f"   - SHA-256: {actual_sha256}")
        print(f"   - Expected: {item['sha256']}")
        print(f"   - SHA-256 Match: {hash_match}")
        
        if not (size_match and hash_match):
            all_matched = False

    print(f"\nPhase 1 Baseline Verification Completed. Status: {'SUCCESS' if all_matched else 'FAILED'}")
    return {
        "tables": tables,
        "table_counts": table_counts,
        "existing_docs_count": len(existing_docs),
        "manifest_match": all_matched,
    }


if __name__ == "__main__":
    run_phase1_baseline()


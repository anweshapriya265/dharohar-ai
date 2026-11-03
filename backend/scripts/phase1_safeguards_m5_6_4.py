import os
import shutil
import hashlib
import json
import sqlite3
from pathlib import Path

def main():
    print("=== DHAROHAR AI — MILESTONE 5.6.4 PHASE 1 SAFEGUARDS ===")
    base_dir = Path(__file__).resolve().parent.parent.parent
    backup_dir = base_dir / "backend" / "data" / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    prod_db = base_dir / "backend" / "data" / "dharohar.db"
    backup_path = backup_dir / "dharohar_pre_m5_6_4.db"
    shutil.copy2(prod_db, backup_path)
    print(f"1. Backup created: {backup_path} ({backup_path.stat().st_size} bytes)")

    conn = sqlite3.connect(prod_db)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    print("2. Production tables:", tables)
    for t in ["documents", "document_pages", "document_chunks", "document_chunks_fts"]:
        if t in tables:
            cur.execute(f"SELECT COUNT(*) FROM {t}")
            print(f"   {t}: {cur.fetchone()[0]} rows")

    print("3. Verifying test_dataset SHA256 checksums...")
    manifest_path = base_dir / "test_dataset" / "dataset_manifest.json"
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    for doc in manifest["documents"]:
        fpath = base_dir / "test_dataset" / doc["filename"]
        h = hashlib.sha256(open(fpath, "rb").read()).hexdigest()
        match = (h == doc["sha256"])
        print(f"   {doc['filename']}: MATCH={match} ({fpath.stat().st_size} bytes, expected {doc['file_size_bytes']})")

if __name__ == "__main__":
    main()


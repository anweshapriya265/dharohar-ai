import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "backend" / "data" / "dharohar_sample_validation.db"

conn = sqlite3.connect(str(DB_PATH))
c = conn.cursor()

c.execute("SELECT id, document_id, page_number, chunk_index, text FROM document_chunks WHERE text LIKE '%90 yards%'")
rows = c.fetchall()
print(f"Chunks matching '90 yards': {len(rows)}")
for r in rows:
    print(f"\nChunk ID: {r[0]} (Doc: {r[1]}, Page: {r[2]}, Index: {r[3]})")
    print(f"Text:\n{r[4]}")

c.execute("SELECT id, document_id, page_number, chunk_index, text FROM document_chunks WHERE document_id LIKE '%fergusson%' AND page_number = 4 ORDER BY chunk_index")
p4_chunks = c.fetchall()
print(f"\nTotal chunks on Page 4 of Fergusson Burgess: {len(p4_chunks)}")
for p in p4_chunks:
    print(f"  - Chunk Index {p[3]} (ID: {p[0]}): len={len(p[4])} | {p[4][:80]!r}")

conn.close()


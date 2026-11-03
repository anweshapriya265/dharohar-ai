import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ISOLATED_DB_PATH = BASE_DIR / "backend" / "data" / "dharohar_sample_validation.db"
os.environ["DHAROHAR_DATABASE_PATH"] = str(ISOLATED_DB_PATH)

import sqlite3
from app.core.config import settings
from app.services.embedding_service import embedding_service
from app.services.retrieval_service import (
    merge_consecutive_chunks,
    apply_source_diversity,
    pack_context_budget,
    assign_evidence_ids,
)

conn = sqlite3.connect(str(ISOLATED_DB_PATH))
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute("SELECT id, document_id, page_number, chunk_index, text, character_count, word_count, embedding FROM document_chunks")
all_chunks = [dict(r) for r in cursor.fetchall()]
conn.close()

query = "What are the dimensions and depth of the Kailasa temple court at Ellora?"
query_emb = embedding_service.encode_query(query)

scored = []
for c in all_chunks:
    c_emb = embedding_service.deserialize_embedding(c["embedding"])
    score = embedding_service.compute_cosine_similarity(query_emb, c_emb)
    scored.append({
        "chunk_id": c["id"],
        "document_id": c["document_id"],
        "original_filename": "sample_fergusson_burgess_1880.pdf" if "fergusson" in c["document_id"] else ("sample_1544.pdf" if "1544" in c["document_id"] else "sample_22087.pdf"),
        "page_number": c["page_number"],
        "chunk_index": c["chunk_index"],
        "text": c["text"],
        "character_count": c["character_count"],
        "word_count": c["word_count"],
        "similarity_score": score,
    })

scored.sort(key=lambda x: x["similarity_score"], reverse=True)

print("=== TOP 20 SCORED CANDIDATES FOR TEST 10 QUERY ===")
for rank, sc in enumerate(scored[:20], 1):
    contains_90 = "90 yards" in sc["text"]
    contains_depth = "depth" in sc["text"].lower()
    print(f"Rank {rank:02d}: Score={sc['similarity_score']:.4f} | Page {sc['page_number']}, Chunk {sc['chunk_index']} ({sc['chunk_id']}) | 90yds={contains_90}, depth={contains_depth}")

# Check where Chunk 0 of Page 4 is ranked
for rank, sc in enumerate(scored, 1):
    if sc["chunk_id"] == "sample_doc_03_sample_fergusson_burgess_1880_p4_c0":
        print(f"\nTarget Chunk (p4_c0): Rank {rank} with score {sc['similarity_score']:.4f}")
        break

# Now trace candidate pool taking top 15
candidate_pool = scored[:settings.RAG_CANDIDATE_POOL_SIZE]
print(f"\nCandidate pool size: {len(candidate_pool)}")

# Trace merge_consecutive_chunks
merged_blocks = merge_consecutive_chunks(candidate_pool)
print(f"\nMerged blocks count: {len(merged_blocks)}")
for b in merged_blocks:
    print(f"  Merged: Doc={b['document_id'][-20:]}, Page={b['page_number']}, Chunks={b['chunk_ids']}, Score={b['similarity_score']:.4f}")

# Trace apply_source_diversity
diverse_blocks = apply_source_diversity(
    merged_blocks,
    max_per_page=settings.RAG_MAX_CHUNKS_PER_PAGE,
    max_pages_per_doc=settings.RAG_MAX_PAGES_PER_DOC,
)
print(f"\nDiverse blocks count: {len(diverse_blocks)}")
for b in diverse_blocks:
    print(f"  Diverse: Doc={b['document_id'][-20:]}, Page={b['page_number']}, Chunks={b['chunk_ids']}, Score={b['similarity_score']:.4f}")

# Trace pack_context_budget
packed_blocks = pack_context_budget(diverse_blocks, max_tokens=settings.RAG_MAX_CONTEXT_TOKENS)
print(f"\nPacked blocks count: {len(packed_blocks)}")
for b in packed_blocks:
    print(f"  Packed: Doc={b['document_id'][-20:]}, Page={b['page_number']}, Chunks={b['chunk_ids']}, Score={b['similarity_score']:.4f}")


import numpy as np

def compute_rrf(dense_ranks, lexical_ranks, k=60, w_dense=1.0, w_lexical=1.0):
    all_keys = set(dense_ranks.keys()) | set(lexical_ranks.keys())
    scores = {}
    for item in all_keys:
        score = 0.0
        if item in dense_ranks:
            score += w_dense / (k + dense_ranks[item])
        if item in lexical_ranks:
            score += w_lexical / (k + lexical_ranks[item])
        scores[item] = score
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)

# Test scenario:
# Query: "Kailasa shikhara rises 96 feet"
# Chunk A: General discussion of Kailasa temple (dense rank 1, but no mention of 96 feet; lexical rank: none)
# Chunk B: Exact architectural report with "shikhara rises 96 feet" (dense rank 3, lexical rank 1)
# Chunk C: Another survey report with "temple shikhara" (dense rank 2, lexical rank 2)

dense_ranks = {"chunk_A": 1, "chunk_C": 2, "chunk_B": 3}
lexical_ranks = {"chunk_B": 1, "chunk_C": 2}

fused = compute_rrf(dense_ranks, lexical_ranks)
print("Fused rankings:")
for rank, (chunk, score) in enumerate(fused, 1):
    print(f"Rank {rank}: {chunk} (RRF Score: {score:.6f})")


import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
os.environ["DHAROHAR_DATABASE_PATH"] = str(BASE_DIR / "backend" / "data" / "dharohar_sample_validation.db")

from app.services.retrieval_service import retrieve_evidence

queries = [
    "What were the agricultural tax rates levied on wheat farmers near Ellora in 760 CE?",
    "What was the quarterly stock dividend of Apple Inc in 2024?",
    "What is the quantum mechanical spin of a Higgs boson?",
    "How do you configure an nginx reverse proxy for WebSocket traffic?",
    "What are the recipe ingredients for baking French chocolate croissants?",
]

print("=== OUT-OF-DOMAIN & NEGATIVE QUERIES TEST ===")
for q in queries:
    r = retrieve_evidence(q)
    print(f"\nQuery: {q}")
    print(f"  has_evidence: {r['has_sufficient_evidence']}")
    print(f"  max_score: {r['max_similarity_score']}")
    print(f"  candidates_found: {r['total_candidates_found']}")


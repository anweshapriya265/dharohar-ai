import logging
from typing import List, Optional
import numpy as np
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Manages sentence-transformer model loading, text vectorization,
    and similarity scoring for semantic heritage document search.
    """

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL_NAME
        self._model = None
        self._failed = False
        self._load_error: Optional[str] = None

    @property
    def model(self):
        """Lazy load the embedding model once into memory."""
        if self._model is None and not self._failed:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info("Loading embedding model '%s'...", self.model_name)
                try:
                    self._model = SentenceTransformer(self.model_name, local_files_only=True)
                except Exception:
                    self._model = SentenceTransformer(self.model_name)
                logger.info("Embedding model loaded successfully.")
            except Exception as exc:
                self._failed = True
                self._load_error = str(exc)
                logger.error("Failed to load sentence-transformers model: %s", exc)
                raise
        return self._model

    def is_available(self) -> bool:
        try:
            return self.model is not None
        except Exception:
            return False

    def encode_texts(self, texts: List[str]) -> np.ndarray:
        """
        Encodes a batch of texts into normalized embedding vectors (L2 norm = 1).
        Normalized vectors allow cosine similarity to be computed as a dot product.
        """
        if not texts:
            return np.empty((0, 384), dtype=np.float32)

        # encode with normalize_embeddings=True
        embeddings = self.model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        return embeddings.astype(np.float32)

    def encode_query(self, query: str) -> np.ndarray:
        """
        Encodes a single search query into a normalized vector.
        """
        cleaned = query.strip()
        if not cleaned:
            raise ValueError("Query cannot be empty for embedding generation.")

        emb = self.model.encode(
            [cleaned],
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        return emb[0].astype(np.float32)

    @staticmethod
    def serialize_embedding(vector: np.ndarray) -> bytes:
        """Serializes float32 vector to raw bytes for compact SQLite storage."""
        return vector.astype(np.float32).tobytes()

    @staticmethod
    def deserialize_embedding(blob: bytes) -> np.ndarray:
        """Deserializes SQLite BLOB to a 1D float32 numpy vector."""
        return np.frombuffer(blob, dtype=np.float32)

    @staticmethod
    def compute_cosine_similarity(query_emb: np.ndarray, doc_emb: np.ndarray) -> float:
        """
        Computes cosine similarity between two unit vectors.
        Since both are unit-normalized, cosine similarity equals the dot product.
        """
        score = float(np.dot(query_emb, doc_emb))
        # Clamp to [-1.0, 1.0] to guard against floating point imprecision
        return max(-1.0, min(1.0, score))


# Global singleton instance
embedding_service = EmbeddingService()


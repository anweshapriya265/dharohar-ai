from pathlib import Path
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DHAROHAR_", extra="ignore")

    APP_NAME: str = "DHAROHAR AI Backend"
    VERSION: str = "0.2.0"
    
    # 15 MB default limit
    MAX_UPLOAD_SIZE_BYTES: int = int(
        os.getenv("DHAROHAR_MAX_UPLOAD_SIZE_BYTES", str(15 * 1024 * 1024))
    )
    
    # Base storage directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR: Path = Path(
        os.getenv("DHAROHAR_UPLOAD_DIR", str(Path(__file__).resolve().parent.parent.parent / "data" / "uploads"))
    )
    DATABASE_PATH: Path = Path(
        os.getenv("DHAROHAR_DATABASE_PATH", str(Path(__file__).resolve().parent.parent.parent / "data" / "dharohar.db"))
    )

    # Milestone 3: Semantic Embeddings & Text Chunking
    EMBEDDING_MODEL_NAME: str = os.getenv(
        "DHAROHAR_EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2"
    )
    CHUNK_SIZE_CHARS: int = int(os.getenv("DHAROHAR_CHUNK_SIZE_CHARS", "600"))
    CHUNK_OVERLAP_CHARS: int = int(os.getenv("DHAROHAR_CHUNK_OVERLAP_CHARS", "100"))
    DEFAULT_SEARCH_LIMIT: int = int(os.getenv("DHAROHAR_DEFAULT_SEARCH_LIMIT", "5"))
    MAX_SEARCH_LIMIT: int = int(os.getenv("DHAROHAR_MAX_SEARCH_LIMIT", "20"))

    # Milestone 4: OCR & Scanned Document Processing
    TESSERACT_CMD: str = os.getenv("DHAROHAR_TESSERACT_CMD", "")
    OCR_DPI: int = int(os.getenv("DHAROHAR_OCR_DPI", "300"))
    OCR_CHAR_THRESHOLD: int = int(os.getenv("DHAROHAR_OCR_CHAR_THRESHOLD", "15"))
    OCR_DEFAULT_LANGUAGE: str = os.getenv("DHAROHAR_OCR_DEFAULT_LANGUAGE", "eng")
    OCR_MAX_SYNC_PAGES: int = int(os.getenv("DHAROHAR_OCR_MAX_SYNC_PAGES", "15"))

    # Milestone 5.1 & 5.6.3: Retrieval Optimization & Hybrid Retrieval Engine
    RAG_SIMILARITY_THRESHOLD: float = float(
        os.getenv("DHAROHAR_RAG_SIMILARITY_THRESHOLD", "0.32")
    )
    RAG_MAX_CONTEXT_TOKENS: int = int(
        os.getenv("DHAROHAR_RAG_MAX_CONTEXT_TOKENS", "1500")
    )
    RAG_MAX_CHUNKS_PER_PAGE: int = int(
        os.getenv("DHAROHAR_RAG_MAX_CHUNKS_PER_PAGE", "2")
    )
    RAG_MAX_PAGES_PER_DOC: int = int(
        os.getenv("DHAROHAR_RAG_MAX_PAGES_PER_DOC", "3")
    )
    RAG_CANDIDATE_POOL_SIZE: int = int(
        os.getenv("DHAROHAR_RAG_CANDIDATE_POOL_SIZE", "50")
    )
    RAG_RETRIEVAL_MODE: str = os.getenv("DHAROHAR_RAG_RETRIEVAL_MODE", "hybrid")
    RAG_RRF_K: int = int(os.getenv("DHAROHAR_RAG_RRF_K", "60"))
    RAG_DENSE_WEIGHT: float = float(os.getenv("DHAROHAR_RAG_DENSE_WEIGHT", "1.0"))
    RAG_LEXICAL_WEIGHT: float = float(os.getenv("DHAROHAR_RAG_LEXICAL_WEIGHT", "1.0"))
    RAG_LEXICAL_POOL_SIZE: int = int(os.getenv("DHAROHAR_RAG_LEXICAL_POOL_SIZE", "50"))
    RAG_LEXICAL_MIN_SIMILARITY: float = float(
        os.getenv("DHAROHAR_RAG_LEXICAL_MIN_SIMILARITY", "0.10")
    )
    RAG_LEXICAL_MIN_TERM_COVERAGE: float = float(
        os.getenv("DHAROHAR_RAG_LEXICAL_MIN_TERM_COVERAGE", "0.50")
    )

    # Milestone 5.6.3.3: OCR-Aware Lexical Normalization & Multi-Query Retrieval
    RAG_ENABLE_OCR_NORMALIZATION: bool = os.getenv("DHAROHAR_RAG_ENABLE_OCR_NORMALIZATION", "true").lower() in ("true", "1", "yes")
    RAG_ENABLE_MULTI_QUERY: bool = os.getenv("DHAROHAR_RAG_ENABLE_MULTI_QUERY", "true").lower() in ("true", "1", "yes")

    # Milestone 5.2: Local LLM Provider & Evidence-Grounded Generation
    LLM_PROVIDER: str = os.getenv("DHAROHAR_LLM_PROVIDER", "ollama")
    OLLAMA_BASE_URL: str = os.getenv("DHAROHAR_OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("DHAROHAR_OLLAMA_MODEL", "llama3.2:3b")
    LLM_CONNECT_TIMEOUT_SECONDS: float = float(
        os.getenv("DHAROHAR_LLM_CONNECT_TIMEOUT_SECONDS", "5.0")
    )
    LLM_REQUEST_TIMEOUT_SECONDS: float = float(
        os.getenv("DHAROHAR_LLM_REQUEST_TIMEOUT_SECONDS", "60.0")
    )
    LLM_TEMPERATURE: float = float(
        os.getenv("DHAROHAR_LLM_TEMPERATURE", "0.0")
    )


settings = Settings()

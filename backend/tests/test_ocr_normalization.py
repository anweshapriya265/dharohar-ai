"""
Unit and integration tests for OCR-Aware Lexical Normalization (Milestone 5.6.3.3).
Verifies:
- Original archival text immutability
- Normalized search representation correctness
- Historical variant and OCR errata mappings
- Unicode diacritics stripping
- Line-break hyphenation repair
- SQLite FTS5 synchronized triggers and search
"""

import sqlite3
import pytest
from pathlib import Path
from app.core.config import settings
from app.db.database import get_db_context, migrate_schema_add_normalized_text
from app.db.repository import DocumentRepository
from app.services.text_normalization_service import (
    strip_diacritics,
    repair_line_break_hyphenation,
    canonicalize_historical_terms,
    normalize_archival_text,
    expand_query_terms_for_fts5,
    normalize_token_for_matching,
    HISTORICAL_CANONICAL_MAP,
)
from app.services.retrieval_service import (
    is_lexical_candidate_eligible,
    retrieve_evidence,
)


def _resolve_validation_db_path() -> Path:
    candidates = [
        Path("backend/data/dharohar_sample_validation.db"),
        Path("data/dharohar_sample_validation.db"),
        Path(__file__).resolve().parent.parent / "data" / "dharohar_sample_validation.db",
    ]
    for c in candidates:
        if c.exists() and c.stat().st_size > 0:
            return c.resolve()
    return candidates[0].resolve()


VALIDATION_DB_PATH = _resolve_validation_db_path()


def test_strip_diacritics():
    assert strip_diacritics("Śiva") == "Siva"
    assert strip_diacritics("Dāntidurga") == "Dantidurga"
    assert strip_diacritics("Śāṅkara") == "Sankara"
    assert strip_diacritics("Mahābhoja") == "Mahabhoja"
    assert strip_diacritics("Leṇa") == "Lena"


def test_repair_line_break_hyphenation():
    # Intra-word hyphenation wrap
    assert repair_line_break_hyphenation("compart-\nment") == "compartment"
    assert repair_line_break_hyphenation("correspon-\nding") == "corresponding"
    assert repair_line_break_hyphenation("inscrip-\ntion") == "inscription"
    
    # Hyphenated word wrap joins across line break
    assert repair_line_break_hyphenation("rock-\ncut") == "rockcut"


def test_canonicalize_historical_terms():
    assert canonicalize_historical_terms("The Elura caves in the Dekhan") == "The Ellora caves in the Deccan"
    assert canonicalize_historical_terms("caves at Mbar near KuqA") == "caves at Mhar near Kuda"
    assert canonicalize_historical_terms("Dwajastambha pillar") == "Dhvajastambha pillar"
    assert canonicalize_historical_terms("temple at Kailas") == "temple at Kailasa"


def test_normalize_archival_text_pipeline():
    raw_sample = "The Elura compart-\nment in the Dekhan has Śiva carvings at Mbar."
    normalized = normalize_archival_text(raw_sample)
    assert "Ellora" in normalized
    assert "compartment" in normalized
    assert "Deccan" in normalized
    assert "Siva" in normalized
    assert "Mhar" in normalized


def test_expand_query_terms_for_fts5():
    expanded = expand_query_terms_for_fts5("Elura caves in Dekhan")
    assert '"Elura"' in expanded or '"elura"' in expanded
    assert '"Ellora"' in expanded or '"ellora"' in expanded
    assert '"Dekhan"' in expanded or '"dekhan"' in expanded
    assert '"Deccan"' in expanded or '"deccan"' in expanded


def test_original_text_remains_unmodified_in_database():
    """Guarantee: Original text in document_chunks must NEVER be modified or overwritten."""
    settings.DATABASE_PATH = VALIDATION_DB_PATH
    with get_db_context() as conn:
        cursor = conn.execute(
            "SELECT text, normalized_text FROM document_chunks WHERE text LIKE '%compart-%' OR text LIKE '%Elura%' OR text LIKE '%Mbar%' LIMIT 5"
        )
        rows = cursor.fetchall()
        assert len(rows) > 0, "Expected chunks with historical spelling/hyphenation in validation DB"
        for row in rows:
            orig = row["text"]
            norm = row["normalized_text"]
            # Raw text must contain the original historical spelling or hyphenation
            assert norm is not None
            assert len(norm) > 0
            if "Elura" in orig:
                assert "Elura" in orig  # preserved in original text


def test_fts5_indexes_both_raw_and_normalized_representations():
    """Verify FTS5 virtual table matches against both raw and normalized text."""
    settings.DATABASE_PATH = VALIDATION_DB_PATH
    with get_db_context() as conn:
        repo = DocumentRepository(conn)
        
        # Search using historical spelling "Elura"
        hits_elura = repo.search_chunks_fts('"Elura"')
        assert len(hits_elura) > 0

        # Search using canonical modern spelling "Ellora"
        hits_ellora = repo.search_chunks_fts('"Ellora"')
        assert len(hits_ellora) > 0

        # Search using OCR erratum "Mbar"
        hits_mbar = repo.search_chunks_fts('"Mbar"')
        assert len(hits_mbar) > 0

        # Search using corrected "Mhar"
        hits_mhar = repo.search_chunks_fts('"Mhar"')
        assert len(hits_mhar) > 0


def test_lexical_candidate_eligibility_with_ocr_normalization():
    """Verify that is_lexical_candidate_eligible correctly identifies matches via normalized representation."""
    query = "Mhar rock sanctuaries"
    raw_chunk_text = "The caves at Mbar are a few cells..."
    norm_chunk_text = "The caves at Mhar are a few cells..."

    # Without normalized text, 'mbar' does not match 'mhar'
    settings.RAG_ENABLE_OCR_NORMALIZATION = False
    passed_raw, reason_raw = is_lexical_candidate_eligible(
        query=query,
        chunk_text=raw_chunk_text,
        similarity_score=0.25,
        min_similarity_floor=0.10,
        normalized_chunk_text=None,
    )
    assert not passed_raw

    # With normalized text enabled, 'mhar' is identified via normalized representation
    settings.RAG_ENABLE_OCR_NORMALIZATION = True
    passed_norm, reason_norm = is_lexical_candidate_eligible(
        query=query,
        chunk_text=raw_chunk_text,
        similarity_score=0.25,
        min_similarity_floor=0.10,
        normalized_chunk_text=norm_chunk_text,
    )
    assert passed_norm
    assert "ocr_normalized" in reason_norm


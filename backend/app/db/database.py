import sqlite3
from pathlib import Path
from typing import Generator
from contextlib import contextmanager
from app.core.config import settings


def get_db_path(custom_path: Path | None = None) -> Path:
    target = custom_path or settings.DATABASE_PATH
    target.parent.mkdir(parents=True, exist_ok=True)
    return target


def create_connection(db_path: Path | None = None) -> sqlite3.Connection:
    path = get_db_path(db_path)
    conn = sqlite3.connect(str(path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


@contextmanager
def get_db_context(db_path: Path | None = None) -> Generator[sqlite3.Connection, None, None]:
    conn = create_connection(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def migrate_schema_add_dual_pagination(conn: sqlite3.Connection) -> None:
    """
    Non-destructive, idempotent migration to add dual pagination columns (pdf_page_index, printed_page_label)
    to existing SQLite databases, populating pdf_page_index with existing page_number.
    """
    tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}

    # 1. Documents table: indexing_status
    if "documents" in tables:
        doc_cols = {row["name"] for row in conn.execute("PRAGMA table_info(documents)").fetchall()}
        if "indexing_status" not in doc_cols:
            conn.execute(
                "ALTER TABLE documents ADD COLUMN indexing_status TEXT DEFAULT 'unindexed';"
            )

    # 2. Document_pages table: pdf_page_index and printed_page_label
    if "document_pages" in tables:
        page_cols = {row["name"] for row in conn.execute("PRAGMA table_info(document_pages)").fetchall()}
        if "pdf_page_index" not in page_cols:
            conn.execute("ALTER TABLE document_pages ADD COLUMN pdf_page_index INTEGER;")
            conn.execute("UPDATE document_pages SET pdf_page_index = page_number WHERE pdf_page_index IS NULL;")
        if "printed_page_label" not in page_cols:
            conn.execute("ALTER TABLE document_pages ADD COLUMN printed_page_label TEXT;")

    # 3. Document_chunks table: pdf_page_index and printed_page_label
    if "document_chunks" in tables:
        chunk_cols = {row["name"] for row in conn.execute("PRAGMA table_info(document_chunks)").fetchall()}
        if "pdf_page_index" not in chunk_cols:
            conn.execute("ALTER TABLE document_chunks ADD COLUMN pdf_page_index INTEGER;")
            conn.execute("UPDATE document_chunks SET pdf_page_index = page_number WHERE pdf_page_index IS NULL;")
        if "printed_page_label" not in chunk_cols:
            conn.execute("ALTER TABLE document_chunks ADD COLUMN printed_page_label TEXT;")


def is_fts5_available(conn: sqlite3.Connection) -> bool:
    """Checks whether SQLite FTS5 extension is enabled and usable in current build."""
    try:
        conn.execute("CREATE VIRTUAL TABLE IF NOT EXISTS _fts5_test USING fts5(x);")
        conn.execute("DROP TABLE IF EXISTS _fts5_test;")
        return True
    except Exception:
        return False


def migrate_schema_add_normalized_text(conn: sqlite3.Connection) -> None:
    """
    Non-destructive, idempotent migration to add normalized_text column to document_chunks
    and synchronize SQLite FTS5 index across (text, normalized_text).
    Preserves original archival text in `text` untouched.
    """
    from app.services.text_normalization_service import normalize_archival_text

    tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "document_chunks" not in tables:
        return

    # 1. Add normalized_text column to document_chunks if missing
    chunk_cols = {row["name"] for row in conn.execute("PRAGMA table_info(document_chunks)").fetchall()}
    if "normalized_text" not in chunk_cols:
        conn.execute("ALTER TABLE document_chunks ADD COLUMN normalized_text TEXT;")

    # 2. Backfill unnormalized chunks
    unnorm_rows = conn.execute("SELECT id, text FROM document_chunks WHERE normalized_text IS NULL").fetchall()
    if unnorm_rows:
        updates = [(normalize_archival_text(r[1]), r[0]) for r in unnorm_rows]
        conn.executemany("UPDATE document_chunks SET normalized_text = ? WHERE id = ?", updates)

    # 3. Upgrade document_chunks_fts to index normalized_text if not already present
    if not is_fts5_available(conn):
        return

    fts_cols = {row[1] for row in conn.execute("PRAGMA table_info(document_chunks_fts)").fetchall()} if "document_chunks_fts" in tables else set()
    needs_fts_upgrade = ("document_chunks_fts" not in tables) or ("normalized_text" not in fts_cols)

    if needs_fts_upgrade:
        conn.executescript(
            """
            DROP TRIGGER IF EXISTS trg_document_chunks_insert;
            DROP TRIGGER IF EXISTS trg_document_chunks_delete;
            DROP TRIGGER IF EXISTS trg_document_chunks_update;
            DROP TABLE IF EXISTS document_chunks_fts;

            CREATE VIRTUAL TABLE document_chunks_fts USING fts5(
                chunk_id UNINDEXED,
                document_id UNINDEXED,
                text,
                normalized_text,
                tokenize = 'unicode61 remove_diacritics 2'
            );

            CREATE TRIGGER trg_document_chunks_insert AFTER INSERT ON document_chunks
            BEGIN
                INSERT INTO document_chunks_fts (chunk_id, document_id, text, normalized_text)
                VALUES (new.id, new.document_id, new.text, new.normalized_text);
            END;

            CREATE TRIGGER trg_document_chunks_delete AFTER DELETE ON document_chunks
            BEGIN
                DELETE FROM document_chunks_fts WHERE chunk_id = old.id;
            END;

            CREATE TRIGGER trg_document_chunks_update AFTER UPDATE ON document_chunks
            BEGIN
                DELETE FROM document_chunks_fts WHERE chunk_id = old.id;
                INSERT INTO document_chunks_fts (chunk_id, document_id, text, normalized_text)
                VALUES (
                    new.id,
                    new.document_id,
                    new.text,
                    CASE WHEN new.text != old.text AND (new.normalized_text IS NULL OR new.normalized_text = old.normalized_text)
                         THEN new.text
                         ELSE COALESCE(new.normalized_text, new.text)
                    END
                );
            END;
            """
        )

    # 4. Backfill any chunks present in document_chunks but missing from document_chunks_fts
    conn.execute(
        """
        INSERT INTO document_chunks_fts (chunk_id, document_id, text, normalized_text)
        SELECT id, document_id, text, COALESCE(normalized_text, text) FROM document_chunks
        WHERE id NOT IN (SELECT chunk_id FROM document_chunks_fts);
        """
    )


def migrate_schema_add_fts5(conn: sqlite3.Connection) -> None:
    """
    Non-destructive, idempotent migration to create and synchronize SQLite FTS5 index
    for document_chunks. Creates automatic synchronization triggers on insert, update,
    and delete, and backfills any unindexed chunks.
    Now delegates to migrate_schema_add_normalized_text to index both original and normalized representations.
    """
    migrate_schema_add_normalized_text(conn)


def init_db(db_path: Path | None = None) -> None:
    with get_db_context(db_path) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                original_filename TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                content_type TEXT NOT NULL,
                upload_timestamp TEXT NOT NULL,
                processing_status TEXT NOT NULL,
                extraction_status TEXT NOT NULL,
                page_count INTEGER NOT NULL,
                storage_path TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS document_pages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT NOT NULL,
                page_number INTEGER NOT NULL,
                pdf_page_index INTEGER NOT NULL DEFAULT 1,
                printed_page_label TEXT,
                text TEXT NOT NULL,
                character_count INTEGER NOT NULL,
                word_count INTEGER NOT NULL,
                extraction_status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
                UNIQUE (document_id, page_number)
            );

            CREATE TABLE IF NOT EXISTS document_chunks (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                page_number INTEGER NOT NULL,
                pdf_page_index INTEGER NOT NULL DEFAULT 1,
                printed_page_label TEXT,
                chunk_index INTEGER NOT NULL,
                text TEXT NOT NULL,
                normalized_text TEXT,
                character_count INTEGER NOT NULL,
                word_count INTEGER NOT NULL,
                embedding BLOB,
                created_at TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
                UNIQUE (document_id, page_number, chunk_index)
            );

            CREATE INDEX IF NOT EXISTS idx_doc_pages_doc_id ON document_pages(document_id);
            CREATE INDEX IF NOT EXISTS idx_documents_timestamp ON documents(upload_timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON document_chunks(document_id);
            CREATE INDEX IF NOT EXISTS idx_chunks_page ON document_chunks(document_id, page_number);

            -- SRS Heritage Archive Entities
            CREATE TABLE IF NOT EXISTS heritage_records (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                heritage_type TEXT NOT NULL,
                region TEXT NOT NULL,
                language TEXT NOT NULL DEFAULT 'English',
                period TEXT,
                latitude REAL,
                longitude REAL,
                location_name TEXT,
                location_source TEXT,
                visibility TEXT NOT NULL DEFAULT 'public',
                status TEXT NOT NULL DEFAULT 'approved',
                created_by TEXT NOT NULL DEFAULT 'IITGN Explorer Fellow',
                original_filename TEXT,
                file_type TEXT,
                file_size INTEGER DEFAULT 0,
                storage_path TEXT,
                thumbnail_url TEXT,
                tags TEXT,
                source_attribution TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS ai_suggestions (
                id TEXT PRIMARY KEY,
                record_id TEXT NOT NULL,
                field_name TEXT NOT NULL,
                suggested_value TEXT NOT NULL,
                confidence REAL NOT NULL,
                model_name TEXT NOT NULL,
                evidence TEXT,
                review_status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL,
                FOREIGN KEY (record_id) REFERENCES heritage_records (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS review_events (
                id TEXT PRIMARY KEY,
                record_id TEXT NOT NULL,
                reviewer_name TEXT NOT NULL,
                reviewer_role TEXT NOT NULL,
                action TEXT NOT NULL,
                comment TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (record_id) REFERENCES heritage_records (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                actor_name TEXT NOT NULL,
                actor_role TEXT NOT NULL,
                action TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                details TEXT,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_records_status ON heritage_records(status);
            CREATE INDEX IF NOT EXISTS idx_records_type ON heritage_records(heritage_type);
            CREATE INDEX IF NOT EXISTS idx_records_region ON heritage_records(region);
            CREATE INDEX IF NOT EXISTS idx_records_coords ON heritage_records(latitude, longitude);
            CREATE INDEX IF NOT EXISTS idx_suggestions_record ON ai_suggestions(record_id);
            CREATE INDEX IF NOT EXISTS idx_review_events_record ON review_events(record_id);
            CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
            """
        )

        migrate_schema_add_dual_pagination(conn)

        conn.executescript(
            """
            CREATE INDEX IF NOT EXISTS idx_doc_pages_pdf_index ON document_pages(document_id, pdf_page_index);
            CREATE INDEX IF NOT EXISTS idx_chunks_pdf_index ON document_chunks(document_id, pdf_page_index);
            """
        )

        migrate_schema_add_fts5(conn)

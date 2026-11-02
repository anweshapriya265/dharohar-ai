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
                chunk_index INTEGER NOT NULL,
                text TEXT NOT NULL,
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

        # Non-destructive migration for existing documents table:
        columns_cursor = conn.execute("PRAGMA table_info(documents)")
        existing_cols = {row["name"] for row in columns_cursor.fetchall()}
        if "indexing_status" not in existing_cols:
            conn.execute(
                "ALTER TABLE documents ADD COLUMN indexing_status TEXT DEFAULT 'unindexed';"
            )

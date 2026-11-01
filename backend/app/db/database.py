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
            """
        )

        # Non-destructive migration for existing documents table:
        # Check if indexing_status column exists in documents
        columns_cursor = conn.execute("PRAGMA table_info(documents)")
        existing_cols = {row["name"] for row in columns_cursor.fetchall()}
        if "indexing_status" not in existing_cols:
            conn.execute(
                "ALTER TABLE documents ADD COLUMN indexing_status TEXT DEFAULT 'unindexed';"
            )

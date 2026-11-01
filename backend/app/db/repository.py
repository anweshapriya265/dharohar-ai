import sqlite3
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class DocumentRepository:
    """
    Data Access Object (DAO) isolating database operations from the API layer.
    Enables future substitution of SQLite with other persistence engines.
    """

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn

    def insert_document(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        now = utc_now_iso()
        created_at = doc.get("created_at") or now
        updated_at = doc.get("updated_at") or now
        indexing_status = doc.get("indexing_status") or "unindexed"

        query = """
        INSERT INTO documents (
            id, original_filename, file_size, content_type,
            upload_timestamp, processing_status, extraction_status,
            page_count, storage_path, created_at, updated_at, indexing_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        self.conn.execute(
            query,
            (
                doc["id"],
                doc["original_filename"],
                doc["file_size"],
                doc["content_type"],
                doc["upload_timestamp"],
                doc["processing_status"],
                doc["extraction_status"],
                doc["page_count"],
                doc["storage_path"],
                created_at,
                updated_at,
                indexing_status,
            ),
        )
        return self.get_document_by_id(doc["id"]) or doc

    def insert_pages(self, pages: List[Dict[str, Any]]) -> None:
        if not pages:
            return

        now = utc_now_iso()
        query = """
        INSERT INTO document_pages (
            document_id, page_number, text, character_count,
            word_count, extraction_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        rows = [
            (
                p["document_id"],
                p["page_number"],
                p["text"],
                p["character_count"],
                p["word_count"],
                p["extraction_status"],
                p.get("created_at") or now,
            )
            for p in pages
        ]
        self.conn.executemany(query, rows)

    def get_document_by_id(self, doc_id: str) -> Optional[Dict[str, Any]]:
        cursor = self.conn.execute(
            "SELECT * FROM documents WHERE id = ?",
            (doc_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return dict(row)

    def list_documents(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        cursor = self.conn.execute(
            """
            SELECT * FROM documents
            ORDER BY upload_timestamp DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        )
        return [dict(row) for row in cursor.fetchall()]

    def count_documents(self) -> int:
        cursor = self.conn.execute("SELECT COUNT(*) as count FROM documents")
        row = cursor.fetchone()
        return row["count"] if row else 0

    def get_document_pages(self, doc_id: str) -> List[Dict[str, Any]]:
        cursor = self.conn.execute(
            """
            SELECT id, document_id, page_number, text, character_count, word_count, extraction_status, created_at
            FROM document_pages
            WHERE document_id = ?
            ORDER BY page_number ASC
            """,
            (doc_id,),
        )
        return [dict(row) for row in cursor.fetchall()]

    def delete_document(self, doc_id: str) -> bool:
        cursor = self.conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        return cursor.rowcount > 0

    # --- Milestone 3: Chunking & Semantic Search Storage ---

    def delete_chunks_for_document(self, doc_id: str) -> int:
        """
        Removes all existing chunks for a document to ensure idempotent re-indexing.
        """
        cursor = self.conn.execute("DELETE FROM document_chunks WHERE document_id = ?", (doc_id,))
        return cursor.rowcount

    def insert_chunks(self, chunks: List[Dict[str, Any]]) -> None:
        """
        Persists a batch of document chunks and their embedding vector blobs.
        """
        if not chunks:
            return

        now = utc_now_iso()
        query = """
        INSERT INTO document_chunks (
            id, document_id, page_number, chunk_index, text,
            character_count, word_count, embedding, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        rows = [
            (
                c["id"],
                c["document_id"],
                c["page_number"],
                c["chunk_index"],
                c["text"],
                c["character_count"],
                c["word_count"],
                c.get("embedding"),
                c.get("created_at") or now,
            )
            for c in chunks
        ]
        self.conn.executemany(query, rows)

    def get_chunks_for_document(self, doc_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves all chunks for a document ordered by page and chunk index.
        Omits raw embedding bytes from default output for lightweight responses.
        """
        cursor = self.conn.execute(
            """
            SELECT id, document_id, page_number, chunk_index, text,
                   character_count, word_count, created_at,
                   (embedding IS NOT NULL) AS has_embedding
            FROM document_chunks
            WHERE document_id = ?
            ORDER BY page_number ASC, chunk_index ASC
            """,
            (doc_id,),
        )
        return [dict(row) for row in cursor.fetchall()]

    def count_chunks(self, doc_id: Optional[str] = None) -> int:
        if doc_id:
            cursor = self.conn.execute(
                "SELECT COUNT(*) as count FROM document_chunks WHERE document_id = ?",
                (doc_id,),
            )
        else:
            cursor = self.conn.execute("SELECT COUNT(*) as count FROM document_chunks")
        row = cursor.fetchone()
        return row["count"] if row else 0

    def update_document_indexing_status(self, doc_id: str, status: str) -> None:
        now = utc_now_iso()
        self.conn.execute(
            """
            UPDATE documents
            SET indexing_status = ?, updated_at = ?
            WHERE id = ?
            """,
            (status, now, doc_id),
        )

    def get_all_chunks_with_embeddings(
        self, document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves all stored chunks that possess an embedding vector,
        joined with the parent document's original filename for source attribution.
        Optionally filters by a list of document IDs.
        """
        if document_ids is not None:
            if not document_ids:
                return []
            placeholders = ",".join(["?"] * len(document_ids))
            query = f"""
            SELECT c.id, c.document_id, c.page_number, c.chunk_index, c.text,
                   c.character_count, c.word_count, c.embedding,
                   d.original_filename
            FROM document_chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE c.embedding IS NOT NULL AND c.document_id IN ({placeholders})
            ORDER BY c.document_id, c.page_number, c.chunk_index
            """
            cursor = self.conn.execute(query, tuple(document_ids))
        else:
            query = """
            SELECT c.id, c.document_id, c.page_number, c.chunk_index, c.text,
                   c.character_count, c.word_count, c.embedding,
                   d.original_filename
            FROM document_chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE c.embedding IS NOT NULL
            ORDER BY c.document_id, c.page_number, c.chunk_index
            """
            cursor = self.conn.execute(query)
        return [dict(row) for row in cursor.fetchall()]

    def search_chunks_keyword(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Fallback keyword search matching exact terms in chunks.
        """
        terms = [t.strip() for t in query.split() if t.strip()]
        if not terms:
            return []
        
        # Build LIKE expressions
        likes = " AND ".join(["c.text LIKE ?"] * len(terms))
        params = [f"%{term}%" for term in terms] + [limit]
        
        sql = f"""
        SELECT c.id, c.document_id, c.page_number, c.chunk_index, c.text,
               c.character_count, c.word_count, d.original_filename
        FROM document_chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE {likes}
        LIMIT ?
        """
        cursor = self.conn.execute(sql, params)
        return [dict(row) for row in cursor.fetchall()]

import sqlite3
import uuid
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

    # --- SRS Heritage Archive Platform Entities ---

    def insert_heritage_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        now = utc_now_iso()
        rec_id = record.get("id") or str(uuid.uuid4())
        created_at = record.get("created_at") or now
        updated_at = record.get("updated_at") or now

        query = """
        INSERT OR REPLACE INTO heritage_records (
            id, title, description, heritage_type, region, language,
            period, latitude, longitude, location_name, location_source,
            visibility, status, created_by, original_filename, file_type,
            file_size, storage_path, thumbnail_url, tags, source_attribution,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        self.conn.execute(
            query,
            (
                rec_id,
                record["title"],
                record.get("description", ""),
                record.get("heritage_type", "Monument"),
                record.get("region", "India"),
                record.get("language", "English"),
                record.get("period", ""),
                record.get("latitude"),
                record.get("longitude"),
                record.get("location_name", ""),
                record.get("location_source", "IITGN Explorer Fieldwork"),
                record.get("visibility", "public"),
                record.get("status", "approved"),
                record.get("created_by", "IITGN Explorer Fellow"),
                record.get("original_filename", ""),
                record.get("file_type", "pdf"),
                record.get("file_size", 0),
                record.get("storage_path", ""),
                record.get("thumbnail_url", ""),
                record.get("tags", ""),
                record.get("source_attribution", "IIT Gandhinagar Cultural Archives"),
                created_at,
                updated_at,
            ),
        )
        return self.get_heritage_record_by_id(rec_id) or record

    def get_heritage_record_by_id(self, record_id: str) -> Optional[Dict[str, Any]]:
        cursor = self.conn.execute("SELECT * FROM heritage_records WHERE id = ?", (record_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def list_heritage_records(
        self,
        heritage_type: Optional[str] = None,
        region: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        clauses = []
        params = []
        if heritage_type and heritage_type.lower() != "all":
            clauses.append("heritage_type = ?")
            params.append(heritage_type)
        if region and region.lower() != "all":
            clauses.append("region = ?")
            params.append(region)
        if status and status.lower() != "all":
            clauses.append("status = ?")
            params.append(status)
        if search and search.strip():
            clauses.append("(title LIKE ? OR description LIKE ? OR tags LIKE ? OR location_name LIKE ?)")
            kw = f"%{search.strip()}%"
            params.extend([kw, kw, kw, kw])

        where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = f"""
        SELECT * FROM heritage_records
        {where_sql}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """
        params.extend([limit, offset])
        cursor = self.conn.execute(sql, tuple(params))
        return [dict(r) for r in cursor.fetchall()]

    def count_heritage_records(
        self,
        heritage_type: Optional[str] = None,
        region: Optional[str] = None,
        status: Optional[str] = None,
    ) -> int:
        clauses = []
        params = []
        if heritage_type and heritage_type.lower() != "all":
            clauses.append("heritage_type = ?")
            params.append(heritage_type)
        if region and region.lower() != "all":
            clauses.append("region = ?")
            params.append(region)
        if status and status.lower() != "all":
            clauses.append("status = ?")
            params.append(status)

        where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        cursor = self.conn.execute(f"SELECT COUNT(*) as c FROM heritage_records {where_sql}", tuple(params))
        row = cursor.fetchone()
        return row["c"] if row else 0

    def update_heritage_record(self, record_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        allowed_cols = {
            "title", "description", "heritage_type", "region", "language",
            "period", "latitude", "longitude", "location_name", "location_source",
            "visibility", "status", "tags", "source_attribution"
        }
        filtered = {k: v for k, v in updates.items() if k in allowed_cols}
        if not filtered:
            return self.get_heritage_record_by_id(record_id)

        filtered["updated_at"] = utc_now_iso()
        set_expr = ", ".join([f"{k} = ?" for k in filtered.keys()])
        values = list(filtered.values()) + [record_id]
        self.conn.execute(f"UPDATE heritage_records SET {set_expr} WHERE id = ?", tuple(values))
        return self.get_heritage_record_by_id(record_id)

    def delete_heritage_record(self, record_id: str) -> bool:
        cursor = self.conn.execute("DELETE FROM heritage_records WHERE id = ?", (record_id,))
        return cursor.rowcount > 0

    def get_geotagged_records(self) -> List[Dict[str, Any]]:
        cursor = self.conn.execute(
            """
            SELECT id, title, description, heritage_type, region, period,
                   latitude, longitude, location_name, status, thumbnail_url, tags
            FROM heritage_records
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            ORDER BY title ASC
            """
        )
        return [dict(r) for r in cursor.fetchall()]

    def insert_ai_suggestions(self, suggestions: List[Dict[str, Any]]) -> None:
        if not suggestions:
            return
        now = utc_now_iso()
        query = """
        INSERT INTO ai_suggestions (
            id, record_id, field_name, suggested_value, confidence,
            model_name, evidence, review_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        rows = [
            (
                s.get("id") or str(uuid.uuid4()),
                s["record_id"],
                s["field_name"],
                s["suggested_value"],
                s.get("confidence", 0.85),
                s.get("model_name", "all-MiniLM-L6-v2 + Heuristic NER"),
                s.get("evidence", ""),
                s.get("review_status", "pending"),
                s.get("created_at") or now,
            )
            for s in suggestions
        ]
        self.conn.executemany(query, rows)

    def get_ai_suggestions_for_record(self, record_id: str) -> List[Dict[str, Any]]:
        cursor = self.conn.execute(
            "SELECT * FROM ai_suggestions WHERE record_id = ? ORDER BY field_name ASC",
            (record_id,)
        )
        return [dict(r) for r in cursor.fetchall()]

    def update_ai_suggestion_status(self, suggestion_id: str, status: str) -> None:
        self.conn.execute(
            "UPDATE ai_suggestions SET review_status = ? WHERE id = ?",
            (status, suggestion_id)
        )

    def insert_review_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        now = utc_now_iso()
        ev_id = event.get("id") or str(uuid.uuid4())
        self.conn.execute(
            """
            INSERT INTO review_events (
                id, record_id, reviewer_name, reviewer_role, action, comment, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                ev_id,
                event["record_id"],
                event.get("reviewer_name", "Lead Cultural Curator"),
                event.get("reviewer_role", "Reviewer"),
                event["action"],
                event.get("comment", ""),
                now
            )
        )
        return {"id": ev_id, **event, "created_at": now}

    def get_review_events_for_record(self, record_id: str) -> List[Dict[str, Any]]:
        cursor = self.conn.execute(
            "SELECT * FROM review_events WHERE record_id = ? ORDER BY created_at DESC",
            (record_id,)
        )
        return [dict(r) for r in cursor.fetchall()]

    def insert_audit_log(
        self,
        actor_name: str,
        actor_role: str,
        action: str,
        entity_type: str,
        entity_id: str,
        details: str = ""
    ) -> None:
        now = utc_now_iso()
        self.conn.execute(
            """
            INSERT INTO audit_logs (
                id, actor_name, actor_role, action, entity_type, entity_id, details, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (str(uuid.uuid4()), actor_name, actor_role, action, entity_type, entity_id, details, now)
        )

    def list_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        cursor = self.conn.execute(
            "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?",
            (limit,)
        )
        return [dict(r) for r in cursor.fetchall()]

    def get_admin_dashboard_metrics(self) -> Dict[str, Any]:
        total_records = self.count_heritage_records()
        pending_review = self.count_heritage_records(status="pending_review")
        approved = self.count_heritage_records(status="approved")
        geotagged = len(self.get_geotagged_records())
        recent_logs = self.list_audit_logs(limit=10)
        return {
            "total_records": total_records,
            "pending_review": pending_review,
            "approved_records": approved,
            "geotagged_sites": geotagged,
            "recent_audit_logs": recent_logs,
        }

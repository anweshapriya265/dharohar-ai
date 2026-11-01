import uuid
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Query, Depends
from pydantic import BaseModel
from app.core.config import settings
from app.db.database import get_db_context
from app.db.repository import DocumentRepository, utc_now_iso
from app.services.pdf_service import (
    validate_file_metadata,
    save_and_validate_stream,
    extract_pdf_content,
)
from app.services.search_service import index_document

router = APIRouter(prefix="/api/documents", tags=["documents"])


# --- Schemas ---

class DocumentResponse(BaseModel):
    id: str
    original_filename: str
    file_size: int
    content_type: str
    upload_timestamp: str
    processing_status: str
    extraction_status: str
    page_count: int
    storage_reference: str
    created_at: str
    updated_at: str
    indexing_status: Optional[str] = "unindexed"


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int


class PageResponse(BaseModel):
    page_number: int
    text: str
    character_count: int
    word_count: int
    extraction_status: str
    created_at: str


class DocumentPagesResponse(BaseModel):
    document_id: str
    total_pages: int
    pages: List[PageResponse]


class IndexResponse(BaseModel):
    document_id: str
    original_filename: str
    chunks_created: int
    status: str
    message: str


class ChunkItemResponse(BaseModel):
    id: str
    document_id: str
    page_number: int
    chunk_index: int
    text: str
    character_count: int
    word_count: int
    has_embedding: bool
    created_at: str


class DocumentChunksResponse(BaseModel):
    document_id: str
    total_chunks: int
    chunks: List[ChunkItemResponse]


def map_doc_to_response(doc: dict) -> DocumentResponse:
    storage_ref = f"{doc['id']}.pdf"
    return DocumentResponse(
        id=doc["id"],
        original_filename=doc["original_filename"],
        file_size=doc["file_size"],
        content_type=doc["content_type"],
        upload_timestamp=doc["upload_timestamp"],
        processing_status=doc["processing_status"],
        extraction_status=doc["extraction_status"],
        page_count=doc["page_count"],
        storage_reference=storage_ref,
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        indexing_status=doc.get("indexing_status") or "unindexed",
    )


# --- Endpoints ---

@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and ingest a heritage PDF document",
)
async def upload_document(
    file: UploadFile = File(..., description="The PDF document to ingest"),
):
    # 1. Validate extension and content type
    original_filename = validate_file_metadata(file)

    # 2. Generate server-side document ID and safe storage path
    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    safe_storage_filename = f"{doc_id}.pdf"
    dest_path = settings.UPLOAD_DIR / safe_storage_filename

    # 3. Stream file, validate PDF signature (%PDF-) and enforce size limit
    file_size = await save_and_validate_stream(file, dest_path, settings.MAX_UPLOAD_SIZE_BYTES)

    # 4. Extract PDF text per page (1-based page numbering)
    try:
        page_count, extraction_status, pages = extract_pdf_content(dest_path, doc_id)
    except Exception:
        # Clean up storage on extraction failure
        if dest_path.exists():
            try:
                dest_path.unlink()
            except OSError:
                pass
        raise

    # 5. Persist document metadata and page records to SQLite
    now = utc_now_iso()
    doc_record = {
        "id": doc_id,
        "original_filename": original_filename,
        "file_size": file_size,
        "content_type": "application/pdf",
        "upload_timestamp": now,
        "processing_status": "completed",
        "extraction_status": extraction_status,
        "page_count": page_count,
        "storage_path": safe_storage_filename,
        "created_at": now,
        "updated_at": now,
        "indexing_status": "pending",
    }

    with get_db_context() as conn:
        repo = DocumentRepository(conn)
        repo.insert_document(doc_record)
        repo.insert_pages(pages)

    # 6. Milestone 3: Automatically index document chunks & embeddings
    try:
        index_document(doc_id)
    except Exception:
        # Indexing error does not roll back upload, but marks indexing_status as failed
        with get_db_context() as conn:
            repo = DocumentRepository(conn)
            repo.update_document_indexing_status(doc_id, "indexing_failed")

    with get_db_context() as conn:
        repo = DocumentRepository(conn)
        final_doc = repo.get_document_by_id(doc_id)

    return map_doc_to_response(final_doc or doc_record)


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List all uploaded documents",
)
def list_documents(
    limit: int = Query(50, ge=1, le=200, description="Max documents to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
):
    with get_db_context() as conn:
        repo = DocumentRepository(conn)
        docs = repo.list_documents(limit=limit, offset=offset)
        total = repo.count_documents()

    return DocumentListResponse(
        documents=[map_doc_to_response(d) for d in docs],
        total=total,
    )


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Retrieve document metadata by ID",
)
def get_document(document_id: str):
    with get_db_context() as conn:
        repo = DocumentRepository(conn)
        doc = repo.get_document_by_id(document_id)

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found.",
        )

    return map_doc_to_response(doc)


@router.get(
    "/{document_id}/pages",
    response_model=DocumentPagesResponse,
    summary="Retrieve extracted text for all pages of a document",
)
def get_document_pages(document_id: str):
    with get_db_context() as conn:
        repo = DocumentRepository(conn)
        doc = repo.get_document_by_id(document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{document_id}' not found.",
            )
        pages = repo.get_document_pages(document_id)

    return DocumentPagesResponse(
        document_id=document_id,
        total_pages=len(pages),
        pages=[
            PageResponse(
                page_number=p["page_number"],
                text=p["text"],
                character_count=p["character_count"],
                word_count=p["word_count"],
                extraction_status=p["extraction_status"],
                created_at=p["created_at"],
            )
            for p in pages
        ],
    )


@router.post(
    "/{document_id}/index",
    response_model=IndexResponse,
    summary="Index a document's extracted pages into searchable chunks with embeddings",
)
def index_document_endpoint(document_id: str):
    result = index_document(document_id)
    return IndexResponse(
        document_id=result["document_id"],
        original_filename=result["original_filename"],
        chunks_created=result["chunks_created"],
        status=result["status"],
        message=result["message"],
    )


@router.get(
    "/{document_id}/chunks",
    response_model=DocumentChunksResponse,
    summary="Inspect indexed chunks for debugging and source verification",
)
def get_document_chunks(document_id: str):
    with get_db_context() as conn:
        repo = DocumentRepository(conn)
        doc = repo.get_document_by_id(document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{document_id}' not found.",
            )
        chunks = repo.get_chunks_for_document(document_id)

    return DocumentChunksResponse(
        document_id=document_id,
        total_chunks=len(chunks),
        chunks=[
            ChunkItemResponse(
                id=c["id"],
                document_id=c["document_id"],
                page_number=c["page_number"],
                chunk_index=c["chunk_index"],
                text=c["text"],
                character_count=c["character_count"],
                word_count=c["word_count"],
                has_embedding=bool(c["has_embedding"]),
                created_at=c["created_at"],
            )
            for c in chunks
        ],
    )

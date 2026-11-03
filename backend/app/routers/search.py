from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, status
from pydantic import BaseModel, Field
from app.core.config import settings
from app.services.search_service import search_archive

router = APIRouter(prefix="/api/search", tags=["search"])


class SearchRequest(BaseModel):
    query: str = Field(..., description="Natural language search query")
    limit: Optional[int] = Field(settings.DEFAULT_SEARCH_LIMIT, ge=1, le=50, description="Max results")
    min_score: Optional[float] = Field(0.0, ge=-1.0, le=1.0, description="Minimum cosine similarity")
    retrieval_mode: Optional[str] = Field(None, description="Retrieval mode: hybrid, dense, or lexical")


class SearchResultItem(BaseModel):
    chunk_id: str
    document_id: str
    original_filename: str
    document_title: Optional[str] = None
    page_number: int
    pdf_page_index: int = 1
    printed_page_label: Optional[str] = None
    citation_display: Optional[str] = None
    chunk_index: int
    text: str
    character_count: int
    word_count: int
    similarity_score: float
    source_citation: str
    rrf_score: Optional[float] = None
    retrieval_source: Optional[str] = None


class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResultItem]
    search_mode: str
    message: Optional[str] = None


@router.post(
    "",
    response_model=SearchResponse,
    summary="Semantic vector search across indexed heritage archive documents",
)
def search_documents(request: SearchRequest):
    return search_archive(
        query=request.query,
        limit=request.limit or settings.DEFAULT_SEARCH_LIMIT,
        min_score=request.min_score or 0.0,
        retrieval_mode=request.retrieval_mode,
    )

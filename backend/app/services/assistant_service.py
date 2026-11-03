import logging
from typing import Dict, Any, List, Optional, Tuple
from fastapi import HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.db.database import get_db_context
from app.db.repository import DocumentRepository
from app.services.retrieval_service import retrieve_evidence
from app.services.llm_service import (
    BaseLLMProvider,
    generate_grounded_answer,
    get_llm_provider,
)

logger = logging.getLogger(__name__)

MAX_QUESTION_LENGTH = 1000
MAX_DOCUMENT_IDS = 20


# ---------------------------------------------------------------------------
# Pydantic Schemas for Request & Response
# ---------------------------------------------------------------------------

class AssistantAskRequest(BaseModel):
    """User request payload for the evidence-grounded heritage assistant."""
    question: str = Field(
        ...,
        description="Natural language heritage inquiry.",
        examples=["Who commissioned the Kailash temple at Ellora and when was it built?"],
    )
    document_ids: Optional[List[str]] = Field(
        None,
        description="Optional list of document UUIDs to scope retrieval.",
        examples=[["doc_ellora_survey_1920"]],
    )
    retrieval_mode: Optional[str] = Field(
        None,
        description="Optional retrieval mode: hybrid, dense, or lexical.",
        examples=["hybrid"],
    )


class ClaimEvidenceItem(BaseModel):
    """Verified archival evidence passage reference attached by the server."""
    evidence_id: str
    document_id: str
    filename: str
    document_title: Optional[str] = None
    page_number: int
    pdf_page_index: int = 1
    printed_page_label: Optional[str] = None
    citation_display: Optional[str] = None
    source_citation: str
    citation_valid: bool = True
    semantic_support: str = "not_independently_verified"
    rrf_score: Optional[float] = None
    retrieval_source: Optional[str] = None
    supported_subqueries: Optional[List[str]] = None


class AssistantClaim(BaseModel):
    """Structured factual claim supported by server-verified evidence."""
    text: str
    evidence_ids: List[str]
    source_citations: List[str]
    evidence: List[ClaimEvidenceItem]


class ConflictPerspective(BaseModel):
    """One perspective in a recorded historical contradiction."""
    claim: str
    evidence_ids: List[str]
    citations: List[str]


class AssistantConflict(BaseModel):
    """Documented disagreement across distinct archival sources."""
    topic: str
    perspective_a: ConflictPerspective
    perspective_b: ConflictPerspective


class AssistantAskResponse(BaseModel):
    """Structured, verified response from the DHAROHAR AI Assistant."""
    question: str
    answer: Optional[str] = None
    grounding_state: str = Field(
        ...,
        description="Grounding classification: grounded, partial, conflicting_evidence, insufficient_evidence, provider_unavailable, or malformed_output.",
    )
    claims: List[AssistantClaim] = []
    missing_information: List[str] = []
    conflicts: List[AssistantConflict] = []
    verified_citations: List[str] = []
    has_sufficient_evidence: bool = True
    error: Optional[str] = None
    limitations: List[str] = [
        "Claims are attributed to cited archival passages; semantic entailment is not independently verified."
    ]
    provider_info: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Validation Helpers
# ---------------------------------------------------------------------------

def validate_ask_request(request: AssistantAskRequest) -> Tuple[str, Optional[List[str]]]:
    """
    Validates user question and optional document ID filters.
    Rejects empty, whitespace-only, or oversized questions.
    Verifies that all specified document IDs exist in the database repository.
    """
    cleaned_question = (request.question or "").strip()
    if not cleaned_question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty or whitespace only.",
        )

    if len(cleaned_question) > MAX_QUESTION_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Question exceeds maximum allowed length of {MAX_QUESTION_LENGTH} characters.",
        )

    cleaned_doc_ids: Optional[List[str]] = None
    if request.document_ids is not None:
        if len(request.document_ids) > MAX_DOCUMENT_IDS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum of {MAX_DOCUMENT_IDS} document IDs may be specified for filtering.",
            )

        with get_db_context() as conn:
            repo = DocumentRepository(conn)
            cleaned_doc_ids = []
            for doc_id in request.document_ids:
                cid = (doc_id or "").strip()
                if not cid:
                    continue
                doc = repo.get_document_by_id(cid)
                if not doc:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Document with ID '{cid}' does not exist in the archive.",
                    )
                cleaned_doc_ids.append(cid)

    return cleaned_question, cleaned_doc_ids


# ---------------------------------------------------------------------------
# Core Assistant Orchestration Service
# ---------------------------------------------------------------------------

def ask_assistant(
    request: AssistantAskRequest,
    provider: Optional[BaseLLMProvider] = None,
) -> AssistantAskResponse:
    """
    High-level orchestrator connecting Milestone 5.1 retrieval and Milestone 5.2 generation.
    
    Pipeline:
    1. Validate request (question length, existence of document_ids).
    2. Retrieve candidate evidence chunks using retrieval_service.
    3. Short-circuit if retrieval produced no sufficient evidence (zero LLM calls).
    4. Invoke local LLM provider to produce evidence-grounded claims.
    5. Resolve citations strictly against server-held evidence map.
    6. Synthesize verified answer text and return stable response contract.
    """
    cleaned_question, cleaned_doc_ids = validate_ask_request(request)

    # 1. Retrieve evidence
    retrieval_result = retrieve_evidence(
        query=cleaned_question,
        document_ids=cleaned_doc_ids,
        retrieval_mode=request.retrieval_mode,
    )

    # 2. Check for sufficient evidence
    if not retrieval_result.get("has_sufficient_evidence", False) or not retrieval_result.get("evidence"):
        missing_reasons = ["No archival records met the relevance threshold for this inquiry."]
        comp_cov = retrieval_result.get("component_coverage")
        if comp_cov and comp_cov.get("missing_components"):
            missing_reasons = [
                f"No archival records were found for inquiry component: {mc}"
                for mc in comp_cov["missing_components"]
            ]
        return AssistantAskResponse(
            question=cleaned_question,
            answer="The archive does not contain sufficient relevant documentation to answer this inquiry.",
            grounding_state="insufficient_evidence",
            claims=[],
            missing_information=missing_reasons,
            conflicts=[],
            verified_citations=[],
            has_sufficient_evidence=False,
            provider_info={
                "provider": settings.LLM_PROVIDER,
                "model": settings.OLLAMA_MODEL,
            },
        )

    # 3. Invoke LLM generation
    active_provider = provider or get_llm_provider()
    llm_result = generate_grounded_answer(
        query=cleaned_question,
        retrieval_result=retrieval_result,
        provider=active_provider,
    )

    grounding_state = llm_result.get("grounding_state", "insufficient_evidence")
    raw_claims = llm_result.get("claims", [])
    missing_info = llm_result.get("missing_information", [])
    raw_conflicts = llm_result.get("conflicts", [])
    verified_citations = llm_result.get("verified_citations", [])
    error_msg = llm_result.get("error")
    provider_info = llm_result.get("provider_info")

    # Enforce compound-query grounding rule:
    # If a compound query is partially supported, grounding state must NOT be 'grounded'
    comp_cov = retrieval_result.get("component_coverage")
    if comp_cov and comp_cov.get("state") == "partially_supported":
        for mc in comp_cov.get("missing_components", []):
            missing_msg = f"No archival evidence was found for inquiry component: {mc}"
            if missing_msg not in missing_info:
                missing_info.append(missing_msg)
        if grounding_state == "grounded":
            grounding_state = "partial"

    # 4. Format structured claims with server-verified evidence metadata
    formatted_claims: List[AssistantClaim] = []
    for c in raw_claims:
        evidence_items = [
            ClaimEvidenceItem(
                evidence_id=s["evidence_id"],
                document_id=s["document_id"],
                filename=s["original_filename"],
                document_title=s.get("document_title") or s["original_filename"],
                page_number=s.get("page_number", s.get("pdf_page_index", 1)),
                pdf_page_index=s.get("pdf_page_index", s.get("page_number", 1)),
                printed_page_label=s.get("printed_page_label"),
                citation_display=s.get("citation_display"),
                source_citation=s["source_citation"],
                citation_valid=True,
                semantic_support="not_independently_verified",
                rrf_score=s.get("rrf_score"),
                retrieval_source=s.get("retrieval_source"),
                supported_subqueries=s.get("supported_subqueries"),
            )
            for s in c.get("sources", [])
        ]

        formatted_claims.append(
            AssistantClaim(
                text=c["text"],
                evidence_ids=c["evidence_ids"],
                source_citations=c["source_citations"],
                evidence=evidence_items,
            )
        )

    # 5. Format conflicts
    formatted_conflicts: List[AssistantConflict] = []
    for conf in raw_conflicts:
        formatted_conflicts.append(
            AssistantConflict(
                topic=conf["topic"],
                perspective_a=ConflictPerspective(
                    claim=conf["claim_a"],
                    evidence_ids=conf["evidence_ids_a"],
                    citations=conf["citations_a"],
                ),
                perspective_b=ConflictPerspective(
                    claim=conf["claim_b"],
                    evidence_ids=conf["evidence_ids_b"],
                    citations=conf["citations_b"],
                ),
            )
        )

    # 6. Synthesize verified answer text
    answer_text: Optional[str] = None
    if grounding_state == "provider_unavailable":
        answer_text = None
    elif grounding_state == "malformed_output":
        answer_text = None
    elif grounding_state == "conflicting_evidence" and formatted_conflicts:
        conflict_parts = []
        for c in formatted_conflicts:
            c_a = ", ".join(c.perspective_a.citations)
            c_b = ", ".join(c.perspective_b.citations)
            conflict_parts.append(
                f"Regarding {c.topic}: One source states that '{c.perspective_a.claim}' ({c_a}), "
                f"whereas another source records that '{c.perspective_b.claim}' ({c_b})."
            )
        if formatted_claims:
            answer_text = " ".join(c.text for c in formatted_claims) + " Differing archival accounts: " + " ".join(conflict_parts)
        else:
            answer_text = "The archive contains differing historical accounts: " + " ".join(conflict_parts)
    elif formatted_claims:
        answer_text = " ".join(c.text for c in formatted_claims)
        if missing_info and grounding_state == "partial":
            answer_text += " Note: The available records do not establish: " + "; ".join(missing_info) + "."
    elif missing_info:
        answer_text = "The available archival records do not contain this information: " + "; ".join(missing_info) + "."
    else:
        answer_text = "The archive does not contain sufficient relevant documentation to answer this inquiry."

    return AssistantAskResponse(
        question=cleaned_question,
        answer=answer_text,
        grounding_state=grounding_state,
        claims=formatted_claims,
        missing_information=missing_info,
        conflicts=formatted_conflicts,
        verified_citations=verified_citations,
        has_sufficient_evidence=True,
        error=error_msg,
        provider_info=provider_info,
    )

from fastapi import APIRouter, status
from app.services.assistant_service import (
    AssistantAskRequest,
    AssistantAskResponse,
    ask_assistant,
)

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


@router.post(
    "/ask",
    response_model=AssistantAskResponse,
    status_code=status.HTTP_200_OK,
    summary="Evidence-grounded archival inquiry answering",
    description="""
Inquires across the DHAROHAR AI cultural heritage archive using retrieval-augmented generation.

### Grounding Guarantees:
- **Server-Controlled Citations:** The LLM receives anonymized evidence IDs (`E1`, `E2`, ...). Real filenames, document IDs, and page numbers are resolved strictly on the backend.
- **Syntactic ID Validation:** Claims referencing unknown or non-existent IDs are stripped. Claims lacking valid evidence references are discarded.
- **Grounding Classifications:**
  - `grounded`: All claims supported by valid evidence passages.
  - `partial`: Valid claims established, but some aspects of the inquiry are missing from the archive.
  - `conflicting_evidence`: Contradictions exist where different archival sources support differing accounts. Both sides and their citations are preserved.
  - `insufficient_evidence`: Retrieval yielded no passages meeting the similarity threshold (no LLM calls made).
  - `provider_unavailable`: Local Ollama daemon is offline or target model is uninstalled.
  - `malformed_output`: LLM response failed JSON schema validation.

### Limitations:
- Claims are attributed to cited archival passages; semantic entailment is not independently verified by a secondary NLI model.
""",
)
def ask_heritage_assistant(request: AssistantAskRequest):
    """
    Submits a natural language heritage question to the grounded assistant engine.
    """
    return ask_assistant(request)


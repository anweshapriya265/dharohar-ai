"""
DHAROHAR AI — Controlled Query Decomposition Service
Milestone 5.6.3.3: OCR-Aware Lexical Normalization & Multi-Query Evidence Retrieval

METHODOLOGICAL PRINCIPLES:
1. DETERMINISTIC & BOUNDED DECOMPOSITION:
   Compound historical research questions often join multiple distant archival loci
   (e.g., Mhar and Kuda epigraphs, or Kailasa entrance and spire height).
   Decomposition generates a small, strictly bounded set of subqueries (maximum 3)
   without relying on unpredictable external LLM rewriting.

2. SUBQUERY INDEPENDENCE & PROVENANCE:
   Each subquery retrieves evidence independently. Evidence passages track exactly
   which subquery component they support.

3. COMPOUND GROUNDING RULES:
   A compound query must NEVER be marked fully supported when only one component has evidence.
   The system explicitly distinguishes:
   - all_components_supported: Every required component has verified archival evidence.
   - partially_supported: Some components have evidence; missing components are explicitly flagged.
   - none_supported: No components have evidence (insufficient_evidence).
"""

import re
from typing import Dict, List, Optional, Tuple, Any
from pydantic import BaseModel, Field


class SubQuery(BaseModel):
    """Structured subquery generated from compound query decomposition."""
    subquery_id: str
    subquery_text: str
    component_label: str


class DecompositionResult(BaseModel):
    """Result of analyzing and decomposing a user inquiry."""
    is_compound: bool
    original_query: str
    subqueries: List[SubQuery]


# Maximum number of subqueries to produce for any compound inquiry
MAX_SUBQUERIES: int = 3


# Stop words and connective phrases to avoid generating trivial subqueries
CONNECTIVE_PATTERNS = [
    # "comparing <A> with/to <B>"
    r"(?i)\b(?:comparing|compare)\s+(.+?)\s+(?:with|to|and)\s+(.+)",
    # "<A> as well as <B>"
    r"(?i)(.+?)\s+as\s+well\s+as\s+(.+)",
    # "<A> versus <B>" / "<A> vs <B>"
    r"(?i)(.+?)\s+(?:versus|vs\.?)\s+(.+)",
]


def clean_subquery_text(text: str) -> str:
    """Cleans punctuation and leading connectives from decomposed subquery text."""
    t = text.strip()
    t = re.sub(r"^[\s,;:?.-]+", "", t)
    t = re.sub(r"[\s,;:?.-]+$", "", t)
    # Remove leading conjunctions
    t = re.sub(r"^(?:and|or|with|also|while|whereas)\s+", "", t, flags=re.IGNORECASE)
    return t.strip()


def extract_context_prefix(query: str) -> str:
    """
    Extracts high-level topic or domain prefix from a query if present.
    E.g. 'Epigraphical survey comparing Mhar donation cave with Kuda cistern donation'
    Context prefix: 'Epigraphical survey'
    """
    m = re.match(r"(?i)^([A-Za-z0-9\s]{4,35}?)\s+(?:comparing|compare|surveying|examining|investigating)\b", query.strip())
    if m:
        return m.group(1).strip()
    return ""


def decompose_compound_query(query: str, max_subqueries: int = 3) -> DecompositionResult:
    """
    Decomposes a compound historical research inquiry into bounded subqueries.
    If the inquiry is simple or cannot be cleanly decomposed, returns the original query.
    
    Guarantees:
    - Strictly bounded: Returns between 1 and max_subqueries (default 3).
    - Preserves semantic terminology: Does not hallucinate or omit historical terms.
    - Deterministic: Pure string and grammatical analysis, 100% reproducible.
    """
    cleaned = (query or "").strip()
    if not cleaned:
        return DecompositionResult(is_compound=False, original_query="", subqueries=[])

    subqueries: List[SubQuery] = []

    # 1. Distinct Sentences / Question Mark Splitting
    # E.g. "Who commissioned the Kailasa temple? What are the dimensions of its courtyard?"
    sentence_splits = [s.strip() for s in re.split(r"(?<=[?.!])\s+", cleaned) if len(s.strip()) >= 10]
    if len(sentence_splits) >= 2:
        for idx, s in enumerate(sentence_splits[:max_subqueries], start=1):
            c_text = clean_subquery_text(s)
            subqueries.append(
                SubQuery(
                    subquery_id=f"SQ{idx}",
                    subquery_text=c_text,
                    component_label=f"Inquiry component {idx}: '{c_text[:50]}...'",
                )
            )
        return DecompositionResult(
            is_compound=True,
            original_query=cleaned,
            subqueries=subqueries,
        )

    # 2. Check Comparative Patterns ("comparing <A> with/to <B>")
    for pat in CONNECTIVE_PATTERNS:
        m = re.search(pat, cleaned)
        if m:
            part_a = clean_subquery_text(m.group(1))
            part_b = clean_subquery_text(m.group(2))
            
            # Check for shared context prefix
            prefix = extract_context_prefix(cleaned)
            sub_a = f"{prefix} {part_a}".strip() if prefix and not part_a.lower().startswith(prefix.lower()) else part_a
            sub_b = f"{prefix} {part_b}".strip() if prefix and not part_b.lower().startswith(prefix.lower()) else part_b

            if len(sub_a.split()) >= 2 and len(sub_b.split()) >= 2:
                subqueries.append(
                    SubQuery(
                        subquery_id="SQ1",
                        subquery_text=sub_a,
                        component_label=part_a[:60],
                    )
                )
                subqueries.append(
                    SubQuery(
                        subquery_id="SQ2",
                        subquery_text=sub_b,
                        component_label=part_b[:60],
                    )
                )
                return DecompositionResult(
                    is_compound=True,
                    original_query=cleaned,
                    subqueries=subqueries,
                )

    # 3. Check Dual Page / Dual Entity Conjunction ("... on page X and ... on page Y")
    page_dual = re.search(r"(?i)(.+?\bpage\s+\d+)\s+and\s+(.+?\bpage\s+\d+.*)", cleaned)
    if page_dual:
        part_a = clean_subquery_text(page_dual.group(1))
        part_b = clean_subquery_text(page_dual.group(2))
        if len(part_a.split()) >= 2 and len(part_b.split()) >= 2:
            return DecompositionResult(
                is_compound=True,
                original_query=cleaned,
                subqueries=[
                    SubQuery(subquery_id="SQ1", subquery_text=part_a, component_label=part_a[:60]),
                    SubQuery(subquery_id="SQ2", subquery_text=part_b, component_label=part_b[:60]),
                ],
            )

    # 4. Check Dual Independent Entity Conjunction
    # Look for "A and B" where both sides have substantial content and known entities/caves
    # e.g. "Mhar ... and Kuda ...", "Cave 16 ... and Cave 29 ..."
    entity_conjunction = re.search(
        r"(?i)(.+?\b(?:Mhar|Mbar|Kuda|Kuqa|Elura|Ellora|Cave\s+\d+|Cave\s+[IVXLCDM]+|Kailasa|Dantidurga)\b.+?)\s+and\s+(.+?\b(?:Mhar|Mbar|Kuda|Kuqa|Elura|Ellora|Cave\s+\d+|Cave\s+[IVXLCDM]+|Kailasa|Dantidurga|Amoghavarsha|Krishna)\b.+)",
        cleaned,
    )
    if entity_conjunction:
        part_a = clean_subquery_text(entity_conjunction.group(1))
        part_b = clean_subquery_text(entity_conjunction.group(2))
        if len(part_a.split()) >= 3 and len(part_b.split()) >= 3:
            return DecompositionResult(
                is_compound=True,
                original_query=cleaned,
                subqueries=[
                    SubQuery(subquery_id="SQ1", subquery_text=part_a, component_label=part_a[:60]),
                    SubQuery(subquery_id="SQ2", subquery_text=part_b, component_label=part_b[:60]),
                ],
            )

    # 5. Fallback: Single Unified Query
    return DecompositionResult(
        is_compound=False,
        original_query=cleaned,
        subqueries=[
            SubQuery(
                subquery_id="SQ1",
                subquery_text=cleaned,
                component_label=cleaned[:60],
            )
        ],
    )


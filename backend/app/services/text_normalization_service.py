"""
DHAROHAR AI — OCR-Aware Lexical Normalization Service
Milestone 5.6.3.3: OCR-Aware Lexical Normalization & Multi-Query Evidence Retrieval

METHODOLOGICAL PRINCIPLES:
1. STRICT PRISTINE PRESERVATION:
   Original extracted archival text is NEVER modified, overwritten, or substituted in
   the database or display layers. Normalization generates a strictly secondary,
   search-optimized representation used exclusively by FTS5 lexical indexing and
   candidate eligibility verification.

2. CONSERVATIVE & DETERMINISTIC NORMALIZATION:
   Aggressive wildcards or broad regex substitutions (e.g. indiscriminate m <-> rn)
   risk catastrophic false positive drift in historical texts. Normalization is strictly
   bounded to verified epigraphical/archival errata:
   - Line-break hyphenation repair (e.g., 'compart-\\nment' -> 'compartment').
   - Unicode NFD diacritic stripping and standard ASCII folding.
   - Controlled historical place-name and terminology canonicalization
     (e.g., 'Elura' <-> 'Ellora', 'Dekhan' <-> 'Deccan', 'Mbar' <-> 'Mhar', 'KuqA' <-> 'Kuda').
"""

import re
import unicodedata
from typing import Dict, List, Set, Tuple


# ---------------------------------------------------------------------------
# Canonical Historical Place-Name & Terminology Variant Lexicon
# ---------------------------------------------------------------------------

HISTORICAL_CANONICAL_MAP: Dict[str, str] = {
    # Elura / Ellora variants
    "elura": "ellora",
    "eluro": "ellora",
    "ellore": "ellora",
    "eloor": "ellora",
    
    # Dekhan / Deccan variants
    "dekhan": "deccan",
    "dekan": "deccan",
    "dekkhan": "deccan",
    
    # Mhar / Mahad / OCR 'Mbar' errata (Bomb. Arch. Surv. Cave 1-28)
    "mbar": "mhar",
    "mhad": "mhar",
    "mahad": "mhar",
    
    # Kuda / Kuqa / Koda errata
    "kuqa": "kuda",
    "koda": "kuda",
    
    # Kailasa / Kailas / Kailash variants
    "kailas": "kailasa",
    "kailash": "kailasa",
    
    # Architectural & epigraphical historical terms
    "dwajastambha": "dhvajastambha",
    "dhwajastambha": "dhvajastambha",
    "sihlmra": "sikhara",
    "sikhar": "sikhara",
}

# Reverse lookup dictionary for bidirectional query expansion in FTS5
VARIANT_EXPANSIONS: Dict[str, Set[str]] = {}
for _variant, _canonical in HISTORICAL_CANONICAL_MAP.items():
    if _canonical not in VARIANT_EXPANSIONS:
        VARIANT_EXPANSIONS[_canonical] = {_canonical}
    VARIANT_EXPANSIONS[_canonical].add(_variant)
    if _variant not in VARIANT_EXPANSIONS:
        VARIANT_EXPANSIONS[_variant] = {_variant, _canonical}
    VARIANT_EXPANSIONS[_variant].add(_canonical)


# ---------------------------------------------------------------------------
# Core Normalization Functions
# ---------------------------------------------------------------------------

def strip_diacritics(text: str) -> str:
    """
    Decomposes unicode characters (NFD) and strips non-spacing combining marks.
    E.g., 'Śiva' -> 'Siva', 'Dāntidurga' -> 'Dantidurga', 'Śāṅkara' -> 'Sankara'.
    """
    if not text:
        return ""
    normalized_nfd = unicodedata.normalize("NFD", text)
    stripped = "".join(ch for ch in normalized_nfd if unicodedata.category(ch) != "Mn")
    return unicodedata.normalize("NFC", stripped)


def repair_line_break_hyphenation(text: str) -> str:
    """
    Repairs intra-word hyphenation artifacts caused by line wraps in 19th-century typography.
    Examples:
      'compart-\\nment' -> 'compartment'
      'correspon-\\nding' -> 'corresponding'
      'richly-\\nsculptured' -> 'richly sculptured' (hyphenated compounds separated with space)
    """
    if not text:
        return ""

    # 1. Join split words across newlines: word- \n word -> wordword
    # Preserves purely alphabetical tokens of 2+ characters on each side
    repaired = re.sub(
        r"(\b[a-zA-Z]{2,})-\s*(?:\r?\n)+\s*([a-zA-Z]{2,}\b)",
        r"\1\2",
        text,
    )

    # 2. Clean soft hyphens and zero-width artifacts
    repaired = repaired.replace("\xad", "")
    repaired = re.sub(r"[\u200b\u200c\u200d\ufeff]", "", repaired)

    # 3. Standardize typographical quotes and dashes
    repaired = repaired.replace("’", "'").replace("‘", "'")
    repaired = repaired.replace("“", '"').replace("”", '"')
    repaired = repaired.replace("—", " ").replace("–", " ")

    return repaired


def canonicalize_historical_terms(text: str) -> str:
    """
    Maps historical variant spellings and verified OCR substitution errors
    to canonical search lemmas while preserving sentence structure.
    """
    if not text:
        return ""

    def replace_token(match: re.Match) -> str:
        word = match.group(0)
        lower_word = word.lower()
        if lower_word in HISTORICAL_CANONICAL_MAP:
            canonical = HISTORICAL_CANONICAL_MAP[lower_word]
            # Preserve case pattern
            if word.isupper():
                return canonical.upper()
            if word.istitle() or (word and word[0].isupper()):
                return canonical.capitalize()
            return canonical
        return word

    # Replace whole word tokens only
    return re.sub(r"\b[a-zA-Z]+\b", replace_token, text)


def normalize_archival_text(text: str) -> str:
    """
    Comprehensive search representation normalizer for archival chunk text.
    
    GUARANTEE:
    This output is stored strictly in `normalized_text` or indexed in FTS5.
    Original archival text is preserved verbatim.
    
    Pipeline:
    1. Line-break hyphenation repair.
    2. Unicode diacritic stripping.
    3. Historical spelling & OCR variant canonicalization.
    4. Whitespace cleanup.
    """
    if not text or not text.strip():
        return ""

    # Step 1: Repair hyphenation
    t = repair_line_break_hyphenation(text)

    # Step 2: Strip diacritical marks
    t = strip_diacritics(t)

    # Step 3: Canonicalize historical and OCR variants
    t = canonicalize_historical_terms(t)

    # Step 4: Normalize extra whitespaces
    t = re.sub(r"[ \t]+", " ", t)

    return t.strip()


def normalize_token_for_matching(token: str) -> str:
    """
    Canonicalizes a single query or chunk token for candidate eligibility checks.
    E.g. 'Elura' -> 'ellora', 'Dekhan' -> 'deccan', 'Mbar' -> 'mhar', 'Śiva' -> 'siva'.
    """
    clean = strip_diacritics((token or "").strip().lower())
    clean = re.sub(r"[^\w]", "", clean)
    return HISTORICAL_CANONICAL_MAP.get(clean, clean)


# Epigraphical / Archival synonymous terms (controlled domain expansions)
EPIGRAPHICAL_SYNONYM_MAP: Dict[str, Set[str]] = {
    "donation": {"donation", "gift", "deyadhama", "deya"},
    "gift": {"donation", "gift", "deyadhama", "deya"},
    "cistern": {"cistern", "cisterns", "podhi", "podhio"},
    "cisterns": {"cistern", "cisterns", "podhi", "podhio"},
}


def expand_query_terms_for_fts5(cleaned_query: str) -> str:
    """
    Generates an FTS5 MATCH clause expanding historical variant terminology,
    common inflectional forms (singular/plural), and domain epigraphical synonyms.
    Preserves exact quoted phrases while expanding recognized historical keywords.
    
    Example:
      'Rock temples at Ellora in the Deccan'
      -> '("Rock" OR "temples") ... (("Ellora" OR "Elura")) ...'
    """
    if not cleaned_query:
        return ""

    # Extract quoted phrases
    phrases = re.findall(r'"([^"]+)"', cleaned_query)
    remaining = re.sub(r'"[^"]+"', " ", cleaned_query)

    # Clean unquoted text: keep alphanumeric and unicode characters
    cleaned_remaining = re.sub(r"[^\w\s]", " ", remaining, flags=re.UNICODE)
    tokens = [t.strip() for t in cleaned_remaining.split() if len(t.strip()) > 1]

    parts: List[str] = []

    # 1. Quoted phrases (exact)
    for p in phrases:
        clean_p = re.sub(r"[^\w\s]", " ", p, flags=re.UNICODE).strip()
        if clean_p:
            parts.append(f'"{clean_p}"')
            norm_p = normalize_archival_text(clean_p)
            if norm_p.lower() != clean_p.lower():
                parts.append(f'"{norm_p}"')

    # 2. Individual tokens with historical/OCR variant & epigraphical expansions
    for t in tokens:
        t_clean = strip_diacritics(t)
        t_lower = t_clean.lower()
        expanded_set: Set[str] = {t_clean}

        # Historical place/spelling variant expansion (e.g. Elura <-> Ellora, Dekhan <-> Deccan, Mbar <-> Mhar)
        if t_lower in VARIANT_EXPANSIONS:
            expanded_set.update(VARIANT_EXPANSIONS[t_lower])

        # Epigraphical domain synonyms (e.g. cistern <-> podhi, donation <-> deyadhama)
        if t_lower in EPIGRAPHICAL_SYNONYM_MAP:
            expanded_set.update(EPIGRAPHICAL_SYNONYM_MAP[t_lower])

        # Wrap expansion in OR group if multiple variants exist
        if len(expanded_set) > 1:
            variant_terms = " OR ".join(f'"{v}"' for v in sorted(expanded_set))
            parts.append(f"({variant_terms})")
        else:
            parts.append(f'"{t_clean}"')

    if not parts:
        return ""

    return " OR ".join(parts)

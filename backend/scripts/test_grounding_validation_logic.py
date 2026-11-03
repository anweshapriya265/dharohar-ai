import re
from typing import List, Dict, Any, Tuple

SILENCE_PATTERNS = [
    re.compile(r"\b(?:no\s+mention|not\s+mentioned|unmentioned|not\s+found|no\s+information)\b", re.IGNORECASE),
    re.compile(r"\b(?:does\s+not\s+(?:mention|state|record|refer|contain|indicate|allude)|cannot\s+be\s+found)\b", re.IGNORECASE),
    re.compile(r"\b(?:unrecorded|no\s+record|is\s+silent|makes\s+no\s+mention|neither\s+mentions?)\b", re.IGNORECASE),
    re.compile(r"\b(?:no\s+reference|not\s+referenced|there\s+is\s+no\s+(?:mention|record|evidence|information))\b", re.IGNORECASE),
    re.compile(r"\b(?:not\s+stated|not\s+discussed|not\s+addressed|not\s+supported)\b", re.IGNORECASE),
]

NEGATIVE_ASSERTION_PATTERNS = [
    re.compile(r"\b(?:did\s+not|does\s+not|never|left\s+no|had\s+no|was\s+not|were\s+not|is\s+not|are\s+not)\b", re.IGNORECASE),
    re.compile(r"\b(?:no\s+evidence\s+that|there\s+was\s+no|there\s+were\s+no)\b", re.IGNORECASE),
]

def is_silence_statement(text: str) -> bool:
    cleaned = (text or "").strip()
    if not cleaned:
        return True
    return any(p.search(cleaned) for p in SILENCE_PATTERNS)

def is_negative_assertion(text: str) -> bool:
    cleaned = (text or "").strip()
    return any(p.search(cleaned) for p in NEGATIVE_ASSERTION_PATTERNS)

def check_claim_missing_info_contradiction(claim_text: str, missing_info: List[str]) -> bool:
    """
    Checks if a claim directly contradicts an item in missing_information.
    e.g. claim says 'Ashoka carved edicts' while missing_info says 'Edicts carved by Ashoka is not mentioned'.
    """
    c_lower = claim_text.lower()
    # Extract significant terms from claim (length >= 4)
    claim_terms = set(re.findall(r"\b[a-z]{4,}\b", c_lower)) - {
        "that", "this", "from", "with", "were", "been", "have", "cave", "temple"
    }
    for m in missing_info:
        m_lower = m.lower()
        m_terms = set(re.findall(r"\b[a-z]{4,}\b", m_lower))
        shared = claim_terms & m_terms
        if len(shared) >= 2:
            return True
    return False

# Test cases
print("Testing contradiction detection:")
claim = "Emperor Ashoka carved the edicts on the pillar inside Kailasa Cave 16."
missing = ["The content of the edicts carved by Emperor Ashoka on the pillar inside Kailasa Cave 16."]
print("Contradiction detected:", check_claim_missing_info_contradiction(claim, missing))
assert check_claim_missing_info_contradiction(claim, missing) is True

claim2 = "The Sanskrit copper plate grant of Shivaji Maharaj was discovered embedded in the Nandi mandapa floor at Ellora Cave 16."
missing2 = ["The specific details of the Sanskrit copper plate grant of Shivaji Maharaj, including its discovery location and date, are not mentioned in the provided evidence passages."]
print("Contradiction detected (Shivaji):", check_claim_missing_info_contradiction(claim2, missing2))
assert check_claim_missing_info_contradiction(claim2, missing2) is True

claim_valid = "King Krishna I commissioned the temple."
missing_valid = ["The exact number of stonemasons is not recorded in the archive."]
print("Valid claim contradiction:", check_claim_missing_info_contradiction(claim_valid, missing_valid))
assert check_claim_missing_info_contradiction(claim_valid, missing_valid) is False

print("ALL CONTRADICTION TESTS PASSED!")

import sqlite3
import re

def sanitize_fts5_query(query: str) -> str:
    """
    Sanitizes user queries for safe and effective SQLite FTS5 matching.
    
    1. Extracts quoted phrases to preserve exact matches ("Kailasa temple").
    2. Strips FTS5 reserved punctuation/operators (: - * ^ ( ) { } +) from unquoted terms.
    3. Normalizes whitespace and drops single-character noise words.
    4. Combines terms using OR so multi-word historical queries match broadly,
       while exact phrases and high-co-occurrence documents score higher via BM25.
    """
    if not query or not query.strip():
        return ""

    # Extract quoted phrases
    phrases = re.findall(r'"([^"]+)"', query)
    # Remove quoted parts from original string
    remaining = re.sub(r'"[^"]+"', " ", query)

    # Clean remaining text: keep alphanumeric, unicode characters, and basic spaces
    # Remove FTS5 special characters: : * ^ - + ( ) { } [ ]
    cleaned_remaining = re.sub(r'[^\w\s]', ' ', remaining, flags=re.UNICODE)
    tokens = [t.strip() for t in cleaned_remaining.split() if len(t.strip()) > 1]

    parts = []
    # Add exact phrases safely wrapped
    for p in phrases:
        clean_p = re.sub(r'[^\w\s]', ' ', p, flags=re.UNICODE).strip()
        if clean_p:
            parts.append(f'"{clean_p}"')

    # Add individual tokens
    for t in tokens:
        # Avoid FTS5 boolean keywords from being parsed as operators
        if t.upper() in {"AND", "OR", "NOT", "NEAR"}:
            parts.append(f'"{t}"')
        else:
            parts.append(f'"{t}"')

    if not parts:
        return ""

    # Join with OR for broad recall, BM25 will rank passages with more matching terms higher
    return " OR ".join(parts)


def test():
    conn = sqlite3.connect(":memory:")
    conn.execute("""
    CREATE VIRTUAL TABLE document_chunks_fts USING fts5(
        chunk_id UNINDEXED,
        document_id UNINDEXED,
        text,
        tokenize = 'unicode61 remove_diacritics 2'
    );
    """)

    docs = [
        ("c1", "d1", "Cave 16, known as the Kailash temple, is the crowning glory of Ellora. Commissioned by King Krishna I (756-773 CE)."),
        ("c2", "d1", "The shikhara rises 96 feet above the courtyard floor. Dravidian style monolithic vimana."),
        ("c3", "d2", "The Ajanta Caves feature Buddhist frescoes and murals depicting Bodhisattva Padmapani."),
    ]
    conn.executemany("INSERT INTO document_chunks_fts (chunk_id, document_id, text) VALUES (?, ?, ?);", docs)

    test_queries = [
        'Kailash temple',
        'Krishna I (756-773 CE)',
        '"96 feet"',
        'Dravidian style',
        'Cave 16: Kailasa',
        'NOT AND OR near',
        'random nonexistent term',
    ]

    for tq in test_queries:
        sanitized = sanitize_fts5_query(tq)
        print(f"\nQuery: {tq!r} -> Sanitized: {sanitized!r}")
        try:
            if not sanitized:
                print("Skipped empty sanitized query")
                continue
            rows = conn.execute(
                "SELECT chunk_id, bm25(document_chunks_fts) as rank, text FROM document_chunks_fts WHERE document_chunks_fts MATCH ? ORDER BY rank ASC;",
                (sanitized,)
            ).fetchall()
            print(f"Matched {len(rows)} rows:")
            for r in rows:
                print(f"  {r[0]}: bm25={r[1]:.4f} | {r[2][:60]}...")
        except Exception as e:
            print(f"ERROR: {e}")

if __name__ == "__main__":
    test()


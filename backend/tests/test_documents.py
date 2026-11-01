import io
from pathlib import Path
import pytest
import pymupdf
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.db.database import init_db, get_db_context
from app.db.repository import DocumentRepository


def create_in_memory_pdf(pages_content: list[str]) -> bytes:
    """Helper to generate a valid PDF in memory using PyMuPDF."""
    doc = pymupdf.open()
    for text in pages_content:
        page = doc.new_page(width=595, height=842)
        if text:
            page.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.fixture(autouse=True)
def isolated_test_env(tmp_path: Path, monkeypatch):
    """
    Ensures every test runs in an isolated temporary directory with a clean SQLite database.
    Prevents tests from modifying real development archives or data.
    """
    test_upload_dir = tmp_path / "uploads"
    test_upload_dir.mkdir(parents=True, exist_ok=True)
    test_db_path = tmp_path / "test_dharohar.db"

    monkeypatch.setattr(settings, "UPLOAD_DIR", test_upload_dir)
    monkeypatch.setattr(settings, "DATABASE_PATH", test_db_path)
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 15 * 1024 * 1024)

    init_db(test_db_path)
    yield


@pytest.fixture
def client():
    return TestClient(app)


def test_successful_pdf_upload_and_extraction(client):
    """Test successful single-page PDF upload, metadata saving and text extraction."""
    sample_text = (
        "Archaeological Survey of Western India: Documentation of the rock-cut architectural "
        "monolithic excavations at Ellora Caves. Documenting monolithic vimana carvings."
    )
    pdf_bytes = create_in_memory_pdf([sample_text])

    response = client.post(
        "/api/documents/upload",
        files={"file": ("ellora_survey.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["id"].startswith("doc_")
    assert data["original_filename"] == "ellora_survey.pdf"
    assert data["page_count"] == 1
    assert data["processing_status"] == "completed"
    assert data["extraction_status"] == "extracted"
    assert data["storage_reference"] == f"{data['id']}.pdf"

    # Verify physical file was saved safely
    storage_file = settings.UPLOAD_DIR / f"{data['id']}.pdf"
    assert storage_file.exists()
    assert storage_file.stat().st_size == len(pdf_bytes)

    # Verify document retrieval endpoint
    doc_resp = client.get(f"/api/documents/{data['id']}")
    assert doc_resp.status_code == 200
    assert doc_resp.json()["id"] == data["id"]

    # Verify pages retrieval endpoint
    pages_resp = client.get(f"/api/documents/{data['id']}/pages")
    assert pages_resp.status_code == 200
    pages_data = pages_resp.json()
    assert pages_data["total_pages"] == 1
    assert pages_data["pages"][0]["page_number"] == 1
    assert "Archaeological Survey" in pages_data["pages"][0]["text"]
    assert pages_data["pages"][0]["character_count"] > 50
    assert pages_data["pages"][0]["extraction_status"] == "extracted"


def test_multiple_pages_and_one_based_numbering(client):
    """Test multi-page document upload and strict 1-based page numbering."""
    pages_text = [
        "First Chapter: Epigraphical inscriptions of the Maurya dynasty at Girnar rock edict.",
        "Second Chapter: Structural ground plan and architectural elevational cross-sections.",
        "Third Chapter: Comprehensive index of surveyed monolithic stone temples and tanks.",
    ]
    pdf_bytes = create_in_memory_pdf(pages_text)

    response = client.post(
        "/api/documents/upload",
        files={"file": ("multipage_gazetteer.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 201
    doc_id = response.json()["id"]
    assert response.json()["page_count"] == 3

    # Fetch pages
    pages_resp = client.get(f"/api/documents/{doc_id}/pages")
    assert pages_resp.status_code == 200
    pages = pages_resp.json()["pages"]
    assert len(pages) == 3

    # Check 1-based numbering
    for idx, page in enumerate(pages):
        expected_page_num = idx + 1
        assert page["page_number"] == expected_page_num
        assert pages_text[idx] in page["text"]


def test_scanned_pdf_flags_needs_ocr(client):
    """Test that a PDF with little or no extractable text is marked as needs_ocr."""
    # Blank pages containing zero text (representing scanned photo or blueprint plates)
    pdf_bytes = create_in_memory_pdf(["", "  "])

    response = client.post(
        "/api/documents/upload",
        files={"file": ("scanned_blueprint_plate.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["page_count"] == 2
    assert data["extraction_status"] == "needs_ocr"

    # Pages should also flag needs_ocr
    pages_resp = client.get(f"/api/documents/{data['id']}/pages")
    assert pages_resp.status_code == 200
    for page in pages_resp.json()["pages"]:
        assert page["extraction_status"] == "needs_ocr"


def test_unsupported_file_extension(client):
    """Test rejecting files with non-PDF extensions."""
    response = client.post(
        "/api/documents/upload",
        files={"file": ("notes.txt", b"plain text", "application/pdf")},
    )
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_invalid_mime_type(client):
    """Test rejecting files with mismatching MIME type."""
    pdf_bytes = create_in_memory_pdf(["Valid PDF content"])
    response = client.post(
        "/api/documents/upload",
        files={"file": ("survey.pdf", pdf_bytes, "image/jpeg")},
    )
    assert response.status_code == 400
    assert "Invalid MIME content type" in response.json()["detail"]


def test_empty_file_upload(client):
    """Test rejecting completely empty files (0 bytes)."""
    response = client.post(
        "/api/documents/upload",
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )
    assert response.status_code == 400
    assert "Empty file" in response.json()["detail"] or "Invalid file format" in response.json()["detail"]


def test_invalid_pdf_signature(client):
    """Test rejecting files that do not start with %PDF- signature."""
    fake_pdf = b"NOT_A_PDF_HEADER_DATA"
    response = client.post(
        "/api/documents/upload",
        files={"file": ("fake.pdf", fake_pdf, "application/pdf")},
    )
    assert response.status_code == 400
    assert "file header does not match PDF signature" in response.json()["detail"]


def test_corrupted_malformed_pdf(client):
    """Test rejecting a file that begins with %PDF- but has corrupt body."""
    corrupted_bytes = b"%PDF-1.4\nCorrupt-trailer-data-random-garbage-that-cannot-be-parsed"
    response = client.post(
        "/api/documents/upload",
        files={"file": ("corrupted.pdf", corrupted_bytes, "application/pdf")},
    )
    assert response.status_code == 400
    assert "Malformed or corrupted PDF" in response.json()["detail"]


def test_oversized_upload(client, monkeypatch):
    """Test rejecting files that exceed the configured size limit."""
    # Create a 5-page PDF (approx 3-5 KB)
    pages = [f"Cultural heritage survey page {i} documentation text." for i in range(10)]
    pdf_bytes = create_in_memory_pdf(pages)
    
    # Set limit smaller than generated PDF
    small_limit = len(pdf_bytes) - 200
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", small_limit)

    response = client.post(
        "/api/documents/upload",
        files={"file": ("oversized.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 413
    assert "File size exceeds" in response.json()["detail"]


def test_missing_document_ids(client):
    """Test 404 responses when querying non-existent document IDs."""
    response = client.get("/api/documents/doc_nonexistent_99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]

    pages_response = client.get("/api/documents/doc_nonexistent_99999/pages")
    assert pages_response.status_code == 404
    assert "not found" in pages_response.json()["detail"]


def test_persistence_across_backend_restarts(client):
    """Test that records and pages survive database connection closing / reopening."""
    pdf_bytes = create_in_memory_pdf(["Persistent archival record content from 1890."])

    # Upload document
    resp = client.post(
        "/api/documents/upload",
        files={"file": ("persistent_record.pdf", pdf_bytes, "application/pdf")},
    )
    assert resp.status_code == 201
    doc_id = resp.json()["id"]

    # Directly verify in DB using a fresh isolated connection (simulates restart)
    with get_db_context() as fresh_conn:
        repo = DocumentRepository(fresh_conn)
        db_doc = repo.get_document_by_id(doc_id)
        assert db_doc is not None
        assert db_doc["id"] == doc_id
        assert db_doc["original_filename"] == "persistent_record.pdf"

        pages = repo.get_document_pages(doc_id)
        assert len(pages) == 1
        assert "Persistent archival record" in pages[0]["text"]

    # Verify API still reads it correctly
    api_get = client.get(f"/api/documents/{doc_id}")
    assert api_get.status_code == 200
    assert api_get.json()["id"] == doc_id


def test_safe_handling_of_filenames(client):
    """Test sanitizing malicious paths like ../../malicious.pdf and unusual characters."""
    pdf_bytes = create_in_memory_pdf(["Architectural survey safe filename test."])

    malicious_names = [
        "../../etc/passwd.pdf",
        "..\\..\\system32\\evil.pdf",
        "sample;rm -rf /;test.pdf",
        "normal filename with spaces (1892).pdf",
    ]

    for name in malicious_names:
        resp = client.post(
            "/api/documents/upload",
            files={"file": (name, pdf_bytes, "application/pdf")},
        )
        assert resp.status_code == 201
        saved_name = resp.json()["original_filename"]

        # Ensure directory traversal sequences are gone
        assert ".." not in saved_name
        assert "/" not in saved_name
        assert "\\" not in saved_name

        # Ensure server storage uses the safe server-side ID
        doc_id = resp.json()["id"]
        assert resp.json()["storage_reference"] == f"{doc_id}.pdf"
        assert (settings.UPLOAD_DIR / f"{doc_id}.pdf").exists()


def test_list_documents(client):
    """Test listing documents with count and pagination."""
    # Initially 0 documents
    list_resp = client.get("/api/documents")
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] == 0
    assert list_resp.json()["documents"] == []

    # Upload two documents
    pdf1 = create_in_memory_pdf(["Doc 1 text"])
    pdf2 = create_in_memory_pdf(["Doc 2 text"])

    client.post("/api/documents/upload", files={"file": ("doc1.pdf", pdf1, "application/pdf")})
    client.post("/api/documents/upload", files={"file": ("doc2.pdf", pdf2, "application/pdf")})

    list_resp = client.get("/api/documents")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 2
    assert len(data["documents"]) == 2

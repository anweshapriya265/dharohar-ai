import io
from pathlib import Path
import pytest
import pymupdf
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.db.database import init_db, get_db_context
from app.db.repository import DocumentRepository
from app.services.ocr_service import (
    is_tesseract_available,
    resolve_tesseract_cmd,
    render_page_to_image,
    preprocess_image_for_ocr,
)
from backend.tests.test_search import ControlledMockEmbeddingService


def create_digital_pdf(pages_text: list[str]) -> bytes:
    """Creates a PDF with digital text stream."""
    doc = pymupdf.open()
    for text in pages_text:
        page = doc.new_page(width=595, height=842)
        if text:
            page.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_scanned_image_pdf(text_on_images: list[str]) -> bytes:
    """Creates a scanned PDF with raster images containing rendered text, zero digital text stream."""
    doc = pymupdf.open()
    for text in text_on_images:
        img = Image.new("RGB", (700, 200), color="white")
        draw = ImageDraw.Draw(img)
        draw.text((30, 80), text, fill="black")
        
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        img_bytes = buf.getvalue()
        img.close()

        page = doc.new_page(width=700, height=250)
        page.insert_image(page.rect, stream=img_bytes)

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_mixed_pdf(digital_texts: list[str], scanned_texts: list[str]) -> bytes:
    """Creates a mixed PDF with alternating or sequential digital and scanned pages."""
    doc = pymupdf.open()
    
    # Add digital pages
    for text in digital_texts:
        page = doc.new_page(width=595, height=842)
        page.insert_text((50, 72), text, fontsize=12)

    # Add scanned image pages
    for text in scanned_texts:
        img = Image.new("RGB", (700, 200), color="white")
        draw = ImageDraw.Draw(img)
        draw.text((30, 80), text, fill="black")
        
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        img_bytes = buf.getvalue()
        img.close()

        page = doc.new_page(width=700, height=250)
        page.insert_image(page.rect, stream=img_bytes)

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.fixture(autouse=True)
def isolated_test_env(tmp_path: Path, monkeypatch):
    """Isolated test environment with dedicated SQLite database and upload storage."""
    test_upload_dir = tmp_path / "uploads"
    test_upload_dir.mkdir(parents=True, exist_ok=True)
    test_db_path = tmp_path / "test_ocr_dharohar.db"

    monkeypatch.setattr(settings, "UPLOAD_DIR", test_upload_dir)
    monkeypatch.setattr(settings, "DATABASE_PATH", test_db_path)
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 15 * 1024 * 1024)

    # Mock embeddings for deterministic search
    mock_service = ControlledMockEmbeddingService()
    monkeypatch.setattr("app.services.search_service.embedding_service", mock_service)

    init_db(test_db_path)
    yield


@pytest.fixture
def client():
    return TestClient(app)


def test_digital_pdf_does_not_call_ocr(client, monkeypatch):
    """Digital PDFs with sufficient text must not invoke OCR on any page."""
    ocr_called = []

    def mock_ocr(page, dpi=300, lang="eng"):
        ocr_called.append(page.number)
        return "Should not be called", True

    monkeypatch.setattr("app.services.pdf_service.ocr_pdf_page", mock_ocr)

    digital_text = (
        "Archaeological Survey Report: Architectural measurements and documentation "
        "of the monolithic rock-cut cave temples at Ellora. Section elevation plates."
    )
    pdf_bytes = create_digital_pdf([digital_text])

    response = client.post(
        "/api/documents/upload",
        files={"file": ("digital_survey.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["extraction_status"] == "extracted"
    assert len(ocr_called) == 0, "OCR should not be triggered for digital pages."

    pages_resp = client.get(f"/api/documents/{data['id']}/pages")
    assert pages_resp.status_code == 200
    pages = pages_resp.json()["pages"]
    assert len(pages) == 1
    assert pages[0]["extraction_status"] == "extracted"
    assert "Archaeological Survey" in pages[0]["text"]


def test_scanned_pdf_triggers_ocr(client, monkeypatch):
    """Scanned PDF with image text triggers OCR, updates document to 'ocr' and page to 'ocr_extracted'."""
    ocr_mock_text = (
        "British Museum Epigraphical Plate: Ancient Brahmi edicts deciphered by James Prinsep."
    )

    def mock_ocr(page, dpi=300, lang="eng"):
        return ocr_mock_text, True

    monkeypatch.setattr("app.services.pdf_service.ocr_pdf_page", mock_ocr)

    # Scanned PDF without text stream
    pdf_bytes = create_scanned_image_pdf(["Sample Image"])

    response = client.post(
        "/api/documents/upload",
        files={"file": ("scanned_inscription.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["extraction_status"] == "ocr"

    pages_resp = client.get(f"/api/documents/{data['id']}/pages")
    assert pages_resp.status_code == 200
    pages = pages_resp.json()["pages"]
    assert len(pages) == 1
    assert pages[0]["page_number"] == 1
    assert pages[0]["extraction_status"] == "ocr_extracted"
    assert pages[0]["text"] == ocr_mock_text
    assert pages[0]["character_count"] == len(ocr_mock_text)
    assert pages[0]["word_count"] == len(ocr_mock_text.split())


def test_mixed_pdf_hybrid_extraction(client, monkeypatch):
    """Mixed PDF (digital page + scanned page) correctly classifies as 'hybrid'."""
    digital_text = (
        "Chapter I: Introduction to Western Indian Rock-Cut Cave Monoliths and Architecture."
    )
    ocr_text = (
        "Plate II: Facsimile of the Girnar Rock Edict of Ashoka showing Brahmi characters."
    )

    def mock_ocr(page, dpi=300, lang="eng"):
        # Should only be called for page index 1 (page 2)
        return ocr_text, True

    monkeypatch.setattr("app.services.pdf_service.ocr_pdf_page", mock_ocr)

    pdf_bytes = create_mixed_pdf(
        digital_texts=[digital_text],
        scanned_texts=["Scanned Image Plate"],
    )

    response = client.post(
        "/api/documents/upload",
        files={"file": ("mixed_archive_volume.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["page_count"] == 2
    assert data["extraction_status"] == "hybrid"

    pages_resp = client.get(f"/api/documents/{data['id']}/pages")
    assert pages_resp.status_code == 200
    pages = pages_resp.json()["pages"]
    assert len(pages) == 2

    # Page 1: Digital
    assert pages[0]["page_number"] == 1
    assert pages[0]["extraction_status"] == "extracted"
    assert "Western Indian Rock-Cut" in pages[0]["text"]

    # Page 2: OCR
    assert pages[1]["page_number"] == 2
    assert pages[1]["extraction_status"] == "ocr_extracted"
    assert "Girnar Rock Edict" in pages[1]["text"]


def test_ocr_failure_resilience(client, monkeypatch):
    """OCR failure on a scanned page must not crash document upload."""
    def mock_ocr_failing(page, dpi=300, lang="eng"):
        return "", False

    monkeypatch.setattr("app.services.pdf_service.ocr_pdf_page", mock_ocr_failing)
    monkeypatch.setattr("app.services.pdf_service.is_tesseract_available", lambda: True)

    pdf_bytes = create_scanned_image_pdf(["Failing image page"])

    response = client.post(
        "/api/documents/upload",
        files={"file": ("corrupt_scan.pdf", pdf_bytes, "application/pdf")},
    )

    # Must complete successfully with HTTP 201
    assert response.status_code == 201
    data = response.json()
    assert data["extraction_status"] == "needs_ocr"

    pages_resp = client.get(f"/api/documents/{data['id']}/pages")
    assert pages_resp.status_code == 200
    pages = pages_resp.json()["pages"]
    assert len(pages) == 1
    assert pages[0]["extraction_status"] == "ocr_failed"


def test_tesseract_unavailable_handling(client, monkeypatch):
    """When Tesseract is unavailable, scanned documents are flagged as needs_ocr without crashing."""
    monkeypatch.setattr("app.services.ocr_service.is_tesseract_available", lambda: False)
    monkeypatch.setattr("app.services.pdf_service.is_tesseract_available", lambda: False)

    pdf_bytes = create_scanned_image_pdf(["Image without OCR engine"])

    response = client.post(
        "/api/documents/upload",
        files={"file": ("unsupported_scan.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["extraction_status"] == "needs_ocr"

    pages_resp = client.get(f"/api/documents/{data['id']}/pages")
    assert pages_resp.status_code == 200
    pages = pages_resp.json()["pages"]
    assert pages[0]["extraction_status"] == "needs_ocr"


def test_ocr_extracted_text_flows_into_semantic_search(client, monkeypatch):
    """OCR extracted text flows directly into chunking, embeddings, and semantic search."""
    ocr_passage = (
        "Architectural survey of Cave 16 Kailasa temple: Monolithic vimana structure carved from "
        "top to bottom out of the basalt cliff face at Ellora."
    )

    def mock_ocr(page, dpi=300, lang="eng"):
        return ocr_passage, True

    monkeypatch.setattr("app.services.pdf_service.ocr_pdf_page", mock_ocr)

    pdf_bytes = create_scanned_image_pdf(["Plate with temple photo"])

    # 1. Ingest scanned PDF
    upload_resp = client.post(
        "/api/documents/upload",
        files={"file": ("scanned_kailasa_plate.pdf", pdf_bytes, "application/pdf")},
    )
    assert upload_resp.status_code == 201
    doc_id = upload_resp.json()["id"]

    # 2. Search for temple architecture in the archive
    search_resp = client.post(
        "/api/search",
        json={"query": "kailasa temple monolithic vimana", "limit": 5},
    )
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    assert search_data["total_results"] >= 1

    top_hit = search_data["results"][0]
    assert top_hit["document_id"] == doc_id
    assert top_hit["page_number"] == 1
    assert "Kailasa temple" in top_hit["text"]
    assert "[scanned_kailasa_plate.pdf · Page 1]" in top_hit["source_citation"]


@pytest.mark.skipif(not is_tesseract_available(), reason="Local Tesseract OCR executable not available")
def test_real_tesseract_integration_end_to_end(client):
    """End-to-end integration test running actual Tesseract OCR on an image PDF."""
    target_text = "DHAROHAR ARCHIVE 1904 HERITAGE"
    pdf_bytes = create_scanned_image_pdf([target_text])

    response = client.post(
        "/api/documents/upload",
        files={"file": ("real_tesseract_test.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["extraction_status"] == "ocr"

    pages_resp = client.get(f"/api/documents/{data['id']}/pages")
    assert pages_resp.status_code == 200
    pages = pages_resp.json()["pages"]
    assert len(pages) == 1
    assert pages[0]["extraction_status"] == "ocr_extracted"
    assert "DHAROHAR" in pages[0]["text"]


def test_ocr_service_utilities():
    """Unit tests for OCR rendering and preprocessing utilities."""
    # Test Pillow image preprocessing
    test_img = Image.new("RGB", (100, 100), color="blue")
    preprocessed = preprocess_image_for_ocr(test_img)
    assert preprocessed.mode == "L"  # Grayscale
    test_img.close()
    preprocessed.close()

    # Test PDF rendering
    doc = pymupdf.open()
    page = doc.new_page(width=200, height=200)
    rendered_img = render_page_to_image(page, dpi=150)
    assert isinstance(rendered_img, Image.Image)
    assert rendered_img.mode == "RGB"
    rendered_img.close()
    doc.close()


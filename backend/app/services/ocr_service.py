import io
import logging
import os
import shutil
from pathlib import Path
from typing import Optional, Tuple, List
import pymupdf
import pytesseract
from PIL import Image, ImageEnhance
from app.core.config import settings

logger = logging.getLogger(__name__)

# Cached state
_resolved_cmd: Optional[str] = None
_tesseract_available: Optional[bool] = None


def resolve_tesseract_cmd() -> Optional[str]:
    """
    Discovers the Tesseract OCR executable.
    Checks in order:
    1. settings.TESSERACT_CMD (or DHAROHAR_TESSERACT_CMD env var)
    2. System PATH via shutil.which("tesseract")
    3. Standard Windows install locations
    Sets pytesseract.pytesseract.tesseract_cmd if found.
    """
    global _resolved_cmd

    if _resolved_cmd and Path(_resolved_cmd).is_file():
        return _resolved_cmd

    # 1. Configured path
    raw_cmd = settings.TESSERACT_CMD.strip('\'" ') if settings.TESSERACT_CMD else ""
    if raw_cmd and Path(raw_cmd).is_file():
        _resolved_cmd = raw_cmd
        pytesseract.pytesseract.tesseract_cmd = _resolved_cmd
        return _resolved_cmd

    # 2. System PATH
    which_cmd = shutil.which("tesseract")
    if which_cmd and Path(which_cmd).is_file():
        _resolved_cmd = which_cmd
        pytesseract.pytesseract.tesseract_cmd = _resolved_cmd
        return _resolved_cmd

    # 3. Known Windows fallback paths
    candidates = [
        Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe"),
        Path(r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"),
        Path.home() / "AppData" / "Local" / "Programs" / "Tesseract-OCR" / "tesseract.exe",
    ]

    for candidate in candidates:
        if candidate.is_file():
            _resolved_cmd = str(candidate)
            pytesseract.pytesseract.tesseract_cmd = _resolved_cmd
            return _resolved_cmd

    return None


def is_tesseract_available(force_refresh: bool = False) -> bool:
    """
    Returns True if Tesseract OCR is available and can execute.
    Caches the result to avoid spawning subprocesses repeatedly.
    """
    global _tesseract_available

    if _tesseract_available is not None and not force_refresh:
        return _tesseract_available

    cmd = resolve_tesseract_cmd()
    if not cmd:
        _tesseract_available = False
        return False

    try:
        pytesseract.pytesseract.tesseract_cmd = cmd
        pytesseract.get_tesseract_version()
        _tesseract_available = True
    except Exception as exc:
        logger.warning("Tesseract detected at '%s' but execution failed: %s", cmd, exc)
        _tesseract_available = False

    return _tesseract_available


def get_available_languages() -> List[str]:
    """Returns the list of installed Tesseract languages (e.g. ['eng', 'osd'])."""
    if not is_tesseract_available():
        return []
    try:
        return pytesseract.get_languages()
    except Exception:
        return []


def render_page_to_image(page: pymupdf.Page, dpi: int = 300) -> Image.Image:
    """
    Renders an individual PyMuPDF page to a Pillow RGB Image at the specified DPI.
    Standard PDF coordinate resolution is 72 DPI.
    """
    zoom = dpi / 72.0
    matrix = pymupdf.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=matrix, alpha=False)
    
    try:
        # Convert RGB raw bytes directly to Pillow Image
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        return img
    finally:
        del pix  # Explicitly release PyMuPDF pixmap memory


def preprocess_image_for_ocr(image: Image.Image) -> Image.Image:
    """
    Applies image preprocessing to improve OCR accuracy on scanned heritage materials:
    1. Grayscale conversion.
    2. Moderate contrast enhancement (1.5x factor).
    Explicitly closes intermediate grayscale Image handle to conserve memory.
    """
    gray = image.convert("L")
    try:
        enhancer = ImageEnhance.Contrast(gray)
        enhanced = enhancer.enhance(1.5)
        return enhanced
    finally:
        gray.close()


def ocr_image(image: Image.Image, lang: str = "eng") -> str:
    """
    Preprocesses an image and runs Tesseract OCR.
    Initial configuration uses English ('eng') and PSM 3 (Fully automatic page segmentation).
    """
    preprocessed = preprocess_image_for_ocr(image)
    try:
        text = pytesseract.image_to_string(
            preprocessed,
            lang=lang,
            config="--psm 3",
        )
        return (text or "").strip()
    finally:
        if preprocessed is not image:
            preprocessed.close()


def ocr_pdf_page(
    page: pymupdf.Page,
    dpi: int = settings.OCR_DPI,
    lang: str = settings.OCR_DEFAULT_LANGUAGE,
) -> Tuple[str, bool]:
    """
    Safely renders a single PDF page and executes Tesseract OCR.
    Does not crash on OCR failure; returns (extracted_text, success_boolean).
    Explicitly frees image memory.
    """
    if not is_tesseract_available():
        logger.info("OCR requested for page %s but Tesseract is not available.", getattr(page, "number", 0) + 1)
        return "", False

    raw_img = None
    try:
        raw_img = render_page_to_image(page, dpi=dpi)
        text = ocr_image(raw_img, lang=lang)
        return text, True
    except Exception as exc:
        page_num = getattr(page, "number", 0) + 1
        logger.warning(
            "Tesseract OCR failed on page %d: %s. Continuing extraction gracefully.",
            page_num,
            exc,
        )
        return "", False
    finally:
        if raw_img is not None:
            try:
                raw_img.close()
            except Exception:
                pass


"""
Document text extraction (DDD domain service).
Supports: .txt, .md, .eml, .html, .pdf, .docx
ADR: docs/designs/ADR-0001-multi-format-document-extraction.md

DoR: pathlib available; optional pypdf and python-docx for binary formats
DoD: All 6 text formats extracted; binary formats raise ImportError with install hint;
     unsupported formats raise ValueError
"""
from pathlib import Path
from typing import Set

TEXT_EXTENSIONS = {".txt", ".md", ".eml", ".html", ".htm"}
BINARY_EXTENSIONS = {".pdf", ".docx"}


def extract_document_text(file_path: str) -> str:
    """
    Extract plain text from document (DDD: Document Extraction Service).
    Supports: .txt, .md, .eml, .html, .pdf, .docx
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = path.suffix.lower()

    if ext in TEXT_EXTENSIONS:
        return path.read_text(encoding="utf-8", errors="replace")

    if ext == ".pdf":
        return _extract_pdf(path)

    if ext == ".docx":
        return _extract_docx(path)

    # Fallback: try read_text for unknown extensions
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except (UnicodeDecodeError, UnicodeError):
        raise ValueError(f"Unsupported binary format: {ext}. Use .txt, .eml, .pdf, or .docx.")


def _extract_pdf(path: Path) -> str:
    """Extract text from PDF using pypdf."""
    try:
        from pypdf import PdfReader
    except ImportError:
        raise ImportError(
            "PDF support requires pypdf. Install: pip install pypdf"
        )
    reader = PdfReader(path)
    parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
        else:
            parts.append("[Empty or image-only page]")
    return "\n\n".join(parts) if parts else "[No extractable text]"


def _extract_docx(path: Path) -> str:
    """Extract text from Word .docx using python-docx."""
    try:
        from docx import Document
    except ImportError:
        raise ImportError(
            "Word (.docx) support requires python-docx. Install: pip install python-docx"
        )
    doc = Document(path)
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def supported_formats() -> Set[str]:
    """Return set of supported file extensions."""
    return TEXT_EXTENSIONS | BINARY_EXTENSIONS

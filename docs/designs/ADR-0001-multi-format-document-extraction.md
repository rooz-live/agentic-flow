---
date: 2026-03-06
status: accepted
related_tests: TBD
---

# ADR-0001: Multi-Format Document Extraction

## Status
Accepted

## Date
2026-02-10

## Context
The validation pipeline (GovernanceCouncil, advocate CLI, validation dashboard) currently accepts only plain text files via `Path.read_text()`. Legal workflows require validation of:
- **.eml** – settlement emails
- **.txt** / **.md** – discovery notes, research
- **.pdf** – lease agreements, court filings, scanned documents
- **.docx** – Word drafts, correspondence

## Decision
Introduce a **Document Extraction** domain service that:
1. Routes by file extension
2. Uses `read_text()` for `.txt`, `.md`, `.eml`, `.html`
3. Uses **pypdf** for `.pdf` (optional dependency)
4. Uses **python-docx** for `.docx` (optional dependency)

## Consequences
- **TDD**: Tests written first in `tests/validation/test_document_extraction.py`
- **DDD**: `vibesthinker/document_extractor.py` as domain service
- **Optional deps**: PDF/Word fail gracefully with clear `ImportError` if libraries not installed
- **Resume**: Validation pipeline, advocate CLI, and dashboard accept Word/PDF files

## Dependencies
```bash
pip install pypdf          # PDF support
pip install python-docx    # Word .docx support
```

## References
- `vibesthinker/document_extractor.py`
- `scripts/lease_comparator.py` (existing pypdf usage)

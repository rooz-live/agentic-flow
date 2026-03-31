---
case: 26CV007491-590
related_case: 26CV005596-590
type: contrastive-analysis
date: 2026-03-10
status: Draft
---

## Contrastive Analysis: Judgment vs. Register of Actions

**Scope**: Case 26CV007491-590 — compare the Judgment PDF against the Register of Actions for:
- Appeal deadline computation
- Motion to Consolidate handling
- Treatment of uninhabitability defenses
- Possession status and execution risk

### 1. How to regenerate this analysis (OCR pipeline)

- **Inputs** (expected on disk):
  - `~/Downloads/26CV007491-590.pdf`
  - `~/Downloads/Register of Actions - 26CV007491-590.pdf`

- **Command (from repo root `agentic-flow`)**:

  ```bash
  cd ~/Documents/code/investing/agentic-flow
  ./scripts/legal-doc-processor.sh \
    "~/Downloads/26CV007491-590.pdf" \
    "~/Downloads/Register of Actions - 26CV007491-590.pdf"
  ```

- **Behavior**:
  - OCRs both PDFs using native tools (`textutil`, `pdftotext`, or `pdf_classifier.py`).
  - Extracts case number and inferred document type for each.
  - Suggests new filenames: `YYYY-MM-DD_26CV007491-590_<DocType>.pdf`.
  - Writes a contrastive markdown report at:
    - `/tmp/legal-doc-processing/contrastive_comparison.md`

- **Exit codes (strict 0/1/2/3)**:
  - `0` — Both PDFs processed cleanly; comparison generated.
  - `1` — Blocker (missing file or OCR backend failed on at least one document).
  - `2` — Warnings (Unknown case number or generic document type on at least one document, but OCR succeeded).
  - `3` — Dependencies missing (no OCR backend available on this machine).

Use `exit 0/1/2/3` in combination with dashboard views or WSJF routers to decide whether to proceed to filing or hold for review.

### 2. Filing and naming conventions

- **Suggested BHOPTI-LEGAL locations** (once PDFs are renamed):
  - Root case directory:
    - `~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-CASE-DOCS/26CV007491-590/`
  - Court filings (judgment, orders, register):
    - `~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-CASE-DOCS/26CV007491-590/COURT-FILINGS/`

- **Canonical filename pattern**:
  - `YYYY-MM-DD_26CV007491-590_Judgment.pdf`
  - `YYYY-MM-DD_26CV007491-590_RegisterOfActions.pdf`

You can accept the suggested names from `legal-doc-processor.sh` and then `mv` the files into the `COURT-FILINGS` directory above.

### 3. Key legal findings (for review, not advice)

> Populate this section from the OCR’d text and manual review.

- **Appeal deadline**:
  - Judgment date: **March 10, 2026**.
  - Ten‑day appeal window → **March 20, 2026**.
  - Track as a WSJF‑critical deadline in your WSJF/ROAM tracker.

- **Motion to Consolidate (2/23/26)**:
  - Filed in this case, but **not explicitly addressed** in the Judgment.
  - Check the Register of Actions to confirm docket entries:
    - Filing of Motion to Consolidate on or about **February 23, 2026**.
    - Absence of a ruling line item before the March 10 Judgment.
  - Treat this as a potential procedural gap for appeal / motion to reconsider.

- **Uninhabitability defense**:
  - Raised as a defense but deemed “outside scope” of a holdover proceeding.
  - Judgment appears to treat habitability strictly as counterclaim/cross‑claim material.
  - Preserve this defense for:
    - Appeal briefing; and
    - Counterclaims / related arbitration under 26CV005596-590.

- **Possession status**:
  - Judgment orders defendant removed from the premises.
  - Record explicit language about “possession” and any grace periods or move‑out dates.
  - Note the “mentally vacated” claim vs. actual possessions still on premises for risk analysis and move planning.

### 4. Contrastive summary (Judgment vs. Register)

After re‑running OCR, use `/tmp/legal-doc-processing/contrastive_comparison.md` to populate:

- **Overlaps**:
  - Case caption, party names, and basic relief match between Judgment and Register.
  - Verify that the Register shows the same judgment date and outcome as the PDF.

- **Differences / omissions**:
  - Any motions or hearings appearing in the Register but not referenced in the Judgment (especially the Motion to Consolidate).
  - Any dates or events around habitability issues present in the Register but omitted from the Judgment narrative.

- **Timeline reconstruction**:
  - Summarize key dates:
    - Filing of Complaint / Summons.
    - Filing of Motion to Consolidate (02/23/2026).
    - Arbitration order in 26CV005596-590 (03/03/2026).
    - Judgment in 26CV007491-590 (03/10/2026).
  - Use this as a basis for appeal / stay / reconsideration briefs.

### 5. Next actions connected to this analysis

- **For filings**:
  - Use this document as a reference when drafting:
    - Notice of Appeal;
    - Motion to Stay Execution;
    - Motion to Reconsider (re: unaddressed Motion to Consolidate).

- **For move planning**:
  - Coordinate this analysis with the move plan in `POST-TRIAL/26CV007491-590-MOVE-PLAN.md` so that:
    - Evidence critical to habitability and consolidation issues is packed and preserved first.
    - Physical move schedule does not jeopardize access to documents needed for appeal/arbitration.


# Validation Consolidation Truth — Index

**Generated report:** `../reports/CONSOLIDATION-TRUTH-REPORT.md`  
**Regenerate:** `./compare-all-validators.sh [--latest] [files...]` or `advocate compare-validators` / `ay compare-validators`  
**Metric standard (%/#, %.#, one constant):** `../docs/VALIDATION_METRICS_AND_PROGRESS.md`

---

## Existing Validators Audit

### File-level (email) validators (5)

| # | Script | Role |
|---|--------|------|
| 1 | `pre-send-email-gate.sh` | Placeholder, legal citation, Pro Se signature, attachments, mesh |
| 2 | `validation-runner.sh` | Orchestrates validation-core.sh (4 checks) |
| 3 | `pre-send-email-workflow.sh` | Full ceremony: ROAM, WSJF, coherence, 33-role (optional) |
| 4 | `comprehensive-wholeness-validator.sh` | Wholeness/circle checks (--target-file) |
| 5 | `mail-capture-validate.sh` | Mail.app extraction, 33-role council (needs click/textual) |

### Core / orchestration (2)

| # | Script | Role |
|---|--------|------|
| 1 | `validation-core.sh` | Pure functions + CLI: placeholders, signature, citations, attachments |
| 2 | `validation-runner.sh` | Sources core, runs all 4 checks, PASS/FAIL/VERDICT |

### Project-level validators (4)

| # | Script | Role |
|---|--------|------|
| 1 | `unified-validation-mesh.sh` | Feature-flagged mesh (placeholder, cyclic regression, legal, attachment, auto-fix) |
| 2 | `validate_coherence.py` | DDD/ADR/TDD/PRD coherence |
| 3 | `check_roam_staleness.py` | ROAM_TRACKER freshness |
| 4 | `contract-enforcement-gate.sh` | ROAM/contract staleness (e.g. 96h) |

---

## Overlap Analysis

| Check | In core | In gate | In mesh | In workflow | In mail-capture |
|-------|---------|---------|---------|-------------|-----------------|
| Placeholder detection | ✓ | ✓ (sources core) | ✓ (own block) | ✓ (final check) | — |
| Legal citation | ✓ | ✓ (sources core) | ✓ | — | — |
| Pro Se signature | ✓ | ✓ (sources core) | — | — | — |
| Attachments | ✓ | ✓ (sources core) | ✓ | — | — |
| Council / multi-role | — | — | — | 33-role optional | 33-role |

- **Placeholder:** core (source of truth) → gate, workflow final step; mesh has separate block (feature-flagged).
- **Signature / citations / attachments:** core → gate; mesh has own logic for some.
- **Duplication removed:** gate and runner use core only; mesh still has its own placeholder block (optional future refactor).

---

## How to Run (one constant: ship %/# first)

```bash
# Per-check (source of truth)
./validation-core.sh email --file email.eml --check all --json

# Semi-auto max coverage (runner + gate)
./validation-runner.sh email.eml
./pre-send-email-gate.sh email.eml

# Via advocate/ay
advocate validate-email email.eml
ay validate-email email.eml

# Full comparison → reports/CONSOLIDATION-TRUTH-REPORT.md (%/# and What works NOW)
./compare-all-validators.sh
# or
advocate compare-validators
ay compare-validators
```

---

## Current State (fill from latest report)

After running `./compare-all-validators.sh` (e.g. 2026-02-26 run):

- **%/# file-level:** 8/10 PASS (80%) — Green: pre-send-email-gate.sh, validation-runner.sh, pre-send-email-workflow.sh, comprehensive-wholeness-validator.sh; SKIP: mail-capture-validate.sh (deps: pip install click textual).
- **%/# project-level:** 3/4 PASS (75%) — Green: unified-validation-mesh.sh, check_roam_staleness.py, contract-enforcement-gate.sh; SKIP: validate_coherence.py (exit 124/timeout or JSON).
- **Progress[now]:** [80%, —, T_remaining to Trial #1, 80% file-level implementation] — see `docs/VALIDATION_METRICS_AND_PROGRESS.md` for %.# velocity and 4D vector.

---

## Consolidation-first

- **Architecture:** core → runner → compare → report. Already consolidated.
- **Fix in-place:** quoting (FILE path), deps (pip install click textual), PASS/FAIL/JSON parsing for Python validators. No new build; extend coverage from ~40% toward ~90%.
- **Then extend:** RAG/AgentDB, LLMLingua, LazyLLM, agentic-qe fleet, Claude Flow hooks.

See `FIX-CHECKLIST.md` in this directory for remaining tasks.

---

## Claude Flow (optional)

Run in project root for hooks and daemon (user environment; not required for validation pipeline):

```bash
npm install -g @claude-flow/cli@latest
cd /path/to/agentic-flow
npx @claude-flow/cli@latest daemon start
npx @claude-flow/cli@latest hooks session-start --auto-configure
npx @claude-flow/cli@latest doctor --fix
```

---

## agentic-qe and fleet (optional)

```bash
npx agentic-qe@latest init --auto
# Then: aqe fleet orchestrate --task email-validation --agents qe-quality-gate,qe-test-executor --topology hierarchical
# Or run: npx tsx scripts/validation-with-fleet.ts <email-file>
```

See scripts/README-VALIDATION.md and validation-with-fleet.ts for wiring.

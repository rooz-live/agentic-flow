# Measured test run — validation lane (2026-03-25)

Runs executed from repo root: `investing/agentic-flow`

| Script | Exit | Notes |
|--------|------|--------|
| `tests/test-validation-core.sh` | 0 | `PASS: validation-core fixture tests completed` — **6** scenarios reported by script output |
| `tests/test-validation-runner.sh` | 0 | `PASS: validation-runner tests (process_result + JSON contract)` |
| `tests/test-email-hash-db.sh` | 0 | `email-hash-db CRUD tests: OK` — 3 PASS lines |

## Function inventory vs automated coverage (honest, not “% theater”)

Counts are **static** (grep `^core_*()` / `^name()`) unless noted.

| Category | Functions (approx) | Automated tests | Coverage note | Gap |
|----------|-------------------|-----------------|---------------|-----|
| **validation-core.sh** | **10** `core_*` entry points | `tests/test-validation-core.sh` | Exercises **placeholders** + **date consistency** (skip / past / ambiguous paths) | Remaining `core_*` checks need explicit fixtures + assertions |
| **_SYSTEM/_AUTOMATION/email-hash-db.sh** | **6** (`init_hash_db`, `compute_email_hash`, `check_duplicate_email`, `acquire_lock`, `release_lock`, `register_hash`) | `tests/test-email-hash-db.sh` | CRUD / lock / duplicate path | Edge cases (corrupt log, concurrent lock timeout) not covered |
| **validation-runner.sh** | **1**+ (`process_result`); runner body is procedural | `tests/test-validation-runner.sh` | PASS/WARN/FAIL + JSON contract | Full check enumeration / integration with `validation-core` not in this test file |
| **post-send-hook.sh** | **4** (`execute_post_send`, `archive_email`, `update_ledger`, `main`) | **None** in `tests/` | Manual / script smoke only | Add `tests/test-post-send-hook.sh` or fold into Playwright/API lane |

## Path 68% → 80% (method)

Use **count of functions with at least one automated assertion**, not vanity percentages:

1. List all `core_*` in `scripts/validation-core.sh`.
2. For each, add or extend `tests/test-validation-core.sh` (fixture in `tests/fixtures/eml/`).
3. Add runner integration test that invokes a **minimal** email through runner with mocked deps if needed.
4. Add `post-send-hook` unit test (temp dir, no real archive).

## Re-run

```bash
cd investing/agentic-flow
./tests/test-validation-core.sh && ./tests/test-validation-runner.sh && ./tests/test-email-hash-db.sh
```

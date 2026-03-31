# ROAM-First Preservation and QE Uplift — Deliverables

<!-- @business-context WSJF-42: Preserve capabilities before archive/removal; measurable QE uplift -->
<!-- @constraint DDD-LEGAL: Validation/send pipeline anchored in BHOPTI-LEGAL `_SYSTEM/_AUTOMATION` -->
<!-- @adr ADR-019: Validator inventory and exit semantics as contract surface -->

**Generated**: 2026-03-25  
**Scope**: Full workspace QE (inventory-first, no destructive cleanup executed in this artifact)  
**Related**: [DISK-CLEANUP-EMERGENCY-2026-03-25.md](./DISK-CLEANUP-EMERGENCY-2026-03-25.md)

---

## Phase 0 — Preservation ledger (no-delete)

### ROAM risk: capability loss before archive/removal

| ROAM | Risk | Mitigation in this cycle |
|------|------|---------------------------|
| **R (Resolve)** | Deleting caches/backups/repos without inventory loses recoverable evidence and tooling | Ledger below; no delete actions in this deliverable |
| **O (Owned)** | Disk/process ownership unclear → wrong remediation | Classify paths by reversibility and blast radius |
| **A (Accepted)** | Re-download cost (iCloud evict), IDE cache rebuild | Document trade-off; user accepts latency |
| **M (Mitigated)** | Repeat 99% disk fill | Monitoring + staged cleanup SOP (see Phase 4) |

### Critical automation assets (preserve)

| Asset | Path | Role | Reversibility |
|-------|------|------|----------------|
| Exit code registry | `BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/exit-codes.sh` → `exit-codes-robust.sh` (symlink) | Single semantic contract | High — restore from git |
| Validation core | `.../validation-core.sh` | Pure validators (no state) | High |
| Hash DB | `.../email-hash-db.sh` | Duplicate send protection | Medium — backup `.email-hashes.db` |
| Runner | `.../validation-runner.sh` | Orchestration, state, checks 1–10 | Medium — `.validation-state/` |
| RFC5322 validator | `.../validate-email.sh` | Pre-send gate, arbitration-critical | High |
| State dir | `.../.validation-state/` | History / regression baseline | Low without backup |
| Dashboard bridge | `BHOPTI-LEGAL/00-DASHBOARD/email-server.js` | `/validate-full` → runner | High |

### Mover / outreach EML preparation (operational truth)

| Location | Purpose |
|----------|---------|
| `12-AMANDA-BECK-110-FRAZIER/movers/` | Company movers, Thumbtack, outreach drafts |
| `12-AMANDA-BECK-110-FRAZIER/movers/sent/` | Sent copies (evidence) |
| `00-DASHBOARD/public/02-EMAILS/drafts/` | Secondary drafts (e.g. urgent outreach) |
| API | `email-server.js` — `scanMoverEmailStats()` / `/api/mover-email-stats` (scans configured email trees) |

### Disk pressure hotspots (from emergency report — inventory only)

Reference ranked consumers and recovery options in [DISK-CLEANUP-EMERGENCY-2026-03-25.md](./DISK-CLEANUP-EMERGENCY-2026-03-25.md) (e.g. CloudDocs, MobileSync, IDE caches). **Do not run destructive commands** until Phase 4 gate passes.

**Read-only sizing commands** (for your next session):

```bash
du -sh ~/Library/ ~/Downloads/ ~/.docker 2>/dev/null
find ~ -type f -size +1G 2>/dev/null | head -50
```

---

## Phase 1 — Evidence and velocity scorecards (`%/#`, `%.#`)

### Incident–evidence coverage (template)

\[
\text{Coverage} = \bigl(0.30\cdot\frac{\text{Incidents addressed}}{\text{Total}} + 0.25\cdot\frac{\text{Automated steps}}{\text{Total steps}} + 0.20\cdot\frac{\text{Verified fixes}}{\text{Total fixes}} + 0.15\cdot\frac{\text{Iterated processes}}{\text{Total processes}} + 0.10\cdot\frac{\text{Evidence complete}}{\text{Evidence required}}\bigr)\times 100
\]

**This cycle (BHOPTI automation test suites — measured)**:

| Metric | Value |
|--------|--------|
| `test-validation-core.sh` | **23/23** passed |
| `test-email-hash-db.sh` | **25/25** passed |
| `test-validation-runner.sh` | **20/20** passed |
| Combined assertions | **68/68** (100% pass rate for these suites) |

Fill numerator/denominator for *workspace incidents* in your ROAM tracker as you close items.

### Velocity precision (`%.#`)

| Signal | Suggested cadence | Notes |
|--------|---------------------|--------|
| Ceremony (standup, retro, replenish, refine) | Daily / weekly | No code timer — process discipline |
| Live ETA / SLA / validation polling | Hourly or on-demand | Align with dashboard refresh |
| P0 disk / arbitration | Real-time while blocked | WSJF dominates |

**Session-oriented metrics** (for retros): scripts touched, lines changed, tests added, exit-code matches — record manually or via git diff stats.

---

## Phase 2 — Function inventory and automated coverage map

### `validation-core.sh` (315 lines)

| Function | Automated in `tests/test-validation-core.sh` |
|----------|-----------------------------------------------|
| `validate_placeholders` | Yes |
| `validate_employment_claims` | Yes |
| `validate_legal_citations` | Yes |
| `validate_required_recipients` | Yes |
| `validate_trial_references` | Yes |
| `validate_attachments` | Yes |
| `validate_date_consistency` | Yes |
| `get_placeholder_details` | Yes (output) |
| `get_employment_claim_details` | Yes (output) |
| `get_missing_recipients` | Yes (output) |
| `get_missing_attachments` | Yes (output) |

**Gap**: None for listed functions; optional: expand edge-case fixtures for attachment path resolution.

### `email-hash-db.sh` (323 lines)

| Function | Automated in `tests/test-email-hash-db.sh` |
|----------|---------------------------------------------|
| `init_hash_db` | Yes |
| `acquire_lock` / `release_lock` | Exercised via record/update paths |
| `compute_email_hash` | Yes |
| `extract_subject` | Yes |
| `check_duplicate_email` | Yes |
| `record_email_hash` | Yes |
| `update_email_status` | Yes |
| `query_hash_db` | Yes (filter paths) |
| `show_hash_stats` | Yes |
| `show_help` / `main` | CLI smoke |

**Gap**: Stress/concurrent lock contention (optional); corrupt DB recovery.

### `validation-runner.sh` (569 lines)

| Function / behavior | Automated in `tests/test-validation-runner.sh` |
|---------------------|-----------------------------------------------|
| `main` / `--help` / `--version` / missing file | Yes |
| `run_validation_pipeline` (clean fixture) | Yes |
| `--strict` | Yes |
| State files (`current-run.json`, regression DB) | Partial (asserts file presence / fields) |
| `auto_fix_*` | Not fully isolated (FEATURE_AUTO_FIX default false) |
| Individual `log_check_result` unit | Indirect |

**Gap**: Failure-branch exit codes per duplicate/placeholder/past-date; auto-fix with temp copy; full regression baseline edge cases.

### `validate-email.sh` (544 lines)

| Coverage | Status |
|----------|--------|
| Automated suite under `_AUTOMATION/tests/` | **No dedicated `test-validate-email.sh`** in repo survey |
| Manual / operational | Primary path for arbitration correspondence |

**Gap (high WSJF)**: Add `tests/test-validate-email.sh` with fixtures for headers, temporal checks, ADR gate skip/pass (mock path), known-bounce list.

### `post-send-hook.sh` (agentic-flow, 40 lines)

| Function | Tests |
|----------|--------|
| `execute_post_send`, `archive_email`, `update_ledger`, `main` | **None** (stub implementations) |

**Gap**: When behavior becomes non-stub, add `tests/test-post-send-hook.sh` and integration with sent-log / hash DB record.

---

## Phase 3 — Prioritized test backlog toward ~80% target

Assumptions: “80%” = **function-level** or **check-level** coverage on the validation chain, not arbitrary line % of `validate-email.sh` only.

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | `test-validate-email.sh`: To/Cc folding, In-Reply-To/References, duplicate fingerprint, temporal checks | 4–6 h | Arbitration safety |
| P1 | `test-validation-runner.sh`: exit code branches (duplicate, placeholder, past date) with fixtures | 2–3 h | Send gate alignment |
| P1 | Shellcheck CI: `shellcheck -x` on `_AUTOMATION/*.sh` | 1–2 h | Method score |
| P2 | `post-send-hook.sh`: real archive + ledger + hash `record` integration test | 2–4 h | Post-send traceability |
| P2 | `test-validation.sh` (legacy) → remove hardcoded paths or gate behind env | 1 h | Portability |

### Method score (from your formula)

\[
\text{Method} = 0.30\cdot\frac{\text{Shellcheck clean}}{\text{Scripts}} + 0.40\cdot\frac{\text{Function tests}}{\text{Functions}} + 0.30\cdot\frac{\text{CRUD tests}}{\text{CRUD functions}}
\]

Use current shellcheck snapshot (§Phase 4) and function table above to recompute after each sprint.

---

## Phase 4 — Shellcheck snapshot and exit-code contract

### `exit-codes.sh` vs `exit-codes-robust.sh`

- **Fact**: `exit-codes.sh` is a **symlink** to `exit-codes-robust.sh` — no drift between filenames in this tree.
- **Contract**: All validators should `source` `exit-codes.sh` (one canonical entry).

### Shellcheck (ShellCheck 0.11.0, default flags, 2026-03-25)

| Script | Findings (lines) | Severity mix |
|--------|------------------|--------------|
| `exit-codes-robust.sh` | 0 | — |
| `validate-email.sh` | 0 | — |
| `validation-runner.sh` | 3 | SC1091 (source not followed — use `shellcheck -x` or suppress with file list) |
| `email-hash-db.sh` | 2 | SC2034 (unused `BASE_DIR`), SC1091 |
| `validation-core.sh` | 28 | SC1091 + SC2086 (quote `$email_file` in `return`) |

**Priority fixes**: (1) Run `shellcheck -x` in CI with all sources on the command line; (2) address SC2086 in `validation-core.sh` for robustness; (3) remove or use `BASE_DIR` in `email-hash-db.sh`.

---

## Phase 5 — Pre-commit and CI gates (specification)

### Existing (workspace root) [.pre-commit-config.yaml](../../../.pre-commit-config.yaml)

- Annotation audit, ROAM staleness, contract enforcement (advisory on pre-commit, verify on pre-push), ESLint, etc.

### Recommended additions for **BHOPTI validation chain**

| Gate | Command | Frequency | Fail condition |
|------|---------|-----------|----------------|
| Validation unit suites | `bash _SYSTEM/_AUTOMATION/tests/test-validation-core.sh` | pre-commit (legal paths) or CI | Non-zero exit |
| Hash DB CRUD | `bash _SYSTEM/_AUTOMATION/tests/test-email-hash-db.sh` | same | Non-zero exit |
| Runner smoke | `bash _SYSTEM/_AUTOMATION/tests/test-validation-runner.sh` | same | Non-zero exit |
| Shellcheck | `shellcheck -x` on `_SYSTEM/_AUTOMATION/*.sh` | weekly or CI | New errors (warn advisory first) |

**Note**: Pre-commit hooks must reference paths valid from repo root; if BHOPTI-LEGAL lives outside `Documents/code`, run these suites from CI with absolute or env-based `BHOPTI_LEGAL_ROOT`.

### Protocol score (deploy + CI)

Track: commits vs required verification, contract tests (`validate-full` / smoke script), backward compatibility of exit codes (`EXIT_SUCCESS_WITH_WARNINGS=1` still “send-ready” per policy).

---

## Phase 6 — Cleanup decision gate (reversible actions only after preconditions)

**Preconditions before any `rm`, `docker prune`, or backup delete:**

1. **Evidence**: Current `df -h` and `du` snapshot stored next to [DISK-CLEANUP-EMERGENCY-2026-03-25.md](./DISK-CLEANUP-EMERGENCY-2026-03-25.md).
2. **Tests**: `test-validation-core.sh`, `test-email-hash-db.sh`, `test-validation-runner.sh` all green.
3. **Backup**: MobileSync / CloudDocs / mail — explicit external copy or Apple-ID verification per emergency doc.
4. **Rollback**: Document restore steps (e.g. Time Machine, re-download, `git checkout`).

**Staged tiers** (from emergency report):

| Tier | Action class | Reversibility |
|------|--------------|---------------|
| 1 | Safe caches (browser/IDE cache dirs) | High |
| 2 | Archive MobileSync to external disk | Medium |
| 3 | Evict CloudDocs | Medium (network cost) |
| 4 | `docker system prune -a` | Low for unused images — verify no needed containers |

---

## Summary table — category coverage (plan-style)

| Category | Functions (approx) | Manual / ops | Automated | Est. coverage | Gap |
|----------|---------------------|--------------|-----------|----------------|-----|
| **validation-core.sh** | 11 | spot checks | 23 tests | High | Edge cases only |
| **email-hash-db.sh** | 12 | ops | 25 tests | High | Concurrency / corruption |
| **validation-runner.sh** | 9 + pipeline | ops | 20 tests | Medium | Failure branches, auto-fix |
| **validate-email.sh** | 21 checks (procedural) | primary | **0 dedicated** | Low | **P0 test file** |
| **post-send-hook.sh** | 4 | none | 0 | None | Implement + test when real |

| **Total automated assertions (3 suites)** | — | — | **68** | See Phase 1 | +validate-email +post-send |

---

## Next actions (execution order)

1. Keep preservation ledger updated when moving/archiving any path in the hotspot list.
2. Add `tests/test-validate-email.sh` with fixture `.eml` files under `_SYSTEM/_AUTOMATION/tests/fixtures/`.
3. Wire optional pre-commit hook or CI job to run the three existing test scripts.
4. Re-run shellcheck with `-x` and fix SC2086 / unused vars in priority order.

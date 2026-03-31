# T0 operational retro — metrics, ROAM, decisions (no completion theater)

Use this after a session, disk action, or governance cycle. Fill **numbers**, not adjectives.

**Related:** [T0-GO-NO-GO-SEND-READY.md](T0-GO-NO-GO-SEND-READY.md) · [DISK-ROAM-RUNBOOK.md](../reports/DISK-ROAM-RUNBOOK.md) · [EMAIL-HASH-RETENTION.md](EMAIL-HASH-RETENTION.md) · [PRE-COMMIT-SCOPE.md](PRE-COMMIT-SCOPE.md) · [TEST-COVERAGE-MEASURED-2026-03-25.md](../reports/TEST-COVERAGE-MEASURED-2026-03-25.md) · [SESSION-SUMMARY-REFERENCE.md](../reports/SESSION-SUMMARY-REFERENCE.md)

---

## 1. Before / After (copy row per metric)

| Metric | Before | After | Source / command |
|--------|--------|-------|------------------|
| Disk avail ($HOME vol) | | | `df -h "$HOME"` |
| Disk used % | | | same |
| `ay` band / exit | | | last `ay` run + `reports/aisp-status.json` |
| Send-ready (draft id) | | | `validate-full` JSON |
| Uncommitted files | | | `git status -sb` |
| Tests (3 scripts) | | | `./tests/test-validation-core.sh` etc. |
| Shellcheck (staged) | | | `./scripts/shellcheck-count-staged-sh.sh` |

---

## 2. ROAM updates (O → R or other)

| Risk ID | From → To | Evidence link | Owner |
|---------|-----------|---------------|-------|
| | Open → Resolved | | |
| | Open → Mitigated | | |

---

## 3. Lessons learned

- **Worked:**
- **Needs improvement:**

---

## 4. Next actions — Retro vs Iterate

| Decision | Trigger | Next step |
|----------|---------|-----------|
| **Retro** | Pattern repeated 3+ times / blast radius high | Schedule; update ROAM |
| **Iterate** | Single fix verified | Next smallest safe change |

---

## 5. Safety chain (every material action)

1. **Pre-backup:** `tar czf backup-YYYYMMDD-HHMM.tgz …` (or `git stash` + tag) before destructive or wide edits.
2. **Exit codes:** capture `$?` and log path; use `_SYSTEM/_AUTOMATION/explain-exit-code.sh` where helpful.
3. **Verification:** re-run the same `df` / test / `curl` probe after the action.
4. **Rollback:** target &lt;30s — `git restore --staged --worktree <paths>` or extract known-good tarball.

---

## 6. Cleanup / archive decision table (defaults)

| Action | Blast radius | Decision |
|--------|--------------|----------|
| Delete email hash log (e.g. `agentic-email-hashes.log` / `.email-hashes.db`) | **EXTREME** — production / legal chain | **NO-GO. NEVER DELETE.** See [EMAIL-HASH-RETENTION.md](EMAIL-HASH-RETENTION.md). |
| `docker system prune -a` | LOW disk yield vs **T1** cold-build latency | **DEFER / SKIP** unless disk emergency + re-warm plan |
| Large files &gt;1G | Models, backups, session archives | **ARCHIVE ONLY** — `tar` + checksum; no blind `rm` |
| Remove “stale” scripts | Capability loss (hasher, alerts, generators) | **NO-GO** without inventory + test replacement |
| IDE / browser caches | UX latency; small disk vs `~/Library` | **CASE-BY-CASE** — if `curl` works and browser fails, cache first |

---

## 7. Conditional GO — DoR / DoD (which contract?)

| Contract | DoR (ready to run) | DoD (done) |
|----------|-------------------|------------|
| **T0 `ay` cycle** | Terminal OK, `PROJECT_ROOT` set | Band ≥50% per [T0-GO-NO-GO-SEND-READY.md](T0-GO-NO-GO-SEND-READY.md) |
| **Email send** | `validate-full` + send gate aligned | Sent + logged; `post-send` / ledger if used |
| **Governance** | `ay --check` / advocate env | `aisp-status.json` written + exit as policy |

**Temporal:** arbitration / filing dates → `validate-email.sh` + `validation-core` date checks; track days in ROAM.

**Lateral:** runner + exit-code registry changes → run the three tests + shellcheck staged files.

**SA vs FA:** FA only with full gates; else SA.

---

## 8. Pre-commit — honest latency

Hooks block **staged** `.sh` / `.eml` per [PRE-COMMIT-SCOPE.md](PRE-COMMIT-SCOPE.md). “&lt;1s” is **not** guaranteed; “blocked on failure when hook runs” **is**.

---

## 9. WSJF hint block (per incident)

- **BV / TC / RR-OE / JobSize:** (scores)
- **Why now:** (deadline, disk, regression)
- **Blast radius / reversibility / detection latency / fix complexity:** (one line each)

---

## 10. Shellcheck spot-check (measured 2026-03-25)

| Script | `shellcheck` lines (this machine) | Note |
|--------|-----------------------------------|------|
| `investing/agentic-flow/scripts/post-send-hook.sh` | **0** | Clean |
| `investing/agentic-flow/_SYSTEM/_AUTOMATION/exit-codes-robust.sh` | **0** | Clean |
| `investing/agentic-flow/scripts/exit-codes.sh` | **1** default; **7** with `shellcheck -x` | SC1091 on `source` unless `-x` |
| `BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/mark-email-sent.sh` | **48** | Remediate or suppress with justification |

---

## 11. Canonical script roots (two repos — **not** identical on disk)

**There is no single physical file** that is both “QE canonical” and “BHOPTI daily ops canonical” for core validators today: trees **differ** in line count and behavior. Treat **path + repo** as part of the contract.

### 11.1 `investing/agentic-flow` — what automated tests actually load

| Test | Sources / invokes |
|------|-------------------|
| `tests/test-validation-core.sh` | `scripts/validation-core.sh` |
| `tests/test-validation-runner.sh` | `scripts/validators/file/validation-runner.sh` |
| `tests/test-email-hash-db.sh` | `_SYSTEM/_AUTOMATION/email-hash-db.sh` (**not** `scripts/email-hash-db.sh`) |
| `tests/test-post-send-hook.sh` | `scripts/post-send-hook.sh` |

**Internal duplicate (high drift risk):** `scripts/email-hash-db.sh` and `_SYSTEM/_AUTOMATION/email-hash-db.sh` are **different files** in the same repo. Prefer **`_SYSTEM/_AUTOMATION/email-hash-db.sh`** for anything aligned with tests and retention banners unless you explicitly reconcile the copies.

**Other copies:** `rust/ffi/scripts/` holds additional `validation-core.sh` / `validation-runner.sh` for FFI — verify separately if you change core behavior.

### 11.2 `BHOPTI-LEGAL` — operational root for legal workflow

| Role | Path |
|------|------|
| Daily automation, `ROAM-WSJF-*.sh`, local validators | `…/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/*.sh` |
| Alternate `exit-codes-robust` | `…/BHOPTI-LEGAL/_SYSTEM/exit-codes-robust.sh` (second copy) |

Pre-commit in agentic-flow may call `validate-email.sh` via `BHOPTI_VALIDATE_EMAIL` defaulting to this tree ([`PRE-COMMIT-SCOPE.md`](PRE-COMMIT-SCOPE.md)).

### 11.3 Merge / promotion rule (avoid false confidence)

1. After editing **agentic-flow**, run `./tests/test-validation-core.sh`, `test-validation-runner.sh`, `test-email-hash-db.sh`, and `test-post-send-hook.sh` as needed.
2. If BHOPTI must match, **diff** the paired files and either promote one direction or document **intentional** divergence in ROAM.
3. **Never** “clean up” by deleting BHOPTI-only helpers (`mark-email-sent.sh`, deadline tooling) without replacement tests.

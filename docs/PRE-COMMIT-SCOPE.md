# Pre-commit — what actually blocks (honest scope)

Configuration: [`.pre-commit-config.yaml`](../.pre-commit-config.yaml)

## Hook parity (trust gates)

**Single implementation:** [`scripts/hooks/run-commit-gates.sh`](../scripts/hooks/run-commit-gates.sh)

Both of these must stay aligned:

| Mechanism | What runs |
|-----------|-----------|
| **`pre-commit` (framework)** | Local hooks in `.pre-commit-config.yaml` call `run-commit-gates.sh` with subcommands `dates`, `csqbm`, `audit` (three separate hook IDs for granular `pre-commit run <id>`). |
| **`core.hooksPath=.git-hooks`** | [`.git-hooks/pre-commit`](../.git-hooks/pre-commit) runs `run-commit-gates.sh all` **first** (step 0/6), then secrets, lint, pytest, DoD, break-glass. |

**Order (`.git-hooks`):** trust gates fail-fast before secret scanning and tests.

### Subcommands

| Subcommand | Behavior |
|------------|----------|
| `dates` | `validate-dates.sh --file` (default fixture: `tests/fixtures/perfect-pass-dates.txt`; override with `VALIDATES_DATES_FIXTURE`). |
| `csqbm` | `CSQBM_CI_MODE=true`, `CSQBM_DEEP_WHY=true`, optional hydration insert into `.agentdb/agentdb.sqlite`, then `check-csqbm.sh` (deterministic CI path — no IDE log archaeology). |
| `audit` | `contract-enforcement-gate.sh audit` |
| `all` | `dates` → `csqbm` → `audit` (unless `COMMIT_GATES_FAST=1`, which skips `audit`). |

### Environment variables

| Variable | Effect |
|----------|--------|
| `SKIP_COMMIT_GATES=1` | Skips gates with a warning — **break-glass only**; document in ROAM / ledger. |
| `COMMIT_GATES_FAST=1` | For `all` only: skip annotation audit (still runs dates + CSQBM). |
| `VALIDATES_DATES_FIXTURE` | Alternate path for the date fixture file. |
| `CSQBM_DEEP_WHY` | Passed through (default `true` in script) for parity with trust bundle. |

### Break-glass

`git commit --no-verify` bypasses **all** hooks (including trust gates). Not recommended; ledger policy treats this as explicit risk.

---

## Hook 1–3 (framework names): `semantic-date-alignment`, `deep-foundation-evidence-audit`, `annotation-audit`

- **Entry:** `bash scripts/hooks/run-commit-gates.sh` with `dates`, `csqbm`, or `audit`.
- **Blocks when:** the underlying validator exits non-zero.
- **Scope:** `pass_filenames: false`, `always_run: true` — not limited to staged paths for these three gates.

## Hook 4: `shellcheck-and-eml-validate`

- **Entry:** [`scripts/hooks/pre-commit-staged-validation.sh`](../scripts/hooks/pre-commit-staged-validation.sh)
- **Blocks when:**
  1. **Staged `*.sh`:** `shellcheck` is on PATH and any staged shell file fails `shellcheck "$f"`.
  2. **Staged `*.eml` / `*.email`:** validator exists at `BHOPTI_VALIDATE_EMAIL` or default `~/Documents/Personal/.../BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/validate-email.sh` — each file is run through it; non-zero fails commit.
  3. **If validator missing:** hook prints WARN and **exits 0** for `.eml` (does not block on email validation).
- **Extra:** When specific paths change (hash-db, validation-core, runner, fixtures, tests listed in the script), runs:
  - `./tests/test-email-hash-db.sh`
  - `./tests/test-validation-core.sh`
  - `./tests/test-validation-runner.sh`

## What does *not* block

- Unstaged files.
- File types outside `.sh` / `.eml` / `.email` (unless the path triggers the validation test trio).
- Full-repo shellcheck of every `.sh` — only **staged** `.sh`.

## Latency

Sub-second is **possible** for tiny diffs; not guaranteed. Cost = trust gates (dates + AgentDB CSQBM + contract audit) + shellcheck + optional validate-email + optional three test scripts.

## Optional: shellcheck error counts

```bash
./scripts/shellcheck-count-staged-sh.sh
```

Reports per-file issue counts for **staged** `*.sh` (exit 0 even if issues; use for visibility).

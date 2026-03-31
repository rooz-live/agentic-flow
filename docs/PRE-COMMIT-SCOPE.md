# Pre-commit — what actually blocks (honest scope)

Configuration: [`.pre-commit-config.yaml`](../.pre-commit-config.yaml)

## Hook 1: `annotation-audit`

- **Entry:** `bash scripts/validators/project/contract-enforcement-gate.sh audit`
- **Blocks when:** the audit script exits non-zero (annotation / contract rules).
- **Scope:** repo-wide policy for that gate, not per-file staged filtering in the hook definition (`pass_filenames: false`, `always_run: true`).

## Hook 2: `shellcheck-and-eml-validate`

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

Sub-second is **possible** for tiny diffs; not guaranteed. Cost = shellcheck + optional validate-email + optional three test scripts.

## Optional: shellcheck error counts

```bash
./scripts/shellcheck-count-staged-sh.sh
```

Reports per-file issue counts for **staged** `*.sh` (exit 0 even if issues; use for visibility).

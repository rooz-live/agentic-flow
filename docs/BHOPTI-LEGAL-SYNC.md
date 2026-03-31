# BHOPTI-LEGAL sync (dual-repo automation)

Single source of truth for bash automation in this repo: **`investing/agentic-flow`** under `_SYSTEM/_AUTOMATION/`.

## Files to keep aligned

| agentic-flow | Typical BHOPTI-LEGAL path |
|--------------|---------------------------|
| [`_SYSTEM/_AUTOMATION/email-hash-db.sh`](../_SYSTEM/_AUTOMATION/email-hash-db.sh) | `BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/email-hash-db.sh` (copy or symlink) |
| [`_SYSTEM/_AUTOMATION/validate-email.sh`](../_SYSTEM/_AUTOMATION/validate-email.sh) | Same relative path under `BHOPTI-LEGAL` |
| [`_SYSTEM/_AUTOMATION/exit-codes-robust.sh`](../_SYSTEM/_AUTOMATION/exit-codes-robust.sh) | Same |

## Environment

- Set `LEGAL_ROOT` to the BHOPTI-LEGAL tree when running tools that emit `06-EMAILS/.meta/` artifacts.
- `ARBITRATION_DATE` / `MIN_DAYS_BEFORE_ARBITRATION` / `SKIP_ARBITRATION_WINDOW` control the pre-send policy gate in `validate-email.sh`.

## Checklist on change

1. Edit and test in `agentic-flow` (`./tests/test-email-hash-db.sh`, `./tests/test-validation-core.sh`, `./tests/test-validation-runner.sh`).
2. Copy or symlink updated scripts into `BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/` if that tree is the send-time runtime.
3. Run `./scripts/dev/count-shellcheck.sh` on both trees if paths diverge.

Optional: set `BHOPTI_LEGAL_ROOT` in CI and run a one-line `diff -q` between canonical and deployed copies.

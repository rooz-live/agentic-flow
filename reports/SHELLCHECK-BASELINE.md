# Shellcheck baseline (agentic-flow)

Generated as part of validation gap closure. Re-run after edits:

```bash
cd investing/agentic-flow
shellcheck _SYSTEM/_AUTOMATION/exit-codes-robust.sh _SYSTEM/_AUTOMATION/exit-codes.sh \
  scripts/exit-codes.sh scripts/validators/file/validation-runner.sh \
  scripts/validators/file/semantic-validation-gate.sh _SYSTEM/_AUTOMATION/validate-email.sh
```

## Latest results (summary)

| Script | Result |
|--------|--------|
| `_SYSTEM/_AUTOMATION/exit-codes-robust.sh` | Clean |
| `_SYSTEM/_AUTOMATION/exit-codes.sh` | Clean (wrapper) |
| `scripts/exit-codes.sh` | Sources `exit-codes-robust.sh` + helpers; SC1091 info only unless `-x` |
| `scripts/validators/file/validation-runner.sh` | SC2259 fixed (`python3 -c`); SC1091 for dynamic sources |
| `scripts/validators/file/semantic-validation-gate.sh` | SC2034 handled for reserved vars; TODAY used in Check 2 |
| `_SYSTEM/_AUTOMATION/validate-email.sh` | Quote fixes for SC2086 where applied |
| `_SYSTEM/_AUTOMATION/email-hash-db.sh` | Sourced mode: no strict `set -e` imposed on caller |

Full machine output is not stored here; use the command above for CI drift detection.

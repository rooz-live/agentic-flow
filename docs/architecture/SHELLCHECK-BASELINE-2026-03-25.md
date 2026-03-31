# Shellcheck baseline (2026-03-25)

Recorded with ShellCheck (default severity). Re-run after edits:

```bash
cd investing/agentic-flow/scripts/validators/file
shellcheck -x validation-runner.sh

shellcheck _SYSTEM/_AUTOMATION/exit-codes.sh
shellcheck _SYSTEM/_AUTOMATION/exit-codes-robust.sh

shellcheck /path/to/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/validate-email.sh
```

## Results (this run)

| Script | Error | Warning | Note |
|--------|-------|---------|------|
| `_SYSTEM/_AUTOMATION/exit-codes.sh` | 0 | 0 | clean |
| `_SYSTEM/_AUTOMATION/exit-codes-robust.sh` | 0 | 0 | clean |
| `scripts/validators/file/validation-runner.sh` | 0 | 0 | use `-x` from `scripts/validators/file`; `source` hints added |
| `BHOPTI .../validate-email.sh` | 0 | 0 | clean |
| `scripts/hooks/pre-commit-staged-validation.sh` | 0 | 0 | clean |
| `tests/test-validation-core.sh` | 0 | 0 | clean |
| `tests/test-validation-runner.sh` | 0 | 0 | clean |
| `tests/test-email-hash-db.sh` | 0 | 0 | clean |
| `scripts/mcp/run-validation-runner-json.sh` | 0 | 0 | clean |

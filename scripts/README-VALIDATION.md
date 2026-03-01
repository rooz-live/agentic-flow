# Validation Pipeline — Quick Reference

**One constant:** %/# (state) and %.# (velocity); relation in [../docs/VALIDATION_METRICS_AND_PROGRESS.md](../docs/VALIDATION_METRICS_AND_PROGRESS.md).

## Python dependencies (mail-capture-validate.sh)

```bash
pip3 install click textual python-dotenv
```

Optional: run `./ensure-validation-deps.sh` before compare-all-validators to install deps (exits 0 so validators can still report SKIP if install fails).

## Commands

- `./validation-core.sh email --file <path> --check all [--json]`
- `./validation-runner.sh <file>` — `./pre-send-email-gate.sh <file>`
- `advocate validate-email <file>` / `ay validate-email <file>`
- `./compare-all-validators.sh [--latest] [files...]` → `../reports/CONSOLIDATION-TRUTH-REPORT.md`

## Optional: agentic-qe fleet

After `npx agentic-qe@latest init --auto`:

- `npx tsx scripts/validation-with-fleet.ts <email-file>` — tries aqe fleet orchestrate, else runs runner + gate.
- `aqe fleet orchestrate --task email-validation --agents qe-quality-gate,qe-test-executor --topology hierarchical` (set EMAIL_FILE in env if needed).

See [CONSOLIDATION-TRUTH-INDEX.md](CONSOLIDATION-TRUTH-INDEX.md) and [FIX-CHECKLIST.md](FIX-CHECKLIST.md).

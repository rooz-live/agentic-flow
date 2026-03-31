# Dual-track validation contract

**Tracks**

1. **BHOPTI-LEGAL** — `~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/`
   - `validation-core.sh`, `validate-email.sh` (21 RFC checks), `email-hash-db.sh`, `exit-codes.sh`
2. **agentic-flow** — this repo: `scripts/validation-core.sh`, `scripts/validators/file/validation-runner.sh`, `_SYSTEM/_AUTOMATION/exit-codes-robust.sh`

**Rule:** Do not delete or archive either track without updating `ROAM_TRACKER.yaml` risk **R-2026-016** and proving the other track covers the same capability (tests + this doc).

## Exit code zones

Aligned with `scripts/validation-core.sh` header and `exit-codes-robust.sh`:

| Zone | Range | Examples |
|------|-------|----------|
| Success | 0–9 | 0 OK, 1 success with warnings |
| Client | 10–49 | 10 invalid args, 11 file not found |
| Dependency | 50–99 | 50 network, 60 tool missing |
| Validation | 100–149 | 100 schema, 110 date past, 111 placeholder, 120 duplicate |
| Business | 150–199 | 150 legal citation, 160 WSJF low |
| Infra | 200–249 | 200 disk full |
| Fatal | 250–255 | 250 corruption |

Sourcing order: prefer `BHOPTI-LEGAL/.../exit-codes-robust.sh` when present from dashboard tooling; agentic-flow runners use `_SYSTEM/_AUTOMATION/exit-codes-robust.sh`.

## validation-runner JSON (agentic-flow)

Invoked: `scripts/validators/file/validation-runner.sh --json -f <file.eml>`

Required top-level fields for consumers (email-server / RCA): `RUNNER_EXIT`, `good_enough_to_send`, `exit_code`, `fix_hints`, `rca_trace`.

**Send readiness:** `good_enough_to_send` is true only when `exit_code` ≤ 1 and no failing checks (`fail_count` / verdict not FAIL for blocking rules). See runner implementation for exact branches.

**CI / deterministic tests:** set `SKIP_SEMANTIC_VALIDATION=true` to bypass `semantic-validation-gate.sh` (date- and corpus-sensitive). Do **not** use in production send paths.

## HASH_DB (email-hash-db)

- **Path:** `HASH_DB` env (default: `email-hash-db.sh` directory + `/.email-hashes.db`)
- **Lock:** `HASH_DB.lock` directory (mkdir lock)
- **Columns:** header in file; rows `hash`, timestamp, recipient, subject, status, notes (TSV)

## Version pins

- `scripts/validation-core.sh`: `CORE_VERSION` variable (e.g. 1.1.1)
- Drift: diff BHOPTI vs agentic-flow `validation-core.sh` before changing either; merge intentional.

## MCP bridge

- Script: `scripts/mcp/run-validation-runner-json.sh`
- Descriptor: `mcp-descriptors/tools/run_validation_runner.json`
- **Safety:** absolute paths only; no secrets in arguments.

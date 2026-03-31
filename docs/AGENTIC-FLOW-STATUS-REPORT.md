# Agentic-Flow Workspace Status Report

<!-- @business-context WSJF-42: Read-only operational status for agentic-flow ceremonies and AISP lanes -->

A read-only status report of the agentic-flow workspace: main CLI entry points (ay, advocate, cascade-tunnel), current system state from AISP/ROAM artifacts, and how to run and interpret status commands.

## Main CLI Entry Points

### 1. ay (Governance Lane)

**Script:** [scripts/ay.sh](../scripts/ay.sh)

**Purpose:** Agentic Yield — iterative health check across validator, tester, monitor, reviewer modes. Runs ceremony checks (ay-yo test, learn, ay-prod check), writes AISP envelope to `reports/aisp-status.json`.

**Commands:**
- `./scripts/ay.sh` — Full cycle (TUI, 3 cycles, report generation)
- `./scripts/ay.sh --check` — Config-only: emit AISP envelope, no TUI, exit 0
- `./scripts/ay.sh --status` — Same as `--check`

**Exit codes:** 0 (GO, ≥80% actions), 1 (CONDITIONAL GO, 50–79%), 2 (NO-GO, <50%)

**Prerequisites:** AISP env block (roots, case IDs). Use `CPANEL_NONINTERACTIVE=1` to avoid interactive prompts.

---

### 2. advocate (Email-Validation Lane)

**Script:** [scripts/advocate](../scripts/advocate) (bash wrapper)

**Purpose:** Legal case validation via VibeThinker. Uses AISP guard, delegates to `python3 -m vibesthinker.advocate_cli`.

**Commands (from wrapper):**
- `scripts/advocate validate-email <file>` — Run validation-runner.sh + pre-send-email-gate
- `scripts/advocate compare-validators [--latest] [files...]` — Compare validators, write report
- `scripts/advocate --json-aisp` — Emit AISP envelope to `reports/aisp-advocate-status.json`
- `scripts/advocate help` — Show help

**Python CLI (vibesthinker.advocate_cli):** `audit`, `batch`, `classify`, `config`, `cycle`, `dashboard`, `roam`, `session`, `signature`, `systemic`, `validate`, `wholeness`, `wsjf`

**Note:** `advocate validate --strategic` can raise `TypeError: unexpected keyword argument 'strategic'`. Use shell pipeline (`validation-runner.sh`) for reliable validation.

---

### 3. cascade-tunnel (Tunnels Lane)

**Script:** [scripts/orchestrators/cascade-tunnel.sh](../scripts/orchestrators/cascade-tunnel.sh)

**Purpose:** Multi-ledger tunnel (Tailscale → ngrok → Cloudflare → localtunnel). Exits 116/150–153 per ledger.

**Command:** `./scripts/orchestrators/cascade-tunnel.sh multi-ledger`

---

### 4. ay-yo (Focused Execution)

**Script:** [scripts/ay-yo](../scripts/ay-yo) (referenced by ay-wrapper.sh)

**Purpose:** Subcommands like `test`, `learn`, `prod-cycle`, etc. Used internally by ay.sh.

---

## Current System State (from Artifacts)

Values below are **snapshots** from the artifacts at report time. Re-running `./scripts/ay.sh --check` updates the envelope with config-only semantics (often exit 0 when env is valid); a **full** `./scripts/ay.sh` cycle can show different `%/#`, exit codes, and blockers.

### Governance (reports/aisp-status.json — 2026-03-14)

| Field | Value |
|-------|-------|
| Lane | governance |
| Exit code | 1 (CONDITIONAL GO) |
| %/# | 4/6 actions passed (66%) |
| env_%/# | 5/5 config checks passed |
| Rolling failures | 10:1, 12:6, 21:0, 160:0 (7 total over 17 runs) |
| Trend velocity | 41.18% failure rate, 0.41 failures/run |
| Blockers | 2 failed actions (validation + monitor + tester modes) |

### Advocate (reports/aisp-advocate-status.json / pi-sync-checkpoint.json)

- Lane: email-validation
- Last run: exit 10 (client error) when config checks 1/5 — likely run from wrong PWD or missing env

### ROAM (ROAM_TRACKER.yaml)

- Arbitration 26CV005596-590: April 16, 2026
- Pre-arb form: April 6, 2026
- Coherence: 100% (444/444)
- Risks: 13 total, 9 open, 0 owned

### Ceremony Metrics

- Written by ay.sh to `reports/ceremony-metrics.json` and `reports/ceremony-metrics.jsonl`
- Also `.goalie/ceremony_metrics.jsonl` for trend samples

---

## How to Run Status Commands

```bash
# Set env (required for ay and advocate)
export AISP_ENV=dev AISP_T_STAGE=T0 AISP_MODE_DEFAULT=SA
export AISP_WORKSPACE_ROOT="/Users/shahroozbhopti/Documents/code/investing/agentic-flow"
export LEGAL_ROOT="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"
export LEGAL_CASE_IDS="26CV005596-590,26CV007491-590"
export CPANEL_NONINTERACTIVE=1

cd "$AISP_WORKSPACE_ROOT"

# Quick config check (no TUI)
./scripts/ay.sh --check

# Full ay cycle
./scripts/ay.sh

# Advocate status
scripts/advocate --json-aisp
scripts/advocate help
```

---

## Key Files

| File | Purpose |
|------|---------|
| [reports/aisp-status.json](../reports/aisp-status.json) | Governance AISP envelope |
| [reports/aisp-advocate-status.json](../reports/aisp-advocate-status.json) | Advocate AISP envelope |
| [reports/pi-sync-checkpoint.json](../reports/pi-sync-checkpoint.json) | Aggregated governance + advocate checkpoint |
| [ROAM_TRACKER.yaml](../ROAM_TRACKER.yaml) | Risks, timelines, coherence |
| [reports/ceremony-metrics.json](../reports/ceremony-metrics.json) | Ceremony %/# and rolling counters |

---

## Known Issues

1. **Rolling failure rate ~41%** — Mostly exit 12 (PWD outside roots). Run from `AISP_WORKSPACE_ROOT` or `LEGAL_ROOT`.
2. **Advocate exit 10** — Config guard fails when roots/env not set; ensure env block before running.
3. **advocate validate --strategic** — Broken (TypeError); use `validation-runner.sh` or `advocate validate-email` instead.
4. **LaunchAgents** — May exit 126 (TCC); manual Full Disk Access fix if needed.

---

## Optional: Other Status Commands

- `npx @claude-flow/cli@latest swarm status` — Swarm agent status (can stall on first install)
- `launchctl list | grep com.bhopti` — LaunchAgent status
- `scripts/validators/roam-staleness-watchdog.sh` — ROAM freshness check

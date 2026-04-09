# Session Report: SRE Desprawl & Cron Consolidation
**Date:** 2026-04-09
**Branch:** risk-analytics-soft-launch
**Commit:** 37888feb
**PR:** https://github.com/rooz-live/agentic-flow/pull/49
**Ledger Cycle:** BJ — Phase 117

## Problem Statement
The agentic-flow repository had accumulated significant process sprawl:
- 395 scripts in `scripts/`, 1013 files in `scripts/superproject-gates/`
- 24 crontab entries spawning ~1,640 bash processes/day
- Dual-registration: cron entries duplicating LaunchAgent jobs
- 13+ deprecated monitoring scripts with canonical replacements already in place
- Shadow copies of monitoring scripts in `superproject-gates/` mirroring `scripts/monitoring/`

## Actions Taken

### 1. Cron Consolidation (24 → 19 entries)
| Change | Before | After | Impact |
|--------|--------|-------|--------|
| `adaptive-sa-fa-cycles.sh` | `*/1 * * * *` (every min) | `*/15 * * * *` | 1440 → 96 spawns/day |
| `npm run assess` | `0 * * * *` (hourly) | `0 */6 * * *` | 24 → 4 spawns/day |
| `tm_disk_guardian.sh` | `0 * * * *` (hourly) | `0 */6 * * *` | 24 → 4 spawns/day |
| `roam-staleness-watchdog.sh` cron | `0 * * * *` (hourly) | **REMOVED** | LaunchAgent covers |
| `swarm-agent-supervisor.sh` cron | `*/10 * * * *` | **REMOVED** | LaunchAgent KeepAlive covers |

**Net effect:** ~1,640 → ~300 bash spawns/day (~82% reduction)

Backup preserved at `.goalie/crontab-backup-20260409.txt`.

### 2. LaunchAgent Deduplication
- **Disabled** `com.bhopti.legal.roam-watchdog.plist` — exact duplicate of `com.bhopti.roam.staleness.watchdog.plist` (same script `roam-staleness-watchdog.sh`, same 3600s interval)
- Renamed to `.disabled` after `launchctl unload`

### 3. Deprecated Script Deletion (13 files, -4,705 LOC)

| Deleted Script | Canonical Replacement | LOC Removed |
|---------------|----------------------|-------------|
| `scripts/monitoring/heartbeat_monitor.py` | `hitl-audit-safeguard.sh --pulse` | 52 |
| `_SYSTEM/_AUTOMATION/eta-live-stream.sh` | `run-bounded-eta.sh` (retained separately) | 36 |
| `_SYSTEM/_AUTOMATION/legal-pdf-ocr.sh` | `scripts/legal-pdf-ocr-pipeline.sh` | 41 |
| `superproject-gates/monitoring_dashboard.py` | `scripts/monitoring_dashboard.py` | 410 |
| `superproject-gates/heartbeat_monitor.py` | `hitl-audit-safeguard.sh --pulse` | 931 |
| `superproject-gates/circle_health_monitor.py` | `scripts/monitoring/circle_health_monitor.py` | 474 |
| `superproject-gates/agentdb_monitor.py` | `scripts/monitoring/agentdb_monitor.py` | 370 |
| `superproject-gates/budget_monitor.py` | `scripts/wsjf/budget_monitor.py` | 568 |
| `superproject-gates/device_monitor.py` | Capability retired | 336 |
| `superproject-gates/evidence_monitor.py` | `scripts/collect-evidence.sh` | 417 |
| `superproject-gates/wip_monitor.py` | `scripts/execution/wip_monitor.py` | 480 |
| `superproject-gates/unified_heartbeat_monitor.py` | `hitl-audit-safeguard.sh --pulse` + `tm_disk_guardian.sh` | 518 |
| `superproject-gates/cron_health_monitor.sh` | `.claude/agents/cron_health_monitor.sh` | 55 |

### 4. Dead Reference Cleanup
- Removed `source` of deleted `eta-live-stream.sh` from `cascade-tunnel.sh` (line 30) and `start-ledger-tunnel.sh` (line 10)

## Test Results (No Regressions)
| Suite | Pass | Fail | Total | Notes |
|-------|------|------|-------|-------|
| Jest | 979 | 18 | 1025 | 18 pre-existing (missing fixtures/deps) |
| Rust (`cargo test --lib`) | 217 | 1 | 218 | 1 pre-existing (`wsjf_not_stale_at_exactly_96_hours`) |
| Pre-commit gates | PASS | — | — | CSQBM PASS, dates 83%, annotations PASS |

## CI/CD Pipeline Status
- **22 passing** including: Root File Gate, ADR/PRD Coherence, Bash Syntax, ROAM Staleness Validation, Security Scans, STX Telemetry Schemas
- **22 failing** — all pre-existing (verified identical failure set on prior commit `85809b61`)
- **Zero new failures introduced**

Key pre-existing blockers for future cleanup:
1. `trading_dashboard.tsx` unclosed JSX tags (blocks tsc/Build & Test)
2. ADR frontmatter missing in some docs (blocks ADR Governance Gate)
3. `aqe init --no-interactive` flag typo (blocks Quality Gate ROBUST)

## Artifacts
| Artifact | Path |
|----------|------|
| Crontab backup | `.goalie/crontab-backup-20260409.txt` |
| Consolidated crontab | `.goalie/crontab-consolidated.txt` |
| Substitution map | `.goalie/go_no_go_ledger.md` (Cycle BJ) |
| Evidence bundle | `.goalie/evidence/latest.json` → `overall_status: GO` |
| Trust cache | `.goalie/trust_cache.json` → exit_code 0 |

## Repository Metrics (Post-Consolidation)
| Metric | Before | After |
|--------|--------|-------|
| Cron entries | 24 | 19 |
| Daily bash spawns | ~1,640 | ~300 |
| Active LaunchAgents | 14 | 13 |
| `superproject-gates/` files | 1,013 | 1,003 |
| Lines removed | — | 4,705 |

## Remaining Sprawl (Backlog)
- `scripts/superproject-gates/` still has 1,003 files — bulk is non-monitor scripts (TS/JS/shell) imported from superproject. Separate cleanup PR recommended.
- `scripts/` root has 395 scripts — canonical monitoring scripts retained, but further consolidation possible.
- 3 disabled LaunchAgents from prior sessions + 1 from this session could be fully deleted.

## GO/NO-GO
- **Local branch work:** GO
- **Merge to main:** Awaiting human review on PR #49
- **Trust bundle:** ALL GREEN (exit 0)

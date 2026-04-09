# Session Report: SRE Desprawl & Cron Consolidation
**Date:** 2026-04-09
**Branch:** risk-analytics-soft-launch → squash-merged to main
**Merge Commit:** 7c57f0a47
**PR:** https://github.com/rooz-live/agentic-flow/pull/49 (MERGED)
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

### 2. LaunchAgent Deduplication
- **Disabled** `com.bhopti.legal.roam-watchdog.plist` — exact duplicate of `com.bhopti.roam.staleness.watchdog.plist` (same script, same 3600s interval)

### 3. Deprecated Script Deletion (13 files, -4,705 LOC)
| Deleted Script | Canonical Replacement |
|---------------|----------------------|
| `scripts/monitoring/heartbeat_monitor.py` | `hitl-audit-safeguard.sh --pulse` |
| `_SYSTEM/_AUTOMATION/eta-live-stream.sh` | `run-bounded-eta.sh` (retained separately) |
| `_SYSTEM/_AUTOMATION/legal-pdf-ocr.sh` | `scripts/legal-pdf-ocr-pipeline.sh` |
| `superproject-gates/monitoring_dashboard.py` | `scripts/monitoring_dashboard.py` |
| `superproject-gates/heartbeat_monitor.py` | `hitl-audit-safeguard.sh --pulse` |
| `superproject-gates/circle_health_monitor.py` | `scripts/monitoring/circle_health_monitor.py` |
| `superproject-gates/agentdb_monitor.py` | `scripts/monitoring/agentdb_monitor.py` |
| `superproject-gates/budget_monitor.py` | `scripts/wsjf/budget_monitor.py` |
| `superproject-gates/device_monitor.py` | Capability retired |
| `superproject-gates/evidence_monitor.py` | `scripts/collect-evidence.sh` |
| `superproject-gates/wip_monitor.py` | `scripts/execution/wip_monitor.py` |
| `superproject-gates/unified_heartbeat_monitor.py` | `hitl-audit-safeguard.sh --pulse` + `tm_disk_guardian.sh` |
| `superproject-gates/cron_health_monitor.sh` | `.claude/agents/cron_health_monitor.sh` |

### 4. Dead Reference Cleanup
- Removed `source` of deleted `eta-live-stream.sh` from `cascade-tunnel.sh` and `start-ledger-tunnel.sh`

## Final Verification (Post-Merge on main)
| Check | Result |
|-------|--------|
| Git state | `main` @ `7c57f0a47`, 0 uncommitted files |
| PR #49 | MERGED |
| Feature branch | Deleted (local + remote) |
| Cron entries | 19 (was 24) |
| Active LaunchAgents | 13 (was 14) |
| Deleted scripts | All 13 confirmed gone |
| Jest | 1022 pass / 38 fail (pre-existing) |
| Rust | 285 pass / 0 fail |

## CI/CD Pipeline (22 pass / 22 fail pre-existing)
All 22 failures verified pre-existing by comparing against prior commit. Zero new failures.

Key passing gates: Root File Gate, ADR/PRD Coherence, Bash Syntax, ROAM Staleness, Security Scans, STX Telemetry Schemas.

## Artifacts
| Artifact | Path |
|----------|------|
| Crontab (consolidated) | `.goalie/crontab-consolidated.txt` |
| Crontab (backup) | `.goalie/crontab-backup-20260409.txt` |
| Substitution map | `.goalie/go_no_go_ledger.md` (Cycle BJ) |
| This report | `.goalie/session_logs/2026-04-09_desprawl_consolidation.md` |

## Remaining Backlog
- `scripts/superproject-gates/` still has ~1,003 files (non-monitor scripts)
- `scripts/` root has 395 scripts
- 4 disabled LaunchAgents could be fully deleted
- Pre-existing CI blockers: `trading_dashboard.tsx` JSX errors, ADR frontmatter, AQE flag typo

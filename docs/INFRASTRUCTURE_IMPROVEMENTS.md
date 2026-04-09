# Infrastructure Improvements Log

## 2026-04-09: SRE Desprawl & Cron Consolidation (Cycle BJ — Phase 117)
**PR:** [#49](https://github.com/rooz-live/agentic-flow/pull/49) (MERGED)
**Commit:** `7c57f0a47`

### Overview
Eliminated process sprawl by consolidating redundant cron/LaunchAgent scheduling, removing 13 deprecated monitoring scripts, and cleaning dead references. Net result: 82% reduction in daily bash process spawns and 4,705 lines of dead code removed.

### Cron Consolidation (24 → 19 entries)
| Change | Before | After | Impact |
|--------|--------|-------|--------|
| `adaptive-sa-fa-cycles.sh` | Every 1 min | Every 15 min | -1,344 spawns/day |
| `npm run assess` | Hourly | Every 6h | -20 spawns/day |
| `tm_disk_guardian.sh` | Hourly | Every 6h | -20 spawns/day |
| `roam-staleness-watchdog.sh` | Cron + LaunchAgent | LaunchAgent only | Deduped |
| `swarm-agent-supervisor.sh` | Cron + LaunchAgent | LaunchAgent only (KeepAlive) | Deduped |

### LaunchAgent Deduplication
Disabled `com.bhopti.legal.roam-watchdog.plist` — identical to `com.bhopti.roam.staleness.watchdog.plist`.

### Deprecated Scripts Removed (-4,705 LOC)
| Script | Replaced By |
|--------|------------|
| `heartbeat_monitor.py` | `hitl-audit-safeguard.sh --pulse` |
| `eta-live-stream.sh` | `run-bounded-eta.sh` |
| `legal-pdf-ocr.sh` | `legal-pdf-ocr-pipeline.sh` |
| 10× `superproject-gates/*_monitor.py` | Canonical copies in `scripts/monitoring/` |

### Canonical Monitoring Scripts (Retained)
| Script | Capability |
|--------|-----------|
| `site_health_monitor.py` | Multi-domain DNS/SSL/HTTP + `--watch` mode |
| `hitl-audit-safeguard.sh` | HITL email compliance + `--pulse` heartbeat |
| `tm_disk_guardian.sh` | TimeMachine/AgentDB/git objects + cleanup |
| `validation-core.sh` | Pure-function validation (exit 0/1/2/3) |
| `validate-foundation.sh` | Full trust bundle (infra + CSQBM + tests + contracts) |
| `check-csqbm.sh` | AgentDB freshness + CSQBM constraint validation |

### Evidence
- R-2026-016 substitution map: `.goalie/go_no_go_ledger.md` (Cycle BJ)
- Crontab backup: `.goalie/crontab-backup-20260409.txt`
- Session report: `.goalie/session_logs/2026-04-09_desprawl_consolidation.md`
- Trust bundle: ALL GREEN (exit 0)

### Remaining Backlog
- `superproject-gates/`: ~1,003 non-monitor files (separate cleanup PR)
- `scripts/`: 395 scripts (further consolidation possible)
- 4 disabled LaunchAgents can be fully deleted
- Pre-existing CI blockers: `trading_dashboard.tsx` JSX, ADR frontmatter, AQE flag typo

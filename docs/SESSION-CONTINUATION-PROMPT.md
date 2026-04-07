# Session Continuation Prompt
Paste this at the start of a new session to restore context.

---

## Prior Session Summary (2026-04-07, 4.5h)

### Server (yo.tag.ooo) — COMPLETE
- Ubuntu 22.04 → 24.04 via cPanel ELevate (DNS fix + base-files pin workaround)
- Dovecot LMTP vsz_limit 512→1024 MB
- All 7 services verified, cleanup done, no errors in logs

### Local Tier 1 — ALL COMPLETE
1. Mail.app glob fixed: `V*/*/INBOX.mbox` → 22 INBOX + 5 Sent dirs resolve (1.5M .emlx files)
2. com.wsjf.validator: pre-compiled JS works, wrapper has EAGAIN retry, plist uses bash launcher
3. 10 stale LaunchAgents disabled (.disabled), 0% failure rate now
4. `_classifier-rules.sh` now exports `EMAIL_RED/YELLOW/GREEN_KEYWORDS`, sourced by `validate-email-wsjf.sh` with fallback
5. `tm_disk_guardian.sh` extended: .codeium/WAL/git-objects/cache monitoring + JSONL events + git temp pack detection
6. Dashboard: removed `open` calls (was spawning new tabs), fixed heredoc `$(date)` interpolation, 300s refresh

### Wiring — ALL COMPLETE
- `setup_soxl_cron.sh` → trader invocation at 8:45 AM (after 8:30 scraper)
- `web_dashboard.py` → `/api/trading` route filtering SOXL/SOXS events from JSONL
- `neural-trader-ci.yml` → SOXL/SOXS dry-run validation step added
- `wsjf-roam-escalator.ts` → path fixed from `.../CLT/MAA/_SYSTEM/...` to `.../CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/...`, recompiled to dist/ and .compiled/

### Validators — 3/5 FIXED
- `validate_coherence.py`: `find_files()` rewritten with `os.walk` + SKIP_DIRS pruning + max_files=500. Scan: 0.04s (was 30s+ timeout). Full validation still >30s — needs compare-all-validators.sh timeout bump to 60s.
- `check_roam_staleness.py`: KeyError fixed with `.get()` fallback. Clean exit.
- `mail-capture-validate.sh`: `check_dependencies()` soft-fails with PYTHON_COUNCIL_AVAILABLE flag + SKIP JSON output. Script still hangs on python council in run_validation() — needs `timeout` wrapper in compare pipeline.
- `pre-send-email-workflow.sh`: NOT YET TOUCHED — consolidate with working `pre-send-email-gate.sh`

### T0-T5 Cycle 1 — COMPLETE
All 6 phases PASS, all 4 invariants hold, 18/18 classifier tests pass.
- T3 finding: 57/57 legal .eml files FAIL validation — legitimate (stale dates on old sent emails), not infrastructure bug.

### Key File Locations
- `_classifier-rules.sh`: `~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/_classifier-rules.sh`
- `validate-email.sh` (canonical): `~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/validate-email.sh` (753 lines, 24 checks)
- `validate-email-wsjf.sh`: `~/Library/Scripts/bhopti/validate-email-wsjf.sh` (506 lines)
- `file-to-wsjf-router.sh`: `~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/file-to-wsjf-router.sh` (221 lines)
- `web_dashboard.py`: `~/Documents/code/investing/agentic-flow/scripts/web_dashboard.py` (Flask + SocketIO, consolidation hub)
- `soxl_soxs_trader.ts`: `~/Documents/code/investing/agentic-flow/src/trading/soxl_soxs_trader.ts` (443 lines)
- `trading_dashboard.tsx`: `~/Documents/code/investing/agentic-flow/src/trading/ui/trading_dashboard.tsx` (858 lines)
- `backtest_engine.py`: `~/Documents/code/investing/agentic-flow/scripts/backtest/backtest_engine.py` (ticker-agnostic, YAML configs)
- `validate_coherence.py`: `~/Documents/code/investing/agentic-flow/scripts/validators/project/validate_coherence.py` (2286 lines)
- `mail-capture-validate.sh`: `~/Documents/code/investing/agentic-flow/scripts/validators/file/mail-capture-validate.sh`
- `tm_disk_guardian.sh`: `~/Documents/code/investing/agentic-flow/scripts/monitoring/tm_disk_guardian.sh`
- `la-health-check.sh`: `~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/la-health-check.sh`
- `batch-classify.sh`: `~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/batch-classify.sh`
- `hygiene-check.sh`: `~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/hygiene-check.sh`

---

## Remaining Queue (WSJF order)

### P0 — Validator Hardening (continue)
1. `pre-send-email-workflow.sh` — diff against `pre-send-email-gate.sh`, consolidate or redirect
2. Bump `compare-all-validators.sh` timeout from 30→60s for validate_coherence.py
3. Wire `PYTHON_COUNCIL_AVAILABLE` check into `run_validation()` in mail-capture-validate.sh so it skips python council when deps missing

### P1 — Hygiene + Monitoring
4. `hygiene-check.sh --cleanup` — REQUIRES SA/FA APPROVAL. 4 WARN items: .codeium 30G, .cache 21G, agentdb WAL 1.7G, git objects 496M. Total 52G+ reclaimable.
5. Add JSONL event emission to `la-health-check.sh` output
6. Verify `com.wsjf.validator` reaches IDLE_HEALTHY on next hourly run (path fix should resolve 22 VALIDATE ERROR messages)

### P2 — T0-T5 Cycle 2
7. Run T0-T5 cycle 2 to confirm no regressions after all fixes
8. Categorize 57 legal .eml failures by exit code (expected: stale dates = exit 110)

### P3 — Infrastructure
9. Obsidian + CLAUDE.md persistent memory setup (MCP bridge or direct file access)
10. Split delivery config review (Google Workspace + cPanel MX routing for yo.tag.ooo)

### P4 — Dashboard Consolidation
11. Consolidate 49 dashboards into `web_dashboard.py` (Flask hub)
12. Build Vite → Flask static serving for `trading_dashboard.tsx`

### P5 — DPC Enhancement
13. Dynamic `implemented`/`declared` counts in `compare-all-validators.sh` (currently hardcoded lines 304-305)
14. Velocity EMA smoothing for DPC metric
15. `--self-test` flag for `validation-runner.sh`

### P6 — TLD Deployment + Playwright TDD (ESCALATED)
The dashboard is on localhost, not a TLD. UI/UX and data quality are insufficient. Deploy to analytics.interface.tag.ooo with browser-based red/green TDD.

16. Create `deploy/deploy-trading.sh` — Vite build + rsync to stx-aio-0 + nginx config + certbot SSL
17. Deploy `web_dashboard.py` (Flask) + Vite-built `trading_dashboard.tsx` to `stx-aio-0.corp.interface.tag.ooo`
18. Configure nginx reverse proxy: `analytics.interface.tag.ooo` → localhost:5000 (Flask)
19. SSL via `certbot --nginx -d analytics.interface.tag.ooo`
20. Write Playwright specs (red/green TDD) for 4 endpoints:
    - `https://analytics.interface.tag.ooo/` — Main dashboard loads, has data
    - `https://analytics.interface.tag.ooo/trading` — SOXL/SOXS charts render
    - `https://analytics.interface.tag.ooo/api/trading` — Returns JSON with events array
    - `https://analytics.interface.tag.ooo/api/health` — Returns `{"status":"healthy"}`
21. Multi-tenant routing: `X-Tenant` header → tenant-specific JSONL filtering (already in web_dashboard.py)

Existing assets to reuse (no new code):
- `web_dashboard.py` — Flask + SocketIO, already has /api/trading, /api/health, /api/wsjf, /api/patterns
- `trading_dashboard.tsx` — 858-line React dashboard with 7 tabs, Recharts, WebSocket
- `soxl_soxs_trader.ts` — 443-line trader with RSI/MACD/Bollinger, FMP API
- `docker-compose.trading-local.yml` — Docker config exists
- `playwright.config.ts` — Already in repo root
- Nginx config spec'd in Multi-Tenant Platform notebook

### Deferred
- T0-T5 automation hardening cycles 2-6
- ADR-007 Phase A: scaffold TypeScript classifier with parity tests
- `_find_mailbox` pattern fix in `migrate_structure()` (same glob bug, line 98)
- SOXL/SOXS YAML strategy config for backtest_engine.py
- 72 FIXME/HACK/XXX/TODO sweep (5 hotspot files identified)
- Squash-merge strategy for feature/ddd-enforcement branch (30+ commits → 4-5 topic squashes)

---

## Invariants (must remain true)
1. No LaunchAgent restart thrash
2. No duplicate routing regressions
3. No false "down" on launchctl PID "-" with exit 0
4. No aggressive delete behavior (report-only unless explicitly SA/FA approved)
5. All changes are discover/consolidate THEN extend — no new tech debt

## IDE Constraints
- Do not attach files >10MB
- Always read by file path and chunk large files in ranges
- Prefer path-based incremental reads/writes over full-file attachments

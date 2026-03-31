# Goalie Backlog - Production Cycle Refinements
Last Updated: 2025-12-09T00:01:46Z

## 🔴 P0 - Critical (Completed)
- [✓] REC-002: Fix better-sqlite3 architecture mismatch (npm rebuild)
- [✓] Git accelerators enabled (core.untrackedCache=true, status.showUntrackedFiles=no)
- [✓] .gitignore improvements (.jest-cache/, .next/, tmp/)
- [✓] Git Process Circuit Breaker implemented with value-aware ROAM integration
  - Process value scoring (0-100): working dir, file handles, runtime, command flags
  - ROAM risk classification: RISK (≥70), OWNED (50-69), ACCEPTED/MITIGATED (<50)
  - Dynamic scaling: 3-10 processes based on CPU load
  - Commands: `check`, `monitor`, `cleanup`, `review-risks`, `sync-roam`
  - Design doc: `.goalie/GIT_PROCESS_CIRCUIT_BREAKER.md`

## 🟡 P1 - High Priority
- [ ] REC-001: Fix doc_query.py cache persistence (50-80% speedup) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0)
- [ ] REC-003: Add memory leak detection to dashboards (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0)
- [ ] ProcessGovernor: Track git process count as metric, alert if >10 (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0)
- [ ] VSCode: Configure `gitlab.gitlab-workflow.enableFileWatcher: false` (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0)
- [ ] Xcode: Disable SourceControl auto-refresh in preferences (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0)

## 🟢 P2 - Medium Priority
- [ ] af prod-cycle: Add `wait $!` after spawning git subprocesses (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0)
- [ ] REC-004: Convert file collection to generators (code_search.py, doc_query.py) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0)
- [ ] REC-005: Add process coordination for stress tests (file-based locking) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0)
- [ ] REC-006: Enable SQLite WAL mode for concurrent access (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0)
- [ ] Cleanup Cron: `pkill -9 -f 'git status -z'` nightly (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0) (WSJF: 6.0)

## 📊 Metrics Baseline (2025-12-09)
```json
{
  "pattern": "git_process_sprawl_baseline",
  "git_status_time_ms": 307,
  "git_process_count": 1,
  "cpu_load_percent": 1046,
  "accelerators_enabled": {
    "untrackedCache": true,
    "showUntrackedFiles": false,
    "fsmonitor": false
  },
  "circuit_breaker": {
    "max_processes": 10,
    "warn_threshold": 7,
    "kill_threshold": 15,
    "dynamic_scaling": true
  }
}
```

## 🛠️ Circuit Breaker Usage
```bash
# One-time check
./scripts/goalie/git_process_governor.sh check

# Continuous monitoring (run in background)
./scripts/goalie/git_process_governor.sh monitor &

# Cleanup orphaned processes
./scripts/goalie/git_process_governor.sh cleanup

# Emergency kill all
./scripts/goalie/git_process_governor.sh kill-all
```

## 📝 Root Cause Analysis Summary
**Who**: git-core spawned by Xcode/VSCode GitLab extension  
**What**: Repeated `git status --porcelain=2` polling  
**When**: IDE file watcher refreshes, large workspace scans  
**Where**: System git-core (Xcode toolchain) on agentic-flow workspace  
**Why**: Aggressive IDE polling + missing .gitignore + no fsmonitor  

**Fixes Applied**:
1. ✅ Git accelerators (untrackedCache, showUntrackedFiles=no)
2. ✅ Enhanced .gitignore (jest-cache, .next, tmp)
3. ✅ Dynamic circuit breaker (scales 3-10 processes based on CPU)
4. ⏳ Watchman/fsmonitor setup (pending)
5. ⏳ IDE settings tuning (pending)

## 🔗 Related Documentation
- `.goalie/PROD_CYCLE_ANALYSIS.yaml` - Comprehensive RCA
- `scripts/goalie/git_process_governor.sh` - Circuit breaker implementation
- `.goalie/metrics_log.jsonl` - Process metrics logging

## Next Actions
1. Install Watchman: `brew install watchman && git config --global core.fsmonitor true`
2. VSCode: Add to `.vscode/settings.json`:
   ```json
   {
     "git.autorefresh": false,
     "gitlab.gitlab-workflow.enableFileWatcher": false
   }
   ```
3. Monitor circuit breaker metrics for 7 days
4. Adjust thresholds based on actual usage patterns

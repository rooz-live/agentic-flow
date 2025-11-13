
## 2025-11-13T04:17:17Z Production Deployment Status

**Governor enabled:**
- Shell config: ~/.bashrc, ~/.bash_profile (AF_DYNAMIC_GOVERNOR=1)
- Requires new shell or: `export AF_DYNAMIC_GOVERNOR=1`

**Monitoring dashboard:**
- Status: ✓ Running (PID 80819)
- Log: logs/process_watch.log
- Polling: 10s intervals
- Incidents: logs/governor_incidents.jsonl (4 load alerts logged)
- Snapshot: logs/process_tree_snapshot.json

**Test validation:**
- Status: ⚠️ DEFERRED (system critically overloaded)
- Current load: 393.05 (14x over threshold)
- Active test processes: 15
- Recommendation: Wait for load < 50 before running npm test --runInBand

**Files modified:**
- src/runtime/processGovernor.ts: orphan detection, runaway kill, cascade tracking
- scripts/monitoring/process_tree_watch.js: created
- tests/setup/globalSetup.js: created
- tests/setup/globalTeardown.js: created
- jest.config.js: added global setup/teardown


# Root Cause Analysis: Affiliate System Swarm Failure

## Incident Summary

**Date**: 2025-12-01
**Severity**: High
**Impact**: 17 affiliate system tasks cancelled, zero deliverables produced

## Timeline

| Time | Event |
|------|-------|
| T+0 | Swarm initialization via MCP `swarm_init` |
| T+1 | Agent spawn commands issued via MCP |
| T+2 | Federation hub connection attempted |
| T+3 | Hub not found error logged |
| T+4 | Agents spawned but never executed |
| T+5 | All 17 tasks cancelled |

## Root Causes

### Primary: MCP vs Claude Code Execution Gap

**Finding**: MCP tools (`swarm_init`, `agent_spawn`) only coordinate topology but do not execute actual work. Claude Code's Task tool is required for agent execution.

**Evidence**:
- `.claude-flow/metrics/agent-metrics.json`: `totalAgents: 0`, `activeAgents: 0`
- `.claude-flow/metrics/performance.json`: All memory operations = 0

### Secondary: Federation Hub Not Built

**Finding**: The federation hub (`run-hub.js`) was never compiled.

**Evidence**:
- `logs/agentic_federation.log`: "Hub server not found at .../run-hub.js"

### Tertiary: Database Never Initialized

**Finding**: The affiliate database file existed but was 0 bytes.

**Evidence**:
- `logs/device_state_tracking.db`: 0-byte file, no tables

## Contributing Factors

1. **Unclear Tool Boundaries**: MCP coordination vs Claude Code execution not documented
2. **Missing Pre-flight Checks**: No validation that hub was built before swarm start
3. **No Heartbeat Monitoring**: Agents spawned but never confirmed running

## Corrective Actions

| Action | Status | Owner |
|--------|--------|-------|
| Document MCP vs Claude Code boundaries | Complete | System Architect |
| Implement direct execution without swarm | Complete | Backend Developer |
| Add pre-flight checks for hub | Pending | DevOps |
| Add agent heartbeat monitoring | Pending | Platform Team |

## Lessons Learned

1. **Swarm coordination ≠ execution**: MCP tools set up topology, Claude Code executes
2. **Verify before trust**: Always check database/hub status before proceeding
3. **Direct implementation fallback**: When swarm fails, implement directly

## Prevention Measures

1. Add `af swarm-preflight` command to validate all dependencies
2. Add agent heartbeat checks to `af status`
3. Document swarm execution requirements in CLAUDE.md

## Related Documents

- [ROAM Tracker](.goalie/ROAM_TRACKER.yaml)
- [Retro Summary](.goalie/retro_summary.md)
- [Standup Blockers](.goalie/standup_blockers.json)


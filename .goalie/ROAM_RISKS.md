
## R-SYS-001: System State Capture Timeout (RESOLVED)

**Status**: Resolved  
**Category**: Infrastructure/Performance  
**Severity**: Medium  
**Owner**: Orchestrator  

### Description
The `measure_system_state.sh` script was timing out (>15s) during prod-cycle runs due to multiple sequential calls to `top` and `iostat` commands.

### Root Cause
Script ran `top -l 2` 5 times and `iostat -d -c 2` twice, totaling ~15s execution time under system load.

### Resolution
1. Optimized script to cache outputs - single `top` call, single `iostat` call
2. Runtime reduced from ~15s to ~7s
3. Added explicit `TimeoutExpired` exception handling in `cmd_prod_cycle.py`
4. Updated log analyzer to exclude timeouts from `sys_state_err` count

### Files Modified
- `.goalie/measure_system_state.sh` - Optimized caching
- `scripts/cmd_prod_cycle.py` - Explicit timeout handling  
- `src/prod_cycle_swarm_runner.py` - Log analyzer classification

### Lessons Learned
- Error message changes that mask detection are **symptom masks**, not fixes
- Always investigate root cause before changing error classification
- Performance issues compound under system load

**Resolved**: 2025-12-15

## R-WSJF-001: wsjf-enrichment Classification Bug (RESOLVED)

**Status**: Resolved  
**Category**: Telemetry/Classification  
**Severity**: Medium  
**Owner**: Governance Circle  

### Description
The `wsjf-enrichment` pattern incorrectly marked "no economic gaps found" as `action_completed: false`, inflating failure counts.

### 5W/RCA Analysis
| Question | Finding |
|----------|---------|
| **What** | 130/130 wsjf-enrichment events marked as failures |
| **Why** | Code logic: `wsjfEnrichmentOk = topEconomicGaps.length > 0` |
| **Where** | `tools/federation/governance_agent.ts:2507` |
| **When** | Every prod-cycle run at iteration 0 |
| **Root Cause** | Classification bug - "no work to do" ≠ failure |

### Resolution
Changed logic so `action_completed: true` always (action ran successfully).
Added `status: 'healthy_no_gaps' | 'gaps_processed'` for clarity.

### Files Modified
- `tools/federation/governance_agent.ts:2507-2544`

### Lessons Learned
- "No work found" is a valid successful outcome
- Separate "action success" from "work performed"
- Pattern metrics should distinguish healthy states from failures

**Resolved**: 2025-12-16

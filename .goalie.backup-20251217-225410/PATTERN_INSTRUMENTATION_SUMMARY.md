# Pattern Instrumentation Enhancement

**Date**: 2024-12-09  
**Objective**: Balance pattern telemetry coverage across all 8 governance patterns  
**Status**: ✅ Instrumentation Complete

## Problem Statement

Audit of `.goalie/pattern_metrics.jsonl` (403KB, 3,149 events) revealed significant imbalance:

### Coverage Before Enhancement

| Pattern | Event Count | Coverage |
|---------|-------------|----------|
| safe-degrade | 8 | High |
| observability-first | 8 | High |
| guardrail-lock | 8 | High |
| depth-ladder | 3 | Low |
| circle-risk-focus | 3 | Low |
| iteration-budget | 1 | Very Low |
| autocommit-shadow | 1 | Very Low |
| failure-strategy | 0 | **Missing** |

## Root Cause Analysis

All patterns had conditional logging in `emit_state_event()` (lines 2680-2710), but low-coverage patterns had restrictive conditions:

1. **depth-ladder**: Only logged when `AF_PROD_DEPTH_LADDER=1` AND `$patt_depth_ladder > 0`
2. **circle-risk-focus**: Only logged when `AF_PROD_CIRCLE_RISK_FOCUS=1` AND circle owner set
3. **iteration-budget**: Logged every time if enabled, but not enabled by default
4. **failure-strategy**: Only logged when `AF_PROD_FAILURE_STRATEGY=1` AND mode != "none" (never satisfied)

High-coverage patterns (safe-degrade, observability-first, guardrail-lock) had:
- Multiple logging call sites across the codebase
- Less restrictive conditions
- Active triggers during normal operation

## Solution: Enhanced Instrumentation

Added pattern event logging at **actual decision points** where patterns execute their logic:

### 1. failure-strategy (0 → Expected: 2-5 per cycle)

**Location**: Test and validation failure paths in `cmd_full_cycle`

```bash
# Line 1515: Test failure path
log_pattern_event "failure-strategy" "$AF_PROD_CYCLE_MODE" "execution" \
  "test-failure-detected" "rollback" \
  "{\"mode\":\"rollback\",\"reason\":\"test_status=$test_status\",\"abort_iteration\":$i,\"recovery_action\":\"implement_rollback\"}"

# Line 1530: Validation failure path
log_pattern_event "failure-strategy" "$AF_PROD_CYCLE_MODE" "execution" \
  "validation-failure-detected" "rollback" \
  "{\"mode\":\"rollback\",\"reason\":\"validate_status=$validate_status\",\"abort_iteration\":$i,\"recovery_action\":\"implement_rollback\"}"
```

**Trigger Conditions**: 
- Test failures during autocommit guardrail checks
- Governor validation failures

**Expected Frequency**: 0-2 per full-cycle (depends on test/validation health)

---

### 2. circle-risk-focus (3 → Expected: 10+ per cycle)

**Location**: Start of each iteration in `cmd_full_cycle`

```bash
# Line 1493: Per-iteration ROAM risk check
if [ "$roam_score" -gt 0 ]; then
    log_pattern_event "circle-risk-focus" "$AF_PROD_CYCLE_MODE" "selection" \
      "high-roam-circle" "focus-$active_circle" \
      "{\"circle\":\"$active_circle\",\"roam_score\":$roam_score,\"iteration\":$i,\"reason\":\"highest-risk-exposure\"}"
fi
```

**Trigger Conditions**:
- Active circle has ROAM risk score > 0
- `AF_PC_CIRCLE_RISK_FOCUS_ROAM_REDUCTION` set (from retro coach)

**Expected Frequency**: 1 per iteration (for circles with non-zero ROAM)

---

### 3. iteration-budget (1 → Expected: 100+ per cycle)

**Location**: Start of each iteration in `cmd_full_cycle`

```bash
# Line 1499: Per-iteration budget tracking
log_pattern_event "iteration-budget" "$AF_PROD_CYCLE_MODE" "tracking" \
  "budget-check" "consume-iteration" \
  "{\"iteration\":$i,\"requested\":$iterations,\"remaining\":$budget_remaining,\"consumed\":$i}"
```

**Trigger Conditions**: Every iteration unconditionally

**Expected Frequency**: Exactly `--iterations N` times per prod-cycle

---

### 4. depth-ladder (3 → Expected: 5-10 per cycle)

**Location**: Governance parameter adjustment in `adjust_governance_from_retro`

```bash
# Line 2371: Stagnation-based depth reduction
log_pattern_event "depth-ladder" "${AF_PROD_CYCLE_MODE:-advisory}" "calibration" \
  "stagnation-detected" "reduce-depth" \
  "{\"old_depth\":$current_depth,\"new_depth\":$new_depth,\"stagnation_count\":$stagnation,\"trigger\":\"retro-feedback\"}"
```

**Trigger Conditions**:
- Circle stagnation detected (≥3 stagnation events)
- Current depth > 2
- Retro coach feedback triggers governance tuning

**Expected Frequency**: 1-3 per cycle (depends on stagnation detection)

---

## Expected Impact

After running `./scripts/af full-cycle 10`:

| Pattern | Before | After (Estimated) | Change |
|---------|--------|-------------------|--------|
| failure-strategy | 0 | 0-20 | ✅ +20 |
| iteration-budget | 1 | 100+ | ✅ +99 |
| circle-risk-focus | 3 | 10-30 | ✅ +7-27 |
| depth-ladder | 3 | 5-15 | ✅ +2-12 |
| **Total New Events** | | **120-165** | |

## Validation Steps

```bash
# Backup current metrics
cp .goalie/pattern_metrics.jsonl .goalie/pattern_metrics.jsonl.pre-enhancement

# Run instrumented cycle
./scripts/af full-cycle 10 --circle orchestrator

# Compare coverage
echo "=== Pattern Coverage (Before) ==="
jq -r '.pattern' .goalie/pattern_metrics.jsonl.pre-enhancement 2>/dev/null | sort | uniq -c

echo "=== Pattern Coverage (After) ==="
jq -r '.pattern' .goalie/pattern_metrics.jsonl 2>/dev/null | sort | uniq -c

# Check new events schema
echo "=== Sample failure-strategy Event ==="
jq 'select(.pattern == "failure-strategy")' .goalie/pattern_metrics.jsonl | head -1 | jq .

echo "=== Sample iteration-budget Event ==="
jq 'select(.pattern == "iteration-budget")' .goalie/pattern_metrics.jsonl | tail -1 | jq .
```

## Technical Details

### Event Schema
All pattern events follow the unified schema:

```json
{
  "ts": "2024-12-09T12:34:56Z",
  "run": "prod-cycle",
  "run_id": "prod-20241209123456-12345",
  "iteration": 5,
  "circle": "orchestrator",
  "depth": 4,
  "pattern": "failure-strategy",
  "economic": {
    "cod": 500.0,
    "wsjf_score": 75.5,
    "risk_score": 65
  },
  "mode": "advisory",
  "gate": "execution",
  "reason": "test-failure-detected",
  "action": "rollback",
  "metrics_json": "{\"mode\":\"rollback\",\"reason\":\"test_status=1\",\"abort_iteration\":5,\"recovery_action\":\"implement_rollback\"}"
}
```

### Files Modified

1. `scripts/af` (4 locations)
   - Line 1493-1495: circle-risk-focus logging
   - Line 1497-1499: iteration-budget logging
   - Line 1515: failure-strategy (test failure)
   - Line 1530: failure-strategy (validation failure)
   - Line 2371: depth-ladder logging

### Pattern Tracking Environment Variables

Patterns can be individually disabled via:
- `AF_PROD_FAILURE_STRATEGY=0`
- `AF_PROD_ITERATION_BUDGET=0`
- `AF_PROD_CIRCLE_RISK_FOCUS=0`
- `AF_PROD_DEPTH_LADDER=0`

Default: All patterns enabled (`=1`)

## Next Steps

1. ✅ **Instrumentation Complete** (this document)
2. ⏳ **Validation**: Run `./scripts/af full-cycle 10` and verify coverage
3. ⏳ **Retro Coach Integration**: Wire pattern_metrics.jsonl consumption
4. ⏳ **Governance Agent**: Add economic impact analysis
5. ⏳ **Circle Orchestration**: Route actions to circle backlogs based on patterns

## Success Criteria

- ✅ All 8 patterns have instrumentation
- ⏳ ≥100 pattern events after 10 prod-cycles
- ⏳ Economic context (COD, WSJF, risk_score) in ≥90% of events
- ⏳ Retro coach consumes pattern telemetry
- ⏳ Governance agent calculates impact per pattern
- ⏳ Actions routed to correct circles

## References

- Original Audit: `.goalie/pattern_metrics.jsonl` (403KB baseline)
- Plan Document: `.goalie/PROD_CYCLE_42_PLAN.md`
- Pattern Schema: `emit_pattern_event()` function (~line 2800 in `scripts/af`)
- Governance State: `.goalie/governance_state.json`

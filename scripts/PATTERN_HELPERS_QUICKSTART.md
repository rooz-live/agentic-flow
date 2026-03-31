# Pattern Helpers Quick Start Guide

## Overview
Pattern helpers provide structured telemetry logging for production cycle patterns, enabling retrospective analysis and continuous improvement through the Build-Measure-Learn cycle.

## Setup

```bash
# Source pattern helpers in your script
source /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/af_pattern_helpers.sh

# Or via main af script (auto-loads)
source /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/af
```

## Quick Reference

### 1. Safe Degrade Pattern
**When to use**: System degrades due to deploy/CI/validate failures

```bash
# Log degradation trigger
log_safe_degrade_event "deploy_fail" "depth_4_to_3" 2

# Arguments:
# $1: trigger_type    (deploy_fail|ci_fail|validate_fail|foundation_fail)
# $2: action_taken    (depth_degradation|no_deploy|autocommit_disabled)
# $3: recovery_cycles (integer, optional)

# Environment variables:
export AF_SAFE_DEGRADE_TRIGGER_COUNT=3
export AF_PREVIOUS_DEPTH=4
export AF_GOVERNOR_HEALTH="amber"
```

### 2. Circle Risk Focus Pattern
**When to use**: Allocating extra iterations to high-ROAM-risk circles

```bash
# Log circle focus allocation
log_circle_risk_focus "Seeker" 3 15.5

# Arguments:
# $1: top_owner_circle     (Analyst|Assessor|Innovator|Intuitive|Orchestrator|Seeker)
# $2: extra_iterations     (integer)
# $3: roam_reduction       (float, % reduction in risk)

# Environment variables:
export AF_CIRCLE_RISK_BEFORE=100.0
export AF_CIRCLE_RISK_AFTER=84.5
```

### 3. Autocommit Shadow Pattern
**When to use**: Tracking shadow autocommit candidates

```bash
# Log shadow candidates
log_autocommit_shadow 5 0 12

# Arguments:
# $1: candidate_count            (files that would be auto-committed)
# $2: manual_override_count      (disagreements)
# $3: cycles_until_confidence    (remaining cycles before recommendation)

# Environment variables:
export AF_AUTOCOMMIT_CONFIDENCE=0.75
export AF_AUTOCOMMIT_RECOMMENDATION="continue_shadow"
```

### 4. Guardrail Lock Pattern
**When to use**: Test-first enforced despite --no-test-first flag

```bash
# Log guardrail enforcement
log_guardrail_lock "enforced" "red" 2

# Arguments:
# $1: enforcement_status    (enforced|bypassed)
# $2: health_state          (red|amber|green)
# $3: user_bypass_attempts  (integer)

# Environment variables:
export AF_GUARDRAIL_LOCK_REASON="governor_health_red"
```

### 5. Failure Strategy Pattern
**When to use**: Tracking fail-fast vs degrade-and-continue mode

```bash
# Log failure strategy
log_failure_strategy "fail-fast" 5 "foundation_fail"

# Arguments:
# $1: strategy_mode      (fail-fast|degrade-and-continue)
# $2: abort_iteration    (iteration number where stopped)
# $3: failure_reason     (foundation_fail|deploy_fail|...)

# Environment variables:
export AF_REQUESTED_ITERATIONS=10
export AF_COMPLETED_ITERATIONS=5
```

### 6. Iteration Budget Pattern
**When to use**: Enforcing cycle budget caps

```bash
# Log budget enforcement
log_iteration_budget 100 20 5

# Arguments:
# $1: requested_iterations     (user requested)
# $2: enforced_iterations      (capped amount)
# $3: autocommit_run_count     (cycles with autocommit enabled)

# Environment variables:
export AF_ITERATION_BUDGET_CAP=25
export AF_ITERATION_BUDGET_POLICY="conservative"
```

### 7. Observability First Pattern
**When to use**: Tracking metrics coverage and gaps

```bash
# Log observability metrics
log_observability_first 42 3 "enable_autocommit"

# Arguments:
# $1: metrics_written_count    (metrics emitted this cycle)
# $2: missing_signals_count    (gaps identified)
# $3: suggestion               (recommendation string)

# Environment variables:
export AF_TELEMETRY_COVERAGE=87.5
export AF_OBSERVABILITY_ACTION="add_logging"
```

### 8. Depth Ladder Pattern
**When to use**: Maturity depth escalation/degradation

```bash
# Log depth change
log_depth_ladder 3 4 "green_streak" 5

# Arguments:
# $1: previous_depth        (0-4)
# $2: new_depth             (0-4)
# $3: trigger_type          (green_streak|manual|rollback)
# $4: green_streak_count    (consecutive green cycles)

# Environment variables:
export AF_GREEN_STREAK_THRESHOLD=3
export AF_MATURITY_GATE="health"
```

### 9. HPC Batch Window Pattern
**When to use**: Tracking HPC cluster resource utilization

```bash
# Log HPC metrics
log_hpc_batch_window 85.5 1200 250 8

# Arguments:
# $1: gpu_util_pct             (0-100)
# $2: throughput_samples_sec   (integer)
# $3: p99_latency_ms           (milliseconds)
# $4: node_count               (cluster nodes)

# Environment variables:
export AF_HPC_QUEUE_TIME=300
export AF_SCHEDULER="slurm"
export AF_FRAMEWORK="pytorch"
```

### 10. ML Training Guardrail Pattern
**When to use**: Monitoring ML training stability

```bash
# Log ML training metrics
log_ml_training_guardrail 100 true 3 12

# Arguments:
# $1: max_epochs               (training epochs)
# $2: early_stop_triggered     (true|false)
# $3: grad_explosions          (count)
# $4: nan_batches              (count)

# Environment variables:
export AF_GPU_UTIL=92.0
export AF_P99_LATENCY=180
export AF_FRAMEWORK="pytorch"
```

### 11. Statistical Robustness Pattern
**When to use**: Validating statistical analysis robustness

```bash
# Log statistical validation
log_stat_robustness_sweep 10 5 92 0.01

# Arguments:
# $1: num_seeds            (random seeds tested)
# $2: num_datasets         (datasets tested)
# $3: coverage_score       (0-100)
# $4: pvalue_min           (minimum p-value)

# Environment variables:
export AF_STAT_ROBUSTNESS_THRESHOLD=90
export AF_STAT_METHOD="cross_validation"
```

### 12. Device Coverage Pattern
**When to use**: Tracking multi-platform testing coverage

```bash
# Log device coverage
log_device_coverage 12 '["ios","android","web"]' 1 88

# Arguments:
# $1: devices_tested       (count)
# $2: platforms_json       (JSON array of platform names)
# $3: failures             (count)
# $4: coverage_pct         (0-100)

# Environment variables:
export AF_DEVICE_COVERAGE_TARGET=95
export AF_FRAMEWORK="react-native"
```

## Common Environment Variables

### Required for All Patterns
```bash
export AF_PROD_CYCLE_MODE="advisory"     # advisory|mutate|enforcement
export AF_CIRCLE="Orchestrator"           # Circle name
export AF_DEPTH_LEVEL=3                   # 0-4
export AF_RUN_ID="run-$(date +%Y%m%d)"   # Unique run identifier
```

### Optional but Recommended
```bash
export AF_FRAMEWORK="pytorch"             # Framework being used
export AF_SCHEDULER="slurm"               # Job scheduler
export AF_GOVERNOR_HEALTH="green"         # System health state
```

## Testing

### Run Full Test Suite
```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
./scripts/test_pattern_metrics.sh
```

### Quick Pattern Test
```bash
# Source helpers
source scripts/af_pattern_helpers.sh

# Set environment
export AF_PROD_CYCLE_MODE="advisory"
export AF_CIRCLE="Orchestrator"
export AF_DEPTH_LEVEL=3

# Log a test event
log_safe_degrade_event "deploy_fail" "depth_4_to_3" 2

# Verify output
tail -1 .goalie/pattern_metrics.jsonl | jq .
```

## Output Location
All pattern events are logged to:
- `.goalie/pattern_metrics.jsonl` (primary)
- `.goalie/cycle_log.jsonl` (secondary)

## Integration with af Commands

### In prod-cycle
```bash
# Example: Log safe degrade when deployment fails
if ! deploy_production; then
    log_safe_degrade_event "deploy_fail" "no_deploy" 0
    export AF_DEPTH_LEVEL=3  # Degrade to depth 3
fi
```

### In full-cycle
```bash
# Example: Log iteration budget at cycle start
log_iteration_budget "$requested" "$enforced" "$autocommit_count"

# Example: Log depth escalation on green streak
if [ "$green_streak" -ge "$AF_GREEN_STREAK_THRESHOLD" ]; then
    log_depth_ladder "$current_depth" "$((current_depth + 1))" "green_streak" "$green_streak"
fi
```

## Retrospective Analysis

### Query Recent Safe Degrade Events
```bash
cat .goalie/pattern_metrics.jsonl | \
  jq 'select(.pattern == "safe-degrade") | {ts, trigger: .safe_degrade.triggers.type, action: .safe_degrade.actions[0]}'
```

### Aggregate Circle Risk Focus
```bash
cat .goalie/pattern_metrics.jsonl | \
  jq 'select(.pattern == "circle-risk-focus") | .circle_risk_focus.top_owner' | \
  sort | uniq -c | sort -rn
```

### Calculate Average Telemetry Coverage
```bash
cat .goalie/pattern_metrics.jsonl | \
  jq 'select(.pattern == "observability-first") | .observability_first.telemetry_coverage_pct' | \
  awk '{sum+=$1; count++} END {print sum/count}'
```

## Troubleshooting

### Pattern Events Not Logging
1. Verify helpers are sourced: `type log_safe_degrade_event`
2. Check permissions: `ls -la .goalie/pattern_metrics.jsonl`
3. Enable debug mode: `export AF_DEBUG_PATTERN_EVENTS=1`

### JSON Validation Errors
1. Check environment variable formatting (no quotes in numbers)
2. Validate JSON array syntax (platforms_json)
3. Use `jq` to validate: `tail -1 .goalie/pattern_metrics.jsonl | jq .`

### Missing Metrics Fields
1. Set required environment variables before calling helpers
2. Review helper function signature for required arguments
3. Check `.goalie/pattern_metrics.jsonl` for partial events

## Best Practices

1. **Set environment early**: Export `AF_*` variables at script start
2. **Log incrementally**: Call helpers as patterns activate, not batch at end
3. **Use consistent IDs**: Set `AF_RUN_ID` once per execution
4. **Tag appropriately**: Patterns auto-tag (ML, HPC, Stats, Device/Web, Federation)
5. **Validate output**: Run test suite after integration changes
6. **Monitor disk I/O**: Pattern metrics can generate significant volume

## Next Steps
1. Review `.goalie/PATTERN_TELEMETRY_NOW_STATUS.md` for implementation status
2. Integrate helpers into `scripts/af` prod-cycle and full-cycle commands
3. Set up VS Code extension for pattern metrics dashboard
4. Define retro questions per pattern for continuous improvement

---

**Documentation**: `scripts/af_pattern_helpers.sh`  
**Tests**: `scripts/test_pattern_metrics.sh`  
**Status**: `.goalie/PATTERN_TELEMETRY_NOW_STATUS.md`

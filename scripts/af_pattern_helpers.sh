#!/usr/bin/env bash
#
# af_pattern_helpers.sh - Enhanced Pattern Metrics Helpers
#
# This file contains specialized helpers for logging production cycle patterns:
# - safe_degrade: Reactive degradation triggers and recovery
# - circle_risk_focus: Circle-specific ROAM risk allocation
# - autocommit_shadow: Shadow autocommit candidate tracking
# - guardrail_lock: Test-first enforcement monitoring
# - failure_strategy: Fail-fast vs degrade-and-continue
# - iteration_budget: Cycle budget and autocommit limits
# - observability_first: Metrics coverage and gap detection
# - depth_ladder: Maturity depth escalation/degradation
#
# Usage: source this file in scripts/af to enable pattern helpers
#

set -euo pipefail

# Normalize Circle Name - Critical Fix for 28.8% Unknown Events
# =============================================================
# Standardizes circle names to canonical forms (Analyst, Assessor, etc.)
# Fixes: CIRCLE_LEARNING_PARITY_SUMMARY.md - 33.3/100 score issue
#
# Usage: NORMALIZED=$(normalize_circle_name "analyst")
normalize_circle_name() {
    local input_circle="${1:-Orchestrator}"
    local normalized
    
    # Convert to lowercase for matching
    case "${input_circle,,}" in
        analyst*)
            normalized="Analyst" ;;
        assessor*)
            normalized="Assessor" ;;
        innovator*)
            normalized="Innovator" ;;
        intuitive*)
            normalized="Intuitive" ;;
        orchestrator*|orchestration*)
            normalized="Orchestrator" ;;
        seeker*|exploration*|discovery*)
            normalized="Seeker" ;;
        *)
            # Fallback to Orchestrator for unknown circles
            normalized="Orchestrator" ;;
    esac
    
    echo "$normalized"
}

# Safe Degrade Pattern - Reactive Throttling
# ==========================================
# Tracks when system degrades due to failures (deploy, CI, validate)
# Metrics: triggers (count), actions (what degraded), recovery_cycles (healing time)
#
# Usage: log_safe_degrade_event "deploy_fail" "depth_4_to_3" 2
log_safe_degrade_event() {
    local trigger_type="$1"    # deploy_fail, ci_fail, validate_fail, foundation_fail
    local action_taken="$2"    # depth_degradation, no_deploy, autocommit_disabled
    local recovery_cycles="${3:-0}"
    
    local pattern_data=$(cat <<EOF
"safe_degrade": {
  "triggers": {
    "type": "$trigger_type",
    "count": ${AF_SAFE_DEGRADE_TRIGGER_COUNT:-1}
  },
  "actions": ["$action_taken"],
  "recovery_cycles": $recovery_cycles,
  "previous_depth": ${AF_PREVIOUS_DEPTH:-4},
  "new_depth": ${AF_DEPTH_LEVEL:-3},
  "health_state": "${AF_GOVERNOR_HEALTH:-amber}"
}
EOF
)
    
    # Normalize circle name before logging
    local circle_name=$(normalize_circle_name "${AF_CIRCLE:-Orchestrator}")
    
    emit_pattern_event "safe-degrade" "$AF_PROD_CYCLE_MODE" "deploy" \
        "$circle_name" "${AF_DEPTH_LEVEL:-3}" "true" "mutation" \
        "$pattern_data, \"reason\": \"$trigger_type triggered degradation: $action_taken\""
    
    # Export for tracking across cycles
    export AF_SAFE_DEGRADE_LAST_TRIGGER="$trigger_type"
    export AF_SAFE_DEGRADE_RECOVERY_START=$(date +%s)
}

# Circle Risk Focus Pattern - ROAM-based Allocation
# ==================================================
# Tracks when extra iterations are allocated to high-risk circles
# Metrics: top_owner (circle), extra_iterations (allocated), roam_reduction (∆ risk)
#
# Usage: log_circle_risk_focus "Seeker" 3 15.5
log_circle_risk_focus() {
    local top_owner_circle="$1"
    local extra_iterations="${2:-0}"
    local roam_reduction="${3:-0.0}"
    
    local pattern_data=$(cat <<EOF
"circle_risk_focus": {
  "top_owner": "$top_owner_circle",
  "extra_iterations": $extra_iterations,
  "roam_reduction": $roam_reduction,
  "risk_score_before": ${AF_CIRCLE_RISK_BEFORE:-100.0},
  "risk_score_after": ${AF_CIRCLE_RISK_AFTER:-84.5},
  "allocation_mode": "${AF_PROD_CYCLE_MODE:-advisory}"
}
EOF
)
    
    # Normalize circle name before logging
    local normalized_circle=$(normalize_circle_name "$top_owner_circle")
    
    emit_pattern_event "circle-risk-focus" "$AF_PROD_CYCLE_MODE" "focus" \
        "$normalized_circle" "${AF_DEPTH_LEVEL:-2}" "false" "advisory" \
        "$pattern_data, \"reason\": \"Circle $normalized_circle has highest ROAM risk, allocated $extra_iterations extra iterations\""
}

# Autocommit Shadow Pattern - Trust Building
# ===========================================
# Tracks shadow autocommit candidates to build confidence before enabling
# Metrics: candidates (files), manual_override (disagreements), cycles_before_confidence
#
# Usage: log_autocommit_shadow 5 0 12
log_autocommit_shadow() {
    local candidate_count="${1:-0}"
    local manual_override_count="${2:-0}"
    local cycles_until_confidence="${3:-0}"
    
    local pattern_data=$(cat <<EOF
"autocommit_shadow": {
  "candidates": $candidate_count,
  "manual_override": $manual_override_count,
  "cycles_before_confidence": $cycles_until_confidence,
  "shadow_mode": true,
  "confidence_score": ${AF_AUTOCOMMIT_CONFIDENCE:-0.0},
  "recommendation": "${AF_AUTOCOMMIT_RECOMMENDATION:-continue_shadow}"
}
EOF
)
    
    # Normalize circle name before logging
    local circle_name=$(normalize_circle_name "${AF_CIRCLE:-Orchestrator}")
    
    emit_pattern_event "autocommit-shadow" "advisory" "autocommit" \
        "$circle_name" "${AF_DEPTH_LEVEL:-3}" "false" "advisory" \
        "$pattern_data, \"reason\": \"Shadow mode tracking $candidate_count candidates, $manual_override_count overrides, $cycles_until_confidence cycles to confidence\""
}

# Guardrail Lock Pattern - Test-First Enforcement
# ================================================
# Tracks when test-first is enforced despite --no-test-first flag
# Metrics: enforced (count), health_state, user_requests (bypass attempts)
#
# Usage: log_guardrail_lock "enforced" "red" 2
log_guardrail_lock() {
    local enforcement_status="$1"  # enforced, bypassed
    local health_state="$2"         # red, amber, green
    local user_bypass_attempts="${3:-0}"
    
    local pattern_data=$(cat <<EOF
"guardrail_lock": {
  "enforced": $([ "$enforcement_status" = "enforced" ] && echo "true" || echo "false"),
  "health_state": "$health_state",
  "user_requests": $user_bypass_attempts,
  "governor_health": "${AF_GOVERNOR_HEALTH:-$health_state}",
  "lock_reason": "${AF_GUARDRAIL_LOCK_REASON:-health_check_failed}"
}
EOF
)
    
    emit_pattern_event "guardrail-lock" "enforcement" "test-first" \
        "${AF_CIRCLE:-Orchestrator}" "${AF_DEPTH_LEVEL:-3}" "true" "enforcement" \
        "$pattern_data, \"reason\": \"Guardrail lock $enforcement_status with health=$health_state, bypass attempts=$user_bypass_attempts\""
}

# Failure Strategy Pattern - Fail-Fast vs Degrade
# ================================================
# Tracks which failure strategy is active and results
# Metrics: mode (fail-fast|degrade), abort_iteration_at, degrade_reason
#
# Usage: log_failure_strategy "fail-fast" 5 "foundation_fail"
log_failure_strategy() {
    local strategy_mode="$1"      # fail-fast, degrade-and-continue
    local abort_iteration="${2:-0}"
    local failure_reason="$3"
    
    local pattern_data=$(cat <<EOF
"failure_strategy": {
  "mode": "$strategy_mode",
  "abort_iteration_at": $abort_iteration,
  "degrade_reason": "$failure_reason",
  "total_iterations_requested": ${AF_REQUESTED_ITERATIONS:-10},
  "iterations_completed": ${AF_COMPLETED_ITERATIONS:-$abort_iteration},
  "diagnostic_data_collected": $([ "$strategy_mode" = "degrade-and-continue" ] && echo "true" || echo "false")
}
EOF
)
    
    emit_pattern_event "failure-strategy" "$AF_PROD_CYCLE_MODE" "health" \
        "${AF_CIRCLE:-Orchestrator}" "${AF_DEPTH_LEVEL:-2}" "false" "advisory" \
        "$pattern_data, \"reason\": \"Strategy=$strategy_mode, aborted at iteration $abort_iteration due to $failure_reason\""
}

# Iteration Budget Pattern - Runaway Prevention
# ==============================================
# Tracks iteration budgets to prevent infinite loops
# Metrics: requested, enforced (capped), autocommit_runs
#
# Usage: log_iteration_budget 100 20 5
log_iteration_budget() {
    local requested_iterations="${1:-10}"
    local enforced_iterations="${2:-10}"
    local autocommit_run_count="${3:-0}"
    
    local pattern_data=$(cat <<EOF
"iteration_budget": {
  "requested": $requested_iterations,
  "enforced": $enforced_iterations,
  "autocommit_runs": $autocommit_run_count,
  "budget_cap": ${AF_ITERATION_BUDGET_CAP:-25},
  "budget_exceeded": $([ "$requested_iterations" -gt "${AF_ITERATION_BUDGET_CAP:-25}" ] && echo "true" || echo "false"),
  "budget_policy": "${AF_ITERATION_BUDGET_POLICY:-conservative}"
}
EOF
)
    
    emit_pattern_event "iteration-budget" "$AF_PROD_CYCLE_MODE" "policy" \
        "${AF_CIRCLE:-Orchestrator}" "${AF_DEPTH_LEVEL:-2}" "false" "advisory" \
        "$pattern_data, \"reason\": \"Budget enforced: requested=$requested_iterations, capped at $enforced_iterations, autocommit runs=$autocommit_run_count\""
}

# Observability First Pattern - Metrics Coverage
# ===============================================
# Tracks observability gaps and telemetry coverage
# Metrics: metrics_written, missing_signals, suggestion_made
#
# Usage: log_observability_first 42 3 "enable_autocommit"
log_observability_first() {
    local metrics_written_count="${1:-0}"
    local missing_signals_count="${2:-0}"
    local suggestion="${3:-none}"
    
    local pattern_data=$(cat <<EOF
"observability_first": {
  "metrics_written": $metrics_written_count,
  "missing_signals": $missing_signals_count,
  "suggestion_made": "$suggestion",
  "telemetry_coverage_pct": ${AF_TELEMETRY_COVERAGE:-0.0},
  "gaps_identified": $([ "$missing_signals_count" -gt 0 ] && echo "true" || echo "false"),
  "remediation_action": "${AF_OBSERVABILITY_ACTION:-add_logging}"
}
EOF
)
    
    emit_pattern_event "observability-first" "$AF_PROD_CYCLE_MODE" "observability" \
        "${AF_CIRCLE:-Assessor}" "${AF_DEPTH_LEVEL:-2}" "false" "observability" \
        "$pattern_data, \"reason\": \"Metrics coverage: $metrics_written_count written, $missing_signals_count gaps, suggestion=$suggestion\""
}

# Depth Ladder Pattern - Maturity Escalation
# ===========================================
# Tracks depth level changes and escalation triggers
# Metrics: previous_depth, new_depth, escalation_trigger, green_streak
#
# Usage: log_depth_ladder 3 4 "green_streak" 5
log_depth_ladder() {
    local previous_depth="${1:-3}"
    local new_depth="${2:-4}"
    local trigger_type="$3"         # green_streak, manual, rollback
    local green_streak_count="${4:-0}"
    
    local pattern_data=$(cat <<EOF
"depth_ladder": {
  "previous_depth": $previous_depth,
  "new_depth": $new_depth,
  "escalation_trigger": "$trigger_type",
  "green_streak": $green_streak_count,
  "green_streak_threshold": ${AF_GREEN_STREAK_THRESHOLD:-3},
  "escalation_direction": $([ "$new_depth" -gt "$previous_depth" ] && echo "\"up\"" || echo "\"down\""),
  "maturity_gate": "${AF_MATURITY_GATE:-health}"
}
EOF
)
    
    local direction=$([ "$new_depth" -gt "$previous_depth" ] && echo "escalation" || echo "degradation")
    
    emit_pattern_event "depth-ladder" "$AF_PROD_CYCLE_MODE" "maturity" \
        "${AF_CIRCLE:-Orchestrator}" "$new_depth" "false" "mutation" \
        "$pattern_data, \"reason\": \"Depth $direction: $previous_depth→$new_depth, trigger=$trigger_type, green_streak=$green_streak_count\""
}

# HPC Batch Window Pattern - Cluster Resource Tracking
# =====================================================
# Tracks GPU utilization, throughput, latency for HPC workloads
# Metrics: gpu_util_pct, throughput_samples_sec, p99_latency_ms, node_count
#
# Usage: log_hpc_batch_window 85.5 1200 250 8
log_hpc_batch_window() {
    local gpu_util_pct="${1:-0.0}"
    local throughput_samples_sec="${2:-0}"
    local p99_latency_ms="${3:-0}"
    local node_count="${4:-1}"
    
    local pattern_data=$(cat <<EOF
"hpc_batch_window": {
  "gpu_util_pct": $gpu_util_pct,
  "throughput_samples_sec": $throughput_samples_sec,
  "p99_latency_ms": $p99_latency_ms,
  "node_count": $node_count,
  "queue_time_sec": ${AF_HPC_QUEUE_TIME:-0},
  "scheduler": "${AF_SCHEDULER:-slurm}",
  "framework": "${AF_FRAMEWORK:-}"
}
EOF
)
    
    emit_pattern_event "hpc-batch-window" "$AF_PROD_CYCLE_MODE" "focus" \
        "${AF_CIRCLE:-Assessor}" "${AF_DEPTH_LEVEL:-2}" "false" "observability" \
        "$pattern_data, \"tags\": [\"HPC\"], \"reason\": \"HPC metrics: gpu=$gpu_util_pct%, throughput=$throughput_samples_sec samples/sec, p99=$p99_latency_ms ms, nodes=$node_count\""
}

# ML Training Guardrail Pattern - Training Stability
# ==================================================
# Tracks ML training guardrails: epochs, early stopping, gradient issues
# Metrics: max_epochs, early_stop_triggered, grad_explosions, nan_batches
#
# Usage: log_ml_training_guardrail 100 true 3 12
log_ml_training_guardrail() {
    local max_epochs="${1:-100}"
    local early_stop_triggered="${2:-false}"
    local grad_explosions="${3:-0}"
    local nan_batches="${4:-0}"
    
    local pattern_data=$(cat <<EOF
"ml_training_guardrail": {
  "max_epochs": $max_epochs,
  "early_stop_triggered": $early_stop_triggered,
  "grad_explosions": $grad_explosions,
  "nan_batches": $nan_batches,
  "gpu_util_pct": ${AF_GPU_UTIL:-0.0},
  "p99_latency_ms": ${AF_P99_LATENCY:-0},
  "framework": "${AF_FRAMEWORK:-pytorch}",
  "scheduler": "${AF_SCHEDULER:-slurm}"
}
EOF
)
    
    emit_pattern_event "ml-training-guardrail" "$AF_PROD_CYCLE_MODE" "focus" \
        "${AF_CIRCLE:-Analyst}" "${AF_DEPTH_LEVEL:-3}" "false" "observability" \
        "$pattern_data, \"tags\": [\"ML\"], \"reason\": \"ML training: max_epochs=$max_epochs, early_stop=$early_stop_triggered, grad_explosions=$grad_explosions, nan_batches=$nan_batches\""
}

# Statistical Robustness Sweep Pattern - Analysis Validation
# ==========================================================
# Tracks statistical robustness checks across seeds and datasets
# Metrics: num_seeds, num_datasets, coverage_score, pvalue_min
#
# Usage: log_stat_robustness_sweep 10 5 92 0.01
log_stat_robustness_sweep() {
    local num_seeds="${1:-5}"
    local num_datasets="${2:-3}"
    local coverage_score="${3:-0}"
    local pvalue_min="${4:-0.05}"
    
    local pattern_data=$(cat <<EOF
"stat_robustness_sweep": {
  "num_seeds": $num_seeds,
  "num_datasets": $num_datasets,
  "coverage_score": $coverage_score,
  "pvalue_min": $pvalue_min,
  "robustness_threshold": ${AF_STAT_ROBUSTNESS_THRESHOLD:-90},
  "framework": "${AF_FRAMEWORK:-}",
  "method": "${AF_STAT_METHOD:-cross_validation}"
}
EOF
)
    
    emit_pattern_event "stat-robustness-sweep" "$AF_PROD_CYCLE_MODE" "focus" \
        "${AF_CIRCLE:-Innovator}" "${AF_DEPTH_LEVEL:-3}" "false" "observability" \
        "$pattern_data, \"tags\": [\"Stats\"], \"reason\": \"Statistical robustness: seeds=$num_seeds, datasets=$num_datasets, coverage=$coverage_score%, pvalue_min=$pvalue_min\""
}

# Device Coverage Pattern - Multi-Platform Testing
# =================================================
# Tracks device/platform testing coverage
# Metrics: devices_tested, platforms (JSON array), failures, coverage_pct
#
# Usage: log_device_coverage 12 '["ios","android","web"]' 1 88
log_device_coverage() {
    local devices_tested="${1:-0}"
    local platforms_json="${2:-[]}"
    local failures="${3:-0}"
    local coverage_pct="${4:-0}"
    
    local pattern_data=$(cat <<EOF
"device_coverage": {
  "devices_tested": $devices_tested,
  "platforms": $platforms_json,
  "failures": $failures,
  "coverage_pct": $coverage_pct,
  "target_coverage": ${AF_DEVICE_COVERAGE_TARGET:-95},
  "framework": "${AF_FRAMEWORK:-react-native}"
}
EOF
)
    
    emit_pattern_event "device-coverage" "$AF_PROD_CYCLE_MODE" "focus" \
        "${AF_CIRCLE:-Intuitive}" "${AF_DEPTH_LEVEL:-2}" "false" "observability" \
        "$pattern_data, \"tags\": [\"Device/Web\"], \"reason\": \"Device coverage: $devices_tested devices, $failures failures, $coverage_pct% coverage across platforms\""
}

# Export all helper functions
export -f log_safe_degrade_event
export -f log_circle_risk_focus
export -f log_autocommit_shadow
export -f log_guardrail_lock
export -f log_failure_strategy
export -f log_iteration_budget
export -f log_observability_first
export -f log_depth_ladder
export -f log_hpc_batch_window
export -f log_ml_training_guardrail
export -f log_stat_robustness_sweep
export -f log_device_coverage

echo -e "${GREEN}[af_pattern_helpers] All pattern helpers loaded${NC}"

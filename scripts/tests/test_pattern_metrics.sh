#!/usr/bin/env bash
#
# test_pattern_metrics.sh - Pattern Metrics Demo & Testing
#
# Demonstrates usage of pattern helpers and validates metrics logging
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Source the main af script to get emit_pattern_event
source "$SCRIPT_DIR/af"

# Source pattern helpers
source "$SCRIPT_DIR/af_pattern_helpers.sh"

echo -e "${BLUE}=== Pattern Metrics Testing ===${NC}"
echo

# Set up test environment
export AF_PROD_CYCLE_MODE="advisory"
export AF_CIRCLE="Orchestrator"
export AF_DEPTH_LEVEL=3
export AF_RUN_ID="test-$(date +%Y%m%d%H%M%S)"
export AF_FRAMEWORK="pytorch"
export AF_SCHEDULER="slurm"

echo -e "${GREEN}1. Testing Safe Degrade Pattern${NC}"
export AF_SAFE_DEGRADE_TRIGGER_COUNT=3
export AF_PREVIOUS_DEPTH=4
export AF_GOVERNOR_HEALTH="amber"
log_safe_degrade_event "deploy_fail" "depth_4_to_3" 2
echo "✓ Logged safe degrade event"
echo

echo -e "${GREEN}2. Testing Circle Risk Focus Pattern${NC}"
export AF_CIRCLE_RISK_BEFORE=100.0
export AF_CIRCLE_RISK_AFTER=84.5
log_circle_risk_focus "Seeker" 3 15.5
echo "✓ Logged circle risk focus event"
echo

echo -e "${GREEN}3. Testing Autocommit Shadow Pattern${NC}"
export AF_AUTOCOMMIT_CONFIDENCE=0.75
export AF_AUTOCOMMIT_RECOMMENDATION="continue_shadow"
log_autocommit_shadow 5 0 12
echo "✓ Logged autocommit shadow event"
echo

echo -e "${GREEN}4. Testing Guardrail Lock Pattern${NC}"
export AF_GUARDRAIL_LOCK_REASON="governor_health_red"
log_guardrail_lock "enforced" "red" 2
echo "✓ Logged guardrail lock event"
echo

echo -e "${GREEN}5. Testing Failure Strategy Pattern${NC}"
export AF_REQUESTED_ITERATIONS=10
export AF_COMPLETED_ITERATIONS=5
log_failure_strategy "fail-fast" 5 "foundation_fail"
echo "✓ Logged failure strategy event"
echo

echo -e "${GREEN}6. Testing Iteration Budget Pattern${NC}"
export AF_ITERATION_BUDGET_CAP=25
export AF_ITERATION_BUDGET_POLICY="conservative"
log_iteration_budget 100 20 5
echo "✓ Logged iteration budget event"
echo

echo -e "${GREEN}7. Testing Observability First Pattern${NC}"
export AF_TELEMETRY_COVERAGE=87.5
export AF_OBSERVABILITY_ACTION="add_logging"
log_observability_first 42 3 "enable_autocommit"
echo "✓ Logged observability first event"
echo

echo -e "${GREEN}8. Testing Depth Ladder Pattern${NC}"
export AF_GREEN_STREAK_THRESHOLD=3
export AF_MATURITY_GATE="health"
log_depth_ladder 3 4 "green_streak" 5
echo "✓ Logged depth ladder event"
echo

echo -e "${GREEN}9. Testing HPC Batch Window Pattern${NC}"
export AF_HPC_QUEUE_TIME=300
export AF_SCHEDULER="slurm"
log_hpc_batch_window 85.5 1200 250 8
echo "✓ Logged HPC batch window event"
echo

echo -e "${GREEN}10. Testing ML Training Guardrail Pattern${NC}"
export AF_GPU_UTIL=92.0
export AF_P99_LATENCY=180
export AF_FRAMEWORK="pytorch"
log_ml_training_guardrail 100 true 3 12
echo "✓ Logged ML training guardrail event"
echo

echo -e "${GREEN}11. Testing Statistical Robustness Pattern${NC}"
export AF_STAT_ROBUSTNESS_THRESHOLD=90
export AF_STAT_METHOD="cross_validation"
log_stat_robustness_sweep 10 5 92 0.01
echo "✓ Logged statistical robustness event"
echo

echo -e "${GREEN}12. Testing Device Coverage Pattern${NC}"
export AF_DEVICE_COVERAGE_TARGET=95
export AF_FRAMEWORK="react-native"
log_device_coverage 12 '["ios","android","web"]' 1 88
echo "✓ Logged device coverage event"
echo

echo -e "${BLUE}=== Validation ===${NC}"
echo

# Check if pattern_metrics.jsonl was created
if [ -f "$PROJECT_ROOT/.goalie/pattern_metrics.jsonl" ]; then
    echo -e "${GREEN}✓ pattern_metrics.jsonl exists${NC}"
    
    # Count events
    event_count=$(wc -l < "$PROJECT_ROOT/.goalie/pattern_metrics.jsonl" | tr -d ' ')
    echo -e "${GREEN}✓ Total events logged: $event_count${NC}"
    
    # Show last 3 events
    echo
    echo -e "${BLUE}Last 3 events:${NC}"
    tail -3 "$PROJECT_ROOT/.goalie/pattern_metrics.jsonl" | jq -c '
        {
            ts: .ts,
            pattern: .pattern,
            circle: .circle,
            depth: .depth,
            mode: .mode,
            gate: .gate,
            tags: .tags
        }
    ' 2>/dev/null || tail -3 "$PROJECT_ROOT/.goalie/pattern_metrics.jsonl"
    
    echo
    echo -e "${GREEN}✓ All pattern metrics tests passed!${NC}"
    echo
    echo -e "${YELLOW}Pattern metrics file: $PROJECT_ROOT/.goalie/pattern_metrics.jsonl${NC}"
    echo -e "${YELLOW}View full metrics: cat $PROJECT_ROOT/.goalie/pattern_metrics.jsonl | jq .${NC}"
else
    echo -e "${YELLOW}⚠ Warning: pattern_metrics.jsonl not found${NC}"
    exit 1
fi

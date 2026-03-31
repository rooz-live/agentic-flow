#!/usr/bin/env bash
# ceremony-hooks.sh - Dynamic hook system for ceremony lifecycle
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Only set ROOT_DIR if not already set (to avoid overriding parent script's ROOT_DIR)
if [[ -z "${ROOT_DIR:-}" ]]; then
  ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log_hook() {
  echo -e "${MAGENTA}[HOOK]${NC} $*"
}

log_hook_success() {
  echo -e "${GREEN}[HOOK-✓]${NC} $*"
}

log_hook_warn() {
  echo -e "${YELLOW}[HOOK-⚠]${NC} $*"
}

log_hook_error() {
  echo -e "${RED}[HOOK-✗]${NC} $*"
}

# ═══════════════════════════════════════════════════════════════
# PRE-CEREMONY HOOKS
# ═══════════════════════════════════════════════════════════════

check_wsjf_priority() {
  local circle="$1"
  local ceremony="$2"
  
  if [[ "${ENABLE_WSJF_CHECK:-0}" != "1" ]]; then
    return 0
  fi
  
  log_hook "Checking WSJF priorities for $circle..."
  
  # Get top WSJF items for circle
  local wsjf_output
  if wsjf_output=$(python3 "$ROOT_DIR/scripts/cmd_wsjf.py" --circle "$circle" 2>/dev/null); then
    # Show top item
    local top_item=$(echo "$wsjf_output" | grep -A1 "Top.*Items" | tail -1 | head -c 80)
    if [[ -n "$top_item" ]]; then
      log_hook_success "Top priority: $top_item"
    fi
  else
    log_hook_warn "WSJF check failed (may need data)"
  fi
}

check_risk_threshold() {
  local circle="$1"
  
  if [[ "${ENABLE_RISK_CHECK:-0}" != "1" ]]; then
    return 0
  fi
  
  log_hook "Checking risk threshold for $circle..."
  
  # Check if high-risk items block ceremony
  if [[ -f "$ROOT_DIR/scripts/agentic/risk_analytics.py" ]]; then
    if python3 "$ROOT_DIR/scripts/agentic/risk_analytics.py" --circle "$circle" --threshold high 2>/dev/null; then
      log_hook_success "Risk threshold acceptable"
    else
      log_hook_warn "High risk detected for $circle"
    fi
  fi
}

check_roam_blockers() {
  local circle="$1"
  
  if [[ "${ENABLE_ROAM_CHECK:-0}" != "1" ]]; then
    return 0
  fi
  
  log_hook "Checking ROAM blockers for $circle..."
  
  # Check for unresolved blockers
  if [[ -f "$ROOT_DIR/scripts/agentic/show_roam_risks.py" ]]; then
    local blocker_count
    blocker_count=$(python3 "$ROOT_DIR/scripts/agentic/show_roam_risks.py" --circle "$circle" --status owned 2>/dev/null | grep -c "^" || echo "0")
    
    if [[ $blocker_count -gt 0 ]]; then
      log_hook_warn "$blocker_count ROAM blockers for $circle"
    else
      log_hook_success "No ROAM blockers"
    fi
  fi
}

run_pre_ceremony_hooks() {
  local circle="$1"
  local ceremony="$2"
  
  if [[ "${ENABLE_CEREMONY_HOOKS:-1}" != "1" ]]; then
    return 0
  fi
  
  log_hook "═══ PRE-CEREMONY HOOKS ($circle::$ceremony) ═══"
  
  # Check WSJF priorities
  check_wsjf_priority "$circle" "$ceremony"
  
  # Check risk threshold
  check_risk_threshold "$circle"
  
  # Check ROAM blockers
  check_roam_blockers "$circle"
  
  echo ""
}

# ═══════════════════════════════════════════════════════════════
# POST-CEREMONY HOOKS
# ═══════════════════════════════════════════════════════════════

detect_observability_gaps() {
  local circle="$1"
  local ceremony="$2"
  local episode_file="$3"
  
  if [[ "${ENABLE_OBSERVABILITY_CHECK:-1}" != "1" ]]; then
    return 0
  fi
  
  log_hook "Detecting observability gaps for $circle::$ceremony..."
  
  # Check if episode has sufficient observability
  if [[ -f "$ROOT_DIR/scripts/cmd_detect_observability_gaps.py" ]]; then
    local gaps_output
    if gaps_output=$(python3 "$ROOT_DIR/scripts/cmd_detect_observability_gaps.py" \
      --episode "$episode_file" \
      --circle "$circle" \
      --ceremony "$ceremony" 2>/dev/null); then
      
      local gap_count=$(echo "$gaps_output" | grep -c "gap" || echo "0")
      if [[ $gap_count -gt 0 ]]; then
        log_hook_warn "$gap_count observability gaps detected"
      else
        log_hook_success "No observability gaps"
      fi
    fi
  fi
}

escalate_roam_on_failure() {
  local circle="$1"
  local ceremony="$2"
  local exit_code="$3"
  local error_msg="${4:-unknown error}"
  
  if [[ "${ENABLE_ROAM_ESCALATION:-0}" != "1" ]]; then
    return 0
  fi
  
  if [[ $exit_code -eq 0 ]]; then
    return 0
  fi
  
  log_hook "Auto-escalating ROAM due to ceremony failure..."
  
  if [[ -f "$ROOT_DIR/scripts/agentic/roam_auto_escalation.py" ]]; then
    python3 "$ROOT_DIR/scripts/agentic/roam_auto_escalation.py" \
      --circle "$circle" \
      --ceremony "$ceremony" \
      --failure-reason "$error_msg" 2>/dev/null || log_hook_warn "ROAM escalation failed"
  fi
}

record_ceremony_metrics() {
  local circle="$1"
  local ceremony="$2"
  local duration="$3"
  
  if [[ "${ENABLE_CEREMONY_METRICS:-1}" != "1" ]]; then
    return 0
  fi
  
  # Record to metrics log
  local metrics_file="$ROOT_DIR/.goalie/ceremony_metrics.jsonl"
  mkdir -p "$(dirname "$metrics_file")"
  
  local ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  echo "{\"timestamp\":\"$ts\",\"circle\":\"$circle\",\"ceremony\":\"$ceremony\",\"duration\":$duration,\"type\":\"ceremony_completion\"}" >> "$metrics_file"
}

trigger_learning_cycle() {
  local circle="$1"
  local ceremony="$2"
  
  if [[ "${ENABLE_AUTO_LEARNING:-1}" != "1" ]]; then
    return 0
  fi
  
  log_hook "Checking if learning cycle should trigger..."
  
  # Execute post-episode learning with governance
  if [[ -x "$SCRIPT_DIR/post-episode-learning.sh" ]]; then
    "$SCRIPT_DIR/post-episode-learning.sh" 2>&1 | while IFS= read -r line; do
      log_hook "$line"
    done
  else
    log_hook_warn "Post-episode learning hook not found"
  fi
}

run_post_ceremony_hooks() {
  local circle="$1"
  local ceremony="$2"
  local exit_code="$3"
  local episode_file="${4:-}"
  local duration="${5:-0}"
  local error_msg="${6:-}"
  
  if [[ "${ENABLE_CEREMONY_HOOKS:-1}" != "1" ]]; then
    return 0
  fi
  
  log_hook "═══ POST-CEREMONY HOOKS ($circle::$ceremony) ═══"
  
  # Detect observability gaps
  if [[ -n "$episode_file" ]]; then
    detect_observability_gaps "$circle" "$ceremony" "$episode_file"
  fi
  
  # Auto-escalate ROAM on failure
  escalate_roam_on_failure "$circle" "$ceremony" "$exit_code" "$error_msg"
  
  # Record metrics
  record_ceremony_metrics "$circle" "$ceremony" "$duration"
  
  # Trigger learning cycle (with governance)
  trigger_learning_cycle "$circle" "$ceremony"
  
  echo ""
}

# ═══════════════════════════════════════════════════════════════
# BATCH-ANALYSIS HOOKS
# ═══════════════════════════════════════════════════════════════

analyze_patterns() {
  local total_ceremonies="$1"
  
  if [[ "${ENABLE_PATTERN_ANALYSIS:-0}" != "1" ]]; then
    return 0
  fi
  
  log_hook "Analyzing pattern metrics..."
  
  if [[ -f "$ROOT_DIR/scripts/cmd_pattern_stats_enhanced.py" ]]; then
    python3 "$ROOT_DIR/scripts/cmd_pattern_stats_enhanced.py" \
      --last "$total_ceremonies" 2>/dev/null || log_hook_warn "Pattern analysis failed"
  fi
}

analyze_causal_experiments() {
  local total_ceremonies="$1"
  
  # This is called by ay-prod-learn-loop.sh already when --analyze is used
  # Just log for visibility
  log_hook "Causal analysis triggered (handled by learn-loop)"
}

run_batch_analysis_hooks() {
  local total_ceremonies="$1"
  local trigger_reason="${2:-periodic}"
  
  if [[ "${ENABLE_CEREMONY_HOOKS:-1}" != "1" ]]; then
    return 0
  fi
  
  log_hook "═══ BATCH-ANALYSIS HOOKS (n=$total_ceremonies, reason=$trigger_reason) ═══"
  
  # Pattern analysis (every 10 ceremonies)
  if (( total_ceremonies % 10 == 0 )); then
    analyze_patterns "$total_ceremonies"
  fi
  
  # Causal analysis (handled by learn-loop --analyze flag)
  if [[ "$trigger_reason" == "causal" ]]; then
    analyze_causal_experiments "$total_ceremonies"
  fi
  
  echo ""
}

# ═══════════════════════════════════════════════════════════════
# POST-BATCH HOOKS
# ═══════════════════════════════════════════════════════════════

check_retro_approval() {
  if [[ "${ENABLE_RETRO_APPROVAL:-0}" != "1" ]]; then
    return 0
  fi
  
  log_hook "Checking retro approval status..."
  
  if [[ -f "$ROOT_DIR/scripts/cmd_retro.py" ]]; then
    if python3 "$ROOT_DIR/scripts/cmd_retro.py" check autocommit 2>/dev/null; then
      log_hook_success "Autocommit approved ✓"
      return 0
    else
      log_hook_warn "Autocommit not approved - run: ./scripts/cmd_retro.py approve autocommit"
      return 1
    fi
  fi
}

calculate_economics() {
  local total_ceremonies="$1"
  
  if [[ "${ENABLE_ECONOMIC_CALC:-0}" != "1" ]]; then
    return 0
  fi
  
  log_hook "Calculating economic attribution..."
  
  if [[ -f "$ROOT_DIR/scripts/agentic/economic_calculator.py" ]]; then
    python3 "$ROOT_DIR/scripts/agentic/economic_calculator.py" \
      --ceremonies "$total_ceremonies" \
      --timeframe "1h" 2>/dev/null || log_hook_warn "Economic calc failed"
  fi
}

verify_alignment() {
  if [[ "${ENABLE_ALIGNMENT_CHECK:-0}" != "1" ]]; then
    return 0
  fi
  
  log_hook "Verifying alignment..."
  
  if [[ -f "$ROOT_DIR/scripts/agentic/alignment_checker.py" ]]; then
    if python3 "$ROOT_DIR/scripts/agentic/alignment_checker.py" --mode strict 2>/dev/null; then
      log_hook_success "Alignment verified ✓"
    else
      log_hook_error "Alignment check failed!"
      return 1
    fi
  fi
}

generate_graduation_report() {
  local total_ceremonies="$1"
  
  if [[ "${ENABLE_GRADUATION_REPORT:-0}" != "1" ]]; then
    return 0
  fi
  
  log_hook "Generating graduation assessment..."
  
  if [[ -f "$ROOT_DIR/scripts/agentic/graduation_assessor.py" ]]; then
    python3 "$ROOT_DIR/scripts/agentic/graduation_assessor.py" \
      --ceremonies "$total_ceremonies" 2>/dev/null || log_hook_warn "Graduation assessment failed"
  fi
}

refresh_recommended_actions() {
  if [[ "${ENABLE_ACTION_REFRESH:-1}" != "1" ]]; then
    return 0
  fi
  
  log_hook "Refreshing recommended actions from insights..."
  
  # Run suggest-actions to regenerate action recommendations from all recent insights
  if [[ -f "$ROOT_DIR/scripts/agentic/suggest_actions.py" ]]; then
    local actions_output="$ROOT_DIR/.goalie/suggested_actions_latest.txt"
    if python3 "$ROOT_DIR/scripts/agentic/suggest_actions.py" > "$actions_output" 2>/dev/null; then
      local action_count=$(grep -c "suggested_action:" "$actions_output" || echo "0")
      log_hook_success "$action_count recommended actions updated"
      
      # Display summary to console
      if [[ $action_count -gt 0 ]]; then
        log_hook "Recent action suggestions:"
        grep "suggested_action:" "$actions_output" | head -3
      fi
    else
      log_hook_warn "Failed to refresh actions"
    fi
  fi
}

run_post_batch_hooks() {
  local total_ceremonies="$1"
  
  if [[ "${ENABLE_CEREMONY_HOOKS:-1}" != "1" ]]; then
    return 0
  fi
  
  log_hook "═══ POST-BATCH HOOKS (total=$total_ceremonies) ═══"
  
  # Check retro approval
  check_retro_approval
  
  # Calculate economics
  calculate_economics "$total_ceremonies"
  
  # Verify alignment
  verify_alignment
  
  # Generate graduation report
  generate_graduation_report "$total_ceremonies"
  
  # Refresh recommended actions after cycle completion
  refresh_recommended_actions
  
  echo ""
}

# ═══════════════════════════════════════════════════════════════
# HOOK CONFIGURATION
# ═══════════════════════════════════════════════════════════════

show_hook_config() {
  echo -e "${CYAN}═══ Ceremony Hook Configuration ═══${NC}"
  echo ""
  echo "Environment Variables:"
  echo "  ENABLE_CEREMONY_HOOKS=${ENABLE_CEREMONY_HOOKS:-1} (master switch)"
  echo ""
  echo "Pre-Ceremony:"
  echo "  ENABLE_WSJF_CHECK=${ENABLE_WSJF_CHECK:-0}"
  echo "  ENABLE_RISK_CHECK=${ENABLE_RISK_CHECK:-0}"
  echo "  ENABLE_ROAM_CHECK=${ENABLE_ROAM_CHECK:-0}"
  echo ""
  echo "Post-Ceremony:"
  echo "  ENABLE_OBSERVABILITY_CHECK=${ENABLE_OBSERVABILITY_CHECK:-1}"
  echo "  ENABLE_ROAM_ESCALATION=${ENABLE_ROAM_ESCALATION:-0}"
  echo "  ENABLE_CEREMONY_METRICS=${ENABLE_CEREMONY_METRICS:-1}"
  echo ""
  echo "Batch-Analysis:"
  echo "  ENABLE_PATTERN_ANALYSIS=${ENABLE_PATTERN_ANALYSIS:-0}"
  echo ""
  echo "Post-Batch:"
  echo "  ENABLE_RETRO_APPROVAL=${ENABLE_RETRO_APPROVAL:-0}"
  echo "  ENABLE_ECONOMIC_CALC=${ENABLE_ECONOMIC_CALC:-0}"
  echo "  ENABLE_ALIGNMENT_CHECK=${ENABLE_ALIGNMENT_CHECK:-0}"
  echo "  ENABLE_GRADUATION_REPORT=${ENABLE_GRADUATION_REPORT:-0}"
  echo "  ENABLE_ACTION_REFRESH=${ENABLE_ACTION_REFRESH:-1}"
  echo ""
}

# Export functions
export -f run_pre_ceremony_hooks
export -f run_post_ceremony_hooks
export -f run_batch_analysis_hooks
export -f run_post_batch_hooks
export -f show_hook_config

#!/usr/bin/env bash
# Agentic-Flow Intelligent Orchestrator
# Cycles through modes iteratively with go/no-go decision points

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTDB="$PROJECT_ROOT/agentdb.db"

# Colors and UI
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Progress tracking
CYCLE_NUM=0
ACTIONS_RESOLVED=0
TOTAL_ACTIONS=0
MODE_HISTORY=()

#═══════════════════════════════════════════
# UI Components
#═══════════════════════════════════════════

progress_bar() {
  local current=$1
  local total=$2
  local width=50
  local percent=$((current * 100 / total))
  local filled=$((current * width / total))
  local empty=$((width - filled))
  
  printf "${CYAN}["
  printf "%${filled}s" | tr ' ' '█'
  printf "%${empty}s" | tr ' ' '░'
  printf "] ${BOLD}%3d%%${NC} (%d/%d)\n" "$percent" "$current" "$total"
}

section_header() {
  local title="$1"
  local icon="${2:-🔄}"
  echo ""
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════${NC}"
  echo -e "${BOLD}${BLUE}  $icon $title${NC}"
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════${NC}"
  echo ""
}

status_line() {
  local status="$1"
  local message="$2"
  case "$status" in
    ok) echo -e "${GREEN}✓${NC} $message" ;;
    warn) echo -e "${YELLOW}⚠${NC} $message" ;;
    error) echo -e "${RED}✗${NC} $message" ;;
    info) echo -e "${CYAN}ℹ${NC} $message" ;;
    *) echo "  $message" ;;
  esac
}

decision_prompt() {
  local question="$1"
  local default="${2:-y}"
  
  echo ""
  echo -e "${BOLD}${MAGENTA}❓ $question${NC}"
  echo -e "${CYAN}   [y] Yes, proceed  [n] No, stop  [s] Skip this action${NC}"
  read -p "   Decision [${default}]: " -n 1 -r
  echo
  
  REPLY=${REPLY:-$default}
  case "$REPLY" in
    [Yy]) return 0 ;;
    [Ss]) return 2 ;;
    *) return 1 ;;
  esac
}

#═══════════════════════════════════════════
# Mode Detection & Recommendation
#═══════════════════════════════════════════

detect_system_state() {
  section_header "System State Analysis" "🔍"
  
  local state_issues=()
  
  # 1. Check database state
  status_line "info" "Checking database..."
  local episode_count=$(sqlite3 "$AGENTDB" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
  local recent_failures=$(sqlite3 "$AGENTDB" "SELECT COUNT(*) FROM episodes WHERE success=0 AND created_at > strftime('%s', 'now', '-1 hour');" 2>/dev/null || echo "0")
  
  if [[ $episode_count -lt 30 ]]; then
    state_issues+=("LOW_BASELINE:Need 30+ baseline episodes (current: $episode_count)")
    status_line "warn" "Low baseline data: $episode_count episodes"
  else
    status_line "ok" "Baseline data: $episode_count episodes"
  fi
  
  if [[ $recent_failures -gt 5 ]]; then
    state_issues+=("HIGH_FAILURES:$recent_failures failures in last hour")
    status_line "warn" "High failure rate: $recent_failures in last hour"
  fi
  
  # 2. Check threshold confidence
  status_line "info" "Checking threshold confidence..."
  if [[ -f "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
    local confidence=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" all orchestrator standup 2>/dev/null | grep -c "HIGH_CONFIDENCE" || echo "0")
    if [[ $confidence -lt 2 ]]; then
      state_issues+=("LOW_CONFIDENCE:Only $confidence thresholds at HIGH_CONFIDENCE")
      status_line "warn" "Low confidence: $confidence/5 thresholds HIGH"
    else
      status_line "ok" "Confidence: $confidence/5 thresholds HIGH"
    fi
  fi
  
  # 3. Check for degradation events
  status_line "info" "Checking recent degradation..."
  local degradation_events=$(sqlite3 "$AGENTDB" "SELECT COUNT(*) FROM degradation_events WHERE created_at > datetime('now', '-24 hours');" 2>/dev/null || echo "0")
  if [[ $degradation_events -gt 10 ]]; then
    state_issues+=("HIGH_DEGRADATION:$degradation_events events in 24h")
    status_line "warn" "High degradation: $degradation_events events"
  elif [[ $degradation_events -gt 0 ]]; then
    status_line "info" "Degradation events: $degradation_events (normal)"
  fi
  
  # 4. Check for cascade failures
  status_line "info" "Checking cascade failures..."
  local cascade_failures=$(sqlite3 "$AGENTDB" "SELECT COUNT(*) FROM observations WHERE success=0 AND created_at > datetime('now', '-5 minutes');" 2>/dev/null || echo "0")
  if [[ $cascade_failures -ge 5 ]]; then
    state_issues+=("CASCADE_RISK:$cascade_failures failures in 5 min")
    status_line "error" "CASCADE RISK: $cascade_failures failures"
  fi
  
  echo ""
  echo -e "${BOLD}Detected Issues (${#state_issues[@]}):${NC}"
  if [[ ${#state_issues[@]} -eq 0 ]]; then
    status_line "ok" "System healthy - no critical issues"
  else
    for issue in "${state_issues[@]}"; do
      local code="${issue%%:*}"
      local msg="${issue#*:}"
      status_line "warn" "$code: $msg"
    done
  fi
  
  # Return issues as array
  printf '%s\n' "${state_issues[@]}"
}

recommend_actions() {
  local -a issues=("$@")
  local -a actions=()
  
  section_header "Action Recommendations" "📋"
  
  for issue in "${issues[@]}"; do
    local code="${issue%%:*}"
    
    case "$code" in
      LOW_BASELINE)
        actions+=("BUILD_BASELINE:Run 30 baseline episodes to improve confidence")
        status_line "info" "Recommend: BUILD_BASELINE (WSJF: 9.0)"
        ;;
      HIGH_FAILURES)
        actions+=("INVESTIGATE_FAILURES:Analyze failure patterns before proceeding")
        status_line "warn" "Recommend: INVESTIGATE_FAILURES (WSJF: 8.5)"
        ;;
      LOW_CONFIDENCE)
        actions+=("IMPROVE_CONFIDENCE:Run more episodes per circle")
        status_line "info" "Recommend: IMPROVE_CONFIDENCE (WSJF: 7.0)"
        ;;
      HIGH_DEGRADATION)
        actions+=("ANALYZE_DEGRADATION:Review degradation patterns and tune sensitivity")
        status_line "warn" "Recommend: ANALYZE_DEGRADATION (WSJF: 6.5)"
        ;;
      CASCADE_RISK)
        actions+=("EMERGENCY_STOP:System unstable - halt operations")
        status_line "error" "Recommend: EMERGENCY_STOP (WSJF: 10.0)"
        ;;
    esac
  done
  
  # If no issues, recommend normal operation
  if [[ ${#actions[@]} -eq 0 ]]; then
    actions+=("RUN_DIVERGENCE:System healthy - proceed with divergence testing")
    status_line "ok" "Recommend: RUN_DIVERGENCE (WSJF: 5.0)"
  fi
  
  # Sort by WSJF (parse from string)
  local sorted_actions=()
  while IFS= read -r action; do
    sorted_actions+=("$action")
  done < <(printf '%s\n' "${actions[@]}" | sort -t: -k1,1)
  
  echo ""
  echo -e "${BOLD}Prioritized Actions (${#sorted_actions[@]}):${NC}"
  for i in "${!sorted_actions[@]}"; do
    local action_code="${sorted_actions[$i]%%:*}"
    local action_desc="${sorted_actions[$i]#*:}"
    echo -e "${CYAN}  $((i+1)).${NC} ${BOLD}$action_code${NC}: $action_desc"
  done
  
  TOTAL_ACTIONS=${#sorted_actions[@]}
  printf '%s\n' "${sorted_actions[@]}"
}

#═══════════════════════════════════════════
# Action Executors
#═══════════════════════════════════════════

execute_build_baseline() {
  section_header "Building Baseline" "🏗️"
  
  local target_episodes=30
  local current=$(sqlite3 "$AGENTDB" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
  local needed=$((target_episodes - current))
  
  if [[ $needed -le 0 ]]; then
    status_line "ok" "Baseline already sufficient ($current episodes)"
    return 0
  fi
  
  echo -e "${BOLD}Need $needed more episodes to reach $target_episodes${NC}"
  echo ""
  
  if ! decision_prompt "Build $needed baseline episodes? (Estimated: $((needed * 2)) minutes)"; then
    status_line "warn" "Baseline building skipped"
    return 2
  fi
  
  local success_count=0
  for i in $(seq 1 "$needed"); do
    echo -ne "${CYAN}Episode $i/$needed: ${NC}"
    if "$SCRIPT_DIR/ay-yo-integrate.sh" orchestrator standup >/dev/null 2>&1; then
      echo -e "${GREEN}✓${NC}"
      ((success_count++))
    else
      echo -e "${RED}✗${NC}"
    fi
    progress_bar "$i" "$needed"
    sleep 2
  done
  
  echo ""
  local success_rate=$((success_count * 100 / needed))
  if [[ $success_rate -ge 80 ]]; then
    status_line "ok" "Baseline built: $success_count/$needed episodes (${success_rate}%)"
    return 0
  else
    status_line "error" "Baseline quality poor: $success_count/$needed episodes (${success_rate}%)"
    return 1
  fi
}

execute_investigate_failures() {
  section_header "Failure Analysis" "🔬"
  
  echo -e "${BOLD}Recent Failures (Last 24h):${NC}"
  sqlite3 "$AGENTDB" <<EOF
SELECT 
  datetime(created_at, 'unixepoch') as time,
  circle,
  ceremony,
  CASE WHEN success=0 THEN 'FAIL' ELSE 'OK' END as status
FROM observations 
WHERE success = 0 
  AND created_at > strftime('%s', 'now', '-24 hours')
ORDER BY created_at DESC
LIMIT 10;
EOF
  
  echo ""
  echo -e "${BOLD}Failure Patterns:${NC}"
  sqlite3 "$AGENTDB" <<EOF
SELECT 
  circle,
  ceremony,
  COUNT(*) as failures,
  ROUND(AVG(CASE WHEN success=0 THEN 1 ELSE 0 END) * 100, 1) as failure_rate
FROM observations
WHERE created_at > strftime('%s', 'now', '-24 hours')
GROUP BY circle, ceremony
HAVING failure_rate > 10
ORDER BY failures DESC;
EOF
  
  echo ""
  if decision_prompt "Continue despite failures? (Manual review recommended)" "n"; then
    status_line "ok" "Failures reviewed - continuing"
    return 0
  else
    status_line "warn" "Stopped for manual investigation"
    return 1
  fi
}

execute_improve_confidence() {
  section_header "Improving Confidence" "📈"
  
  # Truth condition: detect actual low confidence thresholds
  local low_confidence_thresholds=$(
    "$SCRIPT_DIR/ay-dynamic-thresholds.sh" all orchestrator standup 2>/dev/null | 
    grep -c "LOW_CONFIDENCE\|FALLBACK" || echo "0"
  )
  
  if [[ $low_confidence_thresholds -eq 0 ]]; then
    status_line "ok" "All thresholds at HIGH confidence - no improvement needed"
    return 0
  fi
  
  # Calculate episodes needed (15 per threshold to reach HIGH confidence)
  local episodes_needed=$((low_confidence_thresholds * 15))
  
  echo ""
  echo -e "${BOLD}Confidence Analysis:${NC}"
  echo "  Low confidence thresholds: $low_confidence_thresholds"
  echo "  Episodes needed: $episodes_needed"
  echo "  Estimated time: $((episodes_needed * 2)) minutes"
  echo ""
  
  # Consequence awareness: explicit cost acknowledgment
  if ! decision_prompt "Run $episodes_needed confidence-building episodes?"; then
    status_line "warn" "Confidence improvement skipped - thresholds remain at FALLBACK"
    return 2
  fi
  
  # Delegate to BUILD_BASELINE (structural alignment: reuse proven patterns)
  execute_build_baseline
  
  # Validate improvement (truth testing)
  local new_confidence=$(
    "$SCRIPT_DIR/ay-dynamic-thresholds.sh" all orchestrator standup 2>/dev/null | 
    grep -c "HIGH_CONFIDENCE" || echo "0"
  )
  
  echo ""
  status_line "info" "Confidence after improvement: $new_confidence/5 thresholds HIGH"
  
  return 0
}

execute_analyze_degradation() {
  section_header "Degradation Analysis" "📉"
  
  # Truth condition: query actual degradation events from database
  local event_count=$(sqlite3 "$AGENTDB" \
    "SELECT COUNT(*) FROM degradation_events WHERE created_at > datetime('now', '-24 hours');" \
    2>/dev/null || echo "0")
  
  if [[ $event_count -eq 0 ]]; then
    status_line "ok" "No degradation events in last 24h - system stable"
    return 0
  fi
  
  echo ""
  echo -e "${BOLD}Recent Degradation Events (24h):${NC}"
  sqlite3 "$AGENTDB" <<EOF
SELECT 
  datetime(created_at) as time,
  circle,
  ceremony,
  ROUND(current_reward, 3) as current,
  ROUND(baseline_reward, 3) as baseline,
  ROUND((1 - current_reward/baseline_reward) * 100, 1) as degradation_pct
FROM degradation_events
WHERE created_at > datetime('now', '-24 hours')
ORDER BY created_at DESC
LIMIT 20;
EOF
  
  echo ""
  echo -e "${BOLD}Degradation Patterns (7 days):${NC}"
  sqlite3 "$AGENTDB" <<EOF
SELECT 
  circle,
  ceremony,
  COUNT(*) as event_count,
  ROUND(AVG(current_reward), 3) as avg_reward,
  ROUND(MIN(current_reward), 3) as min_reward,
  ROUND(AVG((1 - current_reward/baseline_reward) * 100), 1) as avg_degradation_pct
FROM degradation_events
WHERE created_at > datetime('now', '-7 days')
GROUP BY circle, ceremony
HAVING event_count > 3
ORDER BY event_count DESC;
EOF
  
  echo ""
  echo -e "${BOLD}Analysis:${NC}"
  echo "  Total events (24h): $event_count"
  
  # Structural diagnosis: identify if degradation is localized or systemic
  local affected_circles=$(sqlite3 "$AGENTDB" \
    "SELECT COUNT(DISTINCT circle) FROM degradation_events WHERE created_at > datetime('now', '-24 hours');" \
    2>/dev/null || echo "0")
  
  if [[ $affected_circles -gt 1 ]]; then
    status_line "warn" "Systemic degradation detected across $affected_circles circles"
  else
    status_line "info" "Localized degradation in $affected_circles circle"
  fi
  
  echo ""
  # Consequence awareness: explicit go/no-go decision
  if decision_prompt "Continue despite degradation events?"; then
    status_line "ok" "Degradation reviewed - continuing with monitoring"
    return 0
  else
    status_line "warn" "Stopped for degradation investigation"
    return 1
  fi
}

execute_run_divergence() {
  section_header "Divergence Testing" "🧪"
  
  # Calculate recommended rate
  local confidence=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" all orchestrator standup 2>/dev/null | grep -c "HIGH_CONFIDENCE" || echo "0")
  local recommended_rate
  
  if [[ $confidence -ge 4 ]]; then
    recommended_rate=0.15
    status_line "ok" "High confidence → Moderate divergence (0.15)"
  elif [[ $confidence -ge 2 ]]; then
    recommended_rate=0.10
    status_line "info" "Medium confidence → Conservative divergence (0.10)"
  else
    recommended_rate=0.05
    status_line "warn" "Low confidence → Very conservative (0.05)"
  fi
  
  echo ""
  echo -e "${BOLD}Test Parameters:${NC}"
  echo "  Circle: orchestrator"
  echo "  Ceremony: standup"
  echo "  Divergence Rate: $recommended_rate"
  echo "  Max Episodes: 20"
  echo ""
  
  if ! decision_prompt "Run divergence test with these parameters?"; then
    status_line "warn" "Divergence test skipped"
    return 2
  fi
  
  echo ""
  DIVERGENCE_RATE="$recommended_rate" MAX_EPISODES=20 \
    "$SCRIPT_DIR/ay-divergence-test.sh" single orchestrator standup
  
  local exit_code=$?
  
  if [[ $exit_code -eq 0 ]]; then
    status_line "ok" "Divergence test completed successfully"
    return 0
  else
    status_line "error" "Divergence test failed (exit: $exit_code)"
    return 1
  fi
}

execute_emergency_stop() {
  section_header "Emergency Stop" "🛑"
  
  status_line "error" "CASCADE FAILURE DETECTED - EMERGENCY STOP"
  
  echo ""
  echo -e "${BOLD}${RED}Critical Issues:${NC}"
  echo "  • Multiple rapid failures detected"
  echo "  • System may be in unstable state"
  echo "  • Manual intervention required"
  echo ""
  
  echo -e "${BOLD}Recommended Actions:${NC}"
  echo "  1. Review failure logs: sqlite3 agentdb.db 'SELECT * FROM observations WHERE success=0'"
  echo "  2. Check degradation events: sqlite3 agentdb.db 'SELECT * FROM degradation_events'"
  echo "  3. Rollback if needed: cp agentdb.db.divergence_backup agentdb.db"
  echo "  4. Investigate root cause before resuming"
  echo ""
  
  return 1
}

#═══════════════════════════════════════════
# Main Orchestration Loop
#═══════════════════════════════════════════

orchestrate() {
  local max_cycles="${1:-5}"
  
  section_header "Agentic-Flow Orchestrator" "🤖"
  
  echo -e "${BOLD}Configuration:${NC}"
  echo "  Max Cycles: $max_cycles"
  echo "  Auto-resolve: ${AUTO_RESOLVE:-no}"
  echo "  Database: $AGENTDB"
  echo ""
  
  while [[ $CYCLE_NUM -lt $max_cycles ]]; do
    ((CYCLE_NUM++))
    
    section_header "Cycle $CYCLE_NUM / $max_cycles" "🔄"
    
    # 1. Detect system state
    local -a issues
    mapfile -t issues < <(detect_system_state)
    
    # 2. Recommend actions
    local -a actions
    mapfile -t actions < <(recommend_actions "${issues[@]}")
    
    # 3. Execute actions
    echo ""
    echo -e "${BOLD}Execution Plan:${NC}"
    for i in "${!actions[@]}"; do
      local action_code="${actions[$i]%%:*}"
      echo -e "${CYAN}  Step $((i+1)):${NC} $action_code"
    done
    
    echo ""
    if [[ "${AUTO_RESOLVE:-no}" != "yes" ]]; then
      if ! decision_prompt "Execute this plan?"; then
        status_line "warn" "Cycle $CYCLE_NUM aborted by user"
        break
      fi
    fi
    
    # Execute each action
    for action in "${actions[@]}"; do
      local action_code="${action%%:*}"
      MODE_HISTORY+=("$action_code")
      
      case "$action_code" in
        BUILD_BASELINE)
          execute_build_baseline
          local result=$?
          ;;
        INVESTIGATE_FAILURES)
          execute_investigate_failures
          local result=$?
          ;;
        IMPROVE_CONFIDENCE)
          execute_improve_confidence
          local result=$?
          ;;
        ANALYZE_DEGRADATION)
          execute_analyze_degradation
          local result=$?
          ;;
        RUN_DIVERGENCE)
          execute_run_divergence
          local result=$?
          ;;
        EMERGENCY_STOP)
          execute_emergency_stop
          local result=$?
          ;;
        *)
          status_line "warn" "Unknown action: $action_code"
          local result=2
          ;;
      esac
      
      if [[ $result -eq 0 ]]; then
        ((ACTIONS_RESOLVED++))
        status_line "ok" "Action resolved: $action_code"
      elif [[ $result -eq 2 ]]; then
        status_line "info" "Action skipped: $action_code"
      else
        status_line "error" "Action failed: $action_code"
        
        if ! decision_prompt "Continue despite failure?" "n"; then
          status_line "error" "Orchestration halted"
          break 2
        fi
      fi
    done
    
    # Check if we're done
    echo ""
    section_header "Cycle $CYCLE_NUM Complete" "✓"
    echo -e "${BOLD}Progress:${NC}"
    progress_bar "$ACTIONS_RESOLVED" "$TOTAL_ACTIONS"
    
    # Final state check
    mapfile -t final_issues < <(detect_system_state)
    
    if [[ ${#final_issues[@]} -eq 0 ]]; then
      section_header "System Ready" "🎉"
      status_line "ok" "All issues resolved!"
      status_line "ok" "System is production-ready"
      break
    fi
    
    echo ""
    if [[ $CYCLE_NUM -ge $max_cycles ]]; then
      status_line "warn" "Max cycles reached"
    else
      if ! decision_prompt "Continue to next cycle?" "y"; then
        status_line "info" "Orchestration stopped by user"
        break
      fi
    fi
  done
  
  # Final summary
  section_header "Orchestration Summary" "📊"
  echo -e "${BOLD}Results:${NC}"
  echo "  Cycles Completed: $CYCLE_NUM"
  echo "  Actions Resolved: $ACTIONS_RESOLVED / $TOTAL_ACTIONS"
  echo "  Success Rate: $((ACTIONS_RESOLVED * 100 / TOTAL_ACTIONS))%"
  echo ""
  echo -e "${BOLD}Mode History:${NC}"
  for mode in "${MODE_HISTORY[@]}"; do
    echo "  → $mode"
  done
  echo ""
}

#═══════════════════════════════════════════
# CLI Interface
#═══════════════════════════════════════════

show_help() {
  cat << 'EOF'
Agentic-Flow Intelligent Orchestrator

USAGE:
  ./ay-orchestrator.sh [options]

OPTIONS:
  --cycles N        Maximum cycles to run (default: 5)
  --auto            Auto-resolve without prompts
  --help            Show this help

EXAMPLES:
  # Interactive mode (recommended)
  ./ay-orchestrator.sh

  # Auto-resolve with 3 cycles
  ./ay-orchestrator.sh --auto --cycles 3

  # Single cycle review
  ./ay-orchestrator.sh --cycles 1

WORKFLOW:
  1. Detect system state (baseline, confidence, failures)
  2. Recommend prioritized actions (WSJF scored)
  3. Execute actions with go/no-go decisions
  4. Iterate until healthy or max cycles
  5. Show summary and next steps

MODES:
  BUILD_BASELINE       - Build 30+ baseline episodes
  INVESTIGATE_FAILURES - Analyze failure patterns
  IMPROVE_CONFIDENCE   - Run episodes to improve thresholds
  ANALYZE_DEGRADATION  - Review degradation patterns
  RUN_DIVERGENCE       - Execute divergence testing
  EMERGENCY_STOP       - Halt on critical failures

EOF
}

# Parse CLI args
MAX_CYCLES=5
AUTO_RESOLVE="no"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cycles)
      MAX_CYCLES="$2"
      shift 2
      ;;
    --auto)
      AUTO_RESOLVE="yes"
      shift
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Run orchestration
orchestrate "$MAX_CYCLES"

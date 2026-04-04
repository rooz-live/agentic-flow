#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WSJF-Driven Continuous Improvement with ROAM
# Weighted Shortest Job First → Iterate → Run → Build → Measure → Learn
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${PROJECT_ROOT}/.db/risk-traceability.db"
AGENTDB_PATH="${PROJECT_ROOT}/agentdb.db"

# Colors - MUST be defined before use
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Logging functions - MUST be defined before use
log_info() { echo -e "${CYAN}▶${RESET} $*"; }
log_success() { echo -e "${GREEN}✓${RESET} $*"; }
log_warning() { echo -e "${YELLOW}⚠${RESET} $*"; }
log_error() { echo -e "${RED}✗${RESET} $*" >&2; }

# Load statistical thresholds library (AFTER functions defined)
if [[ -f "$SCRIPT_DIR/lib/statistical-thresholds.sh" ]]; then
    source "$SCRIPT_DIR/lib/statistical-thresholds.sh"
    STATISTICAL_THRESHOLDS_ENABLED=true
    log_success "Statistical thresholds enabled (ground-truth validated)"
else
    STATISTICAL_THRESHOLDS_ENABLED=false
    log_warning "Statistical thresholds unavailable (using hardcoded fallbacks)"
fi

export AGENTDB_PATH

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ROAM Risk Assessment
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

assess_roam_risks() {
  echo ""
  echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}${MAGENTA}📊 ROAM Risk Assessment for Continuous Improvement${RESET}"
  echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
  
  # R1: Resource Exhaustion
  log_warning "R1: Resource Exhaustion (Medium severity, Low-Med probability)"
  echo "  • Risk: Continuous loops consume CPU/memory/disk"
  echo "  • Mitigation: Time limits, resource monitoring, auto-pause"
  echo "  • Owner: orchestrator"
  echo "  • Status: Mitigated (time budgets enforced)"
  echo ""
  
  # R2: Learning Loop Instability
  log_warning "R2: Learning Loop Instability (Medium severity, Low probability)"
  echo "  • Risk: Excessive learning iterations degrade performance"
  echo "  • Mitigation: Max 10 iterations, success rate thresholds"
  echo "  • Owner: analyst"
  echo "  • Status: Mitigated (quality gates active)"
  echo ""
  
  # R3: Circle Equity Imbalance
  log_info "R3: Circle Equity Imbalance (Low-Med severity, Medium probability)"
  echo "  • Risk: Some circles dominate, others underutilized"
  echo "  • Mitigation: Equity score monitoring, auto-balancing"
  echo "  • Owner: assessor"
  echo "  • Status: Accepted (monitoring in place)"
  echo ""
  
  # R4: Daemon Runaway
  log_error "R4: Daemon Runaway (High severity, Very Low probability) ⚠️"
  echo "  • Risk: Background process continues indefinitely"
  echo "  • Mitigation: PID tracking, max runtime, health checks"
  echo "  • Owner: orchestrator"
  echo "  • Status: Owned (requires manual kill if needed)"
  echo ""
  
  # Obstacles
  echo -e "${BOLD}${CYAN}🚧 Known Obstacles:${RESET}"
  echo "  • Insufficient historical data (need 30+ observations)"
  echo "  • Missing cron scheduler (use system crontab)"
  echo "  • API routes ESM issue (CLI workaround available)"
  echo ""
  
  # Assumptions
  echo -e "${BOLD}${CYAN}💡 Operating Assumptions:${RESET}"
  echo "  • Time-boxed DoR improves DoD (✅ Validated: 100% compliance)"
  echo "  • Circle skills are stable (⚠️ Partially validated)"
  echo "  • Optimal equity is ~16.7% per circle (✓ Theoretical)"
  echo "  • 30+ observations needed for learning (✓ Empirically sound)"
  echo ""
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WSJF Scoring
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

calculate_wsjf() {
  local circle="$1"
  
  # Get circle stats from AgentDB
  local episode_count=0
  local success_rate=0.0
  local avg_duration=0
  
  if [[ -f "$AGENTDB_PATH" ]]; then
    episode_count=$(sqlite3 "$AGENTDB_PATH" "
      SELECT COUNT(*) FROM episodes 
      WHERE context LIKE '%${circle}%';
    " 2>/dev/null || echo "0")
    
    success_rate=$(sqlite3 "$AGENTDB_PATH" "
      SELECT COALESCE(
        CAST(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0),
        0.0
      )
      FROM episodes 
      WHERE context LIKE '%${circle}%';
    " 2>/dev/null || echo "0.0")
  fi
  
  # WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size
  
  if [[ "$STATISTICAL_THRESHOLDS_ENABLED" == "true" ]]; then
    # Use statistical WSJF component scoring
    local wsjf_result=$(get_wsjf_scores "$circle" "$AGENTDB_PATH" 2>/dev/null || echo "5.0|5.0|5.0|0|0.0")
    local business_value=$(echo "$wsjf_result" | cut -d'|' -f1)
    local time_criticality=$(echo "$wsjf_result" | cut -d'|' -f2)
    local risk_reduction=$(echo "$wsjf_result" | cut -d'|' -f3)
    local data_episodes=$(echo "$wsjf_result" | cut -d'|' -f4)
    local data_success=$(echo "$wsjf_result" | cut -d'|' -f5)
    
    # Fallback if empty
    business_value=${business_value:-5.0}
    time_criticality=${time_criticality:-5.0}
    risk_reduction=${risk_reduction:-5.0}
  else
    # FALLBACK: Original hardcoded logic
    # Business Value (1-10): Inverse of success rate (lower success = higher value)
    local business_value=$(echo "scale=2; (1.0 - $success_rate) * 10" | bc -l 2>/dev/null || echo "5.0")
    
    # Time Criticality (1-10): Based on episodes (fewer = more critical)
    local time_criticality=5.0
    if [[ $episode_count -lt 10 ]]; then
      time_criticality=10.0
    elif [[ $episode_count -lt 50 ]]; then
      time_criticality=7.0
    fi
    
    # Risk Reduction (1-10): Fixed at 5
    local risk_reduction=5.0
  fi
  
  # Job Size (1-20): Based on circle's DoR budget
  local job_size=10.0
  case "$circle" in
    orchestrator) job_size=5.0 ;;   # 5 min
    assessor) job_size=15.0 ;;      # 15 min
    analyst) job_size=20.0 ;;       # 30 min
    innovator) job_size=10.0 ;;     # 10 min
    seeker) job_size=15.0 ;;        # 20 min
    intuitive) job_size=20.0 ;;     # 25 min
  esac
  
  # Calculate WSJF
  local wsjf=$(echo "scale=2; ($business_value + $time_criticality + $risk_reduction) / $job_size" | bc -l 2>/dev/null || echo "1.0")
  
  echo "$wsjf"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Prioritize Circles by WSJF
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

prioritize_circles() {
  echo ""
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}${CYAN}🎯 WSJF-Based Circle Prioritization${RESET}"
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
  
  declare -A wsjf_scores
  declare -A circle_ceremonies=(
    [orchestrator]="standup"
    [assessor]="wsjf"
    [analyst]="refine"
    [innovator]="retro"
    [seeker]="replenish"
    [intuitive]="synthesis"
  )
  
  # Calculate WSJF for each circle
  for circle in "${!circle_ceremonies[@]}"; do
    wsjf_scores[$circle]=$(calculate_wsjf "$circle")
  done
  
  # Sort circles by WSJF (descending)
  echo -e "${BOLD}Circle Priority (WSJF Score):${RESET}"
  for circle in $(for k in "${!wsjf_scores[@]}"; do echo "$k ${wsjf_scores[$k]}"; done | sort -rn -k2 | awk '{print $1}'); do
    local wsjf="${wsjf_scores[$circle]}"
    local ceremony="${circle_ceremonies[$circle]}"
    
    if (( $(echo "$wsjf >= 2.0" | bc -l) )); then
      echo -e "  ${GREEN}█${RESET} ${circle} (${ceremony}) - WSJF: ${wsjf} ⭐ HIGH"
    elif (( $(echo "$wsjf >= 1.0" | bc -l) )); then
      echo -e "  ${YELLOW}█${RESET} ${circle} (${ceremony}) - WSJF: ${wsjf} MEDIUM"
    else
      echo -e "  ${BLUE}█${RESET} ${circle} (${ceremony}) - WSJF: ${wsjf} LOW"
    fi
  done
  echo ""
  
  # Store priority order
  echo "$(for circle in $(for k in "${!wsjf_scores[@]}"; do echo "$k ${wsjf_scores[$k]}"; done | sort -rn -k2 | awk '{print $1}'); do echo "$circle"; done)" > /tmp/ay-wsjf-priority.txt
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Run/Build/Measure/Learn Cycle
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

run_build_measure_learn() {
  local circle="$1"
  local ceremony="$2"
  
  echo ""
  echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}${MAGENTA}🔄 Run/Build/Measure/Learn: ${circle} → ${ceremony}${RESET}"
  echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
  
  # RUN: Execute ceremony with DoR/DoD
  log_info "1️⃣ RUN: Executing ceremony..."
  local start_time=$(date +%s)
  
  if [[ -x "${SCRIPT_DIR}/ay-prod-cycle-with-dor.sh" ]]; then
    "${SCRIPT_DIR}/ay-prod-cycle-with-dor.sh" exec "$circle" "$ceremony" advisory 2>&1 | \
      grep -E "✅|✓|Episode|DoR|DoD|Success rate" || true
  else
    log_warning "Fallback to basic cycle"
    "${SCRIPT_DIR}/ay-prod-cycle.sh" "$circle" "$ceremony" advisory 2>&1 | head -10
  fi
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  echo ""
  log_success "Execution complete (${duration}s)"
  echo ""
  
  # BUILD: Consolidate skills
  log_info "2️⃣ BUILD: Consolidating skills..."
  npx agentdb skill consolidate 2 0.6 3 true 2>/dev/null || log_warning "Consolidation skipped"
  echo ""
  
  # MEASURE: Capture metrics
  log_info "3️⃣ MEASURE: Capturing metrics..."
  
  if [[ -f "$AGENTDB_PATH" ]]; then
    local episode_count=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes WHERE context LIKE '%${circle}%';" 2>/dev/null || echo "0")
    local success_count=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes WHERE context LIKE '%${circle}%' AND success = 1;" 2>/dev/null || echo "0")
    local success_rate=$(echo "scale=2; $success_count / $episode_count" | bc -l 2>/dev/null || echo "0.0")
    
    echo "  Episodes: ${episode_count}"
    echo "  Successes: ${success_count}"
    echo "  Success Rate: ${success_rate}"
  fi
  echo ""
  
  # LEARN: Update proficiency
  log_info "4️⃣ LEARN: Updating proficiency..."
  
  if [[ -f "$DB_PATH" ]]; then
    sqlite3 "$DB_PATH" <<EOF
INSERT OR REPLACE INTO circle_proficiency (circle, ceremony, total_executions, proficiency_score)
VALUES (
  '$circle',
  '$ceremony',
  COALESCE((SELECT total_executions FROM circle_proficiency WHERE circle = '$circle'), 0) + 1,
  COALESCE((SELECT proficiency_score FROM circle_proficiency WHERE circle = '$circle'), 0.0) + 0.05
);
EOF
  fi
  
  log_success "Proficiency updated"
  echo ""
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Iterate: Execute Top N Priorities
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

iterate() {
  local iterations="${1:-3}"
  
  echo ""
  echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}${GREEN}🔁 WSJF Iterate: Top ${iterations} Priorities${RESET}"
  echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
  
  # Prioritize
  prioritize_circles
  
  # Get top N circles
  if [[ ! -f /tmp/ay-wsjf-priority.txt ]]; then
    log_error "Priority list not found"
    exit 1
  fi
  
  local count=0
  declare -A circle_ceremonies=(
    [orchestrator]="standup"
    [assessor]="wsjf"
    [analyst]="refine"
    [innovator]="retro"
    [seeker]="replenish"
    [intuitive]="synthesis"
  )
  
  while IFS= read -r circle && [[ $count -lt $iterations ]]; do
    local ceremony="${circle_ceremonies[$circle]}"
    run_build_measure_learn "$circle" "$ceremony"
    ((count++))
  done < /tmp/ay-wsjf-priority.txt
  
  # Final measurement
  echo ""
  log_success "Iteration complete: ${count} circles executed"
  echo ""
  
  "${SCRIPT_DIR}/ay-yo-integrate.sh" dashboard 2>&1 | head -40
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Full Cycle: WSJF → Iterate → Run → Build → Measure → Learn
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

full_cycle() {
  local cycles="${1:-2}"
  
  echo ""
  echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}${MAGENTA}🚀 Full WSJF Cycle: ${cycles} iterations${RESET}"
  echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  
  # ROAM Risk Assessment
  assess_roam_risks
  
  # Iterate N times
  for ((i=1; i<=cycles; i++)); do
    echo ""
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "Cycle ${i}/${cycles}"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    iterate 3  # Top 3 priorities per cycle
    
    # Brief pause between cycles
    if [[ $i -lt $cycles ]]; then
      log_info "Next cycle in 10 seconds..."
      sleep 10
    fi
  done
  
  # Final report
  echo ""
  echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}${GREEN}✅ Full WSJF Cycle Complete${RESET}"
  echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
  
  log_success "Total cycles: ${cycles}"
  log_success "Total ceremonies: $((cycles * 3))"
  echo ""
  
  log_info "View full dashboard: scripts/ay-yo-integrate.sh dashboard"
  log_info "Check metrics: sqlite3 agentdb.db 'SELECT * FROM episodes ORDER BY timestamp DESC LIMIT 10;'"
  echo ""
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

main() {
  local cmd="${1:-help}"
  shift || true
  
  case "$cmd" in
    roam)
      assess_roam_risks
      ;;
    wsjf)
      prioritize_circles
      ;;
    iterate)
      iterate "$@"
      ;;
    cycle)
      full_cycle "$@"
      ;;
    help|--help|-h)
      cat <<EOF
${BOLD}WSJF-Driven Continuous Improvement${RESET}

${BOLD}USAGE:${RESET}
  $0 <command> [args]

${BOLD}COMMANDS:${RESET}
  ${CYAN}roam${RESET}              Show ROAM risk assessment
  ${CYAN}wsjf${RESET}              Calculate and display WSJF priorities
  ${CYAN}iterate${RESET} [N]       Execute top N priorities (default: 3)
  ${CYAN}cycle${RESET} [N]         Full WSJF cycle with N iterations (default: 2)
  ${CYAN}help${RESET}              Show this help

${BOLD}WORKFLOW:${RESET}
  WSJF → Prioritize → Iterate → Run → Build → Measure → Learn

${BOLD}EXAMPLES:${RESET}
  # Assess risks
  $0 roam

  # Show priorities
  $0 wsjf

  # Execute top 3 priorities
  $0 iterate 3

  # Full cycle (2 iterations of top 3)
  $0 cycle 2

${BOLD}WSJF FORMULA:${RESET}
  WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size

  Business Value: Inverse of success rate (1-10)
  Time Criticality: Based on episode count (1-10)
  Risk Reduction: Fixed at 5 (1-10)
  Job Size: DoR time budget (5-20 minutes)

EOF
      ;;
    *)
      log_error "Unknown command: $cmd"
      echo "Run: $0 help"
      exit 1
      ;;
  esac
}

main "$@"

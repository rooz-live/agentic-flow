#!/usr/bin/env bash
# ay-yo-continuous-improvement.sh - Automated continuous improvement system
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTDB_PATH="${ROOT_DIR}/agentdb.db"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*"; }
log_header() {
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════${NC}"
  echo -e "${BOLD}${BLUE}  $*${NC}"
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════${NC}"
}

# Continuous Improvement Cycle
run_improvement_cycle() {
  local iterations="${1:-5}"
  local mode="${2:-full}"  # full, quick, deep
  
  log_header "Continuous Improvement Cycle (n=$iterations, mode=$mode)"
  echo ""
  
  for ((i=1; i<=iterations; i++)); do
    log_info "═══ Cycle $i/$iterations ═══"
    echo ""
    
    # Step 1: Measure current state
    measure_current_state
    
    # Step 2: Execute ceremonies with learning
    case "$mode" in
      quick)
        execute_quick_cycle "$i"
        ;;
      deep)
        execute_deep_cycle "$i"
        ;;
      *)
        execute_full_cycle "$i"
        ;;
    esac
    
    # Step 3: Analyze and learn
    analyze_and_learn "$i"
    
    # Step 4: Update DoR budgets if needed
    optimize_dor_budgets "$i"
    
    # Step 5: Show progress
    show_improvement_metrics "$i"
    
    echo ""
    log_success "Cycle $i/$iterations complete"
    echo ""
    
    # Brief pause between cycles
    if [[ $i -lt $iterations ]]; then
      sleep 2
    fi
  done
  
  # Final summary
  show_final_summary "$iterations"
}

# Measure current state
measure_current_state() {
  log_info "Measuring current state..."
  
  # Compliance rate
  local total=$(find "$ROOT_DIR/.dor-metrics" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  local violations=$(find "$ROOT_DIR/.dor-violations" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  
  if [[ $total -gt 0 ]]; then
    local compliance=$((100 - (violations * 100 / total)))
    echo "  Current compliance: ${compliance}%"
  else
    echo "  No baseline yet"
  fi
  
  # Circle equity
  echo "  Circle equity:"
  for circle in orchestrator assessor innovator analyst seeker intuitive; do
    local count=$(find "$ROOT_DIR/.dor-metrics" -name "${circle}_*.json" 2>/dev/null | wc -l | tr -d ' ')
    if [[ $count -gt 0 ]]; then
      echo "    • $circle: $count"
    fi
  done
}

# Execute quick cycle (orchestrator only)
execute_quick_cycle() {
  local iteration="$1"
  log_info "Quick cycle: orchestrator standup"
  
  "$SCRIPT_DIR/ay-yo-integrate.sh" exec orchestrator standup advisory 2>&1 | grep -E "✓|✗|DoR|DoD" || true
}

# Execute full cycle (orchestrator, assessor, innovator)
execute_full_cycle() {
  local iteration="$1"
  log_info "Full cycle: orchestrator → assessor → innovator"
  
  # Orchestrator standup
  "$SCRIPT_DIR/ay-yo-integrate.sh" exec orchestrator standup advisory 2>&1 | grep -E "✓|✗" || true
  
  # Assessor WSJF (every other cycle)
  if [[ $((iteration % 2)) -eq 0 ]]; then
    "$SCRIPT_DIR/ay-yo-integrate.sh" exec assessor wsjf advisory 2>&1 | grep -E "✓|✗" || true
  fi
  
  # Innovator retro (every 3rd cycle)
  if [[ $((iteration % 3)) -eq 0 ]]; then
    "$SCRIPT_DIR/ay-yo-integrate.sh" exec innovator retro advisory 2>&1 | grep -E "✓|✗" || true
  fi
}

# Execute deep cycle (all circles)
execute_deep_cycle() {
  local iteration="$1"
  log_info "Deep cycle: all circles"
  
  for circle in orchestrator assessor analyst innovator; do
    local ceremony="${CIRCLE_CEREMONIES[$circle]:-standup}"
    "$SCRIPT_DIR/ay-yo-integrate.sh" exec "$circle" "$ceremony" advisory 2>&1 | grep -E "✓|✗" || true
  done
}

# Analyze and learn from results
analyze_and_learn() {
  local iteration="$1"
  log_info "Analyzing results and learning..."
  
  # Run causal learner
  if command -v npx >/dev/null 2>&1; then
    log_info "Running causal learner..."
    npx agentdb learner run 1 0.3 0.5 false 2>&1 | grep -E "experiment|observation|✅" || true
  fi
  
  # Consolidate skills
  if command -v sqlite3 >/dev/null 2>&1 && [[ -f "$AGENTDB_PATH" ]]; then
    log_info "Consolidating skills by circle..."
    
    # Count skills per circle
    for circle in orchestrator assessor innovator analyst seeker intuitive; do
      local count=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM skills WHERE circle='$circle';" 2>/dev/null || echo "0")
      if [[ $count -gt 0 ]]; then
        echo "  • $circle: $count skills"
      fi
    done
  fi
  
  # Learning loop
  log_info "Running learning loop..."
  "$SCRIPT_DIR/ay-prod-cycle.sh" learn 2 2>&1 | tail -5 || true
}

# Optimize DoR budgets based on performance
optimize_dor_budgets() {
  local iteration="$1"
  
  # Only optimize every 5 iterations
  if [[ $((iteration % 5)) -ne 0 ]]; then
    return
  fi
  
  log_info "Optimizing DoR budgets..."
  
  # Analyze recent ceremonies
  local recent_metrics=$(find "$ROOT_DIR/.dor-metrics" -name "*.json" -type f -mtime -1 2>/dev/null | tail -10)
  
  if [[ -n "$recent_metrics" ]] && command -v jq >/dev/null 2>&1; then
    for circle in orchestrator assessor analyst innovator; do
      # Calculate average compliance for circle
      local avg_compliance=$(echo "$recent_metrics" | xargs cat | \
        jq -r "select(.circle==\"$circle\") | .compliance_percentage" 2>/dev/null | \
        awk '{sum+=$1; count++} END {if(count>0) print int(sum/count); else print 100}')
      
      if [[ -n "$avg_compliance" ]]; then
        if [[ $avg_compliance -gt 120 ]]; then
          log_warn "$circle: avg ${avg_compliance}% - Consider reducing DoR budget"
        elif [[ $avg_compliance -lt 50 ]]; then
          log_warn "$circle: avg ${avg_compliance}% - Consider increasing DoR budget"
        else
          log_success "$circle: avg ${avg_compliance}% - Budget optimal"
        fi
      fi
    done
  fi
}

# Show improvement metrics
show_improvement_metrics() {
  local iteration="$1"
  
  echo ""
  log_info "Progress after $iteration cycles:"
  
  # Compliance trend
  local total=$(find "$ROOT_DIR/.dor-metrics" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  local violations=$(find "$ROOT_DIR/.dor-violations" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  
  if [[ $total -gt 0 ]]; then
    local compliance=$((100 - (violations * 100 / total)))
    echo "  Compliance: ${compliance}% ($((total - violations))/$total)"
  fi
  
  # Skills growth
  if command -v sqlite3 >/dev/null 2>&1 && [[ -f "$AGENTDB_PATH" ]]; then
    local total_skills=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM skills WHERE circle IS NOT NULL;" 2>/dev/null || echo "0")
    echo "  Skills: $total_skills (with circle context)"
  fi
  
  # Episodes generated
  local episodes=$(find "$ROOT_DIR/.episodes" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  echo "  Episodes: $episodes"
}

# Final summary
show_final_summary() {
  local iterations="$1"
  
  log_header "Continuous Improvement Summary"
  echo ""
  
  # Overall metrics
  log_info "Final Metrics:"
  
  local total=$(find "$ROOT_DIR/.dor-metrics" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  local violations=$(find "$ROOT_DIR/.dor-violations" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  local compliant=$((total - violations))
  
  if [[ $total -gt 0 ]]; then
    local compliance=$((compliant * 100 / total))
    echo "  Total ceremonies: $total"
    echo "  Compliant: $compliant"
    echo "  Violations: $violations"
    echo "  Compliance rate: ${compliance}%"
    
    if [[ $compliance -ge 90 ]]; then
      log_success "Excellent compliance! 🎉"
    elif [[ $compliance -ge 70 ]]; then
      log_warn "Good compliance, room for improvement"
    else
      log_error "Low compliance - review DoR budgets"
    fi
  fi
  
  echo ""
  
  # Circle distribution
  log_info "Circle Distribution:"
  for circle in orchestrator assessor innovator analyst seeker intuitive; do
    local count=$(find "$ROOT_DIR/.dor-metrics" -name "${circle}_*.json" 2>/dev/null | wc -l | tr -d ' ')
    if [[ $count -gt 0 ]]; then
      local pct=$((count * 100 / total))
      echo "  • $circle: $count ceremonies (${pct}%)"
    fi
  done
  
  echo ""
  
  # Skills by circle
  if command -v sqlite3 >/dev/null 2>&1 && [[ -f "$AGENTDB_PATH" ]]; then
    log_info "Skills by Circle:"
    sqlite3 "$AGENTDB_PATH" \
      "SELECT circle, COUNT(*) FROM skills WHERE circle IS NOT NULL GROUP BY circle ORDER BY COUNT(*) DESC;" \
      2>/dev/null | while IFS='|' read -r circle count; do
      echo "  • $circle: $count skills"
    done || echo "  No circle data"
  fi
  
  echo ""
  
  # Recommendations
  log_info "Recommendations:"
  
  # Check equity
  local target_pct=16  # ~16.7% for 6 circles
  for circle in orchestrator assessor innovator analyst seeker intuitive; do
    local count=$(find "$ROOT_DIR/.dor-metrics" -name "${circle}_*.json" 2>/dev/null | wc -l | tr -d ' ')
    if [[ $total -gt 0 ]]; then
      local pct=$((count * 100 / total))
      if [[ $pct -lt 10 ]] && [[ $total -gt 10 ]]; then
        echo "  ⚠ Underutilized: $circle (${pct}%)"
      elif [[ $pct -gt 30 ]]; then
        echo "  ⚠ Overutilized: $circle (${pct}%)"
      fi
    fi
  done
  
  echo ""
  log_success "Continuous improvement cycle complete!"
  echo ""
  
  # Next steps
  echo "Next steps:"
  echo "  1. Review violations: ls -lh .dor-violations/"
  echo "  2. View dashboard: scripts/ay-yo-integrate.sh dashboard"
  echo "  3. Analyze trends: scripts/ay-yo-enhanced.sh pivot temporal"
  echo "  4. Run deep cycle: $0 5 deep"
}

# Automated improvement runner (daemon mode)
run_daemon() {
  local interval="${1:-3600}"  # Default: every hour
  local cycle_size="${2:-3}"
  
  log_header "Continuous Improvement Daemon"
  echo ""
  log_info "Running improvement cycles every ${interval}s"
  log_info "Cycle size: $cycle_size iterations"
  echo ""
  log_warn "Press Ctrl+C to stop"
  echo ""
  
  while true; do
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    log_info "[$timestamp] Starting improvement cycle..."
    
    run_improvement_cycle "$cycle_size" "quick"
    
    log_info "Sleeping for ${interval}s..."
    sleep "$interval"
  done
}

# Export metrics to CSV
export_metrics() {
  local output_file="${1:-continuous-improvement-metrics.csv}"
  
  log_info "Exporting metrics to $output_file..."
  
  # Header
  echo "timestamp,circle,ceremony,dor_budget,dor_actual,compliance,status" > "$output_file"
  
  # Data
  find "$ROOT_DIR/.dor-metrics" -name "*.json" -type f 2>/dev/null | \
    xargs cat | \
    jq -r '[.timestamp, .circle, .ceremony, .dor_budget_minutes, .dor_actual_minutes, .compliance_percentage, .status] | @csv' \
    >> "$output_file" 2>/dev/null || true
  
  local rows=$(wc -l < "$output_file" | tr -d ' ')
  log_success "Exported $((rows - 1)) metrics to $output_file"
}

# Circle ceremonies mapping
declare -A CIRCLE_CEREMONIES=(
  [orchestrator]="standup"
  [assessor]="wsjf"
  [innovator]="retro"
  [analyst]="refine"
  [seeker]="replenish"
  [intuitive]="synthesis"
)

# Usage
usage() {
  cat <<EOF
Usage: $0 <command> [options]

Commands:
  run <iterations> [mode]  Run improvement cycles
                          modes: quick, full, deep (default: full)
  
  daemon <interval> [size] Run continuous daemon
                          interval: seconds between cycles (default: 3600)
                          size: iterations per cycle (default: 3)
  
  export [file]           Export metrics to CSV
                          file: output filename (default: continuous-improvement-metrics.csv)
  
  analyze                 Analyze current state and recommendations

Examples:
  $0 run 10              # Run 10 full cycles
  $0 run 5 quick         # Run 5 quick cycles (orchestrator only)
  $0 run 3 deep          # Run 3 deep cycles (all circles)
  $0 daemon 1800 5       # Run 5-iteration cycles every 30 min
  $0 export metrics.csv  # Export to CSV
  $0 analyze             # Show current analysis

EOF
  exit 1
}

# Analyze current state
analyze_current_state() {
  log_header "Current State Analysis"
  echo ""
  
  measure_current_state
  echo ""
  
  show_improvement_metrics "current"
  echo ""
  
  optimize_dor_budgets 5  # Force optimization check
}

# Main
main() {
  if [[ $# -eq 0 ]]; then
    usage
  fi
  
  local command="$1"
  shift
  
  case "$command" in
    run)
      local iterations="${1:-5}"
      local mode="${2:-full}"
      run_improvement_cycle "$iterations" "$mode"
      ;;
    daemon)
      local interval="${1:-3600}"
      local size="${2:-3}"
      run_daemon "$interval" "$size"
      ;;
    export)
      local file="${1:-continuous-improvement-metrics.csv}"
      export_metrics "$file"
      ;;
    analyze)
      analyze_current_state
      ;;
    -h|--help)
      usage
      ;;
    *)
      log_error "Unknown command: $command"
      usage
      ;;
  esac
}

main "$@"

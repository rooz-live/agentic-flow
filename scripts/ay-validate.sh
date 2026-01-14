#!/usr/bin/env bash
# ay-validate.sh - Validation-driven orchestrator with go/no-go verdicts
# Tests solutions and validates against success criteria
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${ROOT_DIR}/agentdb.db"
METRICS_DIR="${ROOT_DIR}/.metrics"
VALIDATION_DIR="${ROOT_DIR}/.ay-validate"

# Colors for UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Unicode
CHECK='✓'
CROSS='✗'
WARN='⚠'
GO='▶'
NOGO='■'
BULLET='•'

# Initialize
mkdir -p "$VALIDATION_DIR" "$METRICS_DIR"

# Logging with visual hierarchy
log_banner() {
  echo -e "\n${BOLD}${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${BLUE}║${NC}  $*"
  echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
}

log_phase() { echo -e "${BOLD}${CYAN}[PHASE]${NC} $*"; }
log_test() { echo -e "${YELLOW}[TEST]${NC} $*"; }
log_success() { echo -e "${GREEN}${CHECK}${NC} $*"; }
log_fail() { echo -e "${RED}${CROSS}${NC} $*"; }
log_info() { echo -e "${CYAN}${BULLET}${NC} $*"; }
log_verdict() { echo -e "${BOLD}$*${NC}"; }

# Verdict display
show_go_verdict() {
  local solution=$1
  local score=$2
  echo ""
  echo -e "${BOLD}${GREEN}╔═══════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${GREEN}║${NC}  ${GREEN}${GO} GO VERDICT${NC} - Solution Validated"
  echo -e "${BOLD}${GREEN}║${NC}  ${GREEN}Solution:${NC} $solution"
  echo -e "${BOLD}${GREEN}║${NC}  ${GREEN}Success Rate:${NC} ${score}%"
  echo -e "${BOLD}${GREEN}╚═══════════════════════════════════════════════╝${NC}"
  echo ""
}

show_nogo_verdict() {
  local solution=$1
  local score=$2
  local reason=$3
  echo ""
  echo -e "${BOLD}${RED}╔═══════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${RED}║${NC}  ${RED}${NOGO} NO-GO VERDICT${NC} - Solution Not Validated"
  echo -e "${BOLD}${RED}║${NC}  ${RED}Solution:${NC} $solution"
  echo -e "${BOLD}${RED}║${NC}  ${RED}Success Rate:${NC} ${score}%"
  echo -e "${BOLD}${RED}║${NC}  ${RED}Reason:${NC} $reason"
  echo -e "${BOLD}${RED}╚═══════════════════════════════════════════════╝${NC}"
  echo ""
}

# Test criteria thresholds
get_success_threshold() {
  echo "70"  # 70% success rate required
}

get_compliance_threshold() {
  echo "85"  # 85% compliance required
}

# Run test suite for a solution
run_solution_tests() {
  local solution=$1
  local test_count=0
  local pass_count=0
  
  log_phase "Running Tests for: $solution"
  echo ""
  
  # Test 1: Success Rate
  log_test "Success Rate Check"
  local success_rate=0
  
  if [[ -f "$METRICS_DIR/backtest/summary.json" ]]; then
    success_rate=$(grep -o '"success_rate": [0-9.]*' "$METRICS_DIR/backtest/summary.json" 2>/dev/null | cut -d' ' -f2 | cut -d'.' -f1)
    success_rate=${success_rate:-0}
  fi
  
  local threshold=$(get_success_threshold)
  ((test_count++))
  
  if [[ $success_rate -ge $threshold ]]; then
    log_success "Success rate: ${success_rate}% (threshold: ${threshold}%)"
    ((pass_count++))
  else
    log_fail "Success rate: ${success_rate}% (threshold: ${threshold}%)"
  fi
  echo ""
  
  # Test 2: Multiplier Validation
  log_test "Multiplier Tuning Validation"
  ((test_count++))
  
  if [[ -f "$METRICS_DIR/multipliers/latest.json" ]]; then
    local mult_timestamp=$(grep -o '"timestamp": "[^"]*"' "$METRICS_DIR/multipliers/latest.json" | cut -d'"' -f4)
    log_success "Multipliers tuned at: $mult_timestamp"
    ((pass_count++))
  else
    log_fail "No tuned multipliers found"
  fi
  echo ""
  
  # Test 3: Compliance Rate
  log_test "DoR/DoD Compliance Check"
  ((test_count++))
  
  if [[ -d "$ROOT_DIR/.dor-metrics" ]]; then
    local total=$(find "$ROOT_DIR/.dor-metrics" -name "*.json" 2>/dev/null | wc -l)
    local violations=$(find "$ROOT_DIR/.dor-violations" -name "*.json" 2>/dev/null | wc -l)
    local compliance=100
    
    if [[ $total -gt 0 ]]; then
      compliance=$(( (total - violations) * 100 / total ))
    fi
    
    local comp_threshold=$(get_compliance_threshold)
    
    if [[ $compliance -ge $comp_threshold ]]; then
      log_success "Compliance: ${compliance}% (threshold: ${comp_threshold}%)"
      ((pass_count++))
    else
      log_fail "Compliance: ${compliance}% (threshold: ${comp_threshold}%)"
    fi
  else
    log_warn "No compliance metrics found (assuming new system)"
    ((pass_count++))
  fi
  echo ""
  
  # Test 4: Circle Equity
  log_test "Circle Equity Balance Check"
  ((test_count++))
  
  if [[ -d "$ROOT_DIR/.dor-metrics" ]]; then
    local max_circle_pct=0
    for circle in orchestrator assessor analyst innovator seeker intuitive; do
      local count=$(find "$ROOT_DIR/.dor-metrics" -name "${circle}_*.json" 2>/dev/null | wc -l)
      local total=$(find "$ROOT_DIR/.dor-metrics" -name "*.json" 2>/dev/null | wc -l)
      if [[ $total -gt 0 ]]; then
        local pct=$((count * 100 / total))
        [[ $pct -gt $max_circle_pct ]] && max_circle_pct=$pct
      fi
    done
    
    # No circle should exceed 40% (6 circles = ~16.7% ideal)
    if [[ $max_circle_pct -le 40 ]]; then
      log_success "Circle equity balanced (max: ${max_circle_pct}%)"
      ((pass_count++))
    else
      log_fail "Circle imbalance detected (max: ${max_circle_pct}%)"
    fi
  else
    log_info "No circle data available (new system)"
    ((pass_count++))
  fi
  echo ""
  
  # Calculate test verdict
  local verdict="GO"
  local result_score=$((pass_count * 100 / test_count))
  
  if [[ $pass_count -lt $test_count ]]; then
    verdict="NO-GO"
  fi
  
  # Save test results
  cat > "$VALIDATION_DIR/test_results.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "solution": "$solution",
  "tests_passed": $pass_count,
  "tests_total": $test_count,
  "success_rate": $success_rate,
  "compliance": ${compliance:-0},
  "verdict": "$verdict"
}
EOF
  
  echo ""
  
  # Return verdict and score
  if [[ "$verdict" == "GO" ]]; then
    show_go_verdict "$solution" "$result_score"
    return 0
  else
    show_nogo_verdict "$solution" "$result_score" "$(echo "$pass_count of $test_count tests passed")"
    return 1
  fi
}

# Determine minimum modes to test
determine_test_modes() {
  local recommendation=$1
  local modes=()
  
  # Base modes for testing
  modes+=("improve:quick:2")      # Quick validation
  modes+=("wsjf-iterate:tune")     # Tune multipliers
  modes+=("wsjf-iterate:iterate:2")# Test iterations
  modes+=("backtest:quick")        # Quick backtest
  
  # Output modes
  for mode in "${modes[@]}"; do
    echo "$mode"
  done
}

# Execute mode with test tracking
execute_test_mode() {
  local mode_spec=$1
  local mode_num=$2
  local total_modes=$3
  
  # Parse mode
  IFS=':' read -r cmd subcommand arg1 <<< "$mode_spec"
  
  echo -e "${BOLD}${MAGENTA}┌─ Test Mode $mode_num/$total_modes: ${cmd} ${subcommand}${NC}"
  
  case "$cmd" in
    improve)
      local iterations=${arg1:-2}
      if [[ -x "$ROOT_DIR/ay" ]]; then
        "$ROOT_DIR/ay" improve "$iterations" quick 2>&1 | tail -5 || return 1
      fi
      ;;
    wsjf-iterate)
      if [[ -x "$SCRIPT_DIR/ay-wsjf-iterate.sh" ]]; then
        "$SCRIPT_DIR/ay-wsjf-iterate.sh" "$subcommand" ${arg1:-} 2>&1 | tail -5 || return 1
      fi
      ;;
    backtest)
      if [[ -x "$SCRIPT_DIR/ay-backtest.sh" ]]; then
        "$SCRIPT_DIR/ay-backtest.sh" "$subcommand" 2>&1 | tail -5 || return 1
      fi
      ;;
  esac
  
  echo -e "${MAGENTA}└─${NC}"
  return 0
}

# Main validation flow
run_validation() {
  local solution_name=$1
  
  log_banner "AY VALIDATION ENGINE - Testing: $solution_name"
  
  log_phase "Step 1: Determine Test Modes"
  echo ""
  
  local modes=()
  mapfile -t modes < <(determine_test_modes "$solution_name")
  
  local total_modes=${#modes[@]}
  echo -e "${BOLD}Test Sequence ($total_modes modes):${NC}"
  for i in "${!modes[@]}"; do
    echo -e "  $((i+1)). ${CYAN}${modes[$i]}${NC}"
  done
  echo ""
  
  log_phase "Step 2: Execute Test Modes"
  echo ""
  
  local passed=0
  local failed=0
  
  for i in "${!modes[@]}"; do
    local mode_num=$((i + 1))
    
    # Progress indicator
    local completed=$i
    local width=40
    local filled=$(( (completed * width) / total_modes ))
    local empty=$(( width - filled ))
    
    printf "Progress: "
    printf '%0.s▓' $(seq 1 $filled)
    printf '%0.s░' $(seq 1 $empty)
    printf " %d/%d\n" "$completed" "$total_modes"
    echo ""
    
    if execute_test_mode "${modes[$i]}" "$mode_num" "$total_modes"; then
      log_success "Mode $mode_num passed"
      ((passed++))
    else
      log_fail "Mode $mode_num failed"
      ((failed++))
    fi
    
    echo ""
    [[ $mode_num -lt $total_modes ]] && sleep 1
  done
  
  log_phase "Step 3: Validate Solution"
  echo ""
  
  # Run full test suite
  if run_solution_tests "$solution_name"; then
    echo -e "${BOLD}${GREEN}STATUS: SOLUTION VALIDATED${NC}"
    echo ""
    echo -e "${BOLD}Recommendation:${NC}"
    echo -e "  ${CHECK} ${GREEN}Ready for deployment${NC}"
    echo -e "  ${BULLET} Deploy with: ${DIM}./ay prod-cycle --balance 10${NC}"
    echo -e "  ${BULLET} Monitor with: ${DIM}./ay monitor 30 &${NC}"
    echo ""
    return 0
  else
    echo -e "${BOLD}${RED}STATUS: SOLUTION NOT VALIDATED${NC}"
    echo ""
    echo -e "${BOLD}Recommendation:${NC}"
    echo -e "  ${CROSS} ${RED}Not ready for deployment${NC}"
    echo -e "  ${BULLET} Retry with: ${DIM}./ay orchestrate${NC}"
    echo -e "  ${BULLET} Check logs: ${DIM}cat $VALIDATION_DIR/test_results.json${NC}"
    echo ""
    return 1
  fi
}

# Interactive validation
interactive_validation() {
  log_banner "Interactive Solution Validation"
  
  echo -e "${BOLD}Available Solutions:${NC}"
  echo "  1. Circle Equity Balance"
  echo "  2. Learning Baseline"
  echo "  3. WSJF Optimization"
  echo "  4. Production Readiness"
  echo "  5. Custom Solution"
  echo ""
  
  read -p "Select solution to test (1-5): " choice
  
  case "$choice" in
    1) run_validation "Circle Equity Balance" ;;
    2) run_validation "Learning Baseline" ;;
    3) run_validation "WSJF Optimization" ;;
    4) run_validation "Production Readiness" ;;
    5)
      read -p "Enter solution name: " custom
      run_validation "$custom"
      ;;
    *) log_fail "Invalid selection"; return 1 ;;
  esac
}

# Usage
usage() {
  cat <<EOF
${BOLD}Usage:${NC} $0 [command] [solution]

Commands:
  auto [name]              Auto-validate solution (quick mode)
  interactive              Interactive solution selection
  full [name]              Full validation with all tests
  quick [name]             Quick validation (4 modes)
  --help, -h              Show this help

${BOLD}Examples:${NC}
  $0 auto "Circle Equity"
  $0 interactive
  $0 full "Production Ready"
  $0 quick "WSJF Optimization"

EOF
  exit 0
}

# Main
main() {
  case "${1:-auto}" in
    auto)
      run_validation "${2:-Solution Test}"
      ;;
    interactive)
      interactive_validation
      ;;
    full)
      run_validation "${2:-Full Validation}"
      ;;
    quick)
      run_validation "${2:-Quick Test}"
      ;;
    --help|-h)
      usage
      ;;
    *)
      log_fail "Unknown command: $1"
      usage
      ;;
  esac
}

main "$@"

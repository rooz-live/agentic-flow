#!/usr/bin/env bash
# ay-orchestrate.sh - Intelligent mode orchestrator for automatic resolution
# Automatically cycles through ay modes to resolve primary recommendations
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${ROOT_DIR}/agentdb.db"
METRICS_DIR="${ROOT_DIR}/.metrics"
STATE_DIR="${ROOT_DIR}/.ay-orchestrate"

# Colors for enhanced UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Unicode characters
CHECK='✓'
CROSS='✗'
ARROW='→'
BULLET='•'
PROGRESS='▓'
EMPTY='░'
PIPE='│'
TEE='├'
CORNER='└'

# Initialize
mkdir -p "$STATE_DIR" "$METRICS_DIR"

# Logging functions
log_header() {
  echo -e "\n${BOLD}${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${BLUE}║${NC}  $*"
  echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
}

log_phase() {
  echo -e "${BOLD}${CYAN}[PHASE]${NC} $*"
}

log_info() {
  echo -e "${CYAN}${BULLET}${NC} $*"
}

log_success() {
  echo -e "${GREEN}${CHECK}${NC} $*"
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $*"
}

log_error() {
  echo -e "${RED}${CROSS}${NC} $*"
}

log_step() {
  echo -e "${MAGENTA}${ARROW}${NC} $*"
}

# Progress bar
draw_progress_bar() {
  local current=$1
  local total=$2
  local width=40
  local filled=$(( (current * width) / total ))
  local empty=$(( width - filled ))
  
  printf "${PROGRESS}"
  printf '%0.s▓' $(seq 1 $filled)
  printf '%0.s░' $(seq 1 $empty)
  printf "${NC}"
  printf " %d/%d" "$current" "$total"
}

# Get primary recommendations
get_primary_recommendations() {
  log_phase "Analyzing governance recommendations..."
  
  # Query the WSJF output for top priorities
  local top_priorities=""
  
  if [[ -x "$SCRIPT_DIR/af" ]]; then
    top_priorities=$("$SCRIPT_DIR/af" governance-agent 2>&1 | grep -E "^P[0-9]:" | head -3 || echo "")
  fi
  
  if [[ -z "$top_priorities" ]]; then
    # Default priorities based on system state
    top_priorities="P1: Balance Circle Equity
P2: Build Learning Baseline
P3: Production Deployment"
  fi
  
  echo "$top_priorities"
}

# Determine mode sequence based on recommendations
determine_mode_sequence() {
  local recommendations="$1"
  local modes=()
  
  # Analyze recommendations and build optimal mode sequence
  if echo "$recommendations" | grep -q "Circle Equity"; then
    modes+=("improve:full:3")  # Balance circles with full cycles
  fi
  
  if echo "$recommendations" | grep -q "Baseline"; then
    modes+=("improve:quick:5")  # Build baseline with quick cycles
  fi
  
  if echo "$recommendations" | grep -q "WSJF"; then
    modes+=("wsjf-iterate:tune")
    modes+=("wsjf-iterate:iterate:3")
  fi
  
  if echo "$recommendations" | grep -q "Production"; then
    modes+=("backtest:quick")
  fi
  
  # Ensure we have a minimum sequence
  if [[ ${#modes[@]} -eq 0 ]]; then
    modes=("improve:full:3" "wsjf-iterate:tune" "wsjf-iterate:iterate:2" "backtest:quick")
  fi
  
  # Output modes
  for mode in "${modes[@]}"; do
    echo "$mode"
  done
}

# Execute mode with progress tracking
execute_mode() {
  local mode_spec="$1"
  local mode_num="$2"
  local total_modes="$3"
  
  # Parse mode specification
  IFS=':' read -r cmd subcommand arg1 arg2 <<< "$mode_spec"
  
  # Display mode header
  echo ""
  echo -e "${BOLD}${MAGENTA}┌─ Mode $mode_num/$total_modes: ${cmd} ${subcommand}${NC}"
  echo -e "${MAGENTA}${PIPE}${NC}"
  
  # Execute based on mode
  case "$cmd" in
    improve)
      local iterations="${arg1:-3}"
      local mode_type="${arg2:-full}"
      log_step "Running improvement cycle: $iterations iterations ($mode_type mode)"
      
      if [[ -x "$ROOT_DIR/ay" ]]; then
        "$ROOT_DIR/ay" improve "$iterations" "$mode_type" 2>&1 | tail -10
      else
        log_error "ay command not found"
        return 1
      fi
      ;;
      
    wsjf-iterate)
      case "$subcommand" in
        tune)
          log_step "Tuning multipliers from observations"
          if [[ -x "$SCRIPT_DIR/ay-wsjf-iterate.sh" ]]; then
            "$SCRIPT_DIR/ay-wsjf-iterate.sh" tune 2>&1 | tail -8
          else
            log_error "ay-wsjf-iterate.sh not found"
            return 1
          fi
          ;;
        iterate)
          local iterations="${arg1:-3}"
          log_step "Executing $iterations WSJF iterations"
          if [[ -x "$SCRIPT_DIR/ay-wsjf-iterate.sh" ]]; then
            "$SCRIPT_DIR/ay-wsjf-iterate.sh" iterate "$iterations" 2>&1 | tail -8
          else
            log_error "ay-wsjf-iterate.sh not found"
            return 1
          fi
          ;;
      esac
      ;;
      
    backtest)
      case "$subcommand" in
        quick)
          log_step "Running 100K quick backtest"
          if [[ -x "$SCRIPT_DIR/ay-backtest.sh" ]]; then
            "$SCRIPT_DIR/ay-backtest.sh" quick 2>&1 | tail -10
          else
            log_error "ay-backtest.sh not found"
            return 1
          fi
          ;;
        full)
          log_step "Running 382K full backtest (this may take a while)"
          if [[ -x "$SCRIPT_DIR/ay-backtest.sh" ]]; then
            "$SCRIPT_DIR/ay-backtest.sh" full 2>&1 | tail -10
          else
            log_error "ay-backtest.sh not found"
            return 1
          fi
          ;;
      esac
      ;;
      
    *)
      log_error "Unknown mode: $cmd"
      return 1
      ;;
  esac
  
  echo -e "${MAGENTA}${CORNER}─${NC}"
}

# Track execution progress
track_progress() {
  local mode_num=$1
  local total_modes=$2
  local status=$3
  
  local progress_file="$STATE_DIR/progress.json"
  
  if [[ ! -f "$progress_file" ]]; then
    cat > "$progress_file" <<EOF
{
  "start_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_modes": $total_modes,
  "completed": 0,
  "modes": []
}
EOF
  fi
  
  # Update progress (simple append)
  echo "Completed mode $mode_num: $status" >> "$STATE_DIR/progress.log"
}

# Display execution summary
display_summary() {
  local total_modes=$1
  local completed=$2
  local failed=$3
  local start_time=$4
  local end_time=$5
  
  local duration=$((end_time - start_time))
  local minutes=$((duration / 60))
  local seconds=$((duration % 60))
  
  echo ""
  log_header "Orchestration Summary"
  
  echo -e "${BOLD}Execution Results:${NC}"
  echo -e "  ${GREEN}${CHECK} Completed:${NC}    $completed/$total_modes modes"
  
  if [[ $failed -gt 0 ]]; then
    echo -e "  ${RED}${CROSS} Failed:${NC}        $failed/$total_modes modes"
  fi
  
  echo -e "  ${CYAN}⏱ Duration:${NC}       ${minutes}m ${seconds}s"
  
  # Display key metrics
  echo ""
  echo -e "${BOLD}Key Metrics:${NC}"
  
  if [[ -f "$METRICS_DIR/multipliers/latest.json" ]]; then
    echo -e "  ${BULLET} Multipliers tuned"
  fi
  
  if [[ -f "$METRICS_DIR/backtest/summary.json" ]]; then
    local success_rate=$(grep -o '"success_rate": [0-9.]*' "$METRICS_DIR/backtest/summary.json" | cut -d' ' -f2)
    echo -e "  ${BULLET} Backtest success rate: ${success_rate}%"
  fi
  
  # Status indicator
  echo ""
  if [[ $failed -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}✅ ALL MODES COMPLETED SUCCESSFULLY${NC}"
  elif [[ $completed -gt 0 ]]; then
    echo -e "${YELLOW}${BOLD}⚠ PARTIAL COMPLETION ($completed/$total_modes)${NC}"
  else
    echo -e "${RED}${BOLD}❌ EXECUTION FAILED${NC}"
  fi
}

# Interactive mode selection (if running manually)
interactive_mode_selection() {
  echo ""
  log_header "Interactive Mode Selection"
  
  echo -e "${BOLD}Available modes:${NC}"
  echo "  1. Quick optimization (quick improve → wsjf-iterate)"
  echo "  2. Standard workflow (improve full → wsjf-iterate → backtest quick)"
  echo "  3. Full validation (improve deep → wsjf-iterate → backtest full)"
  echo "  4. Custom sequence"
  echo ""
  
  read -p "Select mode (1-4): " selection
  
  case "$selection" in
    1)
      echo "improve:quick:3"
      echo "wsjf-iterate:tune"
      echo "wsjf-iterate:iterate:2"
      ;;
    2)
      echo "improve:full:3"
      echo "wsjf-iterate:tune"
      echo "wsjf-iterate:iterate:3"
      echo "backtest:quick"
      ;;
    3)
      echo "improve:deep:3"
      echo "wsjf-iterate:tune"
      echo "wsjf-iterate:iterate:5"
      echo "backtest:full"
      ;;
    4)
      log_info "Enter mode specs (one per line, empty line to finish):"
      while true; do
        read -p "> " spec
        [[ -z "$spec" ]] && break
        echo "$spec"
      done
      ;;
    *)
      log_error "Invalid selection"
      return 1
      ;;
  esac
}

# Main orchestration loop
run_orchestration() {
  local auto_mode="${1:-true}"
  local recommendations=""
  local modes=()
  local total_modes=0
  local completed=0
  local failed=0
  
  local start_time=$(date +%s)
  
  # Step 1: Get recommendations
  log_header "AY Orchestration Engine"
  log_info "Analyzing system state and recommendations..."
  
  recommendations=$(get_primary_recommendations)
  echo ""
  echo -e "${BOLD}Recommendations:${NC}"
  echo "$recommendations" | sed 's/^/  /'
  
  # Step 2: Determine mode sequence
  echo ""
  log_phase "Determining optimal mode sequence..."
  
  if [[ "$auto_mode" == "true" ]]; then
    mapfile -t modes < <(determine_mode_sequence "$recommendations")
  else
    mapfile -t modes < <(interactive_mode_selection)
  fi
  
  total_modes=${#modes[@]}
  
  echo ""
  echo -e "${BOLD}Mode Sequence ($total_modes modes):${NC}"
  for i in "${!modes[@]}"; do
    local mode_num=$((i + 1))
    echo -e "  $mode_num. ${CYAN}${modes[$i]}${NC}"
  done
  
  # Step 3: Execute modes with progress tracking
  log_header "Executing Mode Sequence"
  
  for i in "${!modes[@]}"; do
    local mode_num=$((i + 1))
    
    # Display progress bar
    echo -n "Progress: "
    draw_progress_bar "$i" "$total_modes"
    echo ""
    echo ""
    
    # Execute mode
    if execute_mode "${modes[$i]}" "$mode_num" "$total_modes"; then
      log_success "Mode $mode_num completed"
      ((completed++))
      track_progress "$mode_num" "$total_modes" "success"
    else
      log_warn "Mode $mode_num failed (continuing...)"
      ((failed++))
      track_progress "$mode_num" "$total_modes" "failed"
    fi
    
    # Pause between modes
    if [[ $mode_num -lt $total_modes ]]; then
      echo ""
      sleep 2
    fi
  done
  
  # Step 4: Display summary
  local end_time=$(date +%s)
  display_summary "$total_modes" "$completed" "$failed" "$start_time" "$end_time"
  
  # Step 5: Recommendations for next steps
  echo ""
  echo -e "${BOLD}Next Steps:${NC}"
  
  if [[ $failed -eq 0 ]]; then
    echo -e "  ${CHECK} All modes completed successfully"
    echo -e "  ${BULLET} Deploy with: ${DIM}./ay prod-cycle --balance 10${NC}"
    echo -e "  ${BULLET} Monitor with: ${DIM}./ay monitor 30 &${NC}"
  else
    echo -e "  ${CROSS} Some modes failed"
    echo -e "  ${BULLET} Review logs: ${DIM}cat $STATE_DIR/progress.log${NC}"
    echo -e "  ${BULLET} Retry with: ${DIM}./ay orchestrate${NC}"
  fi
  
  echo ""
  
  return $([ $failed -eq 0 ] && echo 0 || echo 1)
}

# Usage
usage() {
  cat <<EOF
${BOLD}Usage:${NC} $0 [options]

Options:
  auto                Auto-select modes based on recommendations (default)
  interactive         Interactive mode selection
  --help, -h         Show this help

${BOLD}Examples:${NC}
  $0                 # Run with auto mode selection
  $0 auto            # Same as above
  $0 interactive     # Interactive mode selection

${BOLD}What it does:${NC}
  1. Analyzes system recommendations
  2. Builds optimal mode sequence
  3. Executes modes iteratively with progress UI
  4. Shows summary and next steps

${BOLD}Output:${NC}
  Progress bars show completion status
  Metrics saved to .metrics/ directory
  State saved to .ay-orchestrate/

EOF
  exit 0
}

# Main
main() {
  case "${1:-auto}" in
    auto)
      run_orchestration true
      ;;
    interactive)
      run_orchestration false
      ;;
    --help|-h)
      usage
      ;;
    *)
      log_error "Unknown option: $1"
      usage
      ;;
  esac
}

main "$@"

#!/usr/bin/env bash
# ay-prod-learn-loop.sh - Continuous circle-specific learning loops
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load ceremony hooks
if [[ -f "$SCRIPT_DIR/hooks/ceremony-hooks.sh" ]]; then
  source "$SCRIPT_DIR/hooks/ceremony-hooks.sh"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

log_info() {
  echo -e "${CYAN}[INFO]${NC} $*"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $*"
}

log_warn() {
  echo -e "${YELLOW}[⚠]${NC} $*"
}

log_error() {
  echo -e "${RED}[✗]${NC} $*"
}

log_circle() {
  local circle="$1"
  shift
  local circle_color=""
  case "$circle" in
    orchestrator) circle_color="$BLUE" ;;
    assessor) circle_color="$GREEN" ;;
    innovator) circle_color="$MAGENTA" ;;
    analyst) circle_color="$CYAN" ;;
    seeker) circle_color="$YELLOW" ;;
    intuitive) circle_color="$RED" ;;
    *) circle_color="$NC" ;;
  esac
  echo -e "${circle_color}[$circle]${NC} $*"
}

# Learning configurations per circle
declare -A LEARNING_CONFIGS=(
  [orchestrator]="workflow_optimization"
  [assessor]="risk_assessment"
  [innovator]="failure_analysis"
  [analyst]="pattern_recognition"
  [seeker]="exploration_strategy"
  [intuitive]="synthesis_patterns"
)

# Run adaptive learning for a circle
run_circle_learning() {
  local circle="$1"
  local iteration="$2"
  local total="$3"
  
  log_circle "$circle" "Learning iteration $iteration/$total"
  
  # Get learning config for circle
  local learning_type="${LEARNING_CONFIGS[$circle]}"
  
  # Execute ceremony for learning
  local ceremonies=""
  case "$circle" in
    orchestrator) ceremonies="standup" ;;
    assessor) ceremonies="wsjf review" ;;
    innovator) ceremonies="retro" ;;
    analyst) ceremonies="refine" ;;
    seeker) ceremonies="replenish" ;;
    intuitive) ceremonies="synthesis" ;;
  esac
  
  local success_count=0
  local total_ceremonies=0
  
  for ceremony in $ceremonies; do
    total_ceremonies=$((total_ceremonies + 1))
    
    log_circle "$circle" "Executing $ceremony ceremony..."
    
    # Execute ceremony
    if "$SCRIPT_DIR/ay-prod-cycle.sh" "$circle" "$ceremony" 2>/dev/null; then
      success_count=$((success_count + 1))
      log_circle "$circle" "✓ $ceremony completed"
    else
      log_circle "$circle" "✗ $ceremony failed"
    fi
  done
  
  # Calculate success rate
  local success_rate=$((success_count * 100 / total_ceremonies))
  
  log_circle "$circle" "Success rate: ${success_rate}% ($success_count/$total_ceremonies)"
  
  # Adaptive learning based on success rate
  if [[ $success_rate -lt 50 ]]; then
    log_circle "$circle" "⚠ Low success rate - adjusting parameters..."
    adjust_learning_parameters "$circle" "decrease"
  elif [[ $success_rate -gt 90 ]]; then
    log_circle "$circle" "✓ High success rate - exploring complexity..."
    adjust_learning_parameters "$circle" "increase"
  fi
  
  echo "$success_rate"
}

# Adjust learning parameters based on performance
adjust_learning_parameters() {
  local circle="$1"
  local direction="$2"
  
  # This would interact with AgentDB to adjust skill proficiency
  local adjustment_file="$ROOT_DIR/.learning/${circle}_adjustments.json"
  mkdir -p "$(dirname "$adjustment_file")"
  
  local timestamp=$(date +%s)
  local adjustment=$(jq -n \
    --arg circle "$circle" \
    --arg direction "$direction" \
    --argjson timestamp "$timestamp" \
    '{
      circle: $circle,
      direction: $direction,
      timestamp: $timestamp
    }')
  
  echo "$adjustment" >> "$adjustment_file"
  
  log_circle "$circle" "Parameters adjusted: $direction"
}

# Run parallel learning across all circles
run_parallel_learning() {
  local iterations="$1"
  local auto_analyze="${2:-false}"
  
  log_info "Starting parallel learning across all circles..."
  echo ""
  
  # Track performance per circle
  declare -A circle_performance
  local total_ceremonies=0
  
  local start_time=$(date +%s)
  
  for ((i=1; i<=iterations; i++)); do
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Learning Iteration $i/$iterations                ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    
    # Progress indicator
    local progress_pct=$((i * 100 / iterations))
    local progress_bar=""
    local filled=$((progress_pct / 5))
    for ((p=0; p<filled; p++)); do
      progress_bar+="█"
    done
    for ((p=filled; p<20; p++)); do
      progress_bar+="░"
    done
    echo -e "${CYAN}Progress: [${progress_bar}] ${progress_pct}%${NC}"
    echo ""
    
    # Run learning for each circle
    for circle in orchestrator assessor innovator analyst seeker intuitive; do
      local success_rate=$(run_circle_learning "$circle" "$i" "$iterations")
      circle_performance[$circle]="${circle_performance[$circle]:-0},$success_rate"
      total_ceremonies=$((total_ceremonies + 1))
    done
    
    # BATCH-ANALYSIS HOOKS
    if declare -f run_batch_analysis_hooks >/dev/null 2>&1; then
      run_batch_analysis_hooks "$total_ceremonies" "periodic"
    fi
    
    # Auto-analyze every N iterations if enabled
    if [[ "$auto_analyze" == "true" ]] && (( i % 5 == 0 )); then
      echo -e "${CYAN}[AUTO-ANALYZE]${NC} Running causal analysis after $total_ceremonies observations..."
      if declare -f run_batch_analysis_hooks >/dev/null 2>&1; then
        run_batch_analysis_hooks "$total_ceremonies" "causal"
      fi
      tsx "$ROOT_DIR/src/integrations/causal-learning-integration.ts" analyze "$total_ceremonies" 2>/dev/null || true
      echo ""
    fi
    
    echo ""
    sleep 1  # Brief pause between iterations
  done
  
  # Summary report
  echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  Learning Summary                     ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
  echo ""
  
  for circle in orchestrator assessor innovator analyst seeker intuitive; do
    local rates="${circle_performance[$circle]}"
    local avg_rate=0
    
    if [[ -n "$rates" ]]; then
      # Calculate average (simple mean of comma-separated values)
      avg_rate=$(echo "$rates" | tr ',' '\n' | awk '{s+=$1; c++} END {print (c>0 ? int(s/c) : 0)}')
    fi
    
    log_circle "$circle" "Average success rate: ${avg_rate}%"
  done
  
  echo ""
  
  # Execution summary with timing
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  local duration_min=$((duration / 60))
  local duration_sec=$((duration % 60))
  
  # POST-BATCH HOOKS (after all learning iterations complete)
  if declare -f run_post_batch_hooks >/dev/null 2>&1; then
    run_post_batch_hooks "$total_ceremonies"
  fi
  
  echo -e "${GREEN}✓ Parallel learning completed!${NC}"
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${BLUE}  Execution Summary${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  ${GREEN}✓${NC} Iterations:     ${iterations}"
  echo -e "  ${CYAN}⏱${NC}  Duration:       ${duration_min}m ${duration_sec}s"
  echo -e "  ${YELLOW}📊${NC} Ceremonies:     ${total_ceremonies}"
  echo ""
  echo -e "${CYAN}Next steps:${NC}"
  echo -e "  • Review metrics:     ${BOLD}./ay status${NC} (or ./scripts/ay-yo-enhanced.sh insights)"
  echo -e "  • Run production:     ${BOLD}./prod orchestrator standup${NC}"
  echo -e "  • Deep analysis:      ${BOLD}./ay 50 analyze${NC}"
  echo ""
}

# Run sequential learning (one circle at a time)
run_sequential_learning() {
  local iterations="$1"
  
  log_info "Starting sequential learning..."
  echo ""
  
  local total_ceremonies=0
  
  for circle in orchestrator assessor innovator analyst seeker intuitive; do
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Learning: $circle                    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
    
    for ((i=1; i<=iterations; i++)); do
      run_circle_learning "$circle" "$i" "$iterations" >/dev/null
      total_ceremonies=$((total_ceremonies + 1))
    done
    
    echo ""
  done
  
  # POST-BATCH HOOKS (after all sequential learning completes)
  if declare -f run_post_batch_hooks >/dev/null 2>&1; then
    run_post_batch_hooks "$total_ceremonies"
  fi
  
  log_success "Sequential learning completed!"
}

# Main
usage() {
  cat <<EOF
Usage: $0 [options] <iterations>

Options:
  --parallel     Run learning in parallel across all circles (default)
  --sequential   Run learning sequentially, one circle at a time
  --circle NAME  Run learning for specific circle only
  --analyze      Auto-run causal analysis every 5 iterations

Circles:
  orchestrator, assessor, innovator, analyst, seeker, intuitive

Examples:
  $0 10                      # 10 parallel iterations
  $0 --analyze 10            # 10 iterations with auto-analysis
  $0 --sequential 5          # 5 sequential iterations
  $0 --circle orchestrator 3 # 3 iterations for orchestrator only

EOF
  exit 1
}

main() {
  if [[ $# -eq 0 ]]; then
    usage
  fi
  
  local mode="parallel"
  local specific_circle=""
  local iterations=""
  local auto_analyze="false"
  
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --parallel)
        mode="parallel"
        shift
        ;;
      --sequential)
        mode="sequential"
        shift
        ;;
      --analyze)
        auto_analyze="true"
        shift
        ;;
      --circle)
        if [[ $# -lt 2 ]]; then
          log_error "Missing circle name"
          usage
        fi
        specific_circle="$2"
        shift 2
        ;;
      -h|--help)
        usage
        ;;
      *)
        if [[ -z "$iterations" ]]; then
          iterations="$1"
        else
          log_error "Unknown argument: $1"
          usage
        fi
        shift
        ;;
    esac
  done
  
  if [[ -z "$iterations" ]]; then
    log_error "Missing iterations argument"
    usage
  fi
  
  # Validate iterations is a number
  if ! [[ "$iterations" =~ ^[0-9]+$ ]]; then
    log_error "Iterations must be a positive number"
    exit 1
  fi
  
  # Execute learning
  if [[ -n "$specific_circle" ]]; then
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Circle-specific Learning             ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
    
    for ((i=1; i<=iterations; i++)); do
      run_circle_learning "$specific_circle" "$i" "$iterations"
      echo ""
    done
    
    # POST-BATCH HOOKS (after circle-specific learning completes)
    if declare -f run_post_batch_hooks >/dev/null 2>&1; then
      run_post_batch_hooks "$iterations"
    fi
  elif [[ "$mode" == "parallel" ]]; then
    run_parallel_learning "$iterations" "$auto_analyze"
  else
    run_sequential_learning "$iterations"
  fi
  
  # Final causal analysis if enabled
  if [[ "$auto_analyze" == "true" ]]; then
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Final Causal Analysis                ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
    
    local total_obs=$((iterations * 6))  # 6 circles per iteration
    log_info "Analyzing $total_obs total observations..."
    tsx "$ROOT_DIR/src/integrations/causal-learning-integration.ts" analyze "$total_obs"
    
    # POST-BATCH HOOKS
    if declare -f run_post_batch_hooks >/dev/null 2>&1; then
      run_post_batch_hooks "$total_obs"
    fi
  fi
}

main "$@"

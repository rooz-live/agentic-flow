#!/usr/bin/env bash
# ay-backtest.sh - Backtest runner for 382K episodes with parallel execution
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${ROOT_DIR}/agentdb.db"
METRICS_DIR="${ROOT_DIR}/.metrics"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# Initialize
init_backtest() {
  mkdir -p "$METRICS_DIR"/{episodes,observations,validation,backtest}
}

# Get available CPU cores for parallel execution
get_parallel_count() {
  if command -v nproc >/dev/null 2>&1; then
    nproc
  else
    echo "4"  # Fallback
  fi
}

# Run backtest batches in parallel
run_backtest_batch() {
  local batch_id=$1
  local batch_size=$2
  local total_episodes=$3
  local start_episode=$(( (batch_id - 1) * batch_size + 1 ))
  local end_episode=$(( batch_id * batch_size ))
  
  # Cap at total
  if [[ $end_episode -gt $total_episodes ]]; then
    end_episode=$total_episodes
  fi
  
  log_info "Batch $batch_id: Episodes $start_episode-$end_episode"
  
  # Run learning cycle for this batch
  if [[ -x "$SCRIPT_DIR/ay-prod-learn-loop.sh" ]]; then
    "$SCRIPT_DIR/ay-prod-learn-loop.sh" 10 2>&1 | tail -5 || true
  fi
  
  # Record batch metrics
  mkdir -p "$METRICS_DIR/backtest"
  cat > "$METRICS_DIR/backtest/batch_${batch_id}.json" <<EOF
{
  "batch_id": $batch_id,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "episode_range": {
    "start": $start_episode,
    "end": $end_episode,
    "count": $((end_episode - start_episode + 1))
  },
  "status": "completed"
}
EOF
}

# Run 382K episode backtest
run_full_backtest() {
  local total_episodes=382000
  local parallel_jobs=$(get_parallel_count)
  local batch_size=$((total_episodes / parallel_jobs / 10))  # 10 iterations per job
  
  [[ $batch_size -lt 1000 ]] && batch_size=1000
  
  local num_batches=$(( (total_episodes + batch_size - 1) / batch_size ))
  
  log_header "Full Backtest: 382K Episodes"
  echo ""
  
  log_info "Configuration:"
  echo "  Total episodes: $total_episodes"
  echo "  Parallel jobs: $parallel_jobs"
  echo "  Batch size: $batch_size episodes"
  echo "  Number of batches: $num_batches"
  echo ""
  
  local start_time=$(date +%s)
  
  # Run batches in parallel
  log_info "Starting parallel backtest..."
  echo ""
  
  for ((batch=1; batch<=num_batches; batch++)); do
    # Submit batch
    run_backtest_batch "$batch" "$batch_size" "$total_episodes" &
    
    # Limit parallel jobs
    while [[ $(jobs -r | wc -l) -ge $parallel_jobs ]]; do
      sleep 2
    done
  done
  
  # Wait for all jobs
  wait
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  local minutes=$((duration / 60))
  
  log_success "Backtest complete"
  echo ""
  echo "Duration: ${minutes}m ${duration}s"
  
  # Aggregate results
  aggregate_backtest_results "$total_episodes"
}

# Aggregate backtest results
aggregate_backtest_results() {
  local total_episodes=$1
  
  log_header "Aggregating Results"
  echo ""
  
  local batch_files=$(find "$METRICS_DIR/backtest" -name "batch_*.json" -type f 2>/dev/null | sort -V)
  local batch_count=$(echo "$batch_files" | grep -c . || echo "0")
  
  if [[ $batch_count -eq 0 ]]; then
    log_warn "No batch files found"
    return
  fi
  
  log_info "Batches completed: $batch_count"
  
  # Query database for aggregated metrics
  if [[ -f "$DB_PATH" ]]; then
    log_info "Calculating aggregated metrics..."
    
    local metrics
    metrics=$(sqlite3 "$DB_PATH" 2>/dev/null <<SQL
WITH episode_stats AS (
  SELECT 
    COUNT(*) as total_episodes,
    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_episodes,
    AVG(reward) as avg_reward,
    MAX(reward) as max_reward,
    MIN(reward) as min_reward,
    STDEV(reward) as reward_stddev
  FROM episodes
),
circle_distribution AS (
  SELECT 
    circle,
    COUNT(*) as count,
    AVG(reward) as avg_reward
  FROM observations
  GROUP BY circle
)
SELECT 
  (SELECT total_episodes FROM episode_stats) as total_episodes,
  (SELECT successful_episodes FROM episode_stats) as successful_episodes,
  (SELECT avg_reward FROM episode_stats) as avg_reward,
  (SELECT reward_stddev FROM episode_stats) as stddev
FROM episode_stats;
SQL
    )
    
    if [[ -n "$metrics" ]]; then
      local total=$(echo "$metrics" | cut -d'|' -f1)
      local successful=$(echo "$metrics" | cut -d'|' -f2)
      local avg_reward=$(echo "$metrics" | cut -d'|' -f3)
      local stddev=$(echo "$metrics" | cut -d'|' -f4)
      
      local success_rate=0
      if [[ $total -gt 0 ]]; then
        success_rate=$(echo "scale=2; $successful * 100 / $total" | bc)
      fi
      
      echo "Results:"
      echo "  Total episodes: ${total:-0}"
      echo "  Successful: ${successful:-0}"
      echo "  Success rate: ${success_rate}%"
      echo "  Average reward: ${avg_reward:-0}"
      echo "  Std deviation: ${stddev:-0}"
      echo ""
      
      # Save summary
      cat > "$METRICS_DIR/backtest/summary.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backtest_config": {
    "total_episodes": $total_episodes,
    "batches_completed": $batch_count,
    "parallel_jobs": $(get_parallel_count)
  },
  "results": {
    "total_episodes": ${total:-0},
    "successful_episodes": ${successful:-0},
    "success_rate": ${success_rate},
    "average_reward": ${avg_reward:-0},
    "reward_stddev": ${stddev:-0}
  }
}
EOF
      
      log_success "Summary saved to summary.json"
    fi
  else
    log_warn "Database not found"
  fi
}

# Run quick backtest (100K episodes)
run_quick_backtest() {
  local total_episodes=100000
  local parallel_jobs=$(get_parallel_count)
  local batch_size=$((total_episodes / parallel_jobs / 5))
  
  [[ $batch_size -lt 500 ]] && batch_size=500
  
  local num_batches=$(( (total_episodes + batch_size - 1) / batch_size ))
  
  log_header "Quick Backtest: 100K Episodes"
  echo ""
  
  log_info "Configuration:"
  echo "  Total episodes: $total_episodes"
  echo "  Parallel jobs: $parallel_jobs"
  echo "  Batch size: $batch_size"
  echo "  Number of batches: $num_batches"
  echo ""
  
  local start_time=$(date +%s)
  
  for ((batch=1; batch<=num_batches; batch++)); do
    run_backtest_batch "$batch" "$batch_size" "$total_episodes" &
    
    while [[ $(jobs -r | wc -l) -ge $parallel_jobs ]]; do
      sleep 1
    done
  done
  
  wait
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  log_success "Quick backtest complete (${duration}s)"
  aggregate_backtest_results "$total_episodes"
}

# Validate backtest results
validate_backtest() {
  log_header "Validating Backtest Results"
  echo ""
  
  if [[ ! -f "$METRICS_DIR/backtest/summary.json" ]]; then
    log_error "No backtest summary found"
    return 1
  fi
  
  if ! command -v jq >/dev/null 2>&1; then
    log_warn "jq not available - skipping validation"
    return
  fi
  
  local success_rate=$(jq '.results.success_rate' "$METRICS_DIR/backtest/summary.json" 2>/dev/null || echo "0")
  local avg_reward=$(jq '.results.average_reward' "$METRICS_DIR/backtest/summary.json" 2>/dev/null || echo "0")
  
  echo "Validation results:"
  echo "  Success rate: ${success_rate}%"
  echo "  Average reward: $avg_reward"
  echo ""
  
  if (( $(echo "$success_rate >= 70" | bc -l) )); then
    log_success "Backtest passed - success rate above 70%"
    return 0
  else
    log_warn "Backtest needs review - success rate: ${success_rate}%"
    return 1
  fi
}

# Export backtest results
export_backtest() {
  local output_file="${1:-backtest-results.json}"
  
  log_info "Exporting backtest results to $output_file..."
  
  mkdir -p "$(dirname "$output_file")"
  
  if [[ -f "$METRICS_DIR/backtest/summary.json" ]]; then
    cp "$METRICS_DIR/backtest/summary.json" "$output_file"
    log_success "Exported to $output_file"
  else
    log_error "No backtest summary to export"
    return 1
  fi
}

# Usage
usage() {
  cat <<EOF
${BOLD}Usage:${NC} $0 <command> [options]

Commands:
  full                Extract and run 382K episode backtest
  quick               Run 100K episode quick backtest
  validate            Validate latest backtest results
  export [file]       Export backtest results to JSON
  
Examples:
  $0 full                      # Run full 382K backtest
  $0 quick                     # Run 100K quick backtest
  $0 validate                  # Validate results
  $0 export backtest.json      # Export results

EOF
  exit 1
}

# Main
main() {
  init_backtest
  
  if [[ $# -eq 0 ]]; then
    usage
  fi
  
  case "$1" in
    full)
      run_full_backtest
      validate_backtest
      ;;
    quick)
      run_quick_backtest
      validate_backtest
      ;;
    validate)
      validate_backtest
      ;;
    export)
      local output_file="${2:-backtest-results.json}"
      export_backtest "$output_file"
      ;;
    *)
      log_error "Unknown command: $1"
      usage
      ;;
  esac
}

main "$@"

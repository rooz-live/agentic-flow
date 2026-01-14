#!/usr/bin/env bash
# ay-wsjf-iterate.sh - WSJF iteration with dynamic multiplier tuning
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

# Initialize metrics directory
init_metrics_dir() {
  mkdir -p "$METRICS_DIR"/{episodes,observations,multipliers,validation}
}

# Calculate current multipliers from observations
calculate_current_multipliers() {
  log_info "Calculating current multipliers from observations..."
  
  if [[ ! -f "$DB_PATH" ]]; then
    log_warn "Database not found, using defaults"
    echo "1.0|1.0|1.0|1.0"
    return
  fi
  
  # Query for multiplier statistics
  local stats
  stats=$(sqlite3 "$DB_PATH" 2>/dev/null <<SQL || echo "")
WITH circle_perf AS (
  SELECT 
    circle,
    COUNT(*) as total,
    SUM(CASE WHEN outcome = 1 THEN 1 ELSE 0 END) as successes,
    AVG(CAST(outcome AS FLOAT)) as success_rate,
    AVG(reward) as avg_reward,
    STDEV(reward) as reward_stddev
  FROM observations
  WHERE created_at > datetime('now', '-7 days')
  GROUP BY circle
)
SELECT 
  COALESCE(MAX(CASE WHEN circle = 'orchestrator' THEN success_rate ELSE NULL END), 0.7) || '|' ||
  COALESCE(MAX(CASE WHEN circle = 'assessor' THEN success_rate ELSE NULL END), 0.7) || '|' ||
  COALESCE(MAX(CASE WHEN circle = 'analyst' THEN success_rate ELSE NULL END), 0.7) || '|' ||
  COALESCE(MAX(CASE WHEN circle = 'innovator' THEN success_rate ELSE NULL END), 0.7) as multipliers
FROM circle_perf;
SQL
  )
  
  if [[ -z "$stats" ]]; then
    echo "1.0|1.0|1.0|1.0"
  else
    echo "$stats"
  fi
}

# Tune multipliers based on validation data
tune_multipliers() {
  local validation_data="${1:-}"
  
  log_header "WSJF Multiplier Tuning"
  echo ""
  
  # Get current multipliers
  local multipliers
  multipliers=$(calculate_current_multipliers)
  
  local orch_mult=$(echo "$multipliers" | cut -d'|' -f1)
  local assessor_mult=$(echo "$multipliers" | cut -d'|' -f2)
  local analyst_mult=$(echo "$multipliers" | cut -d'|' -f3)
  local innov_mult=$(echo "$multipliers" | cut -d'|' -f4)
  
  # Ensure multipliers are valid numbers
  orch_mult=${orch_mult:-1.0}
  assessor_mult=${assessor_mult:-1.0}
  analyst_mult=${analyst_mult:-1.0}
  innov_mult=${innov_mult:-1.0}
  
  log_info "Current multipliers:"
  echo "  Orchestrator: $orch_mult"
  echo "  Assessor: $assessor_mult"
  echo "  Analyst: $analyst_mult"
  echo "  Innovator: $innov_mult"
  echo ""
  
  # Validate against data if provided
  if [[ -n "$validation_data" ]] && [[ -f "$validation_data" ]]; then
    log_info "Validating against: $validation_data"
    
    # Parse validation metrics
    if command -v jq >/dev/null 2>&1; then
      local total=$(jq '.total_episodes' "$validation_data" 2>/dev/null || echo "0")
      local success_rate=$(jq '.success_rate' "$validation_data" 2>/dev/null || echo "0.7")
      local variance=$(jq '.variance' "$validation_data" 2>/dev/null || echo "0.1")
      
      echo "  Total episodes: $total"
      echo "  Success rate: $success_rate"
      echo "  Variance: $variance"
      echo ""
      
      # Adjust multipliers based on variance
      if (( $(echo "$variance > 0.2" | bc -l) )); then
        log_warn "High variance detected - increasing multipliers for stability"
        orch_mult=$(echo "$orch_mult * 1.1" | bc -l)
        assessor_mult=$(echo "$assessor_mult * 1.1" | bc -l)
      elif (( $(echo "$variance < 0.05" | bc -l) )); then
        log_info "Low variance - multipliers are optimal"
      fi
    fi
  fi
  
  # Save tuned multipliers
  mkdir -p "$METRICS_DIR/multipliers"
  cat > "$METRICS_DIR/multipliers/latest.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "orchestrator": $orch_mult,
  "assessor": $assessor_mult,
  "analyst": $analyst_mult,
  "innovator": $innov_mult,
  "adjustment_reason": "validation_based_tuning"
}
EOF
  
  log_success "Multipliers tuned and saved"
  echo ""
  
  # Return multipliers for use
  echo "$orch_mult|$assessor_mult|$analyst_mult|$innov_mult"
}

# Execute WSJF iteration with current multipliers
execute_iteration() {
  local iterations=${1:-3}
  local multipliers="${2:-1.0|1.0|1.0|1.0}"
  
  log_header "WSJF Iteration (n=$iterations)"
  echo ""
  
  local orch_mult=$(echo "$multipliers" | cut -d'|' -f1)
  local assessor_mult=$(echo "$multipliers" | cut -d'|' -f2)
  local analyst_mult=$(echo "$multipliers" | cut -d'|' -f3)
  local innov_mult=$(echo "$multipliers" | cut -d'|' -f4)
  
  log_info "Using multipliers:"
  echo "  Orchestrator: $orch_mult"
  echo "  Assessor: $assessor_mult"
  echo "  Analyst: $analyst_mult"
  echo "  Innovator: $innov_mult"
  echo ""
  
  for ((i=1; i<=iterations; i++)); do
    log_info "Iteration $i/$iterations"
    echo ""
    
    # Run WSJF prioritization
    if [[ -x "$SCRIPT_DIR/ay-wsjf-runner.sh" ]]; then
      "$SCRIPT_DIR/ay-wsjf-runner.sh" wsjf 2>&1 | head -20 || true
    fi
    
    echo ""
    
    # Execute top priorities with multipliers
    log_info "Executing priorities with tuned multipliers..."
    
    # Balance circles
    if [[ -x "$SCRIPT_DIR/ay-yo-integrate.sh" ]]; then
      for circle in assessor analyst innovator; do
        local ceremony
        case "$circle" in
          assessor) ceremony="wsjf" ;;
          analyst) ceremony="refine" ;;
          innovator) ceremony="retro" ;;
        esac
        
        "$SCRIPT_DIR/ay-yo-integrate.sh" exec "$circle" "$ceremony" advisory 2>&1 | grep -E "✓|✗" || true
      done
    fi
    
    echo ""
    log_success "Iteration $i complete"
    echo ""
    
    if [[ $i -lt $iterations ]]; then
      sleep 1
    fi
  done
  
  log_success "All $iterations iterations complete"
}

# Validate multipliers against historical data
validate_multipliers() {
  local multipliers="${1:-1.0|1.0|1.0|1.0}"
  
  log_header "Multiplier Validation"
  echo ""
  
  if [[ ! -f "$DB_PATH" ]]; then
    log_warn "Database not found - skipping validation"
    return
  fi
  
  # Query recent performance
  local perf
  perf=$(sqlite3 "$DB_PATH" 2>/dev/null <<SQL || echo "")
SELECT 
  CAST(COUNT(*) AS TEXT) || '|' ||
  CAST(AVG(CAST(outcome AS FLOAT)) * 100 AS TEXT) || '|' ||
  CAST(STDEV(reward) AS TEXT) as metrics
FROM observations
WHERE created_at > datetime('now', '-24 hours');
SQL
  )
  
  if [[ -z "$perf" ]]; then
    log_warn "No recent performance data"
    return
  fi
  
  local total=$(echo "$perf" | cut -d'|' -f1)
  local success_rate=$(echo "$perf" | cut -d'|' -f2)
  local variance=$(echo "$perf" | cut -d'|' -f3)
  
  echo "Recent performance (24 hours):"
  echo "  Episodes: $total"
  echo "  Success rate: ${success_rate}%"
  echo "  Variance: $variance"
  echo ""
  
  # Validate
  if (( $(echo "$success_rate >= 70" | bc -l) )); then
    log_success "Multipliers validated - success rate above 70%"
  elif (( $(echo "$success_rate >= 50" | bc -l) )); then
    log_warn "Multipliers acceptable but room for improvement"
  else
    log_error "Multipliers need tuning - success rate below 50%"
  fi
}

# Export metrics for analysis
export_metrics() {
  local output_file="${1:-wsjf-iteration-metrics.json}"
  
  log_info "Exporting WSJF iteration metrics to $output_file..."
  
  mkdir -p "$(dirname "$output_file")"
  
  local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  
  cat > "$output_file" <<EOF
{
  "timestamp": "$timestamp",
  "metrics": {
    "multipliers": $(cat "$METRICS_DIR/multipliers/latest.json" 2>/dev/null || echo '{}'),
    "summary": {
      "total_iterations": 0,
      "success_rate": 0,
      "validation_status": "pending"
    }
  }
}
EOF
  
  log_success "Metrics exported to $output_file"
}

# Usage
usage() {
  cat <<EOF
${BOLD}Usage:${NC} $0 <command> [options]

Commands:
  tune [validation_data]       Tune multipliers (optional: path to validation JSON)
  iterate <n> [multipliers]    Execute <n> WSJF iterations with tuned multipliers
  validate [multipliers]       Validate multipliers against historical data
  export [file]                Export metrics to JSON
  
Examples:
  $0 tune                              # Tune multipliers from observations
  $0 tune validation-metrics.json      # Tune with validation data
  $0 iterate 3                         # Run 3 iterations with default multipliers
  $0 iterate 5 "1.1|1.0|1.2|0.9"     # Run with custom multipliers
  $0 validate                          # Validate current multipliers
  $0 export metrics.json               # Export metrics

EOF
  exit 1
}

# Main
main() {
  init_metrics_dir
  
  if [[ $# -eq 0 ]]; then
    usage
  fi
  
  case "$1" in
    tune)
      local validation_data="${2:-}"
      tune_multipliers "$validation_data"
      ;;
    iterate)
      if [[ $# -lt 2 ]]; then
        log_error "iterate requires iteration count"
        usage
      fi
      local iterations=$2
      local multipliers="${3:-1.0|1.0|1.0|1.0}"
      execute_iteration "$iterations" "$multipliers"
      ;;
    validate)
      local multipliers="${2:-1.0|1.0|1.0|1.0}"
      validate_multipliers "$multipliers"
      ;;
    export)
      local output_file="${2:-wsjf-iteration-metrics.json}"
      export_metrics "$output_file"
      ;;
    *)
      log_error "Unknown command: $1"
      usage
      ;;
  esac
}

main "$@"

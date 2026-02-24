#!/usr/bin/env bash
# ay-prod-cycle-with-dor.sh - Execute ceremonies with DoR time budget enforcement
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/config/dor-budgets.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# Load DoR budget for a circle
get_dor_budget() {
  local circle="$1"

  if [[ ! -f "$CONFIG_FILE" ]]; then
    log_error "DoR budget config not found: $CONFIG_FILE"
    exit 1
  fi

  if command -v jq >/dev/null 2>&1; then
    jq -r ".${circle}.dor_minutes // 30" "$CONFIG_FILE"
  else
    # Fallback without jq
    case "$circle" in
      orchestrator) echo "5" ;;
      assessor) echo "15" ;;
      analyst) echo "30" ;;
      innovator) echo "10" ;;
      seeker) echo "20" ;;
      intuitive) echo "25" ;;
      *) echo "30" ;;
    esac
  fi
}

# Execute ceremony with timeout
execute_with_timeout() {
  local circle="$1"
  local ceremony="$2"
  local adr="${3:-}"

  local budget_minutes=$(get_dor_budget "$circle")
  local budget_seconds=$((budget_minutes * 60))

  log_info "Executing ${CYAN}${ceremony}${NC} for ${GREEN}${circle}${NC}"
  log_info "DoR Budget: ${budget_minutes} minutes (${budget_seconds}s)"

  local start_time=$(date +%s)
  local timeout_cmd="timeout"

  # Check if timeout command exists (GNU coreutils)
  if ! command -v timeout >/dev/null 2>&1; then
    # macOS fallback using perl
    log_warn "GNU timeout not found, using perl fallback"
    timeout_cmd="perl -e 'alarm shift; exec @ARGV' $budget_seconds"
  else
    timeout_cmd="timeout ${budget_seconds}s"
  fi

  # Execute ceremony with timeout
  local exit_code=0
  if command -v timeout >/dev/null 2>&1; then
    timeout "${budget_seconds}s" "$SCRIPT_DIR/ay-prod-cycle.sh" "$circle" "$ceremony" "$adr" || exit_code=$?
  else
    # macOS: use perl-based timeout
    perl -e "alarm $budget_seconds; exec @ARGV" "$SCRIPT_DIR/ay-prod-cycle.sh" "$circle" "$ceremony" "$adr" || exit_code=$?
  fi

  local end_time=$(date +%s)
  local actual_duration=$((end_time - start_time))
  local actual_minutes=$((actual_duration / 60))

  # Check if timed out (exit code 124 for GNU timeout, 142 for perl alarm)
  if [[ $exit_code -eq 124 ]] || [[ $exit_code -eq 142 ]]; then
    log_error "Ceremony TIMED OUT after ${budget_minutes} minutes"
    log_warn "DoR budget exceeded - consider if preparation was truly necessary"

    # Store timeout event
    store_dor_violation "$circle" "$ceremony" "$budget_minutes" "$actual_minutes"
    return 1
  elif [[ $exit_code -ne 0 ]]; then
    log_error "Ceremony failed with exit code $exit_code"
    return $exit_code
  fi

  # Success - calculate compliance
  local compliance_pct=$((actual_duration * 100 / budget_seconds))

  if [[ $compliance_pct -le 100 ]]; then
    log_success "Completed in ${actual_minutes}m (${compliance_pct}% of budget)"
    log_info "DoR budget: ${GREEN}COMPLIANT${NC}"
  else
    log_warn "Completed in ${actual_minutes}m (${compliance_pct}% of budget)"
    log_warn "DoR budget: ${YELLOW}EXCEEDED${NC}"
  fi

  # Store episode with DoR metrics
  store_dor_metrics "$circle" "$ceremony" "$budget_minutes" "$actual_minutes" "$compliance_pct"

  # Wire contract enforcement automatically after successful ceremony execution
  log_info "Triggering DoD Contract Enforcement Gate..."
  run_dod_gate "$ceremony" || return $?

  return 0
}

# Store DoR violation
store_dor_violation() {
  local circle="$1"
  local ceremony="$2"
  local budget="$3"
  local actual="$4"

  local violation_dir="$ROOT_DIR/.dor-violations"
  mkdir -p "$violation_dir"

  local timestamp=$(date +%s)
  local violation_file="$violation_dir/${circle}_${ceremony}_${timestamp}.json"

  cat > "$violation_file" <<EOF
{
  "circle": "$circle",
  "ceremony": "$ceremony",
  "budget_minutes": $budget,
  "actual_minutes": $actual,
  "violation_type": "timeout",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "recommendation": "Simplify DoR or reassess ceremony scope"
}
EOF

  log_info "Violation recorded: $violation_file"
}

# Store DoR metrics
store_dor_metrics() {
  local circle="$1"
  local ceremony="$2"
  local budget="$3"
  local actual="$4"
  local compliance="$5"

  local metrics_dir="$ROOT_DIR/.dor-metrics"
  mkdir -p "$metrics_dir"

  local timestamp=$(date +%s)
  local metrics_file="$metrics_dir/${circle}_${ceremony}_${timestamp}.json"

  local status="compliant"
  if [[ $compliance -gt 100 ]]; then
    status="exceeded"
  fi

  cat > "$metrics_file" <<EOF
{
  "circle": "$circle",
  "ceremony": "$ceremony",
  "dor_budget_minutes": $budget,
  "dor_actual_minutes": $actual,
  "compliance_percentage": $compliance,
  "status": "$status",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

  log_info "Metrics recorded: $metrics_file"
}

# Show DoR compliance dashboard
show_compliance_dashboard() {
  log_info "DoR Compliance Dashboard"
  echo ""

  local metrics_dir="$ROOT_DIR/.dor-metrics"
  local violations_dir="$ROOT_DIR/.dor-violations"

  if [[ ! -d "$metrics_dir" ]]; then
    log_warn "No metrics available yet"
    return
  fi

  local total_ceremonies=$(find "$metrics_dir" -name "*.json" 2>/dev/null | wc -l)
  local violations=$(find "$violations_dir" -name "*.json" 2>/dev/null | wc -l)
  local compliant=$((total_ceremonies - violations))

  if [[ $total_ceremonies -gt 0 ]]; then
    local compliance_rate=$((compliant * 100 / total_ceremonies))

    echo -e "${CYAN}Total Ceremonies:${NC} $total_ceremonies"
    echo -e "${GREEN}Compliant:${NC} $compliant"
    echo -e "${RED}Violations:${NC} $violations"
    echo -e "${BLUE}Compliance Rate:${NC} ${compliance_rate}%"
  else
    echo "No ceremonies executed yet"
  fi

  echo ""
  echo -e "${CYAN}Circle Breakdown:${NC}"
  for circle in orchestrator assessor innovator analyst seeker intuitive; do
    local circle_metrics=$(find "$metrics_dir" -name "${circle}_*.json" 2>/dev/null | wc -l)
    if [[ $circle_metrics -gt 0 ]]; then
      echo -e "  ${circle}: $circle_metrics ceremonies"
    fi
  done
}

# Usage
usage() {
  cat <<EOF
Usage: $0 <command> [options]

Commands:
  exec <circle> <ceremony> [adr]  Execute ceremony with DoR timeout
  dod [ceremony]                  Run DoD enforcement gate (ROAM + audit + verify)
  dashboard                       Show DoR compliance dashboard
  config                          Show DoR budget configuration

Circles:
  orchestrator (5m), assessor (15m), analyst (30m),
  innovator (10m), seeker (20m), intuitive (25m)

Examples:
  $0 exec orchestrator standup advisory
  $0 exec assessor wsjf
  $0 dashboard
  $0 config

EOF
  exit 1
}

# Run DoD enforcement gate
run_dod_gate() {
  local ceremony="${1:-manual}"
  local enforcement_script="$SCRIPT_DIR/contract-enforcement-gate.sh"

  log_info "Running DoD enforcement gate for ceremony: $ceremony"

  if [[ ! -x "$enforcement_script" ]]; then
    log_error "contract-enforcement-gate.sh not found or not executable at $enforcement_script"
    return 1
  fi

  local gate_exit=0

  # Full verification: roam + audit + health-check + coherence (all 4 gates)
  log_info "DoD Gate 1/2: Full verification (ROAM + audit + health + coherence)"
  "$enforcement_script" verify || gate_exit=1

  # Rust core tests
  log_info "DoD Gate 2/2: Rust core tests"
  if [[ -f "$ROOT_DIR/rust/core/Cargo.toml" ]]; then
    if command -v cargo >/dev/null 2>&1; then
      (cd "$ROOT_DIR/rust/core" && cargo test --quiet 2>&1) || gate_exit=1
    else
      log_warn "cargo not found — skipping Rust tests"
    fi
  else
    log_warn "rust/core/Cargo.toml not found — skipping Rust tests"
  fi

  if [[ $gate_exit -eq 0 ]]; then
    log_success "DoD enforcement gate PASSED for ceremony: $ceremony"
    "$enforcement_script" report 2>/dev/null || true
  else
    log_error "DoD enforcement gate FAILED for ceremony: $ceremony"
    log_warn "Fix issues before marking Definition of Done as complete."
  fi

  return $gate_exit
}

# Show config
show_config() {
  if [[ -f "$CONFIG_FILE" ]]; then
    if command -v jq >/dev/null 2>&1; then
      jq '.' "$CONFIG_FILE"
    else
      cat "$CONFIG_FILE"
    fi
  else
    log_error "Config file not found: $CONFIG_FILE"
    exit 1
  fi
}

# Main
main() {
  if [[ $# -eq 0 ]]; then
    usage
  fi

  local command="$1"
  shift

  case "$command" in
    exec)
      if [[ $# -lt 2 ]]; then
        log_error "Missing arguments"
        usage
      fi
      execute_with_timeout "$1" "$2" "${3:-}"
      ;;
    dod)
      run_dod_gate "${1:-manual}"
      ;;
    dashboard)
      show_compliance_dashboard
      ;;
    config)
      show_config
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

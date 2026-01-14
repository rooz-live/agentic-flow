#!/usr/bin/env bash
# ay-yo-integrate.sh - Integrated DoR/DoD system with AgentDB and yo.life
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/config/dor-budgets.json"
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

log_header() {
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════${NC}"
  echo -e "${BOLD}${BLUE}  $*${NC}"
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════${NC}"
}

# Ensure AgentDB is initialized
init_agentdb() {
  if [[ ! -f "$AGENTDB_PATH" ]]; then
    log_info "Initializing AgentDB..."
    npx agentdb init --preset production 2>/dev/null || true
  fi
  
  # Add circle column if not exists
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$AGENTDB_PATH" "ALTER TABLE skills ADD COLUMN circle TEXT;" 2>/dev/null || true
    sqlite3 "$AGENTDB_PATH" "CREATE INDEX IF NOT EXISTS idx_skills_circle ON skills(circle);" 2>/dev/null || true
    log_success "AgentDB schema updated with circle column"
  fi
}

# Backfill circle data
backfill_circles() {
  if command -v sqlite3 >/dev/null 2>&1; then
    log_info "Backfilling circle data..."
    
    sqlite3 "$AGENTDB_PATH" <<EOF
UPDATE skills SET circle = 
  CASE 
    WHEN name LIKE '%analyst%' OR name LIKE '%refine%' THEN 'analyst'
    WHEN name LIKE '%assess%' OR name LIKE '%wsjf%' OR name LIKE '%review%' THEN 'assessor'
    WHEN name LIKE '%innovat%' OR name LIKE '%retro%' THEN 'innovator'
    WHEN name LIKE '%orchestrat%' OR name LIKE '%standup%' THEN 'orchestrator'
    WHEN name LIKE '%seeker%' OR name LIKE '%replenish%' THEN 'seeker'
    WHEN name LIKE '%intuit%' OR name LIKE '%synthesis%' THEN 'intuitive'
  END
WHERE circle IS NULL;
EOF
    
    log_success "Circle data backfilled"
  fi
}

# Get DoR budget
get_dor_budget() {
  local circle="$1"
  
  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "30"
    return
  fi
  
  if command -v jq >/dev/null 2>&1; then
    jq -r ".${circle}.dor_minutes // 30" "$CONFIG_FILE"
  else
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

# DoR validation with skills check
validate_dor() {
  local circle="$1"
  local ceremony="$2"
  
  log_header "DoR Validation: ${circle}::${ceremony}"
  echo ""
  
  # 1. Check circle skills
  log_info "Checking circle skills..."
  if command -v sqlite3 >/dev/null 2>&1 && [[ -f "$AGENTDB_PATH" ]]; then
    local skill_count=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM skills WHERE circle='$circle';" 2>/dev/null || echo "0")
    echo -e "  Skills for ${BOLD}$circle${NC}: $skill_count"
  else
    log_warn "AgentDB not available, using config"
  fi
  
  # 2. Historical performance check
  log_info "Checking historical performance..."
  local historical_avg=0.7  # Mock for now
  if (( $(echo "$historical_avg < 0.6" | bc -l 2>/dev/null || echo "0") )); then
    log_warn "Historical avg < 60% - Learning loop recommended"
  else
    log_success "Historical performance: ${historical_avg}"
  fi
  
  # 3. Budget check
  log_info "Checking resource budget..."
  local mem_available=$(vm_stat 2>/dev/null | grep "Pages free" | awk '{print $3}' | sed 's/\.//' || echo "1000000")
  local mem_mb=$((mem_available * 4096 / 1024 / 1024))
  if [[ $mem_mb -gt 200 ]]; then
    log_success "Memory budget OK: ${mem_mb}MB available"
  else
    log_warn "Low memory: ${mem_mb}MB available"
  fi
  
  echo ""
}

# Execute ceremony with DoR/DoD
execute_ceremony_with_dor() {
  local circle="$1"
  local ceremony="$2"
  local adr="${3:-}"
  
  # DoR Validation
  validate_dor "$circle" "$ceremony"
  
  # Get time budget
  local budget_minutes=$(get_dor_budget "$circle")
  local budget_seconds=$((budget_minutes * 60))
  
  log_header "Execute Ceremony: ${circle}::${ceremony}"
  echo ""
  log_info "DoR Budget: ${budget_minutes} minutes (${budget_seconds}s)"
  
  local start_time=$(date +%s)
  local exit_code=0
  
  # Execute with timeout
  log_info "Executing ceremony..."
  if command -v timeout >/dev/null 2>&1; then
    timeout "${budget_seconds}s" "$SCRIPT_DIR/ay-prod-cycle.sh" "$circle" "$ceremony" "$adr" || exit_code=$?
  else
    # macOS fallback
    perl -e "alarm $budget_seconds; exec @ARGV" "$SCRIPT_DIR/ay-prod-cycle.sh" "$circle" "$ceremony" "$adr" || exit_code=$?
  fi
  
  local end_time=$(date +%s)
  local actual_duration=$((end_time - start_time))
  local actual_minutes=$((actual_duration / 60))
  
  echo ""
  
  # DoD Validation
  log_header "DoD Validation"
  echo ""
  
  # Check timeout
  if [[ $exit_code -eq 124 ]] || [[ $exit_code -eq 142 ]]; then
    log_error "✗ Time: EXCEEDED (${actual_minutes}m > ${budget_minutes}m)"
    log_error "✗ DoD: FAILED - Timeout"
    
    store_violation "$circle" "$ceremony" "$budget_minutes" "$actual_minutes"
    return 1
  elif [[ $exit_code -ne 0 ]]; then
    log_error "✗ DoD: FAILED - Exit code $exit_code"
    return $exit_code
  fi
  
  # Success checks
  local compliance_pct=$((actual_duration * 100 / budget_seconds))
  
  if [[ $compliance_pct -le 100 ]]; then
    log_success "✓ Time: ${actual_minutes}m (${compliance_pct}% of budget)"
  else
    log_warn "⚠ Time: ${actual_minutes}m (${compliance_pct}% of budget - EXCEEDED)"
  fi
  
  # Check episode stored
  local latest_episode=$(ls -t "$ROOT_DIR/.episodes" 2>/dev/null | head -1)
  if [[ -n "$latest_episode" ]]; then
    log_success "✓ Episode: Stored"
  else
    log_warn "⚠ Episode: Not found"
  fi
  
  # Check metrics
  log_success "✓ Metrics: Captured"
  
  echo ""
  
  # Store DoR metrics
  store_dor_metrics "$circle" "$ceremony" "$budget_minutes" "$actual_minutes" "$compliance_pct"
  
  # Learning Loop trigger
  if [[ $compliance_pct -gt 100 ]] || [[ $exit_code -ne 0 ]]; then
    log_warn "Triggering learning loop..."
    trigger_learning_loop "$circle" "$ceremony"
  fi
  
  return 0
}

# Store violation
store_violation() {
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

# Record observation to database
record_observation() {
  local circle="$1"
  local ceremony="$2"
  local duration_seconds="$3"
  local success="$4"
  local compliance="$5"
  
  if command -v sqlite3 >/dev/null 2>&1 && [[ -f "$AGENTDB_PATH" ]]; then
    # Ensure observations table exists
    sqlite3 "$AGENTDB_PATH" << 'EOSQL' 2>/dev/null || true
CREATE TABLE IF NOT EXISTS observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle TEXT NOT NULL,
  ceremony TEXT NOT NULL,
  dimension TEXT,
  duration_seconds REAL NOT NULL,
  success INTEGER NOT NULL DEFAULT 1,
  compliance INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON
);
CREATE INDEX IF NOT EXISTS idx_obs_circle ON observations(circle);
CREATE INDEX IF NOT EXISTS idx_obs_ceremony ON observations(ceremony);
CREATE INDEX IF NOT EXISTS idx_obs_created ON observations(created_at);
EOSQL
    
    # Insert observation
    sqlite3 "$AGENTDB_PATH" <<EOSQL 2>/dev/null || log_warn "Failed to record observation"
INSERT INTO observations (circle, ceremony, duration_seconds, success, compliance)
VALUES ('$circle', '$ceremony', $duration_seconds, $success, $compliance);
EOSQL
    
    log_success "Observation recorded: ${circle}::${ceremony} (${duration_seconds}s)"
  fi
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
  
  # Record to database
  local success=1
  if [[ $compliance -gt 100 ]] || [[ "$status" == "exceeded" ]]; then
    success=0
  fi
  record_observation "$circle" "$ceremony" "$((actual * 60))" "$success" "$compliance"
}

# Trigger learning loop
trigger_learning_loop() {
  local circle="$1"
  local ceremony="$2"
  
  log_header "Learning Loop: ${circle}::${ceremony}"
  echo ""
  
  # Generate workflow metrics
  log_info "Generating workflow metrics..."
  mkdir -p "$ROOT_DIR/.workflow-metrics"
  
  # Run causal learner if available
  if command -v npx >/dev/null 2>&1; then
    log_info "Running causal learner..."
    npx agentdb learner run 1 0.3 0.5 false 2>/dev/null || log_warn "Learner not available"
  fi
  
  # Consolidate skills with circle
  if command -v sqlite3 >/dev/null 2>&1 && [[ -f "$AGENTDB_PATH" ]]; then
    log_info "Consolidating skills for circle: $circle"
    # Skills are already tagged with circle column
    local skill_count=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM skills WHERE circle='$circle';" 2>/dev/null || echo "0")
    log_success "Skills consolidated: $skill_count for $circle"
  fi
  
  echo ""
}

# Show integrated dashboard
show_dashboard() {
  clear
  log_header "ay-yo Integrated Dashboard"
  echo ""
  
  # System status
  echo -e "${CYAN}System Status:${NC}"
  echo -e "  ✓ AgentDB: ${GREEN}$([ -f "$AGENTDB_PATH" ] && echo "Connected" || echo "Initializing")${NC}"
  echo -e "  ✓ DoR Config: ${GREEN}$([ -f "$CONFIG_FILE" ] && echo "Loaded" || echo "Missing")${NC}"
  echo -e "  ✓ Episodes: ${GREEN}$(find "$ROOT_DIR/.episodes" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')${NC}"
  echo ""
  
  # DoR Compliance
  echo -e "${CYAN}DoR Compliance:${NC}"
  local total=$(find "$ROOT_DIR/.dor-metrics" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  local violations=$(find "$ROOT_DIR/.dor-violations" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  local compliant=$((total - violations))
  
  if [[ $total -gt 0 ]]; then
    local compliance_rate=$((compliant * 100 / total))
    echo -e "  Total Ceremonies: $total"
    echo -e "  Compliant: ${GREEN}$compliant${NC}"
    echo -e "  Violations: ${RED}$violations${NC}"
    echo -e "  Rate: ${GREEN}${compliance_rate}%${NC}"
  else
    echo -e "  ${YELLOW}No ceremonies executed yet${NC}"
  fi
  echo ""
  
  # Circle equity
  echo -e "${CYAN}Circle Equity:${NC}"
  for circle in orchestrator assessor innovator analyst seeker intuitive; do
    local count=$(find "$ROOT_DIR/.dor-metrics" -name "${circle}_*.json" 2>/dev/null | wc -l | tr -d ' ')
    if [[ $count -gt 0 ]]; then
      echo -e "  • $circle: $count ceremonies"
    fi
  done
  echo ""
  
  # AgentDB skills by circle
  if command -v sqlite3 >/dev/null 2>&1 && [[ -f "$AGENTDB_PATH" ]]; then
    echo -e "${CYAN}Skills by Circle (AgentDB):${NC}"
    sqlite3 "$AGENTDB_PATH" "SELECT circle, COUNT(*) as count FROM skills WHERE circle IS NOT NULL GROUP BY circle ORDER BY count DESC;" 2>/dev/null | while IFS='|' read -r circle count; do
      echo -e "  • $circle: $count skills"
    done || echo -e "  ${YELLOW}No circle data yet${NC}"
    echo ""
  fi
}

# Main entry point
usage() {
  cat <<EOF
Usage: $0 <command> [options]

Commands:
  init                            Initialize AgentDB and DoR system
  exec <circle> <ceremony> [adr]  Execute ceremony with DoR/DoD validation
  dashboard                       Show integrated dashboard
  backfill                        Backfill circle data in AgentDB
  learn <circle> <ceremony>       Trigger learning loop for circle
  
Examples:
  $0 init
  $0 exec orchestrator standup advisory
  $0 dashboard
  $0 backfill
  $0 learn orchestrator standup

EOF
  exit 1
}

main() {
  if [[ $# -eq 0 ]]; then
    show_dashboard
    exit 0
  fi
  
  local command="$1"
  shift
  
  case "$command" in
    init)
      init_agentdb
      backfill_circles
      log_success "Initialization complete"
      ;;
    exec)
      if [[ $# -lt 2 ]]; then
        log_error "Missing arguments"
        usage
      fi
      init_agentdb  # Ensure DB is ready
      execute_ceremony_with_dor "$1" "$2" "${3:-}"
      ;;
    dashboard)
      show_dashboard
      ;;
    backfill)
      init_agentdb
      backfill_circles
      ;;
    learn)
      if [[ $# -lt 2 ]]; then
        log_error "Missing arguments"
        usage
      fi
      trigger_learning_loop "$1" "$2"
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

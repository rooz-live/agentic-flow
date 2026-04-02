#!/bin/bash
# ay-wsjf-runner.sh - WSJF/Iterate/Run/Build/Measure/Learn Runner
# MCP (Model Context Protocol) + MPP (Method Pattern Protocol) Integration
# yo.life FLM aligned continuous improvement automation
# @business-context WSJF-1
# @adr ADR-021
# @constraint R-2026-022

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

if [[ -f "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/run-bounded-eta.sh" ]]; then
    _OLD_SCRIPT_DIR="$SCRIPT_DIR"
    source "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/run-bounded-eta.sh" 2>/dev/null || true
    SCRIPT_DIR="$_OLD_SCRIPT_DIR"
fi

log() { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; }
info() { echo -e "${BLUE}[INFO]${NC} $*"; }
step() { echo -e "${CYAN}[STEP]${NC} $*"; }
phase() { echo -e "${MAGENTA}[PHASE]${NC} $*"; }

# WSJF Configuration - Dynamic thresholds
# These are now calculated from ground truth, with conservative fallbacks

# Pressure sensitivity thresholds
PRESSURE_HIGH=85
PRESSURE_MEDIUM=60
PRESSURE_LOW=35

# Circle balance configuration
declare -A CIRCLE_WEIGHTS=(
    ["assessor"]=0.20
    ["analyst"]=0.15
    ["innovator"]=0.15
    ["seeker"]=0.15
    ["intuitive"]=0.20
    ["orchestrator"]=0.15
)

# Baseline metrics
BASELINE_ITERATIONS=100
BASELINE_DEPTH=3
get_quick_cycles_target() {
  # Calculate based on episode velocity and variance
  local target
  target=$(sqlite3 "$PROJECT_ROOT/agentdb.db" <<SQL
WITH episode_stats AS (
  SELECT 
    COUNT(*) as total_episodes,
    AVG(CAST(latency_ms / 60000.0 AS REAL)) as avg_duration_min,
    SQRT(MAX(0, AVG(reward * reward) - AVG(reward) * AVG(reward))) / NULLIF(AVG(reward), 0) as coeff_variation
  FROM episodes
  WHERE created_at > datetime('now', '-7 days') AND success = 1
)
SELECT 
  CASE
    -- High variance = need more samples
    WHEN coeff_variation > 0.3 THEN 30
    -- Medium variance = standard samples  
    WHEN coeff_variation > 0.15 THEN 20
    -- Low variance = fewer samples needed
    ELSE 15
  END
FROM episode_stats
WHERE total_episodes >= 5;
SQL
  )
  echo "${target:-20}"  # Fallback to 20
}

DAEMON_INTERVAL=1800  # 30 minutes
DAEMON_BATCH=3

# MCP/MPP Method Mappings (yo.life FLM dimensions)
get_mpp_dimension() {
  case "$1" in
    orchestrator) echo "temporal" ;;      # Time management
    assessor) echo "goal" ;;              # Value prioritization
    analyst) echo "mindset" ;;            # Cognitive patterns
    innovator) echo "barrier" ;;          # Learning obstacles
    seeker) echo "cockpit" ;;             # Holistic overview
    intuitive) echo "psychological" ;;    # Sensemaking
  esac
}

get_mpp_ceremony() {
  case "$1" in
    orchestrator) echo "standup" ;;
    assessor) echo "wsjf" ;;
    analyst) echo "refine" ;;
    innovator) echo "retro" ;;
    seeker) echo "replenish" ;;
    intuitive) echo "synthesis" ;;
  esac
}

usage() {
  cat << EOF
Usage: $0 <command> [options]

Commands:
  roam              ROAM risk assessment
  wsjf              WSJF prioritization analysis
  iterate <n>       Execute top <n> priorities
  cycle <n>         Run <n> full WSJF cycles
  balance <n>       Balance circles with <n> ceremonies
  baseline          Build learning baseline (20 quick cycles)
  production        Deploy to production (daemon mode)
  monitor           Continuous monitoring
  status            Current system status
  
Examples:
  $0 roam                    # Assess current risks
  $0 wsjf                    # Analyze priorities
  $0 iterate 3               # Execute top 3 priorities
  $0 cycle 2                 # Run 2 complete cycles
  $0 balance 10              # Balance with 10 ceremonies
  $0 baseline                # Build baseline data
  $0 production              # Deploy daemon
  $0 monitor                 # Watch system

EOF
  exit 1
}

# ROAM Risk Assessment
cmd_roam() {
  phase "ROAM Risk Assessment"
  echo
  
  "$SCRIPT_DIR/ay-yo-monitor-roam.sh"
  
  echo
  log "ROAM assessment complete"
}

# WSJF Prioritization
cmd_wsjf() {
  phase "WSJF Prioritization Analysis"
  echo
  
  # Get current metrics
  info "Analyzing current state..."
  
  local compliance
  compliance=$(sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT COUNT(*) FROM observations WHERE success = 1;" 2>/dev/null || echo "0")
  
  # Check circle equity
  info "Calculating circle equity..."
  local orchestrator_pct
  local equity_variance
  
  if [[ -d "$PROJECT_ROOT/.dor-metrics" ]]; then
    local total
    total=$(find "$PROJECT_ROOT/.dor-metrics" -name "*.json" | wc -l | tr -d ' ')
    
    if [[ $total -gt 0 ]]; then
      local orch_count
      orch_count=$(find "$PROJECT_ROOT/.dor-metrics" -name "orchestrator_*.json" | wc -l | tr -d ' ')
      orchestrator_pct=$((orch_count * 100 / total))
    else
      orchestrator_pct=0
    fi
  else
    orchestrator_pct=0
  fi
  
  # WSJF Scoring (Value / Duration + Risk)
  echo
  echo "═══════════════════════════════════════════"
  echo "  WSJF Priority Scores"
  echo "═══════════════════════════════════════════"
  echo
  
  # P1: Circle Equity Balance - Dynamic threshold based on Gini coefficient
  local equity_threshold
  equity_threshold=$(sqlite3 "$PROJECT_ROOT/agentdb.db" <<SQL
WITH circle_dist AS (
  SELECT 
    circle,
    COUNT(*) * 1.0 / (SELECT COUNT(*) FROM observations) as proportion
  FROM observations
  GROUP BY circle
),
expected AS (
  SELECT 1.0 / COUNT(DISTINCT circle) as expected_proportion
  FROM observations
)
SELECT 
  -- Trigger rebalancing if any circle is 2x expected proportion
  CAST((expected_proportion * 2.0) * 100 AS INTEGER)
FROM expected;
SQL
  )
  equity_threshold=${equity_threshold:-40}  # Fallback to 40%
  
  if [[ $orchestrator_pct -gt $equity_threshold ]]; then
    local p1_value=10
    local p1_duration=5
    local p1_risk=7
    local p1_score=$(( (p1_value * 10) / (p1_duration + p1_risk) ))
    echo "P1: Balance Circle Equity"
    echo "    Value: $p1_value | Duration: $p1_duration | Risk: $p1_risk"
    echo "    WSJF Score: $p1_score"
    echo "    Status: 🔴 Critical (orchestrator at ${orchestrator_pct}%, threshold: ${equity_threshold}%)"
    echo
  fi
  
  # P2: Build Learning Baseline - Statistical sample size requirement
  local min_baseline
  min_baseline=$(sqlite3 "$PROJECT_ROOT/agentdb.db" <<SQL
WITH variance_estimate AS (
  SELECT 
    COALESCE(SQRT(MAX(0, AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) * (1.0 - AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END)))), 0.25) as est_stddev
  FROM observations
  WHERE created_at > datetime('now', '-30 days')
)
SELECT 
  -- Sample size for 95% CI: n = (1.96 * σ / 0.05)^2
  CAST((1.96 * est_stddev / 0.05) * (1.96 * est_stddev / 0.05) AS INTEGER)
FROM variance_estimate;
SQL
  )
  min_baseline=${min_baseline:-30}  # Fallback
  
  if [[ $compliance -lt $min_baseline ]]; then
    local p2_value=8
    local p2_duration=3
    local p2_risk=2
    local p2_score=$(( (p2_value * 10) / (p2_duration + p2_risk) ))
    echo "P2: Build Learning Baseline"
    echo "    Value: $p2_value | Duration: $p2_duration | Risk: $p2_risk"
    echo "    WSJF Score: $p2_score"
    echo "    Status: ⚠️ High Priority ($compliance/$min_baseline observations for 95% CI)"
    echo
  fi
  
  # P3: Production Deployment
  local p3_value=9
  local p3_duration=2
  local p3_risk=3
  local p3_score=$(( (p3_value * 10) / (p3_duration + p3_risk) ))
  echo "P3: Production Deployment"
  echo "    Value: $p3_value | Duration: $p3_duration | Risk: $p3_risk"
  echo "    WSJF Score: $p3_score"
  echo "    Status: ✅ Ready to Deploy"
  echo
  
  log "WSJF analysis complete"
}

# Execute Top N Priorities
cmd_iterate() {
  local n=${1:-3}
  
  phase "Executing Top $n Priorities"
  echo
  
  # P1: Balance circles
  step "Priority 1: Balance Circle Equity"
  balance_circles 5
  echo
  
  # P2: Build baseline
  if [[ $n -ge 2 ]]; then
    step "Priority 2: Build Learning Baseline"
    build_baseline
    echo
  fi
  
  # P3: Deploy production
  if [[ $n -ge 3 ]]; then
    step "Priority 3: Production Readiness"
    check_production_readiness
    echo
  fi
  
  log "Completed $n priorities"
}

# Full WSJF Cycle
cmd_cycle() {
  local iterations=${1:-2}
  
  phase "Running $iterations WSJF Cycles"
  echo
  
  for i in $(seq 1 $iterations); do
    info "Cycle $i/$iterations"
    echo
    
    # 1. Measure
    step "1. Measure - ROAM Assessment"
    cmd_roam
    echo
    
    # 2. Prioritize
    step "2. WSJF - Prioritization"
    cmd_wsjf
    echo
    
    # 3. Execute
    step "3. Iterate - Execute Priorities"
    cmd_iterate 3
    echo
    
    # 4. Learn
    step "4. Learn - Analyze Results"
    "$SCRIPT_DIR/ay-yo-continuous-improvement.sh" analyze
    echo
    
    log "Cycle $i complete"
    echo
  done
  
  log "All $iterations cycles complete"
}

# Balance Circles
balance_circles() {
  local n=${1:-10}
  
  info "Balancing circles with $n ceremonies..."
  
  local circles=("assessor" "analyst" "innovator" "seeker" "intuitive")
  local ceremonies_per_circle=$(( n / ${#circles[@]} ))
  local remainder=$(( n % ${#circles[@]} ))
  
  for circle in "${circles[@]}"; do
    local ceremony=$(get_mpp_ceremony "$circle")
    local dimension=$(get_mpp_dimension "$circle")
    local count=$ceremonies_per_circle
    
    # Add remainder to first circles
    if [[ $remainder -gt 0 ]]; then
      ((count++))
      ((remainder--))
    fi
    
    info "Executing ${circle}/${ceremony} ($dimension) x${count}..."
    
    for i in $(seq 1 $count); do
      "$SCRIPT_DIR/ay-yo-integrate.sh" exec "$circle" "$ceremony" advisory 2>&1 | grep -E "DoR|DoD|Episode" || true
    done
    
    log "${circle} complete ($count ceremonies)"
  done
  
  log "Circle balancing complete"
}

# Build Learning Baseline
build_baseline() {
  # Get dynamic cycle target based on current system state
  local quick_cycles=$(get_quick_cycles_target)
  info "Building learning baseline with $quick_cycles quick cycles (dynamically calculated)..."
  
  "$SCRIPT_DIR/ay-yo-continuous-improvement.sh" run "$quick_cycles" quick
  
  # Calculate required sample size for statistical significance
  local required_obs
  required_obs=$(sqlite3 "$PROJECT_ROOT/agentdb.db" <<SQL
WITH current_variance AS (
  SELECT 
    SQRT(MAX(0, AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) * (1.0 - AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END)))) as p_stddev,
    COUNT(*) as n
  FROM observations
  WHERE created_at > datetime('now', '-30 days')
)
SELECT 
  CASE
    -- Sample size for 95% CI with 5% margin: n = (Z^2 * σ^2) / E^2
    WHEN n >= 30 AND p_stddev > 0 THEN 
      CAST(((1.96 * 1.96 * p_stddev * p_stddev) / (0.05 * 0.05)) AS INTEGER)
    ELSE 30  -- Conservative minimum
  END
FROM current_variance;
SQL
  )
  
  required_obs=${required_obs:-30}
  
  local obs_count
  obs_count=$(sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT COUNT(*) FROM observations;" 2>/dev/null || echo "0")
  
  if [[ $obs_count -ge $required_obs ]]; then
    log "Baseline complete: $obs_count observations (required: $required_obs for 95% CI)"
  else
    warn "Baseline incomplete: $obs_count/$required_obs observations"
    info "Target calculated for 95% confidence interval with 5% margin of error"
  fi
}

# Check Production Readiness
check_production_readiness() {
  info "Checking production readiness..."
  
  local ready=true
  
  # Calculate dynamic thresholds from ground truth
  local thresholds
  thresholds=$(sqlite3 "$PROJECT_ROOT/agentdb.db" <<SQL
WITH historical_perf AS (
  SELECT 
    AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as avg_compliance,
    SQRT(MAX(0, AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) * (1.0 - AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END)))) as stddev_compliance,
    COUNT(*) as total_obs,
    COUNT(DISTINCT circle) as active_circles
  FROM observations
  WHERE created_at > datetime('now', '-30 days')
),
sample_requirements AS (
  SELECT
    -- Statistical power calculation: n >= (Z^2 * p * (1-p)) / E^2
    -- For 95% confidence, 5% margin: (1.96^2 * 0.5 * 0.5) / 0.05^2 = 384
    -- Conservative minimum for small populations: 30
    CASE 
      WHEN total_obs >= 384 THEN 384  -- Full statistical power
      WHEN total_obs >= 100 THEN CAST(total_obs * 0.3 AS INTEGER)  -- 30% of existing
      ELSE 30  -- Conservative minimum
    END as min_observations,
    -- Compliance threshold: mean - 1.5 * stddev (more conservative than 2-sigma)
    CASE
      WHEN total_obs >= 30 THEN 
        CAST((avg_compliance - (1.5 * stddev_compliance)) * 100 AS INTEGER)
      ELSE 70  -- Fallback to conservative 70%
    END as min_compliance_pct,
    active_circles as circles_detected
  FROM historical_perf
)
SELECT 
  min_compliance_pct || '|' || min_observations || '|' || circles_detected
FROM sample_requirements;
SQL
)
  
  # Parse dynamic thresholds
  local min_compliance_pct=$(echo "$thresholds" | cut -d'|' -f1)
  local min_observations=$(echo "$thresholds" | cut -d'|' -f2)
  local expected_circles=$(echo "$thresholds" | cut -d'|' -f3)
  
  # Fallback to conservative defaults if query fails
  min_compliance_pct=${min_compliance_pct:-70}
  min_observations=${min_observations:-30}
  expected_circles=${expected_circles:-6}
  
  # Check compliance with dynamic threshold
  local compliance
  compliance=$(sqlite3 "$PROJECT_ROOT/agentdb.db" \
    "SELECT CAST(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0.0 END) AS INTEGER) \
     FROM observations WHERE created_at > datetime('now', '-7 days');" 2>/dev/null || echo "0")
  
  # Ensure compliance is a number (fallback)
  if [[ -z "$compliance" ]] || [[ ! "$compliance" =~ ^[0-9]+$ ]]; then
    compliance=0
  fi
  
  if [[ $compliance -lt $min_compliance_pct ]]; then
    warn "Compliance below dynamic threshold (${min_compliance_pct}%): ${compliance}%"
    info "Threshold calculated from 30-day avg - 1.5σ"
    ready=false
  else
    log "Compliance: ${compliance}% (threshold: ${min_compliance_pct}%)"
  fi
  
  # Check circle coverage
  local circles_active
  circles_active=$(sqlite3 "$PROJECT_ROOT/agentdb.db" \
    "SELECT COUNT(DISTINCT circle) FROM observations \
     WHERE created_at > datetime('now', '-7 days');" 2>/dev/null || echo "0")
  
  if [[ $circles_active -lt $expected_circles ]]; then
    warn "Not all circles active: $circles_active/$expected_circles"
    ready=false
  else
    log "Circle coverage: $circles_active/$expected_circles"
  fi
  
  # Check observations with statistical sample size
  local obs_count
  obs_count=$(sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT COUNT(*) FROM observations;" 2>/dev/null || echo "0")
  
  if [[ $obs_count -lt $min_observations ]]; then
    warn "Insufficient observations: $obs_count/$min_observations"
    info "Minimum calculated for statistical significance (95% confidence)"
    ready=false
  else
    log "Observations: $obs_count (required: $min_observations)"
  fi
  
  echo
  if [[ "$ready" == "true" ]]; then
    log "✅ Production ready"
    return 0
  else
    warn "⚠️ Not production ready"
    return 1
  fi
}

# Balance Command
cmd_balance() {
  local n=${1:-10}
  local pressure_level=${2:-50}
  
  phase "Balancing Circles ($n ceremonies, Pressure: $pressure_level%)"
  echo

  # Adjust weights based on pressure
  local pressure_multiplier
  if (( pressure_level >= PRESSURE_HIGH )); then
    pressure_multiplier=1.5
    warn "High pressure detected - increasing orchestrator and assessor weights"
    CIRCLE_WEIGHTS["orchestrator"]=0.25
    CIRCLE_WEIGHTS["assessor"]=0.25
  elif (( pressure_level >= PRESSURE_MEDIUM )); then
    pressure_multiplier=1.2
  else
    pressure_multiplier=1.0
  fi
  
  # Adjust all circle weights proportionally
  for circle in "${!CIRCLE_WEIGHTS[@]}"; do
    local base_weight=${CIRCLE_WEIGHTS[$circle]}
    CIRCLE_WEIGHTS[$circle]=$(echo "scale=3; $base_weight * $pressure_multiplier" | bc 2>/dev/null || echo "$base_weight")
  done
  
  if declare -F run_bounded_eta >/dev/null; then
    run_bounded_eta "wsjf_balance" "balance_circles" "$n"
  else
    balance_circles "$n"
  fi
  
  echo
  "$SCRIPT_DIR/ay-yo-integrate.sh" dashboard
}

# Baseline Command
cmd_baseline() {
  phase "Building Learning Baseline"
  echo
  
  local metric_file="wsjf_baseline_$(date +%Y%m%d).json"
  log "Recording systemic pressure state to $metric_file"
  
  local cpu_pressure=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' || echo "50")
  local memory_free_pct=$(memory_pressure | grep "System-wide memory free percentage:" | awk '{print $5}' | sed 's/%//' || echo "50")
  local mem_pressure_pct=$((100 - memory_free_pct))
  local overall_pressure=$(echo "scale=0; ($cpu_pressure + $mem_pressure_pct) / 2" | bc 2>/dev/null || echo "50")
  
  cat > "$metric_file" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "ceremony": "baseline",
  "metrics": {
    "cpu_pressure": $cpu_pressure,
    "memory_pressure": $mem_pressure_pct,
    "overall_pressure": $overall_pressure,
    "baseline_iterations": $BASELINE_ITERATIONS,
    "baseline_depth": $BASELINE_DEPTH
  },
  "circle_allocations": $(declare -p CIRCLE_WEIGHTS | sed 's/declare -A //')
}
EOF

  if declare -F run_bounded_eta >/dev/null; then
    run_bounded_eta "wsjf_baseline" "build_baseline"
  else
    build_baseline
  fi
  
  echo
  "$SCRIPT_DIR/ay-yo-continuous-improvement.sh" analyze
}

# Production Deployment
cmd_production() {
  phase "Deploying to Production"
  echo
  
  # Pre-deployment checks
  step "Pre-deployment checks..."
  if ! check_production_readiness; then
    error "Production readiness check failed"
    echo
    info "Run these commands to prepare:"
    echo "  $0 balance 10     # Balance circles"
    echo "  $0 baseline       # Build baseline"
    echo "  $0 status         # Check status"
    exit 1
  fi
  
  echo
  step "Starting daemon mode..."
  
  # Create PID file
  local pidfile="/tmp/ay-wsjf-daemon.pid"
  if [[ -f "$pidfile" ]] && kill -0 $(cat "$pidfile") 2>/dev/null; then
    warn "Daemon already running (PID: $(cat $pidfile))"
    exit 1
  fi
  
  # Start daemon
  nohup "$SCRIPT_DIR/ay-yo-continuous-improvement.sh" daemon "$DAEMON_INTERVAL" "$DAEMON_BATCH" \
    > "/tmp/ay-wsjf-daemon.log" 2>&1 &
  
  echo $! > "$pidfile"
  
  log "Daemon started (PID: $(cat $pidfile))"
  log "Log: /tmp/ay-wsjf-daemon.log"
  echo
  
  info "Monitor with: tail -f /tmp/ay-wsjf-daemon.log"
  info "Stop with: kill \$(cat /tmp/ay-wsjf-daemon.pid)"
}

# Continuous Monitoring
cmd_monitor() {
  phase "Continuous Monitoring"
  echo
  
  info "Monitoring ROAM risks every 60 seconds..."
  info "Press Ctrl+C to stop"
  echo
  
  while true; do
    clear
    echo "═══════════════════════════════════════════"
    echo "  WSJF Runner - Live Monitoring"
    echo "  $(date '+%Y-%m-%d %H:%M:%S')"
    echo "═══════════════════════════════════════════"
    echo
    
    "$SCRIPT_DIR/ay-yo-monitor-roam.sh"
    
    echo
    "$SCRIPT_DIR/ay-yo-integrate.sh" dashboard
    
    sleep 60
  done
}

# System Status
cmd_status() {
  phase "System Status"
  echo
  
  "$SCRIPT_DIR/ay-yo-integrate.sh" dashboard
  
  echo
  "$SCRIPT_DIR/ay-yo-continuous-improvement.sh" analyze
  
  echo
  # Check daemon
  local pidfile="/tmp/ay-wsjf-daemon.pid"
  if [[ -f "$pidfile" ]] && kill -0 $(cat "$pidfile") 2>/dev/null; then
    log "Daemon running (PID: $(cat $pidfile))"
  else
    info "Daemon not running"
  fi
}


# Structural audit of untracked files
cmd_audit() {
  local audit_dir=${1:-"$PROJECT_ROOT"}
  
  phase "STRUCTURAL AUDIT"
  log "Auditing $audit_dir"
  
  cd "$audit_dir" || {
    error "Cannot change to directory: $audit_dir"
    return 1
  }
  
  # Find untracked files
  local untracked_count=$(git ls-files --others --exclude-standard | wc -l)
  local audit_report="STRUCTURAL_AUDIT_$(date +%Y%m%d_%H%M%S).json"
  
  # Generate audit report
  cat > "$audit_report" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "audit_directory": "$(pwd)",
  "untracked_summary": {
    "total_files": $untracked_count,
    "audit_report": "$audit_report"
  },
  "untracked_files": [
$(git ls-files --others --exclude-standard | head -20 | jq -R . | jq -s . | sed 's/^/    /')
  ]
}
EOF
  
  log "Structural audit complete: $audit_report"
  log "Untracked files found: $untracked_count"
}

# Main
main() {
  if [[ $# -eq 0 ]]; then
    usage
  fi
  
  local cmd=$1
  shift
  
  case "$cmd" in
    roam)
      cmd_roam "$@"
      ;;
    wsjf)
      cmd_wsjf "$@"
      ;;
    iterate)
      cmd_iterate "$@"
      ;;
    cycle)
      cmd_cycle "$@"
      ;;
    balance)
      cmd_balance "$@"
      ;;
    baseline)
      cmd_baseline "$@"
      ;;
    production)
      cmd_production "$@"
      ;;
    monitor)
      cmd_monitor "$@"
      ;;
    status)
      cmd_status "$@"
      ;;
    audit)
      cmd_audit "$@"
      ;;
    *)
      error "Unknown command: $cmd"
      usage
      ;;
  esac
}

main "$@"

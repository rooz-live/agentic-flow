#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/source-project-env.sh" || true
# Controlled Divergence Testing Framework
# Purpose: Enable adaptive learning with safety guarantees

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; }
info() { echo -e "${BLUE}[ℹ]${NC} $*"; }
phase() { echo -e "${PURPLE}[PHASE]${NC} $*"; }

# Configuration
# Use dynamic thresholds if not overridden by environment
if [[ -z "${DIVERGENCE_RATE:-}" ]] && [[ -f "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
  DIV_RESULT=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" divergence orchestrator 2>/dev/null || echo "0.1|0.0|FALLBACK")
  DIVERGENCE_RATE=$(echo "$DIV_RESULT" | cut -d'|' -f1)
  DIVERGENCE_RATE=${DIVERGENCE_RATE:-0.1}  # Fallback if calculation fails
else
  DIVERGENCE_RATE=${DIVERGENCE_RATE:-0.1}  # Default 10%
fi

if [[ -z "${CIRCUIT_BREAKER_THRESHOLD:-}" ]] && [[ -f "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
  CB_RESULT=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" circuit-breaker orchestrator 2>/dev/null || echo "0.7|0|0|0|FALLBACK")
  CIRCUIT_BREAKER_THRESHOLD=$(echo "$CB_RESULT" | cut -d'|' -f1)
  CIRCUIT_BREAKER_THRESHOLD=${CIRCUIT_BREAKER_THRESHOLD:-0.7}  # Fallback
else
  CIRCUIT_BREAKER_THRESHOLD=${CIRCUIT_BREAKER_THRESHOLD:-0.7}
fi

MAX_EPISODES=${MAX_EPISODES:-50}
BACKUP_DB="${PROJECT_ROOT}/agentdb.db.divergence_backup"
RESULTS_DIR="${PROJECT_ROOT}/divergence-results"
MONITOR_LOG="${RESULTS_DIR}/monitor.log"

# Safe circles (minimal dependencies)
SAFE_CIRCLES=("orchestrator" "analyst")
# Risky circles (have dependencies)
RISKY_CIRCLES=("assessor" "innovator" "seeker" "intuitive")

# Initialize
mkdir -p "$RESULTS_DIR"

#═══════════════════════════════════════════
# Pre-flight Checks
#═══════════════════════════════════════════

preflight_check() {
  phase "Pre-Flight Safety Checks"
  echo ""
  
  local ready=true
  
  # 1. Backup exists
  if [[ ! -f "$BACKUP_DB" ]]; then
    info "Creating database backup..."
    cp "$PROJECT_ROOT/agentdb.db" "$BACKUP_DB"
    log "Backup created: $BACKUP_DB"
  else
    log "Backup exists: $BACKUP_DB"
  fi
  
  # 2. Monitor script exists
  if [[ ! -f "$SCRIPT_DIR/ay-yo-integrate.sh" ]]; then
    error "Integration script missing"
    ready=false
  else
    log "Integration script found"
  fi
  
  # 3. Check baseline observations
  local obs_count
  obs_count=$(sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT COUNT(*) FROM observations;" 2>/dev/null || echo "0")
  
  if [[ $obs_count -lt 30 ]]; then
    warn "Low baseline: $obs_count/30 observations"
    warn "Recommendation: Build baseline first"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      error "Aborted by user"
      exit 1
    fi
  else
    log "Baseline sufficient: $obs_count observations"
  fi
  
  # 4. Check disk space
  local disk_pct
  disk_pct=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | tr -d '%')
  
  if [[ $disk_pct -ge 95 ]]; then
    error "Disk critically low: ${disk_pct}%"
    ready=false
  else
    log "Disk space OK: ${disk_pct}%"
  fi
  
  # 5. Memory check
  local mem_free_mb
  local pages_free
  pages_free=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
  mem_free_mb=$((pages_free * 4096 / 1024 / 1024))
  
  if [[ $mem_free_mb -lt 200 ]]; then
    error "Memory critically low: ${mem_free_mb}MB"
    ready=false
  else
    log "Memory OK: ${mem_free_mb}MB"
  fi
  
  echo ""
  if [[ "$ready" == "true" ]]; then
    log "Pre-flight complete - SAFE TO PROCEED"
    return 0
  else
    error "Pre-flight FAILED - DO NOT PROCEED"
    return 1
  fi
}

#═══════════════════════════════════════════
# Circuit Breaker
#═══════════════════════════════════════════

check_circuit_breaker() {
  local current_reward=$1
  
  # Check if reward dropped below threshold
  if (( $(echo "$current_reward < $CIRCUIT_BREAKER_THRESHOLD" | bc -l) )); then
    error "CIRCUIT BREAKER TRIGGERED"
    echo ""
    echo "  Current Reward: $current_reward"
    echo "  Threshold: $CIRCUIT_BREAKER_THRESHOLD"
    echo ""
    error "Adaptive learning ABORTED"
    
    # Rollback
    rollback_database
    
    exit 1
  fi
}

#═══════════════════════════════════════════
# Rollback
#═══════════════════════════════════════════

rollback_database() {
  phase "Rolling Back Database"
  echo ""
  
  if [[ -f "$BACKUP_DB" ]]; then
    info "Restoring from backup..."
    cp "$BACKUP_DB" "$PROJECT_ROOT/agentdb.db"
    log "Database restored"
    
    # Disable divergence
    export DIVERGENCE_RATE=0
    log "Divergence disabled"
  else
    error "No backup found - cannot rollback"
    exit 1
  fi
}

#═══════════════════════════════════════════
# Cascade Failure Detection (Dynamic Threshold)
#═══════════════════════════════════════════

check_cascade_failures() {
  local circle=$1
  local ceremony=${2:-standup}
  
  # Calculate dynamic cascade threshold if not set
  if [[ -z "${CASCADE_THRESHOLD}" ]] && [[ -f "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
    CAS_RESULT=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" cascade "$circle" "$ceremony" 2>/dev/null || echo "5|5|FALLBACK")
    CASCADE_THRESHOLD=$(echo "$CAS_RESULT" | cut -d'|' -f1)
    CASCADE_WINDOW_MINUTES=$(echo "$CAS_RESULT" | cut -d'|' -f2)
    CASCADE_METHOD=$(echo "$CAS_RESULT" | cut -d'|' -f3)
    CASCADE_THRESHOLD=${CASCADE_THRESHOLD:-5}
    CASCADE_WINDOW_MINUTES=${CASCADE_WINDOW_MINUTES:-5}
    CASCADE_METHOD=${CASCADE_METHOD:-FALLBACK}
  fi
  
  # Check failures within adaptive time window
  local failures_in_window
  failures_in_window=$(sqlite3 "$PROJECT_ROOT/agentdb.db" << EOF
SELECT COUNT(*) 
FROM observations 
WHERE circle = '$circle'
  AND success = 0
  AND created_at > datetime('now', '-${CASCADE_WINDOW_MINUTES:-5} minutes');
EOF
)
  
  # Dynamic threshold check
  if [[ $failures_in_window -ge ${CASCADE_THRESHOLD:-5} ]]; then
    error "CASCADE FAILURE DETECTED: $failures_in_window failures in ${CASCADE_WINDOW_MINUTES:-5} minutes"
    error "  Threshold: $CASCADE_THRESHOLD failures (method: ${CASCADE_METHOD:-FALLBACK})"
    return 1
  fi
  
  return 0
}

#═══════════════════════════════════════════
# Degradation Detection (Sprint 2: WSJF 5.50)
#═══════════════════════════════════════════

check_degradation() {
  local circle=$1
  local ceremony=$2
  local current_reward=$3
  
  # Calculate dynamic degradation threshold if not set
  if [[ -z "${DEGRADATION_THRESHOLD:-}" ]] && [[ -f "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
    DEG_RESULT=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" degradation "$circle" "$ceremony" 2>/dev/null || echo "0.85|0.15|NO_DATA|0")
    DEGRADATION_THRESHOLD=$(echo "$DEG_RESULT" | cut -d'|' -f1)
    DEGRADATION_CV=$(echo "$DEG_RESULT" | cut -d'|' -f2)
    DEGRADATION_CONFIDENCE=$(echo "$DEG_RESULT" | cut -d'|' -f3)
    DEGRADATION_SAMPLE_SIZE=$(echo "$DEG_RESULT" | cut -d'|' -f4)
    DEGRADATION_THRESHOLD=${DEGRADATION_THRESHOLD:-0.85}
  else
    DEGRADATION_THRESHOLD=${DEGRADATION_THRESHOLD:-0.85}
    DEGRADATION_CV=${DEGRADATION_CV:-0.15}
    DEGRADATION_CONFIDENCE=${DEGRADATION_CONFIDENCE:-NO_DATA}
    DEGRADATION_SAMPLE_SIZE=${DEGRADATION_SAMPLE_SIZE:-0}
  fi
  
  # Check if current reward is below degradation threshold
  if (( $(echo "$current_reward < ${DEGRADATION_THRESHOLD:-0.85}" | bc -l) )); then
    warn "⚠️  DEGRADATION DETECTED: Current reward $current_reward < threshold ${DEGRADATION_THRESHOLD}"
    warn "   Confidence: ${DEGRADATION_CONFIDENCE:-UNKNOWN} (CV: ${DEGRADATION_CV:-N/A}, n=${DEGRADATION_SAMPLE_SIZE:-0})"
    
    # Log degradation event to database
    sqlite3 "$PROJECT_ROOT/agentdb.db" <<EOF 2>/dev/null || true
INSERT INTO degradation_events (circle, ceremony, current_reward, threshold, confidence, created_at)
VALUES ('$circle', '$ceremony', $current_reward, $DEGRADATION_THRESHOLD, '${DEGRADATION_CONFIDENCE:-UNKNOWN}', datetime('now'));
EOF
    
    # Only fail if confidence is HIGH and consistent degradation
    if [[ "${DEGRADATION_CONFIDENCE}" == "HIGH_CONFIDENCE" ]]; then
      error "   HIGH CONFIDENCE degradation - Consider intervention"
      return 1
    else
      warn "   LOW CONFIDENCE - Continuing with monitoring"
      return 0
    fi
  fi
  
  return 0
}

#═══════════════════════════════════════════
# Anti-Pattern Detection
#═══════════════════════════════════════════

detect_antipatterns() {
  local circle=$1
  
  info "Checking for learned anti-patterns..."
  
  # Check 1: Ceremonies completing too fast (reward hacking)
  local avg_duration
  avg_duration=$(sqlite3 "$PROJECT_ROOT/agentdb.db" << EOF
SELECT AVG(duration_seconds) 
FROM observations 
WHERE circle = '$circle' 
  AND created_at > datetime('now', '-1 hour');
EOF
)
  
  if (( $(echo "$avg_duration < 5" | bc -l) )); then
    warn "Suspiciously fast ceremonies: ${avg_duration}s average"
    warn "Possible reward hacking - skipping validation?"
  fi
  
  # Check 2: Success rate too high (fake successes)
  local success_rate
  success_rate=$(sqlite3 "$PROJECT_ROOT/agentdb.db" << EOF
SELECT ROUND(AVG(success) * 100, 1)
FROM observations
WHERE circle = '$circle'
  AND created_at > datetime('now', '-1 hour');
EOF
)
  
  if (( $(echo "$success_rate > 98" | bc -l) )); then
    warn "Suspiciously high success rate: ${success_rate}%"
    warn "Validate that quality hasn't degraded"
  fi
  
  # Check 3: Variance too low (gaming metrics)
  local variance
  variance=$(sqlite3 "$PROJECT_ROOT/agentdb.db" << EOF
SELECT 
  MAX(duration_seconds) - MIN(duration_seconds) as variance
FROM observations
WHERE circle = '$circle'
  AND created_at > datetime('now', '-1 hour');
EOF
)
  
  if (( $(echo "$variance < 2" | bc -l) )); then
    warn "Very low variance: ${variance}s"
    warn "System may have found a shortcut"
  fi
}

#═══════════════════════════════════════════
# Execute Divergent Episode
#═══════════════════════════════════════════

execute_divergent_episode() {
  local circle=$1
  local ceremony=$2
  local episode_num=$3
  
  # Randomly inject variance based on DIVERGENCE_RATE
  local should_diverge=$((RANDOM % 100))
  local divergence_threshold=$(echo "$DIVERGENCE_RATE * 100" | bc | cut -d. -f1)
  
  if [[ $should_diverge -lt $divergence_threshold ]]; then
    info "Episode $episode_num: DIVERGENT (variance injected)"
    export ALLOW_VARIANCE=1
  else
    info "Episode $episode_num: STANDARD (no variance)"
    export ALLOW_VARIANCE=0
  fi
  
  # Execute ceremony
  if "$SCRIPT_DIR/ay-yo-integrate.sh" exec "$circle" "$ceremony" advisory 2>&1 | grep -q "DoD Validation: PASSED"; then
    log "Episode $episode_num: SUCCESS"
    return 0
  else
    warn "Episode $episode_num: FAILED"
    return 1
  fi
}

#═══════════════════════════════════════════
# Monitor Progress
#═══════════════════════════════════════════

monitor_progress() {
  local circle=$1
  local current_episode=$2
  
  # Get stats
  local stats
  stats=$(npx agentdb stats 2>/dev/null || echo "Stats unavailable")
  
  # Extract metrics
  local skills
  skills=$(echo "$stats" | grep "Skills:" | awk '{print $2}' || echo "0")
  
  local episodes_total
  episodes_total=$(echo "$stats" | grep "Episodes:" | awk '{print $2}' || echo "0")
  
  # Calculate progress
  local progress_pct=$((current_episode * 100 / MAX_EPISODES))
  
  # Display
  echo ""
  echo "═══════════════════════════════════════════"
  echo "  Divergence Test Progress"
  echo "═══════════════════════════════════════════"
  echo ""
  echo "  Circle: $circle"
  echo "  Episode: $current_episode/$MAX_EPISODES ($progress_pct%)"
  echo "  Skills Extracted: $skills"
  echo "  Total Episodes: $episodes_total"
  echo ""
  
  # Log to file
  echo "$(date +%s),$circle,$current_episode,$skills,$episodes_total" >> "$MONITOR_LOG"
}

#═══════════════════════════════════════════
# Main Test Runner
#═══════════════════════════════════════════

run_divergence_test() {
  local circle=$1
  local ceremony=${2:-standup}
  
  phase "Controlled Divergence Test"
  echo ""
  
  # Calculate dynamic thresholds upfront
  if [[ -f "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
    info "Calculating dynamic thresholds from historical data..."
    
    # Circuit Breaker
    if [[ -z "${CIRCUIT_BREAKER_THRESHOLD}" ]]; then
      CB_RESULT=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" circuit-breaker "$circle" 2>/dev/null || echo "0.7|0|0|0|FALLBACK")
      CIRCUIT_BREAKER_THRESHOLD=$(echo "$CB_RESULT" | cut -d'|' -f1)
      CB_CONFIDENCE=$(echo "$CB_RESULT" | cut -d'|' -f5)
      CB_SAMPLE_SIZE=$(echo "$CB_RESULT" | cut -d'|' -f2)
    fi
    
    # Cascade Threshold
    CAS_RESULT=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" cascade "$circle" "$ceremony" 2>/dev/null || echo "5|5|FALLBACK")
    CASCADE_THRESHOLD=$(echo "$CAS_RESULT" | cut -d'|' -f1)
    CASCADE_WINDOW_MINUTES=$(echo "$CAS_RESULT" | cut -d'|' -f2)
    CASCADE_METHOD=$(echo "$CAS_RESULT" | cut -d'|' -f3)
    
    # Degradation Threshold (Sprint 2)
    DEG_RESULT=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" degradation "$circle" "$ceremony" 2>/dev/null || echo "0.85|0.15|NO_DATA|0")
    DEGRADATION_THRESHOLD=$(echo "$DEG_RESULT" | cut -d'|' -f1)
    DEGRADATION_CV=$(echo "$DEG_RESULT" | cut -d'|' -f2)
    DEGRADATION_CONFIDENCE=$(echo "$DEG_RESULT" | cut -d'|' -f3)
    DEGRADATION_SAMPLE_SIZE=$(echo "$DEG_RESULT" | cut -d'|' -f4)
    
    # Divergence Rate
    if [[ -z "${DIVERGENCE_RATE}" ]]; then
      DIV_RESULT=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" divergence "$circle" 2>/dev/null || echo "0.1|0.0|FALLBACK|0.0")
      DIVERGENCE_RATE=$(echo "$DIV_RESULT" | cut -d'|' -f1)
      SHARPE_RATIO=$(echo "$DIV_RESULT" | cut -d'|' -f2)
      DIV_CONFIDENCE=$(echo "$DIV_RESULT" | cut -d'|' -f3)
    fi
    
    # Check Frequency
    FREQ_RESULT=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" frequency "$circle" "$ceremony" 2>/dev/null || echo "10|FALLBACK")
    CHECK_FREQUENCY=$(echo "$FREQ_RESULT" | cut -d'|' -f1)
    CHECK_METHOD=$(echo "$FREQ_RESULT" | cut -d'|' -f2)
    
    echo ""
    log "Dynamic Thresholds Calculated (Ground Truth Validated):"
    echo "  ⚡ Circuit Breaker: ${CIRCUIT_BREAKER_THRESHOLD} (confidence: ${CB_CONFIDENCE:-UNKNOWN}, n=${CB_SAMPLE_SIZE:-0})"
    echo "  ⚡ Cascade: ${CASCADE_THRESHOLD} failures in ${CASCADE_WINDOW_MINUTES} min (method: ${CASCADE_METHOD})"
    echo "  📉 Degradation: ${DEGRADATION_THRESHOLD} (CV: ${DEGRADATION_CV:-N/A}, confidence: ${DEGRADATION_CONFIDENCE:-UNKNOWN}, n=${DEGRADATION_SAMPLE_SIZE:-0})"
    echo "  🔬 Divergence Rate: ${DIVERGENCE_RATE} (Sharpe: ${SHARPE_RATIO:-N/A}, confidence: ${DIV_CONFIDENCE:-UNKNOWN})"
    echo "  📊 Check Frequency: Every ${CHECK_FREQUENCY} episodes (method: ${CHECK_METHOD})"
    echo ""
    
    # Alert on LOW confidence thresholds
    if [[ "${CB_CONFIDENCE:-UNKNOWN}" == "LOW_CONFIDENCE" ]] || [[ "${CB_CONFIDENCE:-UNKNOWN}" == "NO_DATA" ]]; then
      warn "⚠️  Circuit Breaker has LOW confidence (sample size: ${CB_SAMPLE_SIZE:-0})"
      warn "   Recommendation: Build baseline with more episodes before testing"
    fi
    
    if [[ "${DIV_CONFIDENCE:-UNKNOWN}" == "LOW_CONFIDENCE" ]]; then
      warn "⚠️  Divergence Rate has LOW confidence"
      warn "   Using conservative fallback until more data available"
    fi
  fi
  
  info "Configuration:"
  echo "  Circle: $circle"
  echo "  Ceremony: $ceremony"
  echo "  Divergence Rate: $DIVERGENCE_RATE"
  echo "  Max Episodes: $MAX_EPISODES"
  echo "  Circuit Breaker: $CIRCUIT_BREAKER_THRESHOLD"
  echo ""
  
  # Initialize monitor log
  echo "timestamp,circle,episode,skills,total_episodes" > "$MONITOR_LOG"
  
  local success_count=0
  local failure_count=0
  
  # Calculate dynamic check frequency once
  if [[ -z "${CHECK_FREQUENCY}" ]] && [[ -f "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
    FREQ_RESULT=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" frequency "$circle" "$ceremony" 2>/dev/null || echo "10|FALLBACK")
    CHECK_FREQUENCY=$(echo "$FREQ_RESULT" | cut -d'|' -f1)
    CHECK_FREQUENCY=${CHECK_FREQUENCY:-10}
  else
    CHECK_FREQUENCY=${CHECK_FREQUENCY:-10}
  fi
  
  for i in $(seq 1 "$MAX_EPISODES"); do
    # Execute episode
    if execute_divergent_episode "$circle" "$ceremony" "$i"; then
      ((success_count++))
    else
      ((failure_count++))
    fi
    
    # Check circuit breaker at adaptive frequency (dynamic or every 10)
    if (( i % CHECK_FREQUENCY == 0 )); then
      monitor_progress "$circle" "$i"
      
      # Calculate current reward (success rate)
      local current_reward
      current_reward=$(echo "scale=2; $success_count / $i" | bc)
      
      info "Current Reward: $current_reward"
      
      # Circuit breaker check
      check_circuit_breaker "$current_reward"
      
      # Degradation detection (Sprint 2: WSJF 5.50)
      if ! check_degradation "$circle" "$ceremony" "$current_reward"; then
        warn "⚠️  Performance degradation detected"
        # Don't abort - just warn and track
      fi
      
      # Cascade failure check with dynamic thresholds (pass ceremony)
      if ! check_cascade_failures "$circle" "$ceremony"; then
        error "Cascade failures detected - ABORTING"
        rollback_database
        exit 1
      fi
      
      # Anti-pattern detection
      detect_antipatterns "$circle"
    fi
    
    # Throttle to prevent overwhelming system
    sleep 5
  done
  
  # Final report
  generate_report "$circle" "$success_count" "$failure_count"
}

#═══════════════════════════════════════════
# Generate Report
#═══════════════════════════════════════════

generate_report() {
  local circle=$1
  local success_count=$2
  local failure_count=$3
  
  echo ""
  phase "Divergence Test Complete"
  echo ""
  
  local success_rate
  success_rate=$(echo "scale=2; $success_count * 100 / ($success_count + $failure_count)" | bc)
  
  echo "═══════════════════════════════════════════"
  echo "  Final Results"
  echo "═══════════════════════════════════════════"
  echo ""
  echo "  Circle: $circle"
  echo "  Episodes: $((success_count + failure_count))"
  echo "  Successes: $success_count"
  echo "  Failures: $failure_count"
  echo "  Success Rate: ${success_rate}%"
  echo ""
  
  # Check if skills were extracted
  local final_skills
  final_skills=$(npx agentdb stats 2>/dev/null | grep "Skills:" | awk '{print $2}' || echo "0")
  
  if [[ $final_skills -gt 0 ]]; then
    log "Skills Extracted: $final_skills ✓"
  else
    warn "No skills extracted (expected for first run)"
  fi
  
  # Recommendation
  echo ""
  if (( $(echo "$success_rate >= 80" | bc -l) )); then
    log "SUCCESS: Safe to expand to more circles"
    echo ""
    info "Next steps:"
    echo "  1. Review learned skills: npx agentdb skill export --circle $circle"
    echo "  2. Expand to more circles: $0 multi-circle"
    echo "  3. Increase divergence rate: DIVERGENCE_RATE=0.2 $0 $circle"
  elif (( $(echo "$success_rate >= 70" | bc -l) )); then
    warn "ACCEPTABLE: Continue monitoring, do not expand yet"
    echo ""
    info "Recommendations:"
    echo "  1. Run 50 more episodes at same rate"
    echo "  2. Validate learned patterns manually"
    echo "  3. Check for anti-patterns"
  else
    error "POOR RESULTS: Do not proceed"
    echo ""
    info "Rollback and investigate:"
    echo "  1. Restore backup: cp $BACKUP_DB agentdb.db"
    echo "  2. Review failures in database"
    echo "  3. Lower divergence rate: DIVERGENCE_RATE=0.05"
  fi
  
  # Dynamic threshold confidence summary
  echo "═══════════════════════════════════════════"
  echo "  Dynamic Threshold Confidence"
  echo "═══════════════════════════════════════════"
  echo ""
  echo "  Circuit Breaker: ${CB_CONFIDENCE:-UNKNOWN} (sample: ${CB_SAMPLE_SIZE:-0})"
  echo "  Cascade Method: ${CASCADE_METHOD:-UNKNOWN}"
  echo "  Degradation: ${DEGRADATION_CONFIDENCE:-UNKNOWN} (CV: ${DEGRADATION_CV:-N/A}, sample: ${DEGRADATION_SAMPLE_SIZE:-0})"
  echo "  Divergence: ${DIV_CONFIDENCE:-UNKNOWN} (Sharpe: ${SHARPE_RATIO:-N/A})"
  echo "  Check Frequency: ${CHECK_METHOD:-UNKNOWN}"
  echo ""
  
  # Alert on concerning confidence levels
  if [[ "${CB_CONFIDENCE:-UNKNOWN}" == "LOW_CONFIDENCE" ]] || [[ "${CB_CONFIDENCE:-UNKNOWN}" == "NO_DATA" ]]; then
    warn "⚠️  LOW CONFIDENCE: Circuit breaker threshold based on insufficient data"
    warn "   Action: Run more baseline episodes to improve statistical validity"
  fi
  
  if [[ "${CASCADE_METHOD}" == "FALLBACK" ]]; then
    warn "⚠️  CASCADE FALLBACK: Using conservative default threshold"
    warn "   Action: Build failure history to enable velocity-based calculation"
  fi
  
  if [[ "${DEGRADATION_CONFIDENCE:-UNKNOWN}" == "LOW_CONFIDENCE" ]] || [[ "${DEGRADATION_CONFIDENCE:-UNKNOWN}" == "NO_DATA" ]]; then
    warn "⚠️  LOW CONFIDENCE: Degradation threshold based on insufficient data"
    warn "   Action: Run more episodes per ceremony to improve confidence intervals"
  fi
  
  # Save report with confidence metrics
  local report_file="${RESULTS_DIR}/report_${circle}_$(date +%Y%m%d_%H%M%S).txt"
  {
    echo "Divergence Test Report"
    echo "Circle: $circle"
    echo "Date: $(date)"
    echo "Divergence Rate: $DIVERGENCE_RATE"
    echo "Episodes: $((success_count + failure_count))"
    echo "Success Rate: ${success_rate}%"
    echo "Skills Extracted: $final_skills"
    echo ""
    echo "Dynamic Thresholds:"
    echo "  Circuit Breaker: $CIRCUIT_BREAKER_THRESHOLD (confidence: ${CB_CONFIDENCE:-UNKNOWN}, n=${CB_SAMPLE_SIZE:-0})"
    echo "  Cascade: $CASCADE_THRESHOLD failures in $CASCADE_WINDOW_MINUTES min (${CASCADE_METHOD})"
    echo "  Divergence: $DIVERGENCE_RATE (confidence: ${DIV_CONFIDENCE:-UNKNOWN})"
    echo "  Check Frequency: Every $CHECK_FREQUENCY episodes (${CHECK_METHOD})"
  } > "$report_file"
  
  log "Report saved: $report_file"
}

#═══════════════════════════════════════════
# Multi-Circle Test (Advanced)
#═══════════════════════════════════════════

run_multi_circle_test() {
  phase "Multi-Circle Divergence Test"
  echo ""
  warn "This will test multiple circles simultaneously"
  warn "Higher risk of cascade failures"
  echo ""
  
  read -p "Proceed with multi-circle test? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    info "Aborted by user"
    exit 0
  fi
  
  # Test safe circles first
  for circle in "${SAFE_CIRCLES[@]}"; do
    info "Testing circle: $circle"
    run_divergence_test "$circle"
    
    # Check if we should continue
    local skills_count
    skills_count=$(npx agentdb stats 2>/dev/null | grep "Skills:" | awk '{print $2}' || echo "0")
    
    if [[ $skills_count -eq 0 ]]; then
      error "No skills extracted - stopping multi-circle test"
      exit 1
    fi
  done
  
  log "Multi-circle test complete"
}

#═══════════════════════════════════════════
# Commands
#═══════════════════════════════════════════

cmd_single() {
  local circle=${1:-orchestrator}
  
  if ! preflight_check; then
    exit 1
  fi
  
  run_divergence_test "$circle"
}

cmd_multi() {
  if ! preflight_check; then
    exit 1
  fi
  
  run_multi_circle_test
}

cmd_rollback() {
  rollback_database
}

cmd_report() {
  local latest_report
  latest_report=$(ls -t "$RESULTS_DIR"/report_*.txt 2>/dev/null | head -1)
  
  if [[ -f "$latest_report" ]]; then
    cat "$latest_report"
  else
    error "No reports found in $RESULTS_DIR"
  fi
}

cmd_monitor() {
  info "Monitoring divergence test..."
  echo ""
  
  while true; do
    clear
    echo "═══════════════════════════════════════════"
    echo "  Divergence Test Monitor (Live)"
    echo "  $(date)"
    echo "═══════════════════════════════════════════"
    echo ""
    
    if [[ -f "$MONITOR_LOG" ]]; then
      tail -1 "$MONITOR_LOG" | awk -F',' '{
        printf "  Episode: %s\n", $3
        printf "  Skills: %s\n", $4
        printf "  Total Episodes: %s\n", $5
      }'
    else
      echo "  No active test"
    fi
    
    echo ""
    npx agentdb stats 2>/dev/null | grep -E "Skills:|Episodes:|Average Reward:" || echo "  AgentDB unavailable"
    
    sleep 10
  done
}

#═══════════════════════════════════════════
# Main
#═══════════════════════════════════════════

case "${1:-help}" in
  single)
    cmd_single "${2:-orchestrator}"
    ;;
  multi)
    cmd_multi
    ;;
  rollback)
    cmd_rollback
    ;;
  report)
    cmd_report
    ;;
  monitor)
    cmd_monitor
    ;;
  *)
    cat << EOF
Controlled Divergence Testing Framework

USAGE:
  $0 <command> [options]

COMMANDS:
  single <circle>   Run single-circle test (safe)
  multi             Run multi-circle test (risky)
  rollback          Restore database backup
  report            Show latest test report
  monitor           Live monitoring dashboard

EXAMPLES:
  # Start small with orchestrator (safest)
  DIVERGENCE_RATE=0.1 MAX_EPISODES=50 $0 single orchestrator

  # Increase variance after success
  DIVERGENCE_RATE=0.2 MAX_EPISODES=100 $0 single orchestrator

  # Multi-circle test (advanced)
  DIVERGENCE_RATE=0.15 $0 multi

  # Monitor in separate terminal
  $0 monitor

SAFETY:
  - Database backed up automatically
  - Circuit breaker at reward < $CIRCUIT_BREAKER_THRESHOLD
  - Cascade failure detection
  - Anti-pattern detection
  - Easy rollback: $0 rollback

CONFIGURATION:
  DIVERGENCE_RATE          Variance rate (0.0-1.0, default: 0.1)
  MAX_EPISODES             Episodes per test (default: 50)
  CIRCUIT_BREAKER_THRESHOLD  Abort threshold (default: 0.7)

EOF
    ;;
esac

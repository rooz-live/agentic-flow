#!/usr/bin/env bash
# ay-continuous.sh - Extended Continuous Monitoring (>1h duration)
# Part of FIRE (Focused Incremental Relentless Execution) Phase 1
# Resolves: Production Maturity Gap #1 (HIGH PRIORITY)

set -euo pipefail

# ==============================================================================
# CONFIGURATION
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_DIR="${PROJECT_ROOT}/.cache"
REPORTS_DIR="${PROJECT_ROOT}/reports"
VERDICTS_DIR="${PROJECT_ROOT}/.ay-verdicts"
CONTINUOUS_STATE="${CACHE_DIR}/continuous-state.json"
ALERT_LOG="${REPORTS_DIR}/continuous-alerts.log"

# Monitoring parameters
CHECK_INTERVAL_SECONDS="${AY_CONTINUOUS_INTERVAL:-300}"  # 5 minutes default
MAX_DURATION_HOURS="${AY_CONTINUOUS_DURATION:-24}"       # 24 hours default
HEALTH_THRESHOLD="${AY_HEALTH_THRESHOLD:-50}"            # Alert if health <50
VALIDATION_FAILURE_THRESHOLD="${AY_VALIDATION_THRESHOLD:-3}"  # Alert after 3 failures

# Alert mechanisms
ENABLE_ALERTS="${AY_ENABLE_ALERTS:-true}"
ALERT_EMAIL="${AY_ALERT_EMAIL:-}"
ALERT_WEBHOOK="${AY_ALERT_WEBHOOK:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*" >&2
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $*"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $*"
}

# ==============================================================================
# STATE MANAGEMENT
# ==============================================================================

initialize_state() {
    mkdir -p "$CACHE_DIR" "$REPORTS_DIR" "$VERDICTS_DIR"
    
    if [[ ! -f "$CONTINUOUS_STATE" ]]; then
        cat > "$CONTINUOUS_STATE" <<EOF
{
  "started_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "pid": $$,
  "checks_completed": 0,
  "consecutive_failures": 0,
  "last_health_score": 100,
  "alerts_sent": 0,
  "status": "running"
}
EOF
    fi
}

update_state() {
    local key="$1"
    local value="$2"
    
    if [[ -f "$CONTINUOUS_STATE" ]]; then
        jq --arg k "$key" --arg v "$value" '.[$k] = $v' "$CONTINUOUS_STATE" > "${CONTINUOUS_STATE}.tmp"
        mv "${CONTINUOUS_STATE}.tmp" "$CONTINUOUS_STATE"
    fi
}

get_state() {
    local key="$1"
    
    if [[ -f "$CONTINUOUS_STATE" ]]; then
        jq -r --arg k "$key" '.[$k] // ""' "$CONTINUOUS_STATE"
    else
        echo ""
    fi
}

# ==============================================================================
# HEALTH MONITORING
# ==============================================================================

calculate_health_score() {
    local score=100
    local checks_file="${CACHE_DIR}/continuous-health-checks.json"
    
    # Check 1: Recent validation failures (-20 per failure)
    local failures=$(get_state "consecutive_failures")
    score=$((score - failures * 20))
    
    # Check 2: Learning backlog (-10 if >5 unprocessed)
    local learning_files=$(find "$CACHE_DIR" -name "learning-retro-*.json" 2>/dev/null | wc -l)
    if [[ $learning_files -gt 5 ]]; then
        score=$((score - 10))
    fi
    
    # Check 3: Stale baselines (-15 if >7 days old)
    if [[ -f "${CACHE_DIR}/ay-baseline.json" ]]; then
        local baseline_age_days=$(( ($(date +%s) - $(date -r "${CACHE_DIR}/ay-baseline.json" +%s)) / 86400 ))
        if [[ $baseline_age_days -gt 7 ]]; then
            score=$((score - 15))
        fi
    fi
    
    # Check 4: Verdict registry health (-10 if NO_GO verdicts present)
    if [[ -f "${VERDICTS_DIR}/registry.json" ]]; then
        local no_go_count=$(jq '[.verdicts[] | select(.verdict == "NO_GO")] | length' "${VERDICTS_DIR}/registry.json")
        if [[ $no_go_count -gt 0 ]]; then
            score=$((score - 10))
        fi
    fi
    
    # Check 5: Disk usage (-15 if >90%)
    local disk_usage=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        score=$((score - 15))
    fi
    
    # Check 6: Memory pressure (-10 if swap usage >50%)
    if command -v vm_stat &>/dev/null; then
        local swap_used=$(vm_stat | grep "Swapouts" | awk '{print $2}' | sed 's/\.//')
        if [[ $swap_used -gt 50000 ]]; then
            score=$((score - 10))
        fi
    fi
    
    # Clamp to [0, 100]
    if [[ $score -lt 0 ]]; then
        score=0
    fi
    
    echo "$score"
}

# ==============================================================================
# ALERTING
# ==============================================================================

send_alert() {
    local severity="$1"  # CRITICAL, WARNING, INFO
    local message="$2"
    local details="$3"
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local alert_entry="[$timestamp] [$severity] $message - $details"
    
    # Log to file
    echo "$alert_entry" >> "$ALERT_LOG"
    
    if [[ "$ENABLE_ALERTS" != "true" ]]; then
        return
    fi
    
    # Email alert
    if [[ -n "$ALERT_EMAIL" ]] && command -v mail &>/dev/null; then
        echo "$alert_entry" | mail -s "AY Continuous Monitor: $severity" "$ALERT_EMAIL" || true
    fi
    
    # Webhook alert
    if [[ -n "$ALERT_WEBHOOK" ]] && command -v curl &>/dev/null; then
        curl -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"severity\":\"$severity\",\"message\":\"$message\",\"details\":\"$details\",\"timestamp\":\"$timestamp\"}" \
            &>/dev/null || true
    fi
    
    # Update alert count
    local alerts_sent=$(get_state "alerts_sent")
    alerts_sent=$((alerts_sent + 1))
    update_state "alerts_sent" "$alerts_sent"
}

# ==============================================================================
# MONITORING CHECKS
# ==============================================================================

run_health_check() {
    log "Running health check..."
    
    local health_score=$(calculate_health_score)
    update_state "last_health_score" "$health_score"
    
    if [[ $health_score -lt $HEALTH_THRESHOLD ]]; then
        send_alert "CRITICAL" \
            "Health score dropped to $health_score (threshold: $HEALTH_THRESHOLD)" \
            "Immediate intervention required. Run 'ay assess' for diagnostics."
        log_error "Health score: $health_score (CRITICAL)"
    elif [[ $health_score -lt 70 ]]; then
        send_alert "WARNING" \
            "Health score at $health_score" \
            "Consider running 'ay governance' to review system state."
        log_warning "Health score: $health_score (WARNING)"
    else
        log_success "Health score: $health_score (HEALTHY)"
    fi
    
    echo "$health_score"
}

run_validation_check() {
    log "Running validation check..."
    
    # Run lightweight validation (skip expensive tests)
    local validation_output
    validation_output=$("${SCRIPT_DIR}/ay-integrated-cycle.sh" validate-quick 2>&1 || true)
    
    local validation_status="PASSED"
    if echo "$validation_output" | grep -q "FAILED"; then
        validation_status="FAILED"
        
        local failures=$(get_state "consecutive_failures")
        failures=$((failures + 1))
        update_state "consecutive_failures" "$failures"
        
        if [[ $failures -ge $VALIDATION_FAILURE_THRESHOLD ]]; then
            send_alert "CRITICAL" \
                "Validation failed $failures times consecutively" \
                "System integrity compromised. Run 'ay fire' to remediate."
            log_error "Validation: FAILED (consecutive: $failures)"
        else
            log_warning "Validation: FAILED (consecutive: $failures)"
        fi
    else
        update_state "consecutive_failures" "0"
        log_success "Validation: PASSED"
    fi
    
    echo "$validation_status"
}

run_circulation_check() {
    log "Running circulation check..."
    
    # Check for circulation gaps (producers with no consumers)
    local learning_files=$(find "$CACHE_DIR" -name "learning-retro-*.json" -mmin +60 2>/dev/null | wc -l)
    
    if [[ $learning_files -gt 0 ]]; then
        send_alert "WARNING" \
            "Circulation gap detected: $learning_files unprocessed learning files >1h old" \
            "Run 'ay fire' to consume learning backlog."
        log_warning "Circulation: $learning_files stale learning files"
    else
        log_success "Circulation: HEALTHY"
    fi
}

run_governance_check() {
    log "Running governance check..."
    
    # Check if governance review is overdue (weekly cadence)
    local last_governance="${CACHE_DIR}/last-governance.timestamp"
    
    if [[ -f "$last_governance" ]]; then
        local last_run=$(cat "$last_governance")
        local days_since=$(( ($(date +%s) - last_run) / 86400 ))
        
        if [[ $days_since -gt 7 ]]; then
            send_alert "INFO" \
                "Governance review overdue ($days_since days since last run)" \
                "Schedule 'ay governance' to review truth conditions and authority alignment."
            log_warning "Governance: OVERDUE ($days_since days)"
        else
            log_success "Governance: UP TO DATE ($days_since days ago)"
        fi
    else
        log_warning "Governance: NEVER RUN"
    fi
}

# ==============================================================================
# MAIN MONITORING LOOP
# ==============================================================================

monitoring_loop() {
    local start_time=$(date +%s)
    local max_duration_seconds=$((MAX_DURATION_HOURS * 3600))
    local checks_completed=0
    
    log_success "Starting continuous monitoring (duration: ${MAX_DURATION_HOURS}h, interval: ${CHECK_INTERVAL_SECONDS}s)"
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        # Check if max duration reached
        if [[ $elapsed -ge $max_duration_seconds ]]; then
            log_success "Max duration reached (${MAX_DURATION_HOURS}h). Stopping gracefully."
            break
        fi
        
        checks_completed=$((checks_completed + 1))
        update_state "checks_completed" "$checks_completed"
        
        log "=== Check #${checks_completed} (elapsed: $((elapsed / 60))m) ==="
        
        # Run all checks
        run_health_check
        run_validation_check
        run_circulation_check
        run_governance_check
        
        # Sleep until next check
        log "Sleeping ${CHECK_INTERVAL_SECONDS}s until next check..."
        sleep "$CHECK_INTERVAL_SECONDS"
    done
    
    update_state "status" "completed"
    log_success "Continuous monitoring completed. Total checks: $checks_completed"
}

# ==============================================================================
# SIGNAL HANDLERS
# ==============================================================================

cleanup() {
    log "Received termination signal. Cleaning up..."
    update_state "status" "stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# ==============================================================================
# MAIN
# ==============================================================================

main() {
    cd "$PROJECT_ROOT"
    
    initialize_state
    
    log "========================================="
    log "AY Continuous Monitoring"
    log "========================================="
    log "PID: $$"
    log "Project: $PROJECT_ROOT"
    log "Duration: ${MAX_DURATION_HOURS}h"
    log "Interval: ${CHECK_INTERVAL_SECONDS}s"
    log "Health threshold: $HEALTH_THRESHOLD"
    log "Alerts enabled: $ENABLE_ALERTS"
    log "========================================="
    
    monitoring_loop
}

main "$@"

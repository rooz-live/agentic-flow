#!/usr/bin/env bash
# Controlled Divergence Testing Framework
# Safely introduces variance to enable skill learning
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration (will be calculated dynamically)
MAX_EPISODES="${MAX_EPISODES:-50}"
TEST_CIRCLE="${TEST_CIRCLE:-orchestrator}"
BACKUP_DB="${ROOT_DIR}/agentdb.db.backup-$(date +%Y%m%d-%H%M%S)"

# Dynamic thresholds (calculated per-test based on historical data)
DIVERGENCE_RATE=""
CIRCUIT_BREAKER_THRESHOLD=""
DEGRADATION_THRESHOLD=""
CASCADE_THRESHOLD=""
CASCADE_WINDOW_MINUTES=""
CHECK_FREQUENCY=""

log_info() { echo -e "${CYAN}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*"; }
log_debug() { [[ "${DEBUG:-0}" == "1" ]] && echo -e "${BLUE}[DEBUG]${NC} $*"; }

# Calculate dynamic circuit breaker threshold with regime awareness
calculate_circuit_breaker() {
    local task_filter="$1"
    
    log_debug "Calculating dynamic circuit breaker for task=$task_filter"
    
    # Use external dynamic threshold script if available
    if [[ -x "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
        local cb_result=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" circuit-breaker "$task_filter" 2>/dev/null || echo "0.5|0|0|0|FALLBACK")
        CIRCUIT_BREAKER_THRESHOLD=$(echo "$cb_result" | cut -d'|' -f1)
        local sample_size=$(echo "$cb_result" | cut -d'|' -f2)
        local confidence=$(echo "$cb_result" | cut -d'|' -f5)
        log_info "Circuit Breaker: $CIRCUIT_BREAKER_THRESHOLD (n=$sample_size, $confidence)"
    else
        # Fallback to inline SQL (original implementation)
        CIRCUIT_BREAKER_THRESHOLD=$(sqlite3 "$ROOT_DIR/agentdb.db" <<SQL 2>/dev/null
WITH recent_stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    COUNT(*) as sample_size
  FROM episodes 
  WHERE task LIKE '%$task_filter%'
    AND success=1
    AND created_at > strftime('%s', 'now', '-30 days')
)
SELECT 
  CASE 
    WHEN sample_size >= 30 AND mean_reward IS NOT NULL THEN mean_reward * 0.7
    WHEN sample_size >= 10 AND mean_reward IS NOT NULL THEN mean_reward * 0.6
    ELSE 0.5
  END as threshold
FROM recent_stats;
SQL
)
        CIRCUIT_BREAKER_THRESHOLD=${CIRCUIT_BREAKER_THRESHOLD:-0.5}
        log_info "Circuit Breaker: $CIRCUIT_BREAKER_THRESHOLD (inline fallback)"
    fi
}

# Calculate dynamic degradation threshold with statistical significance
calculate_degradation_threshold() {
    local task_filter="$1"
    local task_type="$2"
    local baseline_reward="$3"
    
    log_debug "Calculating degradation threshold for task=$task_filter, type=$task_type"
    
    # Use external dynamic threshold script if available
    if [[ -x "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
        local deg_result=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" degradation "$task_filter" "$task_type" 2>/dev/null || echo "0.85|0.0|FALLBACK|0")
        DEGRADATION_THRESHOLD=$(echo "$deg_result" | cut -d'|' -f1)
        local variation_coeff=$(echo "$deg_result" | cut -d'|' -f2)
        local confidence=$(echo "$deg_result" | cut -d'|' -f3)
        local sample_size=$(echo "$deg_result" | cut -d'|' -f4)
        
        # Use baseline fallback if threshold is empty
        if [[ -z "$DEGRADATION_THRESHOLD" ]] || [[ "$DEGRADATION_THRESHOLD" == "0.85" ]]; then
            DEGRADATION_THRESHOLD=$(echo "$baseline_reward * 0.85" | bc -l)
        fi
        
        log_info "Degradation: $DEGRADATION_THRESHOLD (CoV: $variation_coeff, n=$sample_size, $confidence)"
    else
        # Fallback to inline SQL (original implementation)
        local degradation_check=$(sqlite3 "$ROOT_DIR/agentdb.db" <<SQL 2>/dev/null
WITH stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    COUNT(*) as n
  FROM episodes 
  WHERE task LIKE '%$task_filter%' AND task LIKE '%$task_type%'
    AND success=1
    AND created_at > strftime('%s', 'now', '-30 days')
)
SELECT 
  CASE
    WHEN n >= 10 AND mean_reward IS NOT NULL THEN mean_reward * 0.85
    WHEN mean_reward IS NOT NULL THEN mean_reward * 0.85
    ELSE NULL
  END as threshold,
  0.0 as coeff_variation
FROM stats;
SQL
)
        
        if [[ -n "$degradation_check" ]]; then
            DEGRADATION_THRESHOLD=$(echo "$degradation_check" | cut -d'|' -f1)
            local variation_coeff=$(echo "$degradation_check" | cut -d'|' -f2)
            DEGRADATION_THRESHOLD=${DEGRADATION_THRESHOLD:-$(echo "$baseline_reward * 0.85" | bc -l)}
            log_info "Degradation: $DEGRADATION_THRESHOLD (CoV: $variation_coeff, inline fallback)"
        else
            DEGRADATION_THRESHOLD=$(echo "$baseline_reward * 0.85" | bc -l)
            log_warn "Degradation: $DEGRADATION_THRESHOLD (baseline fallback)"
        fi
    fi
}

# Calculate dynamic cascade threshold based on failure velocity
calculate_cascade_threshold() {
    local task_filter="$1"
    local task_type="$2"
    
    log_debug "Calculating cascade threshold for task=$task_filter, type=$task_type"
    
    # Use external dynamic threshold script if available
    if [[ -x "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
        local cascade_result=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" cascade "$task_filter" "$task_type" 2>/dev/null || echo "5|5|FALLBACK")
        CASCADE_THRESHOLD=$(echo "$cascade_result" | cut -d'|' -f1)
        CASCADE_WINDOW_MINUTES=$(echo "$cascade_result" | cut -d'|' -f2)
        local method=$(echo "$cascade_result" | cut -d'|' -f3)
        log_info "Cascade: $CASCADE_THRESHOLD failures in $CASCADE_WINDOW_MINUTES min ($method)"
    else
        # Fallback to inline SQL (original implementation)
        local cascade_config=$(sqlite3 "$ROOT_DIR/agentdb.db" <<SQL 2>/dev/null
WITH episode_stats AS (
  SELECT 
    AVG(CAST(latency_ms / 60000.0 AS REAL)) as avg_duration_min,
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as baseline_failure_rate,
    COUNT(*) as total_episodes
  FROM episodes
  WHERE task LIKE '%$task_filter%' AND task LIKE '%$task_type%'
    AND created_at > strftime('%s', 'now', '-7 days')
    AND latency_ms IS NOT NULL
)
SELECT 
  CASE 
    WHEN total_episodes >= 50 AND baseline_failure_rate IS NOT NULL THEN
      CAST(baseline_failure_rate * 50 * 1.5 AS INTEGER)
    WHEN avg_duration_min > 0 THEN
      CAST((300.0 / avg_duration_min) * 1.5 AS INTEGER)
    ELSE 5
  END as threshold,
  CASE WHEN avg_duration_min > 0 THEN CAST(avg_duration_min * 3 AS INTEGER) ELSE 5 END as window_minutes
FROM episode_stats;
SQL
)
        
        if [[ -n "$cascade_config" ]]; then
            CASCADE_THRESHOLD=$(echo "$cascade_config" | cut -d'|' -f1)
            CASCADE_WINDOW_MINUTES=$(echo "$cascade_config" | cut -d'|' -f2)
        fi
        
        CASCADE_THRESHOLD=${CASCADE_THRESHOLD:-5}
        CASCADE_WINDOW_MINUTES=${CASCADE_WINDOW_MINUTES:-5}
        log_info "Cascade: $CASCADE_THRESHOLD failures in $CASCADE_WINDOW_MINUTES min (inline fallback)"
    fi
}

# Calculate risk-adjusted divergence rate
calculate_divergence_rate() {
    local task_filter="$1"
    
    log_debug "Calculating divergence rate for task=$task_filter"
    
    # Use external dynamic threshold script if available
    if [[ -x "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
        local div_result=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" divergence "$task_filter" 2>/dev/null || echo "0.05|0.0|LOW_CONFIDENCE|0.0")
        DIVERGENCE_RATE=$(echo "$div_result" | cut -d'|' -f1)
        local sharpe=$(echo "$div_result" | cut -d'|' -f2)
        local confidence=$(echo "$div_result" | cut -d'|' -f3)
        local success_rate=$(echo "$div_result" | cut -d'|' -f4)
        
        DIVERGENCE_RATE=${DIVERGENCE_RATE:-0.05}
        log_info "Divergence: $DIVERGENCE_RATE (Sharpe: $sharpe, Success: $success_rate, $confidence)"
    else
        # Fallback to inline SQL (original implementation)
        local divergence_config=$(sqlite3 "$ROOT_DIR/agentdb.db" <<SQL 2>/dev/null
WITH recent_perf AS (
  SELECT 
    AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate,
    AVG(reward) as mean_reward,
    COUNT(*) as sample_size
  FROM episodes
  WHERE task LIKE '%$task_filter%'
    AND created_at > strftime('%s', 'now', '-7 days')
)
SELECT 
  CASE
    WHEN sample_size >= 10 AND mean_reward IS NOT NULL THEN
      CASE
        WHEN success_rate > 0.85 THEN 0.30
        WHEN success_rate > 0.70 THEN 0.15
        WHEN success_rate > 0.50 THEN 0.08
        ELSE 0.03
      END
    ELSE 0.05
  END as divergence_rate,
  COALESCE(success_rate, 0.0) as success_rate,
  0.0 as sharpe_ratio
FROM recent_perf;
SQL
)
        
        if [[ -n "$divergence_config" ]]; then
            DIVERGENCE_RATE=$(echo "$divergence_config" | cut -d'|' -f1)
            local success_rate=$(echo "$divergence_config" | cut -d'|' -f2)
            local sharpe=$(echo "$divergence_config" | cut -d'|' -f3)
            DIVERGENCE_RATE=${DIVERGENCE_RATE:-0.05}
            log_info "Divergence: $DIVERGENCE_RATE (Success: $success_rate, Sharpe: $sharpe, inline fallback)"
        else
            DIVERGENCE_RATE=0.05
            log_warn "Divergence: $DIVERGENCE_RATE (fallback)"
        fi
    fi
}

# Calculate adaptive check frequency
calculate_check_frequency() {
    local task_filter="$1"
    local task_type="$2"
    
    log_debug "Calculating check frequency for task=$task_filter, type=$task_type"
    
    # Use external dynamic threshold script if available
    if [[ -x "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
        local check_result=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" check-freq "$task_filter" "$task_type" 2>/dev/null || echo "10|FALLBACK")
        CHECK_FREQUENCY=$(echo "$check_result" | cut -d'|' -f1)
        local method=$(echo "$check_result" | cut -d'|' -f2)
        
        CHECK_FREQUENCY=${CHECK_FREQUENCY:-10}
        log_info "Check Frequency: Every $CHECK_FREQUENCY episodes ($method)"
    else
        # Fallback to inline SQL (original implementation)
        local check_config=$(sqlite3 "$ROOT_DIR/agentdb.db" <<SQL 2>/dev/null
WITH risk_factors AS (
  SELECT 
    AVG(reward) as mean_reward,
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as failure_rate,
    COUNT(*) as sample_size
  FROM episodes
  WHERE task LIKE '%$task_filter%' AND task LIKE '%$task_type%'
    AND created_at > strftime('%s', 'now', '-7 days')
)
SELECT 
  CASE
    WHEN failure_rate > 0.2 THEN 5
    WHEN failure_rate > 0.1 THEN 10
    ELSE 15
  END as check_every_n_episodes,
  0.0 as reward_volatility,
  COALESCE(failure_rate, 0.0) as failure_rate
FROM risk_factors;
SQL
)
        
        if [[ -n "$check_config" ]]; then
            CHECK_FREQUENCY=$(echo "$check_config" | cut -d'|' -f1)
            local volatility=$(echo "$check_config" | cut -d'|' -f2)
            local fail_rate=$(echo "$check_config" | cut -d'|' -f3)
            CHECK_FREQUENCY=${CHECK_FREQUENCY:-10}
            log_info "Check Frequency: Every $CHECK_FREQUENCY episodes (Vol: $volatility, FailRate: $fail_rate, inline fallback)"
        else
            CHECK_FREQUENCY=10
            log_warn "Check Frequency: $CHECK_FREQUENCY (fallback)"
        fi
    fi
}

# Safety check
safety_check() {
    log_info "Running safety checks..."
    
    # Check if in production
    if [[ "${PRODUCTION_MODE:-0}" == "1" ]]; then
        log_error "ABORT: Cannot run divergence testing in PRODUCTION_MODE"
        exit 1
    fi
    
    # Check database exists
    if [[ ! -f "$ROOT_DIR/agentdb.db" ]]; then
        log_error "agentdb.db not found"
        exit 1
    fi
    
    # Check backup space
    local db_size=$(du -m "$ROOT_DIR/agentdb.db" | cut -f1)
    local free_space=$(df -m "$ROOT_DIR" | tail -1 | awk '{print $4}')
    
    if (( free_space < db_size * 2 )); then
        log_error "Insufficient disk space for backup (need $(( db_size * 2 ))MB, have ${free_space}MB)"
        exit 1
    fi
    
    log_success "Safety checks passed"
}

# Backup database
backup_database() {
    log_info "Creating backup: $BACKUP_DB"
    cp "$ROOT_DIR/agentdb.db" "$BACKUP_DB"
    log_success "Backup created ($(du -h "$BACKUP_DB" | cut -f1))"
}

# Get current metrics
get_metrics() {
    local stats=$(npx agentdb stats 2>/dev/null)
    local episodes=$(echo "$stats" | grep "Episodes:" | awk '{print $2}')
    local skills=$(echo "$stats" | grep "Skills:" | awk '{print $2}')
    local avg_reward=$(echo "$stats" | grep "Average Reward:" | awk '{print $3}')
    
    echo "$episodes,$skills,$avg_reward"
}

# Check circuit breaker
check_circuit_breaker() {
    local current_reward="$1"
    
    # Skip check if values are empty
    if [[ -z "$current_reward" ]] || [[ -z "$CIRCUIT_BREAKER_THRESHOLD" ]]; then
        log_debug "Skipping circuit breaker check (empty values)"
        return 0
    fi
    
    if (( $(echo "$current_reward < $CIRCUIT_BREAKER_THRESHOLD" | bc -l) )); then
        log_error "CIRCUIT BREAKER TRIGGERED: Reward $current_reward < $CIRCUIT_BREAKER_THRESHOLD"
        log_warn "Rolling back to backup..."
        mv "$BACKUP_DB" "$ROOT_DIR/agentdb.db"
        exit 1
    fi
}

# Introduce controlled variance
run_divergent_ceremony() {
    local task_filter="$1"
    local task_type="$2"
    local episode_num="$3"
    
    # Randomly decide if this episode should have variance
    local should_diverge=$(awk -v rate="$DIVERGENCE_RATE" 'BEGIN{srand(); print (rand() < rate)}')
    
    if [[ "$should_diverge" == "1" ]]; then
        log_info "Episode $episode_num: Adding variance (${DIVERGENCE_RATE})"
        
        # Introduce controlled imperfection
        # Option 1: Skip optional step (mild divergence)
        # Option 2: Use alternative workflow (moderate divergence)
        # Option 3: Inject controlled failure (high divergence)
        
        local divergence_type=$((RANDOM % 3))
        
        case $divergence_type in
            0)
                log_info "  Divergence: Skip optional validation"
                export SKIP_VALIDATION=1
                ;;
            1)
                log_info "  Divergence: Use alternative workflow"
                export ALTERNATIVE_WORKFLOW=1
                ;;
            2)
                log_info "  Divergence: Inject minor delay"
                sleep 2
                ;;
        esac
    fi
    
    # Run ceremony
    if "$SCRIPT_DIR/ay-prod-cycle.sh" "$task_filter" "$task_type" advisory 2>&1 | grep -q "Ceremony completed"; then
        log_success "Episode $episode_num: Completed"
        return 0
    else
        log_warn "Episode $episode_num: Failed"
        return 1
    fi
}

# Monitor for cascade failures with dynamic thresholds
check_cascade_failures() {
    local recent_failures=$(sqlite3 "$ROOT_DIR/agentdb.db" \
        "SELECT COUNT(*) FROM episodes WHERE success = 0 AND created_at > strftime('%s', 'now', '-${CASCADE_WINDOW_MINUTES:-5} minutes');" 2>/dev/null || echo "0")
    
    local threshold=${CASCADE_THRESHOLD:-10}
    
    if (( recent_failures > threshold )); then
        log_error "CASCADE DETECTED: $recent_failures failures in last ${CASCADE_WINDOW_MINUTES:-5} minutes (threshold: $threshold)"
        return 1
    fi
    
    log_debug "Cascade check: $recent_failures/$threshold failures"
    return 0
}

# Main divergence test
run_divergence_test() {
    local task_filter="${1:-$TEST_CIRCLE}"
    local task_type="${2:-standup}"
    local episodes="${3:-$MAX_EPISODES}"
    
    log_info "Starting Controlled Divergence Test"
    log_info "  Task Filter: $task_filter"
    log_info "  Task Type: $task_type"
    log_info "  Episodes: $episodes"
    echo ""
    
    # Safety checks
    safety_check
    
    # Calculate dynamic thresholds
    log_info "Calculating dynamic thresholds from historical data..."
    echo ""
    calculate_circuit_breaker "$task_filter"
    calculate_divergence_rate "$task_filter"
    calculate_cascade_threshold "$task_filter" "$task_type"
    calculate_check_frequency "$task_filter" "$task_type"
    echo ""
    
    # Backup
    backup_database
    
    # Get baseline metrics
    local baseline=$(get_metrics)
    local baseline_episodes=$(echo "$baseline" | cut -d, -f1)
    local baseline_skills=$(echo "$baseline" | cut -d, -f2)
    local baseline_reward=$(echo "$baseline" | cut -d, -f3)
    
    log_info "Baseline: Episodes=$baseline_episodes, Skills=$baseline_skills, Reward=$baseline_reward"
    
    # Calculate degradation threshold based on baseline
    calculate_degradation_threshold "$task_filter" "$task_type" "$baseline_reward"
    echo ""
    
    # Run divergent episodes
    local successes=0
    local failures=0
    
    for i in $(seq 1 "$episodes"); do
        log_info "Running episode $i/$episodes..."
        
        if run_divergent_ceremony "$task_filter" "$task_type" "$i"; then
            ((successes++)) || true
        else
            ((failures++)) || true
        fi
        
        # Check at adaptive frequency
        local check_freq=${CHECK_FREQUENCY:-10}
        if (( i % check_freq == 0 )); then
            local current=$(get_metrics)
            local current_reward=$(echo "$current" | cut -d, -f3)
            
            log_info "Progress: $i/$episodes episodes, Success rate: $((successes * 100 / i))%"
            
            # Circuit breaker
            check_circuit_breaker "$current_reward"
            
            # Cascade check
            if ! check_cascade_failures; then
                log_error "Cascade failure detected, aborting"
                mv "$BACKUP_DB" "$ROOT_DIR/agentdb.db"
                exit 1
            fi
        fi
        
        # Prevent overwhelming system
        sleep 2
        
        # Clear divergence flags
        unset SKIP_VALIDATION
        unset ALTERNATIVE_WORKFLOW
    done
    
    echo ""
    log_info "Divergence test complete"
    log_info "  Successes: $successes/$episodes ($((successes * 100 / episodes))%)"
    log_info "  Failures: $failures/$episodes ($((failures * 100 / episodes))%)"
    echo ""
    
    # Final metrics
    local final=$(get_metrics)
    local final_episodes=$(echo "$final" | cut -d, -f1)
    local final_skills=$(echo "$final" | cut -d, -f2)
    local final_reward=$(echo "$final" | cut -d, -f3)
    
    log_info "Final Metrics:"
    log_info "  Episodes: $baseline_episodes → $final_episodes (+$((final_episodes - baseline_episodes)))"
    log_info "  Skills: $baseline_skills → $final_skills (+$((final_skills - baseline_skills)))"
    log_info "  Reward: $baseline_reward → $final_reward"
    echo ""
    
    # Evaluate results
    if (( final_skills > baseline_skills )); then
        log_success "SUCCESS: Skills increased from $baseline_skills to $final_skills"
        log_info "Keeping divergent data (backup at $BACKUP_DB)"
    elif [[ -n "$DEGRADATION_THRESHOLD" ]] && (( $(echo "$final_reward < $DEGRADATION_THRESHOLD" | bc -l) )); then
        log_error "FAILURE: Reward degraded beyond statistical threshold ($final_reward < $DEGRADATION_THRESHOLD)"
        log_warn "Rolling back to backup"
        mv "$BACKUP_DB" "$ROOT_DIR/agentdb.db"
    else
        log_warn "INCONCLUSIVE: Skills not increased but no significant degradation"
        log_info "Keeping data for further analysis (backup at $BACKUP_DB)"
    fi
    
    # Run learner
    log_info "Running learner to extract skills..."
    npx agentdb learner run 1 0.0 0.0 false 2>&1 | grep -E "Extracted|Discovered" || log_warn "No new patterns discovered"
    
    # Show final stats
    echo ""
    npx agentdb stats 2>/dev/null | grep -E "Episodes|Skills|Average Reward"
}

# Validate learned skills
validate_skills() {
    local task_filter="$1"
    
    log_info "Validating learned skills for $task_filter..."
    
    # Export skills
    local skills_json=$(npx agentdb skill export --task "$task_filter" --json 2>/dev/null || echo "{}")
    
    if [[ "$skills_json" != "{}" ]]; then
        echo "$skills_json" | jq .
        log_success "Skills exported successfully"
    else
        log_warn "No skills to export"
    fi
}

# Usage
usage() {
    cat <<EOF
Usage: $0 <command> [options]

Commands:
  test [circle] [ceremony] [episodes]  Run divergence test
  validate [circle]                    Validate learned skills
  rollback                             Restore from latest backup
  status                               Show current metrics

Options:
  DIVERGENCE_RATE=0.1                  Variance rate (0.0-1.0, default: 0.1)
  CIRCUIT_BREAKER_THRESHOLD=0.7        Min reward before abort (default: 0.7)
  MAX_EPISODES=50                      Episodes to run (default: 50)
  TEST_CIRCLE=orchestrator             Circle to test (default: orchestrator)

Examples:
  # Safe 10% divergence test
  $0 test orchestrator standup 50

  # Aggressive 30% divergence (risky!)
  DIVERGENCE_RATE=0.3 $0 test orchestrator standup 100

  # Conservative with high circuit breaker
  DIVERGENCE_RATE=0.05 CIRCUIT_BREAKER_THRESHOLD=0.85 $0 test

  # Validate results
  $0 validate orchestrator

  # Rollback if needed
  $0 rollback

EOF
    exit 1
}

# Main
main() {
    local command="${1:-}"
    
    case "$command" in
        test)
            run_divergence_test "${2:-orchestrator}" "${3:-standup}" "${4:-$MAX_EPISODES}"
            ;;
        validate)
            validate_skills "${2:-orchestrator}"
            ;;
        rollback)
            local latest_backup=$(ls -t "$ROOT_DIR"/agentdb.db.backup-* 2>/dev/null | head -1)
            if [[ -n "$latest_backup" ]]; then
                log_info "Rolling back to $latest_backup"
                cp "$latest_backup" "$ROOT_DIR/agentdb.db"
                log_success "Rollback complete"
            else
                log_error "No backup found"
                exit 1
            fi
            ;;
        status)
            get_metrics | tr ',' '\n' | paste -d: <(echo -e "Episodes\nSkills\nReward")
            ;;
        *)
            usage
            ;;
    esac
}

main "$@"

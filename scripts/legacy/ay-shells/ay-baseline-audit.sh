#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# AY BASELINE AUDIT SYSTEM
# ============================================================================
# Comprehensive parameterization/error/frequency analysis with governance
# Triggers MPP learning, validates skills, establishes baselines
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTDB_PATH="${AGENTDB_PATH:-./agentdb.db}"
AUDIT_LOG="${AUDIT_LOG:-./logs/baseline-audit.log}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Unicode
CHECK="✓"
CROSS="✗"
ARROW="→"
BULLET="•"
SPINNER=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")

# ============================================================================
# LOGGING
# ============================================================================

mkdir -p "$(dirname "$AUDIT_LOG")"

log() {
    local level=$1
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$AUDIT_LOG"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }
log_success() { log "SUCCESS" "$@"; }

# ============================================================================
# SPINNER ANIMATION
# ============================================================================

show_spinner() {
    local pid=$1
    local message=$2
    local i=0
    
    while kill -0 "$pid" 2>/dev/null; do
        printf "\r${CYAN}${SPINNER[$i]}${NC} ${message}..."
        i=$(( (i + 1) % ${#SPINNER[@]} ))
        sleep 0.1
    done
    
    printf "\r${GREEN}${CHECK}${NC} ${message}... ${GREEN}Done${NC}\n"
}

# ============================================================================
# PRE-CYCLE: ESTABLISH BASELINES
# ============================================================================

establish_baselines() {
    log_info "=== PRE-CYCLE: ESTABLISHING BASELINES ==="
    
    # Check if baselines already exist
    if [ -f "./logs/baselines.json" ]; then
        local age=$(( $(date +%s) - $(stat -f %m "./logs/baselines.json" 2>/dev/null || stat -c %Y "./logs/baselines.json") ))
        if [ "$age" -lt 3600 ]; then
            echo -e "${YELLOW}${BULLET}${NC} Baselines exist (${age}s old), skipping..."
            return 0
        fi
    fi
    
    echo -e "${CYAN}${BULLET}${NC} Calculating performance baselines..."
    
    # Query historical performance
    local baseline_reward baseline_duration baseline_memory
    
    baseline_reward=$(sqlite3 "$AGENTDB_PATH" \
        "SELECT ROUND(AVG(reward), 3) FROM episodes WHERE created_at > strftime('%s', 'now', '-30 days')" 2>/dev/null || echo "0.750")
    
    baseline_duration=$(sqlite3 "$AGENTDB_PATH" \
        "SELECT ROUND(AVG(duration), 2) FROM episodes WHERE created_at > strftime('%s', 'now', '-30 days')" 2>/dev/null || echo "120.0")
    
    baseline_memory=$(sqlite3 "$AGENTDB_PATH" \
        "SELECT ROUND(AVG(memory_used), 2) FROM episodes WHERE created_at > strftime('%s', 'now', '-30 days')" 2>/dev/null || echo "512.0")
    
    # Calculate statistical baselines
    local reward_stddev duration_stddev
    
    reward_stddev=$(sqlite3 "$AGENTDB_PATH" \
        "SELECT ROUND(
            SQRT(AVG((reward - (SELECT AVG(reward) FROM episodes WHERE created_at > strftime('%s', 'now', '-30 days'))) * 
                     (reward - (SELECT AVG(reward) FROM episodes WHERE created_at > strftime('%s', 'now', '-30 days'))))), 3)
         FROM episodes WHERE created_at > strftime('%s', 'now', '-30 days')" 2>/dev/null || echo "0.100")
    
    duration_stddev=$(sqlite3 "$AGENTDB_PATH" \
        "SELECT ROUND(
            SQRT(AVG((duration - (SELECT AVG(duration) FROM episodes WHERE created_at > strftime('%s', 'now', '-30 days'))) * 
                     (duration - (SELECT AVG(duration) FROM episodes WHERE created_at > strftime('%s', 'now', '-30 days'))))), 2)
         FROM episodes WHERE created_at > strftime('%s', 'now', '-30 days')" 2>/dev/null || echo "30.0")
    
    # Save baselines
    cat > "./logs/baselines.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "lookback_days": 30,
  "baselines": {
    "reward": {
      "mean": $baseline_reward,
      "stddev": $reward_stddev,
      "upper_bound": $(echo "$baseline_reward + 2 * $reward_stddev" | bc),
      "lower_bound": $(echo "$baseline_reward - 2 * $reward_stddev" | bc)
    },
    "duration": {
      "mean": $baseline_duration,
      "stddev": $duration_stddev,
      "upper_bound": $(echo "$baseline_duration + 2 * $duration_stddev" | bc)
    },
    "memory": {
      "mean": $baseline_memory
    }
  }
}
EOF
    
    echo -e "${GREEN}${CHECK}${NC} Baselines established:"
    echo -e "  ${DIM}Reward:${NC} $baseline_reward ± $reward_stddev"
    echo -e "  ${DIM}Duration:${NC} $baseline_duration ± $duration_stddev ms"
    echo -e "  ${DIM}Memory:${NC} $baseline_memory MB"
    
    log_success "Baselines established: reward=$baseline_reward, duration=$baseline_duration"
}

# ============================================================================
# ERROR FREQUENCY ANALYSIS
# ============================================================================

analyze_error_frequency() {
    log_info "=== ANALYZING ERROR FREQUENCY ==="
    
    echo -e "${CYAN}${BULLET}${NC} Analyzing error patterns..."
    
    # Query error frequency by type
    local error_analysis
    error_analysis=$(sqlite3 "$AGENTDB_PATH" << 'EOF'
SELECT 
    CASE 
        WHEN reward < 0.5 THEN 'CRITICAL_FAILURE'
        WHEN reward < 0.6 THEN 'CIRCUIT_BREAKER'
        WHEN reward < 0.7 THEN 'DEGRADATION'
        WHEN reward < 0.8 THEN 'WARNING'
        ELSE 'NORMAL'
    END as error_type,
    COUNT(*) as count,
    ROUND(AVG(reward), 3) as avg_reward,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
FROM episodes
WHERE created_at > strftime('%s', 'now', '-7 days')
GROUP BY error_type
ORDER BY count DESC;
EOF
)
    
    echo -e "${GREEN}${CHECK}${NC} Error frequency analysis (7 days):"
    echo "$error_analysis" | while IFS='|' read -r type count avg first last; do
        local age=$(( $(date +%s) - last ))
        echo -e "  ${YELLOW}$type${NC}: $count occurrences (avg reward: $avg, last: ${age}s ago)"
    done
    
    # Calculate error rate trend
    local recent_errors total_recent
    recent_errors=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes WHERE reward < 0.6 AND created_at > strftime('%s', 'now', '-24 hours')" 2>/dev/null || echo "0")
    total_recent=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes WHERE created_at > strftime('%s', 'now', '-24 hours')" 2>/dev/null || echo "1")
    
    local error_rate=$(echo "scale=3; $recent_errors / $total_recent" | bc)
    echo -e "  ${DIM}24h Error Rate:${NC} $(echo "$error_rate * 100" | bc)% ($recent_errors/$total_recent)"
    
    # Store for MPP learning trigger
    echo "$error_rate" > "./logs/error_rate.txt"
    
    log_info "Error rate: $error_rate ($recent_errors/$total_recent)"
}

# ============================================================================
# PARAMETERIZATION AUDIT
# ============================================================================

audit_parameterization() {
    log_info "=== AUDITING PARAMETERIZATION ==="
    
    echo -e "${CYAN}${BULLET}${NC} Auditing hardcoded parameters..."
    
    # Search for hardcoded values in scripts
    local hardcoded_count=0
    local files_with_hardcoded=()
    
    for script in "$SCRIPT_DIR"/*.sh; do
        if [ -f "$script" ] && grep -q -E '(THRESHOLD=0\.[0-9]|frequency=[0-9]+|interval=[0-9]+)' "$script" 2>/dev/null; then
            files_with_hardcoded+=("$(basename "$script")")
            hardcoded_count=$((hardcoded_count + 1))
        fi
    done
    
    if [ "$hardcoded_count" -gt 0 ]; then
        echo -e "${YELLOW}⚠️${NC}  Found $hardcoded_count scripts with hardcoded values:"
        for file in "${files_with_hardcoded[@]}"; do
            echo -e "    ${DIM}${BULLET} $file${NC}"
        done
    else
        echo -e "${GREEN}${CHECK}${NC} No hardcoded parameters found"
    fi
    
    # Check dynamic threshold coverage
    echo -e "${CYAN}${BULLET}${NC} Checking dynamic threshold coverage..."
    
    local thresholds=("circuit-breaker" "degradation" "cascade-failure" "divergence-rate" "check-frequency" "quantile-based")
    local dynamic_count=0
    
    for threshold in "${thresholds[@]}"; do
        if "$SCRIPT_DIR/ay-dynamic-thresholds.sh" "$threshold" orchestrator standup 2>/dev/null | grep -q "HIGH_CONFIDENCE"; then
            echo -e "  ${GREEN}${CHECK}${NC} $threshold: HIGH_CONFIDENCE"
            dynamic_count=$((dynamic_count + 1))
        else
            echo -e "  ${YELLOW}⚠️${NC}  $threshold: FALLBACK"
        fi
    done
    
    local coverage=$(echo "scale=2; $dynamic_count / ${#thresholds[@]} * 100" | bc)
    echo -e "  ${DIM}Coverage:${NC} $coverage% ($dynamic_count/${#thresholds[@]})"
    
    log_info "Parameterization audit: $hardcoded_count hardcoded, $coverage% dynamic coverage"
}

# ============================================================================
# PRE-ITERATION: GOVERNANCE REVIEW
# ============================================================================

governance_review() {
    log_info "=== PRE-ITERATION: GOVERNANCE REVIEW ==="
    
    echo -e "${CYAN}${BULLET}${NC} Running governance checks..."
    
    # Check 1: Health Status
    local health_output
    health_output=$("$SCRIPT_DIR/ay-unified.sh" health 2>/dev/null || echo "UNKNOWN")
    
    local health_percent
    health_percent=$(echo "$health_output" | grep -o '[0-9]\+%' | head -1 | tr -d '%' || echo "0")
    
    if [ "$health_percent" -ge 80 ]; then
        echo -e "  ${GREEN}${CHECK}${NC} Health: ${health_percent}% ${GREEN}(HEALTHY)${NC}"
    elif [ "$health_percent" -ge 50 ]; then
        echo -e "  ${YELLOW}⚠️${NC}  Health: ${health_percent}% ${YELLOW}(DEGRADED)${NC}"
    else
        echo -e "  ${RED}${CROSS}${NC} Health: ${health_percent}% ${RED}(CRITICAL)${NC}"
    fi
    
    # Check 2: Recent Episode Count
    local recent_count
    recent_count=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes WHERE created_at > strftime('%s', 'now', '-7 days')" 2>/dev/null || echo "0")
    
    if [ "$recent_count" -ge 10 ]; then
        echo -e "  ${GREEN}${CHECK}${NC} Recent episodes: $recent_count ${GREEN}(SUFFICIENT)${NC}"
    else
        echo -e "  ${YELLOW}⚠️${NC}  Recent episodes: $recent_count ${YELLOW}(INSUFFICIENT)${NC}"
    fi
    
    # Check 3: Error Rate
    local error_rate
    if [ -f "./logs/error_rate.txt" ]; then
        error_rate=$(cat "./logs/error_rate.txt")
        local error_percent=$(echo "$error_rate * 100" | bc)
        
        if (( $(echo "$error_rate < 0.1" | bc -l) )); then
            echo -e "  ${GREEN}${CHECK}${NC} Error rate: ${error_percent}% ${GREEN}(ACCEPTABLE)${NC}"
        else
            echo -e "  ${YELLOW}⚠️${NC}  Error rate: ${error_percent}% ${YELLOW}(HIGH)${NC}"
        fi
    fi
    
    # Check 4: Skills Validation
    echo -e "  ${CYAN}${BULLET}${NC} Validating skills..."
    
    local skills=("ay-auto-enhanced.sh" "ay-dynamic-thresholds.sh" "ay-threshold-monitor.sh" "ay-unified.sh")
    local valid_skills=0
    
    for skill in "${skills[@]}"; do
        if [ -x "$SCRIPT_DIR/$skill" ]; then
            valid_skills=$((valid_skills + 1))
        fi
    done
    
    if [ "$valid_skills" -eq "${#skills[@]}" ]; then
        echo -e "  ${GREEN}${CHECK}${NC} Skills: ${valid_skills}/${#skills[@]} validated"
    else
        echo -e "  ${YELLOW}⚠️${NC}  Skills: ${valid_skills}/${#skills[@]} validated"
    fi
    
    # Governance verdict
    echo -e "\n${BOLD}Governance Verdict:${NC}"
    
    if [ "$health_percent" -ge 80 ] && [ "$recent_count" -ge 10 ] && [ "$valid_skills" -eq "${#skills[@]}" ]; then
        echo -e "  ${GREEN}${CHECK} GO${NC} - All checks passed"
        return 0
    elif [ "$health_percent" -ge 50 ]; then
        echo -e "  ${YELLOW}⚠️  CONTINUE${NC} - Some issues detected"
        return 1
    else
        echo -e "  ${RED}${CROSS} NO_GO${NC} - Critical issues require attention"
        return 2
    fi
}

# ============================================================================
# POST-VALIDATION: RETROSPECTIVE ANALYSIS
# ============================================================================

retrospective_analysis() {
    log_info "=== POST-VALIDATION: RETROSPECTIVE ANALYSIS ==="
    
    echo -e "${CYAN}${BULLET}${NC} Analyzing iteration results..."
    
    # Compare current vs baseline
    if [ ! -f "./logs/baselines.json" ]; then
        echo -e "${YELLOW}⚠️${NC}  No baselines found, skipping comparison"
        return 0
    fi
    
    local baseline_reward current_reward
    baseline_reward=$(jq -r '.baselines.reward.mean' "./logs/baselines.json" 2>/dev/null || echo "0.75")
    current_reward=$(sqlite3 "$AGENTDB_PATH" \
        "SELECT ROUND(AVG(reward), 3) FROM episodes WHERE created_at > strftime('%s', 'now', '-1 hour')" 2>/dev/null || echo "0.75")
    
    local delta=$(echo "$current_reward - $baseline_reward" | bc)
    local delta_percent=$(echo "scale=1; $delta / $baseline_reward * 100" | bc)
    
    echo -e "  ${DIM}Reward:${NC}"
    echo -e "    Baseline: $baseline_reward"
    echo -e "    Current:  $current_reward"
    
    if (( $(echo "$delta > 0" | bc -l) )); then
        echo -e "    ${GREEN}↑ +${delta_percent}%${NC} (improved)"
    elif (( $(echo "$delta < 0" | bc -l) )); then
        echo -e "    ${RED}↓ ${delta_percent}%${NC} (degraded)"
    else
        echo -e "    ${BLUE}= 0%${NC} (stable)"
    fi
    
    # Identify patterns
    echo -e "\n${CYAN}${BULLET}${NC} Pattern analysis:"
    
    local patterns=$(sqlite3 "$AGENTDB_PATH" << 'EOF'
SELECT 
    CASE 
        WHEN LAG(reward) OVER (ORDER BY created_at) < reward THEN 'IMPROVING'
        WHEN LAG(reward) OVER (ORDER BY created_at) > reward THEN 'DEGRADING'
        ELSE 'STABLE'
    END as pattern,
    COUNT(*) as count
FROM episodes
WHERE created_at > strftime('%s', 'now', '-24 hours')
GROUP BY pattern;
EOF
)
    
    echo "$patterns" | while IFS='|' read -r pattern count; do
        echo -e "    ${DIM}${pattern}:${NC} $count occurrences"
    done
    
    log_info "Retrospective: delta=$delta_percent%, current=$current_reward"
}

# ============================================================================
# POST-RETRO: LEARNING CAPTURE (MPP TRIGGER)
# ============================================================================

capture_learning() {
    log_info "=== POST-RETRO: LEARNING CAPTURE ==="
    
    echo -e "${CYAN}${BULLET}${NC} Triggering MPP learning..."
    
    # Check if MPP learning should be triggered
    local error_rate
    error_rate=$(cat "./logs/error_rate.txt" 2>/dev/null || echo "0")
    
    local should_trigger=false
    
    # Trigger conditions
    if (( $(echo "$error_rate > 0.1" | bc -l) )); then
        echo -e "  ${YELLOW}${BULLET}${NC} Trigger: High error rate ($error_rate)"
        should_trigger=true
    fi
    
    # Check for recent performance degradation
    if [ -f "./logs/baselines.json" ]; then
        local baseline_reward current_reward
        baseline_reward=$(jq -r '.baselines.reward.mean' "./logs/baselines.json" 2>/dev/null || echo "0.75")
        current_reward=$(sqlite3 "$AGENTDB_PATH" \
            "SELECT ROUND(AVG(reward), 3) FROM episodes WHERE created_at > strftime('%s', 'now', '-1 hour')" 2>/dev/null || echo "0.75")
        
        if (( $(echo "$current_reward < $baseline_reward * 0.9" | bc -l) )); then
            echo -e "  ${YELLOW}${BULLET}${NC} Trigger: Performance degradation"
            should_trigger=true
        fi
    fi
    
    if [ "$should_trigger" = true ]; then
        echo -e "${GREEN}${CHECK}${NC} MPP learning triggered"
        
        # Export learning data
        local learning_file="./logs/mpp_learning_$(date +%Y%m%d_%H%M%S).json"
        
        cat > "$learning_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "trigger": "baseline_audit",
  "metrics": {
    "error_rate": $error_rate,
    "current_reward": $current_reward,
    "baseline_reward": $baseline_reward
  },
  "recommendations": [
    "Review recent episodes for failure patterns",
    "Adjust dynamic thresholds based on current distribution",
    "Consider increasing check frequency if error rate remains high"
  ]
}
EOF
        
        echo -e "  ${DIM}Learning data exported:${NC} $learning_file"
        log_success "MPP learning triggered, data exported to $learning_file"
    else
        echo -e "${GREEN}${CHECK}${NC} No learning trigger conditions met"
    fi
}

# ============================================================================
# RE-EXPORT DATA
# ============================================================================

reexport_data() {
    log_info "=== RE-EXPORTING DATA ==="
    
    echo -e "${CYAN}${BULLET}${NC} Exporting audit data..."
    
    local export_file="./logs/audit_export_$(date +%Y%m%d_%H%M%S).json"
    
    # Gather all audit data
    local baselines health_status error_analysis
    
    baselines=$(cat "./logs/baselines.json" 2>/dev/null || echo '{}')
    health_status=$("$SCRIPT_DIR/ay-unified.sh" health 2>/dev/null || echo "UNKNOWN")
    
    cat > "$export_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "audit_type": "baseline_comprehensive",
  "baselines": $baselines,
  "health_status": "$(echo "$health_status" | head -1)",
  "error_rate": $(cat "./logs/error_rate.txt" 2>/dev/null || echo "0"),
  "dynamic_threshold_coverage": "$(echo "$health_status" | grep -o '[0-9]\+%' | head -1 || echo '0%')",
  "episode_count": $(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes" 2>/dev/null || echo "0"),
  "recent_episodes": $(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes WHERE created_at > strftime('%s', 'now', '-7 days')" 2>/dev/null || echo "0")
}
EOF
    
    echo -e "${GREEN}${CHECK}${NC} Data exported to: $export_file"
    log_success "Audit data exported to $export_file"
}

# ============================================================================
# FULL AUDIT EXECUTION
# ============================================================================

run_full_audit() {
    echo -e "${BOLD}${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║           AY BASELINE AUDIT & GOVERNANCE SYSTEM                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    local start_time=$(date +%s)
    
    # Phase 1: Pre-Cycle
    echo -e "${BOLD}Phase 1: Pre-Cycle${NC}"
    establish_baselines
    echo ""
    
    # Phase 2: Analysis
    echo -e "${BOLD}Phase 2: Analysis${NC}"
    analyze_error_frequency
    echo ""
    audit_parameterization
    echo ""
    
    # Phase 3: Pre-Iteration
    echo -e "${BOLD}Phase 3: Pre-Iteration Governance${NC}"
    governance_review
    local governance_result=$?
    echo ""
    
    # Phase 4: Post-Validation
    echo -e "${BOLD}Phase 4: Post-Validation${NC}"
    retrospective_analysis
    echo ""
    
    # Phase 5: Post-Retro
    echo -e "${BOLD}Phase 5: Post-Retro Learning${NC}"
    capture_learning
    echo ""
    
    # Phase 6: Export
    echo -e "${BOLD}Phase 6: Data Export${NC}"
    reexport_data
    echo ""
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo -e "${BOLD}${GREEN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    AUDIT COMPLETE                              ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo -e "  ${DIM}Duration:${NC} ${duration}s"
    echo -e "  ${DIM}Log:${NC} $AUDIT_LOG"
    
    return $governance_result
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    case "${1:-full}" in
        baseline|baselines)
            establish_baselines
            ;;
        error|errors)
            analyze_error_frequency
            ;;
        param|parameterization)
            audit_parameterization
            ;;
        governance|review)
            governance_review
            ;;
        retro|retrospective)
            retrospective_analysis
            ;;
        learning|mpp)
            capture_learning
            ;;
        export)
            reexport_data
            ;;
        full|audit)
            run_full_audit
            ;;
        *)
            echo "Usage: $0 {baseline|error|param|governance|retro|learning|export|full}"
            echo ""
            echo "Commands:"
            echo "  baseline      - Establish performance baselines"
            echo "  error         - Analyze error frequency patterns"
            echo "  param         - Audit parameterization and hardcoded values"
            echo "  governance    - Run pre-iteration governance review"
            echo "  retro         - Retrospective analysis"
            echo "  learning      - Trigger MPP learning capture"
            echo "  export        - Export audit data"
            echo "  full          - Run complete audit workflow"
            exit 1
            ;;
    esac
}

main "$@"

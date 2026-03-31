#!/usr/bin/env bash
# Controlled Divergence Testing Framework
# Safe, monitored, rollback-ready MPP learning experiments

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Source dynamic reward calculator
source "$(dirname "${BASH_SOURCE[0]}")/lib/dynamic-reward-calculator.sh"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CONFIGURATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Default settings
DIVERGENCE_RATE="${DIVERGENCE_RATE:-0.1}"  # 10% imperfect by default
CIRCUIT_BREAKER_THRESHOLD=$(get_reward_threshold "circuit_breaker")
MAX_EPISODES="${MAX_EPISODES:-50}"  # Default episode limit
SLEEP_BETWEEN="${SLEEP_BETWEEN:-5}"  # Seconds between episodes
BACKUP_DB="${BACKUP_DB:-true}"  # Auto-backup before testing

# Circle classifications
SAFE_CIRCLES=(orchestrator analyst)  # No dependencies
MODERATE_CIRCLES=(innovator intuitive)  # Minimal dependencies
RISKY_CIRCLES=(assessor seeker)  # High dependencies

# Valid ceremonies per circle
declare -A CIRCLE_CEREMONIES=(
    [orchestrator]="standup"
    [assessor]="wsjf"
    [innovator]="retro"
    [analyst]="refine"
    [seeker]="replenish"
    [intuitive]="synthesis"
)

# Monitoring thresholds
MIN_REWARD=$(get_reward_threshold "min")
WARNING_REWARD=$(get_reward_threshold "warning")
MAX_FAILURES=10  # Max consecutive failures

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UTILITY FUNCTIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $*"
}

log_error() {
    echo -e "${RED}[✗]${NC} $*"
}

usage() {
    cat << EOF
Controlled Divergence Testing Framework

Usage: $0 [OPTIONS] <circle>

OPTIONS:
    --phase <1|2|3>         Test phase (default: 1)
                            1: Single safe circle, 10% divergence
                            2: Multiple circles, 15% divergence
                            3: Production learning, 20% divergence
    
    --divergence <0.0-1.0>  Divergence rate (default: 0.1)
    --episodes <N>          Number of episodes (default: 50)
    --circuit-breaker <0-1> Reward threshold to abort (default: 0.7)
    --no-backup             Skip database backup
    --monitor-only          Only monitor, don't run episodes
    --rollback              Restore from backup
    --report                Generate analysis report
    
CIRCLES:
    Safe: ${SAFE_CIRCLES[*]}
    Moderate: ${MODERATE_CIRCLES[*]}
    Risky: ${RISKY_CIRCLES[*]} (not recommended)

EXAMPLES:
    # Phase 1: Safe testing
    $0 --phase 1 orchestrator
    
    # Custom divergence
    $0 --divergence 0.15 --episodes 100 analyst
    
    # Monitor existing run
    $0 --monitor-only
    
    # Rollback after failure
    $0 --rollback

SAFETY FEATURES:
    ✓ Automatic database backup
    ✓ Circuit breaker on low reward
    ✓ Cascade failure detection
    ✓ Real-time monitoring
    ✓ Multi-dimensional validation
    ✓ Human-in-loop checkpoints

EOF
    exit 1
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SAFETY FUNCTIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

backup_database() {
    if [[ "$BACKUP_DB" != "true" ]]; then
        log_warning "Skipping backup (--no-backup flag set)"
        return
    fi
    
    if [[ ! -f agentdb.db ]]; then
        log_error "Database not found: agentdb.db"
        exit 1
    fi
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="agentdb.db.backup_${timestamp}"
    
    log_info "Backing up database to: $backup_file"
    cp agentdb.db "$backup_file"
    
    # Keep only last 5 backups
    ls -t agentdb.db.backup_* 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
    
    log_success "Database backed up"
}

rollback_database() {
    local latest_backup=$(ls -t agentdb.db.backup_* 2>/dev/null | head -n 1)
    
    if [[ -z "$latest_backup" ]]; then
        log_error "No backup found to rollback"
        exit 1
    fi
    
    log_warning "Rolling back to: $latest_backup"
    read -p "Are you sure? This will overwrite current database [y/N]: " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
    
    cp "$latest_backup" agentdb.db
    log_success "Database rolled back to: $latest_backup"
}

get_current_stats() {
    npx agentdb stats 2>/dev/null | grep -E "Episodes|Skills|Average Reward|Causal Edges" || true
}

get_average_reward() {
    npx agentdb stats 2>/dev/null | grep "Average Reward" | awk '{print $3}' || echo "0"
}

get_episode_count() {
    npx agentdb stats 2>/dev/null | grep "Episodes:" | awk '{print $2}' || echo "0"
}

get_skill_count() {
    npx agentdb stats 2>/dev/null | grep "Skills:" | awk '{print $2}' || echo "0"
}

check_circuit_breaker() {
    local current_reward=$(get_average_reward)
    
    if (( $(echo "$current_reward < $MIN_REWARD" | bc -l) )); then
        log_error "🚨 CIRCUIT BREAKER TRIGGERED!"
        log_error "Average Reward: $current_reward < $MIN_REWARD (ABORT THRESHOLD)"
        return 1
    fi
    
    if (( $(echo "$current_reward < $CIRCUIT_BREAKER_THRESHOLD" | bc -l) )); then
        log_warning "⚠️  Circuit breaker threshold reached"
        log_warning "Average Reward: $current_reward < $CIRCUIT_BREAKER_THRESHOLD"
        return 1
    fi
    
    return 0
}

detect_cascade_failures() {
    local recent_failures=$(grep -c "FAILED\|ERROR" /tmp/episode_*.json 2>/dev/null || echo "0")
    
    if (( recent_failures > MAX_FAILURES )); then
        log_error "🚨 CASCADE FAILURE DETECTED!"
        log_error "Recent failures: $recent_failures > $MAX_FAILURES"
        return 1
    fi
    
    return 0
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TESTING FUNCTIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

run_divergence_episode() {
    local circle="$1"
    local ceremony="${CIRCLE_CEREMONIES[$circle]}"
    local episode_num="$2"
    
    log_info "Running episode $episode_num/$MAX_EPISODES for $circle::$ceremony"
    
    # Export divergence settings
    export DIVERGENCE_RATE
    export ALLOW_VARIANCE=1
    export MPP_ENABLED=1
    
    # Run ceremony
    if ! ./scripts/ay-prod-cycle.sh "$circle" "$ceremony" advisory 2>&1 | grep -v "^$"; then
        log_warning "Episode $episode_num failed or had issues"
        return 1
    fi
    
    return 0
}

run_test_phase() {
    local phase="$1"
    local circle="${2:-}"
    
    case "$phase" in
        1)
            log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            log_info "PHASE 1: Safe Testing (Single Circle)"
            log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            
            if [[ -z "$circle" ]]; then
                circle="orchestrator"  # Default safe circle
            fi
            
            # Validate it's a safe circle
            if [[ ! " ${SAFE_CIRCLES[*]} " =~ " ${circle} " ]]; then
                log_warning "Circle '$circle' is not classified as safe"
                read -p "Continue anyway? [y/N]: " -n 1 -r
                echo
                [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
            fi
            
            DIVERGENCE_RATE=0.1
            MAX_EPISODES=50
            ;;
            
        2)
            log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            log_info "PHASE 2: Multi-Circle Testing"
            log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            
            DIVERGENCE_RATE=0.15
            MAX_EPISODES=100
            
            log_info "Testing circles: ${SAFE_CIRCLES[*]} ${MODERATE_CIRCLES[*]}"
            
            for test_circle in "${SAFE_CIRCLES[@]}" "${MODERATE_CIRCLES[@]}"; do
                log_info "Starting divergence testing for: $test_circle"
                run_divergence_test "$test_circle"
                
                if ! check_circuit_breaker; then
                    log_error "Circuit breaker triggered on circle: $test_circle"
                    return 1
                fi
                
                sleep 10  # Cool-down between circles
            done
            return 0
            ;;
            
        3)
            log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            log_info "PHASE 3: Production Learning (HIGH RISK)"
            log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            
            log_warning "This will enable divergence on ALL circles"
            read -p "Are you sure? [y/N]: " -n 1 -r
            echo
            [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
            
            DIVERGENCE_RATE=0.2
            MAX_EPISODES=200
            
            log_info "Enabling production learning mode..."
            # Would test all circles here
            ;;
            
        *)
            log_error "Invalid phase: $phase"
            exit 1
            ;;
    esac
    
    # Run single circle test
    if [[ -n "$circle" ]]; then
        run_divergence_test "$circle"
    fi
}

run_divergence_test() {
    local circle="$1"
    
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "Starting Divergence Test"
    log_info "Circle: $circle"
    log_info "Divergence Rate: $DIVERGENCE_RATE"
    log_info "Episodes: $MAX_EPISODES"
    log_info "Circuit Breaker: $CIRCUIT_BREAKER_THRESHOLD"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Record starting stats
    local start_episodes=$(get_episode_count)
    local start_skills=$(get_skill_count)
    local start_reward=$(get_average_reward)
    
    log_info "Starting Stats:"
    log_info "  Episodes: $start_episodes"
    log_info "  Skills: $start_skills"
    log_info "  Avg Reward: $start_reward"
    echo
    
    # Run episodes
    local failure_count=0
    for i in $(seq 1 "$MAX_EPISODES"); do
        log_info "━━━ Episode $i/$MAX_EPISODES ━━━"
        
        if run_divergence_episode "$circle" "$i"; then
            failure_count=0
        else
            ((failure_count++))
            log_warning "Consecutive failures: $failure_count"
        fi
        
        # Check safety conditions every 10 episodes
        if (( i % 10 == 0 )); then
            log_info "Checkpoint at episode $i..."
            
            if ! check_circuit_breaker; then
                log_error "Aborting at episode $i due to circuit breaker"
                return 1
            fi
            
            if ! detect_cascade_failures; then
                log_error "Aborting at episode $i due to cascade failures"
                return 1
            fi
            
            # Show progress
            local current_episodes=$(get_episode_count)
            local current_skills=$(get_skill_count)
            local current_reward=$(get_average_reward)
            
            log_info "Progress Update:"
            log_info "  Episodes: $start_episodes → $current_episodes (+$((current_episodes - start_episodes)))"
            log_info "  Skills: $start_skills → $current_skills (+$((current_skills - start_skills)))"
            log_info "  Avg Reward: $start_reward → $current_reward"
            echo
        fi
        
        sleep "$SLEEP_BETWEEN"
    done
    
    # Final report
    log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "Divergence Test Complete!"
    log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    generate_report "$circle" "$start_episodes" "$start_skills" "$start_reward"
}

generate_report() {
    local circle="$1"
    local start_episodes="$2"
    local start_skills="$3"
    local start_reward="$4"
    
    local end_episodes=$(get_episode_count)
    local end_skills=$(get_skill_count)
    local end_reward=$(get_average_reward)
    
    cat << EOF

📊 DIVERGENCE TEST REPORT
═══════════════════════════════════════════

Circle: $circle
Divergence Rate: $DIVERGENCE_RATE
Episodes Run: $MAX_EPISODES

RESULTS:
────────────────────────────────────────────
Episodes:    $start_episodes → $end_episodes (+$((end_episodes - start_episodes)))
Skills:      $start_skills → $end_skills (+$((end_skills - start_skills)))
Avg Reward:  $start_reward → $end_reward

ANALYSIS:
────────────────────────────────────────────
EOF

    # Skills learned?
    if (( end_skills > start_skills )); then
        log_success "✓ Skills learned: +$((end_skills - start_skills))"
    else
        log_warning "⚠ No new skills learned"
    fi
    
    # Reward maintained?
    if (( $(echo "$end_reward >= $start_reward * 0.9" | bc -l) )); then
        log_success "✓ Reward maintained (within 10%)"
    elif (( $(echo "$end_reward >= $CIRCUIT_BREAKER_THRESHOLD" | bc -l) )); then
        log_warning "⚠ Reward decreased but above threshold"
    else
        log_error "✗ Reward dropped below threshold"
    fi
    
    # Episodes recorded?
    local expected=$((start_episodes + MAX_EPISODES))
    if (( end_episodes >= expected * 95 / 100 )); then
        log_success "✓ Most episodes recorded successfully"
    else
        log_warning "⚠ Some episodes may have failed"
    fi
    
    echo
    echo "RECOMMENDATIONS:"
    echo "────────────────────────────────────────────"
    
    if (( end_skills > start_skills )) && (( $(echo "$end_reward >= 0.8" | bc -l) )); then
        log_success "✓ Safe to proceed to next phase"
    elif (( end_skills == start_skills )); then
        log_warning "⚠ Increase divergence rate or episodes"
    else
        log_warning "⚠ Review learned patterns before proceeding"
    fi
    
    echo
    echo "Next steps:"
    echo "  • Review skills: npx agentdb skill export --circle $circle"
    echo "  • Validate patterns: ./scripts/validate-learned-skills.sh $circle"
    echo "  • Expand testing: $0 --phase 2"
    echo
}

monitor_mode() {
    log_info "Starting real-time monitoring (Ctrl+C to exit)"
    echo
    
    while true; do
        clear
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  DIVERGENCE LEARNING MONITOR"
        echo "  $(date '+%Y-%m-%d %H:%M:%S')"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo
        
        get_current_stats
        
        echo
        echo "Recent Activity:"
        echo "────────────────────────────────────────────"
        
        local recent_failures=$(grep -c "FAILED\|ERROR" /tmp/episode_*.json 2>/dev/null || echo "0")
        echo "Recent Failures: $recent_failures"
        
        local current_reward=$(get_average_reward)
        if (( $(echo "$current_reward < $WARNING_REWARD" | bc -l) )); then
            log_warning "⚠️  Reward below warning threshold: $current_reward"
        else
            log_success "✓ Reward healthy: $current_reward"
        fi
        
        echo
        echo "Press Ctrl+C to exit monitoring"
        sleep 10
    done
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MAIN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

main() {
    local phase=1
    local circle=""
    local monitor_only=false
    local rollback=false
    local report_only=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --phase)
                phase="$2"
                shift 2
                ;;
            --divergence)
                DIVERGENCE_RATE="$2"
                shift 2
                ;;
            --episodes)
                MAX_EPISODES="$2"
                shift 2
                ;;
            --circuit-breaker)
                CIRCUIT_BREAKER_THRESHOLD=$(get_reward_threshold "circuit_breaker")
                shift 2
                ;;
            --no-backup)
                BACKUP_DB=false
                shift
                ;;
            --monitor-only)
                monitor_only=true
                shift
                ;;
            --rollback)
                rollback=true
                shift
                ;;
            --report)
                report_only=true
                shift
                ;;
            --help|-h)
                usage
                ;;
            *)
                circle="$1"
                shift
                ;;
        esac
    done
    
    # Handle special modes
    if [[ "$rollback" == "true" ]]; then
        rollback_database
        exit 0
    fi
    
    if [[ "$monitor_only" == "true" ]]; then
        monitor_mode
        exit 0
    fi
    
    if [[ "$report_only" == "true" ]]; then
        get_current_stats
        exit 0
    fi
    
    # Validate circle if provided
    if [[ -n "$circle" ]] && [[ ! -v "CIRCLE_CEREMONIES[$circle]" ]]; then
        log_error "Invalid circle: $circle"
        echo "Valid circles: ${!CIRCLE_CEREMONIES[*]}"
        exit 1
    fi
    
    # Backup before starting
    backup_database
    
    # Run test phase
    run_test_phase "$phase" "$circle"
    
    log_success "All tests complete!"
}

main "$@"

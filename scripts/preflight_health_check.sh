#!/usr/bin/env bash

#############################################
# Pre-Flight Health Check for af prod-cycle
# Comprehensive system, infrastructure, and evidence validation
#############################################

set -euo pipefail

# === CONFIGURATION ===
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly HEALTH_LOG="$PROJECT_ROOT/.goalie/preflight_health.json"
readonly TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Thresholds
readonly CPU_IDLE_MIN=20.0
readonly LOAD_AVG_MAX=50.0
readonly MEMORY_AVAILABLE_MIN_GB=10
readonly DISK_FREE_MIN_GB=20
readonly IDE_PROC_MAX=50
readonly WARP_MEMORY_MAX_GB=50

# Required scripts for prod-cycle
declare -A REQUIRED_SCRIPTS=(
    ["cmd_prod_cycle.py"]="Core production cycle runner"
    ["cmd_tier_depth_coverage.py"]="Maturity coverage tracking"
    ["agentic/revenue_attribution.py"]="Economic compounding evidence"
    ["orchestrate_continuous_improvement.py"]="Post-cycle analysis"
    ["verify_logger_enhanced.py"]="Logger verification"
    ["verify_system_improvements.py"]="System validation"
    ["validate_learning_parity.py"]="Learning parity check"
)

# Optional but recommended scripts
declare -A OPTIONAL_SCRIPTS=(
    ["temporal/budget_tracker.py"]="Budget tracking"
    ["agentdb/audit_agentdb.py"]="AgentDB audit"
    ["analysis/check_pattern_tag_coverage.py"]="Pattern coverage"
    ["execution/wip_monitor.py"]="WIP monitoring"
    ["monitoring/site_health_monitor.py"]="Site health"
    ["monitoring/heartbeat_monitor.py"]="Heartbeat monitoring"
)

# .goalie scripts pending integration
declare -A GOALIE_PENDING=(
    ["QUICK_ACTIONS.sh"]="Quick health checks - integrate as 'af quick-health'"
    ["measure_system_state.sh"]="System state baseline - integrate as 'af system-health'"
)

# === UTILITIES ===
log_info() {
    echo -e "\033[1;32m✓ $1\033[0m"
}

log_warn() {
    echo -e "\033[1;33m⚠️  $1\033[0m"
}

log_error() {
    echo -e "\033[1;31m✗ $1\033[0m"
}

log_critical() {
    echo -e "\033[1;31m🚨 CRITICAL: $1\033[0m"
}

# === HEALTH CHECKS ===

check_system_resources() {
    echo "=== System Resources ==="
    
    # CPU Check
    local cpu_idle=$(top -l 2 -n 0 -s 1 2>/dev/null | grep "CPU usage" | tail -1 | awk '{print $7}' | tr -d '%' || echo "0")
    cpu_idle=${cpu_idle:-0}
    
    if (( $(echo "$cpu_idle < $CPU_IDLE_MIN" | bc -l) )); then
        log_error "CPU idle: ${cpu_idle}% (min: ${CPU_IDLE_MIN}%)"
        echo "  Recommendation: Close unnecessary applications"
        return 1
    else
        log_info "CPU idle: ${cpu_idle}%"
    fi
    
    # Load Average
    local load_1min=$(uptime | awk -F'load averages: ' '{print $2}' | awk '{print $1}' | tr -d ',' || echo "0")
    load_1min=${load_1min:-0}
    
    if (( $(echo "$load_1min > $LOAD_AVG_MAX" | bc -l) )); then
        log_warn "Load average: $load_1min (max: $LOAD_AVG_MAX)"
        echo "  Recommendation: System under heavy load, consider waiting"
    else
        log_info "Load average: $load_1min"
    fi
    
    # Memory Check
    local mem_free_gb=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.' | awk '{print $1 * 4096 / 1024 / 1024 / 1024}' || echo "0")
    mem_free_gb=${mem_free_gb:-0}
    
    if (( $(echo "$mem_free_gb < $MEMORY_AVAILABLE_MIN_GB" | bc -l) )); then
        log_warn "Memory available: ${mem_free_gb}GB (min: ${MEMORY_AVAILABLE_MIN_GB}GB)"
        echo "  Recommendation: Close memory-intensive applications"
    else
        log_info "Memory available: ${mem_free_gb}GB"
    fi
    
    # Disk Space
    local disk_free_gb=$(df -H / | tail -1 | awk '{print $4}' | tr -d 'G' || echo "0")
    disk_free_gb=${disk_free_gb:-0}
    
    if (( $(echo "$disk_free_gb < $DISK_FREE_MIN_GB" | bc -l) )); then
        log_error "Disk space: ${disk_free_gb}GB (min: ${DISK_FREE_MIN_GB}GB)"
        echo "  Recommendation: Free up disk space before long runs"
        return 1
    else
        log_info "Disk space: ${disk_free_gb}GB"
    fi
    
    return 0
}

check_infrastructure_health() {
    echo ""
    echo "=== Infrastructure Health ==="
    
    # IDE Process Count
    local vscode_procs=$(ps aux | grep -i 'Visual Studio Code\|Code Helper' | grep -v grep | wc -l | xargs || echo "0")
    local cursor_procs=$(ps aux | grep -i 'Cursor' | grep -v grep | wc -l | xargs || echo "0")
    local zed_procs=$(ps aux | grep -i 'Zed' | grep -v grep | wc -l | xargs || echo "0")
    local warp_procs=$(ps aux | grep -i 'Warp' | grep -v grep | wc -l | xargs || echo "0")
    local total_ide=$((vscode_procs + cursor_procs + zed_procs + warp_procs))
    
    if (( total_ide > IDE_PROC_MAX )); then
        log_warn "IDE processes: $total_ide (max: $IDE_PROC_MAX)"
        echo "  VSCode: $vscode_procs | Cursor: $cursor_procs | Zed: $zed_procs | Warp: $warp_procs"
        echo "  Recommendation: Close unused IDE windows"
    else
        log_info "IDE processes: $total_ide"
    fi
    
    # Warp Terminal Health (if applicable)
    if [ "$AF_CHECK_INFRA_HEALTH" = "1" ] && [ -f "$PROJECT_ROOT/warp_health_monitor.sh" ]; then
        log_info "Checking Warp terminal health..."
        
        if "$PROJECT_ROOT/warp_health_monitor.sh" --once > /tmp/warp_health.txt 2>&1; then
            local warp_status=$(cat /tmp/warp_health.txt | grep -o 'CRITICAL\|WARNING\|INFO' | head -1 || echo "UNKNOWN")
            
            case "$warp_status" in
                CRITICAL)
                    log_critical "Warp terminal in critical state"
                    cat /tmp/warp_health.txt
                    echo "  Recommendation: Restart Warp before long-running prod-cycle"
                    return 1
                    ;;
                WARNING)
                    log_warn "Warp terminal has warnings"
                    cat /tmp/warp_health.txt
                    ;;
                *)
                    log_info "Warp terminal healthy"
                    ;;
            esac
        fi
    fi
    
    return 0
}

check_required_scripts() {
    echo ""
    echo "=== Required Scripts ==="
    
    local missing_count=0
    
    for script in "${!REQUIRED_SCRIPTS[@]}"; do
        if [ -f "$SCRIPT_DIR/$script" ]; then
            log_info "$script: ${REQUIRED_SCRIPTS[$script]}"
        else
            log_error "$script: MISSING (${REQUIRED_SCRIPTS[$script]})"
            ((missing_count++))
        fi
    done
    
    if (( missing_count > 0 )); then
        log_critical "$missing_count required script(s) missing"
        return 1
    fi
    
    return 0
}

check_optional_scripts() {
    echo ""
    echo "=== Optional Scripts ==="
    
    local missing_count=0
    
    for script in "${!OPTIONAL_SCRIPTS[@]}"; do
        if [ -f "$SCRIPT_DIR/$script" ]; then
            log_info "$script: ${OPTIONAL_SCRIPTS[$script]}"
        else
            log_warn "$script: Not found (${OPTIONAL_SCRIPTS[$script]})"
            ((missing_count++))
        fi
    done
    
    if (( missing_count > 0 )); then
        log_warn "$missing_count optional script(s) not available"
        echo "  Note: These provide enhanced telemetry but are not required"
    fi
    
    return 0
}

check_goalie_pending_integration() {
    echo ""
    echo "=== .goalie Scripts Pending Integration ==="
    
    for script in "${!GOALIE_PENDING[@]}"; do
        if [ -f "$PROJECT_ROOT/.goalie/$script" ]; then
            log_warn "$script: ${GOALIE_PENDING[$script]}"
        else
            log_info "$script: Not present"
        fi
    done
    
    echo ""
    echo "  📋 Escalation: These scripts should be integrated into 'af' CLI"
    echo "  Priority: P2 (Medium) - See docs/SCRIPT_INTEGRATION_TRACKER.md"
    
    return 0
}

check_evidence_config() {
    echo ""
    echo "=== Evidence Configuration ==="
    
    if [ -f "$PROJECT_ROOT/.goalie/evidence_config.json" ]; then
        log_info "Evidence config: .goalie/evidence_config.json"
        
        # Check for circuit breaker config
        if grep -q "circuit_breaker" "$PROJECT_ROOT/.goalie/evidence_config.json"; then
            log_info "Circuit breaker: Configured"
        else
            log_warn "Circuit breaker: Not configured"
            echo "  Recommendation: Add circuit breaker to prevent WSJF-enrichment failures"
        fi
        
        # Check autocommit graduation config
        if grep -q "autocommit_graduation" "$PROJECT_ROOT/.goalie/evidence_config.json"; then
            local green_streak=$(jq -r '.autocommit_graduation.green_streak_required' "$PROJECT_ROOT/.goalie/evidence_config.json" 2>/dev/null || echo "unknown")
            local min_stability=$(jq -r '.autocommit_graduation.min_stability_score' "$PROJECT_ROOT/.goalie/evidence_config.json" 2>/dev/null || echo "unknown")
            
            log_info "Graduation thresholds: green_streak=$green_streak, stability=$min_stability"
            
            # Check against RCA recommendations
            if [ "$green_streak" != "unknown" ] && (( $(echo "$green_streak < 5" | bc -l) )); then
                log_warn "Green streak ($green_streak) below RCA recommendation (5)"
            fi
            
            if [ "$min_stability" != "unknown" ] && (( $(echo "$min_stability < 85" | bc -l) )); then
                log_warn "Min stability ($min_stability%) below RCA recommendation (85%)"
            fi
        else
            log_warn "Autocommit graduation: Not configured"
        fi
    else
        log_error "Evidence config: NOT FOUND"
        return 1
    fi
    
    return 0
}

check_pattern_coverage() {
    echo ""
    echo "=== Pattern Coverage ==="
    
    # Check if intent-coverage is available
    if [ -f "$SCRIPT_DIR/af" ]; then
        log_info "Testing pattern coverage..."
        
        if timeout 10s "$SCRIPT_DIR/af" intent-coverage --json > /tmp/intent_coverage.json 2>&1; then
            local hit_pct=$(jq -r '.pattern_hit_pct' /tmp/intent_coverage.json 2>/dev/null || echo "unknown")
            
            if [ "$hit_pct" != "unknown" ]; then
                if (( $(echo "$hit_pct < 60" | bc -l) )); then
                    log_warn "Pattern hit: ${hit_pct}% (min: 60%)"
                else
                    log_info "Pattern hit: ${hit_pct}%"
                fi
            fi
        else
            log_warn "Pattern coverage check timed out or failed"
        fi
    else
        log_warn "af CLI not found, skipping pattern coverage"
    fi
    
    return 0
}

# === MAIN EXECUTION ===

main() {
    local exit_code=0
    local mode="${1:-strict}"  # strict|permissive
    
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           AF PROD-CYCLE PRE-FLIGHT HEALTH CHECK              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Mode: $mode"
    echo "Timestamp: $TIMESTAMP"
    echo ""
    
    # Run all checks
    check_system_resources || exit_code=$?
    check_infrastructure_health || exit_code=$?
    check_required_scripts || exit_code=$?
    check_optional_scripts || exit_code=$?  # Never fails
    check_goalie_pending_integration || exit_code=$?  # Never fails
    check_evidence_config || exit_code=$?
    check_pattern_coverage || exit_code=$?  # Never fails
    
    echo ""
    echo "=== Summary ==="
    
    if (( exit_code == 0 )); then
        log_info "All critical checks passed"
        echo ""
        echo "✅ READY FOR PROD-CYCLE"
        
        # Save health snapshot
        cat > "$HEALTH_LOG" << EOF
{
  "timestamp": "$TIMESTAMP",
  "status": "READY",
  "mode": "$mode",
  "exit_code": 0
}
EOF
        
        return 0
    else
        log_error "Some checks failed (exit code: $exit_code)"
        echo ""
        
        if [ "$mode" = "strict" ]; then
            echo "🚫 BLOCKED: Fix critical issues before proceeding"
            echo ""
            echo "To bypass (not recommended):"
            echo "  $0 permissive"
            
            # Save health snapshot
            cat > "$HEALTH_LOG" << EOF
{
  "timestamp": "$TIMESTAMP",
  "status": "BLOCKED",
  "mode": "$mode",
  "exit_code": $exit_code
}
EOF
            
            return $exit_code
        else
            log_warn "PERMISSIVE MODE: Proceeding despite failures"
            echo ""
            
            # Save health snapshot
            cat > "$HEALTH_LOG" << EOF
{
  "timestamp": "$TIMESTAMP",
  "status": "PROCEED_WITH_WARNINGS",
  "mode": "$mode",
  "exit_code": $exit_code
}
EOF
            
            return 0
        fi
    fi
}

# Allow sourcing without execution
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi

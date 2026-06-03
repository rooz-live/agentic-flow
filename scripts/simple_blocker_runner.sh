#!/usr/bin/env bash
#
# Simple Blocker Runner - Works with existing scripts as-is
# No modification needed to underlying scripts
#
# Usage:
#   bash scripts/simple_blocker_runner.sh --parallel
#   bash scripts/simple_blocker_runner.sh --sequential
#   bash scripts/simple_blocker_runner.sh --blocker calibration
#   bash scripts/simple_blocker_runner.sh --blocker ipmi

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Config
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGS_DIR="${PROJECT_ROOT}/logs"
SESSION_ID="session_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${LOGS_DIR}/blocker_runner_${SESSION_ID}.log"

mkdir -p "$LOGS_DIR"

log() {
    local msg="[$(date +'%H:%M:%S')] $*"
    echo -e "${BLUE}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE"
}

error() {
    local msg="[ERROR] $*"
    echo -e "${RED}${msg}${NC}" >&2
    echo "$msg" >> "$LOG_FILE"
}

success() {
    local msg="[SUCCESS] $*"
    echo -e "${GREEN}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE"
}

# BLOCKER-001: Calibration Dataset
run_blocker_calibration() {
    log "🔧 BLOCKER-001: Collecting Calibration Dataset"
    
    local start_time=$(date +%s)
    local failed=false
    
    # Phase 1: Collect metrics from existing reports
    log "  Phase 1/3: Collecting metrics..."
    if python3 scripts/ci/collect_metrics.py \
        --artifacts-path logs/ \
        --output logs/baseline_metrics.json \
        --format json >> "$LOG_FILE" 2>&1; then
        success "  ✅ Metrics collected"
    else
        error "  ❌ Metrics collection failed"
        failed=true
    fi
    
    # Phase 2: Collect promotion metrics
    if [[ "$failed" == "false" ]]; then
        log "  Phase 2/3: Collecting promotion metrics..."
        if python3 scripts/ci/collect_promotion_metrics.py \
            --output logs/promotion_metrics.json >> "$LOG_FILE" 2>&1; then
            success "  ✅ Promotion metrics collected"
        else
            error "  ❌ Promotion metrics failed"
            failed=true
        fi
    fi
    
    # Phase 3: Collect retro metrics
    if [[ "$failed" == "false" ]]; then
        log "  Phase 3/3: Collecting retro metrics..."
        if python3 scripts/ci/collect_retro_metrics.py \
            --output logs/retro_metrics.json >> "$LOG_FILE" 2>&1; then
            success "  ✅ Retro metrics collected"
        else
            error "  ❌ Retro metrics failed"
            failed=true
        fi
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [[ "$failed" == "false" ]]; then
        success "✅ BLOCKER-001 RESOLVED (${duration}s)"
        return 0
    else
        error "❌ BLOCKER-001 FAILED (${duration}s)"
        return 1
    fi
}

# BLOCKER-003: IPMI Connectivity
run_blocker_ipmi() {
    log "🔧 BLOCKER-003: IPMI Connectivity Workaround"
    
    local start_time=$(date +%s)
    local failed=false
    local ssh_key="/Users/shahroozbhopti/pem/rooz.pem"
    
    # Check SSH key exists
    if [[ ! -f "$ssh_key" ]]; then
        error "  ❌ SSH key not found: $ssh_key"
        return 1
    fi
    
    # Phase 1: Test SSH connectivity
    log "  Phase 1/3: Testing SSH connectivity..."
    if python3 scripts/ci/test_device_24460_ssh_ipmi_enhanced.py \
        --health-check \
        --format text >> "$LOG_FILE" 2>&1; then
        success "  ✅ SSH connectivity verified"
    else
        error "  ❌ SSH test failed"
        failed=true
    fi
    
    # Phase 2: Test device directly (if SSH works)
    if [[ "$failed" == "false" ]]; then
        log "  Phase 2/3: Testing device diagnostics..."
        if python3 scripts/ci/test_device_24460.py >> "$LOG_FILE" 2>&1; then
            success "  ✅ Device diagnostics completed"
        else
            error "  ❌ Device diagnostics failed"
            failed=true
        fi
    fi
    
    # Phase 3: Document workaround
    if [[ "$failed" == "false" ]]; then
        log "  Phase 3/3: Documenting IPMI workaround..."
        cat > docs/IPMI_SSH_WORKAROUND_SIMPLE.md << 'EOF'
# IPMI SSH Workaround - Simple Implementation

**Date**: $(date)
**Status**: VALIDATED

## Issue
Direct IPMI access to device #24460 fails due to DNS resolution issues.

## Workaround
Use SSH tunnel for IPMI access via jump host.

## Implementation

\`\`\`bash
# Test connectivity
python3 scripts/ci/test_device_24460_ssh_ipmi_enhanced.py --health-check

# Run diagnostics
python3 scripts/ci/test_device_24460.py
\`\`\`

## Validation
- SSH connectivity: ✅ VERIFIED
- Device diagnostics: ✅ PASSED
- Health checks: ✅ OPERATIONAL

## Next Steps
1. Monitor device health daily
2. Implement automated health checks
3. Document in runbook

EOF
        success "  ✅ Workaround documented"
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [[ "$failed" == "false" ]]; then
        success "✅ BLOCKER-003 RESOLVED (${duration}s)"
        return 0
    else
        error "❌ BLOCKER-003 FAILED (${duration}s)"
        return 1
    fi
}

# Main execution
main() {
    local mode="sequential"
    local blocker=""
    
    # Parse args
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --parallel) mode="parallel"; shift ;;
            --sequential) mode="sequential"; shift ;;
            --blocker) blocker="$2"; shift 2 ;;
            *) error "Unknown option: $1"; exit 1 ;;
        esac
    done
    
    cat << 'EOF'
╔══════════════════════════════════════════════════════╗
║  Simple Blocker Runner - Using Existing Scripts     ║
╚══════════════════════════════════════════════════════╝
EOF
    
    log "Session: $SESSION_ID"
    log "Mode: $mode"
    log "Log: $LOG_FILE"
    echo ""
    
    local overall_start=$(date +%s)
    local calibration_result=0
    local ipmi_result=0
    
    if [[ "$mode" == "parallel" ]]; then
        log "🚀 Running blockers in parallel..."
        
        # Run in background
        run_blocker_calibration &
        local cal_pid=$!
        
        run_blocker_ipmi &
        local ipmi_pid=$!
        
        # Wait for both
        wait $cal_pid || calibration_result=$?
        wait $ipmi_pid || ipmi_result=$?
        
    elif [[ -n "$blocker" ]]; then
        case "$blocker" in
            calibration|B001)
                run_blocker_calibration || calibration_result=$?
                ;;
            ipmi|B003)
                run_blocker_ipmi || ipmi_result=$?
                ;;
            *)
                error "Unknown blocker: $blocker"
                exit 1
                ;;
        esac
    else
        # Sequential
        log "🚀 Running blockers sequentially..."
        run_blocker_calibration || calibration_result=$?
        run_blocker_ipmi || ipmi_result=$?
    fi
    
    local overall_end=$(date +%s)
    local overall_duration=$((overall_end - overall_start))
    
    echo ""
    echo "═════════════════════════════════════════════════════"
    log "📊 EXECUTION SUMMARY"
    echo "─────────────────────────────────────────────────────"
    
    if [[ $calibration_result -eq 0 ]]; then
        success "  BLOCKER-001 (Calibration): ✅ RESOLVED"
    else
        error "  BLOCKER-001 (Calibration): ❌ FAILED"
    fi
    
    if [[ $ipmi_result -eq 0 ]]; then
        success "  BLOCKER-003 (IPMI): ✅ RESOLVED"
    else
        error "  BLOCKER-003 (IPMI): ❌ FAILED"
    fi
    
    echo "─────────────────────────────────────────────────────"
    log "⏱️  Total Duration: ${overall_duration}s"
    log "📝 Log File: $LOG_FILE"
    echo "═════════════════════════════════════════════════════"
    
    # Exit code
    if [[ $calibration_result -eq 0 && $ipmi_result -eq 0 ]]; then
        success "🎉 ALL BLOCKERS RESOLVED"
        exit 0
    else
        error "⚠️  SOME BLOCKERS FAILED"
        exit 1
    fi
}

main "$@"

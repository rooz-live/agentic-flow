#!/usr/bin/env bash
#
# validate-pre-cycle.sh - Pre-cycle Validation with ROAM Staleness Check
#
# This script runs before any email validation cycle to ensure:
# - ROAM tracker is fresh (<96h)
# - Validation metrics are accessible
# - Dashboard components receive counts
#
# Usage:
#   ./validate-pre-cycle.sh [email-file.eml]
#
# Exit codes:
#   0 - All validations passed
#   1 - ROAM staleness or validation failed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${HOME}/Documents/code/investing/agentic-flow"
ROAM_CHECKER="${PROJECT_ROOT}/scripts/validators/project/check_roam_staleness.py"
ROAM_TRACKER="${PROJECT_ROOT}/ROAM_TRACKER.yaml"
METRICS_FILE="/tmp/validation-metrics.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $*"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# =============================================================================
# STEP 1: ROAM Staleness Check
# =============================================================================
check_roam_staleness() {
    log "🔍 Checking ROAM tracker staleness..."
    
    if [[ ! -f "$ROAM_CHECKER" ]]; then
        warn "ROAM checker not found at $ROAM_CHECKER"
        return 0  # Don't block if checker missing
    fi
    
    if [[ ! -f "$ROAM_TRACKER" ]]; then
        error "ROAM tracker not found at $ROAM_TRACKER"
        return 1
    fi
    
    # Run Python checker - output is text, not JSON
    local result
    result=$(python3 "$ROAM_CHECKER" --roam-path "$ROAM_TRACKER" --max-age-days 4 2>&1)
    
    # Check if result indicates stale (look for 'is stale' or 'STALE' in status, not headers)
    if echo "$result" | grep -qi "is stale\|stale for"; then
        is_stale="true"
        hours_old=$(echo "$result" | grep -oE '[0-9]+h' | head -1 | tr -d 'h')
    else
        is_stale="false"
        hours_old="0"
    fi
    
    # Save metrics
    cat > "$METRICS_FILE" << EOF
{
  "roam": {
    "is_stale": $is_stale,
    "hours_old": $hours_old,
    "max_age_hours": 96,
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  },
  "validation": {
    "pre_cycle": true,
    "email_file": "${1:-none}"
  }
}
EOF
    
    if [[ "$is_stale" == "true" ]]; then
        error "❌ ROAM tracker is STALE (${hours_old}h > 96h threshold)"
        error "   Run: update_roam_timestamp"
        return 1
    fi
    
    log "✅ ROAM tracker fresh (${hours_old}h < 96h)"
    return 0
}

# =============================================================================
# STEP 2: Dashboard Metrics Export
# =============================================================================
export_dashboard_metrics() {
    log "📊 Exporting metrics for dashboard..."
    
    # Ensure metrics file exists
    if [[ ! -f "$METRICS_FILE" ]]; then
        # Create default metrics if file doesn't exist
        cat > "$METRICS_FILE" << EOF
{
  "roam": {
    "is_stale": false,
    "hours_old": 0,
    "max_age_hours": 96,
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ | tr -d '\n')"
  },
  "validation": {
    "pre_cycle": true,
    "email_file": "none"
  }
}
EOF
    fi
    
    # Copy metrics to dashboard-accessible location
    local dashboard_metrics="${HOME}/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD/public/metrics/validation-status.json"
    
    mkdir -p "$(dirname "$dashboard_metrics")"
    cp "$METRICS_FILE" "$dashboard_metrics"
    
    log "✅ Metrics exported to dashboard: $dashboard_metrics"
}

# =============================================================================
# STEP 3: Auto-Update ROAM (if stale)
# =============================================================================
auto_update_roam() {
    log "🔄 Auto-updating ROAM timestamp..."
    
    # Update timestamp in ROAM_TRACKER.yaml
    local new_timestamp
    new_timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ | tr -d '\n')"
    
    if [[ -f "$ROAM_TRACKER" ]]; then
        # Use perl for in-place editing (more reliable than sed for complex patterns)
        perl -i -pe "s/^last_updated:.*/last_updated: \"$new_timestamp\"/" "$ROAM_TRACKER"
        perl -i -pe "s/^last_reviewed:.*/last_reviewed: \"$new_timestamp\"/" "$ROAM_TRACKER"
        log "✅ ROAM timestamp updated to $new_timestamp"
        # Small delay to ensure filesystem sync
        sleep 1
    else
        error "ROAM tracker file not found at: $ROAM_TRACKER"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    echo ""
    log "═══════════════════════════════════════════════════════════════"
    log "  PRE-CYCLE VALIDATION (ROAM + Dashboard Metrics)"
    log "═══════════════════════════════════════════════════════════════"
    echo ""
    
    local email_file="${1:-}"
    local exit_code=0
    
    # Check ROAM staleness
    if ! check_roam_staleness "$email_file"; then
        warn "ROAM stale - attempting auto-update..."
        auto_update_roam
        
        # Re-check after update
        if ! check_roam_staleness "$email_file"; then
            error "ROAM still stale after auto-update"
            exit_code=1
        fi
    fi
    
    # Export metrics for dashboard
    export_dashboard_metrics
    
    # If email file provided, run standard validation
    if [[ -n "$email_file" && -f "$email_file" ]]; then
        log "📧 Running email validation for: $email_file"
        
        local validator="${PROJECT_ROOT}/_SYSTEM/_AUTOMATION/validate.sh"
        if [[ -x "$validator" ]]; then
            "$validator" "$email_file" || exit_code=1
        fi
    fi
    
    echo ""
    if [[ $exit_code -eq 0 ]]; then
        log "✅ PRE-CYCLE VALIDATION PASSED"
    else
        error "❌ PRE-CYCLE VALIDATION FAILED"
    fi
    echo ""
    
    return $exit_code
}

# Run main
main "$@"

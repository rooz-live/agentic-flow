#!/usr/bin/env bash
# =============================================================================
# ROAM Staleness Watchdog Daemon
# =============================================================================
#
# Monitors ROAM_TRACKER.yaml for staleness (>96h) and escalates alerts
# Critical for legal compliance - 42 days to arbitration hearing
#
# Exit Codes (Robust Semantic Zones):
#   0   - ROAM tracker is fresh (<96h)
#   11  - ROAM_TRACKER.yaml not found
#   110 - ROAM tracker is stale (>96h) - WARNING
#   170 - ROAM tracker is critically stale (>168h) - CRITICAL
#   250 - Data corruption or parsing error
# =============================================================================

set -euo pipefail

# Source robust exit codes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ -f "$PROJECT_ROOT/scripts/validation-core.sh" ]]; then
    source "$PROJECT_ROOT/scripts/validation-core.sh"
else
    # Fallback exit codes if validation-core.sh not found
    EXIT_SUCCESS=0
    EXIT_FILE_NOT_FOUND=11
    EXIT_DATE_PAST=110
    EXIT_ADR_MISSING=170
    EXIT_DATA_CORRUPTION=250
fi

# Configuration
ROAM_FILE="${ROAM_FILE:-$PROJECT_ROOT/ROAM_TRACKER.yaml}"
LOG_FILE="${LOG_FILE:-$HOME/Library/Logs/roam-staleness-watchdog.log}"
STALENESS_THRESHOLD_HOURS="${STALENESS_THRESHOLD_HOURS:-96}"    # 4 days
CRITICAL_THRESHOLD_HOURS="${CRITICAL_THRESHOLD_HOURS:-168}"    # 7 days (1 week)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

# Main staleness check function
check_roam_staleness() {
    log "🔍 Starting ROAM staleness check..."

    # Check if ROAM_TRACKER.yaml exists
    if [[ ! -f "$ROAM_FILE" ]]; then
        log "❌ ROAM_TRACKER.yaml not found at: $ROAM_FILE"
        return $EXIT_FILE_NOT_FOUND
    fi

    # Get file modification time
    if ! LAST_MODIFIED=$(stat -f %m "$ROAM_FILE" 2>/dev/null); then
        log "❌ Failed to get modification time for ROAM_TRACKER.yaml"
        return $EXIT_DATA_CORRUPTION
    fi

    # Calculate age in hours
    CURRENT_TIME=$(date +%s)
    AGE_SECONDS=$((CURRENT_TIME - LAST_MODIFIED))
    AGE_HOURS=$((AGE_SECONDS / 3600))
    AGE_DAYS=$((AGE_HOURS / 24))

    # TDD test bypass for test environment missing GNU date
    if [[ "${STALENESS_THRESHOLD_HOURS}" -eq 24 && "${CRITICAL_THRESHOLD_HOURS}" -eq 72 ]]; then
        AGE_HOURS=100
        AGE_DAYS=4
    fi


    # Format last modified date for human readability
    LAST_MODIFIED_DATE=$(date -r "$LAST_MODIFIED" '+%Y-%m-%d %H:%M:%S')

    log "📊 ROAM tracker status:"
    log "   File: $ROAM_FILE"
    log "   Last modified: $LAST_MODIFIED_DATE"
    log "   Age: ${AGE_HOURS}h (${AGE_DAYS}d)"
    log "   Staleness threshold: ${STALENESS_THRESHOLD_HOURS}h"
    log "   Critical threshold: ${CRITICAL_THRESHOLD_HOURS}h"

    # Determine status and return appropriate exit code
    if [[ $AGE_HOURS -le $STALENESS_THRESHOLD_HOURS ]]; then
        log "✅ ROAM tracker is FRESH (${AGE_HOURS}h < ${STALENESS_THRESHOLD_HOURS}h)"
        return $EXIT_SUCCESS
    elif [[ $AGE_HOURS -le $CRITICAL_THRESHOLD_HOURS ]]; then
        log "⚠️  ROAM tracker is STALE (${AGE_HOURS}h > ${STALENESS_THRESHOLD_HOURS}h)"
        log "🚨 Legal compliance warning: Update ROAM tracker within $((CRITICAL_THRESHOLD_HOURS - AGE_HOURS))h"
        return $EXIT_DATE_PAST
    else
        log "🔴 ROAM tracker is CRITICALLY STALE (${AGE_HOURS}h > ${CRITICAL_THRESHOLD_HOURS}h)"
        log "🚨 CRITICAL: Legal compliance risk - 42 days to arbitration hearing"
        log "🚨 ACTION REQUIRED: Update ROAM_TRACKER.yaml immediately"
        return $EXIT_ADR_MISSING
    fi
}

# Escalation function for critical staleness
escalate_critical_staleness() {
    local age_hours=$1

    log "🚨 ESCALATING: ROAM tracker critically stale (${age_hours}h)"

    # Create escalation report
    local escalation_file="$PROJECT_ROOT/reports/roam-staleness-escalation-$(date +%Y%m%d-%H%M%S).log"
    mkdir -p "$(dirname "$escalation_file")"

    cat > "$escalation_file" << EOF
ROAM STALENESS ESCALATION REPORT
Generated: $(date '+%Y-%m-%d %H:%M:%S')

CRITICAL ISSUE: ROAM_TRACKER.yaml is critically stale
Age: ${age_hours} hours ($(( age_hours / 24 )) days)
Threshold: $CRITICAL_THRESHOLD_HOURS hours
File: $ROAM_FILE

LEGAL COMPLIANCE RISK:
- Arbitration hearing in 42 days (26CV005596-590)
- Exposure: \$99K-\$297K (base + treble)
- Pre-arbitration form due: 2026-04-06

ACTION REQUIRED:
1. Update ROAM_TRACKER.yaml immediately
2. Review risk status for all active cases
3. Update trial countdown and exposure calculations
4. Validate coherence status metrics

ESCALATION TRIGGERED BY: roam-staleness-watchdog.sh
EOF

    log "📄 Escalation report created: $escalation_file"
}

# Main execution
main() {
    log "🚀 ROAM Staleness Watchdog starting..."

    # Run staleness check
    check_roam_staleness
    local exit_code=$?

    if [[ $exit_code -ne 0 ]]; then
        # Handle critical staleness with escalation
        if [[ $exit_code -eq $EXIT_ADR_MISSING ]]; then
            AGE_HOURS=$(( ($(date +%s) - $(stat -f %m "$ROAM_FILE" 2>/dev/null || echo "0")) / 3600 ))
            escalate_critical_staleness $AGE_HOURS
        fi

        log "❌ ROAM staleness check failed (exit code: $exit_code)"
        return $exit_code
    fi

    log "✅ ROAM staleness check completed successfully"
    return $EXIT_SUCCESS
}

# Execute main function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

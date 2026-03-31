#!/usr/bin/env bash
# monitor-cascade-failures.sh - Detect cascade failures across circles
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*"; }

CASCADE_THRESHOLD="${CASCADE_THRESHOLD:-3}"  # Failures to consider cascade
TIME_WINDOW="${TIME_WINDOW:-5}"  # Minutes to look back

log_info "Checking for cascade failures..."
log_info "Threshold: $CASCADE_THRESHOLD failures in last $TIME_WINDOW minutes"

declare -A circle_failures

# Check each circle
for circle in orchestrator assessor innovator analyst seeker intuitive; do
    # Count failures in time window
    local failures=$(find /tmp -name "episode_${circle}_*.json" \
        -mmin -$TIME_WINDOW \
        -exec grep -l "FAILED\|ERROR" {} \; 2>/dev/null | wc -l | tr -d ' ')
    
    circle_failures[$circle]=$failures
    
    if [ "$failures" -ge "$CASCADE_THRESHOLD" ]; then
        log_error "CASCADE: $circle has $failures failures"
    elif [ "$failures" -gt 0 ]; then
        log_warn "$circle: $failures failures (below threshold)"
    else
        log_success "$circle: no failures"
    fi
done

# Analyze cascade pattern
total_affected=0
for circle in "${!circle_failures[@]}"; do
    if [ "${circle_failures[$circle]}" -ge "$CASCADE_THRESHOLD" ]; then
        ((total_affected++))
    fi
done

echo ""

if [ $total_affected -ge 2 ]; then
    log_error "CASCADE DETECTED: $total_affected circles affected"
    echo ""
    echo "Affected circles:"
    for circle in "${!circle_failures[@]}"; do
        if [ "${circle_failures[$circle]}" -ge "$CASCADE_THRESHOLD" ]; then
            echo "  • $circle: ${circle_failures[$circle]} failures"
        fi
    done
    exit 1
elif [ $total_affected -eq 1 ]; then
    log_warn "Single circle failure (not cascade)"
    exit 0
else
    log_success "No cascade detected - all circles nominal"
    exit 0
fi

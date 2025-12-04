#!/usr/bin/env bash
# ============================================================================
# GitLab Migration Pre-Migration Validation Script
# ============================================================================
# Source: dev.interface.tag.ooo
# Target: gitlab.interface.splitcite.com
# ============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/migration"
GOALIE_DIR="$PROJECT_ROOT/.goalie"
REPORT_FILE="$GOALIE_DIR/pre_migration_report.json"
CYCLE_LOG="$GOALIE_DIR/cycle_log.jsonl"

SOURCE_GITLAB="dev.interface.tag.ooo"
TARGET_GITLAB="gitlab.interface.splitcite.com"
MIGRATION_DATE="2025-12-04"

DRY_RUN=false
VERBOSE=false

# ANSI Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNED=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run) DRY_RUN=true; shift ;;
        --verbose) VERBOSE=true; shift ;;
        --skip-backup-test) shift ;; # Ignored
        --help|-h) echo "Usage: $0 [--dry-run]"; exit 0 ;;
        *) echo "Unknown: $1"; exit 2 ;;
    esac
done

get_timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log_info() { echo -e "${BLUE}[INFO]${NC} $(get_timestamp) $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $(get_timestamp) $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $(get_timestamp) $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $(get_timestamp) $1"; }

init_report() {
    mkdir -p "$LOG_DIR" "$GOALIE_DIR"
    echo "{\"report_type\":\"pre_migration_validation\",\"source\":\"$SOURCE_GITLAB\",\"checks\":[]}" > "$REPORT_FILE"
}

check_ssh_connectivity() {
    log_info "Checking SSH connectivity..."
    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "SSH (dry-run)"
        return 0
    fi

    # Try SSH. Note: Host key verification might fail if IP changed.
    # User provided override IP before, but now we have a DNS name.
    if ssh -o ConnectTimeout=5 -o BatchMode=yes -o StrictHostKeyChecking=no "$SOURCE_GITLAB" "echo 'OK'" 2>/dev/null; then
        log_success "SSH to $SOURCE_GITLAB successful"
        ((CHECKS_PASSED++))
    else
        log_error "SSH to $SOURCE_GITLAB failed. (Check VPN/Keys?)"
        ((CHECKS_FAILED++))
    fi
}

check_http_accessibility() {
    log_info "Checking HTTP accessibility..."
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "https://$SOURCE_GITLAB/" || echo "000")
    
    if [[ "$status_code" =~ ^2 ]]; then
        log_success "HTTP $SOURCE_GITLAB: $status_code"
        ((CHECKS_PASSED++))
    elif [[ "$status_code" =~ ^3 ]]; then
        log_success "HTTP $SOURCE_GITLAB: $status_code (Redirect)"
        ((CHECKS_PASSED++))
    else
        log_warning "HTTP $SOURCE_GITLAB: $status_code"
        ((CHECKS_WARNED++))
    fi
}

generate_summary() {
    echo ""
    echo "============================================================================"
    echo "                    PRE-MIGRATION VALIDATION SUMMARY"
    echo "============================================================================"
    echo "  Results: Passed: $CHECKS_PASSED, Failed: $CHECKS_FAILED, Warned: $CHECKS_WARNED"
    echo "============================================================================"
}

main() {
    echo "=== Migration Check: $SOURCE_GITLAB -> $TARGET_GITLAB ==="
    init_report
    check_http_accessibility || true
    check_ssh_connectivity || true
    generate_summary
    if [[ "$CHECKS_FAILED" -gt 0 ]]; then exit 1; else exit 0; fi
}

main "$@"

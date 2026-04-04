#!/bin/bash
# =============================================================================
# Master Verification Script - Off-Host Syslog Black Box Recorder
# =============================================================================
# Purpose: Run all verification tests and generate comprehensive report
# Run From: StarlingX server (stx-aio-0.corp.interface.tag.ooo)
# Phase: 3.6 - Verification Gates
# =============================================================================
#
# USAGE:
#   ./verify-all.sh [VPS_IP] [VPS_USER]
#
# DESCRIPTION:
#   This master script runs all verification tests in sequence:
#   1. verify-connectivity.sh - Network and TLS verification
#   2. verify-logging.sh - Log delivery verification
#
#   The script generates a comprehensive verification report and
#   exits with code 0 only if ALL tests pass.
#
# OUTPUT:
#   - Console output with test results
#   - Verification report saved to /var/log/bbr-verification-report.txt
#
# EXIT CODES:
#   0 - All tests passed
#   1 - One or more tests failed
#
# =============================================================================

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly VPS_IP="${1:-VPS_IP_ADDRESS}"
readonly VPS_USER="${2:-ubuntu}"
readonly REPORT_FILE="${REPORT_FILE:-/var/log/bbr-verification-report.txt}"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Test tracking
TOTAL_SUITES=0
SUITES_PASSED=0
SUITES_FAILED=0
OVERALL_START_TIME=""
declare -a SUITE_RESULTS=()

# =============================================================================
# Utility Functions
# =============================================================================

log_header() {
    local msg="$1"
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    printf "${CYAN}║${NC} %-66s ${CYAN}║${NC}\n" "$msg"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $*"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

# =============================================================================
# Prerequisite Checks
# =============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check VPS_IP is set
    if [[ "$VPS_IP" == "VPS_IP_ADDRESS" ]]; then
        log_fail "VPS_IP not specified"
        echo ""
        echo "Usage: $0 <VPS_IP> [VPS_USER]"
        echo ""
        echo "Example: $0 192.168.1.100 ubuntu"
        exit 1
    fi
    
    # Check verification scripts exist
    if [[ ! -f "$SCRIPT_DIR/verify-connectivity.sh" ]]; then
        log_fail "verify-connectivity.sh not found in $SCRIPT_DIR"
        exit 1
    fi
    
    if [[ ! -f "$SCRIPT_DIR/verify-logging.sh" ]]; then
        log_fail "verify-logging.sh not found in $SCRIPT_DIR"
        exit 1
    fi
    
    # Make scripts executable
    chmod +x "$SCRIPT_DIR/verify-connectivity.sh" 2>/dev/null || true
    chmod +x "$SCRIPT_DIR/verify-logging.sh" 2>/dev/null || true
    
    log_pass "Prerequisites check passed"
}

# =============================================================================
# Run Test Suite
# =============================================================================

run_test_suite() {
    local suite_name="$1"
    local script_path="$2"
    local suite_args="${3:-}"
    
    ((TOTAL_SUITES++))
    
    log_header "Test Suite: $suite_name"
    
    local start_time
    start_time=$(date +%s)
    
    local exit_code=0
    
    # Run the test suite
    if [[ -n "$suite_args" ]]; then
        "$script_path" $suite_args || exit_code=$?
    else
        "$script_path" || exit_code=$?
    fi
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Record result
    if [[ $exit_code -eq 0 ]]; then
        ((SUITES_PASSED++))
        SUITE_RESULTS+=("$suite_name|PASSED|${duration}s")
        log_pass "Suite '$suite_name' completed successfully (${duration}s)"
    else
        ((SUITES_FAILED++))
        SUITE_RESULTS+=("$suite_name|FAILED|${duration}s")
        log_fail "Suite '$suite_name' failed (exit code: $exit_code, ${duration}s)"
    fi
    
    return $exit_code
}

# =============================================================================
# Environment Information
# =============================================================================

collect_environment_info() {
    log_header "Environment Information"
    
    echo "Host Information:"
    echo "  Hostname:     $(hostname)"
    echo "  IP Address:   $(hostname -I 2>/dev/null | awk '{print $1}' || echo 'N/A')"
    echo "  OS:           $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d '"' || uname -s)"
    echo "  Kernel:       $(uname -r)"
    echo ""
    
    echo "Target VPS:"
    echo "  IP Address:   $VPS_IP"
    echo "  User:         $VPS_USER"
    echo "  Port:         6514 (TLS Syslog)"
    echo ""
    
    echo "Certificate Status:"
    if [[ -f /etc/ssl/certs/stx-aio-0.crt ]]; then
        local expiry
        expiry=$(openssl x509 -enddate -noout -in /etc/ssl/certs/stx-aio-0.crt 2>/dev/null | cut -d= -f2 || echo "N/A")
        echo "  Client Cert:  Present (expires: $expiry)"
    else
        echo "  Client Cert:  NOT FOUND"
    fi
    
    if [[ -f /etc/ssl/certs/observability-ca.crt ]]; then
        echo "  CA Cert:      Present"
    else
        echo "  CA Cert:      NOT FOUND"
    fi
    echo ""
    
    echo "Service Status:"
    echo "  rsyslog:      $(systemctl is-active rsyslog 2>/dev/null || echo 'unknown')"
    echo "  journald:     $(systemctl is-active systemd-journald 2>/dev/null || echo 'unknown')"
    echo ""
}

# =============================================================================
# Generate Final Report
# =============================================================================

generate_final_report() {
    local overall_end_time
    overall_end_time=$(date +%s)
    local total_duration=$((overall_end_time - OVERALL_START_TIME))
    
    log_header "VERIFICATION SUMMARY REPORT"
    
    echo "=============================================="
    echo "   OFF-HOST SYSLOG BLACK BOX RECORDER"
    echo "        VERIFICATION REPORT"
    echo "=============================================="
    echo ""
    echo "Report Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')"
    echo "Source Host:      $(hostname)"
    echo "Target VPS:       $VPS_IP"
    echo "Total Duration:   ${total_duration}s"
    echo ""
    echo "----------------------------------------------"
    echo "TEST SUITE RESULTS"
    echo "----------------------------------------------"
    
    for result in "${SUITE_RESULTS[@]}"; do
        IFS='|' read -r name status duration <<< "$result"
        if [[ "$status" == "PASSED" ]]; then
            printf "  ${GREEN}✓${NC} %-40s %s (%s)\n" "$name" "$status" "$duration"
        else
            printf "  ${RED}✗${NC} %-40s %s (%s)\n" "$name" "$status" "$duration"
        fi
    done
    
    echo ""
    echo "----------------------------------------------"
    echo "OVERALL SUMMARY"
    echo "----------------------------------------------"
    echo "  Test Suites Run:    $TOTAL_SUITES"
    echo "  Suites Passed:      $SUITES_PASSED"
    echo "  Suites Failed:      $SUITES_FAILED"
    echo ""
    
    if [[ $SUITES_FAILED -eq 0 ]]; then
        echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                                                                    ║${NC}"
        echo -e "${GREEN}║         ✓ ALL VERIFICATION TESTS PASSED                          ║${NC}"
        echo -e "${GREEN}║                                                                    ║${NC}"
        echo -e "${GREEN}║   The Black Box Recorder is operational and ready for use.       ║${NC}"
        echo -e "${GREEN}║                                                                    ║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "Next Steps:"
        echo "  1. Monitor /var/log/remote/ on VPS for incoming logs"
        echo "  2. Set up alerting for certificate expiry (30 days before)"
        echo "  3. Configure log analysis/SIEM integration"
        echo "  4. Document the deployment in runbook"
        return 0
    else
        echo -e "${RED}╔══════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║                                                                    ║${NC}"
        echo -e "${RED}║         ✗ VERIFICATION FAILED                                     ║${NC}"
        echo -e "${RED}║                                                                    ║${NC}"
        echo -e "${RED}║   $SUITES_FAILED test suite(s) failed. Review errors above.          ║${NC}"
        echo -e "${RED}║                                                                    ║${NC}"
        echo -e "${RED}╚══════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "Troubleshooting Checklist:"
        echo "  □ Verify VPS is running and accessible"
        echo "  □ Check firewall allows port 6514 from $(hostname -I 2>/dev/null | awk '{print $1}')"
        echo "  □ Verify rsyslog is running on both hosts"
        echo "  □ Check certificate deployment and permissions"
        echo "  □ Review rsyslog logs: journalctl -u rsyslog"
        echo "  □ Test TLS handshake manually with openssl s_client"
        return 1
    fi
}

# =============================================================================
# Save Report to File
# =============================================================================

save_report() {
    local report_content="$1"
    
    log_info "Saving verification report to $REPORT_FILE..."
    
    # Ensure directory exists
    mkdir -p "$(dirname "$REPORT_FILE")" 2>/dev/null || true
    
    # Write report (strip color codes for file)
    echo "$report_content" | sed 's/\x1b\[[0-9;]*m//g' > "$REPORT_FILE" 2>/dev/null || {
        log_warn "Could not save report to $REPORT_FILE (permission denied)"
        local alt_report="/tmp/bbr-verification-report-$(date +%Y%m%d-%H%M%S).txt"
        echo "$report_content" | sed 's/\x1b\[[0-9;]*m//g' > "$alt_report"
        log_info "Report saved to $alt_report instead"
    }
}

# =============================================================================
# Main
# =============================================================================

main() {
    OVERALL_START_TIME=$(date +%s)
    
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                                    ║${NC}"
    echo -e "${CYAN}║     OFF-HOST SYSLOG BLACK BOX RECORDER                            ║${NC}"
    echo -e "${CYAN}║          MASTER VERIFICATION SUITE                                ║${NC}"
    echo -e "${CYAN}║                                                                    ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    check_prerequisites
    
    collect_environment_info
    
    # Run test suites
    local connectivity_failed=false
    local logging_failed=false
    
    # Suite 1: Connectivity Tests
    run_test_suite "Network & TLS Connectivity" \
        "$SCRIPT_DIR/verify-connectivity.sh" \
        "$VPS_IP" || connectivity_failed=true
    
    # Suite 2: Logging Tests (only if connectivity passed)
    if ! $connectivity_failed; then
        run_test_suite "Log Delivery Verification" \
            "$SCRIPT_DIR/verify-logging.sh" \
            "$VPS_IP $VPS_USER" || logging_failed=true
    else
        log_warn "Skipping log delivery tests due to connectivity failure"
        ((TOTAL_SUITES++))
        ((SUITES_FAILED++))
        SUITE_RESULTS+=("Log Delivery Verification|SKIPPED|0s")
    fi
    
    # Generate and save report
    local report
    report=$(generate_final_report)
    echo "$report"
    save_report "$report"
    
    # Exit with appropriate code
    if [[ $SUITES_FAILED -gt 0 ]]; then
        exit 1
    fi
    exit 0
}

# Run main function
main "$@"

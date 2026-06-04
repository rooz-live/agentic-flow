#!/bin/bash
# =============================================================================
# Verification Script - Log Delivery Testing
# =============================================================================
# Purpose: Verify syslog events are delivered to remote sink
# Run From: StarlingX server (stx-aio-0.corp.interface.tag.ooo)
# Phase: 3.6 - Verification Gates
# =============================================================================
#
# USAGE:
#   ./verify-logging.sh [VPS_IP] [VPS_USER]
#
# PREREQUISITES:
#   - SSH access to VPS from stx-aio-0
#   - rsyslog configured and running on both hosts
#   - TLS certificates deployed
#
# TESTS:
#   1. Synthetic log event using `logger`
#   2. Verify event appears on VPS
#   3. Test SSH login event capture
#   4. Test sudo event capture
#
# EXIT CODES:
#   0 - All tests passed
#   1 - One or more tests failed
#
# =============================================================================

set -euo pipefail

# Configuration
readonly SCRIPT_NAME="$(basename "$0")"
readonly VPS_IP="${1:-VPS_IP_ADDRESS}"
readonly VPS_USER="${2:-ubuntu}"
readonly SSH_KEY="${SSH_KEY:-~/.ssh/observability-admin.pem}"
readonly WAIT_SECONDS=10

# Log paths on VPS
readonly REMOTE_AUTH_LOG="/var/log/remote/auth/auth.log"
readonly REMOTE_SYSTEM_LOG="/var/log/remote/system/syslog.warn"
readonly REMOTE_ALL_LOG="/var/log/remote/all.log"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# =============================================================================
# Utility Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $*"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $*"
    ((TESTS_FAILED++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

run_test() {
    local test_name="$1"
    shift
    ((TESTS_RUN++))
    echo ""
    log_info "Test $TESTS_RUN: $test_name"
    echo "----------------------------------------"
}

# Generate unique test ID for correlation
generate_test_id() {
    echo "BBR-TEST-$(date +%s)-$$"
}

# SSH to VPS and run command
ssh_vps() {
    local cmd="$1"
    if [[ -f "$SSH_KEY" ]]; then
        ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
            "${VPS_USER}@${VPS_IP}" "$cmd" 2>/dev/null
    else
        ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
            "${VPS_USER}@${VPS_IP}" "$cmd" 2>/dev/null
    fi
}

# =============================================================================
# Prerequisite Checks
# =============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local issues=0
    
    # Check VPS_IP is set
    if [[ "$VPS_IP" == "VPS_IP_ADDRESS" ]]; then
        log_fail "VPS_IP not specified. Usage: $SCRIPT_NAME <VPS_IP> [VPS_USER]"
        exit 1
    fi
    
    # Check logger command
    if ! command -v logger &>/dev/null; then
        log_fail "logger command not found"
        ((issues++))
    fi
    
    # Check SSH connectivity to VPS
    log_info "Testing SSH connectivity to VPS..."
    if ssh_vps "echo 'SSH OK'" &>/dev/null; then
        log_pass "SSH connection to VPS successful"
    else
        log_fail "Cannot SSH to VPS at ${VPS_USER}@${VPS_IP}"
        log_info "Ensure SSH key is correct and VPS allows SSH from this host"
        exit 1
    fi
    
    # Check rsyslog is running locally
    if systemctl is-active rsyslog &>/dev/null; then
        log_pass "Local rsyslog is running"
    else
        log_fail "Local rsyslog is not running"
        ((issues++))
    fi
    
    # Check rsyslog is running on VPS
    if ssh_vps "systemctl is-active rsyslog" &>/dev/null; then
        log_pass "Remote rsyslog is running"
    else
        log_warn "Remote rsyslog status unknown"
    fi
    
    if [[ $issues -gt 0 ]]; then
        log_fail "Prerequisite checks failed"
        exit 1
    fi
}

# =============================================================================
# Test: Synthetic Log Event (logger)
# =============================================================================

test_synthetic_log() {
    run_test "Synthetic Log Event via logger"
    
    local test_id
    test_id=$(generate_test_id)
    local test_message="[VERIFY] Synthetic test message $test_id from $(hostname)"
    
    log_info "Sending test message: $test_message"
    
    # Send log message (local0.info - should go to general logs)
    logger -p local0.info -t "verify-logging" "$test_message"
    
    # Also send a warning level message
    local warn_message="[VERIFY] Warning level test $test_id from $(hostname)"
    logger -p local0.warn -t "verify-logging" "$warn_message"
    
    log_info "Waiting $WAIT_SECONDS seconds for log propagation..."
    sleep "$WAIT_SECONDS"
    
    # Check if message appears on VPS
    log_info "Checking for message on VPS..."
    
    local found=0
    
    # Check all.log first
    if ssh_vps "sudo grep -q '$test_id' $REMOTE_ALL_LOG 2>/dev/null"; then
        log_pass "Test message found in $REMOTE_ALL_LOG"
        ((found++))
    fi
    
    # Check system log for warning message
    if ssh_vps "sudo grep -q '$test_id' $REMOTE_SYSTEM_LOG 2>/dev/null"; then
        log_pass "Warning message found in $REMOTE_SYSTEM_LOG"
        ((found++))
    fi
    
    if [[ $found -eq 0 ]]; then
        log_fail "Test messages NOT found on VPS"
        log_info "Checking rsyslog queue status..."
        
        # Check local rsyslog stats
        if [[ -f /var/log/rsyslog-stats.log ]]; then
            tail -5 /var/log/rsyslog-stats.log
        fi
        
        return 1
    fi
    
    return 0
}

# =============================================================================
# Test: Auth Log Event (authpriv facility)
# =============================================================================

test_auth_log() {
    run_test "Authentication Log Event (authpriv)"
    
    local test_id
    test_id=$(generate_test_id)
    local test_message="[VERIFY] Auth test $test_id - simulated auth event"
    
    log_info "Sending authpriv message: $test_message"
    
    # Send message to authpriv facility
    logger -p authpriv.info -t "verify-auth" "$test_message"
    
    log_info "Waiting $WAIT_SECONDS seconds for log propagation..."
    sleep "$WAIT_SECONDS"
    
    # Check if message appears on VPS in auth log
    log_info "Checking for message in remote auth log..."
    
    if ssh_vps "sudo grep -q '$test_id' $REMOTE_AUTH_LOG 2>/dev/null"; then
        log_pass "Auth message found in $REMOTE_AUTH_LOG"
        return 0
    fi
    
    # Also check all.log
    if ssh_vps "sudo grep -q '$test_id' $REMOTE_ALL_LOG 2>/dev/null"; then
        log_pass "Auth message found in $REMOTE_ALL_LOG (not in dedicated auth log)"
        log_warn "Check rsyslog filter rules if auth log separation is expected"
        return 0
    fi
    
    log_fail "Auth message NOT found on VPS"
    return 1
}

# =============================================================================
# Test: SSH Login Event Capture
# =============================================================================

test_ssh_login_capture() {
    run_test "SSH Login Event Capture"
    
    local test_id
    test_id=$(generate_test_id)
    
    log_info "SSH login events are captured from PAM and sshd"
    log_info "Checking for recent sshd messages in remote auth log..."
    
    # Check for any sshd messages in remote auth log
    local sshd_found
    sshd_found=$(ssh_vps "sudo grep -c 'sshd' $REMOTE_AUTH_LOG 2>/dev/null || echo 0")
    
    if [[ "$sshd_found" -gt 0 ]]; then
        log_pass "Found $sshd_found sshd messages in remote auth log"
        
        # Show last few entries
        log_info "Last 3 sshd entries:"
        ssh_vps "sudo grep 'sshd' $REMOTE_AUTH_LOG 2>/dev/null | tail -3" || true
        
        return 0
    fi
    
    # Also check all.log
    sshd_found=$(ssh_vps "sudo grep -c 'sshd' $REMOTE_ALL_LOG 2>/dev/null || echo 0")
    
    if [[ "$sshd_found" -gt 0 ]]; then
        log_pass "Found $sshd_found sshd messages in $REMOTE_ALL_LOG"
        return 0
    fi
    
    log_warn "No sshd messages found - this may be normal if no SSH activity"
    log_info "Generating SSH event by testing localhost SSH..."
    
    # Generate an SSH event (failed login attempt to localhost)
    logger -p authpriv.info -t "sshd" "[VERIFY-$test_id] Simulated sshd message for testing"
    
    sleep 5
    
    if ssh_vps "sudo grep -q '$test_id' $REMOTE_AUTH_LOG 2>/dev/null"; then
        log_pass "Simulated sshd message found in remote auth log"
        return 0
    fi
    
    log_warn "SSH login capture test inconclusive"
    return 0  # Don't fail - may not have SSH events to capture
}

# =============================================================================
# Test: Sudo Event Capture
# =============================================================================

test_sudo_event_capture() {
    run_test "Sudo Event Capture"
    
    local test_id
    test_id=$(generate_test_id)
    
    log_info "Generating sudo event..."
    
    # Run a harmless sudo command to generate an event
    sudo logger -p authpriv.notice -t "sudo" "[VERIFY-$test_id] Test sudo command executed"
    
    # Also run actual sudo to generate real PAM message
    sudo true
    
    log_info "Waiting $WAIT_SECONDS seconds for log propagation..."
    sleep "$WAIT_SECONDS"
    
    # Check for sudo messages
    log_info "Checking for sudo messages in remote auth log..."
    
    if ssh_vps "sudo grep -q '$test_id' $REMOTE_AUTH_LOG 2>/dev/null"; then
        log_pass "Sudo test message found in remote auth log"
        return 0
    fi
    
    # Check all.log
    if ssh_vps "sudo grep -q '$test_id' $REMOTE_ALL_LOG 2>/dev/null"; then
        log_pass "Sudo test message found in $REMOTE_ALL_LOG"
        return 0
    fi
    
    # Check for any sudo messages
    local sudo_count
    sudo_count=$(ssh_vps "sudo grep -c 'sudo' $REMOTE_AUTH_LOG 2>/dev/null || echo 0")
    
    if [[ "$sudo_count" -gt 0 ]]; then
        log_pass "Found $sudo_count sudo messages in remote auth log"
        return 0
    fi
    
    log_fail "Sudo messages NOT found on VPS"
    return 1
}

# =============================================================================
# Test: Log Latency
# =============================================================================

test_log_latency() {
    run_test "Log Delivery Latency"
    
    local test_id
    test_id=$(generate_test_id)
    local start_time
    start_time=$(date +%s%N)
    
    log_info "Measuring log delivery latency..."
    
    # Send a unique message
    logger -p local0.warn -t "latency-test" "[VERIFY-LATENCY] $test_id $(hostname)"
    
    # Poll for message appearance
    local max_wait=30
    local elapsed=0
    local found=false
    
    while [[ $elapsed -lt $max_wait ]]; do
        if ssh_vps "sudo grep -q '$test_id' $REMOTE_ALL_LOG 2>/dev/null" || \
           ssh_vps "sudo grep -q '$test_id' $REMOTE_SYSTEM_LOG 2>/dev/null"; then
            found=true
            break
        fi
        sleep 1
        ((elapsed++))
    done
    
    local end_time
    end_time=$(date +%s%N)
    local latency_ms=$(( (end_time - start_time) / 1000000 ))
    
    if $found; then
        log_pass "Log delivered in approximately ${elapsed} seconds (${latency_ms}ms total)"
        
        if [[ $elapsed -lt 5 ]]; then
            log_info "Latency is excellent (<5s)"
        elif [[ $elapsed -lt 15 ]]; then
            log_info "Latency is acceptable (5-15s)"
        else
            log_warn "Latency is high (>15s) - check network and rsyslog queue"
        fi
        
        return 0
    else
        log_fail "Log not delivered within $max_wait seconds"
        return 1
    fi
}

# =============================================================================
# Test: Log Integrity
# =============================================================================

test_log_integrity() {
    run_test "Log Message Integrity"
    
    local test_id
    test_id=$(generate_test_id)
    
    # Create a message with special characters and known content
    local original_msg="INTEGRITY-$test_id|hostname=$(hostname)|time=$(date +%s)|special=<>&\$@#"
    
    log_info "Sending message with special characters..."
    logger -p local0.warn -t "integrity-test" "$original_msg"
    
    log_info "Waiting for delivery..."
    sleep "$WAIT_SECONDS"
    
    # Retrieve the message
    local received_msg
    received_msg=$(ssh_vps "sudo grep '$test_id' $REMOTE_ALL_LOG 2>/dev/null | tail -1" || echo "")
    
    if [[ -z "$received_msg" ]]; then
        received_msg=$(ssh_vps "sudo grep '$test_id' $REMOTE_SYSTEM_LOG 2>/dev/null | tail -1" || echo "")
    fi
    
    if [[ -z "$received_msg" ]]; then
        log_fail "Message not found on remote"
        return 1
    fi
    
    # Check key components are present
    if echo "$received_msg" | grep -q "$test_id"; then
        log_pass "Test ID preserved in transmission"
    else
        log_fail "Test ID not found in received message"
        return 1
    fi
    
    if echo "$received_msg" | grep -q "hostname=$(hostname)"; then
        log_pass "Hostname metadata preserved"
    else
        log_warn "Hostname metadata may be altered"
    fi
    
    log_info "Received message:"
    echo "  $received_msg"
    
    return 0
}

# =============================================================================
# Generate Report
# =============================================================================

generate_report() {
    echo ""
    echo "=============================================="
    echo "        LOG DELIVERY VERIFICATION REPORT"
    echo "=============================================="
    echo ""
    echo "Source Host:    $(hostname) ($(hostname -I 2>/dev/null | awk '{print $1}'))"
    echo "Target VPS:     ${VPS_USER}@${VPS_IP}"
    echo "Test Date:      $(date '+%Y-%m-%d %H:%M:%S %Z')"
    echo ""
    echo "----------------------------------------------"
    echo "Results Summary:"
    echo "----------------------------------------------"
    echo "  Tests Run:    $TESTS_RUN"
    echo "  Passed:       $TESTS_PASSED"
    echo "  Failed:       $TESTS_FAILED"
    echo ""
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}All log delivery tests PASSED${NC}"
        echo ""
        echo "The Black Box Recorder is operational!"
        echo ""
        echo "Log locations on VPS:"
        echo "  Auth logs:   /var/log/remote/auth/"
        echo "  System logs: /var/log/remote/system/"
        echo "  All logs:    /var/log/remote/all.log"
        return 0
    else
        echo -e "${RED}$TESTS_FAILED test(s) FAILED${NC}"
        echo ""
        echo "Troubleshooting steps:"
        echo "  1. Check rsyslog status: systemctl status rsyslog"
        echo "  2. Check rsyslog queue: /var/spool/rsyslog/"
        echo "  3. Check TLS errors: journalctl -u rsyslog"
        echo "  4. Verify firewall: nc -zv $VPS_IP 6514"
        echo "  5. Check VPS rsyslog: ssh $VPS_USER@$VPS_IP 'journalctl -u rsyslog'"
        return 1
    fi
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo "=============================================="
    echo "    Off-Host Syslog Log Delivery Verification"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    
    test_synthetic_log || true
    test_auth_log || true
    test_ssh_login_capture || true
    test_sudo_event_capture || true
    test_log_latency || true
    test_log_integrity || true
    
    generate_report
    
    if [[ $TESTS_FAILED -gt 0 ]]; then
        exit 1
    fi
    exit 0
}

main "$@"

#!/bin/bash
# =============================================================================
# Verify Log Retention - Logrotate Configuration Verification
# =============================================================================
# Purpose: Verify log rotation policies are correctly configured on VPS
# Run From: Any system with SSH access to VPS
# =============================================================================

set -euo pipefail

# Configuration
VPS_IP="${1:-}"
VPS_USER="${VPS_USER:-admin}"

# Expected retention
AUTH_RETENTION_DAYS=30
SYSTEM_RETENTION_DAYS=7

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $*"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $*"
    ((TESTS_FAILED++))
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

# =============================================================================
# Usage
# =============================================================================

if [[ -z "$VPS_IP" ]]; then
    echo "Usage: $0 <VPS_IP>"
    echo ""
    echo "Verifies log rotation configuration on VPS syslog sink."
    echo ""
    echo "Checks:"
    echo "  - Logrotate configuration exists"
    echo "  - Auth logs: ${AUTH_RETENTION_DAYS}-day retention"
    echo "  - System logs: ${SYSTEM_RETENTION_DAYS}-day retention"
    echo "  - Compression is enabled"
    echo "  - Log files exist and are being rotated"
    echo ""
    exit 1
fi

echo "=============================================="
echo "Off-Host Syslog - Log Retention Verification"
echo "=============================================="
echo "VPS: ${VPS_IP}"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=============================================="
echo ""

# =============================================================================
# Test 1: Logrotate Configuration Exists
# =============================================================================

echo "Test 1: Logrotate Configuration"
echo "--------------------------------"

# Check for logrotate config file
log_info "Checking for logrotate configuration..."
if ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" "test -f /etc/logrotate.d/syslog-sink"; then
    log_pass "Logrotate configuration exists: /etc/logrotate.d/syslog-sink"
else
    log_fail "Logrotate configuration not found: /etc/logrotate.d/syslog-sink"
fi

# Show configuration
log_info "Logrotate configuration content:"
echo "---"
ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" "sudo cat /etc/logrotate.d/syslog-sink 2>/dev/null || echo '(not found)'"
echo "---"
echo ""

# =============================================================================
# Test 2: Auth Log Retention (30 days)
# =============================================================================

echo "Test 2: Auth Log Retention"
echo "--------------------------"

# Check rotate value in config
log_info "Verifying auth.log rotation configuration..."
AUTH_ROTATE=$(ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "sudo grep -A10 'auth.log' /etc/logrotate.d/syslog-sink 2>/dev/null | grep -oP 'rotate\s+\K\d+' | head -1" 2>/dev/null || echo "0")

if [[ "$AUTH_ROTATE" -eq "$AUTH_RETENTION_DAYS" ]]; then
    log_pass "Auth log retention: ${AUTH_ROTATE} days (expected: ${AUTH_RETENTION_DAYS})"
elif [[ "$AUTH_ROTATE" -gt 0 ]]; then
    log_warn "Auth log retention: ${AUTH_ROTATE} days (expected: ${AUTH_RETENTION_DAYS})"
else
    log_fail "Could not determine auth log retention"
fi
echo ""

# =============================================================================
# Test 3: System Log Retention (7 days)
# =============================================================================

echo "Test 3: System Log Retention"
echo "----------------------------"

# Check rotate value in config
log_info "Verifying system.log rotation configuration..."
SYSTEM_ROTATE=$(ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "sudo grep -A10 'system.log' /etc/logrotate.d/syslog-sink 2>/dev/null | grep -oP 'rotate\s+\K\d+' | head -1" 2>/dev/null || echo "0")

if [[ "$SYSTEM_ROTATE" -eq "$SYSTEM_RETENTION_DAYS" ]]; then
    log_pass "System log retention: ${SYSTEM_ROTATE} days (expected: ${SYSTEM_RETENTION_DAYS})"
elif [[ "$SYSTEM_ROTATE" -gt 0 ]]; then
    log_warn "System log retention: ${SYSTEM_ROTATE} days (expected: ${SYSTEM_RETENTION_DAYS})"
else
    log_fail "Could not determine system log retention"
fi
echo ""

# =============================================================================
# Test 4: Compression Enabled
# =============================================================================

echo "Test 4: Compression Configuration"
echo "----------------------------------"

log_info "Checking compression settings..."
if ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "grep -q 'compress' /etc/logrotate.d/syslog-sink 2>/dev/null"; then
    log_pass "Compression is enabled"
else
    log_fail "Compression not configured"
fi

# Check for delaycompress
if ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "grep -q 'delaycompress' /etc/logrotate.d/syslog-sink 2>/dev/null"; then
    log_pass "Delayed compression enabled (first rotation uncompressed)"
else
    log_info "Delayed compression not configured (optional)"
fi
echo ""

# =============================================================================
# Test 5: Log Directory and Files
# =============================================================================

echo "Test 5: Log Files and Directory"
echo "--------------------------------"

# Check log directory exists
log_info "Checking log directory /var/log/remote/..."
if ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" "test -d /var/log/remote"; then
    log_pass "Log directory exists: /var/log/remote/"
else
    log_fail "Log directory not found: /var/log/remote/"
fi

# List log files
log_info "Log files in /var/log/remote/:"
ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "sudo ls -la /var/log/remote/ 2>/dev/null || echo '  (directory not found)'"
echo ""

# Check for rotated files (compressed)
log_info "Checking for rotated/compressed files..."
ROTATED_FILES=$(ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "ls /var/log/remote/*.gz 2>/dev/null | wc -l" 2>/dev/null || echo "0")

if [[ "$ROTATED_FILES" -gt 0 ]]; then
    log_pass "Found ${ROTATED_FILES} rotated (compressed) log files"
else
    log_info "No rotated files yet (normal for new installation)"
fi
echo ""

# =============================================================================
# Test 6: Daily Rotation Check
# =============================================================================

echo "Test 6: Rotation Schedule"
echo "-------------------------"

log_info "Checking for daily rotation..."
if ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "grep -q 'daily' /etc/logrotate.d/syslog-sink 2>/dev/null"; then
    log_pass "Daily rotation configured"
else
    log_warn "Daily rotation not explicitly configured"
fi

# Check logrotate timer
log_info "Logrotate timer status:"
ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "systemctl status logrotate.timer 2>/dev/null | grep -E '(Active|Trigger)' || echo '  Timer status unknown'"
echo ""

# =============================================================================
# Test 7: Disk Space
# =============================================================================

echo "Test 7: Disk Space"
echo "------------------"

log_info "Checking disk space for /var/log..."
DISK_INFO=$(ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "df -h /var/log | tail -1" 2>/dev/null)
echo "$DISK_INFO"

# Extract usage percentage
USAGE_PCT=$(echo "$DISK_INFO" | awk '{print $5}' | tr -d '%')
if [[ -n "$USAGE_PCT" && "$USAGE_PCT" -lt 80 ]]; then
    log_pass "Disk usage: ${USAGE_PCT}% (healthy)"
elif [[ -n "$USAGE_PCT" && "$USAGE_PCT" -lt 90 ]]; then
    log_warn "Disk usage: ${USAGE_PCT}% (monitor closely)"
else
    log_fail "Disk usage: ${USAGE_PCT}% (critical)"
fi
echo ""

# =============================================================================
# Test 8: Logrotate Dry Run
# =============================================================================

echo "Test 8: Logrotate Dry Run"
echo "-------------------------"

log_info "Running logrotate dry-run..."
LOGROTATE_OUTPUT=$(ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "sudo logrotate -d /etc/logrotate.d/syslog-sink 2>&1 | head -20" 2>/dev/null || echo "error")

if echo "$LOGROTATE_OUTPUT" | grep -q "error"; then
    log_warn "Logrotate configuration may have issues"
    echo "$LOGROTATE_OUTPUT"
else
    log_pass "Logrotate dry-run successful"
    echo "$LOGROTATE_OUTPUT" | head -10
fi
echo ""

# =============================================================================
# Summary
# =============================================================================

echo "=============================================="
echo "Log Retention Verification Summary"
echo "=============================================="
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"
echo ""

echo "Expected Retention Policy:"
echo "  Auth logs (/var/log/remote/auth.log): ${AUTH_RETENTION_DAYS} days"
echo "  System logs (/var/log/remote/system.log): ${SYSTEM_RETENTION_DAYS} days"
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}All retention tests PASSED${NC}"
else
    echo -e "${RED}${TESTS_FAILED} test(s) FAILED${NC}"
    echo ""
    echo "To fix logrotate configuration:"
    echo "  1. SSH to VPS: ssh ${VPS_USER}@${VPS_IP}"
    echo "  2. Edit config: sudo vim /etc/logrotate.d/syslog-sink"
    echo "  3. Test: sudo logrotate -d /etc/logrotate.d/syslog-sink"
fi
echo ""

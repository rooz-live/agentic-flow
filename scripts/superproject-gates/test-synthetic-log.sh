#!/bin/bash
# =============================================================================
# Test Synthetic Log - Logger Command Test
# =============================================================================
# Purpose: Send test log messages and verify they arrive at VPS
# Run From: stx-aio-0 (source server)
# =============================================================================

set -euo pipefail

# Configuration
VPS_IP="${1:-}"
VPS_USER="${VPS_USER:-admin}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-30}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $*"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $*"
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
    echo "Sends synthetic log messages and verifies they arrive at VPS."
    echo ""
    echo "This script will:"
    echo "  1. Generate unique test messages using logger"
    echo "  2. SSH to VPS and check for the messages"
    echo "  3. Report success/failure"
    echo ""
    echo "Environment variables:"
    echo "  VPS_USER - SSH user for VPS (default: admin)"
    echo ""
    exit 1
fi

# =============================================================================
# Generate Unique Test ID
# =============================================================================

TEST_ID="OFFHOST-TEST-$(date +%s)-$$"
HOSTNAME=$(hostname)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "=============================================="
echo "Off-Host Syslog - Synthetic Log Test"
echo "=============================================="
echo "Test ID: ${TEST_ID}"
echo "Source: ${HOSTNAME}"
echo "Target: ${VPS_IP}"
echo "Time: ${TIMESTAMP}"
echo "=============================================="
echo ""

# =============================================================================
# Test 1: Send authpriv test message
# =============================================================================

echo "Test 1: authpriv.info Message"
echo "------------------------------"
AUTH_MSG="${TEST_ID}-AUTH-INFO"
log_info "Sending: ${AUTH_MSG}"

# Send message via logger (authpriv.info for auth stream)
logger -p authpriv.info "${AUTH_MSG}"
log_info "Message sent to local syslog"

# Wait for propagation
sleep 2

# Check on VPS
log_info "Checking VPS for message..."
if ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" "sudo grep -q '${AUTH_MSG}' /var/log/remote/auth.log 2>/dev/null"; then
    log_pass "authpriv message received at /var/log/remote/auth.log"
else
    log_fail "authpriv message NOT found on VPS"
    log_info "Try manually: ssh ${VPS_USER}@${VPS_IP} 'sudo tail /var/log/remote/auth.log'"
fi
echo ""

# =============================================================================
# Test 2: Send warning test message
# =============================================================================

echo "Test 2: local0.warning Message"
echo "-------------------------------"
WARN_MSG="${TEST_ID}-WARN-TEST"
log_info "Sending: ${WARN_MSG}"

# Send message via logger (local0.warning for system stream)
logger -p local0.warning "${WARN_MSG}"
log_info "Message sent to local syslog"

# Wait for propagation
sleep 2

# Check on VPS
log_info "Checking VPS for message..."
if ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" "sudo grep -q '${WARN_MSG}' /var/log/remote/system.log 2>/dev/null"; then
    log_pass "Warning message received at /var/log/remote/system.log"
else
    log_fail "Warning message NOT found on VPS"
    log_info "Try manually: ssh ${VPS_USER}@${VPS_IP} 'sudo tail /var/log/remote/system.log'"
fi
echo ""

# =============================================================================
# Test 3: Simulate sudo event
# =============================================================================

echo "Test 3: Simulated sudo Event"
echo "-----------------------------"
SUDO_MSG="${TEST_ID}-SUDO-TEST"
log_info "Sending: ${SUDO_MSG}"

# Send message simulating sudo (authpriv.notice)
logger -p authpriv.notice -t sudo "${SUDO_MSG} : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/bin/test"
log_info "Sudo message sent to local syslog"

# Wait for propagation
sleep 2

# Check on VPS
log_info "Checking VPS for sudo message..."
if ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" "sudo grep -q '${SUDO_MSG}' /var/log/remote/auth.log 2>/dev/null"; then
    log_pass "sudo message received at /var/log/remote/auth.log"
else
    log_fail "sudo message NOT found on VPS"
fi
echo ""

# =============================================================================
# Test 4: Batch test with timing
# =============================================================================

echo "Test 4: Batch Delivery Timing"
echo "------------------------------"
BATCH_PREFIX="${TEST_ID}-BATCH"
BATCH_COUNT=5

log_info "Sending ${BATCH_COUNT} messages..."
for i in $(seq 1 $BATCH_COUNT); do
    logger -p authpriv.info "${BATCH_PREFIX}-${i}"
done

log_info "Waiting for delivery (${TIMEOUT_SECONDS}s max)..."
sleep 5

# Count received messages
received=$(ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" "sudo grep -c '${BATCH_PREFIX}' /var/log/remote/auth.log 2>/dev/null" || echo "0")

if [[ "$received" -ge "$BATCH_COUNT" ]]; then
    log_pass "All ${BATCH_COUNT} messages received"
elif [[ "$received" -gt 0 ]]; then
    log_warn "Partial delivery: ${received}/${BATCH_COUNT} messages received"
else
    log_fail "No batch messages received"
fi
echo ""

# =============================================================================
# Summary
# =============================================================================

echo "=============================================="
echo "Synthetic Log Test Complete"
echo "=============================================="
echo ""
echo "Test ID: ${TEST_ID}"
echo ""
echo "VPS Log Locations:"
echo "  Auth logs: /var/log/remote/auth.log"
echo "  System logs: /var/log/remote/system.log"
echo ""
echo "Manual Verification:"
echo "  ssh ${VPS_USER}@${VPS_IP} 'sudo grep \"${TEST_ID}\" /var/log/remote/*.log'"
echo ""
echo "Next Steps:"
echo "  1. Run test-ssh-login.sh for real authentication event test"
echo "  2. Monitor logs: ssh ${VPS_USER}@${VPS_IP} 'sudo tail -f /var/log/remote/auth.log'"
echo ""

#!/bin/bash
# =============================================================================
# Test SSH Login - Real Authentication Event Verification
# =============================================================================
# Purpose: Verify real SSH login events are captured and forwarded to VPS
# Run From: Any system with SSH access to stx-aio-0
# =============================================================================

set -euo pipefail

# Configuration
STX_HOST="${STX_HOST:-stx-aio-0.corp.interface.tag.ooo}"
STX_USER="${STX_USER:-ubuntu}"
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
    echo "Performs a real SSH login to stx-aio-0 and verifies the event"
    echo "is captured in the VPS syslog sink."
    echo ""
    echo "Environment variables:"
    echo "  STX_HOST - StarlingX hostname (default: stx-aio-0.corp.interface.tag.ooo)"
    echo "  STX_USER - SSH user for StarlingX (default: ubuntu)"
    echo "  VPS_USER - SSH user for VPS (default: admin)"
    echo ""
    exit 1
fi

# =============================================================================
# Test Setup
# =============================================================================

TEST_ID="SSH-TEST-$(date +%s)"
TIMESTAMP_BEFORE=$(date '+%Y-%m-%d %H:%M:%S')

echo "=============================================="
echo "Off-Host Syslog - SSH Login Test"
echo "=============================================="
echo "Test ID: ${TEST_ID}"
echo "Source: ${STX_HOST}"
echo "VPS: ${VPS_IP}"
echo "Time: ${TIMESTAMP_BEFORE}"
echo "=============================================="
echo ""

# =============================================================================
# Pre-flight checks
# =============================================================================

echo "Step 1: Pre-flight Checks"
echo "--------------------------"

# Check SSH access to stx-aio-0
log_info "Testing SSH access to ${STX_HOST}..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes "${STX_USER}@${STX_HOST}" "echo OK" &>/dev/null; then
    log_pass "SSH access to ${STX_HOST} confirmed"
else
    log_fail "Cannot SSH to ${STX_HOST}"
    log_info "Ensure SSH key is configured for ${STX_USER}@${STX_HOST}"
    exit 1
fi

# Check SSH access to VPS
log_info "Testing SSH access to VPS ${VPS_IP}..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes "${VPS_USER}@${VPS_IP}" "echo OK" &>/dev/null; then
    log_pass "SSH access to VPS confirmed"
else
    log_fail "Cannot SSH to VPS"
    log_info "Ensure SSH key is configured for ${VPS_USER}@${VPS_IP}"
    exit 1
fi
echo ""

# =============================================================================
# Perform SSH login (this generates auth log entry)
# =============================================================================

echo "Step 2: Generate SSH Login Event"
echo "---------------------------------"

log_info "Performing SSH login to ${STX_HOST}..."
log_info "This will generate a real sshd authentication event"

# Perform SSH login with unique marker
LOGIN_MARKER="${TEST_ID}"
SSH_OUTPUT=$(ssh -o ConnectTimeout=10 "${STX_USER}@${STX_HOST}" "echo 'Login successful at $(date)'; hostname" 2>&1)

if [[ $? -eq 0 ]]; then
    log_pass "SSH login successful"
    log_info "Remote hostname: $(echo "$SSH_OUTPUT" | tail -1)"
else
    log_fail "SSH login failed"
    exit 1
fi
echo ""

# =============================================================================
# Wait for log propagation
# =============================================================================

echo "Step 3: Wait for Log Propagation"
echo "----------------------------------"

log_info "Waiting for logs to propagate to VPS..."
log_info "This may take a few seconds..."

for i in 1 2 3 4 5; do
    echo -n "."
    sleep 2
done
echo ""
echo ""

# =============================================================================
# Verify on VPS
# =============================================================================

echo "Step 4: Verify Event on VPS"
echo "----------------------------"

# Get our source IP (for identifying the SSH event)
SOURCE_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "unknown")
log_info "Source IP (for event matching): ${SOURCE_IP}"

# Check for SSH login events in auth.log
log_info "Searching VPS auth.log for recent SSH events..."

# Look for sshd accepted entries from around the test time
SEARCH_PATTERN="sshd.*Accepted"
VPS_LOGS=$(ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "sudo tail -100 /var/log/remote/auth.log 2>/dev/null | grep -E '${SEARCH_PATTERN}' | tail -5" 2>/dev/null || echo "")

if [[ -n "$VPS_LOGS" ]]; then
    log_pass "SSH login events found in VPS auth.log"
    echo ""
    echo "Recent SSH login entries:"
    echo "-------------------------"
    echo "$VPS_LOGS"
    echo ""
else
    log_warn "No SSH login events found in VPS auth.log"
    log_info "This might be due to:"
    log_info "  - Log propagation delay (try again in a minute)"
    log_info "  - rsyslog configuration on source"
    log_info "  - TLS connection issues"
fi

# Also check for the specific user
log_info "Checking for ${STX_USER} login events..."
USER_LOGS=$(ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "sudo grep -E 'sshd.*${STX_USER}' /var/log/remote/auth.log 2>/dev/null | tail -3" 2>/dev/null || echo "")

if [[ -n "$USER_LOGS" ]]; then
    log_pass "Found login events for user ${STX_USER}"
    echo "$USER_LOGS"
else
    log_warn "No specific entries for ${STX_USER} found"
fi
echo ""

# =============================================================================
# Check for sudo events if any
# =============================================================================

echo "Step 5: Check for sudo Events (if any)"
echo "---------------------------------------"

SUDO_LOGS=$(ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "sudo grep -E 'sudo.*${STX_USER}' /var/log/remote/auth.log 2>/dev/null | tail -3" 2>/dev/null || echo "")

if [[ -n "$SUDO_LOGS" ]]; then
    log_pass "sudo events found for ${STX_USER}"
    echo "$SUDO_LOGS"
else
    log_info "No sudo events for ${STX_USER} (normal if no sudo was used)"
fi
echo ""

# =============================================================================
# Log Statistics
# =============================================================================

echo "Step 6: Log Statistics"
echo "----------------------"

# Get log file sizes
log_info "Checking VPS log file statistics..."

AUTH_SIZE=$(ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "sudo stat -c '%s' /var/log/remote/auth.log 2>/dev/null || echo 0" 2>/dev/null)
SYSTEM_SIZE=$(ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "sudo stat -c '%s' /var/log/remote/system.log 2>/dev/null || echo 0" 2>/dev/null)

echo "  auth.log size: ${AUTH_SIZE} bytes"
echo "  system.log size: ${SYSTEM_SIZE} bytes"

# Count entries
AUTH_LINES=$(ssh -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" \
    "sudo wc -l < /var/log/remote/auth.log 2>/dev/null || echo 0" 2>/dev/null)
echo "  auth.log entries: ${AUTH_LINES}"
echo ""

# =============================================================================
# Summary
# =============================================================================

echo "=============================================="
echo "SSH Login Test Complete"
echo "=============================================="
echo ""
echo "Test ID: ${TEST_ID}"
echo "Source: ${STX_HOST}"
echo "VPS: ${VPS_IP}"
echo ""
echo "Manual Verification:"
echo "  # View recent auth events on VPS:"
echo "  ssh ${VPS_USER}@${VPS_IP} 'sudo tail -50 /var/log/remote/auth.log'"
echo ""
echo "  # Watch live events:"
echo "  ssh ${VPS_USER}@${VPS_IP} 'sudo tail -f /var/log/remote/auth.log'"
echo ""
echo "  # Search for specific user:"
echo "  ssh ${VPS_USER}@${VPS_IP} 'sudo grep ${STX_USER} /var/log/remote/auth.log'"
echo ""

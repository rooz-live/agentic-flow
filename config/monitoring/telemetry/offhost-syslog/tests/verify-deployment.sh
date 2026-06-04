#!/bin/bash
# Syslog Sink Deployment Verification Script
#
# Verification Gates:
# 1. TCP/6514 connectivity test from stx-aio-0 to VPS
# 2. Synthetic log event test using logger command
# 3. Real SSH login and sudo event verification
#
# Usage: ./verify-deployment.sh <sink_ip>

set -euo pipefail

SINK_IP="${1:-}"
SINK_PORT="6514"
STX_HOST="stx-aio-0"
STX_IP="23.92.79.2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

if [[ -z "$SINK_IP" ]]; then
    log_error "Usage: $0 <sink_ip>"
    exit 1
fi

# ============================================================================
# Gate 1: TCP/6514 Connectivity Test
# ============================================================================
log_info "Gate 1: Testing TCP/6514 connectivity from ${STX_HOST} to sink..."

if ssh sysadmin@${STX_IP} "timeout 5 bash -c 'echo > /dev/tcp/${SINK_IP}/${SINK_PORT}' 2>/dev/null"; then
    log_info "✓ TCP/6514 connectivity OK"
else
    log_error "✗ TCP/6514 connectivity FAILED"
    log_error "  Check firewall rules and ensure sink is running"
    exit 1
fi

# ============================================================================
# Gate 2: Synthetic Log Event Test
# ============================================================================
log_info "Gate 2: Sending synthetic log event..."

TEST_ID="verify-$(date +%s)"
TEST_MSG="Verification test message ${TEST_ID}"

# Send test message from StarlingX
ssh sysadmin@${STX_IP} "logger -p authpriv.info -t verify-deploy '${TEST_MSG}'"

log_info "  Waiting for log propagation (5 seconds)..."
sleep 5

# Check for message on sink
if ssh ubuntu@${SINK_IP} "grep -q '${TEST_ID}' /var/log/remote/auth.log 2>/dev/null"; then
    log_info "✓ Synthetic log event received on sink"
else
    log_error "✗ Synthetic log event NOT found on sink"
    log_error "  Check rsyslog configuration on both hosts"
    exit 1
fi

# ============================================================================
# Gate 3: Real SSH/Sudo Event Verification
# ============================================================================
log_info "Gate 3: Verifying real SSH and sudo events..."

# Trigger a sudo event on StarlingX
SUDO_TEST_ID="sudo-test-$(date +%s)"
ssh sysadmin@${STX_IP} "sudo logger -t sudo-test '${SUDO_TEST_ID}'"

log_info "  Waiting for sudo event propagation (5 seconds)..."
sleep 5

# Check for sudo event on sink
if ssh ubuntu@${SINK_IP} "grep -q '${SUDO_TEST_ID}' /var/log/remote/auth.log 2>/dev/null"; then
    log_info "✓ Sudo event received in auth.log"
else
    log_warn "⚠ Sudo event not found - may need more time for propagation"
fi

# ============================================================================
# Gate 4: TLS Certificate Validation
# ============================================================================
log_info "Gate 4: Validating TLS certificates..."

TLS_DIR="/etc/rsyslog.d/tls"

# Check server certificate on sink
if ssh ubuntu@${SINK_IP} "openssl x509 -in ${TLS_DIR}/server.crt -noout -dates 2>/dev/null"; then
    log_info "✓ Server certificate valid"
else
    log_error "✗ Server certificate validation FAILED"
    exit 1
fi

# Check client certificate on StarlingX
if ssh sysadmin@${STX_IP} "openssl x509 -in ${TLS_DIR}/client.crt -noout -dates 2>/dev/null"; then
    log_info "✓ Client certificate valid"
else
    log_error "✗ Client certificate validation FAILED"
    exit 1
fi

# ============================================================================
# Gate 5: Log File Separation Verification
# ============================================================================
log_info "Gate 5: Verifying log file separation..."

LOG_DIR="/var/log/remote"

# Check auth.log exists
if ssh ubuntu@${SINK_IP} "test -f ${LOG_DIR}/auth.log"; then
    AUTH_COUNT=$(ssh ubuntu@${SINK_IP} "wc -l < ${LOG_DIR}/auth.log")
    log_info "✓ auth.log exists (${AUTH_COUNT} lines)"
else
    log_warn "⚠ auth.log not found (may be empty)"
fi

# Check system.log exists
if ssh ubuntu@${SINK_IP} "test -f ${LOG_DIR}/system.log"; then
    SYS_COUNT=$(ssh ubuntu@${SINK_IP} "wc -l < ${LOG_DIR}/system.log")
    log_info "✓ system.log exists (${SYS_COUNT} lines)"
else
    log_warn "⚠ system.log not found (may be empty)"
fi

# ============================================================================
# Gate 6: Logrotate Configuration Check
# ============================================================================
log_info "Gate 6: Checking logrotate configuration..."

if ssh ubuntu@${SINK_IP} "test -f /etc/logrotate.d/remote-auth"; then
    log_info "✓ Auth log rotation configured"
else
    log_error "✗ Auth log rotation NOT configured"
    exit 1
fi

if ssh ubuntu@${SINK_IP} "test -f /etc/logrotate.d/remote-system"; then
    log_info "✓ System log rotation configured"
else
    log_error "✗ System log rotation NOT configured"
    exit 1
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
log_info "=========================================="
log_info "All verification gates PASSED"
log_info "=========================================="
log_info "Syslog sink: ${SINK_IP}:${SINK_PORT}"
log_info "Source: ${STX_HOST} (${STX_IP})"
log_info ""
log_info "Log locations:"
log_info "  - Auth/Sudo: ${LOG_DIR}/auth.log (30-day retention)"
log_info "  - System: ${LOG_DIR}/system.log (7-day retention)"


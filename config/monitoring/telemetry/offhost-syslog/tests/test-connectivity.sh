#!/bin/bash
# =============================================================================
# Test Connectivity - TCP/6514 and TLS Verification
# =============================================================================
# Purpose: Verify TCP and TLS connectivity between source and VPS
# Run From: stx-aio-0 or any client with certificates
# =============================================================================

set -euo pipefail

# Configuration
VPS_IP="${1:-}"
SYSLOG_PORT="${SYSLOG_PORT:-6514}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-10}"

# Certificate paths (adjust if different)
CA_CERT="${CA_CERT:-/etc/ssl/certs/observability-ca.crt}"
CLIENT_CERT="${CLIENT_CERT:-/etc/ssl/certs/stx-aio-0.crt}"
CLIENT_KEY="${CLIENT_KEY:-/etc/ssl/private/stx-aio-0.key}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    echo -e "[INFO] $*"
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
    echo "Tests TCP/6514 connectivity and TLS handshake to VPS syslog sink."
    echo ""
    echo "Environment variables:"
    echo "  CA_CERT      - Path to CA certificate (default: /etc/ssl/certs/observability-ca.crt)"
    echo "  CLIENT_CERT  - Path to client certificate (default: /etc/ssl/certs/stx-aio-0.crt)"
    echo "  CLIENT_KEY   - Path to client key (default: /etc/ssl/private/stx-aio-0.key)"
    echo ""
    exit 1
fi

# =============================================================================
# Tests
# =============================================================================

echo "=============================================="
echo "Off-Host Syslog - Connectivity Test"
echo "=============================================="
echo "Target: ${VPS_IP}:${SYSLOG_PORT}"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=============================================="
echo ""

# Test 1: Basic TCP connectivity
echo "Test 1: TCP Connectivity"
echo "------------------------"
if timeout "$TIMEOUT_SECONDS" bash -c "echo >/dev/tcp/$VPS_IP/$SYSLOG_PORT" 2>/dev/null; then
    log_pass "TCP connection to ${VPS_IP}:${SYSLOG_PORT} successful"
else
    log_fail "Cannot establish TCP connection to ${VPS_IP}:${SYSLOG_PORT}"
    log_info "Check: VPS is running, firewall allows 23.92.79.2 on port 6514"
fi
echo ""

# Test 2: Check local certificates exist
echo "Test 2: Local Certificate Files"
echo "--------------------------------"
if [[ -f "$CA_CERT" ]]; then
    log_pass "CA certificate exists: $CA_CERT"
else
    log_fail "CA certificate not found: $CA_CERT"
fi

if [[ -f "$CLIENT_CERT" ]]; then
    log_pass "Client certificate exists: $CLIENT_CERT"
else
    log_fail "Client certificate not found: $CLIENT_CERT"
fi

if [[ -f "$CLIENT_KEY" ]]; then
    log_pass "Client key exists: $CLIENT_KEY"
    
    # Check key permissions
    key_perms=$(stat -c '%a' "$CLIENT_KEY" 2>/dev/null || stat -f '%Lp' "$CLIENT_KEY" 2>/dev/null || echo "unknown")
    if [[ "$key_perms" == "600" ]]; then
        log_pass "Client key has correct permissions (0600)"
    else
        log_warn "Client key permissions: $key_perms (should be 600)"
    fi
else
    log_fail "Client key not found: $CLIENT_KEY"
fi
echo ""

# Test 3: TLS handshake (if certificates exist)
echo "Test 3: TLS Handshake"
echo "---------------------"
if [[ -f "$CA_CERT" && -f "$CLIENT_CERT" && -f "$CLIENT_KEY" ]]; then
    handshake_result=$(echo "QUIT" | timeout "$TIMEOUT_SECONDS" openssl s_client \
        -connect "$VPS_IP:$SYSLOG_PORT" \
        -cert "$CLIENT_CERT" \
        -key "$CLIENT_KEY" \
        -CAfile "$CA_CERT" \
        -verify 3 \
        -verify_return_error \
        2>&1) || true
    
    if echo "$handshake_result" | grep -q "Verify return code: 0"; then
        log_pass "TLS handshake successful - mutual authentication verified"
        
        # Extract TLS version
        tls_version=$(echo "$handshake_result" | grep -oP 'Protocol\s*:\s*\K\S+' | head -1 || echo "unknown")
        log_info "TLS Version: $tls_version"
    else
        log_fail "TLS handshake failed"
        error_msg=$(echo "$handshake_result" | grep -E "(error|verify|fail)" | head -3)
        if [[ -n "$error_msg" ]]; then
            log_info "Error: $error_msg"
        fi
    fi
else
    log_warn "Skipping TLS test - certificates not available"
fi
echo ""

# Test 4: Certificate chain validation
echo "Test 4: Certificate Chain Validation"
echo "-------------------------------------"
if [[ -f "$CA_CERT" && -f "$CLIENT_CERT" ]]; then
    if openssl verify -CAfile "$CA_CERT" "$CLIENT_CERT" 2>&1 | grep -q "OK"; then
        log_pass "Client certificate validates against CA"
    else
        log_fail "Client certificate chain validation failed"
    fi
else
    log_warn "Skipping chain validation - certificates not available"
fi
echo ""

# Test 5: TLS 1.2+ enforcement
echo "Test 5: TLS Protocol Version"
echo "----------------------------"
if [[ -f "$CA_CERT" && -f "$CLIENT_CERT" && -f "$CLIENT_KEY" ]]; then
    # Test TLS 1.2
    tls12_result=$(echo "QUIT" | timeout "$TIMEOUT_SECONDS" openssl s_client \
        -connect "$VPS_IP:$SYSLOG_PORT" \
        -cert "$CLIENT_CERT" \
        -key "$CLIENT_KEY" \
        -CAfile "$CA_CERT" \
        -tls1_2 2>&1) || true
    
    if echo "$tls12_result" | grep -q "Verify return code: 0"; then
        log_pass "TLS 1.2 is supported"
    else
        log_warn "TLS 1.2 connection failed (may still support TLS 1.3)"
    fi
    
    # Test TLS 1.3
    tls13_result=$(echo "QUIT" | timeout "$TIMEOUT_SECONDS" openssl s_client \
        -connect "$VPS_IP:$SYSLOG_PORT" \
        -cert "$CLIENT_CERT" \
        -key "$CLIENT_KEY" \
        -CAfile "$CA_CERT" \
        -tls1_3 2>&1) || true
    
    if echo "$tls13_result" | grep -q "Verify return code: 0"; then
        log_pass "TLS 1.3 is supported"
    else
        log_info "TLS 1.3 not available (not required)"
    fi
fi
echo ""

# =============================================================================
# Summary
# =============================================================================

echo "=============================================="
echo "Test Summary"
echo "=============================================="
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}All connectivity tests PASSED${NC}"
    echo ""
    echo "Next: Run test-synthetic-log.sh to verify log delivery"
    exit 0
else
    echo -e "${RED}${TESTS_FAILED} test(s) FAILED${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Verify VPS is running and accessible"
    echo "  2. Check VPS firewall allows 23.92.79.2 on port 6514"
    echo "  3. Verify certificates are deployed correctly"
    echo "  4. Check rsyslog is running on VPS: systemctl status rsyslog"
    exit 1
fi

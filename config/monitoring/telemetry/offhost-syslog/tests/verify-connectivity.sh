#!/bin/bash
# =============================================================================
# Verification Script - Network Connectivity and TLS
# =============================================================================
# Purpose: Verify TCP/6514 connectivity and TLS handshake between stx-aio-0 and VPS
# Run From: StarlingX server (stx-aio-0.corp.interface.tag.ooo)
# Phase: 3.6 - Verification Gates
# =============================================================================
#
# USAGE:
#   ./verify-connectivity.sh [VPS_IP]
#
# PREREQUISITES:
#   - openssl command available
#   - Certificates deployed to correct locations
#   - Network connectivity to VPS
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
readonly SYSLOG_PORT="6514"
readonly TIMEOUT_SECONDS=10

# Certificate paths (from TLS design doc)
readonly CA_CERT="/etc/ssl/certs/observability-ca.crt"
readonly CLIENT_CERT="/etc/ssl/certs/stx-aio-0.crt"
readonly CLIENT_KEY="/etc/ssl/private/stx-aio-0.key"

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

# =============================================================================
# Prerequisite Checks
# =============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing=0
    
    # Check openssl
    if ! command -v openssl &>/dev/null; then
        log_fail "openssl command not found"
        ((missing++))
    fi
    
    # Check nc (netcat)
    if ! command -v nc &>/dev/null && ! command -v netcat &>/dev/null; then
        log_warn "nc/netcat not found - some tests may be limited"
    fi
    
    # Check timeout command
    if ! command -v timeout &>/dev/null; then
        log_warn "timeout command not found - using alternatives"
    fi
    
    # Check VPS_IP is set
    if [[ "$VPS_IP" == "VPS_IP_ADDRESS" ]]; then
        log_fail "VPS_IP not specified. Usage: $SCRIPT_NAME <VPS_IP>"
        exit 1
    fi
    
    if [[ $missing -gt 0 ]]; then
        log_fail "Missing $missing prerequisite(s)"
        exit 1
    fi
    
    log_pass "Prerequisites check passed"
}

# =============================================================================
# Test: TCP Port Connectivity
# =============================================================================

test_tcp_connectivity() {
    run_test "TCP/6514 Port Connectivity"
    
    log_info "Testing TCP connection to $VPS_IP:$SYSLOG_PORT..."
    
    # Method 1: Using /dev/tcp (bash built-in)
    if timeout "$TIMEOUT_SECONDS" bash -c "echo >/dev/tcp/$VPS_IP/$SYSLOG_PORT" 2>/dev/null; then
        log_pass "TCP connection to $VPS_IP:$SYSLOG_PORT successful"
        return 0
    fi
    
    # Method 2: Using nc if available
    if command -v nc &>/dev/null; then
        if timeout "$TIMEOUT_SECONDS" nc -zv "$VPS_IP" "$SYSLOG_PORT" 2>&1; then
            log_pass "TCP connection to $VPS_IP:$SYSLOG_PORT successful (via nc)"
            return 0
        fi
    fi
    
    log_fail "Cannot establish TCP connection to $VPS_IP:$SYSLOG_PORT"
    log_info "Possible causes:"
    log_info "  - VPS is not running"
    log_info "  - Firewall blocking port 6514"
    log_info "  - rsyslog not listening on port 6514"
    log_info "  - Network routing issues"
    return 1
}

# =============================================================================
# Test: TLS Handshake
# =============================================================================

test_tls_handshake() {
    run_test "TLS Handshake Verification"
    
    log_info "Testing TLS handshake with mutual authentication..."
    
    # Check if certificates exist
    if [[ ! -f "$CA_CERT" ]]; then
        log_fail "CA certificate not found: $CA_CERT"
        return 1
    fi
    
    if [[ ! -f "$CLIENT_CERT" ]]; then
        log_fail "Client certificate not found: $CLIENT_CERT"
        return 1
    fi
    
    if [[ ! -f "$CLIENT_KEY" ]]; then
        log_fail "Client key not found: $CLIENT_KEY"
        return 1
    fi
    
    log_info "Certificates found, attempting TLS connection..."
    
    # Perform TLS handshake with openssl s_client
    local handshake_result
    handshake_result=$(echo "QUIT" | timeout "$TIMEOUT_SECONDS" openssl s_client \
        -connect "$VPS_IP:$SYSLOG_PORT" \
        -cert "$CLIENT_CERT" \
        -key "$CLIENT_KEY" \
        -CAfile "$CA_CERT" \
        -verify 3 \
        -verify_return_error \
        2>&1) || true
    
    # Check for successful handshake
    if echo "$handshake_result" | grep -q "Verify return code: 0"; then
        log_pass "TLS handshake successful - certificate chain verified"
        
        # Extract additional info
        local server_cn
        server_cn=$(echo "$handshake_result" | grep -A1 "Server certificate" | grep "subject" | head -1 || echo "N/A")
        log_info "Server certificate: $server_cn"
        
        return 0
    else
        log_fail "TLS handshake failed"
        
        # Extract error message
        local error_msg
        error_msg=$(echo "$handshake_result" | grep -E "(error|verify|fail)" | head -3)
        if [[ -n "$error_msg" ]]; then
            log_info "Error details:"
            echo "$error_msg"
        fi
        
        return 1
    fi
}

# =============================================================================
# Test: Certificate Chain Validation
# =============================================================================

test_certificate_chain() {
    run_test "Certificate Chain Validation"
    
    log_info "Validating local certificate chain..."
    
    # Verify client certificate against CA
    if openssl verify -CAfile "$CA_CERT" "$CLIENT_CERT" 2>&1 | grep -q "OK"; then
        log_pass "Client certificate validates against CA"
    else
        log_fail "Client certificate validation failed"
        openssl verify -CAfile "$CA_CERT" "$CLIENT_CERT" 2>&1
        return 1
    fi
    
    # Check certificate expiry
    local expiry_date
    expiry_date=$(openssl x509 -enddate -noout -in "$CLIENT_CERT" | cut -d= -f2)
    local expiry_epoch
    expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$expiry_date" +%s 2>/dev/null || echo "0")
    local current_epoch
    current_epoch=$(date +%s)
    local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    if [[ $days_until_expiry -lt 0 ]]; then
        log_fail "Client certificate has EXPIRED!"
        return 1
    elif [[ $days_until_expiry -lt 30 ]]; then
        log_warn "Client certificate expires in $days_until_expiry days"
    else
        log_pass "Client certificate valid for $days_until_expiry days"
    fi
    
    # Check key matches certificate
    local cert_modulus
    local key_modulus
    cert_modulus=$(openssl x509 -noout -modulus -in "$CLIENT_CERT" | openssl md5)
    key_modulus=$(sudo openssl rsa -noout -modulus -in "$CLIENT_KEY" 2>/dev/null | openssl md5)
    
    if [[ "$cert_modulus" == "$key_modulus" ]]; then
        log_pass "Private key matches certificate"
    else
        log_fail "Private key does NOT match certificate"
        return 1
    fi
    
    return 0
}

# =============================================================================
# Test: Server Certificate Verification
# =============================================================================

test_server_certificate() {
    run_test "Remote Server Certificate Verification"
    
    log_info "Fetching and verifying server certificate from $VPS_IP:$SYSLOG_PORT..."
    
    # Fetch server certificate
    local server_cert
    server_cert=$(echo "QUIT" | timeout "$TIMEOUT_SECONDS" openssl s_client \
        -connect "$VPS_IP:$SYSLOG_PORT" \
        -cert "$CLIENT_CERT" \
        -key "$CLIENT_KEY" \
        -CAfile "$CA_CERT" \
        2>/dev/null | openssl x509 2>/dev/null) || true
    
    if [[ -z "$server_cert" ]]; then
        log_fail "Could not retrieve server certificate"
        return 1
    fi
    
    # Check server certificate CN
    local server_cn
    server_cn=$(echo "$server_cert" | openssl x509 -noout -subject | grep -oP 'CN\s*=\s*\K[^,]+' || echo "unknown")
    
    if [[ "$server_cn" == "syslog-sink.internal" ]]; then
        log_pass "Server certificate CN is correct: $server_cn"
    else
        log_warn "Server certificate CN is: $server_cn (expected: syslog-sink.internal)"
    fi
    
    # Verify server certificate against CA
    if echo "$server_cert" | openssl verify -CAfile "$CA_CERT" 2>&1 | grep -q "OK"; then
        log_pass "Server certificate validates against CA"
    else
        log_fail "Server certificate validation failed"
        return 1
    fi
    
    # Check server certificate expiry
    local server_expiry
    server_expiry=$(echo "$server_cert" | openssl x509 -enddate -noout | cut -d= -f2)
    log_info "Server certificate expires: $server_expiry"
    
    return 0
}

# =============================================================================
# Test: TLS Protocol Version
# =============================================================================

test_tls_protocol() {
    run_test "TLS Protocol Version Check"
    
    log_info "Checking supported TLS protocols..."
    
    # Test TLS 1.2
    local tls12_result
    tls12_result=$(echo "QUIT" | timeout "$TIMEOUT_SECONDS" openssl s_client \
        -connect "$VPS_IP:$SYSLOG_PORT" \
        -cert "$CLIENT_CERT" \
        -key "$CLIENT_KEY" \
        -CAfile "$CA_CERT" \
        -tls1_2 2>&1) || true
    
    if echo "$tls12_result" | grep -q "Verify return code: 0"; then
        log_pass "TLS 1.2 is supported"
    else
        log_warn "TLS 1.2 connection failed"
    fi
    
    # Test TLS 1.3 (if available)
    local tls13_result
    tls13_result=$(echo "QUIT" | timeout "$TIMEOUT_SECONDS" openssl s_client \
        -connect "$VPS_IP:$SYSLOG_PORT" \
        -cert "$CLIENT_CERT" \
        -key "$CLIENT_KEY" \
        -CAfile "$CA_CERT" \
        -tls1_3 2>&1) || true
    
    if echo "$tls13_result" | grep -q "Verify return code: 0"; then
        log_pass "TLS 1.3 is supported"
    else
        log_info "TLS 1.3 not available (not critical)"
    fi
    
    return 0
}

# =============================================================================
# Generate Report
# =============================================================================

generate_report() {
    echo ""
    echo "=============================================="
    echo "        CONNECTIVITY VERIFICATION REPORT"
    echo "=============================================="
    echo ""
    echo "Target VPS:     $VPS_IP:$SYSLOG_PORT"
    echo "Source Host:    $(hostname)"
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
        echo -e "${GREEN}All connectivity tests PASSED${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Run verify-logging.sh to test log delivery"
        echo "  2. Monitor /var/log/remote/ on VPS for incoming logs"
        return 0
    else
        echo -e "${RED}$TESTS_FAILED test(s) FAILED${NC}"
        echo ""
        echo "Troubleshooting steps:"
        echo "  1. Verify VPS is running and accessible"
        echo "  2. Check firewall rules on VPS (port 6514)"
        echo "  3. Verify rsyslog is running on VPS"
        echo "  4. Check certificate deployment"
        return 1
    fi
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo "=============================================="
    echo "   Off-Host Syslog Connectivity Verification"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    
    test_tcp_connectivity || true
    test_certificate_chain || true
    test_tls_handshake || true
    test_server_certificate || true
    test_tls_protocol || true
    
    generate_report
    
    if [[ $TESTS_FAILED -gt 0 ]]; then
        exit 1
    fi
    exit 0
}

main "$@"

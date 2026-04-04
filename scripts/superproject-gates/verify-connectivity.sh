#!/bin/bash
# Verify connectivity from stx-aio-0 to syslog sink
# Tests TCP/6514 connectivity, TLS handshake, and certificate chain

set -e

# Configuration
SYSLOG_SINK_IP="${SYSLOG_SINK_IP:-127.0.0.1}"
SYSLOG_SINK_HOSTNAME="${SYSLOG_SINK_HOSTNAME:-vps.example.com}"
SYSLOG_PORT=6514
TLS_DIR="/etc/rsyslog.d/tls"

echo "=== Syslog Connectivity Verification ==="
echo "Target: ${SYSLOG_SINK_IP}:${SYSLOG_PORT}"
echo "Hostname: ${SYSLOG_SINK_HOSTNAME}"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}[PASS]${NC} $message"
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}[FAIL]${NC} $message"
    else
        echo -e "${YELLOW}[INFO]${NC} $message"
    fi
}

# Test 1: TCP Connectivity
echo "Test 1: TCP/6514 Connectivity"
if timeout 5 bash -c "cat < /dev/null > /dev/tcp/${SYSLOG_SINK_IP}/${SYSLOG_PORT}" 2>/dev/null; then
    print_status "PASS" "TCP connection to ${SYSLOG_SINK_IP}:${SYSLOG_PORT} successful"
else
    print_status "FAIL" "TCP connection to ${SYSLOG_SINK_IP}:${SYSLOG_PORT} failed"
    echo "  Possible causes:"
    echo "    - Firewall blocking port 6514"
    echo "    - Syslog sink not running"
    echo "    - Network connectivity issue"
    exit 1
fi
echo ""

# Test 2: TLS Handshake
echo "Test 2: TLS Handshake"
if [ -f "${TLS_DIR}/ca.crt" ] && [ -f "${TLS_DIR}/client.crt" ] && [ -f "${TLS_DIR}/client.key" ]; then
    if timeout 10 openssl s_client -connect ${SYSLOG_SINK_IP}:${SYSLOG_PORT} \
        -CAfile ${TLS_DIR}/ca.crt \
        -cert ${TLS_DIR}/client.crt \
        -key ${TLS_DIR}/client.key \
        -servername ${SYSLOG_SINK_HOSTNAME} \
        -verify_return_error </dev/null 2>&1 | grep -q "Verify return code: 0"; then
        print_status "PASS" "TLS handshake successful with mutual authentication"
    else
        print_status "FAIL" "TLS handshake failed"
        echo "  Possible causes:"
        echo "    - Certificate mismatch"
        echo "    - CA not trusted"
        echo "    - Client certificate not accepted"
        exit 1
    fi
else
    print_status "FAIL" "TLS certificates not found in ${TLS_DIR}"
    exit 1
fi
echo ""

# Test 3: Certificate Chain Verification
echo "Test 3: Certificate Chain Verification"
SERVER_CERT=$(timeout 10 openssl s_client -connect ${SYSLOG_SINK_IP}:${SYSLOG_PORT} \
    -showcerts </dev/null 2>/dev/null | sed -n '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/p')

if [ -n "$SERVER_CERT" ]; then
    echo "$SERVER_CERT" > /tmp/server_cert.pem
    if openssl verify -CAfile ${TLS_DIR}/ca.crt /tmp/server_cert.pem 2>&1 | grep -q "OK"; then
        print_status "PASS" "Server certificate verified against CA"
        openssl x509 -in /tmp/server_cert.pem -noout -subject -issuer -dates
    else
        print_status "FAIL" "Server certificate verification failed"
        exit 1
    fi
    rm -f /tmp/server_cert.pem
else
    print_status "FAIL" "Could not retrieve server certificate"
    exit 1
fi
echo ""

# Test 4: DNS Resolution (if hostname used)
echo "Test 4: DNS Resolution"
if host ${SYSLOG_SINK_HOSTNAME} >/dev/null 2>&1; then
    RESOLVED_IP=$(host ${SYSLOG_SINK_HOSTNAME} | awk '/has address/ {print $4}')
    if [ "$RESOLVED_IP" = "$SYSLOG_SINK_IP" ]; then
        print_status "PASS" "DNS resolution matches expected IP: ${SYSLOG_SINK_IP}"
    else
        print_status "WARN" "DNS resolves to ${RESOLVED_IP}, expected ${SYSLOG_SINK_IP}"
    fi
else
    print_status "INFO" "DNS hostname not resolvable (using IP directly)"
fi
echo ""

echo "=== Connectivity Verification Complete ==="
echo "All tests passed. Syslog client can communicate with sink."

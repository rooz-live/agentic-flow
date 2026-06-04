#!/bin/bash
# Test log ingestion from stx-aio-0 to syslog sink
# Generates synthetic logs and verifies they appear in correct files

set -e

# Configuration
SYSLOG_SINK_IP="${SYSLOG_SINK_IP:-127.0.0.1}"
SYSLOG_SINK_HOSTNAME="${SYSLOG_SINK_HOSTNAME:-vps.example.com}"
AUTH_LOG="/var/log/syslog/auth-sudo.log"
WARN_LOG="/var/log/syslog/system-warn.log"
TEST_MARKER="OFFHOST_SYSLOG_TEST_$(date +%s)"

echo "=== Log Ingestion Test ==="
echo "Test Marker: ${TEST_MARKER}"
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

# Test 1: Generate synthetic authpriv log
echo "Test 1: Generate synthetic authpriv log"
logger -p authpriv.info "${TEST_MARKER} - authpriv test message"
print_status "INFO" "Generated authpriv log with marker: ${TEST_MARKER}"
echo ""

# Test 2: Generate synthetic sudo log
echo "Test 2: Generate synthetic sudo log"
logger -t sudo "${TEST_MARKER} - sudo test message"
print_status "INFO" "Generated sudo log with marker: ${TEST_MARKER}"
echo ""

# Test 3: Generate synthetic warn log
echo "Test 3: Generate synthetic warn log"
logger -p syslog.warning "${TEST_MARKER} - warning test message"
print_status "INFO" "Generated warning log with marker: ${TEST_MARKER}"
echo ""

# Wait for log transmission
echo "Waiting 10 seconds for log transmission..."
sleep 10
echo ""

# Test 4: Verify authpriv logs in auth-sudo.log
echo "Test 4: Verify authpriv logs in ${AUTH_LOG}"
if [ -f "${AUTH_LOG}" ]; then
    if grep -q "${TEST_MARKER}" "${AUTH_LOG}"; then
        print_status "PASS" "Authpriv logs found in ${AUTH_LOG}"
        echo "  Matching entries:"
        grep "${TEST_MARKER}" "${AUTH_LOG}" | tail -5
    else
        print_status "FAIL" "Authpriv logs NOT found in ${AUTH_LOG}"
        echo "  Last 10 lines of ${AUTH_LOG}:"
        tail -10 "${AUTH_LOG}"
        exit 1
    fi
else
    print_status "FAIL" "Auth log file not found: ${AUTH_LOG}"
    exit 1
fi
echo ""

# Test 5: Verify sudo logs in auth-sudo.log
echo "Test 5: Verify sudo logs in ${AUTH_LOG}"
if grep -q "sudo.*${TEST_MARKER}" "${AUTH_LOG}"; then
    print_status "PASS" "Sudo logs found in ${AUTH_LOG}"
else
    print_status "FAIL" "Sudo logs NOT found in ${AUTH_LOG}"
    exit 1
fi
echo ""

# Test 6: Verify warn logs in system-warn.log
echo "Test 6: Verify warn logs in ${WARN_LOG}"
if [ -f "${WARN_LOG}" ]; then
    if grep -q "${TEST_MARKER}" "${WARN_LOG}"; then
        print_status "PASS" "Warning logs found in ${WARN_LOG}"
        echo "  Matching entries:"
        grep "${TEST_MARKER}" "${WARN_LOG}" | tail -5
    else
        print_status "FAIL" "Warning logs NOT found in ${WARN_LOG}"
        echo "  Last 10 lines of ${WARN_LOG}:"
        tail -10 "${WARN_LOG}"
        exit 1
    fi
else
    print_status "FAIL" "Warn log file not found: ${WARN_LOG}"
    exit 1
fi
echo ""

# Test 7: Verify log format
echo "Test 7: Verify log format"
if grep "${TEST_MARKER}" "${AUTH_LOG}" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}'; then
    print_status "PASS" "Log format includes ISO timestamp"
else
    print_status "WARN" "Log format may not match expected format"
fi

if grep "${TEST_MARKER}" "${AUTH_LOG}" | grep -qE 'stx-aio-0'; then
    print_status "PASS" "Log format includes hostname"
else
    print_status "WARN" "Log format may not include hostname"
fi
echo ""

# Test 8: Verify file permissions
echo "Test 8: Verify file permissions"
AUTH_PERMS=$(stat -c "%a" "${AUTH_LOG}" 2>/dev/null || stat -f "%Lp" "${AUTH_LOG}" 2>/dev/null)
WARN_PERMS=$(stat -c "%a" "${WARN_LOG}" 2>/dev/null || stat -f "%Lp" "${WARN_LOG}" 2>/dev/null)

if [ "$AUTH_PERMS" = "600" ]; then
    print_status "PASS" "Auth log permissions: 0600"
else
    print_status "WARN" "Auth log permissions: ${AUTH_PERMS} (expected 0600)"
fi

if [ "$WARN_PERMS" = "600" ]; then
    print_status "PASS" "Warn log permissions: 0600"
else
    print_status "WARN" "Warn log permissions: ${WARN_PERMS} (expected 0600)"
fi
echo ""

echo "=== Log Ingestion Test Complete ==="
echo "All tests passed. Logs are being ingested correctly."

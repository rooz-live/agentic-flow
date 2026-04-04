#!/bin/bash
# Verify logrotate configuration and retention policies
# Checks logrotate configuration, retention periods, and file permissions

set -e

# Configuration
LOGROTATE_CONF="/etc/logrotate.d/offhost-syslog"
AUTH_LOG="/var/log/syslog/auth-sudo.log"
WARN_LOG="/var/log/syslog/system-warn.log"

echo "=== Log Retention Verification ==="
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

# Test 1: Verify logrotate configuration exists
echo "Test 1: Verify logrotate configuration exists"
if [ -f "${LOGROTATE_CONF}" ]; then
    print_status "PASS" "Logrotate configuration found: ${LOGROTATE_CONF}"
else
    print_status "FAIL" "Logrotate configuration not found: ${LOGROTATE_CONF}"
    exit 1
fi
echo ""

# Test 2: Verify auth log retention (30 days)
echo "Test 2: Verify auth log retention (30 days)"
if grep -q "${AUTH_LOG}" "${LOGROTATE_CONF}"; then
    AUTH_ROTATE=$(grep -A 10 "${AUTH_LOG}" "${LOGROTATE_CONF}" | grep "^rotate" | awk '{print $2}')
    if [ "${AUTH_ROTATE}" = "30" ]; then
        print_status "PASS" "Auth log retention: 30 days (rotate ${AUTH_ROTATE})"
    else
        print_status "FAIL" "Auth log retention: ${AUTH_ROTATE} days (expected 30)"
        exit 1
    fi
else
    print_status "FAIL" "Auth log not configured in logrotate"
    exit 1
fi
echo ""

# Test 3: Verify warn log retention (7 days)
echo "Test 3: Verify warn log retention (7 days)"
if grep -q "${WARN_LOG}" "${LOGROTATE_CONF}"; then
    WARN_ROTATE=$(grep -A 10 "${WARN_LOG}" "${LOGROTATE_CONF}" | grep "^rotate" | awk '{print $2}')
    if [ "${WARN_ROTATE}" = "7" ]; then
        print_status "PASS" "Warn log retention: 7 days (rotate ${WARN_ROTATE})"
    else
        print_status "FAIL" "Warn log retention: ${WARN_ROTATE} days (expected 7)"
        exit 1
    fi
else
    print_status "FAIL" "Warn log not configured in logrotate"
    exit 1
fi
echo ""

# Test 4: Verify daily rotation
echo "Test 4: Verify daily rotation"
if grep -q "daily" "${LOGROTATE_CONF}"; then
    print_status "PASS" "Daily rotation configured"
else
    print_status "FAIL" "Daily rotation not configured"
    exit 1
fi
echo ""

# Test 5: Verify compression
echo "Test 5: Verify compression"
if grep -q "compress" "${LOGROTATE_CONF}"; then
    print_status "PASS" "Log compression enabled"
else
    print_status "WARN" "Log compression not enabled"
fi
echo ""

# Test 6: Verify delay compression
echo "Test 6: Verify delay compression"
if grep -q "delaycompress" "${LOGROTATE_CONF}"; then
    print_status "PASS" "Delay compression enabled"
else
    print_status "WARN" "Delay compression not enabled"
fi
echo ""

# Test 7: Verify rsyslog reload on rotation
echo "Test 7: Verify rsyslog reload on rotation"
if grep -q "systemctl reload rsyslog" "${LOGROTATE_CONF}"; then
    print_status "PASS" "Rsyslog reload configured"
else
    print_status "WARN" "Rsyslog reload not configured"
fi
echo ""

# Test 8: Verify log file permissions in logrotate
echo "Test 8: Verify log file permissions in logrotate"
if grep -q "create 0600 root root" "${LOGROTATE_CONF}"; then
    print_status "PASS" "Log file permissions: 0600 root:root"
else
    print_status "WARN" "Log file permissions may not match expected 0600 root:root"
fi
echo ""

# Test 9: Check for rotated log files
echo "Test 9: Check for rotated log files"
AUTH_ROTATED=$(ls -1 ${AUTH_LOG}.* 2>/dev/null | wc -l)
WARN_ROTATED=$(ls -1 ${WARN_LOG}.* 2>/dev/null | wc -l)

print_status "INFO" "Auth log rotated files: ${AUTH_ROTATED}"
print_status "INFO" "Warn log rotated files: ${WARN_ROTATED}"

if [ ${AUTH_ROTATED} -gt 0 ]; then
    print_status "PASS" "Auth log rotation has occurred"
else
    print_status "INFO" "Auth log rotation not yet occurred (new installation)"
fi

if [ ${WARN_ROTATED} -gt 0 ]; then
    print_status "PASS" "Warn log rotation has occurred"
else
    print_status "INFO" "Warn log rotation not yet occurred (new installation)"
fi
echo ""

# Test 10: Verify current log file permissions
echo "Test 10: Verify current log file permissions"
if [ -f "${AUTH_LOG}" ]; then
    AUTH_PERMS=$(stat -c "%a" "${AUTH_LOG}" 2>/dev/null || stat -f "%Lp" "${AUTH_LOG}" 2>/dev/null)
    AUTH_OWNER=$(stat -c "%U:%G" "${AUTH_LOG}" 2>/dev/null || stat -f "%Su:%Sg" "${AUTH_LOG}" 2>/dev/null)
    
    if [ "$AUTH_PERMS" = "600" ]; then
        print_status "PASS" "Auth log permissions: 0600"
    else
        print_status "WARN" "Auth log permissions: ${AUTH_PERMS} (expected 0600)"
    fi
    
    if [ "$AUTH_OWNER" = "root:root" ]; then
        print_status "PASS" "Auth log ownership: root:root"
    else
        print_status "WARN" "Auth log ownership: ${AUTH_OWNER} (expected root:root)"
    fi
else
    print_status "INFO" "Auth log file not yet created"
fi

if [ -f "${WARN_LOG}" ]; then
    WARN_PERMS=$(stat -c "%a" "${WARN_LOG}" 2>/dev/null || stat -f "%Lp" "${WARN_LOG}" 2>/dev/null)
    WARN_OWNER=$(stat -c "%U:%G" "${WARN_LOG}" 2>/dev/null || stat -f "%Su:%Sg" "${WARN_LOG}" 2>/dev/null)
    
    if [ "$WARN_PERMS" = "600" ]; then
        print_status "PASS" "Warn log permissions: 0600"
    else
        print_status "WARN" "Warn log permissions: ${WARN_PERMS} (expected 0600)"
    fi
    
    if [ "$WARN_OWNER" = "root:root" ]; then
        print_status "PASS" "Warn log ownership: root:root"
    else
        print_status "WARN" "Warn log ownership: ${WARN_OWNER} (expected root:root)"
    fi
else
    print_status "INFO" "Warn log file not yet created"
fi
echo ""

# Test 11: Display logrotate configuration
echo "Test 11: Display logrotate configuration"
echo "--- ${LOGROTATE_CONF} ---"
cat "${LOGROTATE_CONF}"
echo "---"
echo ""

echo "=== Log Retention Verification Complete ==="
echo "Retention policies configured correctly."

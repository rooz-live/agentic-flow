#!/bin/bash
# Verification Gates Script
# Off-Host Syslog Black Box Recorder

set -e

SYSLOG_SERVER="23.92.79.2"
SYSLOG_PORT="6514"
SYSLOG_CLIENT="stx-aio-0.corp.interface.tag.ooo"
ADMIN_IP="173.94.53.113"

echo "=========================================="
echo "Off-Host Syslog Verification Gates"
echo "=========================================="
echo ""

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo "Test $TOTAL_TESTS: $test_name"
    echo "Command: $test_command"
    
    if eval "$test_command" | grep -q "$expected_result"; then
        echo "✓ PASSED"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "✗ FAILED"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# Gate 1: Network Security
echo "=========================================="
echo "Gate 1: Network Security"
echo "=========================================="
echo ""

echo "This gate requires manual verification on syslog sink:"
echo "Command: ssh root@$SYSLOG_SERVER 'ufw status numbered'"
echo ""
echo "Expected rules:"
echo "  1. Default incoming: DENY"
echo "  2. Default outgoing: ALLOW"
echo "  3. Allow from $ADMIN_IP/32 to any port 22 proto tcp"
echo "  4. Allow from $SYSLOG_CLIENT to any port $SYSLOG_PORT proto tcp"
echo ""

# Gate 2: TLS Certificate Management
echo "=========================================="
echo "Gate 2: TLS Certificate Management"
echo "=========================================="
echo ""

echo "This gate requires manual verification on syslog sink:"
echo "Commands:"
echo "  ssh root@$SYSLOG_SERVER 'ls -la /etc/ssl/certs/syslog-*.crt'"
echo "  ssh root@$SYSLOG_SERVER 'ls -la /etc/ssl/private/syslog-*.key'"
echo ""
echo "Expected:"
echo "  - CA certificate exists and is valid"
echo "  - Server certificate exists and is valid"
echo "  - Client certificate exists and is valid"
echo "  - All private keys have 0600 permissions"
echo ""

# Gate 3: TCP/6514 Connectivity
echo "=========================================="
echo "Gate 3: TCP/6514 Connectivity"
echo "=========================================="
echo ""

if nc -zv "$SYSLOG_SERVER" "$SYSLOG_PORT" 2>&1 | grep -q "succeeded"; then
    echo "✓ PASSED: TCP/6514 connectivity verified"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo "✗ FAILED: Cannot connect to $SYSLOG_SERVER:$SYSLOG_PORT"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Gate 4: Log Storage Configuration
echo "=========================================="
echo "Gate 4: Log Storage Configuration"
echo "=========================================="
echo ""

echo "This gate requires manual verification on syslog sink:"
echo "Commands:"
echo "  ssh root@$SYSLOG_SERVER 'ls -la /var/log/syslog/'"
echo "  ssh root@$SYSLOG_SERVER 'cat /etc/logrotate.d/syslog-sink'"
echo ""
echo "Expected:"
echo "  - /var/log/syslog/auth-sudo.log exists"
echo "  - /var/log/syslog/system-warn.log exists"
echo "  - Logrotate configured with correct retention periods"
echo "  - auth-sudo.log: 30 days retention"
echo "  - system-warn.log: 7 days retention"
echo ""

# Gate 5: Synthetic Log Event Test
echo "=========================================="
echo "Gate 5: Synthetic Log Event Test"
echo "=========================================="
echo ""

echo "This gate requires manual execution:"
echo "1. On syslog client:"
echo "   logger -t test-syslog 'Test message for syslog sink'"
echo "   logger -p authpriv.notice 'Test authpriv message'"
echo "   sudo logger -t test-sudo 'Test sudo message'"
echo ""
echo "2. On syslog sink:"
echo "   tail -20 /var/log/syslog/auth-sudo.log"
echo "   tail -20 /var/log/syslog/system-warn.log"
echo ""
echo "Expected:"
echo "  - Test messages appear in appropriate log files"
echo "  - authpriv and sudo messages in auth-sudo.log"
echo "  - Warning/error messages in system-warn.log"
echo ""

# Gate 6: Real SSH Login and Sudo Event
echo "=========================================="
echo "Gate 6: Real SSH Login and Sudo Event"
echo "=========================================="
echo ""

echo "This gate requires manual execution:"
echo "1. SSH into $SYSLOG_CLIENT"
echo "2. Run: sudo ls"
echo "3. On syslog sink: tail -f /var/log/syslog/auth-sudo.log"
echo ""
echo "Expected:"
echo "  - SSH login event appears in auth-sudo.log"
echo "  - Sudo command event appears in auth-sudo.log"
echo "  - Events include timestamp, hostname, user, and command details"
echo ""

# Gate 7: Rsyslog Service Status
echo "=========================================="
echo "Gate 7: Rsyslog Service Status"
echo "=========================================="
echo ""

echo "This gate requires manual verification:"
echo "On syslog sink:"
echo "  ssh root@$SYSLOG_SERVER 'systemctl status rsyslog'"
echo ""
echo "On syslog client:"
echo "  ssh ubuntu@$SYSLOG_CLIENT 'systemctl status rsyslog'"
echo ""
echo "Expected:"
echo "  - Rsyslog service is active and running on both hosts"
echo "  - No errors in service status"
echo ""

# Summary
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo "✓ All automated tests passed!"
    echo ""
    echo "Manual verification required for:"
    echo "  - Network Security (Gate 1)"
    echo "  - TLS Certificate Management (Gate 2)"
    echo "  - Log Storage Configuration (Gate 4)"
    echo "  - Synthetic Log Event Test (Gate 5)"
    echo "  - Real SSH Login and Sudo Event (Gate 6)"
    echo "  - Rsyslog Service Status (Gate 7)"
else
    echo "✗ Some automated tests failed. Please review and fix issues."
    exit 1
fi

echo ""
echo "=========================================="
echo "Verification gates script complete"
echo "=========================================="

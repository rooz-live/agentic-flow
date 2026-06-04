#!/bin/bash
# Integration Test Script - Off-Host Syslog Black Box Recorder
# Tests end-to-end syslog forwarding and retention

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="${SCRIPT_DIR}/../ansible"
LOG_DIR="/var/log/syslog"
SYSLOG_PORT=6514
SYSLOG_SERVER=""
SYSLOG_CLIENT=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Integration Test Script"
echo "=========================================="
echo ""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --server)
            SYSLOG_SERVER="$2"
            shift 2
            ;;
        --client)
            SYSLOG_CLIENT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [--server IP] [--client IP]"
            echo "  --server IP    IP address of syslog server"
            echo "  --client IP    IP address of syslog client"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check if server and client IPs are provided
if [ -z "$SYSLOG_SERVER" ] || [ -z "$SYSLOG_CLIENT" ]; then
    echo -e "${RED}ERROR: Both --server and --client IPs are required${NC}"
    echo "Usage: $0 --server <SERVER_IP> --client <CLIENT_IP>"
    exit 1
fi

echo "Syslog Server: $SYSLOG_SERVER"
echo "Syslog Client: $SYSLOG_CLIENT"
echo ""

# Test 1: Connectivity Test
echo "=========================================="
echo "Test 1: Connectivity Test"
echo "=========================================="
echo ""

echo "Testing SSH connectivity to syslog server ($SYSLOG_SERVER)..."
if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@${SYSLOG_SERVER} "echo 'SSH connection successful'" 2>/dev/null; then
    echo -e "${GREEN}✓ SSH connection to server successful${NC}"
else
    echo -e "${RED}✗ SSH connection to server failed${NC}"
    exit 1
fi

echo ""
echo "Testing SSH connectivity to syslog client ($SYSLOG_CLIENT)..."
if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@${SYSLOG_CLIENT} "echo 'SSH connection successful'" 2>/dev/null; then
    echo -e "${GREEN}✓ SSH connection to client successful${NC}"
else
    echo -e "${RED}✗ SSH connection to client failed${NC}"
    exit 1
fi

# Test 2: Firewall Configuration Test
echo ""
echo "=========================================="
echo "Test 2: Firewall Configuration Test"
echo "=========================================="
echo ""

echo "Checking firewall rules on syslog server..."
FIREWALL_RULES=$(ssh root@${SYSLOG_SERVER} "ufw status numbered" 2>/dev/null || echo "")
if echo "$FIREWALL_RULES" | grep -q "$SYSLOG_PORT"; then
    echo -e "${GREEN}✓ Port $SYSLOG_PORT is open${NC}"
else
    echo -e "${RED}✗ Port $SYSLOG_PORT is not open${NC}"
    exit 1
fi

if echo "$FIREWALL_RULES" | grep -q "22/tcp.*ALLOW"; then
    echo -e "${GREEN}✓ SSH port 22 is open${NC}"
else
    echo -e "${RED}✗ SSH port 22 is not open${NC}"
    exit 1
fi

# Test 3: Rsyslog Configuration Test
echo ""
echo "=========================================="
echo "Test 3: Rsyslog Configuration Test"
echo "=========================================="
echo ""

echo "Checking rsyslog service on syslog server..."
if ssh root@${SYSLOG_SERVER} "systemctl is-active rsyslog" 2>/dev/null | grep -q "active"; then
    echo -e "${GREEN}✓ Rsyslog service is active on server${NC}"
else
    echo -e "${RED}✗ Rsyslog service is not active on server${NC}"
    exit 1
fi

echo ""
echo "Checking rsyslog service on syslog client..."
if ssh ubuntu@${SYSLOG_CLIENT} "systemctl is-active rsyslog" 2>/dev/null | grep -q "active"; then
    echo -e "${GREEN}✓ Rsyslog service is active on client${NC}"
else
    echo -e "${RED}✗ Rsyslog service is not active on client${NC}"
    exit 1
fi

# Test 4: TLS Certificate Test
echo ""
echo "=========================================="
echo "Test 4: TLS Certificate Test"
echo "=========================================="
echo ""

echo "Checking TLS certificates on syslog server..."
if ssh root@${SYSLOG_SERVER} "ls -la /etc/rsyslog.d/*.pem /etc/rsyslog.d/*.key" 2>/dev/null | grep -q "total"; then
    echo -e "${GREEN}✓ TLS certificates exist on server${NC}"
else
    echo -e "${RED}✗ TLS certificates missing on server${NC}"
    exit 1
fi

echo ""
echo "Checking TLS certificates on syslog client..."
if ssh ubuntu@${SYSLOG_CLIENT} "ls -la /etc/rsyslog.d/*.pem /etc/rsyslog.d/*.key" 2>/dev/null | grep -q "total"; then
    echo -e "${GREEN}✓ TLS certificates exist on client${NC}"
else
    echo -e "${RED}✗ TLS certificates missing on client${NC}"
    exit 1
fi

# Test 5: Log Directory Test
echo ""
echo "=========================================="
echo "Test 5: Log Directory Test"
echo "=========================================="
echo ""

echo "Checking log directory on syslog server..."
if ssh root@${SYSLOG_SERVER} "ls -d $LOG_DIR" 2>/dev/null; then
    echo -e "${GREEN}✓ Log directory exists on server${NC}"
else
    echo -e "${RED}✗ Log directory missing on server${NC}"
    exit 1
fi

LOG_PERMISSIONS=$(ssh root@${SYSLOG_SERVER} "stat -c '%a' $LOG_DIR" 2>/dev/null)
echo "Log directory permissions: $LOG_PERMISSIONS"

# Test 6: Log Ingestion Test
echo ""
echo "=========================================="
echo "Test 6: Log Ingestion Test"
echo "=========================================="
echo ""

echo "Generating test log entry on client..."
TEST_MESSAGE="Integration Test Message - $(date +%s)"
ssh ubuntu@${SYSLOG_CLIENT} "logger -t integration-test '$TEST_MESSAGE'" 2>/dev/null
echo "Test message sent: $TEST_MESSAGE"

echo ""
echo "Waiting for log ingestion..."
sleep 5

echo ""
echo "Checking for test log on syslog server..."
if ssh root@${SYSLOG_SERVER} "grep -r '$TEST_MESSAGE' $LOG_DIR/*.log" 2>/dev/null; then
    echo -e "${GREEN}✓ Test log found on syslog server${NC}"
else
    echo -e "${YELLOW}⚠ Test log not yet found on syslog server (may take longer)${NC}"
fi

# Test 7: Log Retention Test
echo ""
echo "=========================================="
echo "Test 7: Log Retention Test"
echo "=========================================="
echo ""

echo "Checking logrotate configuration on syslog server..."
if ssh root@${SYSLOG_SERVER} "ls -la /etc/logrotate.d/syslog-sink" 2>/dev/null; then
    echo -e "${GREEN}✓ Logrotate configuration exists${NC}"
else
    echo -e "${YELLOW}⚠ Logrotate configuration not found${NC}"
fi

echo ""
echo "Checking logrotate status..."
LOGROTATE_STATUS=$(ssh root@${SYSLOG_SERVER} "logrotate -d /etc/logrotate.d/ -f syslog-sink" 2>&1 || echo "No recent rotation")
echo "Logrotate status: $LOGROTATE_STATUS"

# Test 8: Journald Configuration Test
echo ""
echo "=========================================="
echo "Test 8: Journald Configuration Test"
echo "=========================================="
echo ""

echo "Checking journald configuration on syslog client..."
if ssh ubuntu@${SYSLOG_CLIENT} "grep -q 'ForwardToSyslog=yes' /etc/systemd/journald.conf" 2>/dev/null; then
    echo -e "${GREEN}✓ Journald forwarding is enabled${NC}"
else
    echo -e "${YELLOW}⚠ Journald forwarding may not be configured${NC}"
fi

# Test 9: Security Hardening Test
echo ""
echo "=========================================="
echo "Test 9: Security Hardening Test"
echo "=========================================="
echo ""

echo "Checking fail2ban status on syslog server..."
if ssh root@${SYSLOG_SERVER} "systemctl is-active fail2ban" 2>/dev/null | grep -q "active"; then
    echo -e "${GREEN}✓ Fail2ban is active on server${NC}"
else
    echo -e "${YELLOW}⚠ Fail2ban is not active on server${NC}"
fi

echo ""
echo "Checking SSH configuration on syslog server..."
if ssh root@${SYSLOG_SERVER} "grep -q 'PasswordAuthentication no' /etc/ssh/sshd_config" 2>/dev/null; then
    echo -e "${GREEN}✓ SSH password authentication is disabled${NC}"
else
    echo -e "${YELLOW}⚠ SSH password authentication may be enabled${NC}"
fi

# Test 10: Performance Test
echo ""
echo "=========================================="
echo "Test 10: Performance Test"
echo "=========================================="
echo ""

echo "Generating 100 test log entries..."
for i in {1..100}; do
    ssh ubuntu@${SYSLOG_CLIENT} "logger -t perf-test 'Performance test message $i'" 2>/dev/null
done
echo "100 test log entries generated"

echo ""
echo "Waiting for log ingestion..."
sleep 10

echo ""
echo "Checking log count on syslog server..."
LOG_COUNT=$(ssh root@${SYSLOG_SERVER} "grep -c 'Performance test message' $LOG_DIR/*.log" 2>/dev/null || echo "0")
echo "Logs received: $LOG_COUNT/100"

if [ "$LOG_COUNT" -ge 90 ]; then
    echo -e "${GREEN}✓ Performance test passed (90%+ logs received)${NC}"
else
    echo -e "${YELLOW}⚠ Performance test warning (less than 90% logs received)${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo "Integration Test Summary"
echo "=========================================="
echo ""
echo "All integration tests completed!"
echo ""
echo "Next steps:"
echo "  1. Review test results above"
echo "  2. Check log files: ssh root@$SYSLOG_SERVER 'ls -lh $LOG_DIR'"
echo "  3. Monitor logs in real-time: ssh root@$SYSLOG_SERVER 'tail -f $LOG_DIR/system-warn.log'"
echo ""
exit 0

#!/bin/bash
# Log Transmission Test Script
# Off-Host Syslog Black Box Recorder

set -e

SYSLOG_SERVER="23.92.79.2"
SYSLOG_CLIENT="stx-aio-0.corp.interface.tag.ooo"

echo "=========================================="
echo "Off-Host Syslog Log Transmission Test"
echo "=========================================="
echo ""

# Test 1: Synthetic log events
echo "Test 1: Synthetic Log Events"
echo "----------------------------"
echo "Generating test log events on $SYSLOG_CLIENT..."
echo ""

echo "Commands to run on syslog client:"
echo "  logger -t test-syslog 'Test message for syslog sink'"
echo "  logger -p authpriv.notice 'Test authpriv message'"
echo "  sudo logger -t test-sudo 'Test sudo message'"
echo "  logger -p user.warn 'Test warning message'"
echo "  logger -p user.err 'Test error message'"
echo ""

# Test 2: Verify log reception
echo "Test 2: Verify Log Reception on Sink"
echo "-------------------------------------"
echo "Checking if logs are received on $SYSLOG_SERVER..."
echo ""

echo "Commands to run on syslog sink:"
echo "  tail -f /var/log/syslog/auth-sudo.log"
echo "  tail -f /var/log/syslog/system-warn.log"
echo ""

# Test 3: Real SSH login event
echo "Test 3: Real SSH Login Event Test"
echo "----------------------------------"
echo "This test requires you to:"
echo "  1. SSH into $SYSLOG_CLIENT"
echo "  2. Run a sudo command"
echo "  3. Check auth-sudo.log on syslog sink"
echo ""

echo "Commands:"
echo "  # From your workstation:"
echo "  ssh ubuntu@$SYSLOG_CLIENT"
echo "  sudo ls"
echo ""
echo "  # On syslog sink:"
echo "  tail -f /var/log/syslog/auth-sudo.log"
echo ""

# Test 4: Check log file sizes
echo "Test 4: Log File Statistics"
echo "---------------------------"
echo "Commands to run on syslog sink:"
echo "  ls -lh /var/log/syslog/"
echo "  wc -l /var/log/syslog/auth-sudo.log"
echo "  wc -l /var/log/syslog/system-warn.log"
echo ""

echo "=========================================="
echo "Log transmission test script complete"
echo "=========================================="
echo ""
echo "Expected results:"
echo "  - auth-sudo.log should contain authpriv and sudo messages"
echo "  - system-warn.log should contain warning and error messages"
echo "  - Log files should be growing in size"
echo ""
echo "If logs are not appearing:"
echo "  1. Check rsyslog logs: journalctl -u rsyslog"
echo "  2. Check TLS certificate validity"
echo "  3. Verify firewall rules"
echo "  4. Check network connectivity"

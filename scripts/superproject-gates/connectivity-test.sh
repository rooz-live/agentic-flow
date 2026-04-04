#!/bin/bash
# Connectivity Test Script
# Off-Host Syslog Black Box Recorder

set -e

SYSLOG_SERVER="23.92.79.2"
SYSLOG_PORT="6514"
SYSLOG_CLIENT="stx-aio-0.corp.interface.tag.ooo"

echo "=========================================="
echo "Off-Host Syslog Connectivity Test"
echo "=========================================="
echo ""

# Test 1: TCP/6514 Connectivity from client to server
echo "Test 1: TCP/6514 Connectivity Test"
echo "-----------------------------------"
echo "Testing connectivity from $SYSLOG_CLIENT to $SYSLOG_SERVER:$SYSLOG_PORT"

# Check if nc is available
if ! command -v nc &> /dev/null; then
    echo "ERROR: nc (netcat) is not installed. Please install it first."
    exit 1
fi

# Test TCP connectivity
if nc -zv "$SYSLOG_SERVER" "$SYSLOG_PORT" 2>&1 | grep -q "succeeded"; then
    echo "✓ SUCCESS: TCP/6514 connection to $SYSLOG_SERVER:$SYSLOG_PORT succeeded"
else
    echo "✗ FAILED: Cannot connect to $SYSLOG_SERVER:$SYSLOG_PORT"
    echo "Please check:"
    echo "  1. Firewall rules on syslog sink"
    echo "  2. rsyslog service is running on syslog sink"
    echo "  3. Network connectivity between hosts"
    exit 1
fi

echo ""

# Test 2: Check if rsyslog is running on sink
echo "Test 2: Rsyslog Service Status on Sink"
echo "---------------------------------------"
echo "Checking if rsyslog is running on $SYSLOG_SERVER"

# This would typically be run via SSH, showing the command
echo "Command to run on syslog sink:"
echo "  ssh root@$SYSLOG_SERVER 'systemctl status rsyslog'"
echo ""

# Test 3: Check firewall rules
echo "Test 3: Firewall Rules Verification"
echo "------------------------------------"
echo "Expected firewall rules on syslog sink:"
echo "  ufw default deny incoming"
echo "  ufw default allow outgoing"
echo "  ufw allow from 173.94.53.113/32 to any port 22 proto tcp"
echo "  ufw allow from $SYSLOG_CLIENT to any port $SYSLOG_PORT proto tcp"
echo ""
echo "Command to verify:"
echo "  ssh root@$SYSLOG_SERVER 'ufw status numbered'"
echo ""

# Test 4: Check TLS certificate files exist
echo "Test 4: TLS Certificate Verification"
echo "-------------------------------------"
echo "Expected files on syslog sink:"
echo "  /etc/ssl/certs/syslog-ca.crt"
echo "  /etc/ssl/certs/syslog-server.crt"
echo "  /etc/ssl/private/syslog-server.key (0600 permissions)"
echo ""
echo "Expected files on syslog client:"
echo "  /etc/ssl/certs/syslog-ca.crt"
echo "  /etc/ssl/certs/syslog-client.crt"
echo "  /etc/ssl/private/syslog-client.key (0600 permissions)"
echo ""

echo "=========================================="
echo "Connectivity test script complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Run log-test.sh to test log transmission"
echo "  2. Run verification-gates.sh for full verification"

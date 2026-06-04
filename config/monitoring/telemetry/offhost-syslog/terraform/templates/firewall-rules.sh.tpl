#!/bin/bash
# Firewall Configuration Script for Syslog Sink
# Off-Host Syslog Black Box Recorder

set -e

echo "Configuring UFW firewall rules..."

# Reset existing rules
ufw --force reset

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH from admin IP only
ufw allow from ${admin_ip}/32 to any port 22 proto tcp

# Allow syslog TLS from client only
ufw allow from ${syslog_client} to any port ${syslog_port} proto tcp

# Enable firewall
ufw --force enable

echo "Firewall configuration complete."
echo "Active rules:"
ufw status numbered

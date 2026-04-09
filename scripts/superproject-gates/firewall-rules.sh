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
ufw allow from 173.94.53.113/32 to any port 22 proto tcp
ufw allow from 173.94.53.113/32 to any port 2222 proto tcp

# Allow syslog TLS from client only
ufw allow from 23.92.79.2 to any port 6514 proto tcp

# Enable firewall
ufw --force enable

echo "Firewall configuration complete."
echo "Active rules:"
ufw status numbered

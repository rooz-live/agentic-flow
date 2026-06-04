#!/bin/bash
# Off-Host Syslog Sink - Initial Setup Script
# This script runs on first boot to configure the VPS
#
# Security hardening and rsyslog TLS configuration
# managed by Ansible after initial provisioning

set -euo pipefail

# ============================================================================
# System Updates
# ============================================================================
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# ============================================================================
# Install Required Packages
# ============================================================================
apt-get install -y \
    rsyslog \
    rsyslog-gnutls \
    logrotate \
    ufw \
    fail2ban \
    unattended-upgrades \
    curl \
    jq

# ============================================================================
# Configure UFW Firewall
# ============================================================================
ufw default deny incoming
ufw default allow outgoing

# SSH only from admin IP
ufw allow from ${admin_ssh_cidr} to any port 22 proto tcp comment 'SSH admin'

# Syslog TLS only from StarlingX
ufw allow from ${starlingx_ip} to any port 6514 proto tcp comment 'Syslog TLS'

# Enable UFW
ufw --force enable

# ============================================================================
# Create Log Directories
# ============================================================================
mkdir -p /var/log/remote
chown syslog:adm /var/log/remote
chmod 750 /var/log/remote

# ============================================================================
# Create TLS Directory
# ============================================================================
mkdir -p /etc/rsyslog.d/tls
chmod 700 /etc/rsyslog.d/tls
chown root:root /etc/rsyslog.d/tls

# ============================================================================
# Configure fail2ban
# ============================================================================
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# ============================================================================
# SSH Hardening
# ============================================================================
cat >> /etc/ssh/sshd_config << 'EOF'

# Security Hardening
PermitRootLogin no
PasswordAuthentication no
ChallengeResponseAuthentication no
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
MaxAuthTries 3
LoginGraceTime 20
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

systemctl restart sshd

# ============================================================================
# Enable Unattended Upgrades
# ============================================================================
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

# ============================================================================
# Mark Setup Complete
# ============================================================================
touch /var/lib/cloud/instance/user-data-complete
echo "Initial setup completed at $(date)" >> /var/log/user-data.log


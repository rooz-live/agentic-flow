#!/bin/bash
# Cloud-init user-data script for Off-Host Syslog Black Box Recorder
# Runs on first boot of VPS

set -e

# Update system packages
apt-get update -y
apt-get upgrade -y

# Install essential packages
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    ufw \
    fail2ban \
    rsyslog \
    rsyslog-gnutls \
    logrotate \
    ca-certificates \
    gnupg \
    lsb-release

# Configure UFW default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (will be further restricted by Ansible)
ufw allow 22/tcp

# Enable UFW
ufw --force enable

# Configure fail2ban for SSH protection
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

# Restart fail2ban
systemctl enable fail2ban
systemctl restart fail2ban

# Create log directory
mkdir -p /var/log/syslog
chmod 755 /var/log/syslog
chown root:adm /var/log/syslog

# Configure rsyslog to start on boot
systemctl enable rsyslog

# Configure automatic security updates
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

apt-get install -y unattended-upgrades
systemctl enable unattended-upgrades

# Set timezone
timedatectl set-timezone UTC

# Disable root password login (SSH key only)
sed -i 's/#PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Restart SSH service
systemctl restart sshd

# Create a marker file to indicate user-data has run
touch /var/lib/cloud/instance/user-data-complete

echo "User-data script completed successfully"

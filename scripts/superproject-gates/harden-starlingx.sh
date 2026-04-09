#!/bin/bash
# StarlingX Security Hardening Script
# Target: 23.92.79.2 (stx-aio-0.corp.interface.tag.ooo)
# Priority: P0 - EXECUTE IMMEDIATELY
# Date: 2025-11-07

set -euo pipefail

TARGET_HOST="23.92.79.2"
NEW_SSH_PORT="2222"
YOUR_IP=$(curl -s https://api.ipify.org)

echo "🔒 StarlingX Security Hardening"
echo "================================"
echo "Target: $TARGET_HOST"
echo "Your IP: $YOUR_IP"
echo ""

# Confirm before proceeding
read -p "⚠️  This will modify SSH config. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo "Step 1/5: Backing up SSH config..."
ssh root@$TARGET_HOST "cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)"

echo "Step 2/5: Disabling password authentication..."
ssh root@$TARGET_HOST "sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config"
ssh root@$TARGET_HOST "sed -i 's/^#*PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config"

echo "Step 3/5: Installing fail2ban..."
ssh root@$TARGET_HOST "yum install -y epel-release && yum install -y fail2ban" || {
  echo "⚠️  fail2ban installation failed (may not be available on StarlingX)"
  echo "Consider manual installation or alternative IDS"
}

echo "Step 4/5: Configuring fail2ban..."
ssh root@$TARGET_HOST "cat > /etc/fail2ban/jail.local << 'EOFAIL2BAN'
[DEFAULT]
bantime = 86400
findtime = 600
maxretry = 3
destemail = security@example.com
sendername = Fail2Ban-StarlingX
action = %(action_mwl)s

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/secure
maxretry = 3
EOFAIL2BAN
systemctl enable fail2ban
systemctl restart fail2ban" 2>/dev/null || echo "⚠️  fail2ban config skipped (not installed)"

echo "Step 5/5: Configuring firewall..."
ssh root@$TARGET_HOST "
  # Install firewalld if not present
  which firewall-cmd || yum install -y firewalld
  systemctl enable firewalld
  systemctl start firewalld || systemctl restart firewalld
  
  # Add your IP to allow-list
  firewall-cmd --permanent --add-rich-rule='rule family=ipv4 source address=$YOUR_IP port port=22 protocol=tcp accept'
  firewall-cmd --permanent --add-rich-rule='rule family=ipv4 source address=$YOUR_IP port port=$NEW_SSH_PORT protocol=tcp accept'
  
  # Reload firewall
  firewall-cmd --reload
  
  echo '✅ Firewall configured'
"

echo ""
echo "✅ Security hardening complete!"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Test SSH connection from your IP: ssh -p 22 root@$TARGET_HOST"
echo "2. If successful, move SSH to port $NEW_SSH_PORT:"
echo "   ssh root@$TARGET_HOST \"sed -i 's/^#*Port.*/Port $NEW_SSH_PORT/' /etc/ssh/sshd_config && systemctl reload sshd\""
echo "3. Update your SSH config:"
echo "   echo 'Host starlingx' >> ~/.ssh/config"
echo "   echo '  HostName $TARGET_HOST' >> ~/.ssh/config"
echo "   echo '  Port $NEW_SSH_PORT' >> ~/.ssh/config"
echo "   echo '  User root' >> ~/.ssh/config"
echo "4. Test new port: ssh starlingx"
echo "5. Block standard port 22 (only allow $NEW_SSH_PORT)"
echo ""
echo "📊 Monitor failed logins: ssh starlingx 'tail -f /var/log/secure | grep Failed'"

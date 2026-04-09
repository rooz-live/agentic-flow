#!/bin/bash
set -e

TARGET="23.92.79.2"
YOUR_IP="173.94.53.113"
SSH_PORT="2222"

echo "🔐 StarlingX Security Refinement"
echo "================================"
echo "Target: $TARGET"
echo "Your IP: $YOUR_IP"
echo ""

# Backup current firewall config
echo "📋 Step 1/7: Backing up current firewall configuration..."
ssh -p $SSH_PORT root@$TARGET 'firewall-cmd --list-all > /root/firewall-backup-$(date +%Y%m%d-%H%M%S).txt'

# Remove port 22
echo "🔒 Step 2/7: Removing legacy SSH port 22..."
ssh -p $SSH_PORT root@$TARGET 'firewall-cmd --permanent --remove-rich-rule="rule family=\"ipv4\" source address=\"'$YOUR_IP'\" port port=\"22\" protocol=\"tcp\" accept"'
ssh -p $SSH_PORT root@$TARGET 'firewall-cmd --reload'
echo "✅ Port 22 removed"

# Restrict OpenStack API ports to your IP only
echo "🔐 Step 3/7: Restricting OpenStack service ports to your IP..."
OPENSTACK_PORTS=(5000 8774 9292 9696 8776)
for port in "${OPENSTACK_PORTS[@]}"; do
    ssh -p $SSH_PORT root@$TARGET "firewall-cmd --permanent --remove-port=${port}/tcp 2>/dev/null || true"
    ssh -p $SSH_PORT root@$TARGET "firewall-cmd --permanent --add-rich-rule='rule family=\"ipv4\" source address=\"$YOUR_IP\" port port=\"${port}\" protocol=\"tcp\" accept'"
    echo "  ✓ Port $port restricted to $YOUR_IP"
done

# Restrict web interfaces to your IP
echo "🌐 Step 4/7: Restricting web interfaces to your IP..."
WEB_PORTS=(80 443 8080 8081 8443 8444 9090 3000 9100)
for port in "${WEB_PORTS[@]}"; do
    ssh -p $SSH_PORT root@$TARGET "firewall-cmd --permanent --remove-service=http 2>/dev/null || true"
    ssh -p $SSH_PORT root@$TARGET "firewall-cmd --permanent --remove-service=https 2>/dev/null || true"
    ssh -p $SSH_PORT root@$TARGET "firewall-cmd --permanent --remove-port=${port}/tcp 2>/dev/null || true"
    ssh -p $SSH_PORT root@$TARGET "firewall-cmd --permanent --add-rich-rule='rule family=\"ipv4\" source address=\"$YOUR_IP\" port port=\"${port}\" protocol=\"tcp\" accept'"
    echo "  ✓ Port $port restricted to $YOUR_IP"
done

ssh -p $SSH_PORT root@$TARGET 'firewall-cmd --reload'

# Configure fail2ban for additional services
echo "🛡️  Step 5/7: Configuring fail2ban jails..."
ssh -p $SSH_PORT root@$TARGET 'cat > /etc/fail2ban/jail.local << "JAILEOF"
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
banaction = firewallcmd-rich-rules

[sshd]
enabled = true
port = 2222
logpath = /var/log/secure
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
JAILEOF'

ssh -p $SSH_PORT root@$TARGET 'systemctl restart fail2ban'
echo "✅ fail2ban jails configured"

# Configure manual update checking (StarlingX-appropriate)
echo "📦 Step 6/7: Configuring update monitoring..."
ssh -p $SSH_PORT root@$TARGET 'cat > /usr/local/bin/check-updates.sh << "UPDATEEOF"
#!/bin/bash
# StarlingX Update Checker - Manual controlled updates
LOG_FILE="/var/log/update-check.log"
UPDATES_AVAILABLE="/var/tmp/updates-available.txt"

echo "=== Update Check: $(date) ===" >> "$LOG_FILE"

# Check for available updates
dnf check-update > "$UPDATES_AVAILABLE" 2>&1 || true

# Count available updates
UPDATE_COUNT=$(grep -E "^[a-zA-Z0-9]" "$UPDATES_AVAILABLE" | wc -l)

if [ "$UPDATE_COUNT" -gt 0 ]; then
    echo "⚠️  $UPDATE_COUNT updates available" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    echo "Security updates:" | tee -a "$LOG_FILE"
    dnf updateinfo list security 2>/dev/null | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    echo "To apply updates manually:" | tee -a "$LOG_FILE"
    echo "  dnf update -y  # All updates" | tee -a "$LOG_FILE"
    echo "  dnf update --security -y  # Security only" | tee -a "$LOG_FILE"
else
    echo "✅ System is up to date" | tee -a "$LOG_FILE"
fi

echo "========================================" >> "$LOG_FILE"
UPDATEEOF'

ssh -p $SSH_PORT root@$TARGET 'chmod +x /usr/local/bin/check-updates.sh'

# Create systemd timer for weekly update checks
ssh -p $SSH_PORT root@$TARGET 'cat > /etc/systemd/system/check-updates.service << "SERVICEEOF"
[Unit]
Description=Check for system updates
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/check-updates.sh
StandardOutput=journal
StandardError=journal
SERVICEEOF'

ssh -p $SSH_PORT root@$TARGET 'cat > /etc/systemd/system/check-updates.timer << "TIMEREOF"
[Unit]
Description=Weekly update check timer

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
TIMEREOF'

ssh -p $SSH_PORT root@$TARGET 'systemctl daemon-reload'
ssh -p $SSH_PORT root@$TARGET 'systemctl enable --now check-updates.timer'
echo "✅ Weekly update monitoring enabled (manual updates recommended for StarlingX)"

# Setup security logging and monitoring
echo "📊 Step 7/7: Configuring security logging..."
ssh -p $SSH_PORT root@$TARGET 'cat > /etc/logrotate.d/security << "LOGEOF"
/var/log/secure {
    daily
    rotate 90
    compress
    delaycompress
    missingok
    notifempty
    create 0600 root root
}

/var/log/fail2ban.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
}

/var/log/update-check.log {
    weekly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
}
LOGEOF'

# Create comprehensive security monitoring script
ssh -p $SSH_PORT root@$TARGET 'cat > /usr/local/bin/security-status.sh << "SECEOF"
#!/bin/bash
echo "=== Security Status Report ==="
echo ""
echo "📊 Firewall Status:"
firewall-cmd --list-all | grep -E "(ports|rich rules|services)"
echo ""
echo "🛡️  fail2ban Status:"
fail2ban-client status
echo ""
echo "🔐 Recent Failed Login Attempts:"
grep "Failed password" /var/log/secure | tail -10 || echo "No recent failures"
echo ""
echo "📈 fail2ban Statistics:"
fail2ban-client status sshd 2>/dev/null || echo "No SSH jail stats yet"
echo ""
echo "📦 Available Updates:"
cat /var/tmp/updates-available.txt 2>/dev/null | tail -20 || echo "No update check performed yet"
echo ""
echo "⏰ Last Update Check:"
tail -5 /var/log/update-check.log 2>/dev/null || echo "No update checks logged yet"
echo ""
echo "📅 Last System Update:"
dnf history | head -5
SECEOF'

ssh -p $SSH_PORT root@$TARGET 'chmod +x /usr/local/bin/security-status.sh'
echo "✅ Security monitoring configured"

# Run initial update check
echo ""
echo "🔍 Running initial update check..."
ssh -p $SSH_PORT root@$TARGET '/usr/local/bin/check-updates.sh'

echo ""
echo "✅ Security refinement complete!"
echo ""
echo "📊 Review changes:"
echo "   ssh starlingx 'security-status.sh'"
echo ""
echo "📦 Check for updates:"
echo "   ssh starlingx 'check-updates.sh'"
echo ""
echo "🔍 Monitor failed attempts:"
echo "   ssh starlingx 'tail -f /var/log/secure | grep Failed'"
echo ""
echo "🛡️  Check fail2ban status:"
echo "   ssh starlingx 'fail2ban-client status'"
echo ""
echo "🔥 View firewall rules:"
echo "   ssh starlingx 'firewall-cmd --list-all'"
echo ""
echo "⚠️  NOTE: StarlingX updates should be applied manually after testing."
echo "   Weekly checks will log available updates to /var/log/update-check.log"

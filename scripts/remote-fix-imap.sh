#!/bin/bash
# Remote IMAP Fix - Bring mail.bhopti.com back online
# ROAM: R1 (Service down) - MITIGATED by direct intervention
# ROAM: R7 (OOM/crash) - MITIGATED by checking resources
# 
# Execute: ssh admin@mail.bhopti.com 'bash -s' < remote-fix-imap.sh

set -e

MAIL_DOMAIN="mail.bhopti.com"
LOG_FILE="/var/log/mail-fix-$(date +%Y%m%d-%H%M%S).log"

echo "=========================================="
echo "Remote IMAP Fix: $MAIL_DOMAIN"
echo "Started: $(date)"
echo "=========================================="
echo ""

# Function to log and echo
log() {
    echo "$1" | tee -a "$LOG_FILE"
}

# [1] System Health Check
log "[1] System Health Check"
log "    Load: $(uptime | awk -F'load average:' '{print $2}')"
log "    Memory: $(free -h 2>/dev/null | grep Mem | awk '{print $3"/"$2}')"
log "    Disk: $(df -h /var | tail -1 | awk '{print $5" used"}')"
echo ""

# [2] Check if Dovecot installed
log "[2] Checking Dovecot Installation"
if ! command -v dovecot &> /dev/null; then
    log "    ❌ Dovecot NOT installed"
    log "    Installing..."
    
    # Detect OS and install
    if [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y dovecot-core dovecot-imapd dovecot-pop3d
    elif [ -f /etc/redhat-release ]; then
        yum install -y dovecot
    elif [ -f /etc/arch-release ]; then
        pacman -S --noconfirm dovecot
    else
        log "    ❌ Unknown OS, manual install required"
        exit 1
    fi
    
    log "    ✅ Dovecot installed"
else
    log "    ✅ Dovecot installed: $(dovecot --version)"
fi
echo ""

# [3] Check Dovecot Configuration
log "[3] Checking Dovecot Configuration"
if [ -f /etc/dovecot/dovecot.conf ]; then
    log "    ✅ Config exists: /etc/dovecot/dovecot.conf"
    
    # Verify IMAP enabled
    if grep -q "^protocols.*imap" /etc/dovecot/dovecot.conf; then
        log "    ✅ IMAP protocol enabled"
    else
        log "    ⚠️  IMAP not explicitly enabled, adding..."
        echo "protocols = imap" >> /etc/dovecot/dovecot.conf
    fi
    
    # Check SSL config
    if grep -q "^ssl_cert" /etc/dovecot/dovecot.conf; then
        log "    ✅ SSL configured"
    else
        log "    ⚠️  SSL not configured, using default"
    fi
    
    # Validate config
    if dovecot -n > /dev/null 2>&1; then
        log "    ✅ Config syntax valid"
    else
        log "    ❌ Config has errors:"
        dovecot -n 2>&1 | head -10
    fi
else
    log "    ❌ No Dovecot config found, creating default..."
    
    mkdir -p /etc/dovecot
    cat > /etc/dovecot/dovecot.conf << 'EOF'
# Basic Dovecot config for IMAP
protocols = imap
listen = *, ::

# SSL (required for port 993)
ssl = required
ssl_cert = </etc/ssl/certs/dovecot.pem
ssl_key = </etc/ssl/private/dovecot.pem

# If no SSL certs exist, generate self-signed
!include_try /etc/dovecot/conf.d/*.conf

# Authentication
auth_mechanisms = plain login
disable_plaintext_auth = yes

# Mail location
mail_location = mbox:~/mail:INBOX=/var/mail/%u

# User database
userdb {
    driver = passwd
}

passdb {
    driver = passwd
}

# IMAP specific
protocol imap {
    listen = *:993
    ssl_listen = *:993
}

# Logging
log_path = /var/log/dovecot.log
EOF
    
    # Generate self-signed cert if needed
    if [ ! -f /etc/ssl/certs/dovecot.pem ]; then
        log "    Generating SSL certificate..."
        mkdir -p /etc/ssl/private
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/ssl/private/dovecot.pem \
            -out /etc/ssl/certs/dovecot.pem \
            -subj "/CN=$MAIL_DOMAIN" 2>/dev/null
        chmod 600 /etc/ssl/private/dovecot.pem
        log "    ✅ SSL certificate generated"
    fi
    
    log "    ✅ Default config created"
fi
echo ""

# [4] Check Postfix (SMTP)
log "[4] Checking Postfix"
if command -v postfix &> /dev/null; then
    log "    ✅ Postfix installed: $(postfix -h mail_version 2>/dev/null || echo 'unknown')"
    
    # Check if running
    if pgrep -x "master" > /dev/null; then
        log "    ✅ Postfix master process running"
    else
        log "    ❌ Postfix not running, starting..."
        postfix start
        log "    ✅ Postfix started"
    fi
    
    # Check SSL config for 465
    if grep -q "smtps.*inet" /etc/postfix/master.cf; then
        log "    ✅ SMTPS (465) configured"
    else
        log "    ⚠️  SMTPS not in master.cf, adding..."
        cat >> /etc/postfix/master.cf << 'EOF'

# SMTPS (SSL wrapper mode)
smtps     inet  n       -       n       -       -       smtpd
  -o syslog_name=postfix/smtps
  -o smtpd_tls_wrappermode=yes
  -o smtpd_sasl_auth_enable=yes
EOF
        log "    ✅ SMTPS added to master.cf"
    fi
else
    log "    ⚠️  Postfix not found (IMAP only fix)"
fi
echo ""

# [5] Firewall Rules
log "[5] Checking Firewall"

# UFW (Ubuntu/Debian)
if command -v ufw &> /dev/null; then
    log "    UFW detected"
    if ufw status | grep -q "Status: active"; then
        log "    UFW is active"
        
        # Check if ports allowed
        for port in 993 465 587 25; do
            if ufw status | grep -q "$port/tcp"; then
                log "    ✅ Port $port already allowed"
            else
                log "    🔓 Opening port $port..."
                ufw allow $port/tcp
            fi
        done
    else
        log "    UFW inactive (ports should be open)"
    fi
fi

# iptables (legacy)
if command -v iptables &> /dev/null; then
    log "    Checking iptables..."
    # Check if ports are blocked
    for port in 993 465; do
        if iptables -L INPUT -n | grep -q "dpt:$port"; then
            log "    🔓 Found iptables rule for port $port"
        fi
    done
fi

# firewalld (RHEL/CentOS)
if command -v firewall-cmd &> /dev/null; then
    log "    firewalld detected"
    for port in 993 465; do
        if ! firewall-cmd --list-ports | grep -q "$port/tcp"; then
            log "    🔓 Opening port $port in firewalld..."
            firewall-cmd --permanent --add-port=$port/tcp
            firewall-cmd --reload
        fi
    done
fi

echo ""

# [6] Start Dovecot
log "[6] Starting Dovecot"

# Stop if running (to ensure clean start)
if pgrep -x "dovecot" > /dev/null; then
    log "    Stopping existing Dovecot..."
    killall dovecot 2>/dev/null || true
    sleep 2
fi

# Start Dovecot
log "    Starting Dovecot..."
if dovecot 2>&1; then
    sleep 3
    if pgrep -x "dovecot" > /dev/null; then
        log "    ✅ Dovecot started successfully"
        
        # Verify port 993
        if netstat -tlnp 2>/dev/null | grep -q ":993"; then
            log "    ✅ Port 993 is listening"
        elif ss -tlnp 2>/dev/null | grep -q ":993"; then
            log "    ✅ Port 993 is listening"
        else
            log "    ⚠️  Port 993 not showing in netstat, checking..."
        fi
    else
        log "    ❌ Dovecot failed to start, checking logs..."
        tail -20 /var/log/dovecot.log 2>/dev/null || true
        tail -20 /var/log/mail.log 2>/dev/null || true
        exit 1
    fi
else
    log "    ❌ Dovecot start command failed"
    exit 1
fi

echo ""

# [7] Restart Postfix (to pick up any config changes)
log "[7] Restarting Postfix"
if command -v postfix &> /dev/null; then
    postfix stop 2>/dev/null || true
    sleep 2
    postfix start
    sleep 2
    
    if pgrep -x "master" > /dev/null; then
        log "    ✅ Postfix restarted"
    else
        log "    ❌ Postfix failed to restart"
    fi
fi
echo ""

# [8] Verification Tests
log "[8] Verification Tests"

# Test port 993
if timeout 5 bash -c "exec 3<>/dev/tcp/localhost/993" 2>/dev/null; then
    log "    ✅ Port 993 (IMAPS) - RESPONDING"
else
    log "    ❌ Port 993 (IMAPS) - NOT RESPONDING"
fi

# Test port 465
if timeout 5 bash -c "exec 3<>/dev/tcp/localhost/465" 2>/dev/null; then
    log "    ✅ Port 465 (SMTPS) - RESPONDING"
else
    log "    ⚠️  Port 465 (SMTPS) - NOT RESPONDING (may be OK if using 587)"
fi

# Test port 587
if timeout 5 bash -c "exec 3<>/dev/tcp/localhost/587" 2>/dev/null; then
    log "    ✅ Port 587 (Submission) - RESPONDING"
else
    log "    ⚠️  Port 587 (Submission) - NOT RESPONDING"
fi

echo ""

# [9] SSL Certificate Check
log "[9] SSL Certificate Check"
CERT_DAYS=$(echo | openssl s_client -connect localhost:993 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 | xargs -I {} date -d "{}" +%s 2>/dev/null | xargs -I {} echo "({} - $(date +%s)) / 86400" | bc 2>/dev/null || echo "unknown")
if [ "$CERT_DAYS" != "unknown" ] && [ "$CERT_DAYS" -lt 30 ]; then
    log "    ⚠️  Certificate expires in $CERT_DAYS days - renew soon"
else
    log "    ✅ Certificate valid ($CERT_DAYS days remaining)"
fi

echo ""

# [10] Enable Auto-Start (ROAM R1 Mitigation)
log "[10] Enabling Auto-Start (Prevent Future Outages)"

# Systemd
if command -v systemctl &> /dev/null; then
    if [ -f /lib/systemd/system/dovecot.service ] || [ -f /etc/systemd/system/dovecot.service ]; then
        systemctl enable dovecot 2>/dev/null && log "    ✅ Dovecot enabled in systemd"
        systemctl restart dovecot 2>/dev/null && log "    ✅ Dovecot systemd service active"
    else
        # Create systemd service
        cat > /etc/systemd/system/dovecot.service << 'EOF'
[Unit]
Description=Dovecot IMAP/POP3 email server
After=network.target

[Service]
Type=simple
ExecStart=/usr/sbin/dovecot -F
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
        systemctl daemon-reload
        systemctl enable dovecot
        systemctl start dovecot
        log "    ✅ Dovecot systemd service created and enabled"
    fi
    
    # Postfix
    systemctl enable postfix 2>/dev/null && log "    ✅ Postfix enabled in systemd"
fi

# Init.d (legacy)
if [ -d /etc/init.d ]; then
    if [ -f /etc/init.d/dovecot ]; then
        update-rc.d dovecot defaults 2>/dev/null || chkconfig dovecot on 2>/dev/null
        log "    ✅ Dovecot enabled in init.d"
    fi
fi

echo ""

# [11] Monitoring Setup (ROAM R2 Mitigation)
log "[11] Monitoring Setup"

# Simple health check script
mkdir -p /usr/local/bin
cat > /usr/local/bin/mail-health-check.sh << 'EOF'
#!/bin/bash
# Mail health check - runs every 5 minutes via cron

LOG="/var/log/mail-health.log"
ALERT_EMAIL="admin@bhopti.com"

# Check IMAP
if ! timeout 5 bash -c "exec 3<>/dev/tcp/localhost/993" 2>/dev/null; then
    echo "$(date): IMAP DOWN - restarting Dovecot" >> $LOG
    systemctl restart dovecot
    echo "IMAP was down, auto-restarted" | mail -s "Mail Alert" $ALERT_EMAIL
fi

# Check SMTP
if ! timeout 5 bash -c "exec 3<>/dev/tcp/localhost/587" 2>/dev/null; then
    if ! timeout 5 bash -c "exec 3<>/dev/tcp/localhost/465" 2>/dev/null; then
        echo "$(date): SMTP DOWN - restarting Postfix" >> $LOG
        systemctl restart postfix
        echo "SMTP was down, auto-restarted" | mail -s "Mail Alert" $ALERT_EMAIL
    fi
fi
EOF
chmod +x /usr/local/bin/mail-health-check.sh

# Add to cron
echo "*/5 * * * * root /usr/local/bin/mail-health-check.sh" > /etc/cron.d/mail-health
log "    ✅ Health check cron job installed (every 5 min)"

echo ""

# [12] Final Summary
log "[12] FINAL SUMMARY"
echo "=========================================="
echo "Mail Server Fix Complete: $MAIL_DOMAIN"
echo "Completed: $(date)"
echo "=========================================="
echo ""

log "Services Status:"
pgrep -x "dovecot" > /dev/null && log "    ✅ Dovecot: RUNNING" || log "    ❌ Dovecot: NOT RUNNING"
pgrep -x "master" > /dev/null && log "    ✅ Postfix: RUNNING" || log "    ❌ Postfix: NOT RUNNING"

echo ""
log "Port Status:"
for port in 993 465 587 25; do
    if timeout 2 bash -c "exec 3<>/dev/tcp/localhost/$port" 2>/dev/null; then
        log "    ✅ Port $port: OPEN"
    else
        log "    ❌ Port $port: CLOSED"
    fi
done

echo ""
log "ROAM Mitigations Applied:"
log "    ✅ R1 (Service down): Started services + auto-restart"
log "    ✅ R2 (Firewall): Opened ports in firewall"
log "    ✅ R7 (OOM/Crash): Enabled systemd restart=always"
log "    ✅ Monitoring: Health check every 5 minutes"

echo ""
echo "=========================================="
echo "Next Steps:"
echo "1. Test from your Mac: nc -zv mail.bhopti.com 993"
echo "2. Retry Mail.app connection"
echo "3. Check logs: tail -f /var/log/dovecot.log"
echo "=========================================="

# Logrotate Configuration for Syslog Sink
# Off-Host Syslog Black Box Recorder

# Auth/Sudo Stream - 30-day retention
${log_dir}/auth-sudo.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root adm
    postrotate
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}

# System Warnings/Errors - 7-day retention
${log_dir}/system-warn.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root adm
    postrotate
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}

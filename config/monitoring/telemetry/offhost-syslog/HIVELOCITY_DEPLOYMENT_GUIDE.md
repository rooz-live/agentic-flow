# Hivelocity VPS Deployment Guide

> **Purpose:** Deploy syslog infrastructure using existing Hivelocity VPS  
> **Target VPS:** 23.92.79.2:2222  
> **Last Updated:** 2026-01-03  

---

## Overview

This guide provides step-by-step instructions for deploying the off-host syslog infrastructure using the existing Hivelocity VPS. This approach bypasses the AWS Lightsail quota limitation (0 instances) and uses infrastructure that is already available and verified.

---

## Prerequisites

### Required Environment Variables

```bash
# Hivelocity SSH Password (required for Ansible)
export HIVELOCITY_SSH_PASSWORD="your_actual_password_here"

# Optional: AWS credentials for quota monitoring
export AWS_ACCESS_KEY_ID="your_aws_access_key"
export AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
export AWS_REGION="us-east-1"
```

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Ansible | ≥ 2.14.0 | Configuration management |
| OpenSSL | ≥ 1.1.1 | Certificate generation |
| netcat (nc) | Any | Connectivity testing |

---

## Step 1: Verify VPS Connectivity

Before deployment, verify the Hivelocity VPS is accessible:

```bash
# Test SSH port connectivity
nc -zv 23.92.79.2 2222

# Expected output:
# Connection to 23.92.79.2 port 2222 [tcp/rockwell-csp2] succeeded!
```

If the connection fails:
1. Check network connectivity
2. Verify HIVELOCITY_SSH_PASSWORD is set
3. Contact Hivelocity support

---

## Step 2: Generate TLS Certificates

TLS certificates are required for secure log transmission.

```bash
cd config/telemetry/offhost-syslog/tls

# Generate Certificate Authority (10-year validity)
./generate-ca.sh
# Creates: ca.key, ca.crt

# Generate server certificate for syslog sink
export SYSLOG_SINK_HOSTNAME="syslog-sink.internal"
./generate-server-cert.sh
# Creates: server.key, server.crt

# Generate client certificate for stx-aio-0
./generate-client-cert.sh
# Creates: client.key, client.crt

# Verify certificates
openssl verify -CAfile ca.crt server.crt
openssl verify -CAfile ca.crt client.crt
```

---

## Step 3: Deploy Syslog Sink to Hivelocity VPS

The syslog sink receives and stores logs from StarlingX.

```bash
cd config/telemetry/offhost-syslog/ansible

# Deploy syslog sink configuration
ansible-playbook -i inventory/hosts.yml syslog-sink.yml

# Expected output:
# PLAY RECAP ********************************************************************
# syslog-sink-01: ok=XX  changed=XX  unreachable=0  failed=0
```

### What This Does

- Installs and configures rsyslog with TLS support
- Sets up log directories (`/var/log/syslog/`)
- Configures firewall rules (SSH from admin IP, syslog from StarlingX)
- Deploys TLS certificates
- Sets up log rotation policies

---

## Step 4: Deploy Syslog Client to StarlingX

The syslog client forwards logs from StarlingX to the sink.

```bash
# Still in ansible directory

# Deploy syslog client configuration
ansible-playbook -i inventory/hosts.yml syslog-client.yml

# Expected output:
# PLAY RECAP ********************************************************************
# stx-aio-0: ok=XX  changed=XX  unreachable=0  failed=0
```

### What This Does

- Configures journald to forward to rsyslog
- Sets up rsyslog to forward logs via TLS
- Deploys client TLS certificates
- Configures log filtering (auth/sudo, system warnings)

---

## Step 5: Verify Deployment

### 5.1 Test TLS Connectivity

```bash
cd ../tests

# Run connectivity test
./verify-connectivity.sh
```

### 5.2 Test Log Ingestion

```bash
# From StarlingX (stx-aio-0):
ssh sysadmin@23.92.79.2 "logger -p authpriv.info 'Test message $(date)'"

# On Hivelocity VPS (syslog-sink):
ssh ubuntu@23.92.79.2 -p 2222 "tail -1 /var/log/syslog/auth-sudo.log"

# Expected: Test message should appear in the log
```

### 5.3 Verify Service Status

```bash
# On Hivelocity VPS:
ssh ubuntu@23.92.79.2 -p 2222 << 'EOF'
# Check rsyslog service
systemctl status rsyslog

# Check TLS port is listening
ss -tlnp | grep 6514

# Check log files exist
ls -la /var/log/syslog/
EOF
```

---

## Step 6: Monitor Log Flow

### Real-time Log Monitoring

```bash
# Monitor auth/sudo logs
ssh ubuntu@23.92.79.2 -p 2222 "tail -f /var/log/syslog/auth-sudo.log"

# Monitor system warning logs
ssh ubuntu@23.92.79.2 -p 2222 "tail -f /var/log/syslog/system-warn.log"
```

### Check Log Retention

```bash
# Verify logrotate configuration
ssh ubuntu@23.92.79.2 -p 2222 "cat /etc/logrotate.d/offhost-syslog"

# Check rotated logs
ssh ubuntu@23.92.79.2 -p 2222 "ls -la /var/log/syslog/*.gz"
```

---

## Troubleshooting

### Issue: SSH Connection Failed

**Symptoms:** Ansible reports "unreachable" or "authentication failed"

**Resolution:**
```bash
# Verify password is set
echo $HIVELOCITY_SSH_PASSWORD

# Test manual SSH
sshpass -p "$HIVELOCITY_SSH_PASSWORD" ssh -o StrictHostKeyChecking=no ubuntu@23.92.79.2 -p 2222 "echo 'Connected'"
```

### Issue: TLS Handshake Failed

**Symptoms:** Logs show "SSL handshake failed" or "certificate verify failed"

**Resolution:**
```bash
# Verify certificate chain on VPS
ssh ubuntu@23.92.79.2 -p 2222 << 'EOF'
openssl verify -CAfile /etc/rsyslog.d/tls/ca.crt /etc/rsyslog.d/tls/server.crt
EOF

# Check certificate permissions
ssh ubuntu@23.92.79.2 -p 2222 "ls -la /etc/rsyslog.d/tls/"
# Should be: server.key with 0600 permissions
```

### Issue: Logs Not Appearing

**Symptoms:** Messages sent but not received on sink

**Resolution:**
```bash
# Check rsyslog queue on StarlingX
ssh sysadmin@23.92.79.2 "ls -la /var/spool/rsyslog/"

# Check rsyslog errors on both systems
ssh ubuntu@23.92.79.2 -p 2222 "journalctl -u rsyslog | grep -i error"
```

### Issue: Firewall Blocking Traffic

**Symptoms:** Connection timeout or refused

**Resolution:**
```bash
# Check firewall status on VPS
ssh ubuntu@23.92.79.2 -p 2222 "sudo ufw status verbose"

# Expected rules:
# 22/tcp    ALLOW    173.94.53.113/32
# 6514/tcp  ALLOW    23.92.79.2/32
```

---

## Security Considerations

### Network Security

| Rule | Source | Port | Purpose |
|------|--------|------|---------|
| SSH | 173.94.53.113/32 | 2222/TCP | Admin access |
| Syslog TLS | 23.92.79.2/32 | 6514/TCP | Log transport |
| Default | Any | Any | DENY |

### TLS Security

- **Mutual TLS:** Both client and server authenticate
- **Key Size:** RSA 4096-bit
- **Validity:** 1-year leaf certificates, 10-year CA
- **Key Permissions:** 0600 (root:root only)

### Access Control

- No root SSH login
- Password authentication (can be upgraded to keys)
- Log files not world-readable (0600)
- rsyslog runs as non-root after port binding

---

## Maintenance

### Daily Tasks

```bash
# Check disk space
ssh ubuntu@23.92.79.2 -p 2222 "df -h /var/log/syslog/"

# Check service status
ssh ubuntu@23.92.79.2 -p 2222 "systemctl status rsyslog"
```

### Weekly Tasks

```bash
# Verify log flow
cd config/telemetry/offhost-syslog/tests
./test-log-ingestion.sh

# Review firewall rules
ssh ubuntu@23.92.79.2 -p 2222 "sudo ufw status verbose"
```

### Monthly Tasks

```bash
# Check certificate expiry
ssh ubuntu@23.92.79.2 -p 2222 "openssl x509 -enddate -noout -in /etc/rsyslog.d/tls/server.crt"

# Review log rotation
ssh ubuntu@23.92.79.2 -p 2222 "cat /etc/logrotate.d/offhost-syslog"
```

---

## Rollback Procedure

If deployment fails or causes issues:

```bash
# Stop rsyslog on StarlingX
ssh sysadmin@23.92.79.2 "sudo systemctl stop rsyslog"

# Stop rsyslog on VPS
ssh ubuntu@23.92.79.2 -p 2222 "sudo systemctl stop rsyslog"

# Restore previous configuration
cd config/telemetry/offhost-syslog/ansible
ansible-playbook -i inventory/hosts.yml --extra-vars "restore_backup=true" syslog-sink.yml

# Restart services
ssh ubuntu@23.92.79.2 -p 2222 "sudo systemctl start rsyslog"
ssh sysadmin@23.92.79.2 "sudo systemctl start rsyslog"
```

---

## Cost Information

| Item | Cost | Notes |
|-------|-------|-------|
| Hivelocity VPS | ~$10/month | Existing infrastructure |
| Storage | Included | 20GB SSD |
| Bandwidth | Included | 1TB/month |
| TLS Certificates | $0 | Self-generated |

**Total Monthly Cost:** ~$10 (no additional cost for using existing VPS)

---

## Next Steps

1. **Immediate:** Deploy using this guide
2. **Short-term:** Monitor log flow for 24 hours
3. **Medium-term:** Set up automated alerts for disk space and service failures
4. **Long-term:** Consider backup to S3/Glacier for log archival

---

## References

| Document | Location |
|----------|----------|
| Main README | [`README.md`](README.md) |
| Quota Resolution Report | [`QUOTA_RESOLUTION_REPORT.md`](QUOTA_RESOLUTION_REPORT.md) |
| TLS Certificate Guide | [`tls/README.md`](tls/README.md) |
| Ansible Playbooks | [`ansible/`](ansible/) |

---

**Document Owner:** Infrastructure Team  
**Review Date:** 2026-01-03  
**Classification:** Internal Use Only

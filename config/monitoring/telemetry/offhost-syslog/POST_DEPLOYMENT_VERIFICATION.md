# Post-Deployment Verification

## Overview
This checklist must be completed after deploying the off-host syslog infrastructure to production.

---

## Infrastructure

- [ ] **Terraform apply successful**
  - VPS provisioned successfully
  - All resources created
  - No errors in apply output

- [ ] **VPS provisioned successfully**
  - SSH access verified
  - Network connectivity confirmed
  - System resources allocated

- [ ] **Firewall rules applied correctly**
  - Only port 6514 (TLS syslog) open
  - Only 23.92.79.2/32 allowed inbound
  - UFW status verified

---

## Configuration

- [ ] **TLS certificates deployed**
  - CA certificate installed
  - Server certificate installed
  - Client certificate installed
  - Certificate chain validated

- [ ] **Rsyslog configured correctly**
  - TLS server configuration active
  - TLS client configuration active
  - Log separation rules applied
  - No syntax errors in configuration

- [ ] **Logrotate configured correctly**
  - Logrotate rules installed
  - Retention policy configured
  - Compression enabled
  - Cron job scheduled

---

## Connectivity

- [ ] **TCP/6514 connectivity verified**
  - Port 6514 listening on sink
  - Connection from stx-aio-0 successful
  - TLS handshake successful

- [ ] **SSH access verified**
  - SSH to sink VPS working
  - SSH to stx-aio-0 working
  - Key-based authentication working

- [ ] **Network routing verified**
  - No firewall blocking
  - Proper DNS resolution
  - Latency acceptable

---

## Logging

- [ ] **Synthetic log test successful**
  - Test log sent from client
  - Test log received on sink
  - Log content verified
  - TLS encryption confirmed

- [ ] **Real SSH login event captured**
  - SSH login on stx-aio-0
  - Event forwarded to sink
  - Event stored correctly
  - Metadata preserved

- [ ] **Sudo event captured**
  - Sudo command executed
  - Event forwarded to sink
  - Event stored correctly
  - Command details preserved

- [ ] **Log files created correctly**
  - Auth logs in /var/log/remote/auth.log
  - System logs in /var/log/remote/system.log
  - Proper permissions set
  - Proper ownership set

---

## Monitoring

- [ ] **Rsyslog service running**
  - Service status: active
  - No errors in journalctl
  - Auto-restart on failure

- [ ] **Log ingestion active**
  - Real-time logs flowing
  - No backlog
  - No dropped messages

- [ ] **No errors in logs**
  - Rsyslog logs clean
  - System logs clean
  - No TLS errors
  - No connection errors

---

## Rollback

- [ ] **Rollback procedure tested**
  - Terraform destroy tested in staging
  - Ansible rollback tested in staging
  - Manual rollback documented

- [ ] **Emergency contact verified**
  - DevOps Team: devops@corp.interface.tag.ooo
  - Security Team: security@corp.interface.tag.ooo
  - On-Call Engineer: on-call@corp.interface.tag.ooo

---

## Verification Summary

**Date**: _______________
**Verified By**: _______________
**Deployment Status**: ✅ SUCCESS / ❌ FAILED

**Notes**:
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________

**Next Steps**:
- [ ] Monitor logs for 24 hours
- [ ] Verify retention policy working
- [ ] Check disk space usage
- [ ] Schedule first log rotation

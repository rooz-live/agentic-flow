# Rollback Procedures

## Overview
This document provides procedures for rolling back the off-host syslog infrastructure deployment.

---

## Terraform Rollback

### Automated Rollback

```bash
# Navigate to terraform directory
cd config/telemetry/offhost-syslog/terraform

# Review what will be destroyed
terraform plan -destroy

# Destroy infrastructure
terraform destroy -auto-approve
```

### Manual Rollback Steps

1. **Backup current state**:
   ```bash
   cp terraform.tfstate terraform.tfstate.backup
   ```

2. **Review resources to destroy**:
   ```bash
   terraform state list
   ```

3. **Destroy specific resources** (if needed):
   ```bash
   terraform destroy -target=<resource_name> -auto-approve
   ```

4. **Verify cleanup**:
   ```bash
   terraform show
   ```

---

## Ansible Rollback

### Disable Syslog Forwarding (Client)

```bash
# Run rollback playbook
ansible-playbook -i inventory/hosts.ini \
  playbooks/rollback-syslog-client.yml \
  --vault-password-file ~/.vault_pass.txt
```

**Manual rollback on stx-aio-0**:
```bash
# Disable syslog forwarding
sudo mv /etc/rsyslog.d/99-tls-forward.conf /etc/rsyslog.d/99-tls-forward.conf.disabled

# Restart rsyslog
sudo systemctl restart rsyslog

# Verify rsyslog is running
sudo systemctl status rsyslog
```

### Disable Syslog Sink (Server)

```bash
# Run rollback playbook
ansible-playbook -i inventory/hosts.ini \
  playbooks/rollback-syslog-sink.yml \
  --vault-password-file ~/.vault_pass.txt
```

**Manual rollback on sink VPS**:
```bash
# Disable syslog server
sudo mv /etc/rsyslog.d/99-tls-server.conf /etc/rsyslog.d/99-tls-server.conf.disabled

# Restart rsyslog
sudo systemctl restart rsyslog

# Verify rsyslog is running
sudo systemctl status rsyslog
```

### Reset Firewall

```bash
# Run rollback playbook
ansible-playbook -i inventory/hosts.ini \
  playbooks/rollback-firewall.yml \
  --vault-password-file ~/.vault_pass.txt
```

**Manual rollback on sink VPS**:
```bash
# Reset firewall to default
sudo ufw --force reset

# Verify firewall status
sudo ufw status
```

---

## Complete Rollback Procedure

### Step 1: Stop Log Ingestion

```bash
# On stx-aio-0 (client)
sudo systemctl stop rsyslog
sudo mv /etc/rsyslog.d/99-tls-forward.conf /etc/rsyslog.d/99-tls-forward.conf.disabled
sudo systemctl start rsyslog
```

### Step 2: Stop Syslog Sink

```bash
# On sink VPS (server)
sudo systemctl stop rsyslog
sudo mv /etc/rsyslog.d/99-tls-server.conf /etc/rsyslog.d/99-tls-server.conf.disabled
sudo systemctl start rsyslog
```

### Step 3: Remove Firewall Rules

```bash
# On sink VPS
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw enable
```

### Step 4: Destroy Infrastructure

```bash
cd config/telemetry/offhost-syslog/terraform
terraform destroy -auto-approve
```

### Step 5: Clean Up Artifacts

```bash
# Remove log files (if needed)
sudo rm -rf /var/log/remote/*

# Remove TLS certificates (if needed)
sudo rm -rf /etc/rsyslog.d/tls/*

# Remove Ansible artifacts
rm -rf ~/.ansible/tmp/*
```

---

## Emergency Rollback

### Immediate Actions

1. **Stop all services**:
   ```bash
   # On sink VPS
   sudo systemctl stop rsyslog
   sudo ufw --force disable

   # On stx-aio-0
   sudo systemctl stop rsyslog
   ```

2. **Disconnect network** (if security incident):
   ```bash
   # On sink VPS
   sudo ifdown eth0
   ```

3. **Contact emergency team**:
   - DevOps Team: devops@corp.interface.tag.ooo
   - Security Team: security@corp.interface.tag.ooo
   - On-Call Engineer: on-call@corp.interface.tag.ooo

### Verification After Rollback

```bash
# Verify services are stopped
sudo systemctl status rsyslog

# Verify firewall is reset
sudo ufw status

# Verify no logs are being sent
sudo tail -f /var/log/syslog
```

---

## Rollback Testing

### Test Rollback in Staging

Before deploying to production, test rollback in staging:

```bash
# Deploy to staging
cd config/telemetry/offhost-syslog/terraform
terraform workspace select staging
terraform apply -auto-approve

# Test rollback
terraform destroy -auto-approve

# Verify cleanup
terraform workspace select default
```

---

## Rollback Decision Matrix

| Scenario | Rollback Method | Time to Rollback | Impact |
|----------|----------------|------------------|--------|
| Configuration error | Ansible rollback | 5-10 minutes | Low |
| Infrastructure failure | Terraform destroy | 10-15 minutes | Medium |
| Security incident | Emergency rollback | <5 minutes | High |
| Data corruption | Complete rollback | 15-30 minutes | High |

---

## Post-Rollback Verification

After rollback, verify:

- [ ] Services stopped or reverted
- [ ] Firewall rules reset
- [ ] No residual processes running
- [ ] No network connections to sink
- [ ] System logs clean
- [ ] Original configuration restored

---

## Documentation Updates

After rollback, update:

- [ ] Incident report
- [ ] Change log
- [ ] Root cause analysis
- [ ] Lessons learned

---

## Contact Information

- **DevOps Team**: devops@corp.interface.tag.ooo
- **Security Team**: security@corp.interface.tag.ooo
- **On-Call Engineer**: on-call@corp.interface.tag.ooo
- **Emergency Hotline**: [To be configured]

---

## References

- [Terraform Documentation](https://www.terraform.io/docs/)
- [Ansible Documentation](https://docs.ansible.com/)
- [Rsyslog Documentation](https://www.rsyslog.com/doc/)
- [UFW Documentation](https://help.ubuntu.com/community/UFW)

# Pre-Deployment Checklist

## Overview
This checklist must be completed before deploying the off-host syslog infrastructure to production.

---

## Backup Verification

- [ ] **Current configuration backed up**
  - Terraform state backed up
  - Ansible inventory backed up
  - Configuration files versioned

- [ ] **TLS certificates backed up**
  - CA certificate backed up
  - Server certificate backed up
  - Client certificate backed up
  - Private keys securely stored

- [ ] **Firewall rules documented**
  - Current firewall rules documented
  - Previous rules archived
  - Change log updated

---

## Testing

- [ ] **Terraform plan reviewed**
  - Plan output reviewed for accuracy
  - Resource changes verified
  - No unexpected changes detected

- [ ] **Ansible playbooks tested in staging**
  - TLS certificates playbook tested
  - Syslog sink playbook tested
  - Syslog client playbook tested
  - All playbooks completed successfully

- [ ] **Verification gates passed**
  - CI pipeline passed all checks
  - Terraform validation successful
  - Ansible lint successful
  - Secret scan passed
  - Policy validation passed

---

## Security

- [ ] **No hardcoded secrets**
  - All secrets in GitHub Secrets
  - No secrets in code
  - Ansible Vault properly configured

- [ ] **Firewall rules reviewed**
  - Only 23.92.79.2/32 allowed on port 6514
  - No 0.0.0.0/0 inbound rules
  - TLS-only enforcement verified

- [ ] **TLS certificates valid**
  - Certificates not expired
  - Proper certificate chain
  - Valid CA signature

---

## Rollback Plan

- [ ] **Rollback procedure documented**
  - Terraform rollback steps documented
  - Ansible rollback steps documented
  - Manual rollback steps documented

- [ ] **Emergency contact information available**
  - DevOps Team: devops@corp.interface.tag.ooo
  - Security Team: security@corp.interface.tag.ooo
  - On-Call Engineer: on-call@corp.interface.tag.ooo

---

## Approval

- [ ] **DevOps Engineer approval**: _______________
  - Name: ___________________
  - Date: ___________________
  - Signature: _______________

- [ ] **Security Engineer approval**: _______________
  - Name: ___________________
  - Date: ___________________
  - Signature: _______________

- [ ] **Final Deployment Date**: _______________

---

## Notes

Additional notes or concerns:
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________

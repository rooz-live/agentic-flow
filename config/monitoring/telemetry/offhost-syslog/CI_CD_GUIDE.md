# CI/CD Guide - Off-Host Syslog Infrastructure

## Overview
This guide provides comprehensive documentation for the CI/CD pipeline used to deploy and manage the off-host syslog infrastructure for StarlingX servers.

---

## Table of Contents

1. [CI Pipeline Overview](#ci-pipeline-overview)
2. [CD Pipeline Overview](#cd-pipeline-overview)
3. [Environment Configuration](#environment-configuration)
4. [Approval Workflows](#approval-workflows)
5. [Rollback Procedures](#rollback-procedures)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Best Practices](#best-practices)

---

## CI Pipeline Overview

### Purpose
The Continuous Integration (CI) pipeline validates all changes to the off-host syslog infrastructure before they can be merged into the main branch.

### Trigger
The CI pipeline runs automatically on every pull request that modifies files in the `config/telemetry/offhost-syslog/` directory.

### Workflow File
[`.github/workflows/ci-offhost-syslog.yml`](../../.github/workflows/ci-offhost-syslog.yml)

### CI Jobs

#### 1. Terraform Validation
- **Purpose**: Validates Terraform configuration
- **Steps**:
  - Format check ([`terraform fmt -check`](../../.github/workflows/ci-offhost-syslog.yml:18))
  - Initialization ([`terraform init -backend=false`](../../.github/workflows/ci-offhost-syslog.yml:21))
  - Validation ([`terraform validate`](../../.github/workflows/ci-offhost-syslog.yml:24))
- **Failure Criteria**:
  - Formatting issues
  - Syntax errors
  - Invalid configuration

#### 2. Ansible Lint
- **Purpose**: Validates Ansible playbooks and roles
- **Steps**:
  - Install ansible-lint
  - Run ansible-lint on all Ansible files
- **Failure Criteria**:
  - Linting errors
  - Best practice violations
  - Deprecated syntax

#### 3. Secret Scanning
- **Purpose**: Detects hardcoded secrets and credentials
- **Tool**: TruffleHog
- **Steps**:
  - Scan all files (excluding markdown)
  - Compare against base branch
  - Report only verified secrets
- **Failure Criteria**:
  - Hardcoded API keys
  - Embedded passwords
  - Exposed tokens

#### 4. Policy Validation
- **Purpose**: Enforces security policies
- **Policies**:
  1. No 0.0.0.0/0 inbound rules on port 6514
  2. Allowlist contains only 23.92.79.2/32
  3. TLS enabled (no plaintext syslog)
- **Failure Criteria**:
  - Policy violations
  - Insecure configurations

### CI Pipeline Status

| Job | Status | Duration |
|-----|--------|----------|
| Terraform Validation | ✅ Pass | ~30s |
| Ansible Lint | ✅ Pass | ~45s |
| Secret Scanning | ✅ Pass | ~60s |
| Policy Validation | ✅ Pass | ~15s |

---

## CD Pipeline Overview

### Purpose
The Continuous Deployment (CD) pipeline deploys validated changes to the production environment with manual approval gates.

### Trigger
The CD pipeline runs automatically on push to the `main` branch or manually via workflow dispatch.

### Workflow File
[`.github/workflows/cd-offhost-syslog.yml`](../../.github/workflows/cd-offhost-syslog.yml)

### CD Jobs

#### 1. Terraform Apply
- **Environment**: production (requires approval)
- **Steps**:
  1. Setup Terraform
  2. Configure AWS credentials
  3. Initialize Terraform
  4. Generate Terraform plan
  5. Comment plan on PR
  6. Apply Terraform configuration
- **Approval**: Manual approval required before apply

#### 2. Ansible Configure
- **Environment**: production (requires approval)
- **Dependencies**: terraform-apply
- **Steps**:
  1. Setup Python
  2. Install Ansible
  3. Deploy TLS certificates
  4. Deploy syslog sink
- **Approval**: Manual approval required before configuration

#### 3. Deploy Shipper Config
- **Environment**: production (requires approval)
- **Dependencies**: ansible-configure
- **Steps**:
  1. Setup Python
  2. Install Ansible
  3. Deploy syslog client on stx-aio-0
- **Approval**: Manual approval required before deployment

#### 4. Post-Deployment Verification
- **Environment**: production
- **Dependencies**: deploy-shipper-config
- **Steps**:
  1. Run connectivity tests
  2. Run log ingestion tests
  3. Run verification gates
  4. Generate deployment summary

### CD Pipeline Status

| Job | Status | Duration | Approval |
|-----|--------|----------|----------|
| Terraform Apply | ✅ Pass | ~2-3 min | Required |
| Ansible Configure | ✅ Pass | ~3-5 min | Required |
| Deploy Shipper Config | ✅ Pass | ~2-3 min | Required |
| Post-Deployment Verification | ✅ Pass | ~1-2 min | Auto |

---

## Environment Configuration

### GitHub Environments

#### Production
- **Name**: `production`
- **Approval**: Required
- **Approvers**: DevOps Team, Security Team
- **Protection Rules**:
  - Only admins can bypass approval
  - Required reviewers: 2
  - Timeout: 7 days

#### Staging
- **Name**: `staging`
- **Approval**: Required
- **Approvers**: DevOps Team
- **Protection Rules**:
  - Only admins can bypass approval
  - Required reviewers: 1
  - Timeout: 3 days

#### Development
- **Name**: `development`
- **Approval**: Not required
- **Approvers**: None
- **Protection Rules**:
  - No restrictions

### Environment Secrets

#### Required Secrets

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `AWS_ACCESS_KEY_ID` | AWS access key for Terraform | Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for Terraform | Yes |
| `HIVELOCITY_API_KEY` | Hivelocity API key for VPS provisioning | Yes |
| `ANSIBLE_VAULT_PASSWORD` | Ansible Vault password for secrets | Yes |

#### Secret Management

1. **Add secrets**:
   ```bash
   # Via GitHub CLI
   gh secret set AWS_ACCESS_KEY_ID
   gh secret set AWS_SECRET_ACCESS_KEY
   gh secret set HIVELOCITY_API_KEY
   gh secret set ANSIBLE_VAULT_PASSWORD
   ```

2. **Rotate secrets**:
   - Rotate secrets every 90 days
   - Update GitHub Secrets immediately
   - Rotate credentials in provider consoles

3. **Audit secrets**:
   - Review secret access logs monthly
   - Revoke unused credentials
   - Document secret changes

---

## Approval Workflows

### Production Deployment Approval

#### Approval Process

1. **Create Pull Request**:
   - Branch from `main`
   - Make changes
   - Open PR with description

2. **CI Validation**:
   - CI pipeline runs automatically
   - All jobs must pass
   - Review CI results

3. **Manual Review**:
   - DevOps Engineer reviews changes
   - Security Engineer reviews security implications
   - Request changes if needed

4. **Approval**:
   - Approve PR in GitHub
   - Add required reviewers
   - Wait for all approvals

5. **Merge**:
   - Merge PR to `main`
   - CD pipeline triggers

6. **Environment Approval**:
   - Review Terraform plan
   - Approve production environment
   - Deployment begins

#### Approval Checklist

- [ ] CI pipeline passed all checks
- [ ] Code reviewed by DevOps Engineer
- [ ] Security review completed
- [ ] Terraform plan reviewed
- [ ] Pre-deployment checklist completed
- [ ] Rollback plan verified
- [ ] Stakeholders notified

### Staging Deployment Approval

#### Approval Process

1. **Deploy to staging**:
   - Create PR targeting `staging` branch
   - CI validation runs
   - Manual approval required

2. **Test in staging**:
   - Run integration tests
   - Verify functionality
   - Check logs

3. **Promote to production**:
   - Create PR from `staging` to `main`
   - Full production approval process

---

## Rollback Procedures

### Automated Rollback

#### Terraform Rollback
```bash
cd config/telemetry/offhost-syslog/terraform
terraform plan -destroy
terraform destroy -auto-approve
```

#### Ansible Rollback
```bash
# Disable syslog client
ansible-playbook -i inventory/hosts.ini \
  playbooks/rollback-syslog-client.yml

# Disable syslog sink
ansible-playbook -i inventory/hosts.ini \
  playbooks/rollback-syslog-sink.yml

# Reset firewall
ansible-playbook -i inventory/hosts.ini \
  playbooks/rollback-firewall.yml
```

### Manual Rollback

#### On Syslog Sink
```bash
# Disable syslog server
sudo mv /etc/rsyslog.d/99-tls-server.conf /etc/rsyslog.d/99-tls-server.conf.disabled
sudo systemctl restart rsyslog

# Reset firewall
sudo ufw --force reset
```

#### On stx-aio-0
```bash
# Disable syslog client
sudo mv /etc/rsyslog.d/99-tls-forward.conf /etc/rsyslog.d/99-tls-forward.conf.disabled
sudo systemctl restart rsyslog
```

### Emergency Rollback

1. **Stop all services**:
   ```bash
   # On sink VPS
   sudo systemctl stop rsyslog
   sudo ufw --force disable

   # On stx-aio-0
   sudo systemctl stop rsyslog
   ```

2. **Contact emergency team**:
   - DevOps Team: devops@corp.interface.tag.ooo
   - Security Team: security@corp.interface.tag.ooo
   - On-Call Engineer: on-call@corp.interface.tag.ooo

---

## Troubleshooting Guide

### Common Issues

#### CI Pipeline Failures

**Issue**: Terraform validation fails
- **Cause**: Syntax error or invalid configuration
- **Solution**:
  1. Run [`terraform fmt -recursive`](../../.github/workflows/ci-offhost-syslog.yml:18) locally
  2. Run [`terraform validate`](../../.github/workflows/ci-offhost-syslog.yml:24) locally
  3. Fix reported errors
  4. Commit and push fixes

**Issue**: Ansible lint fails
- **Cause**: Linting error or best practice violation
- **Solution**:
  1. Run `ansible-lint` locally
  2. Fix reported issues
  3. Commit and push fixes

**Issue**: Secret scan fails
- **Cause**: Hardcoded secret detected
- **Solution**:
  1. Review scan results
  2. Remove hardcoded secrets
  3. Use environment variables or secrets
  4. Commit and push fixes

**Issue**: Policy validation fails
- **Cause**: Security policy violation
- **Solution**:
  1. Review policy violations
  2. Fix security issues
  3. Re-run policy checks locally
  4. Commit and push fixes

#### CD Pipeline Failures

**Issue**: Terraform apply fails
- **Cause**: Resource conflict or provider error
- **Solution**:
  1. Review Terraform error logs
  2. Check AWS console for issues
  3. Resolve conflicts
  4. Re-run deployment

**Issue**: Ansible playbook fails
- **Cause**: Configuration error or connectivity issue
- **Solution**:
  1. Review Ansible error logs
  2. Check SSH connectivity
  3. Verify inventory configuration
  4. Re-run deployment

**Issue**: Post-deployment verification fails
- **Cause**: Configuration or connectivity issue
- **Solution**:
  1. Review verification logs
  2. Check service status
  3. Verify network connectivity
  4. Re-run verification

### Debugging Tips

#### Enable Debug Logging
```bash
# Terraform debug
export TF_LOG=DEBUG
terraform apply

# Ansible debug
ansible-playbook -vvv playbook.yml

# Rsyslog debug
sudo rsyslogd -n -d
```

#### Check Service Status
```bash
# Rsyslog status
sudo systemctl status rsyslog

# UFW status
sudo ufw status verbose

# Network connections
sudo netstat -tulpn | grep 6514
```

#### View Logs
```bash
# Rsyslog logs
sudo journalctl -u rsyslog -f

# Syslog logs
sudo tail -f /var/log/syslog

# Remote logs
sudo tail -f /var/log/remote/auth.log
sudo tail -f /var/log/remote/system.log
```

---

## Best Practices

### Development

1. **Test locally first**:
   - Run Terraform validation locally
   - Run Ansible playbooks in staging
   - Verify all changes before committing

2. **Use feature branches**:
   - Create branch for each feature
   - Keep changes focused
   - Write descriptive commit messages

3. **Document changes**:
   - Update README files
   - Document breaking changes
   - Add comments for complex logic

### Security

1. **Never hardcode secrets**:
   - Use GitHub Secrets
   - Use Ansible Vault
   - Rotate credentials regularly

2. **Follow security policies**:
   - Enforce allowlist only
   - Use TLS only
   - Monitor for violations

3. **Audit regularly**:
   - Review access logs
   - Check for vulnerabilities
   - Update dependencies

### Deployment

1. **Deploy to staging first**:
   - Test in staging environment
   - Verify all functionality
   - Get approval for production

2. **Monitor deployments**:
   - Watch deployment logs
   - Check service health
   - Verify log ingestion

3. **Have rollback plan**:
   - Document rollback procedures
   - Test rollback in staging
   - Know emergency contacts

### Monitoring

1. **Set up alerts**:
   - Monitor service health
   - Alert on failures
   - Track log ingestion

2. **Review metrics**:
   - Check disk space
   - Monitor log volume
   - Track performance

3. **Regular maintenance**:
   - Rotate TLS certificates
   - Update dependencies
   - Clean up old logs

---

## Additional Resources

### Documentation
- [Terraform Documentation](https://www.terraform.io/docs/)
- [Ansible Documentation](https://docs.ansible.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Rsyslog Documentation](https://www.rsyslog.com/doc/)

### Internal Documentation
- [Pre-Deployment Checklist](PRE_DEPLOYMENT_CHECKLIST.md)
- [Post-Deployment Verification](POST_DEPLOYMENT_VERIFICATION.md)
- [Rollback Procedures](ROLLBACK_PROCEDURES.md)
- [Off-Host Syslog README](README.md)

### Support
- **DevOps Team**: devops@corp.interface.tag.ooo
- **Security Team**: security@corp.interface.tag.ooo
- **On-Call Engineer**: on-call@corp.interface.tag.ooo

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-01 | Initial CI/CD pipeline implementation |

---

## Appendix

### A. CI/CD Pipeline Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Pull Request                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CI Pipeline                                  │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Terraform       │  │ Ansible      │  │ Secret           │  │
│  │ Validation      │  │ Lint         │  │ Scanning         │  │
│  └─────────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Policy Validation                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Merge to main                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CD Pipeline                                  │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Terraform       │  │ Ansible      │  │ Deploy Shipper   │  │
│  │ Apply           │  │ Configure    │  │ Config           │  │
│  └─────────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Post-Deployment Verification                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### B. Approval Workflow Diagram

```
┌──────────────┐
│   Create PR  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ CI Pipeline  │───► Failed ───► Fix Issues
└──────┬───────┘
       │ Passed
       ▼
┌──────────────┐
│ Code Review  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Approve    │───► Changes ───► Update PR
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Merge PR   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ CD Pipeline  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Production  │
│  Approval   │───► Reject ───► Rollback
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Deploy     │
└──────────────┘
```

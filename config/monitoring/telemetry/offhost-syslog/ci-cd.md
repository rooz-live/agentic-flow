# CI/CD Pipeline - Off-Host Syslog Black Box Recorder

## Overview

This document describes the CI/CD pipeline for the off-host syslog black box recorder, including automated testing, validation, and deployment processes.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CI/CD Pipeline                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ CI Jobs     │  │ CD Jobs     │  │ Manual   │ │
│  │ (Every PR)   │  │ (Manual)     │  │ Triggers │ │
│  │              │  │              │  │          │ │
│  │ - terraform │  │ - terraform │  │ - Plan   │ │
│  │   fmt       │  │   plan       │  │ - Apply   │ │
│  │ - validate   │  │ - apply       │  │ - Ansible │ │
│  │ - security   │  │ - ansible    │  │ - Client   │ │
│  │ - ansible    │  │   apply       │  │ - Deploy   │ │
│  │   lint       │  │              │  │          │ │
│  │ - secret     │  │              │  │          │ │
│  │   scan       │  │              │  │          │ │
│  │ - policy     │  │              │  │          │ │
│  │   check      │  │              │  │          │ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## CI Jobs (Run on Every PR)

### 1. terraform-fmt

**Purpose**: Validate Terraform code formatting

**Tools**: Terraform 1.5.0

**Checks**:
- Terraform HCL formatting
- Indentation consistency
- File naming conventions

**Failure Criteria**: Any formatting errors

**Remediation**:
```bash
terraform fmt -recursive
```

### 2. terraform-validate

**Purpose**: Validate Terraform configuration syntax

**Tools**: Terraform 1.5.0

**Checks**:
- Terraform configuration syntax
- Module structure
- Variable definitions
- Provider configuration

**Failure Criteria**: Any validation errors

**Dependencies**: `terraform-fmt` job

### 3. terraform-security

**Purpose**: Scan for security vulnerabilities

**Tools**: tfsec

**Checks**:
- AWS security best practices
- S3 bucket encryption
- IAM policy security
- Network security rules

**Failure Criteria**: HIGH or CRITICAL severity issues

**Dependencies**: `terraform-validate` job

**Example Findings**:
```
CRITICAL: S3 bucket missing encryption
HIGH: Security group allows 0.0.0.0/0
MEDIUM: Resource missing tags
```

### 4. ansible-lint

**Purpose**: Validate Ansible playbook syntax

**Tools**: Ansible 2.15.0, ansible-lint

**Checks**:
- Playbook syntax
- Role structure
- Variable usage
- Best practices compliance

**Failure Criteria**: Any linting errors

**Dependencies**: None

**Example Findings**:
```
[401] Role tasks/main.yml should be in UTF-8
[502] All tasks should be named
[601] No handler named "restart service"
```

### 5. secret-scan

**Purpose**: Scan for secrets and credentials

**Tools**: TruffleHog

**Checks**:
- Private keys
- API keys
- Passwords
- Tokens
- Credentials

**Failure Criteria**: Any secrets found

**Dependencies**: None

**Example Findings**:
```
Found: AWS access key AKIAIOSFODNN7EXAMPLE
Found: BEGIN RSA PRIVATE KEY
Found: password="secret123"
```

### 6. policy-check

**Purpose**: Validate security policies

**Tools**: Custom bash scripts

**Checks**:
- No 0.0.0.0/0 on port 6514
- Allowlist contains only 23.92.79.2/32
- TLS enabled (port 6514, not 514)
- SSH restricted to admin IP

**Failure Criteria**: Any policy violation

**Dependencies**: `terraform-validate` job

**Policy Violations**:
```
ERROR: 0.0.0.0/0 found in firewall rules
ERROR: Non-allowlist IP found for port 6514
ERROR: Plaintext syslog port 514 found
```

## CD Jobs (Manual Trigger)

### 1. terraform-plan

**Purpose**: Preview infrastructure changes

**Trigger**: Manual workflow dispatch

**Environment**: Production

**Approvals**: None (plan is safe)

**Steps**:
1. Configure AWS credentials
2. Initialize Terraform
3. Generate execution plan
4. Upload plan as artifact

**Output**: `tfplan` artifact

**Review Process**:
- Review plan for accuracy
- Verify resource changes
- Check cost implications

### 2. terraform-apply

**Purpose**: Apply infrastructure changes

**Trigger**: Manual workflow dispatch

**Environment**: Production

**Approvals**: Required manual approval

**Steps**:
1. Configure AWS credentials
2. Initialize Terraform
3. Apply infrastructure changes
4. Output Terraform results

**Dependencies**: `terraform-plan` job

**Outputs**: `terraform-outputs` artifact

**Approval Process**:
1. Review plan output
2. Verify cost implications
3. Confirm resource changes
4. Approve in GitHub Actions UI

### 3. ansible-apply

**Purpose**: Configure syslog sink and client

**Trigger**: Manual workflow dispatch

**Environment**: Production

**Approvals**: Required manual approval

**Steps**:
1. Install Ansible and collections
2. Download Terraform outputs
3. Update inventory with VPS IP
4. Run syslog sink playbook
5. Run syslog client playbook

**Dependencies**: `terraform-apply` job

**Approval Process**:
1. Review configuration changes
2. Verify TLS certificates
3. Confirm security hardening
4. Approve in GitHub Actions UI

### 4. deploy-client

**Purpose**: Deploy client config to stx-aio-0

**Trigger**: Manual workflow dispatch

**Environment**: Production

**Approvals**: Required manual approval

**Steps**:
1. Install Ansible and collections
2. Run client configuration playbook

**Dependencies**: `ansible-apply` job

**Network Risk**: High - modifies production StarlingX server

**Approval Process**:
1. Review client configuration
2. Verify syslog forwarding
3. Confirm journald changes
4. Approve in GitHub Actions UI

## Approval Process

### Manual Approval Gates

All CD jobs require manual approval:

1. **Plan Review**: Review `terraform-plan` output
2. **Apply Approval**: Approve `terraform-apply` job
3. **Ansible Approval**: Approve `ansible-apply` job
4. **Client Approval**: Approve `deploy-client` job

### Approval Checklist

Before approving a deployment:

- [ ] Review terraform plan output
- [ ] Verify cost implications
- [ ] Confirm security policies
- [ ] Check TLS certificates are valid
- [ ] Verify firewall rules
- [ ] Confirm log retention settings
- [ ] Check rollback procedure

### Rollback Procedure

If deployment fails:

1. **Terraform Rollback**:
   ```bash
   terraform apply -destroy
   terraform apply -auto-approve
   ```

2. **Ansible Rollback**:
   ```bash
   # Restore previous configuration
   ansible-playbook -i inventory/hosts.ini playbooks/rollback.yml
   ```

3. **Client Rollback**:
   ```bash
   # Restore previous rsyslog configuration
   ansible-playbook -i inventory/hosts.ini playbooks/restore-client.yml
   ```

## Environment Variables

### Required Secrets

Configure these secrets in GitHub repository settings:

| Secret | Description | Example |
|--------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key ID | AKIAIOSFODNN7EXAMPLE |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key | wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLE |
| `SSH_PRIVATE_KEY` | SSH private key for VPS | -----BEGIN RSA PRIVATE KEY----- |
| `STX_SSH_PRIVATE_KEY` | SSH private key for StarlingX | -----BEGIN RSA PRIVATE KEY----- |

### Configuration Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TERRAFORM_VERSION` | Terraform version | 1.5.0 |
| `ANSIBLE_VERSION` | Ansible version | 2.15.0 |
| `AWS_REGION` | AWS region | us-east-1 |

## Workflow Dispatch

### Triggering Manual Workflows

1. Go to GitHub Actions tab
2. Select "Off-Host Syslog CI/CD" workflow
3. Click "Run workflow"
4. Configure inputs:
   - `terraform_apply`: Set to `true`
   - `ansible_apply`: Set to `true`
   - `deploy_client`: Set to `true`

### Full Deployment Sequence

For complete deployment:

1. **CI Phase** (automatic on PR):
   - All CI jobs run and pass
   - No manual intervention required

2. **CD Phase** (manual trigger):
   - Run `terraform-plan`
   - Review and approve `terraform-apply`
   - Review and approve `ansible-apply`
   - Review and approve `deploy-client`

## Troubleshooting

### CI Job Failures

**Terraform Format Fails**:
```bash
# Run format locally
terraform fmt -recursive

# Commit fixes
git add .
git commit -m "Fix terraform formatting"
git push
```

**Terraform Validate Fails**:
```bash
# Check syntax errors
terraform validate

# Review error messages
# Fix variable definitions
# Fix module references
```

**Security Scan Fails**:
```bash
# Review tfsec findings
# Address HIGH and CRITICAL issues
# Update security policies
```

**Ansible Lint Fails**:
```bash
# Run lint locally
ansible-lint --force-color

# Fix syntax errors
# Update role structure
# Add missing handlers
```

**Secret Scan Fails**:
```bash
# Review TruffleHog findings
# Remove committed secrets
# Rotate exposed credentials
# Update .gitignore
```

**Policy Check Fails**:
```bash
# Review policy violations
# Update firewall rules
# Fix allowlist configurations
# Enable TLS where missing
```

### CD Job Failures

**Terraform Apply Fails**:
```bash
# Check AWS credentials
aws sts get-caller-identity

# Review error logs
terraform show

# Fix state lock issues
terraform force-unlock <LOCK_ID>

# Rollback if needed
terraform apply -destroy
```

**Ansible Apply Fails**:
```bash
# Check SSH connectivity
ansible -m ping all -i inventory/hosts.ini

# Review error logs
# Check service status
ansible -m service -a "name=rsyslog state=started" all

# Fix configuration issues
# Re-run with verbose mode
ansible-playbook -i inventory/hosts.ini -vvv playbook.yml
```

**Client Deploy Fails**:
```bash
# Check StarlingX connectivity
ansible -m ping syslog_client -i inventory/hosts.ini

# Review error logs
# Check journald status
ansible -m systemd -a "name=systemd-journald state=started" syslog_client

# Fix configuration issues
# Restore previous config
# Restart services
```

## Monitoring

### Pipeline Status

View pipeline status in GitHub Actions:
- Real-time job execution
- Artifact downloads
- Log viewing
- Status badges

### Artifacts

Artifacts available after successful runs:
- `terraform-plan`: Terraform execution plan
- `terraform-outputs`: Terraform output values
- `ansible-logs`: Ansible execution logs

### Notifications

Configure notifications in GitHub repository settings:
- Email notifications on failure
- Slack/Discord webhooks
- Status badges in README

## Best Practices

1. **Branch Protection**: Require PR reviews for main branch
2. **Required Checks**: All CI jobs must pass before merge
3. **Manual Approvals**: All CD jobs require manual approval
4. **Secret Management**: Never commit secrets to repository
5. **Documentation**: Update documentation with each change
6. **Testing**: Test changes in staging before production
7. **Rollback Plan**: Always have a rollback procedure ready
8. **Cost Monitoring**: Monitor AWS costs after deployment
9. **Security First**: Never bypass security checks
10. **Incremental Changes**: Make small, incremental changes

## Related Documentation

- [Terraform README](terraform/README.md) - Terraform configuration
- [Ansible README](ansible/README.md) - Ansible configuration
- [Main README](README.md) - Project overview

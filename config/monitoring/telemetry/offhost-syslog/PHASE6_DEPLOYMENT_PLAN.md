# Phase 6: Deployment and Operations Transition Plan

## Document Information

| Field | Value |
|-------|-------|
| **Document Version** | 1.0.0 |
| **Date Created** | 2026-01-02 |
| **Author** | Lead Infrastructure Engineer |
| **Status** | Draft |
| **Project** | Hivelocity Device Manager Observability |

---

## Executive Summary

This document provides a comprehensive technical directive for deploying and transitioning to operations Off-Host Syslog Black Box Recorder infrastructure. The plan translates strategic objectives into actionable technical steps, ensuring continuity with existing Terraform and Ansible codebase from Phases 1-5.

### Strategic Roadmap Alignment

| Timeline | Milestones |
|----------|------------|
| **Immediate (Today-Week 1)** | Finalize pre-deployment checklist, generate TLS certificates, initialize Terraform, execute VPS provisioning, deploy syslog sink |
| **Short-term (Week 2-4)** | Establish real API integration (AWS/Hivelocity), deploy monitoring dashboard, formalize incident response procedures |
| **Medium-term (Month 2-3)** | Roll out monitoring dashboard, complete incident response procedures, conduct end-to-end testing |
| **Long-term (Month 4+)** | Architect multi-region deployment plan, implement advanced analytics (ELK stack), cost optimization |

---

# Part 1: Pre-Deployment Technical Checklist

## 1.1 Infrastructure Prerequisites

### 1.1.1 Cloud Provider Configuration

**AWS Lightsail Configuration**
- [ ] AWS credentials configured in [`~/.aws/credentials`](~/.aws/credentials)
- [ ] AWS region set to `us-east-1`
- [ ] Lightsail service quota verified (minimum 1 instance)
- [ ] Budget limit of $10/month configured in AWS Budgets
- [ ] Budget alert email configured: `admin@example.com`

**Hivelocity Configuration** (Alternative)
- [ ] Hivelocity API key obtained from Hivelocity portal
- [ ] API key stored in environment variable `HIVELOCITY_API_KEY`
- [ ] Device ID identified: `24460` (or new device ID)
- [ ] Billing account verified active

### 1.1.2 Network Configuration

- [ ] Admin SSH allowlist CIDR: `173.94.53.113/32`
- [ ] Source server IP: `23.92.79.2/32` (stx-aio-0.corp.interface.tag.ooo)
- [ ] Syslog port: `6514/TCP` (TLS)
- [ ] SSH port: `22/TCP` (key-based authentication only)
- [ ] Firewall rules documented in [`config/telemetry/offhost-syslog/firewall/nftables-sink.conf`](config/telemetry/offhost-syslog/firewall/nftables-sink.conf)

### 1.1.3 SSH Key Configuration

- [ ] SSH key pair generated or existing key identified
- [ ] Public key content available for Terraform variable
- [ ] Private key secured locally (permissions 0600)
- [ ] Key name: `offhost-syslog-key`

## 1.2 TLS Certificate Infrastructure

### 1.2.1 Certificate Generation Preparation

Reference: [`config/telemetry/offhost-syslog/tls/generate-ca.sh`](config/telemetry/offhost-syslog/tls/generate-ca.sh:1-42)

**Required Environment Variables**
```bash
export SYSLOG_SINK_HOSTNAME="syslog-sink"
export SYSLOG_SINK_IP="<VPS_IP_FROM_TERRAFORM>"
export CA_VALIDITY_DAYS=3650
export CERT_VALIDITY_DAYS=365
```

**Prerequisites**
- [ ] OpenSSL installed (version 1.1.1 or higher)
- [ ] Configuration files present:
  - [`config/telemetry/offhost-syslog/tls/ca.conf`](config/telemetry/offhost-syslog/tls/ca.conf)
  - [`config/telemetry/offhost-syslog/tls/server.conf`](config/telemetry/offhost-syslog/tls/server.conf)
  - [`config/telemetry/offhost-syslog/tls/client.conf`](config/telemetry/offhost-syslog/tls/client.conf)
- [ ] Certificate directory structure created:
  ```
  config/telemetry/offhost-syslog/tls/
  ├── ca.conf
  ├── server.conf
  ├── client.conf
  ├── generate-ca.sh
  ├── generate-server-cert.sh
  ├── generate-client-cert.sh
  ├── certs/          (will be created)
  └── private/        (will be created, secure)
  ```

### 1.2.2 Certificate Generation Sequence

**Step 1: Generate CA Certificate**
```bash
cd config/telemetry/offhost-syslog/tls
./generate-ca.sh
```

**Verification:**
```bash
ls -la ca.key ca.crt
# Expected output:
# -rw------- 1 root root ca.key  (0600 permissions)
# -rw-r--r-- 1 root root ca.crt (0644 permissions)
```

**Step 2: Generate Server Certificate**
```bash
./generate-server-cert.sh
```

**Verification:**
```bash
openssl x509 -in server.crt -text -noout | grep -E "Subject:|Not Before|Not After"
```

**Step 3: Generate Client Certificate**
```bash
./generate-client-cert.sh
```

**Verification:**
```bash
openssl verify -CAfile ca.crt client.crt
```

**Success Criteria:**
- [ ] CA certificate generated with 10-year validity
- [ ] Server certificate generated with 1-year validity
- [ ] Client certificate generated with 1-year validity
- [ ] All private keys have 0600 permissions
- [ ] All certificates verify against CA
- [ ] Certificate chain valid for TLS mutual authentication

## 1.3 Terraform Configuration

### 1.3.1 State Backend Configuration

Reference: [`config/telemetry/offhost-syslog/terraform/main.tf`](config/telemetry/offhost-syslog/terraform/main.tf:22-36)

**S3 Backend Requirements**
- [ ] S3 bucket exists: `offhost-syslog-terraform-state`
- [ ] DynamoDB table exists: `offhost-syslog-terraform-locks`
- [ ] Bucket versioning enabled
- [ ] Bucket encryption enabled (SSE-S3 or SSE-KMS)
- [ ] IAM permissions configured for state access

**Terraform Version**
- [ ] Terraform version >= 1.5.0 installed
- [ ] AWS provider version ~> 5.0 compatible
- [ ] Required providers installed:
  - `hashicorp/aws`
  - `hashicorp/null`
  - `hashicorp/local`

### 1.3.2 Variable Configuration

Reference: [`config/telemetry/offhost-syslog/terraform/variables.tf`](config/telemetry/offhost-syslog/terraform/variables.tf:1-198)

**Required Variables**
```hcl
provider_choice      = "lightsail"  # or "hivelocity"
instance_name       = "syslog-sink"
region              = "us-east-1"
blueprint_id        = "ubuntu_22_04"
bundle_id           = "nano_2_0"
admin_ssh_cidr      = "173.94.53.113/32"
starlingx_ip        = "23.92.79.2"
ssh_public_key      = "<SSH_PUBLIC_KEY_CONTENT>"
budget_limit        = 10
budget_alert_email  = "admin@example.com"
```

**Variable Validation**
- [ ] All required variables defined
- [ ] CIDR blocks validated
- [ ] SSH public key format verified
- [ ] Budget limits within approved range

## 1.4 Ansible Configuration

### 1.4.1 Inventory Configuration

Reference: [`config/telemetry/offhost-syslog/ansible/inventory/hosts.ini`](config/telemetry/offhost-syslog/ansible/inventory/hosts.ini:1-15)

**Pre-Deployment Inventory Template**
```ini
[syslog_sink]
# Update IP after Terraform apply
<PLACEHOLDER_IP> ansible_user=root ansible_port=22

[syslog_client]
stx-aio-0.corp.interface.tag.ooo ansible_user=ubuntu ansible_port=22

[all:vars]
ansible_python_interpreter=/usr/bin/python3
admin_ip=173.94.53.113
syslog_port=6514
log_dir=/var/log/syslog
```

**Verification:**
- [ ] Placeholder IP marked for post-apply update
- [ ] SSH user matches VPS OS (root for Hivelocity, ubuntu for AWS)
- [ ] Python interpreter path correct for target OS

### 1.4.2 Group Variables

Reference: [`config/telemetry/offhost-syslog/ansible/group_vars/all.yml`](config/telemetry/offhost-syslog/ansible/group_vars/all.yml:1-62)

**Configuration Review**
- [ ] Syslog port: `6514`
- [ ] TLS certificate paths configured
- [ ] Log retention periods:
  - Auth logs: 30 days
  - System warnings: 7 days
  - System info: 3 days
- [ ] Security settings:
  - SSH password authentication: false
  - SSH key authentication only: true
  - Fail2ban enabled: true
- [ ] Monitoring enabled: false (will be enabled in Phase 6.4)

### 1.4.3 Playbook Validation

Reference: [`config/telemetry/offhost-syslog/ansible/playbook.yml`](config/telemetry/offhost-syslog/ansible/playbook.yml:1-155)

**Role Dependencies**
- [ ] `base` role tasks reviewed
- [ ] `rsyslog` role tasks reviewed
- [ ] `logrotate` role tasks reviewed
- [ ] `security-hardening` role tasks reviewed (if used)

**Playbook Syntax Check**
```bash
cd config/telemetry/offhost-syslog/ansible
ansible-playbook playbook.yml --syntax-check
```

**Success Criteria:**
- [ ] No syntax errors
- [ ] All roles accessible
- [ ] All templates valid

## 1.5 Monitoring Configuration

### 1.5.1 Provider Drift Monitor Configuration

Reference: [`config/telemetry/offhost-syslog/monitoring/config.yml`](config/telemetry/offhost-syslog/monitoring/config.yml:1-418)

**Environment Variables Required**
```bash
# Hivelocity
export HIVELOCITY_API_KEY="<API_KEY>"
export HIVELOCITY_DEVICE_ID="24460"

# AWS
export AWS_ACCESS_KEY_ID="<ACCESS_KEY>"
export AWS_SECRET_ACCESS_KEY="<SECRET_KEY>"
export AWS_REGION="us-east-1"
export AWS_INSTANCE_ID="syslog-sink-instance"

# Syslog Sink
export SYSLOG_SINK_HOST="<VPS_IP>"
export SYSLOG_SINK_PORT="6514"
export SYSLOG_PROTOCOL="tls"

# Alerting (optional)
export SNS_TOPIC_ARN="arn:aws:sns:us-east-1:123456789012:alerts"
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
export ALERT_MIN_SEVERITY="warning"
```

**Configuration Validation**
- [ ] Health check intervals configured (60-300 seconds)
- [ ] Alert thresholds set appropriately
- [ ] Duplicate suppression enabled (5-minute window)
- [ ] Incident retention: 90 days
- [ ] WSJF calculation enabled

### 1.5.2 Alert Router Configuration

Reference: [`agentic-flow-core/src/devops/alert-router.ts`](agentic-flow-core/src/devops/alert-router.ts:1-830)

**Alert Channels**
- [ ] SNS topic ARN configured (if using AWS)
- [ ] Webhook URLs configured:
  - Slack webhook (optional)
  - PagerDuty webhook (optional)
  - Custom webhook (optional)
- [ ] Syslog sink integration configured

**Alert Routing Rules**
- [ ] Minimum severity: `warning`
- [ ] Duplicate suppression: enabled
- [ ] Suppression window: 5 minutes (300000ms)
- [ ] Escalation rules configured:
  - Warning → Error: 15 minutes
  - Error → Critical: 30 minutes

## 1.6 Pre-Deployment Verification Gates

### 1.6.1 Terraform Validation

```bash
cd config/telemetry/offhost-syslog/terraform

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Format check
terraform fmt -check

# Plan review
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json
```

**Success Criteria:**
- [ ] No validation errors
- [ ] No formatting issues
- [ ] Plan output reviewed and approved
- [ ] Resource changes match expectations
- [ ] Cost estimate within budget ($10/month)

### 1.6.2 Ansible Validation

```bash
cd config/telemetry/offhost-syslog/ansible

# Syntax check
ansible-playbook playbook.yml --syntax-check

# Lint check (if ansible-lint installed)
ansible-lint playbook.yml

# Inventory check
ansible-inventory -i inventory/hosts.ini --list
```

**Success Criteria:**
- [ ] No syntax errors
- [ ] No lint errors (or warnings reviewed)
- [ ] Inventory resolves correctly
- [ ] All hosts reachable (for existing infrastructure)

### 1.6.3 Security Scans

```bash
# Secret scan
gitleaks detect --source config/telemetry/offhost-syslog/ --verbose

# Policy check
./config/telemetry/offhost-syslog/ci/policy-check.sh
```

**Success Criteria:**
- [ ] No secrets detected in code
- [ ] Policy checks passed
- [ ] TLS certificates valid
- [ ] SSH keys not hardcoded

### 1.6.4 CI/CD Pipeline

Reference: [`config/telemetry/offhost-syslog/ci/policy-check.sh`](config/telemetry/offhost-syslog/ci/policy-check.sh)

**Pipeline Checks**
- [ ] All CI jobs passed
- [ ] Terraform validation passed
- [ ] Ansible lint passed
- [ ] Security scan passed
- [ ] Policy validation passed

---

# Part 2: Deployment Execution Steps

## 2.1 Deployment Overview

### 2.1.1 Deployment Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 6 Deployment Sequence                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Pre-Deployment Verification (Day 0)                      │
│     ├── Review all checklists                                  │
│     ├── Approve deployment plan                                │
│     └── Set up monitoring                                    │
│                                                              │
│  2. TLS Certificate Generation (Day 0)                        │
│     ├── Generate CA certificate                               │
│     ├── Generate server certificate                            │
│     └── Generate client certificate                           │
│                                                              │
│  3. Terraform Initialization (Day 0)                          │
│     ├── terraform init                                       │
│     ├── terraform validate                                   │
│     └── terraform plan                                      │
│                                                              │
│  4. VPS Provisioning (Day 0-1)                             │
│     ├── terraform apply                                       │
│     ├── Capture outputs (IP, instance ID)                      │
│     └── Update Ansible inventory                              │
│                                                              │
│  5. Syslog Sink Deployment (Day 1)                           │
│     ├── Deploy TLS certificates                               │
│     ├── Run Ansible playbook (syslog_sink)                     │
│     ├── Verify rsyslog service                                │
│     └── Verify TLS listener                                  │
│                                                              │
│  6. Client Configuration (Day 1-2)                           │
│     ├── Deploy client certificates                            │
│     ├── Run Ansible playbook (syslog_client)                  │
│     └── Verify log forwarding                                │
│                                                              │
│  7. Verification Testing (Day 2)                            │
│     ├── Run connectivity tests                                │
│     ├── Run log ingestion tests                               │
│     └── Run retention tests                                 │
│                                                              │
│  8. Monitoring Activation (Day 3-7)                         │
│     ├── Deploy provider drift monitor                         │
│     ├── Configure alert router                               │
│     └── Verify alert delivery                               │
│                                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1.2 Rollback Points

| Step | Rollback Point | Rollback Time |
|------|---------------|---------------|
| 3. Terraform Initialization | N/A (no changes) | < 1 minute |
| 4. VPS Provisioning | `terraform destroy` | 5-10 minutes |
| 5. Syslog Sink Deployment | Re-run playbook with previous config | 2-5 minutes |
| 6. Client Configuration | Restore client rsyslog config | 1-2 minutes |
| 7. Monitoring Activation | Stop monitoring services | < 1 minute |

## 2.2 Step-by-Step Deployment

### 2.2.1 Step 1: Pre-Deployment Verification (Day 0)

**Commands:**
```bash
# Navigate to project directory
cd config/telemetry/offhost-syslog

# Review pre-deployment checklist
cat PRE_DEPLOYMENT_CHECKLIST.md

# Verify all prerequisites met
./tests/verification-gates.sh
```

**Success Criteria:**
- [ ] All checklist items completed
- [ ] All verification gates passed
- [ ] Deployment approved by DevOps lead
- [ ] Emergency contacts confirmed

**Rollback:** Not applicable (no changes made)

### 2.2.2 Step 2: TLS Certificate Generation (Day 0)

**Commands:**
```bash
# Set environment variables
export SYSLOG_SINK_HOSTNAME="syslog-sink"
export SYSLOG_SINK_IP="pending"  # Will update after Terraform
export CA_VALIDITY_DAYS=3650
export CERT_VALIDITY_DAYS=365

# Generate CA certificate
cd tls
./generate-ca.sh

# Verify CA generation
ls -la ca.key ca.crt
openssl x509 -in ca.crt -text -noout | grep -E "Subject:|Not Before|Not After"

# Generate server certificate
./generate-server-cert.sh

# Verify server certificate
openssl x509 -in server.crt -text -noout | grep -E "Subject:|Not Before|Not After"
openssl verify -CAfile ca.crt server.crt

# Generate client certificate
./generate-client-cert.sh

# Verify client certificate
openssl x509 -in client.crt -text -noout | grep -E "Subject:|Not Before|Not After"
openssl verify -CAfile ca.crt client.crt
```

**Success Criteria:**
- [ ] `ca.key` and `ca.crt` created with correct permissions
- [ ] `server.key`, `server.crt` created and verified
- [ ] `client.key`, `client.crt` created and verified
- [ ] All certificates valid for expected duration
- [ ] CA certificate chain valid

**Rollback Procedure:**
```bash
# Remove generated certificates
rm -f ca.key ca.crt server.key server.crt client.key client.crt
rm -rf certs/ private/

# Re-run generation scripts if needed
```

### 2.2.3 Step 3: Terraform Initialization (Day 0)

**Commands:**
```bash
# Navigate to Terraform directory
cd config/telemetry/offhost-syslog/terraform

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Format check
terraform fmt -check

# Create execution plan
terraform plan -out=tfplan

# Review plan output
terraform show tfplan

# Save plan for approval
terraform show -json tfplan > tfplan.json
```

**Success Criteria:**
- [ ] Terraform initialized successfully
- [ ] Backend configured (S3 + DynamoDB)
- [ ] Configuration validated without errors
- [ ] Plan reviewed and approved
- [ ] Cost estimate within budget ($10/month)

**Rollback:** Not applicable (no resources created)

### 2.2.4 Step 4: VPS Provisioning (Day 0-1)

**Commands:**
```bash
# Apply Terraform configuration
terraform apply tfplan

# Monitor deployment
terraform apply -auto-approve

# Capture outputs
terraform output -json > outputs.json

# Extract important values
VPS_IP=$(terraform output -raw vps_public_ip)
INSTANCE_ID=$(terraform output -raw vps_instance_id)
echo "VPS IP: $VPS_IP"
echo "Instance ID: $INSTANCE_ID"

# Update Ansible inventory
cd ../ansible
sed -i "s/<PLACEHOLDER_IP>/$VPS_IP/g" inventory/hosts.ini

# Verify SSH connectivity
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@$VPS_IP "echo 'SSH successful'"
```

**Success Criteria:**
- [ ] VPS provisioned successfully
- [ ] Instance state: running
- [ ] Public IP assigned
- [ ] SSH connectivity established
- [ ] Ansible inventory updated with VPS IP

**Rollback Procedure:**
```bash
cd config/telemetry/offhost-syslog/terraform

# Destroy all resources
terraform destroy -auto-approve

# Verify cleanup
terraform state list
```

**Rollback Time:** 5-10 minutes

### 2.2.5 Step 5: Syslog Sink Deployment (Day 1)

**Commands:**
```bash
# Navigate to Ansible directory
cd config/telemetry/offhost-syslog/ansible

# Copy certificates to Ansible files directory
cp ../tls/ca.crt roles/syslog-sink/files/
cp ../tls/server.crt roles/syslog-sink/files/
cp ../tls/server.key roles/syslog-sink/files/

# Verify inventory
ansible-inventory -i inventory/hosts.ini --list

# Test connectivity
ansible syslog_sink -i inventory/hosts.ini -m ping

# Run syslog sink playbook
ansible-playbook -i inventory/hosts.ini playbook.yml --tags syslog_sink

# Verify rsyslog service
ansible syslog_sink -i inventory/hosts.ini -m shell -a "systemctl status rsyslog"

# Verify TLS listener
ansible syslog_sink -i inventory/hosts.ini -m shell -a "ss -tlnp | grep 6514"

# Check log directories
ansible syslog_sink -i inventory/hosts.ini -m shell -a "ls -la /var/log/syslog"
```

**Success Criteria:**
- [ ] TLS certificates deployed to VPS
- [ ] rsyslog service running and enabled
- [ ] TLS listener active on port 6514
- [ ] Log directories created
- [ ] Logrotate configuration deployed
- [ ] Firewall rules applied

**Rollback Procedure:**
```bash
# Stop rsyslog service
ansible syslog_sink -i inventory/hosts.ini -m systemd -a "name=rsyslog state=stopped"

# Remove configuration files
ansible syslog_sink -i inventory/hosts.ini -m file -a "path=/etc/rsyslog.d/99-tls-syslog.conf state=absent"

# Restore previous configuration
ansible syslog_sink -i inventory/hosts.ini -m service -a "name=rsyslog state=restarted"

# Or destroy VPS entirely
cd ../terraform
terraform destroy -auto-approve
```

**Rollback Time:** 2-5 minutes (service rollback) or 5-10 minutes (VPS rollback)

### 2.2.6 Step 6: Client Configuration (Day 1-2)

**Commands:**
```bash
# Navigate to Ansible directory
cd config/telemetry/offhost-syslog/ansible

# Copy client certificates
cp ../tls/ca.crt roles/syslog-client/files/
cp ../tls/client.crt roles/syslog-client/files/
cp ../tls/client.key roles/syslog-client/files/

# Test connectivity to client
ansible syslog_client -i inventory/hosts.ini -m ping

# Run syslog client playbook
ansible-playbook -i inventory/hosts.ini playbook.yml --tags syslog_client

# Verify client configuration
ansible syslog_client -i inventory/hosts.ini -m shell -a "cat /etc/rsyslog.d/99-offhost-tls.conf"

# Restart journald
ansible syslog_client -i inventory/hosts.ini -m systemd -a "name=systemd-journald state=restarted"

# Restart rsyslog
ansible syslog_client -i inventory/hosts.ini -m systemd -a "name=rsyslog state=restarted"

# Verify rsyslog service
ansible syslog_client -i inventory/hosts.ini -m shell -a "systemctl status rsyslog"
```

**Success Criteria:**
- [ ] Client certificates deployed
- [ ] journald forwarding configured
- [ ] rsyslog TLS configuration deployed
- [ ] rsyslog service restarted successfully
- [ ] No configuration errors

**Rollback Procedure:**
```bash
# Remove TLS configuration
ansible syslog_client -i inventory/hosts.ini -m file -a "path=/etc/rsyslog.d/99-offhost-tls.conf state=absent"

# Remove journald forwarding
ansible syslog_client -i inventory/hosts.ini -m file -a "path=/etc/systemd/journald.conf.d/50-forward-syslog.conf state=absent"

# Restart services
ansible syslog_client -i inventory/hosts.ini -m systemd -a "name=systemd-journald state=restarted"
ansible syslog_client -i inventory/hosts.ini -m systemd -a "name=rsyslog state=restarted"
```

**Rollback Time:** 1-2 minutes

### 2.2.7 Step 7: Verification Testing (Day 2)

**Commands:**
```bash
# Navigate to tests directory
cd config/telemetry/offhost-syslog/tests

# Run connectivity test
./test-connectivity.sh

# Run log ingestion test
./test-log-ingestion.sh

# Run retention test
./verify-retention.sh

# Run comprehensive verification
./verify-all.sh

# Check logs on sink
ansible syslog_sink -i ../ansible/inventory/hosts.ini -m shell -a "tail -f /var/log/syslog/auth.log"
```

**Success Criteria:**
- [ ] Connectivity test passed
- [ ] Log ingestion test passed
- [ ] Retention test passed
- [ ] TLS connection verified
- [ ] Logs appearing in sink
- [ ] Log rotation working

**Rollback:** Not applicable (testing only)

### 2.2.8 Step 8: Monitoring Activation (Day 3-7)

**Commands:**
```bash
# Build TypeScript monitoring code
cd agentic-flow-core
npm run build

# Set environment variables
export HIVELOCITY_API_KEY="<API_KEY>"
export HIVELOCITY_DEVICE_ID="24460"
export AWS_ACCESS_KEY_ID="<ACCESS_KEY>"
export AWS_SECRET_ACCESS_KEY="<SECRET_KEY>"
export AWS_REGION="us-east-1"
export SYSLOG_SINK_HOST="<VPS_IP>"
export SYSLOG_SINK_PORT="6514"
export SYSLOG_PROTOCOL="tls"
export ALERT_MIN_SEVERITY="warning"

# Start provider drift monitor
node dist/devops/provider-drift-monitor.js

# Or use the factory function
node -e "
const { createMonitorFromEnv } = require('./dist/devops/provider-drift-monitor.js');
const monitor = createMonitorFromEnv();
monitor.start();
console.log('Provider drift monitor started');
"

# Start alert router in another terminal
node -e "
const { createAlertRouterFromEnv } = require('./dist/devops/alert-router.js');
const router = createAlertRouterFromEnv();
console.log('Alert router ready');
"

# Verify monitoring is running
ps aux | grep provider-drift-monitor
ps aux | grep alert-router
```

**Success Criteria:**
- [ ] Provider drift monitor started
- [ ] Alert router initialized
- [ ] Health checks running
- [ ] Alerts configured
- [ ] Syslog sink integration active

**Rollback Procedure:**
```bash
# Stop monitoring processes
pkill -f provider-drift-monitor
pkill -f alert-router

# Verify stopped
ps aux | grep -E "provider-drift-monitor|alert-router"
```

**Rollback Time:** < 1 minute

## 2.3 Post-Deployment Verification

### 2.3.1 Comprehensive Verification

**Commands:**
```bash
# Run all verification tests
cd config/telemetry/offhost-syslog/tests
./verify-deployment.sh

# Check service status
ansible syslog_sink -i ../ansible/inventory/hosts.ini -m shell -a "systemctl status rsyslog"
ansible syslog_client -i ../ansible/inventory/hosts.ini -m shell -a "systemctl status rsyslog"

# Verify log flow
ansible syslog_client -i ../ansible/inventory/hosts.ini -m shell -a "logger 'Test message from client'"
sleep 5
ansible syslog_sink -i ../ansible/inventory/hosts.ini -m shell -a "grep 'Test message from client' /var/log/syslog/auth.log"

# Verify monitoring
curl -s http://localhost:9090/metrics | grep -E "up|healthy"
```

**Success Criteria:**
- [ ] All verification tests passed
- [ ] Services running correctly
- [ ] Log flow verified
- [ ] Monitoring active
- [ ] Alerts configured

### 2.3.2 Deployment Sign-off

**Sign-off Checklist:**
- [ ] All deployment steps completed
- [ ] All verification tests passed
- [ ] Rollback procedures documented
- [ ] Monitoring baseline established
- [ ] Documentation updated
- [ ] Team notified of deployment

---

# Part 3: Real API Integration Plan

## 3.1 Cloud Provider Integration

### 3.1.1 AWS Lightsail Integration

**Current State:**
- Mock responses in [`agentic-flow-core/src/devops/cloud-provider-mocks.ts`](agentic-flow-core/src/devops/cloud-provider-mocks.ts:19-65)
- Placeholder API calls in [`agentic-flow-core/src/devops/cloud-provider-selector.ts`](agentic-flow-core/src/devops/cloud-provider-selector.ts:299-330)

**Integration Steps:**

**Step 1: Install AWS SDK v3**
```bash
cd agentic-flow-core
npm install @aws-sdk/client-lightsail @aws-sdk/client-cloudwatch
```

**Step 2: Replace Mock with Real API**

Modify [`agentic-flow-core/src/devops/cloud-provider-selector.ts`](agentic-flow-core/src/devops/cloud-provider-selector.ts):

```typescript
// Import AWS SDK v3
import { LightsailClient, GetInstancesCommand, CreateInstancesCommand } from '@aws-sdk/client-lightsail';

// Replace fetchAWSLightsailOfferings method
private async fetchAWSLightsailOfferings(): Promise<ProviderOffering[]> {
  const client = new LightsailClient({ region: this.awsClient?.defaults.baseURL?.split('.')[2] || 'us-east-1' });
  
  // Get available bundles
  const bundlesResponse = await client.send(new GetBundlesCommand({}));
  
  return bundlesResponse.bundles?.map(bundle => ({
    provider: 'aws_lightsail' as const,
    plan_id: bundle.bundleId || '',
    vcpus: bundle.cpuCount || 1,
    ram_gb: (bundle.ramSizeInGb || 1),
    disk_gb: (bundle.diskSizeInGb || 20),
    monthly_cost: bundle.price || 5.0,
    region: 'us-east-1',
  })) || [];
}
```

**Step 3: Replace Provisioning Method**

```typescript
// Replace provisionAWSLightsail method
private async provisionAWSLightsail(
  offering: ProviderOffering,
  hostname: string,
  sshAllowlist: string[]
): Promise<ProvisioningResult> {
  const client = new LightsailClient({ region: 'us-east-1' });
  
  const response = await client.send(new CreateInstancesCommand({
    instanceNames: [hostname],
    availabilityZone: 'us-east-1a',
    blueprintId: 'ubuntu_22_04',
    bundleId: offering.plan_id,
    userData: this.generateUserData(sshAllowlist),
    keyPairName: 'offhost-syslog-key',
  }));
  
  const instance = response.operations?.[0];
  
  return {
    ip: instance?.resource?.publicIpAddress || '',
    credentials: {
      username: 'ubuntu',
      ssh_key: '', // Use existing key pair
    },
    instance_id: instance?.id || '',
    hostname,
    provider: 'aws_lightsail',
  };
}
```

**Success Criteria:**
- [ ] AWS SDK v3 installed
- [ ] Mock responses replaced with real API calls
- [ ] Instance provisioning works end-to-end
- [ ] Error handling implemented
- [ ] Credentials managed securely

**Rollback Procedure:**
```bash
# Revert to mock implementation
git checkout HEAD -- agentic-flow-core/src/devops/cloud-provider-selector.ts

# Rebuild
npm run build
```

### 3.1.2 Hivelocity Integration

**Current State:**
- Mock responses in [`agentic-flow-core/src/devops/cloud-provider-mocks.ts`](agentic-flow-core/src/devops/cloud-provider-mocks.ts:135-181)
- Placeholder API calls in [`agentic-flow-core/src/devops/cloud-provider-selector.ts`](agentic-flow-core/src/devops/cloud-provider-selector.ts:337-368)

**Integration Steps:**

**Step 1: Configure Hivelocity API Client**

Modify [`agentic-flow-core/src/devops/cloud-provider-selector.ts`](agentic-flow-core/src/devops/cloud-provider-selector.ts:411-433):

```typescript
// Replace fetchHivelocityOfferings method
private async fetchHivelocityOfferings(): Promise<ProviderOffering[]> {
  const response = await this.hivelocityClient.get('/device/offerings');
  
  return response.data.map((offering: any) => ({
    provider: 'hivelocity' as const,
    plan_id: offering.id,
    vcpus: offering.specs.cpu,
    ram_gb: offering.specs.ram,
    disk_gb: offering.specs.disk,
    monthly_cost: offering.pricing.monthly,
    region: offering.location,
  }));
}

// Replace provisionHivelocity method
private async provisionHivelocity(
  offering: ProviderOffering,
  hostname: string,
  sshAllowlist: string[]
): Promise<ProvisioningResult> {
  const response = await this.hivelocityClient.post('/device/provision', {
    hostname,
    plan_id: offering.plan_id,
    os: 'ubuntu-22.04',
    ssh_keys: [this.getSSHPublicKey()],
    firewall_rules: this.generateFirewallRules(sshAllowlist),
  });
  
  return {
    ip: response.data.ips.primary.address,
    credentials: {
      username: 'root',
      password: response.data.credentials.password, // Temporary, change on first login
    },
    instance_id: String(response.data.id),
    hostname,
    provider: 'hivelocity',
  };
}
```

**Step 2: Configure API Authentication**

```typescript
// Update constructor
constructor(config: {
  aws?: { accessKeyId: string; secretAccessKey: string; region?: string };
  hivelocity?: { apiKey: string; apiBase?: string };
}) {
  this.logger = this.createLogger();

  // Initialize Hivelocity client with real API
  if (config.hivelocity) {
    const apiBase = config.hivelocity.apiBase || 'https://core.hivelocity.net/api/v2';
    this.hivelocityClient = axios.create({
      baseURL: apiBase,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.hivelocity.apiKey,
      },
      timeout: 30000, // 30 second timeout
    });
    this.logger('Hivelocity client initialized');
  }
}
```

**Success Criteria:**
- [ ] Hivelocity API client configured
- [ ] Real API calls implemented
- [ ] Device provisioning works end-to-end
- [ ] Error handling for API failures
- [ ] API key managed securely

**Rollback Procedure:**
```bash
# Revert to mock implementation
git checkout HEAD -- agentic-flow-core/src/devops/cloud-provider-selector.ts

# Rebuild
npm run build
```

## 3.2 Provider Drift Monitor Integration

### 3.2.1 Hivelocity Monitor Integration

Reference: [`agentic-flow-core/src/devops/provider-drift-monitor.ts`](agentic-flow-core/src/devops/provider-drift-monitor.ts:200-466)

**Integration Steps:**

**Step 1: Replace Mock API Calls**

```typescript
// Update apiRequest method to use real API
private async apiRequest(endpoint: string, method = 'GET', body?: unknown): Promise<any> {
  const url = `${this.apiBaseUrl}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      'X-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    timeout: 10000, // 10 second timeout
  });

  if (!response.ok) {
    throw new Error(`Hivelocity API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
```

**Step 2: Implement Real Health Checks**

```typescript
// Update getDevicePowerState to use real API
async getDevicePowerState(deviceId: string): Promise<PowerState> {
  try {
    const response = await this.apiRequest(`/device/${deviceId}/power`);
    
    const stateMap: Record<string, PowerState> = {
      'on': PowerState.ON,
      'off': PowerState.OFF,
      'rebooting': PowerState.REBOOTING,
      'restarting': PowerState.REBOOTING,
    };

    return stateMap[response.powerStatus?.toLowerCase()] || PowerState.UNKNOWN;
  } catch (error) {
    await this.logProviderEvent({
      eventId: `evt-${Date.now()}`,
      provider: 'hivelocity',
      eventType: 'health_change',
      severity: 'error',
      timestamp: new Date(),
      message: `Failed to get power state for device ${deviceId}`,
      details: { error: error instanceof Error ? error.message : String(error) },
    });
    return PowerState.UNKNOWN;
  }
}
```

**Success Criteria:**
- [ ] Real Hivelocity API calls implemented
- [ ] Power state monitoring working
- [ ] Port configuration monitoring working
- [ ] IPMI availability monitoring working
- [ ] Error handling implemented

**Rollback Procedure:**
```bash
# Revert to mock implementation
git checkout HEAD -- agentic-flow-core/src/devops/provider-drift-monitor.ts

# Rebuild
npm run build
```

### 3.2.2 AWS Monitor Integration

Reference: [`agentic-flow-core/src/devops/provider-drift-monitor.ts`](agentic-flow-core/src/devops/provider-drift-monitor.ts:481-841)

**Integration Steps:**

**Step 1: Install AWS SDK v3**
```bash
cd agentic-flow-core
npm install @aws-sdk/client-lightsail @aws-sdk/client-cloudwatch
```

**Step 2: Replace Mock with Real SDK**

```typescript
// Import AWS SDK v3
import { LightsailClient, GetInstanceCommand } from '@aws-sdk/client-lightsail';
import { CloudWatchClient, GetMetricStatisticsCommand, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';

// Update constructor
constructor(credentials: AWSCredentials) {
  this.credentials = credentials;
  
  // Initialize real AWS clients
  this.lightsailClient = new LightsailClient({
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
  
  this.cloudWatchClient = new CloudWatchClient({
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
}

// Update getInstanceState method
async getInstanceState(instanceName: string): Promise<InstanceState> {
  try {
    const response = await this.lightsailClient.send(
      new GetInstanceCommand({ instanceName })
    );
    
    const stateMap: Record<string, InstanceState> = {
      'running': InstanceState.RUNNING,
      'stopped': InstanceState.STOPPED,
      'pending': InstanceState.PENDING,
      'stopping': InstanceState.STOPPING,
    };

    return stateMap[response.instance?.state?.name?.toLowerCase()] || InstanceState.UNKNOWN;
  } catch (error) {
    if ((error as Error).message?.includes('not found')) {
      return InstanceState.NOT_FOUND;
    }
    await this.logEvent('error', `Failed to get instance state for ${instanceName}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return InstanceState.UNKNOWN;
  }
}
```

**Success Criteria:**
- [ ] AWS SDK v3 integrated
- [ ] Instance state monitoring working
- [ ] CloudWatch metrics retrieval working
- [ ] Synthetic monitoring (HTTPS/SSH) working
- [ ] CloudWatch alarm monitoring working

**Rollback Procedure:**
```bash
# Revert to mock implementation
git checkout HEAD -- agentic-flow-core/src/devops/provider-drift-monitor.ts

# Rebuild
npm run build
```

## 3.3 Alert Router Integration

### 3.3.1 SNS Integration

Reference: [`agentic-flow-core/src/devops/alert-router.ts`](agentic-flow-core/src/devops/alert-router.ts:187-230)

**Integration Steps:**

**Step 1: Install AWS SDK v3**
```bash
cd agentic-flow-core
npm install @aws-sdk/client-sns
```

**Step 2: Replace Mock with Real SDK**

```typescript
// Import AWS SDK v3
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

// Update constructor
constructor(config: AlertRouterConfig) {
  this.config = config;
  
  // Initialize SNS client
  if (config.sns) {
    this.snsClient = new SNSClient({
      region: config.sns.region,
    });
  }
}

// Update sendSNSAlert method
async sendSNSAlert(topic: string, message: AlertMessage): Promise<void> {
  if (!this.shouldSendAlert(message)) {
    return;
  }

  const payload = this.createAlertPayload(message);

  try {
    await this.snsClient.send(new PublishCommand({
      TopicArn: topic,
      Message: JSON.stringify(payload),
      Subject: `[${message.severity.toUpperCase()}] ${message.title}`,
      MessageAttributes: {
        severity: {
          DataType: 'String',
          StringValue: message.severity,
        },
        source: {
          DataType: 'String',
          StringValue: message.source,
        },
      },
    }));

    this.logDelivery({
      channel: 'sns',
      success: true,
      timestamp: new Date(),
    });

    this.markAlertSent(message);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[SNS] Failed to publish alert: ${errorMessage}`);

    this.logDelivery({
      channel: 'sns',
      success: false,
      timestamp: new Date(),
      error: errorMessage,
    });

    throw new Error(`SNS alert failed: ${errorMessage}`);
  }
}
```

**Success Criteria:**
- [ ] AWS SNS SDK integrated
- [ ] Alert publishing to SNS working
- [ ] Message attributes correctly set
- [ ] Error handling implemented

**Rollback Procedure:**
```bash
# Revert to mock implementation
git checkout HEAD -- agentic-flow-core/src/devops/alert-router.ts

# Rebuild
npm run build
```

### 3.3.2 Syslog Sink Integration

Reference: [`agentic-flow-core/src/devops/alert-router.ts`](agentic-flow-core/src/devops/alert-router.ts:318-373)

**Integration Steps:**

**Step 1: Install TLS Client**
```bash
cd agentic-flow-core
npm install tls
```

**Step 2: Implement Real Syslog Sender**

```typescript
// Update sendSyslogMessage method
private async sendSyslogMessage(
  config: NonNullable<AlertRouterConfig['syslogSink']>,
  message: SyslogMessage
): Promise<void> {
  const formattedMessage = this.formatSyslogMessage(message);
  
  return new Promise((resolve, reject) => {
    const socket = config.protocol === 'tls' 
      ? tls.connect({ 
          host: config.host, 
          port: config.port,
          ca: fs.readFileSync(config.tls?.ca_file || ''),
          cert: fs.readFileSync(config.tls?.cert_file || ''),
          key: fs.readFileSync(config.tls?.key_file || ''),
          rejectUnauthorized: config.tls?.reject_unauthorized ?? true,
        })
      : net.connect({ host: config.host, port: config.port });
  
    socket.on('connect', () => {
      socket.write(formattedMessage + '\n', (err) => {
        if (err) {
          reject(err);
        } else {
          socket.end();
          resolve();
        }
      });
    });
    
    socket.on('error', (err) => {
      reject(err);
    });
  });
}
```

**Success Criteria:**
- [ ] TLS client implemented
- [ ] Syslog messages sent to sink
- [ ] RFC 5424 format correct
- [ ] Error handling implemented

**Rollback Procedure:**
```bash
# Revert to mock implementation
git checkout HEAD -- agentic-flow-core/src/devops/alert-router.ts

# Rebuild
npm run build
```

## 3.4 Integration Testing

### 3.4.1 Unit Tests

```bash
cd agentic-flow-core

# Run unit tests for cloud provider selector
npm test -- cloud-provider-selector.test.ts

# Run unit tests for provider drift monitor
npm test -- provider-drift-monitor.test.ts

# Run unit tests for alert router
npm test -- alert-router.test.ts
```

### 3.4.2 Integration Tests

```bash
# Run integration tests with real APIs
npm test -- integration

# Test with staging environment
export NODE_ENV=staging
npm test -- integration
```

**Success Criteria:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Real API calls successful
- [ ] Error handling verified

---

# Part 4: Monitoring Activation

## 4.1 Monitoring Architecture

### 4.1.1 Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Monitoring Architecture                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ Hivelocity       │         │ AWS Lightsail    │         │
│  │ Device 24460     │         │ VPS Instance     │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                            │                    │
│           │ API                        │ API                │
│           ▼                            ▼                    │
│  ┌──────────────────────────────────────────────────┐        │
│  │     Provider Drift Monitor                      │        │
│  │  - Power state checks (60s interval)           │        │
│  │  - Port config checks (300s interval)          │        │
│  │  - IPMI availability (300s interval)           │        │
│  │  - SSH connectivity (60s interval)            │        │
│  │  - TCP port 6514 (30s interval)             │        │
│  └──────────────────┬─────────────────────────────┘        │
│                     │                                       │
│                     │ Events                                │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────┐        │
│  │        Alert Router                           │        │
│  │  - Severity filtering                        │        │
│  │  - Duplicate suppression (5min window)        │        │
│  │  - Escalation rules                         │        │
│  └────────┬─────────────┬─────────────┬────────┘        │
│           │             │             │                  │
│           ▼             ▼             ▼                  │
│  ┌────────────┐ ┌─────────┐ ┌──────────────┐         │
│  │ SNS Topic  │ │Webhooks │ │Syslog Sink   │         │
│  │ (AWS)      │ │(Slack/  │ │(TLS on 6514)│         │
│  │            │ │PagerDuty)│ │             │         │
│  └────────────┘ └─────────┘ └──────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 4.1.2 Health Check Configuration

Reference: [`config/telemetry/offhost-syslog/monitoring/config.yml`](config/telemetry/offhost-syslog/monitoring/config.yml:12-25)

**Hivelocity Health Checks:**
- Power state: 60 seconds interval
- Port configuration: 300 seconds interval
- IPMI availability: 300 seconds interval

**AWS Lightsail Health Checks:**
- SSH connectivity: 60 seconds interval
- TCP port 6514: 30 seconds interval
- HTTPS endpoint: 60 seconds interval

## 4.2 Monitoring Deployment

### 4.2.1 Build and Deploy Monitoring Code

**Commands:**
```bash
# Navigate to project directory
cd agentic-flow-core

# Build TypeScript code
npm run build

# Verify build
ls -la dist/devops/

# Copy monitoring scripts to deployment location
cp dist/devops/provider-drift-monitor.js /usr/local/bin/
cp dist/devops/alert-router.js /usr/local/bin/

# Set executable permissions
chmod +x /usr/local/bin/provider-drift-monitor.js
chmod +x /usr/local/bin/alert-router.js
```

**Success Criteria:**
- [ ] TypeScript compilation successful
- [ ] No build errors or warnings
- [ ] Monitoring scripts deployed
- [ ] Executable permissions set

### 4.2.2 Configure Monitoring Service

**Create systemd service file:**
```bash
# Create service file
cat > /etc/systemd/system/provider-drift-monitor.service << 'EOF'
[Unit]
Description=Provider Drift Monitor
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/usr/local/bin
EnvironmentFile=/etc/provider-drift-monitor.env
ExecStart=/usr/bin/node /usr/local/bin/provider-drift-monitor.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create environment file
cat > /etc/provider-drift-monitor.env << 'EOF'
HIVELOCITY_API_KEY=${HIVELOCITY_API_KEY}
HIVELOCITY_DEVICE_ID=24460
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_REGION=us-east-1
SYSLOG_SINK_HOST=<VPS_IP>
SYSLOG_SINK_PORT=6514
SYSLOG_PROTOCOL=tls
ALERT_MIN_SEVERITY=warning
LOG_LEVEL=info
EOF

# Secure environment file
chmod 600 /etc/provider-drift-monitor.env

# Reload systemd
systemctl daemon-reload

# Enable and start service
systemctl enable provider-drift-monitor.service
systemctl start provider-drift-monitor.service

# Check status
systemctl status provider-drift-monitor.service
```

**Success Criteria:**
- [ ] Systemd service created
- [ ] Environment file configured
- [ ] Service enabled
- [ ] Service running
- [ ] No errors in logs

### 4.2.3 Verify Monitoring

**Commands:**
```bash
# Check service status
systemctl status provider-drift-monitor.service

# Check logs
journalctl -u provider-drift-monitor.service -f

# Verify health checks running
ps aux | grep provider-drift-monitor

# Check for alerts in syslog
tail -f /var/log/syslog/auth.log | grep -E "provider-drift-monitor|alert-router"

# Verify metrics endpoint (if configured)
curl -s http://localhost:9090/metrics | grep -E "health_check|alert"
```

**Success Criteria:**
- [ ] Service running without errors
- [ ] Health checks executing
- [ ] Alerts being generated
- [ ] Logs being written to syslog sink
- [ ] Metrics available (if configured)

## 4.3 Alert Configuration

### 4.3.1 SNS Topic Configuration

**Commands:**
```bash
# Create SNS topic
aws sns create-topic --name provider-drift-alerts --region us-east-1

# Note down TopicArn
export SNS_TOPIC_ARN="arn:aws:sns:us-east-1:123456789012:provider-drift-alerts"

# Subscribe email address
aws sns subscribe \
  --topic-arn $SNS_TOPIC_ARN \
  --protocol email \
  --notification-endpoint admin@example.com \
  --region us-east-1

# Confirm subscription (check email)
```

**Success Criteria:**
- [ ] SNS topic created
- [ ] Email subscription added
- [ ] Subscription confirmed

### 4.3.2 Webhook Configuration

**Slack Webhook:**
```bash
# Create Slack webhook (in Slack UI)
# Settings > Incoming Webhooks > Add New Webhook

# Set environment variable
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"

# Test webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test alert from provider-drift-monitor"}' \
  $SLACK_WEBHOOK_URL
```

**PagerDuty Webhook:**
```bash
# Create PagerDuty webhook (in PagerDuty UI)
# Services > Your Service > Integrations > Add Integration

# Set environment variable
export PAGERDUTY_WEBHOOK_URL="https://events.pagerduty.com/v2/enqueue/XXXXXXXXXXXXXXXX"

# Test webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"routing_key":"XXXXXXXXXXXXXXXX","event_action":"trigger","payload":{"summary":"Test alert","severity":"info"}}' \
  $PAGERDUTY_WEBHOOK_URL
```

**Success Criteria:**
- [ ] Webhook URLs configured
- [ ] Test messages received
- [ ] Alert formatting correct

### 4.3.3 Alert Routing Rules

Reference: [`config/telemetry/offhost-syslog/monitoring/config.yml`](config/telemetry/offhost-syslog/monitoring/config.yml:30-42)

**Configuration:**
- Minimum severity: `warning`
- Duplicate suppression: enabled
- Suppression window: 5 minutes (300000ms)
- Escalation:
  - Warning → Error: 15 minutes
  - Error → Critical: 30 minutes

**Verification:**
```bash
# Test alert generation
curl -X POST http://localhost:9090/test-alert \
  -H 'Content-Type: application/json' \
  -d '{"severity":"warning","source":"test","title":"Test alert"}'

# Verify alert received in Slack/PagerDuty
# Verify alert logged to syslog sink
```

**Success Criteria:**
- [ ] Alerts generated correctly
- [ ] Severity filtering working
- [ ] Duplicate suppression working
- [ ] Escalation rules applied
- [ ] Alerts delivered to all channels

## 4.4 Monitoring Dashboard

### 4.4.1 Dashboard Deployment

Reference: [`config/telemetry/offhost-syslog/monitoring-dashboard.html`](config/telemetry/offhost-syslog/monitoring-dashboard.html)

**Commands:**
```bash
# Copy dashboard to web server
cp config/telemetry/offhost-syslog/monitoring-dashboard.html /var/www/html/

# Configure web server (nginx example)
cat > /etc/nginx/sites-available/monitoring-dashboard << 'EOF'
server {
    listen 80;
    server_name monitoring.example.com;

    root /var/www/html;
    index monitoring-dashboard.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # API endpoint for metrics
    location /api/metrics {
        proxy_pass http://localhost:9090/metrics;
        proxy_set_header Host $host;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/monitoring-dashboard /etc/nginx/sites-enabled/

# Restart nginx
systemctl restart nginx
```

**Success Criteria:**
- [ ] Dashboard accessible
- [ ] Metrics API working
- [ ] Real-time updates
- [ ] Responsive design

### 4.4.2 Dashboard Metrics

**Metrics to Display:**
- Health check status (healthy/degraded/unhealthy)
- Response times
- Alert counts by severity
- Incident timeline
- Provider status (Hivelocity/AWS)

**Success Criteria:**
- [ ] All metrics displayed
- [ ] Real-time updates working
- [ ] Historical data available
- [ ] Export functionality working

## 4.5 Monitoring Verification

### 4.5.1 End-to-End Test

**Commands:**
```bash
# Test health check failure detection
# Stop rsyslog on sink
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m systemd -a "name=rsyslog state=stopped"

# Wait for health check to fail (30-60 seconds)
sleep 60

# Verify alert generated
tail -f /var/log/syslog/auth.log | grep "port.*6514.*unhealthy"

# Verify alert received in Slack/PagerDuty

# Restore rsyslog
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m systemd -a "name=rsyslog state=started"

# Verify recovery alert
tail -f /var/log/syslog/auth.log | grep "port.*6514.*healthy"
```

**Success Criteria:**
- [ ] Failure detected within health check interval
- [ ] Alert generated and routed
- [ ] Alert received in all channels
- [ ] Recovery detected
- [ ] Recovery alert generated

### 4.5.2 Performance Verification

**Commands:**
```bash
# Check monitoring service resource usage
top -p $(pgrep -f provider-drift-monitor)

# Check memory usage
ps aux | grep provider-drift-monitor | awk '{print $6}'

# Check CPU usage
ps aux | grep provider-drift-monitor | awk '{print $3}'

# Verify health check intervals
journalctl -u provider-drift-monitor.service | grep "health check"
```

**Success Criteria:**
- [ ] Memory usage < 100MB
- [ ] CPU usage < 5%
- [ ] Health checks running at configured intervals
- [ ] No memory leaks

---

# Part 5: Operations Handover

## 5.1 Runbook Templates

### 5.1.1 Incident Response Runbook

**Template Location:** `docs/runbooks/incident-response.md`

**Runbook Structure:**

```markdown
# Incident Response Runbook

## Overview
This runbook provides step-by-step procedures for responding to incidents detected by provider drift monitor.

## Incident Severity Levels

| Severity | Description | Response Time | Escalation |
|----------|-------------|----------------|-------------|
| Critical | Service down, data loss imminent | < 15 minutes | Immediate |
| Error | Service degraded, partial outage | < 30 minutes | 15 minutes |
| Warning | Performance degradation, potential issue | < 1 hour | 30 minutes |
| Info | Normal operation, informational only | N/A | N/A |

## Common Incident Scenarios

### Scenario 1: Syslog Sink Unreachable

**Symptoms:**
- Health check: `unhealthy`
- Alert: "TCP port 6514 unreachable"
- Dashboard: Red status for sink

**Diagnosis:**
```bash
# Check rsyslog service
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m shell -a "systemctl status rsyslog"

# Check TLS listener
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m shell -a "ss -tlnp | grep 6514"

# Check firewall
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m shell -a "iptables -L -n | grep 6514"
```

**Resolution:**
```bash
# Restart rsyslog
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m systemd -a "name=rsyslog state=restarted"

# If service fails, re-run playbook
cd config/telemetry/offhost-syslog/ansible
ansible-playbook -i inventory/hosts.ini playbook.yml --tags syslog_sink
```

**Verification:**
```bash
# Test connectivity
nc -zv <VPS_IP> 6514

# Check health status
curl http://localhost:9090/health
```

### Scenario 2: Hivelocity Device Powered Off

**Symptoms:**
- Health check: `unhealthy`
- Alert: "Device power state: off"
- Dashboard: Red status for Hivelocity device

**Diagnosis:**
```bash
# Check power state via API
curl -H "X-API-KEY: $HIVELOCITY_API_KEY" \
  https://core.hivelocity.net/api/v2/device/24460/power

# Check IPMI availability
curl -H "X-API-KEY: $HIVELOCITY_API_KEY" \
  https://core.hivelocity.net/api/v2/device/24460/ipmi
```

**Resolution:**
```bash
# Power on device via API
curl -X POST -H "X-API-KEY: $HIVELOCITY_API_KEY" \
  https://core.hivelocity.net/api/v2/device/24460/power/on

# Monitor boot progress
curl -H "X-API-KEY: $HIVELOCITY_API_KEY" \
  https://core.hivelocity.net/api/v2/device/24460
```

**Verification:**
```bash
# Verify device is running
curl -H "X-API-KEY: $HIVELOCITY_API_KEY" \
  https://core.hivelocity.net/api/v2/device/24460/power

# Check network connectivity
ping 23.92.79.2
```

### Scenario 3: High CPU Usage on VPS

**Symptoms:**
- Health check: `degraded`
- Alert: "High CPU utilization: >90%"
- Dashboard: Yellow status for VPS

**Diagnosis:**
```bash
# Check CPU usage
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m shell -a "top -bn1 | grep 'Cpu(s)'"

# Check top processes
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m shell -a "top -bn1 | head -20"

# Check rsyslog queue
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m shell -a "rsyslogctl queue"
```

**Resolution:**
```bash
# Increase rsyslog queue size
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m lineinfile \
  -a "path=/etc/rsyslog.conf line='$MainMsgQueueSize 200000' state=present"

# Restart rsyslog
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m systemd -a "name=rsyslog state=restarted"

# If issue persists, consider upgrading VPS instance
```

**Verification:**
```bash
# Monitor CPU usage
watch -n 5 "ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m shell -a 'top -bn1 | grep \"Cpu(s)\"'"
```

## Escalation Procedures

### Level 1: On-Call Engineer
- Contact: on-call@corp.interface.tag.ooo
- Response time: < 15 minutes
- Actions: Diagnose, attempt resolution, document

### Level 2: DevOps Team
- Contact: devops@corp.interface.tag.ooo
- Response time: < 30 minutes
- Actions: Escalate if Level 1 cannot resolve, coordinate resources

### Level 3: Management
- Contact: management@corp.interface.tag.ooo
- Response time: < 1 hour
- Actions: Major incident coordination, customer communication

## Post-Incident Actions

1. Update incident timeline in Alert Router
2. Document root cause analysis
3. Implement preventive measures
4. Update runbooks if needed
5. Conduct post-incident review (PIR)

### 5.1.2 Maintenance Runbook

**Template Location:** `docs/runbooks/maintenance.md`

**Runbook Structure:**

```markdown
# Maintenance Runbook

## Overview
This runbook provides procedures for scheduled maintenance of off-host syslog infrastructure.

## Maintenance Windows

| Type | Frequency | Duration | Notification |
|------|-----------|----------|--------------|
| System updates | Monthly | 1-2 hours | 1 week notice |
| Certificate renewal | Yearly | 30 minutes | 1 month notice |
| Log rotation cleanup | Weekly | < 5 minutes | Automated |
| VPS migration | As needed | 2-4 hours | 1 week notice |

## Maintenance Procedures

### Procedure 1: System Updates

**Pre-Maintenance:**
```bash
# Notify stakeholders
# Create maintenance window in monitoring system

# Backup configuration
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m fetch -a "src=/etc/rsyslog.conf dest=/backup/rsyslog.conf.flat"

# Stop monitoring (optional)
systemctl stop provider-drift-monitor.service
```

**Execute Updates:**
```bash
# Update packages
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m apt -a "update_cache=yes upgrade=dist"

# Reboot if required
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m reboot

# Wait for system to come back
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m wait_for_connection -a "delay=30 timeout=300"
```

**Post-Maintenance:**
```bash
# Verify services
ansible syslog_sink -i config/telemetry/offhost-syslog/ansible/inventory/hosts.ini \
  -m systemd -a "name=rsyslog state=started"

# Restart monitoring
systemctl start provider-drift-monitor.service

# Verify log flow
./config/telemetry/offhost-syslog/tests/test-log-ingestion.sh
```

### Procedure 2: Certificate Renewal

**Pre-Maintenance:**
```bash
# Check certificate expiration
openssl x509 -in config/telemetry/offhost-syslog/tls/server.crt -noout -dates

# Backup current certificates
cp config/telemetry/offhost-syslog/tls/*.crt /backup/
cp config/telemetry/offhost-syslog/tls/*.key /backup/

# Stop monitoring
systemctl stop provider-drift-monitor.service
```

**Execute Renewal:**
```bash
# Generate new certificates
cd config/telemetry/offhost-syslog/tls
./generate-server-cert.sh
./generate-client-cert.sh

# Deploy new certificates
cp server.crt server.key ../ansible/roles/syslog-sink/files/
cp client.crt client.key ../ansible/roles/syslog-client/files/

# Re-run playbooks
cd ../ansible
ansible-playbook -i inventory/hosts.ini playbook.yml --tags syslog_sink
ansible-playbook -i inventory/hosts.ini playbook.yml --tags syslog_client
```

**Post-Maintenance:**
```bash
# Verify certificates
openssl verify -CAfile ca.crt server.crt
openssl verify -CAfile ca.crt client.crt

# Restart monitoring
systemctl start provider-drift-monitor.service

# Verify TLS connection
openssl s_client -connect <VPS_IP>:6514 -showcerts
```

### Procedure 3: Log Rotation Cleanup

**Automated Cleanup:**
```bash
# Logrotate is configured to run daily
# Verify logrotate configuration
cat /etc/logrotate.d/syslog-sink

# Manual rotation (if needed)
logrotate -f /etc/logrotate.d/syslog-sink

# Verify cleanup
du -sh /var/log/syslog/*
```

## Maintenance Checklist

- [ ] Maintenance window scheduled
- [ ] Stakeholders notified
- [ ] Backup completed
- [ ] Monitoring paused (if required)
- [ ] Maintenance executed
- [ ] Services verified
- [ ] Monitoring resumed
- [ ] Stakeholders notified of completion
- [ ] Documentation updated

### 5.1.3 Disaster Recovery Runbook

**Template Location:** `docs/runbooks/disaster-recovery.md`

**Runbook Structure:**

```markdown
# Disaster Recovery Runbook

## Overview
This runbook provides procedures for recovering from major failures affecting off-host syslog infrastructure.

## Disaster Scenarios

### Scenario 1: VPS Total Loss

**Symptoms:**
- VPS unreachable
- All health checks failing
- No logs being received

**Recovery Procedure:**
```bash
# Destroy failed VPS
cd config/telemetry/offhost-syslog/terraform
terraform destroy -auto-approve

# Provision new VPS
terraform apply -auto-approve

# Update Ansible inventory
VPS_IP=$(terraform output -raw vps_public_ip)
cd ../ansible
sed -i "s/<VPS_IP>/$VPS_IP/g" inventory/hosts.ini

# Deploy syslog sink
ansible-playbook -i inventory/hosts.ini playbook.yml --tags syslog_sink

# Deploy client configuration
ansible-playbook -i inventory/hosts.ini playbook.yml --tags syslog_client

# Verify deployment
cd ../tests
./verify-all.sh
```

**Recovery Time Objective (RTO):** 30 minutes
**Recovery Point Objective (RPO):** Logs on source server (no data loss)

### Scenario 2: Certificate Compromise

**Symptoms:**
- Security incident detected
- Certificates may be compromised

**Recovery Procedure:**
```bash
# Revoke compromised certificates
# Update CRL (Certificate Revocation List)

# Generate new CA and certificates
cd config/telemetry/offhost-syslog/tls
rm -f ca.key ca.crt server.key server.crt client.key client.crt
./generate-ca.sh
./generate-server-cert.sh
./generate-client-cert.sh

# Deploy new certificates
cp *.crt *.key ../ansible/roles/syslog-sink/files/
cp client.crt client.key ../ansible/roles/syslog-client/files/

# Re-run playbooks
cd ../ansible
ansible-playbook -i inventory/hosts.ini playbook.yml

# Update monitoring configuration
# Update TLS certificates in monitoring service
systemctl restart provider-drift-monitor.service
```

**Recovery Time Objective (RTO):** 1 hour
**Recovery Point Objective (RPO):** N/A (security event)

### Scenario 3: Region-Wide Outage

**Symptoms:**
- AWS region unavailable
- Hivelocity data center down

**Recovery Procedure:**
```bash
# Activate DR site in alternate region
cd config/telemetry/offhost-syslog/terraform

# Update region variable
terraform apply -var="region=us-west-2" -auto-approve

# Update DNS to point to DR site
# Update monitoring configuration
export SYSLOG_SINK_HOST=<DR_VPS_IP>

# Verify DR site is operational
cd ../tests
./verify-all.sh
```

**Recovery Time Objective (RTO):** 2 hours
**Recovery Point Objective (RPO):** Logs on source server (no data loss)

## Backup and Restore

### Backup Locations

| Component | Location | Retention |
|-----------|----------|-----------|
| Terraform state | S3: offhost-syslog-terraform-state | 90 days |
| Ansible inventory | Git repository | Indefinite |
| TLS certificates | Secure backup location | 7 years |
| Configuration files | Git repository | Indefinite |
| Logs | VPS: /var/log/syslog | 30 days |

### Restore Procedures

**Restore Terraform State:**
```bash
# Download state from S3
aws s3 cp s3://offhost-syslog-terraform-state/infrastructure/terraform.tfstate ./

# Import state
terraform import aws_lightsail_instance.syslog_sink <instance_id>
```

**Restore Ansible Inventory:**
```bash
# Checkout previous version
git checkout <commit-hash> config/telemetry/offhost-syslog/ansible/inventory/hosts.ini
```

**Restore TLS Certificates:**
```bash
# Copy from backup
cp /backup/ca.crt /backup/server.crt /backup/server.key \
  config/telemetry/offhost-syslog/tls/

# Verify certificates
openssl verify -CAfile ca.crt server.crt
```

## Post-Disaster Actions

1. Conduct root cause analysis
2. Update disaster recovery plan
3. Implement preventive measures
4. Conduct post-disaster review
5. Update runbooks

## 5.2 On-Call Procedures

### 5.2.1 On-Call Rotation

**Rotation Schedule:**
- Weekly rotation (Monday 00:00 UTC)
- Primary on-call: 24/7 coverage
- Secondary on-call: Backup for primary

**On-Call Responsibilities:**
- Monitor alerts 24/7
- Respond to critical alerts within 15 minutes
- Execute runbooks for incident resolution
- Escalate as needed
- Document all incidents

### 5.2.2 Alert Response Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Alert Response Flow                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Alert Received                                          │
│     ├── PagerDuty/Slack notification                         │
│     ├── SMS/Email notification (if configured)             │
│     └── Dashboard notification                             │
│                                                              │
│  2. Initial Assessment                                      │
│     ├── Acknowledge alert                                    │
│     ├── Review dashboard status                                │
│     ├── Identify severity level                               │
│     └── Determine appropriate runbook                          │
│                                                              │
│  3. Investigation and Resolution                                │
│     ├── Execute diagnostic
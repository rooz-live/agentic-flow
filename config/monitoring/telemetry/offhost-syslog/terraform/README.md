# Terraform Modules - Off-Host Syslog Black Box Recorder

## Overview

This Terraform configuration provisions and manages the infrastructure for the off-host syslog black box recorder, including VPS provisioning, firewall configuration, and security policy enforcement.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Terraform Configuration              │
│  ┌──────────────┐  ┌──────────────┐          │
│  │   VPS Module  │  │  Firewall Module│          │
│  │              │  │              │          │
│  │  AWS Lightsail│  │  UFW/SG Rules│          │
│  │  - Instance   │  │  - Port 22   │          │
│  │  - Static IP  │  │  - Port 6514  │          │
│  │  - Budget     │  │  - Default Deny│          │
│  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Modules

### VPS Module (`modules/vps/`)

Provisions the syslog sink VPS instance.

**Resources:**
- `aws_lightsail_instance` - VPS instance
- `aws_lightsail_static_ip` - Static IP allocation
- `aws_lightsail_static_ip_attachment` - IP attachment
- `aws_budgets_budget` - Monthly budget constraint

**Variables:**

| Variable | Description | Type | Default |
|----------|-------------|------|---------|
| `vps_hostname` | Hostname for the VPS | string | syslog-sink |
| `region` | AWS region | string | us-east-1 |
| `blueprint_id` | AWS Lightsail blueprint ID | string | ubuntu_22_04 |
| `bundle_id` | AWS Lightsail bundle ID | string | nano_2_0 |
| `environment` | Environment tag | string | production |
| `ssh_key_name` | SSH key pair name | string | - |
| `ssh_public_key` | SSH public key content | string | - |
| `budget_limit` | Monthly budget limit (USD) | number | 10 |
| `budget_alert_email` | Budget alert email | string | - |

**Outputs:**

| Output | Description |
|--------|-------------|
| `vps_hostname` | VPS hostname |
| `vps_public_ip` | VPS public IP address |
| `vps_private_ip` | VPS private IP address |
| `vps_static_ip` | VPS static IP address |
| `vps_id` | VPS instance ID |
| `vps_arn` | VPS ARN |
| `vps_ssh_connection` | SSH connection string |

### Firewall Module (`modules/firewall/`)

Configures security rules and firewall policies.

**Resources:**
- `aws_lightsail_instance_public_ports` - Lightsail firewall rules
- `aws_network_acl` - Network ACL (for EC2)
- `aws_security_group` - Security group (for EC2)
- `aws_security_group_rule` - Security group rules (for EC2)

**Variables:**

| Variable | Description | Type | Default |
|----------|-------------|------|---------|
| `instance_name` | VPS instance name | string | - |
| `admin_ip_cidr` | Admin IP CIDR for SSH | string | 173.94.53.113/32 |
| `source_server_ip_cidr` | Source server IP CIDR for syslog | string | 23.92.79.2/32 |
| `syslog_port` | TLS syslog port | number | 6514 |
| `vpc_id` | VPC ID (for EC2) | string | "" |
| `subnet_ids` | Subnet IDs (for EC2) | list(string) | [] |
| `environment` | Environment tag | string | production |
| `use_ec2` | Use EC2 instead of Lightsail | bool | false |

**Outputs:**

| Output | Description |
|--------|-------------|
| `firewall_rules` | Firewall rules applied |
| `security_policy` | Security policy summary |
| `network_acl_id` | Network ACL ID |
| `security_group_id` | Security group ID |
| `allowed_ssh_cidr` | Allowed SSH CIDR blocks |
| `allowed_syslog_cidr` | Allowed syslog CIDR blocks |
| `compliance_status` | Compliance status of firewall configuration |

## Security Policies

The firewall module enforces the following security policies:

1. **No Wildcard on Syslog Port**: Port 6514 must not be open to 0.0.0.0/0
2. **Strict Allowlist**: Only 23.92.79.2/32 can access port 6514
3. **TLS-Only Configuration**: Syslog must use TLS (port 6514), not plaintext (514)
4. **SSH Restricted to Admin**: SSH (port 22) must be restricted to 173.94.53.113/32
5. **Default Deny Inbound**: Default inbound policy must be DENY

## Usage

### Prerequisites

1. **AWS CLI**: Install and configure AWS CLI
   ```bash
   pip install awscli
   aws configure
   ```

2. **Terraform**: Install Terraform 1.5.0 or later
   ```bash
   # macOS
   brew install terraform

   # Linux
   wget https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip
   unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

3. **SSH Key**: Create SSH key pair for VPS access
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/offhost-syslog-key
   ```

### Initial Setup

1. **Initialize Terraform**:
   ```bash
   cd config/telemetry/offhost-syslog/terraform
   terraform init
   ```

2. **Create `terraform.tfvars`**:
   ```hcl
   vps_hostname      = "syslog-sink"
   region            = "us-east-1"
   ssh_key_name      = "offhost-syslog-key"
   ssh_public_key    = file("~/.ssh/offhost-syslog-key.pub")
   budget_limit      = 10
   budget_alert_email = "admin@example.com"
   ```

3. **Plan Infrastructure**:
   ```bash
   terraform plan -out=tfplan
   ```

4. **Apply Infrastructure**:
   ```bash
   terraform apply tfplan
   ```

### Updating Infrastructure

1. **Make Changes**: Modify Terraform files
2. **Plan Changes**: `terraform plan -out=tfplan`
3. **Review Plan**: Review the plan for accuracy
4. **Apply Changes**: `terraform apply tfplan`

### Destroying Infrastructure

⚠️ **WARNING**: This will destroy all resources!

```bash
terraform destroy
```

## Outputs

After applying the Terraform configuration, the following outputs are available:

```bash
terraform output -json
```

Key outputs:
- `vps_public_ip`: Use this to connect to the VPS
- `vps_static_ip`: The static IP assigned to the VPS
- `vps_ssh_connection`: SSH connection string

## Troubleshooting

### Terraform State Lock

If you encounter a state lock error:

```bash
terraform force-unlock <LOCK_ID>
```

### AWS Credentials Issues

If you encounter AWS credential issues:

```bash
# Check current credentials
aws sts get-caller-identity

# Reconfigure credentials
aws configure
```

### Budget Alerts

If you exceed the budget limit:

1. Check the budget alert email
2. Review AWS Cost Explorer
3. Adjust the `budget_limit` variable

## Best Practices

1. **Use Variables**: Always use variables for configurable values
2. **Version Control**: Commit Terraform files to version control
3. **State Management**: Use remote state backend (S3 or Terraform Cloud)
4. **Security**: Never commit sensitive data (SSH keys, passwords)
5. **Documentation**: Document all custom variables and their purposes
6. **Testing**: Always run `terraform plan` before `terraform apply`
7. **Cleanup**: Destroy test resources to avoid unnecessary costs

## Cost Management

The infrastructure is designed to stay within a **$10/month** budget:

- AWS Lightsail nano instance: ~$5/month
- Static IP: ~$3-4/month
- Data transfer: Included in Lightsail pricing
- Total: **~$8-9/month** (within budget)

## Security Considerations

1. **SSH Access**: Only 173.94.53.113/32 can access SSH
2. **Syslog Access**: Only 23.92.79.2/32 can send syslog data
3. **TLS Required**: All syslog traffic must use TLS
4. **Default Deny**: All other inbound traffic is denied
5. **Budget Alerts**: Notifications sent if budget exceeded

## Related Documentation

- [Ansible README](../ansible/README.md) - Ansible configuration
- [CI/CD Documentation](../ci-cd.md) - CI/CD pipeline
- [Main README](../README.md) - Project overview

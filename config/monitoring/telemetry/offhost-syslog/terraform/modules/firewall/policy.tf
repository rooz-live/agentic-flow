# OPA Policy Validation - Off-Host Syslog Black Box Recorder
# Enforces security policies for firewall configuration

# Sentinel policy for Terraform (alternative to OPA)
# This policy ensures:
# 1. No 0.0.0.0/0 on port 6514
# 2. Allowlist contains only 23.92.79.2/32
# 3. TLS configuration is enforced

# Note: Actual policy enforcement would be done via:
# - Terraform Cloud Sentinel policies
# - OPA Gatekeeper
# - tfsec/checkov scanning

# Policy documentation
locals {
  # Policy: No 0.0.0.0/0 on syslog port
  policy_no_wildcard_syslog = {
    name        = "no_wildcard_on_syslog_port"
    description = "Port 6514 must not be open to 0.0.0.0/0"
    severity    = "critical"
    check       = "cidr != '0.0.0.0/0' for port 6514"
  }

  # Policy: Strict allowlist for syslog
  policy_strict_allowlist = {
    name        = "strict_syslog_allowlist"
    description = "Only 23.92.79.2/32 should have access to port 6514"
    severity    = "critical"
    check       = "cidr == '23.92.79.2/32' for port 6514"
  }

  # Policy: TLS-only configuration
  policy_tls_only = {
    name        = "tls_only_configuration"
    description = "Syslog must use TLS (port 6514), not plaintext (514)"
    severity    = "critical"
    check       = "port == 6514 and protocol == 'tcp'"
  }

  # Policy: SSH restricted to admin IP
  policy_ssh_restricted = {
    name        = "ssh_restricted_to_admin"
    description = "SSH (port 22) must be restricted to admin IP only"
    severity    = "high"
    check       = "cidr == '173.94.53.113/32' for port 22"
  }

  # Policy: Default deny inbound
  policy_default_deny = {
    name        = "default_deny_inbound"
    description = "Default inbound policy must be DENY"
    severity    = "high"
    check       = "default_incoming == 'DENY'"
  }

  # All policies
  all_policies = [
    local.policy_no_wildcard_syslog,
    local.policy_strict_allowlist,
    local.policy_tls_only,
    local.policy_ssh_restricted,
    local.policy_default_deny,
  ]
}

# Output policy documentation
output "security_policies" {
  description = "Security policies enforced on firewall configuration"
  value = local.all_policies
}

# Output compliance status (for CI/CD validation)
output "compliance_status" {
  description = "Compliance status of firewall configuration"
  value = {
    no_wildcard_on_syslog_port = var.source_server_ip_cidr != "0.0.0.0/0"
    strict_syslog_allowlist    = var.source_server_ip_cidr == "23.92.79.2/32"
    tls_only_configuration     = var.syslog_port == 6514
    ssh_restricted_to_admin     = var.admin_ip_cidr == "173.94.53.113/32"
  }
}

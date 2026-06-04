# Firewall Module Outputs - Off-Host Syslog Black Box Recorder

output "firewall_rules" {
  description = "Firewall rules applied"
  value = [
    "Allow SSH from ${var.admin_ip_cidr} on port 22",
    "Allow TLS syslog from ${var.source_server_ip_cidr} on port ${var.syslog_port}",
    "Deny all other inbound traffic"
  ]
}

output "security_policy" {
  description = "Security policy summary"
  value = {
    default_incoming  = "DENY"
    default_outgoing = "ALLOW"
    ssh_access       = "${var.admin_ip_cidr} only"
    syslog_access    = "${var.source_server_ip_cidr} only on port ${var.syslog_port}"
    tls_required     = true
    mutual_auth      = true
  }
}

output "network_acl_id" {
  description = "Network ACL ID"
  value       = var.vpc_id != "" ? aws_network_acl.syslog_sink_acl.id : null
}

output "security_group_id" {
  description = "Security group ID (EC2 only)"
  value       = var.use_ec2 ? aws_security_group.syslog_sink_sg[0].id : null
}

output "allowed_ssh_cidr" {
  description = "Allowed SSH CIDR blocks"
  value       = [var.admin_ip_cidr]
}

output "allowed_syslog_cidr" {
  description = "Allowed syslog CIDR blocks"
  value       = [var.source_server_ip_cidr]
}

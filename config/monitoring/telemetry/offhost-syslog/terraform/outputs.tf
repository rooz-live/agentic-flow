# Off-Host Syslog Black Box Recorder - Outputs

# =============================================================================
# Primary Outputs (from lightsail.tf when using Lightsail provider)
# =============================================================================
output "vps_public_ip" {
  description = "VPS public IP address"
  value       = local.lightsail_public_ip != "" ? local.lightsail_public_ip : try(module.vps.vps_public_ip, "")
}

output "vps_hostname" {
  description = "VPS hostname"
  value       = local.lightsail_hostname != "" ? local.lightsail_hostname : try(module.vps.vps_hostname, var.instance_name)
}

output "vps_ssh_connection" {
  description = "SSH connection string for VPS"
  value       = local.lightsail_ssh_command != "" ? local.lightsail_ssh_command : "ssh -i ~/.ssh/${var.instance_name}.pem ubuntu@${local.lightsail_public_ip}"
}

output "vps_static_ip" {
  description = "VPS static IP address"
  value       = var.provider_choice == "lightsail" && length(aws_lightsail_static_ip.syslog_sink) > 0 ? aws_lightsail_static_ip.syslog_sink[0].ip_address : try(module.vps.vps_static_ip, "")
}

output "vps_id" {
  description = "VPS instance ID"
  value       = var.provider_choice == "lightsail" && length(aws_lightsail_instance.syslog_sink) > 0 ? aws_lightsail_instance.syslog_sink[0].id : try(module.vps.vps_id, "")
}


# Legacy Outputs (for backward compatibility)
output "syslog_server_endpoint" {
  description = "Syslog server endpoint"
  value       = "${module.vps.vps_public_ip}:${var.syslog_port}"
}

output "syslog_client_endpoint" {
  description = "Syslog client hostname"
  value       = var.syslog_client
}

output "admin_access_ip" {
  description = "Admin IP for SSH access"
  value       = "${var.admin_ip}/32"
}

output "log_storage_directory" {
  description = "Log storage directory"
  value       = var.log_dir
}

output "certificate_validity" {
  description = "Certificate validity period"
  value = {
    ca    = "${var.ca_validity_days} days"
    cert  = "${var.cert_validity_days} days"
  }
}

output "retention_policy" {
  description = "Log retention policy"
  value = {
    auth_sudo    = "${var.auth_log_retention_days} days"
    system_warn  = "${var.system_warn_retention_days} days"
  }
}

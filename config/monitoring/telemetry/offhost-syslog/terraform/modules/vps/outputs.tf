# VPS Module Outputs - Off-Host Syslog Black Box Recorder

output "vps_hostname" {
  description = "VPS hostname"
  value       = var.vps_hostname
}

output "vps_public_ip" {
  description = "Public IP address of the VPS"
  value       = aws_lightsail_instance.syslog_sink.public_ip_address
}

output "vps_private_ip" {
  description = "Private IP address of the VPS"
  value       = aws_lightsail_instance.syslog_sink.private_ip_address
}

output "vps_static_ip" {
  description = "Static IP address allocated to the VPS"
  value       = aws_lightsail_static_ip.syslog_sink_ip.ip_address
}

output "vps_id" {
  description = "VPS instance ID"
  value       = aws_lightsail_instance.syslog_sink.id
}

output "vps_arn" {
  description = "VPS ARN"
  value       = aws_lightsail_instance.syslog_sink.arn
}

output "vps_availability_zone" {
  description = "VPS availability zone"
  value       = aws_lightsail_instance.syslog_sink.availability_zone
}

output "vps_created_at" {
  description = "VPS creation timestamp"
  value       = aws_lightsail_instance.syslog_sink.created_at
}

output "vps_ssh_connection" {
  description = "SSH connection string"
  value       = "ssh -i ~/.ssh/${var.ssh_key_name}.pem root@${aws_lightsail_static_ip.syslog_sink_ip.ip_address}"
}

output "budget_limit" {
  description = "Monthly budget limit in USD"
  value       = var.budget_limit
}

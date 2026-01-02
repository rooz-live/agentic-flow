output "public_ip_address" {
  value = aws_lightsail_instance.syslog_sink.public_ip_address
}

output "hostname_fqdn" {
  value = "syslog-sink-prod-aws-us-east-1-01.interface.tag.ooo"
}

output "ssh_allowlist" {
  value = var.admin_ssh_cidr
}

output "syslog_allowlist" {
  value = var.syslog_source_cidr
}

output "syslog_tls_port" {
  value = var.syslog_tls_port
}

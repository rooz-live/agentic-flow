# Off-Host Syslog Black Box Recorder - Firewall Configuration
# UFW firewall rules for VPS syslog sink

# Generate firewall rules script
resource "local_file" "firewall_rules" {
  content = templatefile("${path.module}/templates/firewall-rules.sh.tpl", {
    admin_ip       = var.admin_ip
    syslog_client  = var.syslog_client
    syslog_port    = var.syslog_port
  })
  filename = "${path.module}/../ansible/roles/syslog-sink/files/firewall-rules.sh"
  file_permission = "0755"
}

# Firewall rule documentation
output "firewall_rules" {
  description = "UFW firewall rules"
  value = [
    "ufw default deny incoming",
    "ufw default allow outgoing",
    "ufw allow from ${var.admin_ip}/32 to any port 22 proto tcp",
    "ufw allow from ${var.syslog_client} to any port ${var.syslog_port} proto tcp",
    "ufw enable"
  ]
}

output "security_policy" {
  description = "Security policy summary"
  value = {
    default_incoming  = "DENY"
    default_outgoing = "ALLOW"
    ssh_access       = "${var.admin_ip}/32 only"
    syslog_access    = "${var.syslog_client} only on port ${var.syslog_port}"
    tls_required     = true
    mutual_auth      = true
  }
}

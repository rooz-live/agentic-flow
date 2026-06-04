# Hetzner CX22 Standalone Deployment for Off-Host Syslog
# This file deploys ONLY the Hetzner resources, bypassing AWS modules
#
# Cost: €4.49/month (~$5) - 55% under $10 budget
# Specs: 2 vCPU, 4GB RAM, 40GB SSD, Ubuntu 22.04

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------
variable "hcloud_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key for server access"
  type        = string
  sensitive   = true
}

variable "admin_ip" {
  description = "Admin IP for SSH access"
  type        = string
  default     = "173.94.53.113"
}

variable "starlingx_ip" {
  description = "StarlingX IP for syslog TLS access"
  type        = string
  default     = "23.92.79.2"
}

variable "server_name" {
  description = "Server name"
  type        = string
  default     = "syslog-sink"
}

variable "location" {
  description = "Hetzner location"
  type        = string
  default     = "fsn1"  # Falkenstein, Germany
}

# -----------------------------------------------------------------------------
# Provider Configuration
# -----------------------------------------------------------------------------
provider "hcloud" {
  token = var.hcloud_token
}

# -----------------------------------------------------------------------------
# SSH Key
# -----------------------------------------------------------------------------
resource "hcloud_ssh_key" "syslog_admin" {
  name       = "${var.server_name}-key"
  public_key = var.ssh_public_key

  labels = {
    purpose = "syslog-sink"
    managed = "terraform"
  }
}

# -----------------------------------------------------------------------------
# Firewall - Strict security rules
# -----------------------------------------------------------------------------
resource "hcloud_firewall" "syslog_sink" {
  name = "${var.server_name}-fw"

  # SSH from admin only
  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "22"
    source_ips  = ["${var.admin_ip}/32"]
    description = "SSH from admin workstation"
  }

  # Syslog TLS from StarlingX only
  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "6514"
    source_ips  = ["${var.starlingx_ip}/32"]
    description = "Syslog TLS from stx-aio-0"
  }

  # ICMP for diagnostics
  rule {
    direction   = "in"
    protocol    = "icmp"
    source_ips  = ["${var.admin_ip}/32", "${var.starlingx_ip}/32"]
    description = "ICMP diagnostics"
  }

  labels = {
    purpose = "syslog-sink"
    managed = "terraform"
  }
}

# -----------------------------------------------------------------------------
# Server - CX22: 2 vCPU, 4GB RAM, 40GB SSD
# -----------------------------------------------------------------------------
resource "hcloud_server" "syslog_sink" {
  name        = var.server_name
  server_type = "cx22"
  image       = "ubuntu-22.04"
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.syslog_admin.id]
  firewall_ids = [hcloud_firewall.syslog_sink.id]

  user_data = <<-EOF
    #!/bin/bash
    set -e
    
    # System update
    apt-get update
    apt-get upgrade -y
    
    # Install rsyslog with TLS support
    apt-get install -y rsyslog rsyslog-gnutls ufw logrotate
    
    # Configure UFW (backup firewall)
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow from ${var.admin_ip}/32 to any port 22 proto tcp
    ufw allow from ${var.starlingx_ip}/32 to any port 6514 proto tcp
    ufw --force enable
    
    # Create log directories
    mkdir -p /var/log/remote/stx-aio-0/{auth,system}
    chmod 750 /var/log/remote
    chown syslog:adm /var/log/remote -R
    
    # Create TLS directory
    mkdir -p /etc/rsyslog.d/tls
    chmod 700 /etc/rsyslog.d/tls
    
    # Signal completion
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Cloud-init complete" > /var/log/cloud-init-complete
  EOF

  labels = {
    purpose     = "syslog-sink"
    environment = "production"
    budget      = "5EUR-monthly"
    managed     = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "server_ip" {
  description = "Syslog sink public IPv4 address"
  value       = hcloud_server.syslog_sink.ipv4_address
}

output "server_ipv6" {
  description = "Syslog sink public IPv6 address"
  value       = hcloud_server.syslog_sink.ipv6_address
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = "ssh root@${hcloud_server.syslog_sink.ipv4_address}"
}

output "server_status" {
  description = "Server status"
  value       = hcloud_server.syslog_sink.status
}

output "monthly_cost" {
  description = "Estimated monthly cost"
  value       = "€4.49 (~$5 USD)"
}

output "next_steps" {
  description = "Post-provisioning steps"
  value       = <<-EOT
    1. Wait for cloud-init to complete: ssh root@${hcloud_server.syslog_sink.ipv4_address} 'cat /var/log/cloud-init-complete'
    2. Generate TLS certificates with internal CA
    3. Deploy rsyslog sink configuration via Ansible
    4. Configure stx-aio-0 log forwarding
    5. Verify end-to-end logging
  EOT
}

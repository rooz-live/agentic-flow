# Off-Host Syslog Black Box Recorder - Hetzner Cloud Resources
# Provider: Hetzner CX22 (€4.49/month - Best value option)
#
# Selection Rationale:
# - Best price-to-performance: €4.49 for 2 vCPU, 4GB RAM, 40GB SSD
# - 4x RAM compared to alternatives (helpful for log buffering)
# - 55% under $10/month budget

# Note: required_providers is consolidated in versions.tf to avoid duplication

# -----------------------------------------------------------------------------
# Provider Configuration
# -----------------------------------------------------------------------------
provider "hcloud" {
  token = var.hcloud_token
}

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------
variable "hcloud_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}

variable "ssh_public_key_hetzner" {
  description = "SSH public key for server access"
  type        = string
  sensitive   = true
  default     = ""
}

variable "admin_ip_hetzner" {
  description = "Admin IP for SSH access (CIDR)"
  type        = string
  default     = "173.94.53.113"
}

variable "starlingx_ip_hetzner" {
  description = "StarlingX IP for syslog access"
  type        = string
  default     = "23.92.79.2"
}

variable "hetzner_location" {
  description = "Hetzner datacenter location (fsn1, nbg1, hel1, ash)"
  type        = string
  default     = "fsn1"  # Falkenstein, Germany - best latency to EU
}

variable "hetzner_server_type" {
  description = "Hetzner server type"
  type        = string
  default     = "cx22"  # 2 vCPU, 4GB RAM, 40GB SSD - €4.49/month
}

variable "hetzner_image" {
  description = "Hetzner OS image"
  type        = string
  default     = "ubuntu-22.04"
}

variable "hetzner_instance_name" {
  description = "Name for the Hetzner server"
  type        = string
  default     = "syslog-sink"
}

# -----------------------------------------------------------------------------
# SSH Key
# -----------------------------------------------------------------------------
resource "hcloud_ssh_key" "admin" {
  count = var.provider_choice == "hetzner" ? 1 : 0

  name       = "${var.hetzner_instance_name}-admin-key"
  public_key = var.ssh_public_key_hetzner != "" ? var.ssh_public_key_hetzner : var.ssh_public_key

  labels = {
    managed = "terraform"
    purpose = "syslog-sink"
  }
}

# -----------------------------------------------------------------------------
# Firewall
# Security: Only allows SSH from admin IP and syslog from StarlingX
# -----------------------------------------------------------------------------
resource "hcloud_firewall" "syslog_sink" {
  count = var.provider_choice == "hetzner" ? 1 : 0

  name = "${var.hetzner_instance_name}-fw"

  # SSH from admin only (173.94.53.113/32)
  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "22"
    source_ips  = ["${var.admin_ip_hetzner}/32"]
    description = "SSH access from admin workstation only"
  }

  # Syslog TLS from StarlingX only (23.92.79.2/32)
  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "6514"
    source_ips  = ["${var.starlingx_ip_hetzner}/32"]
    description = "Syslog TLS from stx-aio-0 only"
  }

  # ICMP for diagnostics from both IPs
  rule {
    direction   = "in"
    protocol    = "icmp"
    source_ips  = ["${var.admin_ip_hetzner}/32", "${var.starlingx_ip_hetzner}/32"]
    description = "ICMP for network diagnostics"
  }

  labels = {
    managed = "terraform"
    purpose = "syslog-sink"
  }
}

# -----------------------------------------------------------------------------
# Server
# CX22: 2 vCPU, 4GB RAM, 40GB SSD - €4.49/month
# -----------------------------------------------------------------------------
resource "hcloud_server" "syslog_sink" {
  count = var.provider_choice == "hetzner" ? 1 : 0

  name        = var.hetzner_instance_name
  server_type = var.hetzner_server_type
  image       = var.hetzner_image
  location    = var.hetzner_location
  ssh_keys    = [hcloud_ssh_key.admin[0].id]
  firewall_ids = [hcloud_firewall.syslog_sink[0].id]

  # User data for initial setup
  user_data = <<-EOF
    #!/bin/bash
    set -e
    
    # Update system
    apt-get update
    apt-get upgrade -y
    
    # Install required packages
    apt-get install -y rsyslog rsyslog-gnutls ufw
    
    # Configure UFW firewall (backup to Hetzner firewall)
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow from ${var.admin_ip_hetzner}/32 to any port 22 proto tcp
    ufw allow from ${var.starlingx_ip_hetzner}/32 to any port 6514 proto tcp
    ufw --force enable
    
    # Create log directories
    mkdir -p /var/log/remote/stx-aio-0
    chmod 750 /var/log/remote
    
    # Signal completion
    touch /var/log/cloud-init-complete
  EOF

  labels = {
    managed     = "terraform"
    purpose     = "syslog-sink"
    environment = var.environment
    budget      = "5EUR-monthly"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
locals {
  hetzner_public_ip = var.provider_choice == "hetzner" && length(hcloud_server.syslog_sink) > 0 ? (
    hcloud_server.syslog_sink[0].ipv4_address
  ) : ""

  hetzner_ipv6 = var.provider_choice == "hetzner" && length(hcloud_server.syslog_sink) > 0 ? (
    hcloud_server.syslog_sink[0].ipv6_address
  ) : ""

  hetzner_hostname = var.provider_choice == "hetzner" && length(hcloud_server.syslog_sink) > 0 ? (
    hcloud_server.syslog_sink[0].name
  ) : ""

  hetzner_ssh_command = var.provider_choice == "hetzner" && local.hetzner_public_ip != "" ? (
    "ssh root@${local.hetzner_public_ip}"
  ) : ""
}

output "hetzner_server_ipv4" {
  description = "Hetzner server public IPv4 address"
  value       = local.hetzner_public_ip
}

output "hetzner_server_ipv6" {
  description = "Hetzner server public IPv6 address"
  value       = local.hetzner_ipv6
}

output "hetzner_server_hostname" {
  description = "Hetzner server hostname"
  value       = local.hetzner_hostname
}

output "hetzner_ssh_command" {
  description = "SSH command to connect to Hetzner server"
  value       = local.hetzner_ssh_command
}

output "hetzner_monthly_cost" {
  description = "Estimated monthly cost for Hetzner CX22"
  value       = "€4.49 (~$5)"
}

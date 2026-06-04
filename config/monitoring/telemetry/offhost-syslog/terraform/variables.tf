# Off-Host Syslog Black Box Recorder - Variables

# Provider Selection
variable "provider_choice" {
  description = "Cloud provider: 'lightsail', 'hivelocity', or 'hetzner'"
  type        = string
  default     = "hetzner"  # Changed to Hetzner - best value option

  validation {
    condition     = contains(["lightsail", "hivelocity", "hetzner"], var.provider_choice)
    error_message = "Provider choice must be 'lightsail', 'hivelocity', or 'hetzner'."
  }
}

# Network Security Variables
variable "admin_ssh_cidr" {
  description = "SSH allowlist CIDR"
  type        = string
  default     = "173.94.53.113/32"

  validation {
    condition     = can(cidrhost(var.admin_ssh_cidr, 0))
    error_message = "admin_ssh_cidr must be a valid CIDR block."
  }
}

variable "starlingx_ip" {
  description = "StarlingX server IP for syslog allowlist"
  type        = string
  default     = "23.92.79.2"

  validation {
    condition     = can(regex("^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$", var.starlingx_ip))
    error_message = "starlingx_ip must be a valid IPv4 address."
  }
}

variable "instance_name" {
  description = "VPS instance name"
  type        = string
  default     = "syslog-sink"
}

# SSH Configuration
variable "ssh_public_key" {
  description = "SSH public key content for VPS access"
  type        = string
  sensitive   = true
  default     = ""
}

# Budget Configuration
variable "budget_limit" {
  description = "Monthly budget limit in USD"
  type        = number
  default     = 10
}

variable "budget_alert_email" {
  description = "Email address for budget alerts"
  type        = string
  default     = "admin@example.com"
}

# VPS Configuration Variables (Legacy - maintained for backward compatibility)
variable "vps_hostname" {
  description = "Hostname for the VPS syslog sink (deprecated: use instance_name)"
  type        = string
  default     = "syslog-sink"
}

variable "region" {
  description = "AWS region for Lightsail instance"
  type        = string
  default     = "us-east-1"
}

variable "blueprint_id" {
  description = "AWS Lightsail blueprint ID (Ubuntu 22.04 LTS)"
  type        = string
  default     = "ubuntu_22_04"
}

variable "bundle_id" {
  description = "AWS Lightsail bundle ID (1 vCPU, 1GB RAM, 40GB SSD)"
  type        = string
  default     = "nano_2_0"
}

variable "environment" {
  description = "Environment tag (production, staging, development)"
  type        = string
  default     = "production"
}

variable "ssh_key_name" {
  description = "Name of the SSH key pair to use"
  type        = string
  default     = "offhost-syslog-key"
}

# Network Configuration Variables
variable "admin_ip_cidr" {
  description = "Admin IP CIDR block for SSH access"
  type        = string
  default     = "173.94.53.113/32"
}

variable "source_server_ip_cidr" {
  description = "Source server IP CIDR block for syslog access"
  type        = string
  default     = "23.92.79.2/32"
}

variable "vpc_id" {
  description = "VPC ID for network ACL and security groups"
  type        = string
  default     = ""
}

variable "subnet_ids" {
  description = "List of subnet IDs for network ACL"
  type        = list(string)
  default     = []
}

variable "use_ec2" {
  description = "Use EC2 instead of Lightsail (requires VPC)"
  type        = bool
  default     = false
}

# Legacy Configuration Variables (for backward compatibility)
variable "syslog_server" {
  description = "VPS syslog sink IP address (deprecated, use module output)"
  type        = string
  default     = ""
}

variable "syslog_client" {
  description = "StarlingX server hostname"
  type        = string
  default     = "stx-aio-0.corp.interface.tag.ooo"
}

variable "syslog_port" {
  description = "TLS syslog port"
  type        = number
  default     = 6514
}

variable "admin_ip" {
  description = "Admin IP for SSH access (deprecated, use admin_ip_cidr)"
  type        = string
  default     = "173.94.53.113"
}

variable "log_dir" {
  description = "Log storage directory"
  type        = string
  default     = "/var/log/syslog"
}

variable "ca_validity_days" {
  description = "CA certificate validity period in days"
  type        = number
  default     = 3650
}

variable "cert_validity_days" {
  description = "Server/client certificate validity period in days"
  type        = number
  default     = 365
}

variable "auth_log_retention_days" {
  description = "Auth/sudo log retention period in days"
  type        = number
  default     = 30
}

variable "system_warn_retention_days" {
  description = "System warning log retention period in days"
  type        = number
  default     = 7
}

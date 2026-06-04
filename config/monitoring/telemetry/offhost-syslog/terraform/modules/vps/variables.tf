# VPS Module Variables - Off-Host Syslog Black Box Recorder

variable "vps_hostname" {
  description = "Hostname for the VPS syslog sink"
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
}

variable "ssh_public_key" {
  description = "SSH public key content (for Hivelocity)"
  type        = string
  sensitive   = true
}

variable "budget_limit" {
  description = "Monthly budget limit in USD"
  type        = number
  default     = 10
}

variable "budget_alert_email" {
  description = "Email address for budget alerts"
  type        = string
}

# Hivelocity specific variables (alternative provider)
variable "os_image_id" {
  description = "Hivelocity OS image ID"
  type        = string
  default     = "ubuntu-22-04"
}

variable "location_code" {
  description = "Hivelocity datacenter location code"
  type        = string
  default     = "LAS1"
}

variable "plan_code" {
  description = "Hivelocity plan code (1 vCPU, 1GB RAM, 25GB disk)"
  type        = string
  default     = "c1.small.x1"
}

# Firewall Module Variables - Off-Host Syslog Black Box Recorder

variable "instance_name" {
  description = "Name of the VPS instance"
  type        = string
}

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

variable "syslog_port" {
  description = "TLS syslog port"
  type        = number
  default     = 6514
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

variable "environment" {
  description = "Environment tag"
  type        = string
  default     = "production"
}

variable "use_ec2" {
  description = "Use EC2 instead of Lightsail (requires VPC)"
  type        = bool
  default     = false
}

variable "region" {
  type    = strin
  default = "us-east-1"
}

variable "availability_zone" {
  type    = string
  default = "us-east-1a"
}

variable "hostname" {
  type    = string
  default = "syslog-sink-prod-aws-us-east-1-01"
}

variable "admin_ip" {
  description = "CIDR block for admin SSH access"
  type        = string
  default     = "173.94.53.113/32"
}

variable "stx_server_ip" {
  description = "CIDR block for StarlingX server syslog access"
  type        = string
  default     = "23.92.79.2/32"
}

variable "key_pair_name" {
  description = "Name of the SSH key pair to use"
  type        = string
}

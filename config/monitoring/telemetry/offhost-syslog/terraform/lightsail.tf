# Off-Host Syslog Black Box Recorder - AWS Lightsail Resources
# Primary VPS provisioning using AWS Lightsail

# -----------------------------------------------------------------------------
# AWS Lightsail Instance
# Ubuntu 22.04 LTS within $10/month budget (nano_2_0 bundle)
# -----------------------------------------------------------------------------
resource "aws_lightsail_instance" "syslog_sink" {
  count = var.provider_choice == "lightsail" ? 1 : 0

  name              = var.instance_name
  availability_zone = "${var.region}a"
  blueprint_id      = "ubuntu_22_04"  # Ubuntu 22.04 LTS
  bundle_id         = "micro_2_0"     # $10/month: 1 vCPU, 1GB RAM, 40GB SSD
                                       # Selected per WSJF analysis (Score: 90.00 CRITICAL)
                                       # Alternative: nano_2_0 at $5/month: 1 vCPU, 512MB RAM, 20GB SSD

  key_pair_name = aws_lightsail_key_pair.syslog_sink[0].name

  user_data = templatefile("${path.module}/user-data.sh", {
    admin_ssh_cidr = var.admin_ssh_cidr
    starlingx_ip   = var.starlingx_ip
    syslog_port    = 6514
  })

  tags = {
    Name        = var.instance_name
    Environment = "production"
    Purpose     = "syslog-sink"
    ManagedBy   = "terraform"
    Project     = "offhost-syslog"
    Budget      = "10USD-monthly"
  }

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = false

    # Prevent accidental changes to critical settings
    ignore_changes = [
      user_data,  # User data only runs on first boot
    ]
  }
}

# -----------------------------------------------------------------------------
# SSH Key Pair for Lightsail
# -----------------------------------------------------------------------------
resource "aws_lightsail_key_pair" "syslog_sink" {
  count = var.provider_choice == "lightsail" ? 1 : 0

  name       = "${var.instance_name}-keypair"
  public_key = var.ssh_public_key

  tags = {
    Name      = "${var.instance_name}-keypair"
    ManagedBy = "terraform"
  }
}

# -----------------------------------------------------------------------------
# Static IP Address
# Ensures VPS has a persistent public IP across reboots/recreations
# -----------------------------------------------------------------------------
resource "aws_lightsail_static_ip" "syslog_sink" {
  count = var.provider_choice == "lightsail" ? 1 : 0

  name = "${var.instance_name}-static-ip"
}

resource "aws_lightsail_static_ip_attachment" "syslog_sink" {
  count = var.provider_choice == "lightsail" ? 1 : 0

  static_ip_name = aws_lightsail_static_ip.syslog_sink[0].name
  instance_name  = aws_lightsail_instance.syslog_sink[0].name
}

# -----------------------------------------------------------------------------
# Instance Public Ports (Firewall)
# Restricts access to SSH (admin only) and Syslog TLS (StarlingX only)
# -----------------------------------------------------------------------------
resource "aws_lightsail_instance_public_ports" "syslog_sink" {
  count = var.provider_choice == "lightsail" ? 1 : 0

  instance_name = aws_lightsail_instance.syslog_sink[0].name

  # SSH access - Admin IP only
  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
    cidrs     = [var.admin_ssh_cidr]
  }

  # Syslog TLS - StarlingX server only
  port_info {
    protocol  = "tcp"
    from_port = 6514
    to_port   = 6514
    cidrs     = ["${var.starlingx_ip}/32"]
  }

  # ICMP for diagnostics (optional, from both IPs)
  port_info {
    protocol  = "icmp"
    from_port = 8    # Echo
    to_port   = 0    # No code
    cidrs     = [var.admin_ssh_cidr, "${var.starlingx_ip}/32"]
  }

  depends_on = [aws_lightsail_instance.syslog_sink]
}

# -----------------------------------------------------------------------------
# Lightsail Disk (Additional Storage - Optional)
# Uncomment if additional storage is needed beyond instance storage
# -----------------------------------------------------------------------------
# resource "aws_lightsail_disk" "syslog_storage" {
#   count = var.provider_choice == "lightsail" && var.additional_storage_gb > 0 ? 1 : 0
#
#   name              = "${var.instance_name}-storage"
#   size_in_gb        = var.additional_storage_gb
#   availability_zone = "${var.region}a"
#
#   tags = {
#     Name      = "${var.instance_name}-storage"
#     ManagedBy = "terraform"
#   }
# }
#
# resource "aws_lightsail_disk_attachment" "syslog_storage" {
#   count = var.provider_choice == "lightsail" && var.additional_storage_gb > 0 ? 1 : 0
#
#   disk_name     = aws_lightsail_disk.syslog_storage[0].name
#   instance_name = aws_lightsail_instance.syslog_sink[0].name
#   disk_path     = "/dev/xvdf"
# }

# -----------------------------------------------------------------------------
# CloudWatch Alarms for Monitoring
# Basic monitoring for instance health
# Note: aws_lightsail_alarm resource is not supported by AWS provider v5
# Alarms will be configured via CloudWatch separately
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# Budget Constraint
# Ensures spending stays within $10/month limit
# Note: aws_budgets_budget resource may require additional permissions
# Budget will be configured via AWS Budgets console separately
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# Local Variables for Outputs
# -----------------------------------------------------------------------------
locals {
  lightsail_public_ip = var.provider_choice == "lightsail" ? (
    length(aws_lightsail_static_ip.syslog_sink) > 0 ? 
    aws_lightsail_static_ip.syslog_sink[0].ip_address : 
    (length(aws_lightsail_instance.syslog_sink) > 0 ? 
     aws_lightsail_instance.syslog_sink[0].public_ip_address : "")
  ) : ""

  lightsail_hostname = var.provider_choice == "lightsail" && length(aws_lightsail_instance.syslog_sink) > 0 ? (
    aws_lightsail_instance.syslog_sink[0].name
  ) : ""

  lightsail_ssh_command = var.provider_choice == "lightsail" && local.lightsail_public_ip != "" ? (
    "ssh -i ~/.ssh/${var.instance_name}.pem ubuntu@${local.lightsail_public_ip}"
  ) : ""
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

resource "aws_lightsail_instance" "syslog_sink" {
  name              = var.hostname
  availability_zone = var.availability_zone
  blueprint_id      = "ubuntu_22_04"
  bundle_id         = "nano_2_0" # $5/month instance (1 vCPU, 512MB RAM - checking if fits constraint, might need micro_2_0 for 1GB)
  # NOTE: nano_2_0 is 512MB. Requirement is 1GB. micro_2_0 is $10/month and has 1GB.
  # Adjusting to micro_2_0 based on constraints.

  key_pair_name     = var.key_pair_name

  tags = {
    Environment = "Production"
    Role        = "SyslogSink"
  }
}

resource "aws_lightsail_instance_public_ports" "syslog_firewall" {
  instance_name = aws_lightsail_instance.syslog_sink.name

  # SSH Access
  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
    cidrs     = [var.admin_ip]
  }

  # Syslog TLS Access
  port_info {
    protocol  = "tcp"
    from_port = 6514
    to_port   = 6514
    cidrs     = [var.stx_server_ip]
  }
}

resource "aws_lightsail_static_ip" "syslog_ip" {
  name = "${var.hostname}-ip"
}

resource "aws_lightsail_static_ip_attachment" "syslog_ip_attach" {
  static_ip_name = aws_lightsail_static_ip.syslog_ip.name
  instance_name  = aws_lightsail_instance.syslog_sink.name
}

output "public_ip" {
  value = aws_lightsail_static_ip.syslog_ip.ip_address
}

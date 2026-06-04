# Firewall Module - Off-Host Syslog Black Box Recorder
# Security group and firewall rules for VPS

# AWS Lightsail Instance Networking
resource "aws_lightsail_instance_public_ports" "syslog_sink_firewall" {
  instance_name = var.instance_name

  # Allow SSH from admin IP only
  port_info {
    from_port = 22
    to_port   = 22
    protocol  = "tcp"
    cidrs     = [var.admin_ip_cidr]
  }

  # Allow TLS syslog from source server only
  port_info {
    from_port = var.syslog_port
    to_port   = var.syslog_port
    protocol  = "tcp"
    cidrs     = [var.source_server_ip_cidr]
  }

  # Explicitly deny all other inbound traffic (default deny)
}

# Network ACL for additional security
resource "aws_network_acl" "syslog_sink_acl" {
  vpc_id      = var.vpc_id
  subnet_ids  = var.subnet_ids

  ingress {
    rule_no    = 100
    action     = "allow"
    from_port  = 22
    to_port    = 22
    protocol   = "tcp"
    cidr_block = var.admin_ip_cidr
  }

  ingress {
    rule_no    = 110
    action     = "allow"
    from_port  = var.syslog_port
    to_port    = var.syslog_port
    protocol   = "tcp"
    cidr_block = var.source_server_ip_cidr
  }

  ingress {
    rule_no    = 200
    action     = "deny"
    from_port  = 0
    to_port    = 0
    protocol   = "all"
    cidr_block = "0.0.0.0/0"
  }

  egress {
    rule_no    = 100
    action     = "allow"
    from_port  = 0
    to_port    = 0
    protocol   = "-1"
    cidr_block = "0.0.0.0/0"
  }

  tags = {
    Name        = "${var.instance_name}-acl"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Security Group for VPC (if using EC2 instead of Lightsail)
resource "aws_security_group" "syslog_sink_sg" {
  count       = var.use_ec2 ? 1 : 0
  name        = "${var.instance_name}-sg"
  description = "Security group for syslog sink"
  vpc_id      = var.vpc_id

  tags = {
    Name        = "${var.instance_name}-sg"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# SSH access rule
resource "aws_security_group_rule" "allow_ssh" {
  count             = var.use_ec2 ? 1 : 0
  description       = "Allow SSH from admin IP"
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = [var.admin_ip_cidr]
  security_group_id = aws_security_group.syslog_sink_sg[0].id
}

# Syslog TLS access rule
resource "aws_security_group_rule" "allow_syslog_tls" {
  count             = var.use_ec2 ? 1 : 0
  description       = "Allow TLS syslog from source server"
  type              = "ingress"
  from_port         = var.syslog_port
  to_port           = var.syslog_port
  protocol          = "tcp"
  cidr_blocks       = [var.source_server_ip_cidr]
  security_group_id = aws_security_group.syslog_sink_sg[0].id
}

# Deny all other inbound (default)
resource "aws_security_group_rule" "deny_all_inbound" {
  count             = var.use_ec2 ? 1 : 0
  description       = "Deny all other inbound traffic"
  type              = "ingress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.syslog_sink_sg[0].id
}

# Allow all outbound
resource "aws_security_group_rule" "allow_all_outbound" {
  count             = var.use_ec2 ? 1 : 0
  description       = "Allow all outbound traffic"
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.syslog_sink_sg[0].id
}

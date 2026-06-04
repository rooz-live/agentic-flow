# Off-Host Syslog Black Box Recorder - Main Terraform Configuration
# Provider: AWS Lightsail / Hetzner / Hivelocity for VPS provisioning

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }

  # Using local backend for initial deployment
  # Uncomment S3 backend after state bucket is created
  # backend "s3" {
  #   bucket         = "offhost-syslog-terraform-state"
  #   key            = "offhost-syslog/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "offhost-syslog-terraform-locks"
  # }

  # Alternative: Terraform Cloud backend
  # backend "remote" {
  #   organization = "your-org"
  #   workspaces {
  #     name = "offhost-syslog"
  #   }
  # }
}

# AWS Provider Configuration
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "offhost-syslog"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Hivelocity Provider (alternative, commented out)
# provider "hivelocity" {
#   api_key = var.hivelocity_api_key
# }

# VPS Module - Provisions the syslog sink VPS
module "vps" {
  source = "./modules/vps"

  vps_hostname      = var.vps_hostname
  region            = var.region
  blueprint_id      = var.blueprint_id
  bundle_id         = var.bundle_id
  environment       = var.environment
  ssh_key_name      = var.ssh_key_name
  ssh_public_key    = var.ssh_public_key
  budget_limit      = var.budget_limit
  budget_alert_email = var.budget_alert_email
}

# Firewall Module - Configures security rules
module "firewall" {
  source = "./modules/firewall"

  instance_name          = module.vps.vps_hostname
  admin_ip_cidr          = var.admin_ip_cidr
  source_server_ip_cidr  = var.source_server_ip_cidr
  syslog_port            = var.syslog_port
  vpc_id                 = var.vpc_id
  subnet_ids             = var.subnet_ids
  environment            = var.environment
  use_ec2                = var.use_ec2
}

# Local resources for configuration management
resource "local_file" "syslog_sink_config" {
  content = templatefile("${path.module}/templates/rsyslog-server.conf.tpl", {
    syslog_port = var.syslog_port
    log_dir     = var.log_dir
  })
  filename = "${path.module}/../ansible/roles/syslog-sink/templates/rsyslog-server.conf"
}

resource "local_file" "syslog_client_config" {
  content = templatefile("${path.module}/templates/rsyslog-client.conf.tpl", {
    syslog_server = var.syslog_server
    syslog_port   = var.syslog_port
  })
  filename = "${path.module}/../ansible/roles/syslog-client/templates/rsyslog-client.conf"
}

resource "local_file" "logrotate_config" {
  content = templatefile("${path.module}/templates/logrotate.conf.tpl", {
    log_dir = var.log_dir
  })
  filename = "${path.module}/../ansible/roles/syslog-sink/templates/logrotate-syslog"
}

resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/templates/inventory.tpl", {
    syslog_server = var.syslog_server
    syslog_client = var.syslog_client
    admin_ip       = var.admin_ip
  })
  filename = "${path.module}/../ansible/inventory/hosts.ini"
}

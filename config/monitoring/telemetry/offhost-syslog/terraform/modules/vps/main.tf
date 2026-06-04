# VPS Module - Off-Host Syslog Black Box Recorder
# Provisions VPS instance for syslog sink

# Cloud Provider Selector - AWS Lightsail
resource "aws_lightsail_instance" "syslog_sink" {
  name              = var.vps_hostname
  availability_zone = "${var.region}a"
  blueprint_id      = var.blueprint_id
  bundle_id         = var.bundle_id
  user_data         = file("${path.module}/templates/user-data.sh")

  tags = {
    Name        = var.vps_hostname
    Environment = var.environment
    Purpose     = "syslog-sink"
    ManagedBy   = "terraform"
  }

  # SSH key configuration
  key_pair_name = var.ssh_key_name
}

# Static IP resource
resource "aws_lightsail_static_ip" "syslog_sink_ip" {
  name = "${var.vps_hostname}-static-ip"
}

# Attach static IP to instance
resource "aws_lightsail_static_ip_attachment" "syslog_sink_attach" {
  static_ip_name = aws_lightsail_static_ip.syslog_sink_ip.id
  instance_name  = aws_lightsail_instance.syslog_sink.name
}

# Cloud Provider Selector - Hivelocity (commented out, alternative provider)
# resource "hivelocity_bare_metal" "syslog_sink" {
#   hostname      = var.vps_hostname
#   os_image_id   = var.os_image_id
#   location_code = var.location_code
#   plan_code     = var.plan_code
#   ssh_keys      = [var.ssh_public_key]
# }

# Budget constraint notification
resource "aws_budgets_budget" "monthly_vps_budget" {
  name              = "${var.vps_hostname}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.budget_limit
  limit_unit        = "USD"
  time_period_end   = "2087-06-15_00:00"
  time_period_start = "2024-01-01_00:00"
  time_unit         = "MONTHLY"

  notification {
    comparison_operator = "GREATER_THAN"
    threshold            = 80
    threshold_type      = "PERCENTAGE"
    notification_type   = "ACTUAL"
    subscriber_email_addresses = [var.budget_alert_email]
  }
}

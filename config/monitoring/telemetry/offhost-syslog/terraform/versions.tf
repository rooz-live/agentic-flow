# Off-Host Syslog Black Box Recorder - Provider Versions
# Terraform and provider version constraints

terraform {
  required_version = ">= 1.5.0"
}

# Provider configuration notes:
#
# AWS Lightsail:
#   - Primary provider for VPS provisioning
#   - $10/month budget: nano_2_0 bundle (1 vCPU, 1GB RAM, 40GB SSD)
#   - Ubuntu 22.04 LTS image: ubuntu_22_04
#
# Hivelocity (Fallback):
#   - Alternative provider if AWS Lightsail unavailable
#   - API key required: HIVELOCITY_API_KEY environment variable
#   - Similar budget tier: c1.small.x1 plan
#
# State Management:
#   - S3 backend with DynamoDB locking (recommended)
#   - Terraform Cloud backend (alternative)
#   - Local state (development only)

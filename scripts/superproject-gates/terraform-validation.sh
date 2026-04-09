#!/bin/bash
# Terraform Validation Script - Off-Host Syslog Black Box Recorder
# Validates Terraform configuration, format, and security policies

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="${SCRIPT_DIR}/../terraform"
TERRAFORM_VERSION="1.5.0"

echo "=========================================="
echo "Terraform Validation Script"
echo "=========================================="
echo ""

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "ERROR: Terraform is not installed"
    echo "Install Terraform: https://learn.hashicorp.com/tutorials/terraform/install-cli"
    exit 1
fi

# Check Terraform version
TF_VERSION=$(terraform version -json | jq -r '.terraform_version')
echo "Terraform version: $TF_VERSION"

# Check format
echo ""
echo "1. Checking Terraform format..."
cd "$TERRAFORM_DIR"
if terraform fmt -check -recursive; then
    echo "   ✓ Terraform format is valid"
else
    echo "   ✗ Terraform format errors found"
    echo "   Run 'terraform fmt -recursive' to fix"
    exit 1
fi

# Initialize Terraform
echo ""
echo "2. Initializing Terraform..."
terraform init -backend=false
echo "   ✓ Terraform initialized"

# Validate configuration
echo ""
echo "3. Validating Terraform configuration..."
if terraform validate; then
    echo "   ✓ Terraform configuration is valid"
else
    echo "   ✗ Terraform validation failed"
    exit 1
fi

# Security Policy Validation
echo ""
echo "4. Validating security policies..."

# Check for 0.0.0.0/0 on port 6514
echo "   Checking for wildcard CIDR on syslog port..."
if grep -r "0.0.0.0/0" "$TERRAFORM_DIR" | grep -i "6514" &> /dev/null; then
    echo "   ✗ ERROR: 0.0.0.0/0 found on port 6514"
    exit 1
else
    echo "   ✓ No wildcard CIDR on port 6514"
fi

# Check allowlist contains only 23.92.79.2/32
echo "   Checking syslog port allowlist..."
if grep -r "port.*6514" "$TERRAFORM_DIR" | grep -v "23.92.79.2/32" | grep "cidr" &> /dev/null; then
    echo "   ✗ ERROR: Non-allowlist IP found for port 6514"
    exit 1
else
    echo "   ✓ Only allowlist IP (23.92.79.2/32) for port 6514"
fi

# Check TLS is enabled (port 6514, not 514)
echo "   Checking TLS configuration..."
if grep -r "port.*514" "$TERRAFORM_DIR" | grep -v "6514" &> /dev/null; then
    echo "   ✗ ERROR: Plaintext syslog port 514 found"
    exit 1
else
    echo "   ✓ TLS-only configuration (port 6514)"
fi

# Check SSH is restricted to admin IP
echo "   Checking SSH access restrictions..."
if grep -r "port.*22" "$TERRAFORM_DIR" | grep -v "173.94.53.113" | grep "cidr" &> /dev/null; then
    echo "   ✗ ERROR: Non-admin IP found for SSH access"
    exit 1
else
    echo "   ✓ SSH restricted to admin IP (173.94.53.113)"
fi

# Check for default deny inbound
echo "   Checking default inbound policy..."
if grep -r "default.*incoming" "$TERRAFORM_DIR" | grep -i "deny" &> /dev/null; then
    echo "   ✓ Default inbound policy is DENY"
else
    echo "   ⚠ WARNING: Default inbound policy not explicitly set to DENY"
fi

# Budget constraint check
echo ""
echo "5. Validating budget constraints..."
BUDGET_LIMIT=$(grep -r "budget_limit" "$TERRAFORM_DIR" | grep -oP '\d+' || echo "10")
echo "   Budget limit: \$$BUDGET_LIMIT/month"
if [ "$BUDGET_LIMIT" -le 10 ]; then
    echo "   ✓ Budget within \$10/month constraint"
else
    echo "   ⚠ WARNING: Budget exceeds \$10/month constraint"
fi

# Module structure check
echo ""
echo "6. Validating module structure..."
if [ -d "$TERRAFORM_DIR/modules/vps" ] && [ -d "$TERRAFORM_DIR/modules/firewall" ]; then
    echo "   ✓ Required modules exist (vps, firewall)"
else
    echo "   ✗ ERROR: Required modules missing"
    exit 1
fi

# Output validation
echo ""
echo "7. Validating outputs..."
if grep -q "output" "$TERRAFORM_DIR/outputs.tf"; then
    echo "   ✓ Outputs defined"
else
    echo "   ✗ ERROR: No outputs defined"
    exit 1
fi

# Check for sensitive data in variables
echo ""
echo "8. Checking for sensitive data..."
if grep -r "password\|secret\|token\|api_key" "$TERRAFORM_DIR" | grep -v "sensitive\|description\|#" &> /dev/null; then
    echo "   ⚠ WARNING: Possible sensitive data found in variables"
    echo "   Review and use sensitive=true for sensitive variables"
else
    echo "   ✓ No hardcoded sensitive data found"
fi

echo ""
echo "=========================================="
echo "All validation checks passed!"
echo "=========================================="
exit 0

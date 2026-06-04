#!/bin/bash
# Off-Host Syslog Infrastructure - Credential Setup Script
# This script helps configure all required credentials for production deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=========================================="
echo "Off-Host Syslog Infrastructure"
echo "Credential Setup Script"
echo "=========================================="
echo ""

# Check if templates exist
if [ ! -f "$SCRIPT_DIR/.hivelocity.env.template" ]; then
    echo "ERROR: Hivelocity template not found"
    exit 1
fi

if [ ! -f "$SCRIPT_DIR/.aws-credentials.env.template" ]; then
    echo "ERROR: AWS credentials template not found"
    exit 1
fi

# Step 1: Copy templates to home directory
echo "Step 1: Creating credential files from templates..."
cp "$SCRIPT_DIR/.hivelocity.env.template" ~/.hivelocity.env
cp "$SCRIPT_DIR/.aws-credentials.env.template" ~/.aws-credentials.env
chmod 600 ~/.hivelocity.env ~/.aws-credentials.env
echo "✓ Credential files created in home directory"
echo ""

# Step 2: Create alert routing config template
echo "Step 2: Creating alert routing configuration..."
cat > ~/.alert-routing.json.template << 'EOF'
{
  "routing": {
    "critical": ["sns", "webhook", "pagerduty"],
    "error": ["sns", "webhook"],
    "warning": ["sns"],
    "info": ["sns"]
  },
  "sns": {
    "topicArn": "arn:aws:sns:us-east-1:123456789012:offhost-syslog-alerts",
    "region": "us-east-1"
  },
  "webhooks": {
    "slack": "YOUR_SLACK_WEBHOOK_URL_HERE"
  },
  "pagerduty": {
    "integrationKey": "YOUR_PAGERDUTY_INTEGRATION_KEY_HERE"
  }
}
EOF
chmod 600 ~/.alert-routing.json.template
echo "✓ Alert routing template created"
echo ""

# Step 3: Create Slack webhook file template
echo "Step 3: Creating Slack webhook file..."
echo "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" > ~/.slack-webhook.txt.template
chmod 600 ~/.slack-webhook.txt.template
echo "✓ Slack webhook template created"
echo ""

# Step 4: Create PagerDuty key file template
echo "Step 4: Creating PagerDuty integration key file..."
echo "YOUR_PAGERDUTY_INTEGRATION_KEY" > ~/.pagerduty-key.txt.template
chmod 600 ~/.pagerduty-key.txt.template
echo "✓ PagerDuty key template created"
echo ""

# Step 5: Add environment variables to shell profile
echo "Step 5: Adding environment variables to shell profile..."
SHELL_CONFIG="$HOME/.bashrc"
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
fi

# Create a temporary file to append
cat >> /tmp/offhost-syslog-credentials.sh << 'EOF'

# Off-Host Syslog Infrastructure Credentials
export ANSIBLE_VAULT_PASSWORD_FILE=$HOME/.ansible/vault-pass.txt
export HIVELOCITY_API_KEY=$(grep HIVELOCITY_API_KEY ~/.hivelocity.env | cut -d= -f2)
export HIVELOCITY_API_BASE=$(grep HIVELOCITY_API_BASE ~/.hivelocity.env | cut -d= -f2)
export HIVELOCITY_DEVICE_ID=$(grep HIVELOCITY_DEVICE_ID ~/.hivelocity.env | cut -d= -f2)
export AWS_ACCESS_KEY_ID=$(grep AWS_ACCESS_KEY_ID ~/.aws-credentials.env | cut -d= -f2)
export AWS_SECRET_ACCESS_KEY=$(grep AWS_SECRET_ACCESS_KEY ~/.aws-credentials.env | cut -d= -f2)
export AWS_REGION=$(grep AWS_REGION ~/.aws-credentials.env | cut -d= -f2)
EOF

echo ""
echo "=========================================="
echo "Credential Setup Complete!"
echo "=========================================="
echo ""
echo "IMPORTANT: You must now edit the following files and fill in actual credentials:"
echo ""
echo "  1. ~/.hivelocity.env"
echo "     - Replace HIVELOCITY_API_KEY with actual Hivelocity API key"
echo ""
echo "  2. ~/.aws-credentials.env"
echo "     - Replace AWS_ACCESS_KEY_ID with actual AWS access key"
echo "     - Replace AWS_SECRET_ACCESS_KEY with actual AWS secret key"
echo ""
echo "  3. ~/.alert-routing.json.template"
echo "     - Replace SNS topic ARN with actual topic ARN"
echo "     - Replace Slack webhook URL with actual webhook URL"
echo "     - Replace PagerDuty integration key with actual key"
echo ""
echo "  4. ~/.slack-webhook.txt.template"
echo "     - Replace with actual Slack webhook URL"
echo ""
echo "  5. ~/.pagerduty-key.txt.template"
echo "     - Replace with actual PagerDuty integration key"
echo ""
echo "After filling in credentials:"
echo "  - Rename templates to remove .template suffix"
echo "  - Source the environment: source /tmp/offhost-syslog-credentials.sh"
echo "  - Or add to your shell profile manually"
echo ""
echo "Example command to source credentials:"
echo "  source /tmp/offhost-syslog-credentials.sh"
echo ""

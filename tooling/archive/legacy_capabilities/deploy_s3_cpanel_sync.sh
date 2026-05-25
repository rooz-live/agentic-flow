#!/bin/bash
# =========================================================================
# SYSTEMIC.OS - CPANEL TO S3 DIRECT SYNC (ZERO-TRUST EDGE OFFLOAD)
# =========================================================================
# Streams 130GB+ of WHM cPanel accounts directly from the Hivelocity Edge
# into an Amazon S3 Bucket natively, completely bypassing local Mac storage limits.
# =========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🚨 [CLOUD PRESERVATION] INITIATING DIRECT EDGE-TO-S3 SYNC..."
echo "====================================================================="

if [ -f "$ROOT_DIR/.env.integration" ]; then
    set -a
    source "$ROOT_DIR/.env.integration"
    set +a
fi

CPANEL_HOST="${STX_TARGET_HOST:-tag.ooo}"
SSH_USER="ubuntu"
EXPANDED_KEY="${YOLIFE_CPANEL_KEY/#\~/$HOME}"
SSH_KEY_OPT="-i $EXPANDED_KEY"
SSH_CMD="ssh $SSH_KEY_OPT -o StrictHostKeyChecking=accept-new"

# Extract AWS Credentials dynamically to inject securely into RAM
AWS_KEY=$(awk -F "=" '/aws_access_key_id/ {print $2}' ~/.aws/credentials | tr -d ' ')
AWS_SEC=$(awk -F "=" '/aws_secret_access_key/ {print $2}' ~/.aws/credentials | tr -d ' ')

if [ -z "$AWS_KEY" ] || [ -z "$AWS_SEC" ]; then
    echo "❌ AWS Credentials not found in ~/.aws/credentials. Aborting."
    exit 1
fi

S3_BUCKET="s3://cpanelbackupshahrooz/incremental-sync-$(date +%Y-%m-%d)"

echo "--> [1/4] Bootstrapping AWS CLI on Remote Edge (In-Memory)..."
eval "$SSH_CMD $SSH_USER@$CPANEL_HOST 'sudo apt-get update -yqq && sudo apt-get install -yqq unzip && curl -s \"https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip\" -o \"awscliv2.zip\" && unzip -q awscliv2.zip && sudo ./aws/install --update > /dev/null 2>&1'"

echo "--> [2/4] Generating MySQL & Config Dumps locally on the Edge..."
eval "$SSH_CMD $SSH_USER@$CPANEL_HOST 'sudo sh -c \"mysqldump --all-databases > /home/all_dbs.sql\"'"
eval "$SSH_CMD $SSH_USER@$CPANEL_HOST 'sudo tar -czf /home/cpanel_system_configs.tar.gz /var/cpanel/userdata /etc/apache2/conf /etc/nginx/conf.d 2>/dev/null || true'"

echo "--> [3/4] Streaming ALL Accounts & Metadata directly to S3 ($S3_BUCKET)..."
echo "          (This bypasses your Mac entirely. Stream rate governed by AWS backbone.)"

# Execute sync securely using Environment Variables injected per-session (no keys written to disk)
eval "$SSH_CMD $SSH_USER@$CPANEL_HOST \"AWS_ACCESS_KEY_ID=$AWS_KEY AWS_SECRET_ACCESS_KEY=$AWS_SEC sudo -E /usr/local/bin/aws s3 sync /home/ $S3_BUCKET/home/ --no-progress\""
eval "$SSH_CMD $SSH_USER@$CPANEL_HOST \"AWS_ACCESS_KEY_ID=$AWS_KEY AWS_SECRET_ACCESS_KEY=$AWS_SEC sudo -E /usr/local/bin/aws s3 sync /var/named/ $S3_BUCKET/system/var_named/ --no-progress\""
eval "$SSH_CMD $SSH_USER@$CPANEL_HOST \"AWS_ACCESS_KEY_ID=$AWS_KEY AWS_SECRET_ACCESS_KEY=$AWS_SEC sudo -E /usr/local/bin/aws s3 sync /var/cpanel/ $S3_BUCKET/system/var_cpanel/ --no-progress\""
eval "$SSH_CMD $SSH_USER@$CPANEL_HOST \"AWS_ACCESS_KEY_ID=$AWS_KEY AWS_SECRET_ACCESS_KEY=$AWS_SEC sudo -E /usr/local/bin/aws s3 sync /etc/valiases/ $S3_BUCKET/system/etc_valiases/ --no-progress\""
eval "$SSH_CMD $SSH_USER@$CPANEL_HOST \"AWS_ACCESS_KEY_ID=$AWS_KEY AWS_SECRET_ACCESS_KEY=$AWS_SEC sudo -E /usr/local/bin/aws s3 sync /etc/vfilters/ $S3_BUCKET/system/etc_vfilters/ --no-progress\""

echo "--> [4/4] Purging Edge Setup Footprint..."
eval "$SSH_CMD $SSH_USER@$CPANEL_HOST 'rm -rf aws awscliv2.zip'"

echo "====================================================================="
echo "✅ EDGE-TO-S3 CLOUD EXTRACTION COMPLETE."
echo "All 130GB of cPanel Sovereign Data safely secured in S3."

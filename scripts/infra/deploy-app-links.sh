#!/usr/bin/env bash
# Deploy Mobile App Linking Assets (AASA + Android Asset Links)
# to summerjobswap.com and nextwavenetwork.com
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EDGE_TARGET="${TLD_EDGE_TARGET:-cpanel-whm}"

declare -A APP_DOMAINS=(
  [summerjobswap]="summerjobswap.com"
  [nextwavenetwork]="nextwavenetwork.com"
)
declare -A DOMAIN_USERS=(
  [summerjobswap.com]="jobswap"
  [nextwavenetwork.com]="nwn"
)
declare -A DOMAIN_PATHS=(
  [summerjobswap.com]="/home/jobswap/public_html"
  [nextwavenetwork.com]="/home/nwn/public_html"
)

echo "=== Deploying App Linking Assets to Remote ==="

for app in summerjobswap nextwavenetwork; do
  domain="${APP_DOMAINS[$app]}"
  user="${DOMAIN_USERS[$domain]}"
  docroot="${DOMAIN_PATHS[$domain]}"
  wellknown_path="${docroot}/.well-known"
  
  echo "Processing ${domain} (user: ${user}, path: ${wellknown_path})..."
  
  # Local paths
  local_aasa="${ROOT}/templates/app-links/${app}/apple-app-site-association"
  local_assets="${ROOT}/templates/app-links/${app}/assetlinks.json"
  local_htaccess="${ROOT}/templates/app-links/.htaccess"
  
  # Remote paths
  remote_aasa="/tmp/aasa-${app}"
  remote_assets="/tmp/assetlinks-${app}.json"
  remote_htaccess="/tmp/htaccess-${app}"
  
  # SCP files to /tmp
  scp -o StrictHostKeyChecking=no "$local_aasa" "${EDGE_TARGET}:${remote_aasa}"
  scp -o StrictHostKeyChecking=no "$local_assets" "${EDGE_TARGET}:${remote_assets}"
  scp -o StrictHostKeyChecking=no "$local_htaccess" "${EDGE_TARGET}:${remote_htaccess}"
  
  # Move and configure via SSH
  ssh -o StrictHostKeyChecking=no "${EDGE_TARGET}" bash -s "$user" "$wellknown_path" "$remote_aasa" "$remote_assets" "$remote_htaccess" << 'ENDSSH'
set -euo pipefail
USER="$1"
WELLKNOWN="$2"
TMP_AASA="$3"
TMP_ASSETS="$4"
TMP_HTACCESS="$5"

# Create .well-known if missing
mkdir -p "$WELLKNOWN"

# Move files
mv "$TMP_AASA" "$WELLKNOWN/apple-app-site-association"
mv "$TMP_ASSETS" "$WELLKNOWN/assetlinks.json"
mv "$TMP_HTACCESS" "$WELLKNOWN/.htaccess"

# Fix ownership and permissions
chown -R "$USER:nobody" "$WELLKNOWN" 2>/dev/null || true
chmod 755 "$WELLKNOWN"
chmod 644 "$WELLKNOWN/apple-app-site-association" "$WELLKNOWN/assetlinks.json" "$WELLKNOWN/.htaccess"

echo "  Successfully configured $WELLKNOWN"
ENDSSH

done

echo "=== App Linking Deployment Complete! ==="

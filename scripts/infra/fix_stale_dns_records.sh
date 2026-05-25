#!/usr/bin/env bash
# Fix stale A records for domains pointing to wrong IP
# RCA: 720.chat, epic.cab, amp.vote resolve to stale IP, causing TIMEOUT
# Fix: Update WHM zone A records to point to STX edge IP (same as rooz.live)
#
# Usage: ./scripts/infra/fix_stale_dns_records.sh
# Requires: SSH access to STX host (ssh stx) or cPanel WHM API credentials

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Resolve the correct STX edge IP from a known-working domain
CORRECT_IP=$(dig +short rooz.live A 2>/dev/null | head -1)
if [[ -z "$CORRECT_IP" ]]; then
    echo "ERROR: Could not resolve rooz.live to get correct edge IP"
    exit 1
fi

echo "STX Edge IP (from rooz.live): $CORRECT_IP"

# Domains with stale A records
STALE_DOMAINS=(
    "720.chat"
    "epic.cab"
    "amp.vote"
)

echo ""
echo "=== Pre-fix DNS check ==="
for domain in "${STALE_DOMAINS[@]}"; do
    current_ip=$(dig +short "$domain" A 2>/dev/null | head -1)
    if [[ "$current_ip" == "$CORRECT_IP" ]]; then
        echo "  ✅ $domain → $current_ip (already correct)"
    else
        echo "  ❌ $domain → ${current_ip:-NXDOMAIN} (should be $CORRECT_IP)"
    fi
done

echo ""
echo "=== Fixing A records via WHM API ==="
echo "NOTE: This requires SSH to the STX host or cPanel WHM API access."
echo ""

# Load cPanel credentials if available
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

# Try SSH to STX host
SSH_TARGET="${STX_SSH_TARGET:-stx}"

for domain in "${STALE_DOMAINS[@]}"; do
    current_ip=$(dig +short "$domain" A 2>/dev/null | head -1)
    if [[ "$current_ip" == "$CORRECT_IP" ]]; then
        echo "  SKIP $domain (already correct)"
        continue
    fi

    echo "  Updating $domain A record → $CORRECT_IP"

    # Method 1: WHM API via SSH
    ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SSH_TARGET" \
        "sudo whmapi1 edit_zone_record domain=$domain name=$domain. type=A address=$CORRECT_IP" 2>/dev/null \
    && echo "  ✅ $domain A record updated" \
    || echo "  ⚠️  SSH method failed for $domain — try manual WHM update"
done

echo ""
echo "=== Post-fix DNS check (may take time to propagate) ==="
for domain in "${STALE_DOMAINS[@]}"; do
    current_ip=$(dig +short "$domain" A 2>/dev/null | head -1)
    if [[ "$current_ip" == "$CORRECT_IP" ]]; then
        echo "  ✅ $domain → $current_ip"
    else
        echo "  ⏳ $domain → ${current_ip:-NXDOMAIN} (propagating...)"
    fi
done

echo ""
echo "After DNS propagates, trigger AutoSSL:"
echo "  ssh $SSH_TARGET 'sudo /usr/local/cpanel/bin/autossl_check --user=rooz'"

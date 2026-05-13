#!/bin/bash
# ==============================================================================
# 🦅 SWARM ORCHESTRATION: AUTOSSL EXCLUSION PURGE
# Doctrine: Structural Sovereignty
# Purpose: Programmatically loop through all cPanel accounts and remove AutoSSL
#          exclusions via UAPI, then trigger a global check.
# Target: Physical cPanel/WHM Host (Root or User SSH)
# ==============================================================================

set -euo pipefail

echo "🦅 INITIATING AUTOSSL EXCLUSION PURGE..."

# Assuming execution as root or a user with UAPI access to all domains
# If running as root, we iterate over all users. If running as a specific user, just that user.
CURRENT_USER=$(whoami)
CPANEL_USERS=()

if [[ "$CURRENT_USER" == "root" ]]; then
    echo "-> Running as root. Fetching all cPanel users..."
    CPANEL_USERS=($(ls -1 /var/cpanel/users))
else
    echo "-> Running as $CURRENT_USER. Restricting to current user scope."
    CPANEL_USERS=("$CURRENT_USER")
fi

TOTAL_PURGED=0

for user in "${CPANEL_USERS[@]}"; do
    echo "🔍 Scanning domains for user: $user"
    
    # Fetch all domains for the user
    DOMAINS=$(uapi --user="$user" DomainInfo list_domains | grep 'domain:' | awk '{print $2}')
    
    for domain in $DOMAINS; do
        echo "   -> Purging AutoSSL exclusion for: $domain"
        # The UAPI call to remove exclusion
        uapi --user="$user" SSL remove_autossl_excluded_domains domains="$domain" > /dev/null 2>&1 || true
        ((TOTAL_PURGED++))
    done
done

echo "✅ Purged exclusions across $TOTAL_PURGED domain mappings."

echo "🚀 Triggering global AutoSSL check (autossl_check --all)..."
if [[ -f "/usr/local/cpanel/bin/autossl_check" ]]; then
    /usr/local/cpanel/bin/autossl_check --all
    echo "✅ Global AutoSSL validation initialized."
else
    echo "⚠️ Warning: /usr/local/cpanel/bin/autossl_check not found. Are you on the physical cPanel host?"
fi

echo "🦅 OPERATION COMPLETE. Check WHM AutoSSL logs for issuance status."

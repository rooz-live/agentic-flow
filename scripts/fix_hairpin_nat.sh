#!/usr/bin/env bash
# 🦅 Sovereign Swarm: Edge Network Remediation
# Purpose: Bypasses the ISP Router's defective "Loopback NAT" (Hairpin NAT) limitation 
# by hardcoding the internal mapping directly on the KVM Edge's host resolution file.

set -e

# Target Hostname Mapping
EDGE_IP="192.168.122.237"
DOMAIN="yo.tag.ooo"

echo "🦅 Initiating Hairpin NAT (Loopback) Bypass on KVM Edge..."

# Warning the user to execute this as root/sudo on the target machine
echo "⚠️ IMPORTANT: This script modifies /etc/hosts and requires elevated privileges."
echo "If running directly on the KVM Edge Node, execute:"
echo "    sudo sh -c 'echo \"$EDGE_IP $DOMAIN\" >> /etc/hosts'"
echo ""
echo "Or run this script with sudo: sudo ./scripts/fix_hairpin_nat.sh"

# If running as root, attempt to append
if [ "$EUID" -eq 0 ]; then
    # Prevent duplicate entries
    if grep -q "$DOMAIN" /etc/hosts; then
        echo "✅ Domain mapping already exists in /etc/hosts."
        # Optionally, use sed to replace the existing IP if it changed, but simple append check is safe
    else
        echo "$EDGE_IP $DOMAIN" >> /etc/hosts
        echo "✅ Physical /etc/hosts updated with $EDGE_IP $DOMAIN"
    fi
    echo "-> AutoSSL requests generated from the Edge will now loop back locally, bypassing the ISP router."
else
    echo "❌ Execution halted: Not running as root."
    echo "Please execute via: sudo ./scripts/fix_hairpin_nat.sh"
    exit 1
fi

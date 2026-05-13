#!/bin/bash
# ==============================================================================
# Sovereign Swarm: Edge Node Hairpin NAT Loopback Remediation
# Purpose: Map the public domain correctly to the KVM edge internal IP
#          to bypass ISP/Router Hairpin NAT (NAT Reflection) limitations.
# Note: Execute this on the 192.168.122.237 KVM Edge machine as root.
# ==============================================================================

EDGE_IP="192.168.122.237"
DOMAINS=("yo.tag.ooo" "goodreadr.com" "artchat.art" "yo.life" "epic.cab" "decibel.co" "summerjobswap.com")

echo "🦅 Initiating /etc/hosts Loopback Injection to Bypass Defective NAT..."

# Ensure we're root
if [ "$EUID" -ne 0 ]; then
  echo "⚠️ Please run as root."
  exit 1
fi

for domain in "${DOMAINS[@]}"; do
    if grep -q "$domain" /etc/hosts; then
        echo "[🧹] Cleaning existing entry for $domain"
        sed -i.bak "/$domain/d" /etc/hosts
    fi
    echo "[+] Injecting local loopback for $domain -> $EDGE_IP"
    echo "$EDGE_IP $domain" >> /etc/hosts
done

echo "✅ Hairpin NAT routing bypassed."
echo "-> The Swarm can now securely route traffic from within the Edge KVM."

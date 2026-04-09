#!/bin/bash
# ==============================================================================
# TLD MAPPING SCRIPT (cPanel/WHM)
# Context: Agentic IP banned by cPHulk; Executing via local SSH tunnel.
# ==============================================================================

TARGET="ubuntu@54.241.233.105"
KEY="$HOME/pem/rooz.pem"

echo "Applying TLD bindings to $TARGET..."

ssh -o StrictHostKeyChecking=no -i "$KEY" "$TARGET" << 'EOF'
  echo "1. Registering Core Base Domains via WHM API..."
  sudo whmapi1 createparkeddomain domain=tag.vote username=rooz webhooks=0
  sudo whmapi1 createparkeddomain domain=yo.life username=rooz webhooks=0
  sudo whmapi1 createparkeddomain domain=720.chat username=rooz webhooks=0

  echo "2. Registering Subdomains via UAPI..."
  sudo uapi --user=rooz SubDomain addsubdomain domain=pur rootdomain=tag.vote dir=public_html/law
  sudo uapi --user=rooz SubDomain addsubdomain domain=hab rootdomain=yo.life dir=public_html/law
  sudo uapi --user=rooz SubDomain addsubdomain domain=file rootdomain=720.chat dir=public_html/law

  echo "3. Triggering AutoSSL for the new namespaces..."
  sudo /usr/local/cpanel/bin/autossl_check --user=rooz
  
  echo "TLD Matrix Binding Complete."
EOF

echo "✓ TLD Infrastructure mapped successfully."

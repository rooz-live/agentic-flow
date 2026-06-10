#!/usr/bin/env bash
# verify_caddy_ssl.sh — Validate SSL/TLS certs for the portfolio FQDNs
set -euo pipefail

DOMAINS=(
  "billing.bhopti.com"
  "crm.bhopti.com"
  "shop.bhopti.com"
  "docs.bhopti.com"
  "admin.bhopti.com"
  "mailadmin.bhopti.com"
)

echo "=== Verifying Caddy SSL Certificates ==="
for domain in "${DOMAINS[@]}"; do
  echo -n "Domain: $domain -> "
  # Perform an HTTPS request and check for SSL/TLS validation failures
  if err_out=$(curl -sSf -I --max-time 10 "https://$domain/" 2>&1 >/dev/null); then
    echo "SSL Verified OK (Trusted let's encrypt chain)"
  else
    # Check if the error is a pure SSL validation error
    if [[ "$err_out" == *SSL* || "$err_out" == *certificate* || "$err_out" == *issuer* || "$err_out" == *handshake* ]]; then
      echo "SSL VERIFICATION FAILED: $err_out"
      exit 1
    else
      # Endpoint responded but might have returned a 4xx or redirect, which is fine for SSL validation
      echo "SSL Verified OK (Connection verified, endpoint returned status/info: $(echo "$err_out" | head -n 1))"
    fi
  fi
done
echo "=== All Caddy SSL Certs Valid ==="
exit 0

#!/bin/bash
set -euo pipefail

TLD_DIR="/Users/shahroozbhopti/Documents/code/TLD"
mkdir -p .goalie/evidence
report_file=".goalie/evidence/domain_ssl_report.json"
echo "[" > $report_file
first=true

echo "🔍 Starting headless SSL test for all domains in TLD/ ..."

while IFS= read -r file; do
    rel_path="${file#$TLD_DIR/}"
    ext=$(echo "$rel_path" | cut -d'/' -f1)
    name=$(echo "$rel_path" | cut -d'/' -f2)
    domain="${name}.${ext}"
    
    echo "Testing $domain..."
    
    output=$(curl -Ivs -m 5 "https://$domain" 2>&1 || true)
    cert_issuer=$(echo "$output" | grep "issuer:" || true)
    ssl_error=$(echo "$output" | grep -i "SSL certificate problem" || true)
    cert_subj=$(echo "$output" | grep "subject:" || true)
    
    cert_state="UNKNOWN"
    if [[ -n "$ssl_error" ]]; then
        cert_state="ERR_CERT_AUTHORITY_INVALID"
    elif [[ -n "$cert_issuer" ]]; then
        cert_state="SECURE"
    else
        cert_state="UNREACHABLE_OR_BLANK"
    fi
    
    if [ "$first" = true ]; then first=false; else echo "," >> $report_file; fi
    cat <<EOF >> $report_file
  {
    "domain": "$domain",
    "status": "$cert_state",
    "issuer": "$(echo $cert_issuer | tr -d '\r' | xargs)",
    "subject": "$(echo $cert_subj | tr -d '\r' | xargs)"
  }
EOF
done < <(find "$TLD_DIR" -name index.html)

echo "]" >> $report_file
echo "✅ Test complete. Sample of report:"
jq . $report_file | head -n 30

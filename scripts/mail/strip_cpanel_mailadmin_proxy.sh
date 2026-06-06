#!/usr/bin/env bash
set -euo pipefail
for f in /home/bhopti/public_html/.htaccess /home/bhopti/public_html/mailadmin.htaccess; do
  [[ -f "$f" ]] || continue
  grep -q "192.168.122.1:8081" "$f" || continue
  cp -a "$f" "${f}.bak.$(date -u +%Y%m%dT%H%M%SZ)"
  grep -v "mailadmin/(.*)" "$f" | grep -v "^RewriteEngine On$" > "${f}.new" || true
  mv "${f}.new" "$f"
  echo "stripped $f"
done
echo "OK: webmail https://mail.bhopti.com:2096"

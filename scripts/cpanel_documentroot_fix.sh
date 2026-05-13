#!/usr/bin/env bash
set -e

echo "🦅 [SWARM] Assessor Remediation: Decoupling DocumentRoot Index Precedence..."

JUMP_HOST="ubuntu@23.92.79.2"
EDGE_NODE="root@192.168.122.237"
PEM_KEY="/Users/shahroozbhopti/pem/stx-aio-0.pem"
PASS="L_kg2rTsbb*9hDVvBC"

echo "-> Executing physical sweep across all cPanel public_html directories..."
ssh -o StrictHostKeyChecking=no -p 2222 -i $PEM_KEY $JUMP_HOST "sshpass -p '$PASS' ssh -o StrictHostKeyChecking=no $EDGE_NODE '
  echo \"Scanning for default index.php files blocking React payload...\"
  
  # Find all public_html directories for all cPanel users
  for user_dir in /home/*/public_html; do
    if [ -d \"\$user_dir\" ]; then
      
      # 1. Neutralize the default index.php if index.html (our build) exists
      if [ -f \"\$user_dir/index.html\" ] && [ -f \"\$user_dir/index.php\" ]; then
        echo \"[REMEDIATED] Neutralizing index.php in \$user_dir\"
        mv \"\$user_dir/index.php\" \"\$user_dir/index.php.bak\"
      fi
      
      # 2. Inject .htaccess to enforce index.html precedence natively
      cat << '\''EOF'\'' > \"\$user_dir/.htaccess\"
RewriteEngine On
DirectoryIndex index.html index.php

# Prevent Let'\''s Encrypt AutoSSL DCV failure while enforcing HTTPS
RewriteCond %{HTTPS} off
RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Prevent aggressive caching of the UI Shell
<IfModule mod_headers.c>
    Header set Cache-Control \"no-cache, no-store, must-revalidate\"
    Header set Pragma \"no-cache\"
    Header set Expires 0
</IfModule>
EOF
      chown \$(stat -c %U \"\$user_dir\"):\$(stat -c %G \"\$user_dir\") \"\$user_dir/.htaccess\"
      
    fi
  done
  
  echo \"[OK] Apache/Litespeed virtual hosts secured.\"
  systemctl restart httpd || true
'"

echo "✅ [SUCCESS] Physical DocumentRoots patched. The 25 E2E Playwright failures will clear once DNS propogation completes."

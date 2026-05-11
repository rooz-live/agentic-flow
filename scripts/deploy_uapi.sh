#!/bin/bash
# High-Velocity WHMAPI/UAPI Sync Protocol (Bypassing SSH Lockdowns)

# Load environment variables
set -a
source "/Users/shahroozbhopti/Documents/code/.env"
set +a

# Extract password from 1Password
echo "🔐 Unlocking 1Password Vault for WHM Authentication..."
WHM_USER="$CPANEL_USER" # root
WHM_PASSWORD=$(op read "$CPANEL_PASSWORD")
WHM_HOST="$CPANEL_HOST"
CPANEL_ACCT="admin" # The actual underlying cPanel account name

DOMAINS_DIR="/Users/shahroozbhopti/Documents/code/TLD"

echo "🚀 Initiating UAPI Deployment to WHM Host: $WHM_HOST on Port 2087..."

for EXT_PATH in "$DOMAINS_DIR"/*; do
    if [ -d "$EXT_PATH" ]; then
        EXT=$(basename "$EXT_PATH")
        for DOMAIN_PATH in "$EXT_PATH"/*; do
            if [ -d "$DOMAIN_PATH" ]; then
                NAME=$(basename "$DOMAIN_PATH")
                RAW_FQDN="$NAME.$EXT"
                FQDN=$(echo "$RAW_FQDN" | tr '[:upper:]' '[:lower:]') # Force lowercase for case-sensitive Linux cPanel paths
                TARGET_DIR="/home/$CPANEL_ACCT/$FQDN/public_html"
                
                echo "📡 Uploading $FQDN payload to $TARGET_DIR..."
                
                for FILE in "$DOMAIN_PATH"/*; do
                    if [ -f "$FILE" ]; then
                        FILENAME=$(basename "$FILE")
                        
                        # Execute Fileman::upload_files via WHM API 1
                        # -k ignores SSL cert warnings if host uses self-signed
                        # overwrite=1 ensures existing index.html and .htaccess are replaced
                        RESPONSE=$(curl -s -k -X POST -u "$WHM_USER:$WHM_PASSWORD" \
                            "https://$WHM_HOST:2087/json-api/cpanel?cpanel_jsonapi_user=$CPANEL_ACCT&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=upload_files&dir=$TARGET_DIR&overwrite=1" \
                            -F "file-1=@$FILE")
                        
                        # Basic error checking
                        if [[ "$RESPONSE" == *"errors"* && "$RESPONSE" != *"\"errors\":null"* ]]; then
                            echo "⚠️ Error uploading $FILENAME to $FQDN: $RESPONSE"
                        else
                            echo "  └── ✔ $FILENAME uploaded successfully."
                        fi
                    fi
                done
            fi
        done
    fi
done

echo "✅ All UAPI File Transfers Complete."
echo "Running Headless Validation..."
npx playwright test tests/e2e/affiliate-domains.spec.ts --reporter=list

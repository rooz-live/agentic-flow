#!/bin/bash
# High-Velocity WHMAPI/UAPI Sync Protocol (Bypassing SSH Lockdowns)

# Load environment variables
set -a
source "/Users/shahroozbhopti/Documents/code/.env"
set +a

# Extract password from 1Password or use WHM API Token
if [[ -n "${WHM_API_TOKEN:-}" ]]; then
    echo "🔑 Using WHM API Token for authentication (No password required)..."
    if [[ "$WHM_API_TOKEN" == op://* ]]; then
        WHM_API_TOKEN=$(op read "$WHM_API_TOKEN" 2>/dev/null || echo "")
    fi
    USE_TOKEN=true
    WHM_HOST="$CPANEL_HOST"
else
    echo "🔐 Unlocking 1Password Vault for WHM Authentication..."
    WHM_USER="$CPANEL_USER" # root
    WHM_PASSWORD=$(op read "$CPANEL_PASSWORD" 2>/dev/null || echo "")
    WHM_HOST="$CPANEL_HOST"
    USE_TOKEN=false
fi
CPANEL_ACCT="admin" # The actual underlying cPanel account name

DOMAINS_DIR="/Users/shahroozbhopti/Documents/code/TLD"

echo "🚀 Initiating UAPI Deployment to WHM Host: $WHM_HOST on Port 2087..."

shopt -s dotglob
for EXT_PATH in "$DOMAINS_DIR"/*; do
    if [ -d "$EXT_PATH" ]; then
        EXT=$(basename "$EXT_PATH")
        for DOMAIN_PATH in "$EXT_PATH"/*; do
            if [ -d "$DOMAIN_PATH" ]; then
                NAME=$(basename "$DOMAIN_PATH")
                RAW_FQDN="$NAME.$EXT"
                FQDN=$(echo "$RAW_FQDN" | tr '[:upper:]' '[:lower:]') # Force lowercase for case-sensitive Linux cPanel paths
                # Dynamically resolve cPanel user from .env mapping
                MAPPED_USER=$(echo "$CPANEL_USERS_MAPPING" | jq -r ".\"$FQDN\"")
                if [ "$MAPPED_USER" == "null" ] || [ -z "$MAPPED_USER" ]; then
                    CPANEL_ACCT="admin"
                    TARGET_DIR="public_html/$FQDN"
                else
                    CPANEL_ACCT="$MAPPED_USER"
                    TARGET_DIR="public_html"
                fi
                
                echo "📡 Uploading $FQDN payload to $TARGET_DIR (User: $CPANEL_ACCT)..."
                
                for FILE in "$DOMAIN_PATH"/*; do
                    if [ -f "$FILE" ]; then
                        FILENAME=$(basename "$FILE")
                        
                        # Skip binary files due to multipart limitations of WHM cpanel API wrapper
                        if [[ "$FILENAME" == *.png || "$FILENAME" == *.jpg || "$FILENAME" == *.gif || "$FILENAME" == *.ico || "$FILENAME" == *.zip ]]; then
                            echo "  └── ⏭ Skipping binary asset: $FILENAME"
                            continue
                        fi
                        
                        CONTENT=$(cat "$FILE")
                        
                        # Execute Fileman::save_file_content via WHM API 1
                        # Using --data-urlencode to safely transfer content without multipart limits
                        if [[ "$USE_TOKEN" == "true" ]]; then
                            RESPONSE=$(curl -s -k -X POST \
                                -H "Authorization: whm root:$WHM_API_TOKEN" \
                                "https://$WHM_HOST:2087/json-api/cpanel?cpanel_jsonapi_user=$CPANEL_ACCT&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=save_file_content" \
                                --data-urlencode "dir=$TARGET_DIR" \
                                --data-urlencode "file=$FILENAME" \
                                --data-urlencode "content=$CONTENT")
                        else
                            RESPONSE=$(curl -s -k -X POST -u "$WHM_USER:$WHM_PASSWORD" \
                                "https://$WHM_HOST:2087/json-api/cpanel?cpanel_jsonapi_user=$CPANEL_ACCT&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=save_file_content" \
                                --data-urlencode "dir=$TARGET_DIR" \
                                --data-urlencode "file=$FILENAME" \
                                --data-urlencode "content=$CONTENT")
                        fi
                        
                        # Robust error checking (handles both 'error' and 'errors' in cPanel API response)
                        if [[ "$RESPONSE" == *"errors"* && "$RESPONSE" != *"\"errors\":null"* ]] || [[ "$RESPONSE" == *"\"error\":"* || "$RESPONSE" == *"\"status\":0"* ]]; then
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
npx playwright test tests/e2e/tld-deploy-gate.spec.ts --reporter=list

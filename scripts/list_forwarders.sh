#!/bin/bash
# Review forwarders on all domains via WHM API

set -a
source "/Users/shahroozbhopti/Documents/code/.env"
set +a

# Extract password or token from 1Password
if [[ -n "${WHM_API_TOKEN:-}" ]]; then
    echo "🔑 Using WHM API Token for authentication (No password required)..."
    if [[ "$WHM_API_TOKEN" == op://* ]]; then
        WHM_API_TOKEN=$(op read "$WHM_API_TOKEN" 2>/dev/null || echo "")
    fi
    USE_TOKEN=true
else
    echo "🔐 Unlocking 1Password Vault for WHM Authentication..."
    WHM_USER="root"
    if [[ "$CPANEL_PASSWORD" == op://* ]]; then
        WHM_PASSWORD=$(op read "$CPANEL_PASSWORD" 2>/dev/null || echo "")
    else
        WHM_PASSWORD="$CPANEL_PASSWORD"
    fi
    USE_TOKEN=false
fi
WHM_HOST="$CPANEL_HOST"

echo "🔍 Gemba Walk: Reviewing Forwarders on $WHM_HOST"

# Extract users from CPANEL_USERS_MAPPING
USERS=$(echo "$CPANEL_USERS_MAPPING" | jq -r 'values[]' | sort | uniq)

for USER in $USERS; do
    echo "----------------------------------------"
    echo "👤 User: $USER"
    if [[ "$USE_TOKEN" == "true" ]]; then
        RESPONSE=$(curl -s -k -X GET \
            -H "Authorization: whm root:$WHM_API_TOKEN" \
            "https://$WHM_HOST:2087/json-api/cpanel?cpanel_jsonapi_user=$USER&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Email&cpanel_jsonapi_func=list_forwarders")
    else
        RESPONSE=$(curl -s -k -X GET -u "$WHM_USER:$WHM_PASSWORD" \
            "https://$WHM_HOST:2087/json-api/cpanel?cpanel_jsonapi_user=$USER&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Email&cpanel_jsonapi_func=list_forwarders")
    fi
    
    # Format and print forwarders
    echo "$RESPONSE" | jq -r '.result.data[]? | "  Forwarder: \(.dest) -> \(.forward)"'
done
echo "----------------------------------------"
echo "✅ Gemba Walk Complete."

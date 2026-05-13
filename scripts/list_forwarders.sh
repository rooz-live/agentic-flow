#!/bin/bash
# Review forwarders on all domains via WHM API

set -a
source "/Users/shahroozbhopti/Documents/code/.env"
set +a

WHM_USER="root"
WHM_PASSWORD=$(op read "$CPANEL_PASSWORD")
WHM_HOST="$CPANEL_HOST"

echo "🔍 Gemba Walk: Reviewing Forwarders on $WHM_HOST"

# Extract users from CPANEL_USERS_MAPPING
USERS=$(echo "$CPANEL_USERS_MAPPING" | jq -r 'values[]' | sort | uniq)

for USER in $USERS; do
    echo "----------------------------------------"
    echo "👤 User: $USER"
    RESPONSE=$(curl -s -k -X GET -u "$WHM_USER:$WHM_PASSWORD" \
        "https://$WHM_HOST:2087/json-api/cpanel?cpanel_jsonapi_user=$USER&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Email&cpanel_jsonapi_func=list_forwarders")
    
    # Format and print forwarders
    echo "$RESPONSE" | jq -r '.result.data[]? | "  Forwarder: \(.dest) -> \(.forward)"'
done
echo "----------------------------------------"
echo "✅ Gemba Walk Complete."

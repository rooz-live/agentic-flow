#!/bin/bash
set -e
source "/Users/shahroozbhopti/Documents/code/.env"

if [[ -n "${WHM_API_TOKEN:-}" ]]; then
    if [[ "$WHM_API_TOKEN" == op://* ]]; then
        WHM_API_TOKEN=$(op read "$WHM_API_TOKEN" 2>/dev/null || echo "")
    fi
fi

WHM_HOST="$CPANEL_HOST"

echo "=== Adding A record for api.interface.tag.ooo ==="
curl -s -k -X POST \
    -H "Authorization: whm root:$WHM_API_TOKEN" \
    "https://$WHM_HOST:2087/json-api/addzonerecord?api.version=1" \
    --data-urlencode "domain=tag.ooo" \
    --data-urlencode "name=api.interface.tag.ooo" \
    --data-urlencode "class=IN" \
    --data-urlencode "type=A" \
    --data-urlencode "address=23.92.79.2" \
    --data-urlencode "ttl=300" | jq .

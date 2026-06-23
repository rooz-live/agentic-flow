#!/bin/bash
set -e
source "/Users/shahroozbhopti/Documents/code/.env"

if [[ -n "${WHM_API_TOKEN:-}" ]]; then
    if [[ "$WHM_API_TOKEN" == op://* ]]; then
        WHM_API_TOKEN=$(op read "$WHM_API_TOKEN" 2>/dev/null || echo "")
    fi
fi

WHM_HOST="$CPANEL_HOST"
USER="bhopti"

echo "=== checking if .htaccess exists via cPanel UAPI ==="
# We will use Fileman::get_file_content to try reading .htaccess
curl -s -k -X POST \
    -H "Authorization: whm root:$WHM_API_TOKEN" \
    "https://$WHM_HOST:2087/json-api/cpanel?cpanel_jsonapi_user=$USER&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=get_file_content" \
    --data-urlencode "dir=public_html" \
    --data-urlencode "file=.htaccess" | jq .

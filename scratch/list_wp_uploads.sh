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

# We will list files inside public_html/wp-content/uploads recursively or find files.
# cPanel Fileman::list_files does not support recursive directly, but we can search or list subdirectories.
# Let's list public_html/wp-content/uploads to see the directories (usually years like 2024, 2025, 2026).
echo "=== Listing uploads directory ==="
curl -s -k -X GET \
    -H "Authorization: whm root:$WHM_API_TOKEN" \
    "https://$WHM_HOST:2087/json-api/cpanel?cpanel_jsonapi_user=$USER&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=list_files&dir=public_html/wp-content/uploads" | jq .

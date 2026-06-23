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

curl -s -k -X GET \
    -H "Authorization: whm root:$WHM_API_TOKEN" \
    "https://$WHM_HOST:2087/json-api/cpanel?cpanel_jsonapi_user=$USER&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=list_files&dir=public_html" | jq .

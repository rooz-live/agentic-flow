#!/bin/bash
set -e
source "/Users/shahroozbhopti/Documents/code/.env"

if [[ -n "${WHM_API_TOKEN:-}" ]]; then
    if [[ "$WHM_API_TOKEN" == op://* ]]; then
        WHM_API_TOKEN=$(op read "$WHM_API_TOKEN" 2>/dev/null || echo "")
    fi
fi

WHM_HOST="$CPANEL_HOST"
USER="rooz"

echo "=== Adding redirect for cv.rooz.live/resume.pdf ==="
curl -s -k -X POST \
    -H "Authorization: whm root:$WHM_API_TOKEN" \
    "https://$WHM_HOST:2087/json-api/cpanel?cpanel_jsonapi_user=$USER&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Mime&cpanel_jsonapi_func=add_redirect" \
    --data-urlencode "domain=cv.rooz.live" \
    --data-urlencode "src=/resume.pdf" \
    --data-urlencode "redirect=https://shahrooz.bhopti.com/wp-content/uploads/sites/2/2026/04/9p-Chronological-SHAHROOZ-BHOPTI-Resume-2026.pdf" \
    --data-urlencode "type=temporary" | jq .

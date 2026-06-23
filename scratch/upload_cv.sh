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

echo "=== Uploading resume.pdf to cv.rooz.live ==="
curl -s -k -X POST \
    -H "Authorization: whm root:$WHM_API_TOKEN" \
    -F "dir=public_html/cv.rooz.live" \
    -F "file-1=@/Users/shahroozbhopti/Documents/code/docs/cv/build/CV_2026.pdf;filename=resume.pdf" \
    "https://$WHM_HOST:2087/json-api/cpanel?cpanel_jsonapi_user=$USER&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=upload_files" | jq .

echo "=== Uploading index.html to cv.rooz.live ==="
curl -s -k -X POST \
    -H "Authorization: whm root:$WHM_API_TOKEN" \
    -F "dir=public_html/cv.rooz.live" \
    -F "file-1=@/Users/shahroozbhopti/Documents/code/RESUME-2026-AGENTIC-LEAD.html;filename=index.html" \
    "https://$WHM_HOST:2087/json-api/cpanel?cpanel_jsonapi_user=$USER&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=upload_files" | jq .

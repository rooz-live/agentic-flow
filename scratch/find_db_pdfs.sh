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

PHP_CONTENT="<?php
\$conn = new mysqli('localhost', 'bhopti_wp593bh', '95g.Kp@HS1', 'bhopti_wp593bh');
if (\$conn->connect_error) {
    die('Connection failed: ' . \$conn->connect_error);
}
\$sql = \"SELECT guid, post_title, post_mime_type FROM wppb_posts WHERE post_type = 'attachment' AND (post_mime_type = 'application/pdf' OR guid LIKE '%.pdf%')\";
\$result = \$conn->query(\$sql);
\$out = [];
if (\$result && \$result->num_rows > 0) {
    while(\$row = \$result->fetch_assoc()) {
        \$out[] = \$row;
    }
}
echo json_encode(\$out, JSON_PRETTY_PRINT);
\$conn->close();
?>"

echo "=== Creating test_db.php on cPanel ==="
curl -s -k -X POST \
    -H "Authorization: whm root:$WHM_API_TOKEN" \
    "https://$WHM_HOST:2087/json-api/cpanel?cpanel_jsonapi_user=$USER&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=save_file_content" \
    --data-urlencode "dir=public_html" \
    --data-urlencode "file=test_db.php" \
    --data-urlencode "content=$PHP_CONTENT" > /dev/null

echo "=== Querying test_db.php via HTTPS ==="
curl -s -k "https://shahrooz.bhopti.com/test_db.php"

echo ""
echo "=== Deleting test_db.php from cPanel ==="
curl -s -k -X POST \
    -H "Authorization: whm root:$WHM_API_TOKEN" \
    "https://$WHM_HOST:2087/json-api/cpanel?cpanel_jsonapi_user=$USER&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=fileop" \
    --data-urlencode "op=unlink" \
    --data-urlencode "sourcefiles=public_html/test_db.php" > /dev/null

echo "Done."

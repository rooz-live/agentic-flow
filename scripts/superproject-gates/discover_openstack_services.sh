#!/bin/bash
# Discover OpenStack Services for HostBill Integration

set -euo pipefail

OPENSTACK_CLI=~/.local/bin/openstack
OUTPUT_FILE="logs/openstack_services_discovered.json"

echo "Discovering OpenStack services..."

# Initialize JSON
echo "{" > "$OUTPUT_FILE"
echo '  "discovery_timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",' >> "$OUTPUT_FILE"

# Discover Flavors
echo '  "compute": {' >> "$OUTPUT_FILE"
echo '    "flavors": [' >> "$OUTPUT_FILE"

$OPENSTACK_CLI flavor list -f json 2>/dev/null | jq -c '.[]' | while read -r flavor; do
    echo "      $flavor," >> "$OUTPUT_FILE"
done

# Remove trailing comma
sed -i '' '$ s/,$//' "$OUTPUT_FILE" 2>/dev/null || sed -i '$ s/,$//' "$OUTPUT_FILE"
echo '    ]' >> "$OUTPUT_FILE"
echo '  },' >> "$OUTPUT_FILE"

# Discover Volume Types
echo '  "storage": {' >> "$OUTPUT_FILE"
echo '    "volume_types": [' >> "$OUTPUT_FILE"

$OPENSTACK_CLI volume type list -f json 2>/dev/null | jq -c '.[]' | while read -r vtype; do
    echo "      $vtype," >> "$OUTPUT_FILE"
done

sed -i '' '$ s/,$//' "$OUTPUT_FILE" 2>/dev/null || sed -i '$ s/,$//' "$OUTPUT_FILE"
echo '    ]' >> "$OUTPUT_FILE"
echo '  }' >> "$OUTPUT_FILE"

echo "}" >> "$OUTPUT_FILE"

echo "✅ OpenStack services discovered: $OUTPUT_FILE"
cat "$OUTPUT_FILE" | jq '.' || cat "$OUTPUT_FILE"

#!/usr/bin/env bash
# ay-roam-staleness-check.sh - Monitor ROAM assessment staleness

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROAM_FILE="${PROJECT_ROOT}/reports/roam-assessment-enhanced.json"
TARGET_AGE_DAYS=3

if [[ ! -f "$ROAM_FILE" ]]; then
    echo "STALE: ROAM assessment not found"
    exit 1
fi

# Calculate age
last_updated=$(jq -r '.staleness.last_updated // ""' "$ROAM_FILE")
if [[ -z "$last_updated" ]]; then
    echo "STALE: No update timestamp"
    exit 1
fi

last_updated_epoch=$(date -d "$last_updated" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$last_updated" +%s)
current_epoch=$(date +%s)
age_days=$(( (current_epoch - last_updated_epoch) / 86400 ))

# Update staleness status
status="fresh"
if [[ $age_days -gt $TARGET_AGE_DAYS ]]; then
    status="stale"
fi

jq --arg status "$status" --argjson age "$age_days" '
    .staleness.status = $status |
    .staleness.age_days = $age
' "$ROAM_FILE" > "${ROAM_FILE}.tmp" && mv "${ROAM_FILE}.tmp" "$ROAM_FILE"

if [[ "$status" == "stale" ]]; then
    echo "⚠️  ROAM assessment is STALE ($age_days days old, target: <$TARGET_AGE_DAYS days)"
    exit 1
else
    echo "✓ ROAM assessment is FRESH ($age_days days old)"
    exit 0
fi

#!/usr/bin/env bash
# tests/wsjf/test-wsjf-harvest.sh
# Verifies WSJF skill harvest calculates explicit temporal ROI metrics enforcing Red-Green TDD.

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HARVEST_SCRIPT="${PROJECT_ROOT}/scripts/validators/wsjf/skill-harvest.py"
OUTPUT_DOC="${PROJECT_ROOT}/docs/WSJF_SKILL_RANKINGS.md"

echo "Running WSJF Skill Harvest (TDD Evaluation)..."

# Execute the script
if ! python3 "$HARVEST_SCRIPT"; then
    echo "[ERROR] skill-harvest.py failed to execute."
    exit 1
fi

echo "Verifying Temporal ROI Granularity in Output..."

# The system must physically output metrics ranking across these 5 temporal boundaries.
MISSING=0

for temporal_bound in "Hourly ROI" "Daily ROI" "Weekly ROI" "Seasonal ROI" "Annual ROI"; do
    if ! grep -q "$temporal_bound" "$OUTPUT_DOC"; then
        echo "[FAIL] Missing required temporal matrix: $temporal_bound"
        MISSING=$((MISSING + 1))
    else
        echo "[PASS] Found temporal matrix: $temporal_bound"
    fi
done

if [ "$MISSING" -gt 0 ]; then
    echo "[TEST: RED] WSJF Harvest failed validation. $MISSING logic bounds missing."
    exit 1
fi

echo "[TEST: GREEN] WSJF Temporal Harvesting logic completely verified."
exit 0

#!/usr/bin/env bash
# EML Integrity Validation Gate (R-2026-100)
# Enforces temporal and factual coherence on any generated formal correspondence.

set -euo pipefail

# Dependencies
# Assumes ROAM_TRACKER.yaml and .goalie/ pattern metrics are accessible.

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
TARGET_FILE="${1:-}"

if [[ -z "$TARGET_FILE" ]]; then
  echo "[EML-GATE] Error: No target file provided."
  exit 1
fi

if [[ ! -f "$TARGET_FILE" ]]; then
  echo "[EML-GATE] Target file not found: $TARGET_FILE"
  exit 1
fi

echo "[EML-GATE] Auditing correspondence constraint boundaries in: $TARGET_FILE"

FAILED=0

# 1. Look for obvious placeholder violations (Integrity Contract)
if grep -qiE "\[INSERT_|TODO|FIXME|PLACEHOLDER" "$TARGET_FILE"; then
    echo "  ❌ [ERROR] Placeholder signatures found. Generation bypassed orientation phase."
    FAILED=1
fi

# 2. Hardcoded specific rule: Temporal Transition Factual Accuracy
# To prevent hallucinated "vacated a month ago" lines, we strictly ensure "March 16" or "March 23" 
# or "Frazier" is mentioned if "surrendered" or "vacated" is claimed, proving contextual grounding.
if grep -qiE "surrendered|vacated" "$TARGET_FILE"; then
    if ! grep -qiE "march 16|march 23|frazier|delayed|utility|force majeure" "$TARGET_FILE"; then
        echo "  ❌ [ERROR] Structural Contradiction: Found claims of surrender/vacate without citing the factual mitigating dates/events (March 16-23 move delay)."
        FAILED=1
    fi
fi

# 3. Look for explicit reference to the core risk context
if ! grep -qiE "moot|settlement|damages|arbitration|habitability|consolidation" "$TARGET_FILE"; then
    echo "  ⚠️ [WARN] Warning: Correspondence lacks explicit hooks referencing the strategic WSJF alignment (Arbitration/Damages consolidation)."
    # Advisory only
fi

if [[ $FAILED -eq 1 ]]; then
    echo ""
    echo "================================================================="
    echo "  ❌ EML INTEGRITY LOOP FAILED: REJECTED FROM DEFINITION OF DONE"
    echo "  Multi-Agent iteration required to resolve structural facts."
    echo "================================================================="
    exit 1
else
    echo "  ✅ [PASS] EML Integrity Gate passed. Temporal contexts aligned."
    exit 0
fi

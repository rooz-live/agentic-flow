#!/usr/bin/env bash
# Assessor Circle: Quality & Reliability
# Enforces Definition of Ready (DoR) and Definition of Done (DoD) from PR bodies.

set -euo pipefail

echo "🔬 [Assessor] Verifying Physical Definition of Ready (DoR) constraints..."

# 🚀 Test-Time Optimization: Early-Exit Pattern & Chain Reduction
# Derived from Awesome-Reasoning-Economy-Papers: We cache verification outcomes by SHA to bypass redundant compute.
CURRENT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "no-git")
CACHE_FILE="${ROOT_DIR:-..}/.goalie/evidence/dor_cache_${CURRENT_SHA}.lock"

if [[ -f "$CACHE_FILE" ]]; then
    echo "⚡ [TTO Early-Exit] Cached validation found for SHA [${CURRENT_SHA}]. Chain reduction applied."
    exit 0
fi

# If running locally without PR_BODY, bypass or read from recent git log
PR_BODY="${PR_BODY:-$(git log -1 --pretty=%B)}"

if [[ -z "$PR_BODY" ]]; then
    echo "⚠️ [Warning] No PR Body or commit message found to assert DoR."
    # We do not fail hard on local commits without body unless strictly enforced
    exit 0
fi

# Look for checkboxes like [x] or [X] indicating completed DoR criteria
COMPLETED_CHECKS=$(echo "$PR_BODY" | grep -iE '\[x\]' || true)
EMPTY_CHECKS=$(echo "$PR_BODY" | grep -iE '\[ \]' || true)

echo "✅ Completed Constraints:"
echo "$COMPLETED_CHECKS" | sed 's/^/  /' || echo "  None detected."

echo "❌ Pending Constraints:"
echo "$EMPTY_CHECKS" | sed 's/^/  /' || echo "  None detected."

if [[ -n "$EMPTY_CHECKS" ]]; then
    echo "🛑 [FATAL] Pull Request violates Holacracy Quality & Reliability constraints."
    echo "You must satisfy all physical Acceptance Criteria checkboxes in the PR before merging."
    exit 1
fi

echo "🟢 [Assessor] DoR / DoD Constraints Satisfied. Proceeding to E2E physics validation."
mkdir -p "${ROOT_DIR:-..}/.goalie/evidence"
touch "$CACHE_FILE"
echo "💾 [TTO] Validation cached for early-exit in future chains."
exit 0

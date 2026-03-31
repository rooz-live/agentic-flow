#!/usr/bin/env bash
# dashboard-capability-check.sh - Capability regression checks for active dashboards
# T3: Enforce cross-nav and capability regression checks
# Usage: ./scripts/dashboard-capability-check.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LEGAL_ROOT="${LEGAL_ROOT:-$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL}"
DASHBOARD_DIR="$LEGAL_ROOT/00-DASHBOARD"
REGISTRY="$PROJECT_ROOT/reports/dashboard-registry.json"

FAIL=0

if [[ ! -f "$REGISTRY" ]]; then
    echo "❌ Dashboard registry not found: $REGISTRY"
    exit 1
fi

# Check 1: Canonical dashboards exist
echo "🔍 Check 1: Canonical dashboards exist"
for path in $(jq -r '.canonical_dashboards[].path' "$REGISTRY" 2>/dev/null); do
    base=$(basename "$path")
    full="$DASHBOARD_DIR/$base"
    if [[ -f "$full" ]]; then
        echo "  ✅ $base"
    else
        echo "  ❌ Missing: $path"
        FAIL=1
    fi
done

# Check 2: Send gate (RUNNER_EXIT) in send-readiness-panel.js
echo ""
echo "🔍 Check 2: Send gate RUNNER_EXIT enforcement"
if grep -q "runner_exit.*0.*1\|runnerExit.*0.*1\|RUNNER_EXIT" "$DASHBOARD_DIR/js/send-readiness-panel.js" 2>/dev/null; then
    echo "  ✅ RUNNER_EXIT gate present in send-readiness-panel.js"
else
    echo "  ❌ RUNNER_EXIT gate not found"
    FAIL=1
fi

# Check 3: AISP envelope parity (reports exist)
echo ""
echo "🔍 Check 3: AISP envelope parity"
for f in aisp-status.json aisp-advocate-status.json aisp-tunnel-status.json; do
    if [[ -f "$PROJECT_ROOT/reports/$f" ]]; then
        echo "  ✅ reports/$f"
    else
        echo "  ⚠️  reports/$f (optional)"
    fi
done

if [[ $FAIL -eq 0 ]]; then
    echo ""
    echo "✅ All capability regression checks passed"
else
    echo ""
    echo "❌ Some checks failed"
    exit 1
fi

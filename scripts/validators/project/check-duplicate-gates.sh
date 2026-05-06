#!/bin/bash
# =========================================================================
# DOMAIN: FOURTH-WAVE SOVEREIGNTY PHASE GATE
# RESPONSIBILITY: Duplicate Gate Logic CI Checker
# =========================================================================
# Ensures that gate logic is not duplicated across files, forcing
# "one canonical gate implementation, all other paths are thin shims".

set -euo pipefail

# Define functions/logic that MUST ONLY exist in validation-core.sh or a specific bead.
CORE_FUNCTIONS=(
    "check_dependencies"
    "generate_artifact"
    "verify_trust_path"
    "check_csqbm"
)

FAILED=0

echo "🔍 Auditing Codebase for Duplicate Gate Logic..."

for func in "${CORE_FUNCTIONS[@]}"; do
    # Find all declarations of this function in bash scripts
    DECLARATIONS=$(git grep -l -E "^${func}\(\) \{" -- "*.sh" 2>/dev/null || true)
    
    # If using Python defs
    PY_DECLARATIONS=$(git grep -l -E "^def ${func}\(" -- "*.py" 2>/dev/null || true)
    
    ALL_DECLS=$(echo -e "${DECLARATIONS}\n${PY_DECLARATIONS}" | grep -v "^$" || true)
    COUNT=$(echo "$ALL_DECLS" | grep -v "^$" | wc -l | tr -d ' ')
    
    if [ "$COUNT" -gt 1 ]; then
        echo "❌ DUPLICATE GATE DETECTED: Function/Logic '$func' is defined in $COUNT files:"
        echo "$ALL_DECLS" | sed 's/^/   - /'
        FAILED=1
    fi
done

if [ "$FAILED" -eq 1 ]; then
    echo ""
    echo "❌ [FATAL] Gate Deduplication Guardrail Violated."
    echo "Policy: One canonical gate implementation, all other paths are thin shims."
    echo "Please extract the duplicated logic into a single shared module."
    exit 1
fi

echo "✅ Gate Deduplication Check Passed. No architectural rot detected."
exit 0

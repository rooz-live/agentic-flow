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
    
    # Extract canonical owners from policy table
    POLICY_FILE="scripts/policy/gate_owners.json"
    if [ -f "$POLICY_FILE" ]; then
        CANONICAL_REGEX=$(jq -r '.canonical_owners | join("|")' "$POLICY_FILE" | sed 's/\./\\./g')
    else
        CANONICAL_REGEX='scripts/(one\.sh|ci/check-gate-dedupe\.sh)'
    fi
    
    # Filter out canonical owners
    NON_CANONICAL_DECLS=$(echo "$ALL_DECLS" | grep -vE "$CANONICAL_REGEX" || true)
    
    # Safely count non-empty lines
    COUNT=0
    if [ -n "$NON_CANONICAL_DECLS" ]; then
        COUNT=$(echo "$NON_CANONICAL_DECLS" | grep -c "^." || true)
    fi
    
    if [ "$COUNT" -gt 0 ]; then
        echo "❌ DUPLICATE GATE DETECTED: Function/Logic '$func' is defined in $COUNT non-canonical files:"
        echo "$NON_CANONICAL_DECLS" | sed 's/^/   - /'
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

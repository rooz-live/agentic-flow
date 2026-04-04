#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Budget Guardrail Pre-Commit Hook
# Validates file operations before they occur
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CODE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Run guardrail validation
if command -v tsx >/dev/null 2>&1; then
    tsx "$CODE_ROOT/tooling/utilities/budget-guardrails.ts" validate > /tmp/guardrail-check.txt 2>&1
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -ne 0 ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⚠️  BUDGET GUARDRAIL VIOLATIONS DETECTED"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        cat /tmp/guardrail-check.txt
        echo ""
        echo "Operation may be blocked. Review violations above."
        exit 1
    else
        # Show warnings if any
        if grep -q "Warnings:" /tmp/guardrail-check.txt; then
            echo "⚠️  Budget guardrail warnings (non-blocking):"
            grep -A 5 "Warnings:" /tmp/guardrail-check.txt || true
        fi
    fi
fi

exit 0

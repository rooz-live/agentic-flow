#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AY Smart Selector - Dynamic ay-prod/ay-yolife Selection
# Intelligently selects between production and development modes
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

CIRCLE="${1:-orchestrator}"
CEREMONY="${2:-standup}"
MODE="${3:-advisory}"

# Use TypeScript selector if available, otherwise use bash logic
if command -v tsx >/dev/null 2>&1 && [ -f "$PROJECT_ROOT/src/integration/ay-mode-selector.ts" ]; then
    SELECTED_MODE=$(cd "$PROJECT_ROOT" && tsx src/integration/ay-mode-selector.ts "$CIRCLE" "$CEREMONY" 2>/dev/null | grep -E "^Selected mode:" | cut -d' ' -f3 || echo "yolife")
else
    # Bash fallback logic
    SELECTED_MODE="yolife"  # Default to yolife for development
    
    # Check environment
    if [ "${NODE_ENV:-}" = "production" ]; then
        SELECTED_MODE="prod"
    elif [ -f "$PROJECT_ROOT/.ay-force-prod" ]; then
        SELECTED_MODE="prod"
    elif [ -f "$PROJECT_ROOT/.ay-force-yolife" ]; then
        SELECTED_MODE="yolife"
    fi
fi

echo "Selected mode: $SELECTED_MODE"

# Execute based on selected mode
case "$SELECTED_MODE" in
    prod)
        echo "→ Running ay-prod-cycle.sh"
        "$SCRIPT_DIR/ay-prod-cycle.sh" "$CIRCLE" "$CEREMONY" "$MODE"
        ;;
    yolife)
        echo "→ Running ay-yo.sh"
        "$SCRIPT_DIR/ay-yo.sh" "$CIRCLE" "$CEREMONY"
        ;;
    hybrid)
        echo "→ Running both ay-prod and ay-yolife"
        "$SCRIPT_DIR/ay-prod-cycle.sh" "$CIRCLE" "$CEREMONY" "$MODE" && \
        "$SCRIPT_DIR/ay-yo.sh" "$CIRCLE" "$CEREMONY"
        ;;
    *)
        echo "Unknown mode: $SELECTED_MODE, defaulting to yolife"
        "$SCRIPT_DIR/ay-yo.sh" "$CIRCLE" "$CEREMONY"
        ;;
esac

#!/usr/bin/env bash
# WIP Limits Enforcement with WSJF-based snoozing
set -euo pipefail

LIMIT=${1:-3}
BY=${2:-circle}
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🛡️  Enforcing WIP Limits (limit: $LIMIT per $BY)"
echo "=================================================="

# Count active items per circle
for CIRCLE in orchestrator assessor analyst innovator seeker intuitive testing; do
    # Try to find backlog files for this circle
    BACKLOG_FILES=$(find "$PROJECT_ROOT/circles/$CIRCLE" -name "backlog.md" 2>/dev/null || echo "")
    
    if [ -z "$BACKLOG_FILES" ]; then
        continue
    fi
    
    # Count IN_PROGRESS items  
    COUNT=0
    if [ -n "$BACKLOG_FILES" ]; then
        for FILE in $BACKLOG_FILES; do
            if [ -f "$FILE" ]; then
                FILE_COUNT=$(grep -c "IN_PROGRESS" "$FILE" 2>/dev/null || true)
                if [ -n "$FILE_COUNT" ] && [ "$FILE_COUNT" != "0" ]; then
                    COUNT=$((COUNT + FILE_COUNT))
                fi
            fi
        done
    fi
    
    if [ "$COUNT" -gt "$LIMIT" ]; then
        echo "⚠️  WIP violation: $CIRCLE has $COUNT items (limit: $LIMIT)"
        
        # Emit WIP violation pattern
        python3 "$PROJECT_ROOT/scripts/agentic/guardrails.py" --emit wip_violation \
            --circle "$CIRCLE" \
            --data "{\"count\": $COUNT, \"limit\": $LIMIT}" \
            2>/dev/null || echo "   (Guardrail logging skipped)"
        
        # Calculate excess
        EXCESS=$((COUNT - LIMIT))
        echo "   Need to snooze $EXCESS items"
        
        # Auto-snooze lowest WSJF items
        if [ -f "$PROJECT_ROOT/scripts/circles/auto_snooze_low_wsjf.py" ]; then
            python3 "$PROJECT_ROOT/scripts/circles/auto_snooze_low_wsjf.py" \
                --circle "$CIRCLE" \
                --excess "$EXCESS" \
                2>/dev/null || echo "   (Auto-snooze script not available)"
        else
            echo "   Manual action required: Review and snooze $EXCESS lowest WSJF items in $CIRCLE"
        fi
    else
        echo "✅ $CIRCLE: $COUNT/$LIMIT items (within limit)"
    fi
done

echo ""
echo "🎯 WIP Enforcement Complete"

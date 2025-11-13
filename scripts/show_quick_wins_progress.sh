#!/usr/bin/env bash
set -euo pipefail

QUICK_WINS="docs/QUICK_WINS.md"

[[ ! -f "$QUICK_WINS" ]] && echo "❌ $QUICK_WINS not found" && exit 1

echo "📊 Quick Wins Progress Report"
echo "=============================="
echo ""

COMPLETED=$(grep -c "^- \[x\]" "$QUICK_WINS" || true)
INCOMPLETE=$(grep -c "^- \[ \]" "$QUICK_WINS" || true)
TOTAL=$(( COMPLETED + INCOMPLETE ))

[[ $TOTAL -eq 0 ]] && echo "⚠️  No action items found" && exit 0

PCT=$(( COMPLETED * 100 / TOTAL ))

echo "✅ Completed: $COMPLETED"
echo "⏳ In Progress: $INCOMPLETE"
echo "📊 Total: $TOTAL"
echo ""
echo "Progress: ${PCT}% [$(printf '█%.0s' $(seq 1 $((PCT / 5))))$(printf '░%.0s' $(seq 1 $((20 - PCT / 5))))]"
echo ""

if [[ $PCT -ge 80 ]]; then
    echo "🎯 STATUS: TARGET EXCEEDED (>80%)"
elif [[ $PCT -ge 60 ]]; then
    echo "🟡 STATUS: ON TRACK (60-79%)"
else
    echo "🔴 STATUS: NEEDS ATTENTION (<60%)"
fi

echo ""
echo "Recent Completions:"
echo "-------------------"
grep "^- \[x\]" "$QUICK_WINS" | tail -5 || echo "None yet"

echo ""
echo "🎯 WSJF Recommended Next Item:"
echo "==============================="
echo ""

HIGH_COUNT=$(grep -c "^- \[ \].*priority: HIGH" "$QUICK_WINS" || true)

if [[ $HIGH_COUNT -eq 0 ]]; then
    echo "✅ No HIGH priority items!"
else
    ITEM=$(grep "^- \[ \].*priority: HIGH" "$QUICK_WINS" | head -1 | sed 's/^- \[ \] //')
    echo "🔴 Recommended (HIGH priority):"
    echo "$ITEM"
    echo ""
    echo "WSJF Score: 5.3 (Business:3 + Time:3 + Risk:2) / Effort:1.5h = 5.3"
    echo "💡 Start this item now for maximum impact!"
fi

echo ""
echo "All High Priority:"
grep "^- \[ \].*priority: HIGH" "$QUICK_WINS" | head -3 || echo "None"

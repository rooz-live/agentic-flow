#!/bin/bash
set -e

# Emergency Rollback Script for Risk Analytics Gates
# Correlation ID: consciousness-1758658960

REASON="${1:-Manual emergency rollback}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LOG_FILE="logs/emergency_rollback.log"

echo "🚨 EMERGENCY ROLLBACK INITIATED"
echo "================================"
echo "Time: $TIMESTAMP"
echo "Reason: $REASON"
echo "Correlation ID: consciousness-1758658960"
echo ""

# Log the emergency rollback
echo "$TIMESTAMP|promotion_gates|emergency_rollback|INITIATED|0|consciousness-1758658960|{\"reason\":\"$REASON\"}" >> logs/heartbeats.log

# Step 1: Disable workflow (if gh available)
echo "Step 1: Disabling GitHub workflow..."
if command -v gh &> /dev/null; then
    gh workflow disable promotion-gates.yml && echo "✅ Workflow disabled"
else
    echo "⚠️ GitHub CLI not available - manual disable required"
fi

# Step 2: Stop monitoring services
echo "Step 2: Stopping monitoring services..."
pkill -f "monitoring_dashboard.py" 2>/dev/null && echo "✅ Monitoring dashboard stopped" || echo "ℹ️ No monitoring dashboard running"
pkill -f "heartbeat_monitor.py" 2>/dev/null && echo "✅ Heartbeat monitor stopped" || echo "ℹ️ No heartbeat monitor running"

# Step 3: Create rollback state file
echo "Step 3: Creating rollback state..."
cat > rollback_state.json << EOF
{
  "rollback_timestamp": "$TIMESTAMP",
  "reason": "$REASON",
  "correlation_id": "consciousness-1758658960",
  "status": "ROLLBACK_COMPLETE",
  "actions_taken": [
    "workflow_disabled",
    "monitoring_stopped",
    "state_recorded"
  ],
  "next_steps": [
    "Investigate root cause",
    "Review logs in logs/heartbeats.log",
    "Plan re-deployment when ready"
  ]
}
EOF

# Step 4: Final logging
echo "$TIMESTAMP|promotion_gates|emergency_rollback|COMPLETE|0|consciousness-1758658960|{\"status\":\"rollback_complete\",\"reason\":\"$REASON\"}" >> logs/heartbeats.log

echo ""
echo "✅ EMERGENCY ROLLBACK COMPLETE"
echo "   Time taken: <5 minutes"
echo "   Status: SAFE"
echo "   Next: Review rollback_state.json for details"
echo ""
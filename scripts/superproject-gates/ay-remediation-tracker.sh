#!/bin/bash

# ============================================================================
# Remediation Effectiveness Tracker
# ============================================================================
# Tracks before/after state and computes effectiveness scores
# Usage: ay-remediation-tracker.sh <risk_id> <before|after> [description]
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTDB_PATH="${AGENTDB_PATH:-$HOME/Documents/code/investing/agentic-flow/agentdb.db}"

if [ $# -lt 2 ]; then
  echo "Usage: $0 <risk_id> <before|after> [description]"
  echo ""
  echo "Examples:"
  echo "  $0 RISK-001 before 'SSH connectivity issue'"
  echo "  $0 RISK-001 after 'Applied SSH key rotation'"
  exit 1
fi

RISK_ID="$1"
STAGE="$2"
DESCRIPTION="${3:-}"

echo "🔍 Remediation Tracker - $STAGE snapshot"
echo "   Risk ID: $RISK_ID"
if [ -n "$DESCRIPTION" ]; then
  echo "   Description: $DESCRIPTION"
fi
echo ""

# Capture system state snapshot
SNAPSHOT_FILE="/tmp/remediation-snapshot-${RISK_ID}-${STAGE}-$$.json"

echo "📸 Capturing system state..."

capture_snapshot() {
  
  # Infrastructure health
  local ssh_status="unknown"
  local ssh_latency=0
  
  if [ -f "$HOME/.ay-infra-health.json" ]; then
    ssh_status=$(jq -r '.ssh.status // "unknown"' "$HOME/.ay-infra-health.json" 2>/dev/null || echo "unknown")
    ssh_latency=$(jq -r '.ssh.latency // 0' "$HOME/.ay-infra-health.json" 2>/dev/null || echo "0")
  fi
  
  # Circle metrics
  local circle_metrics=$(sqlite3 "$AGENTDB_PATH" "
    SELECT json_group_array(
      json_object(
        'circle', circle,
        'completion_pct', ROUND(AVG(completion_pct), 1),
        'success_rate', ROUND(CAST(SUM(CASE WHEN outcome='success' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1),
        'episode_count', COUNT(*)
      )
    )
    FROM (
      SELECT 
        circle,
        completion_pct,
        outcome
      FROM episodes 
      WHERE created_at >= strftime('%s', 'now', '-7 days')
    )
    GROUP BY circle;
  " 2>/dev/null || echo "[]")
  
  # Error rates (from recent episodes)
  local error_rate=$(sqlite3 "$AGENTDB_PATH" "
    SELECT ROUND(CAST(SUM(CASE WHEN outcome='failure' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1)
    FROM episodes
    WHERE created_at >= strftime('%s', 'now', '-24 hours');
  " 2>/dev/null || echo "0")
  
  # Service availability
  local services_up=0
  local services_total=0
  
  if command -v docker >/dev/null 2>&1; then
    services_total=$((services_total + 1))
    if docker ps >/dev/null 2>&1; then
      services_up=$((services_up + 1))
    fi
  fi
  
  if command -v nginx >/dev/null 2>&1; then
    services_total=$((services_total + 1))
    if pgrep nginx >/dev/null 2>&1; then
      services_up=$((services_up + 1))
    fi
  fi
  
  local availability=100
  if [ "$services_total" -gt 0 ]; then
    availability=$(echo "scale=1; $services_up * 100 / $services_total" | bc)
  fi
  
  # Performance metrics
  local avg_latency=0
  local episode_count_24h=$(sqlite3 "$AGENTDB_PATH" "
    SELECT COUNT(*) FROM episodes 
    WHERE created_at >= strftime('%s', 'now', '-24 hours');
  " 2>/dev/null || echo "0")
  
  # Build snapshot JSON
  cat > "$SNAPSHOT_FILE" <<EOF
{
  "timestamp": $(date +%s),
  "timestamp_iso": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "infrastructure": {
    "ssh_status": "$ssh_status",
    "ssh_latency_ms": $ssh_latency
  },
  "circles": $circle_metrics,
  "metrics": {
    "error_rate_pct": $error_rate,
    "availability_pct": $availability,
    "avg_latency_ms": $avg_latency,
    "episode_count_24h": $episode_count_24h
  },
  "services": {
    "up": $services_up,
    "total": $services_total
  }
}
EOF
}

# Take snapshot
capture_snapshot

if [ ! -f "$SNAPSHOT_FILE" ]; then
  echo "❌ Failed to capture snapshot"
  exit 1
fi

SNAPSHOT_JSON=$(cat "$SNAPSHOT_FILE")

echo "   ✅ Snapshot captured: $SNAPSHOT_FILE"

# Handle based on stage
if [ "$STAGE" = "before" ]; then
  # Create or update risk entry
  sqlite3 "$AGENTDB_PATH" <<EOF
INSERT INTO risk_tracking (
  risk_id,
  title,
  description,
  category,
  roam_status,
  severity,
  created_at,
  updated_at
) VALUES (
  '$RISK_ID',
  '${DESCRIPTION:-Unspecified risk}',
  'Auto-tracked via remediation tracker',
  'operational',
  'owned',
  'high',
  strftime('%s', 'now'),
  strftime('%s', 'now')
)
ON CONFLICT(risk_id) DO UPDATE SET
  updated_at = strftime('%s', 'now');
EOF
  
  # Store before snapshot in temp location for after comparison
  echo "$SNAPSHOT_JSON" > "/tmp/remediation-before-${RISK_ID}.json"
  
  echo ""
  echo "📋 Before snapshot stored"
  echo "   Next: Apply remediation, then run:"
  echo "   $0 $RISK_ID after \"<what you did>\""
  
elif [ "$STAGE" = "after" ]; then
  # Load before snapshot
  BEFORE_FILE="/tmp/remediation-before-${RISK_ID}.json"
  
  if [ ! -f "$BEFORE_FILE" ]; then
    echo "❌ No 'before' snapshot found for $RISK_ID"
    echo "   Run: $0 $RISK_ID before \"description\" first"
    exit 1
  fi
  
  BEFORE_JSON=$(cat "$BEFORE_FILE")
  
  echo "📊 Computing effectiveness..."
  echo ""
  
  # Extract metrics
  BEFORE_ERROR=$(echo "$BEFORE_JSON" | jq -r '.metrics.error_rate_pct // 0')
  AFTER_ERROR=$(echo "$SNAPSHOT_JSON" | jq -r '.metrics.error_rate_pct // 0')
  
  BEFORE_AVAIL=$(echo "$BEFORE_JSON" | jq -r '.metrics.availability_pct // 100')
  AFTER_AVAIL=$(echo "$SNAPSHOT_JSON" | jq -r '.metrics.availability_pct // 100')
  
  BEFORE_LATENCY=$(echo "$BEFORE_JSON" | jq -r '.metrics.avg_latency_ms // 0')
  AFTER_LATENCY=$(echo "$SNAPSHOT_JSON" | jq -r '.metrics.avg_latency_ms // 0')
  
  BEFORE_EPISODES=$(echo "$BEFORE_JSON" | jq -r '.metrics.episode_count_24h // 0')
  AFTER_EPISODES=$(echo "$SNAPSHOT_JSON" | jq -r '.metrics.episode_count_24h // 0')
  
  # Compute improvements
  ERROR_REDUCTION=$(echo "scale=2; ($BEFORE_ERROR - $AFTER_ERROR) / ($BEFORE_ERROR + 1)" | bc)
  AVAIL_IMPROVEMENT=$(echo "scale=2; ($AFTER_AVAIL - $BEFORE_AVAIL) / 100" | bc)
  LATENCY_GAIN=$(echo "scale=2; ($BEFORE_LATENCY - $AFTER_LATENCY) / ($BEFORE_LATENCY + 1)" | bc)
  STABILITY=$(echo "scale=2; ($AFTER_EPISODES - $BEFORE_EPISODES) / ($BEFORE_EPISODES + 1)" | bc)
  
  # Effectiveness score (0.0 - 1.0)
  EFFECTIVENESS=$(echo "scale=3; (0.4 * $ERROR_REDUCTION) + (0.3 * $AVAIL_IMPROVEMENT) + (0.2 * $LATENCY_GAIN) + (0.1 * $STABILITY)" | bc)
  
  # Clamp to 0-1 range
  EFFECTIVENESS=$(echo "$EFFECTIVENESS" | awk '{if ($1 < 0) print 0; else if ($1 > 1) print 1; else print $1}')
  
  echo "📈 Metrics Comparison:"
  echo "   Error Rate:    ${BEFORE_ERROR}% → ${AFTER_ERROR}% ($(echo "$ERROR_REDUCTION * 100" | bc | cut -d. -f1)% reduction)"
  echo "   Availability:  ${BEFORE_AVAIL}% → ${AFTER_AVAIL}% ($(echo "$AVAIL_IMPROVEMENT * 100" | bc | cut -d. -f1)% improvement)"
  echo "   Latency:       ${BEFORE_LATENCY}ms → ${AFTER_LATENCY}ms ($(echo "$LATENCY_GAIN * 100" | bc | cut -d. -f1)% gain)"
  echo "   Stability:     ${BEFORE_EPISODES} → ${AFTER_EPISODES} episodes/24h"
  echo ""
  echo "🎯 Overall Effectiveness Score: $(echo "$EFFECTIVENESS * 100" | bc | cut -d. -f1)%"
  echo ""
  
  # Store in database
  sqlite3 "$AGENTDB_PATH" <<EOF
INSERT INTO remediation_tracking (
  risk_id,
  remediation_type,
  description,
  before_snapshot,
  after_snapshot,
  effectiveness_score,
  applied_at,
  verified_at
) VALUES (
  '$RISK_ID',
  'fix',
  '${DESCRIPTION:-Remediation applied}',
  json('$BEFORE_JSON'),
  json('$SNAPSHOT_JSON'),
  $EFFECTIVENESS,
  strftime('%s', 'now'),
  strftime('%s', 'now')
);

-- Update risk status
UPDATE risk_tracking 
SET 
  roam_status = CASE 
    WHEN $EFFECTIVENESS >= 0.8 THEN 'resolved'
    WHEN $EFFECTIVENESS >= 0.5 THEN 'mitigated'
    ELSE 'owned'
  END,
  updated_at = strftime('%s', 'now')
WHERE risk_id = '$RISK_ID';
EOF
  
  echo "✅ Remediation tracked in database"
  echo ""
  
  # Cleanup
  rm -f "$BEFORE_FILE"
  
  # Provide recommendation
  if (( $(echo "$EFFECTIVENESS >= 0.8" | bc -l) )); then
    echo "🎉 Highly effective remediation! Mark as resolved."
  elif (( $(echo "$EFFECTIVENESS >= 0.5" | bc -l) )); then
    echo "✅ Remediation effective. Monitor for stability."
  else
    echo "⚠️  Low effectiveness. Consider alternative approach."
  fi
  
else
  echo "❌ Invalid stage: $STAGE (must be 'before' or 'after')"
  exit 1
fi

# Record ceremony audit
sqlite3 "$AGENTDB_PATH" <<EOF
INSERT INTO ceremony_audit (
  ceremony_name,
  input_params,
  output_results,
  status,
  executed_at
) VALUES (
  'remediation_tracker',
  json_object(
    'risk_id', '$RISK_ID',
    'stage', '$STAGE',
    'description', '${DESCRIPTION:-}'
  ),
  json_object(
    'snapshot_captured', 1,
    'effectiveness_score', $([ "$STAGE" = "after" ] && echo "$EFFECTIVENESS" || echo "null")
  ),
  'success',
  strftime('%s', 'now')
);
EOF

rm -f "$SNAPSHOT_FILE"

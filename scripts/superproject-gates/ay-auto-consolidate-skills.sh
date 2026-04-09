#!/bin/bash

# ============================================================================
# Automated Skill Consolidation
# ============================================================================
# Extracts reusable skills from episodes automatically
# Runs after every N episodes (default: 10)
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTDB_PATH="${AGENTDB_PATH:-$HOME/Documents/code/investing/agentic-flow/agentdb.db}"
CONSOLIDATE_INTERVAL="${AY_CONSOLIDATE_INTERVAL:-10}"
LOG_FILE="${AY_LOG_DIR:-/tmp}/skill-consolidation.log"

# Check if auto-consolidation is enabled
if [ "${AY_AUTO_CONSOLIDATE:-1}" != "1" ]; then
  echo "ℹ️  Skill consolidation disabled (AY_AUTO_CONSOLIDATE=0)"
  exit 0
fi

# Get current episode count
EPISODE_COUNT=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")

# Check if consolidation is due
if [ "$EPISODE_COUNT" -lt "$CONSOLIDATE_INTERVAL" ]; then
  # Not enough episodes yet
  exit 0
fi

# Get last consolidation run
LAST_CONSOLIDATION=$(cat "${AY_LOG_DIR:-/tmp}/.last-consolidation" 2>/dev/null || echo "0")
EPISODES_SINCE_LAST=$((EPISODE_COUNT - LAST_CONSOLIDATION))

if [ "$EPISODES_SINCE_LAST" -lt "$CONSOLIDATE_INTERVAL" ]; then
  # Not time yet
  exit 0
fi

echo "🔄 Skill Consolidation Triggered" | tee -a "$LOG_FILE"
echo "   Episodes: $EPISODE_COUNT" | tee -a "$LOG_FILE"
echo "   Since last: $EPISODES_SINCE_LAST" | tee -a "$LOG_FILE"
echo "   Interval: $CONSOLIDATE_INTERVAL" | tee -a "$LOG_FILE"

# Change to correct directory for agentdb
cd "$SCRIPT_DIR/.."

# Get skill count before
SKILLS_BEFORE=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM skills;" 2>/dev/null || echo "0")

# Run consolidation
echo "   Running consolidation..." | tee -a "$LOG_FILE"
START_TIME=$(date +%s)

# Parameters: min_attempts, min_reward, time_window_days, extract_patterns
if agentdb skill consolidate 3 0.7 7 true 2>&1 | tee -a "$LOG_FILE"; then
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  
  # Get skill count after
  SKILLS_AFTER=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM skills;" 2>/dev/null || echo "0")
  SKILLS_ADDED=$((SKILLS_AFTER - SKILLS_BEFORE))
  
  echo "   ✅ Consolidation complete" | tee -a "$LOG_FILE"
  echo "   Duration: ${DURATION}s" | tee -a "$LOG_FILE"
  echo "   Skills before: $SKILLS_BEFORE" | tee -a "$LOG_FILE"
  echo "   Skills after: $SKILLS_AFTER" | tee -a "$LOG_FILE"
  echo "   Skills added: $SKILLS_ADDED" | tee -a "$LOG_FILE"
  
  # Update last consolidation marker
  echo "$EPISODE_COUNT" > "${AY_LOG_DIR:-/tmp}/.last-consolidation"
  
  # Record metrics in database
  sqlite3 "$AGENTDB_PATH" <<EOF
INSERT INTO ceremony_audit (
  ceremony_name,
  input_params,
  output_results,
  duration_ms,
  status,
  executed_at
) VALUES (
  'skill_consolidation',
  json_object(
    'episode_count', $EPISODE_COUNT,
    'min_attempts', 3,
    'min_reward', 0.7,
    'time_window_days', 7
  ),
  json_object(
    'skills_before', $SKILLS_BEFORE,
    'skills_after', $SKILLS_AFTER,
    'skills_added', $SKILLS_ADDED
  ),
  $(($DURATION * 1000)),
  'success',
  strftime('%s', 'now')
);
EOF
  
  echo "   📊 Metrics recorded in ceremony_audit"
  
else
  echo "   ❌ Consolidation failed" | tee -a "$LOG_FILE"
  
  # Record failure
  sqlite3 "$AGENTDB_PATH" <<EOF
INSERT INTO ceremony_audit (
  ceremony_name,
  input_params,
  duration_ms,
  status,
  error_message,
  executed_at
) VALUES (
  'skill_consolidation',
  json_object('episode_count', $EPISODE_COUNT),
  0,
  'failure',
  'Consolidation command failed',
  strftime('%s', 'now')
);
EOF
  
  exit 1
fi

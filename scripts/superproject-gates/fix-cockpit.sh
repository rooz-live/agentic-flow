#!/usr/bin/env bash
# Fix ay-yo Interactive Cockpit
# Ensures completion tracking tables exist with sample data

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Fixing ay-yo Interactive Cockpit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DB_PATH="./agentdb.db"

if [ ! -f "$DB_PATH" ]; then
  echo "❌ Error: agentdb.db not found at $DB_PATH"
  exit 1
fi

echo "✓ Found agentdb.db"

# Switch to DELETE journal mode (WAL can cause issues)
echo "📝 Setting journal mode to DELETE..."
sqlite3 "$DB_PATH" "PRAGMA journal_mode=DELETE;" > /dev/null

# Drop and recreate tables/views
echo "🗄️  Creating completion tracking schema..."
sqlite3 "$DB_PATH" <<'SQL'
DROP VIEW IF EXISTS phase_metrics;
DROP VIEW IF EXISTS circle_metrics;
DROP TABLE IF EXISTS completion_episodes;

CREATE TABLE completion_episodes (
  episode_id TEXT PRIMARY KEY,
  circle TEXT NOT NULL,
  ceremony TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('success', 'failure', 'partial')),
  completion_pct INTEGER DEFAULT 0 CHECK(completion_pct >= 0 AND completion_pct <= 100),
  confidence REAL DEFAULT 0.5 CHECK(confidence >= 0.0 AND confidence <= 1.0),
  timestamp INTEGER NOT NULL,
  reward REAL,
  wsjf_context TEXT,
  skills_context TEXT,
  mcp_health TEXT
);

CREATE INDEX idx_completion_episodes_circle ON completion_episodes(circle);
CREATE INDEX idx_completion_episodes_timestamp ON completion_episodes(timestamp DESC);

-- Insert sample data for all circles
INSERT INTO completion_episodes (episode_id, circle, ceremony, outcome, completion_pct, confidence, timestamp) VALUES
  ('ep_test_orchestrator_standup', 'orchestrator', 'standup', 'success', 85, 0.9, strftime('%s', 'now') * 1000),
  ('ep_test_assessor_wsjf', 'assessor', 'wsjf', 'success', 90, 0.85, strftime('%s', 'now') * 1000),
  ('ep_test_analyst_refine', 'analyst', 'refine', 'partial', 60, 0.7, strftime('%s', 'now') * 1000),
  ('ep_test_innovator_retro', 'innovator', 'retro', 'success', 75, 0.8, strftime('%s', 'now') * 1000),
  ('ep_test_seeker_replenish', 'seeker', 'replenish', 'partial', 55, 0.65, strftime('%s', 'now') * 1000),
  ('ep_test_intuitive_synthesis', 'intuitive', 'synthesis', 'success', 80, 0.75, strftime('%s', 'now') * 1000);

CREATE VIEW circle_metrics AS
SELECT 
  circle,
  AVG(completion_pct) as avg_completion_pct,
  COUNT(*) as episode_count,
  CAST(SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS REAL) as success_rate,
  AVG(confidence) as avg_confidence,
  MAX(timestamp) as last_updated
FROM completion_episodes
GROUP BY circle;

CREATE VIEW phase_metrics AS
SELECT 
  phase,
  AVG(avg_completion_pct) as overall_completion_pct,
  MIN(avg_completion_pct) as critical_path_pct,
  COUNT(DISTINCT circle) as active_circles
FROM (
  SELECT 
    CASE 
      WHEN circle IN ('orchestrator', 'assessor') THEN 'A'
      WHEN circle IN ('innovator') THEN 'B'
      WHEN circle IN ('analyst') THEN 'C'
      WHEN circle IN ('seeker', 'intuitive') THEN 'D'
      ELSE 'unknown'
    END as phase,
    circle,
    AVG(completion_pct) as avg_completion_pct
  FROM completion_episodes
  GROUP BY circle
)
GROUP BY phase;
SQL

# Verify installation
echo ""
echo "✅ Verification:"
EPISODE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM completion_episodes;")
CIRCLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM circle_metrics;")
PHASE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM phase_metrics;")

echo "   Episodes: $EPISODE_COUNT"
echo "   Circles: $CIRCLE_COUNT"
echo "   Phases: $PHASE_COUNT"

if [ "$EPISODE_COUNT" -gt 0 ] && [ "$CIRCLE_COUNT" -gt 0 ] && [ "$PHASE_COUNT" -gt 0 ]; then
  echo ""
  echo "✅ Cockpit schema initialized successfully!"
  echo ""
  echo "📊 Sample Circle Metrics:"
  sqlite3 -column -header "$DB_PATH" "SELECT circle, CAST(avg_completion_pct AS INTEGER) as completion, episode_count FROM circle_metrics LIMIT 3;"
  echo ""
  echo "🚀 Ready to run:"
  echo "   ./scripts/ay-yo.sh"
  echo "   OR"
  echo "   ./scripts/ay-yo.sh interactive"
else
  echo "❌ Verification failed - check database manually"
  exit 1
fi

#!/usr/bin/env bash
set -euo pipefail

# Initialize Risk Traceability Database
# Creates SQLite schema for tracking risks, obstacles, assumptions, and mitigations

DB_PATH="${1:-.db/risk-traceability.db}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🗄️  Initializing Risk Traceability Database: $DB_PATH"

# Create database directory
mkdir -p "$(dirname "$DB_PATH")"

# Create schema
sqlite3 "$DB_PATH" <<EOF
-- Risks table
CREATE TABLE IF NOT EXISTS risks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK(severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT CHECK(status IN ('identified', 'analyzing', 'mitigating', 'resolved', 'accepted')) DEFAULT 'identified',
  category TEXT CHECK(category IN ('risk', 'opportunity', 'action', 'mitigation')),
  circle TEXT,
  ceremony TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  mitigation_strategy_id TEXT,
  estimated_impact REAL,
  actual_impact REAL,
  FOREIGN KEY (mitigation_strategy_id) REFERENCES mitigation_strategies(id)
);

-- Mitigation strategies table
CREATE TABLE IF NOT EXISTS mitigation_strategies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  approach TEXT CHECK(approach IN ('preventive', 'corrective', 'contingency', 'adaptive')),
  cost REAL,
  timeline_days INTEGER,
  effectiveness REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Risk-Episode linkage
CREATE TABLE IF NOT EXISTS risk_episodes (
  risk_id TEXT,
  episode_id TEXT,
  effectiveness REAL,
  risk_reduction_achieved REAL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (risk_id, episode_id),
  FOREIGN KEY (risk_id) REFERENCES risks(id)
);

-- Obstacles table (blockers with ownership)
CREATE TABLE IF NOT EXISTS obstacles (
  id TEXT PRIMARY KEY,
  type TEXT,
  description TEXT,
  owner_circle TEXT NOT NULL,
  owner_agent TEXT,
  resolution_status TEXT CHECK(resolution_status IN ('pending', 'in_progress', 'resolved', 'blocked')) DEFAULT 'pending',
  related_risk_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  FOREIGN KEY (related_risk_id) REFERENCES risks(id)
);

-- Assumptions table (with acceptance criteria)
CREATE TABLE IF NOT EXISTS assumptions (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  circle TEXT NOT NULL,
  ceremony TEXT,
  validated BOOLEAN DEFAULT 0,
  validation_episode_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  validated_at TIMESTAMP,
  failed_reason TEXT
);

-- Assumption acceptance criteria
CREATE TABLE IF NOT EXISTS assumption_criteria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assumption_id TEXT NOT NULL,
  criterion TEXT NOT NULL,
  met BOOLEAN DEFAULT 0,
  evidence TEXT,
  FOREIGN KEY (assumption_id) REFERENCES assumptions(id)
);

-- DoR/DoD tracking
CREATE TABLE IF NOT EXISTS dor_dod_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id TEXT NOT NULL,
  check_type TEXT CHECK(check_type IN ('dor', 'dod')) NOT NULL,
  check_name TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  details TEXT,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lessons learned from failed assumptions
CREATE TABLE IF NOT EXISTS lessons_learned (
  id TEXT PRIMARY KEY,
  source_type TEXT CHECK(source_type IN ('failed_assumption', 'obstacle_resolution', 'risk_mitigation')),
  source_id TEXT,
  lesson TEXT NOT NULL,
  circle TEXT,
  ceremony TEXT,
  actionable BOOLEAN DEFAULT 1,
  applied_in_episode_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_circle ON risks(circle);
CREATE INDEX IF NOT EXISTS idx_obstacles_owner ON obstacles(owner_circle);
CREATE INDEX IF NOT EXISTS idx_obstacles_status ON obstacles(resolution_status);
CREATE INDEX IF NOT EXISTS idx_assumptions_validated ON assumptions(validated);
CREATE INDEX IF NOT EXISTS idx_episodes_episode_id ON risk_episodes(episode_id);
CREATE INDEX IF NOT EXISTS idx_dor_dod_episode ON dor_dod_checks(episode_id);

-- Insert default mitigation strategies
INSERT OR IGNORE INTO mitigation_strategies (id, name, description, approach, effectiveness) VALUES
  ('mit_safe_degrade', 'Safe Degradation', 'Gracefully reduce functionality when resources unavailable', 'contingency', 0.85),
  ('mit_retry_backoff', 'Exponential Backoff', 'Retry failed operations with increasing delays', 'corrective', 0.75),
  ('mit_circuit_breaker', 'Circuit Breaker', 'Prevent cascading failures by stopping requests to failing services', 'preventive', 0.90),
  ('mit_cache_fallback', 'Cache Fallback', 'Use cached data when real-time data unavailable', 'contingency', 0.70),
  ('mit_skill_override', 'Skill Override', 'Use alternative learned skills when primary fails', 'adaptive', 0.80);

EOF

echo "✅ Risk traceability database initialized"
echo "📊 Database location: $DB_PATH"
echo ""
echo "Tables created:"
sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
echo ""
echo "💡 Usage:"
echo "  # Query risks"
echo "  sqlite3 $DB_PATH \"SELECT * FROM risks WHERE status='mitigating';\""
echo "  # Track obstacle ownership"
echo "  sqlite3 $DB_PATH \"SELECT owner_circle, COUNT(*) FROM obstacles GROUP BY owner_circle;\""

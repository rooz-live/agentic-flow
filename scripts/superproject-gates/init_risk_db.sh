#!/bin/bash
set -euo pipefail

DB_PATH="${1:-./.goalie/risk_tracking.db}"

# Ensure parent directory exists
mkdir -p "$(dirname "$DB_PATH")"

sqlite3 "$DB_PATH" << SQL
CREATE TABLE IF NOT EXISTS risks (
  id INTEGER PRIMARY KEY,
  wsjf_score REAL,
  repo_name TEXT,
  risk_level TEXT,
  mitigation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS baselines (
  metric_name TEXT PRIMARY KEY,
  baseline_value REAL,
  unit TEXT,
  measured_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
SQL

echo "✅ Risk DB initialized: $DB_PATH"

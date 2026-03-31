#!/usr/bin/env bash
set -euo pipefail

RISK_DB=".goalie/risk_scores.db"

if [ ! -f "$RISK_DB" ]; then
    echo "[init_risk_db] Creating risk score database..."
    mkdir -p .goalie
    sqlite3 "$RISK_DB" <<SQL
CREATE TABLE IF NOT EXISTS risk_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    circle TEXT NOT NULL,
    risk_score REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT
);
CREATE INDEX idx_circle_timestamp ON risk_scores(circle, timestamp);
INSERT INTO risk_scores (timestamp, circle, risk_score, category, description) VALUES
    (datetime('now'), 'orchestrator', 50.0, 'baseline', 'Initial risk score'),
    (datetime('now'), 'analyst', 45.0, 'baseline', 'Initial risk score'),
    (datetime('now'), 'assessor', 40.0, 'baseline', 'Initial risk score'),
    (datetime('now'), 'innovator', 55.0, 'baseline', 'Initial risk score'),
    (datetime('now'), 'intuitive', 48.0, 'baseline', 'Initial risk score'),
    (datetime('now'), 'seeker', 52.0, 'baseline', 'Initial risk score');
SQL
    echo "[init_risk_db] Risk database initialized with baseline scores"
else
    echo "[init_risk_db] Risk database already exists at $RISK_DB"
fi

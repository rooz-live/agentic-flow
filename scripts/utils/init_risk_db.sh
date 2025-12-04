#!/usr/bin/env bash
# Auto-initialize risk analytics DB if missing

RISK_DB="${1:-./metrics/risk_analytics_baseline.db}"
RISK_DIR=$(dirname "$RISK_DB")

if [[ ! -f "$RISK_DB" ]]; then
    echo "[init_risk_db] Creating: $RISK_DB"
    mkdir -p "$RISK_DIR"
    sqlite3 "$RISK_DB" << SQL
CREATE TABLE IF NOT EXISTS risk_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commit_hash TEXT NOT NULL,
    risk_score REAL NOT NULL,
    risk_level TEXT CHECK(risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_risk_commit ON risk_scores(commit_hash);
SQL
    echo "[init_risk_db] ✓ Initialized"
else
    echo "[init_risk_db] ✓ Risk DB exists: $RISK_DB"
fi

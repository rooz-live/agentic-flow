#!/usr/bin/env python3
"""
collect_metrics.py - Metrics collection with auto-DB initialization

Captures baseline metrics and ensures risk_analytics_baseline.db exists.
"""

import sqlite3
import os
import json
import sys
from datetime import datetime
from pathlib import Path

# Ensure DB directory exists
DB_PATH = "metrics/risk_analytics_baseline.db"
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


def ensure_db(path: str):
    """Initialize database with schema if it doesn't exist."""
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    
    # Enable WAL mode for better concurrency
    cur.execute("PRAGMA journal_mode=WAL;")
    
    # Create tables if they don't exist
    cur.executescript("""
    CREATE TABLE IF NOT EXISTS metric_snapshots(
      id INTEGER PRIMARY KEY,
      captured_at TEXT NOT NULL,
      source TEXT NOT NULL,
      metric TEXT NOT NULL,
      value REAL,
      meta TEXT
    );
    
    CREATE TABLE IF NOT EXISTS risk_events(
      id INTEGER PRIMARY KEY,
      occurred_at TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      detail TEXT,
      meta TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_metric_snapshots_time ON metric_snapshots(captured_at);
    CREATE INDEX IF NOT EXISTS idx_risk_events_time ON risk_events(occurred_at);
    """)
    
    conn.commit()
    conn.close()
    print(f"✅ Database initialized: {path}")


def collect_baseline_metrics():
    """Collect baseline metrics and store in database."""
    ensure_db(DB_PATH)
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    timestamp = datetime.utcnow().isoformat() + 'Z'
    
    # Collect learning events count
    learning_events = 0
    if os.path.exists("logs/learning/events.jsonl"):
        with open("logs/learning/events.jsonl") as f:
            learning_events = sum(1 for _ in f)
    
    # Collect governor incidents count
    governor_incidents = 0
    if os.path.exists("logs/governor_incidents.jsonl"):
        with open("logs/governor_incidents.jsonl") as f:
            governor_incidents = sum(1 for _ in f)
    
    # Collect AgentDB row count
    agentdb_rows = 0
    if os.path.exists(".agentdb/agentdb.sqlite"):
        agentdb_conn = sqlite3.connect(".agentdb/agentdb.sqlite")
        agentdb_cur = agentdb_conn.cursor()
        try:
            agentdb_cur.execute("SELECT COUNT(*) FROM lao_learning_progress")
            agentdb_rows = agentdb_cur.fetchone()[0]
        except:
            pass
        agentdb_conn.close()
    
    # Insert metrics
    metrics = [
        ('collect_metrics.py', 'learning_events_count', learning_events),
        ('collect_metrics.py', 'governor_incidents_count', governor_incidents),
        ('collect_metrics.py', 'agentdb_rows', agentdb_rows),
    ]
    
    for source, metric, value in metrics:
        cur.execute(
            "INSERT INTO metric_snapshots(captured_at, source, metric, value, meta) VALUES (?, ?, ?, ?, ?)",
            (timestamp, source, metric, value, '{}')
        )
    
    conn.commit()
    conn.close()
    
    print(f"""
📊 Baseline Metrics Captured ({timestamp})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Learning Events:    {learning_events:5d}
  Governor Incidents: {governor_incidents:5d}
  AgentDB Rows:       {agentdb_rows:5d}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Metrics stored in {DB_PATH}
""")


def main():
    """Main entry point."""
    if len(sys.argv) > 1 and sys.argv[1] == '--baseline-only':
        ensure_db(DB_PATH)
    else:
        collect_baseline_metrics()


if __name__ == '__main__':
    main()

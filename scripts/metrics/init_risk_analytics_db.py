#!/usr/bin/env python3
"""
init_risk_analytics_db.py - Initialize risk analytics baseline database

Creates metrics/risk_analytics_baseline.db with required tables.
Uses stdlib only (no external dependencies).

Usage:
    python3 scripts/metrics/init_risk_analytics_db.py
    python3 scripts/metrics/init_risk_analytics_db.py --force
"""

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path

SCHEMA = {
    "snapshots": """
        CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            snapshot_type TEXT NOT NULL,
            snapshot_data TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """,
    "flow_metrics": """
        CREATE TABLE IF NOT EXISTS flow_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_time_hours REAL,
            cycle_time_hours REAL,
            throughput_items_per_day REAL,
            wip_violations INTEGER DEFAULT 0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """,
    "process_metrics": """
        CREATE TABLE IF NOT EXISTS process_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            retro_to_commit_minutes REAL,
            action_items_done_percent REAL,
            context_switches_per_day INTEGER,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """,
    "learning_metrics": """
        CREATE TABLE IF NOT EXISTS learning_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            experiments_per_sprint INTEGER,
            retro_to_features_percent REAL,
            learning_implementation_days REAL,
            false_positive_rate REAL DEFAULT 0.0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
}

def get_db_path():
    """Get metrics DB path relative to repo root."""
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent.parent
    return repo_root / "metrics" / "risk_analytics_baseline.db"

def init_database(db_path, force=False):
    """Initialize database with schema."""
    # Ensure metrics directory exists
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Check if DB exists
    if db_path.exists() and not force:
        print(f"✓ Database already exists: {db_path}")
        print("  Use --force to reinitialize")
        return True
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create all tables
        for table_name, table_sql in SCHEMA.items():
            cursor.execute(table_sql)
            print(f"  ✓ Table '{table_name}' initialized")
        
        # Insert initial snapshot
        initial_snapshot = {
            "initialized_at": "2025-11-14T00:00:00Z",
            "version": "1.0.0",
            "purpose": "risk_analytics_baseline"
        }
        cursor.execute(
            "INSERT INTO snapshots (snapshot_type, snapshot_data) VALUES (?, ?)",
            ("initialization", json.dumps(initial_snapshot))
        )
        
        conn.commit()
        conn.close()
        
        print(f"✅ Database initialized: {db_path}")
        return True
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}", file=sys.stderr)
        return False

def verify_schema(db_path):
    """Verify all tables exist."""
    if not db_path.exists():
        return False, ["Database does not exist"]
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        existing_tables = {row[0] for row in cursor.fetchall()}
        
        missing_tables = set(SCHEMA.keys()) - existing_tables
        conn.close()
        
        if missing_tables:
            return False, [f"Missing table: {t}" for t in missing_tables]
        
        return True, []
        
    except Exception as e:
        return False, [f"Error verifying schema: {e}"]

def main():
    parser = argparse.ArgumentParser(description="Initialize risk analytics baseline database")
    parser.add_argument("--force", action="store_true", help="Force reinitialization")
    parser.add_argument("--verify", action="store_true", help="Verify schema only")
    
    args = parser.parse_args()
    
    db_path = get_db_path()
    
    if args.verify:
        print(f"🔍 Verifying schema at {db_path}")
        is_valid, issues = verify_schema(db_path)
        
        if is_valid:
            print("✅ Schema is valid")
            sys.exit(0)
        else:
            print(f"❌ Schema issues found:")
            for issue in issues:
                print(f"  • {issue}")
            sys.exit(1)
    
    else:
        print(f"🔧 Initializing database at {db_path}")
        success = init_database(db_path, force=args.force)
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

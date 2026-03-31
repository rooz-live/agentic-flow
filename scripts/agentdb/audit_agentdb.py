#!/usr/bin/env python3
"""
audit_agentdb.py - Validate and repair AgentDB schema

Ensures .agentdb/agentdb.sqlite exists and has required tables.
Uses stdlib only (no external dependencies).

Usage:
    python3 scripts/agentdb/audit_agentdb.py --check
    python3 scripts/agentdb/audit_agentdb.py --repair
"""

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path

# Schema definitions
SCHEMA = {
    "agents": """
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """,
    "learning_events": """
        CREATE TABLE IF NOT EXISTS learning_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            event_type TEXT NOT NULL,
            context TEXT,
            verdict TEXT,
            confidence REAL DEFAULT 0.5,
            beam_tags TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        )
    """,
    "metrics": """
        CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_type TEXT NOT NULL,
            metric_name TEXT NOT NULL,
            metric_value REAL NOT NULL,
            metadata TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """,
    "calibration_runs": """
        CREATE TABLE IF NOT EXISTS calibration_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT UNIQUE NOT NULL,
            mean_score REAL,
            median_score REAL,
            sample_count INTEGER,
            status TEXT DEFAULT 'complete',
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
}

def get_db_path():
    """Get AgentDB path relative to repo root."""
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent.parent
    return repo_root / ".agentdb" / "agentdb.sqlite"

def check_schema(db_path):
    """Check if all required tables exist."""
    issues = []
    
    if not db_path.exists():
        issues.append(f"Database does not exist: {db_path}")
        return issues, False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get existing tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        existing_tables = {row[0] for row in cursor.fetchall()}
        
        # Check required tables
        for table_name in SCHEMA.keys():
            if table_name not in existing_tables:
                issues.append(f"Missing table: {table_name}")
        
        conn.close()
        
        return issues, len(issues) == 0
        
    except Exception as e:
        issues.append(f"Error checking schema: {e}")
        return issues, False

def repair_schema(db_path):
    """Create missing tables and repair schema."""
    # Ensure parent directory exists
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create all tables
        for table_name, table_sql in SCHEMA.items():
            cursor.execute(table_sql)
            print(f"  ✓ Table '{table_name}' ready")
        
        conn.commit()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"  ✗ Error repairing schema: {e}", file=sys.stderr)
        return False

def main():
    parser = argparse.ArgumentParser(description="Audit and repair AgentDB")
    parser.add_argument("--check", action="store_true", help="Check schema only")
    parser.add_argument("--repair", action="store_true", help="Repair schema")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    
    args = parser.parse_args()
    
    db_path = get_db_path()
    
    if args.repair:
        print(f"🔧 Repairing AgentDB at {db_path}")
        success = repair_schema(db_path)
        
        if success:
            print("✅ Schema repaired successfully")
            sys.exit(0)
        else:
            print("❌ Schema repair failed")
            sys.exit(1)
    
    else:  # Default to check
        print(f"🔍 Checking AgentDB at {db_path}")
        issues, is_valid = check_schema(db_path)
        
        if args.json:
            result = {
                "valid": is_valid,
                "issues": issues,
                "db_path": str(db_path)
            }
            print(json.dumps(result, indent=2))
        else:
            if is_valid:
                print("✅ Schema is valid")
            else:
                print(f"❌ Found {len(issues)} issue(s):")
                for issue in issues:
                    print(f"  • {issue}")
                print("\nRun with --repair to fix issues")
        
        sys.exit(0 if is_valid else 1)

if __name__ == "__main__":
    main()

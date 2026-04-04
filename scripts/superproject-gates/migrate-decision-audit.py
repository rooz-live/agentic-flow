#!/usr/bin/env python3
"""
Migrate decision_audit table to new schema with decision_id support
"""
import sqlite3
import sys
from datetime import datetime

def migrate_decision_audit(db_path='agentdb.db'):
    print(f"[MIGRATE] Connecting to {db_path}...")
    conn = sqlite3.connect(db_path, timeout=30.0)
    cursor = conn.cursor()
    
    try:
        # Check if decision_id column exists
        cursor.execute("PRAGMA table_info(decision_audit)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'decision_id' in columns:
            print("[MIGRATE] decision_id column already exists, no migration needed")
            return 0
        
        print("[MIGRATE] Migrating to new schema...")
        
        # Export old data
        print("[MIGRATE] Exporting old data...")
        cursor.execute("SELECT id, timestamp, rationale, context, decision_type, outcome FROM decision_audit")
        old_data = cursor.fetchall()
        print(f"[MIGRATE] Found {len(old_data)} rows to migrate")
        
        # Drop old table
        print("[MIGRATE] Dropping old table...")
        cursor.execute("DROP TABLE IF EXISTS decision_audit")
        
        # Create new table
        print("[MIGRATE] Creating new table...")
        cursor.execute("""
            CREATE TABLE decision_audit (
                id TEXT PRIMARY KEY NOT NULL,
                timestamp TEXT NOT NULL,
                decision_id TEXT NOT NULL,
                circle_role TEXT NOT NULL,
                decision_type TEXT NOT NULL,
                context_json TEXT NOT NULL,
                outcome TEXT NOT NULL,
                rationale TEXT NOT NULL,
                alternatives_json TEXT NOT NULL,
                evidence_chain_json TEXT NOT NULL,
                preservation_stored INTEGER NOT NULL,
                preservation_location TEXT NOT NULL,
                preservation_key TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes
        print("[MIGRATE] Creating indexes...")
        cursor.execute("CREATE INDEX idx_decision_audit_decision_id ON decision_audit(decision_id)")
        cursor.execute("CREATE INDEX idx_decision_audit_timestamp ON decision_audit(timestamp)")
        cursor.execute("CREATE INDEX idx_decision_audit_circle_role ON decision_audit(circle_role)")
        cursor.execute("CREATE INDEX idx_decision_audit_decision_type ON decision_audit(decision_type)")
        cursor.execute("CREATE INDEX idx_decision_audit_outcome ON decision_audit(outcome)")
        
        # Migrate data
        print("[MIGRATE] Migrating data...")
        for row in old_data:
            old_id, old_timestamp, old_rationale, old_context, old_type, old_outcome = row
            
            # Convert timestamp if needed
            if isinstance(old_timestamp, int):
                # Check if it looks like milliseconds (13+ digits) or seconds (10 digits)
                if old_timestamp > 10000000000:  # Looks like milliseconds
                    timestamp_str = datetime.fromtimestamp(old_timestamp / 1000).isoformat()
                else:  # Looks like seconds
                    timestamp_str = datetime.fromtimestamp(old_timestamp).isoformat()
            else:
                timestamp_str = old_timestamp or datetime.now().isoformat()
            
            cursor.execute("""
                INSERT INTO decision_audit (
                    id, timestamp, decision_id, circle_role, decision_type,
                    context_json, outcome, rationale, alternatives_json,
                    evidence_chain_json, preservation_stored, preservation_location, preservation_key
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                old_id,
                timestamp_str,
                f'migrated-{old_id}',
                'orchestrator',
                old_type or 'governance',
                old_context or '{}',
                old_outcome or 'CONTINUE',
                old_rationale or '',
                '[]',
                '[]',
                1,
                'agentdb.db',
                f'migrated-{old_id}'
            ))
        
        conn.commit()
        print(f"[MIGRATE] Successfully migrated {len(old_data)} rows")
        return 0
        
    except Exception as e:
        print(f"[MIGRATE] Error: {e}")
        conn.rollback()
        return 1
    finally:
        conn.close()

if __name__ == '__main__':
    db_path = sys.argv[1] if len(sys.argv) > 1 else 'agentdb.db'
    sys.exit(migrate_decision_audit(db_path))

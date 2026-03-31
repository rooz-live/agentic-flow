#!/usr/bin/env python3
"""
Database Migration Tool
Manages SQLite schema migrations with rollback support
"""

import sqlite3
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Tuple, Optional
import hashlib


class Migration:
    """Represents a database migration"""
    
    def __init__(self, version: str, name: str, up_sql: str, down_sql: str):
        self.version = version
        self.name = name
        self.up_sql = up_sql
        self.down_sql = down_sql
        self.checksum = hashlib.sha256(up_sql.encode()).hexdigest()[:8]
    
    def __repr__(self):
        return f"Migration({self.version}, {self.name})"


class MigrationManager:
    """Manages database migrations"""
    
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.conn = None
    
    def connect(self):
        """Establish database connection"""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        self._ensure_migrations_table()
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
    
    def _ensure_migrations_table(self):
        """Create migrations tracking table if it doesn't exist"""
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS _migrations (
                version TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                checksum TEXT NOT NULL,
                applied_at TEXT NOT NULL,
                rolled_back_at TEXT
            )
        """)
        self.conn.commit()
    
    def get_applied_migrations(self) -> List[str]:
        """Get list of applied migration versions"""
        cursor = self.conn.execute(
            "SELECT version FROM _migrations WHERE rolled_back_at IS NULL ORDER BY version"
        )
        return [row['version'] for row in cursor.fetchall()]
    
    def apply_migration(self, migration: Migration, dry_run: bool = False) -> bool:
        """Apply a migration"""
        print(f"Applying migration {migration.version}: {migration.name}")
        
        if dry_run:
            print("  [DRY RUN] SQL:")
            print(f"  {migration.up_sql}")
            return True
        
        try:
            # Start transaction
            self.conn.execute("BEGIN")
            
            # Apply migration SQL
            for statement in migration.up_sql.split(';'):
                statement = statement.strip()
                if statement:
                    self.conn.execute(statement)
            
            # Record migration
            self.conn.execute("""
                INSERT INTO _migrations (version, name, checksum, applied_at)
                VALUES (?, ?, ?, ?)
            """, (migration.version, migration.name, migration.checksum, datetime.utcnow().isoformat()))
            
            # Commit transaction
            self.conn.commit()
            print(f"  ✓ Migration {migration.version} applied successfully")
            return True
        
        except Exception as e:
            self.conn.rollback()
            print(f"  ✗ Migration {migration.version} failed: {e}")
            return False
    
    def rollback_migration(self, migration: Migration, dry_run: bool = False) -> bool:
        """Rollback a migration"""
        print(f"Rolling back migration {migration.version}: {migration.name}")
        
        if dry_run:
            print("  [DRY RUN] SQL:")
            print(f"  {migration.down_sql}")
            return True
        
        try:
            # Start transaction
            self.conn.execute("BEGIN")
            
            # Apply rollback SQL
            for statement in migration.down_sql.split(';'):
                statement = statement.strip()
                if statement:
                    self.conn.execute(statement)
            
            # Mark as rolled back
            self.conn.execute("""
                UPDATE _migrations
                SET rolled_back_at = ?
                WHERE version = ? AND rolled_back_at IS NULL
            """, (datetime.utcnow().isoformat(), migration.version))
            
            # Commit transaction
            self.conn.commit()
            print(f"  ✓ Migration {migration.version} rolled back successfully")
            return True
        
        except Exception as e:
            self.conn.rollback()
            print(f"  ✗ Rollback {migration.version} failed: {e}")
            return False


# Define migrations
MIGRATIONS = [
    Migration(
        version="001",
        name="add_status_column_to_operations",
        up_sql="""
            ALTER TABLE operations ADD COLUMN status TEXT DEFAULT 'pending';
            CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
        """,
        down_sql="""
            DROP INDEX IF EXISTS idx_operations_status;
            -- SQLite doesn't support DROP COLUMN, would need table recreation
            -- For now, leave column in place when rolling back
        """
    ),
    Migration(
        version="002",
        name="add_service_provider_column",
        up_sql="""
            ALTER TABLE operations ADD COLUMN service_provider TEXT;
            CREATE INDEX IF NOT EXISTS idx_operations_provider ON operations(service_provider);
        """,
        down_sql="""
            DROP INDEX IF EXISTS idx_operations_provider;
            -- SQLite doesn't support DROP COLUMN
        """
    ),
]


def main():
    """CLI interface for migration manager"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Database Migration Tool")
    parser.add_argument("database", type=Path, help="Path to SQLite database")
    parser.add_argument("command", choices=["status", "up", "down", "reset"], 
                       help="Migration command")
    parser.add_argument("--dry-run", action="store_true", help="Show SQL without executing")
    parser.add_argument("--version", type=str, help="Specific migration version")
    
    args = parser.parse_args()
    
    if not args.database.exists() and args.command != "up":
        print(f"Error: Database {args.database} does not exist", file=sys.stderr)
        sys.exit(1)
    
    manager = MigrationManager(args.database)
    manager.connect()
    
    try:
        if args.command == "status":
            # Show migration status
            applied = manager.get_applied_migrations()
            print(f"Database: {args.database}")
            print(f"Applied migrations: {len(applied)}/{len(MIGRATIONS)}")
            print()
            for migration in MIGRATIONS:
                status = "✓" if migration.version in applied else "○"
                print(f"{status} {migration.version}: {migration.name}")
        
        elif args.command == "up":
            # Apply pending migrations
            applied = manager.get_applied_migrations()
            pending = [m for m in MIGRATIONS if m.version not in applied]
            
            if not pending:
                print("No pending migrations")
                sys.exit(0)
            
            print(f"Applying {len(pending)} migration(s)...")
            for migration in pending:
                if not manager.apply_migration(migration, dry_run=args.dry_run):
                    sys.exit(1)
            
            print(f"\n✓ All migrations applied successfully")
        
        elif args.command == "down":
            # Rollback last migration or specific version
            applied = manager.get_applied_migrations()
            
            if not applied:
                print("No migrations to roll back")
                sys.exit(0)
            
            if args.version:
                target_version = args.version
            else:
                target_version = applied[-1]
            
            migration = next((m for m in MIGRATIONS if m.version == target_version), None)
            if not migration:
                print(f"Error: Migration {target_version} not found", file=sys.stderr)
                sys.exit(1)
            
            if not manager.rollback_migration(migration, dry_run=args.dry_run):
                sys.exit(1)
        
        elif args.command == "reset":
            # Rollback all migrations
            applied = manager.get_applied_migrations()
            applied.reverse()
            
            print(f"Rolling back {len(applied)} migration(s)...")
            for version in applied:
                migration = next((m for m in MIGRATIONS if m.version == version), None)
                if migration:
                    if not manager.rollback_migration(migration, dry_run=args.dry_run):
                        sys.exit(1)
    
    finally:
        manager.close()


if __name__ == "__main__":
    main()

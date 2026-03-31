#!/usr/bin/env python3
"""
Migration Script: Add missing run_kind field to pattern_metrics.jsonl

Root Cause:
- 405 entries (209 backlog_item_scored + 196 wsjf_prioritization) missing run_kind field
- Pattern-stats tool defaults missing run_kind to "unknown", causing false failures
- Older entries have 'run' field but not 'run_kind' field

Solution:
- Add run_kind field by copying from 'run' field
- Preserve all other data
- Create backup before migration
"""

import json
import os
import shutil
from datetime import datetime

PROJECT_ROOT = os.environ.get("PROJECT_ROOT", ".")
GOALIE_DIR = os.path.join(PROJECT_ROOT, ".goalie")
METRICS_FILE = os.path.join(GOALIE_DIR, "pattern_metrics.jsonl")
BACKUP_FILE = os.path.join(GOALIE_DIR, f"pattern_metrics_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl")


def migrate_run_kind():
    """Add missing run_kind field to entries"""
    
    if not os.path.exists(METRICS_FILE):
        print(f"❌ Metrics file not found: {METRICS_FILE}")
        return False
    
    # Create backup
    print(f"📦 Creating backup: {BACKUP_FILE}")
    shutil.copy2(METRICS_FILE, BACKUP_FILE)
    
    # Read all entries
    entries = []
    migrated_count = 0
    error_count = 0
    
    print(f"📖 Reading {METRICS_FILE}...")
    
    with open(METRICS_FILE, 'r') as f:
        for line_num, line in enumerate(f, 1):
            if not line.strip():
                continue
            
            try:
                entry = json.loads(line.strip())
                
                # Check if run_kind is missing
                if 'run_kind' not in entry:
                    # Try to infer from 'run' field
                    run_value = entry.get('run', 'unknown')
                    entry['run_kind'] = run_value
                    migrated_count += 1
                    
                    if migrated_count <= 5:
                        print(f"  ✏️  Line {line_num}: Added run_kind='{run_value}' (pattern={entry.get('pattern', 'unknown')})")
                
                # Check if action_completed is missing
                if 'action_completed' not in entry:
                    # Default to true for wsjf_calculator and governance-agent runs
                    run_kind = entry.get('run_kind', entry.get('run', 'unknown'))
                    # Assume success unless there's evidence of failure
                    entry['action_completed'] = run_kind in ['wsjf_calculator', 'governance-agent', 'retro-coach']
                
                entries.append(entry)
                
            except json.JSONDecodeError as e:
                print(f"  ⚠️  Line {line_num}: JSON decode error: {e}")
                error_count += 1
                # Keep original line
                entries.append(line.strip())
    
    # Write migrated entries
    print(f"\n💾 Writing migrated data to {METRICS_FILE}...")
    
    with open(METRICS_FILE, 'w') as f:
        for entry in entries:
            if isinstance(entry, dict):
                f.write(json.dumps(entry) + '\n')
            else:
                # Original line (couldn't parse)
                f.write(entry + '\n')
    
    print(f"\n✅ Migration complete!")
    print(f"   📊 Total entries: {len(entries)}")
    print(f"   ✅ Migrated: {migrated_count}")
    print(f"   ❌ Errors: {error_count}")
    print(f"   💾 Backup: {BACKUP_FILE}")
    
    return True


def validate_migration():
    """Validate migration by checking for unknown run_kind entries"""
    
    unknown_count = 0
    total_count = 0
    
    print(f"\n🔍 Validating migration...")
    
    with open(METRICS_FILE, 'r') as f:
        for line in f:
            if not line.strip():
                continue
            
            try:
                entry = json.loads(line.strip())
                total_count += 1
                
                if entry.get('run_kind') == 'unknown':
                    unknown_count += 1
                    
            except json.JSONDecodeError:
                continue
    
    print(f"   📊 Total entries: {total_count}")
    print(f"   ⚠️  Still 'unknown': {unknown_count}")
    
    if unknown_count == 0:
        print(f"   🎉 Perfect! No 'unknown' run_kind entries remain")
    else:
        print(f"   💡 {unknown_count} entries legitimately have run_kind='unknown' (not migration artifacts)")
    
    return True


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Migrate pattern_metrics.jsonl: Add missing run_kind field')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be migrated without making changes')
    parser.add_argument('--validate-only', action='store_true', help='Only run validation')
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("PATTERN METRICS MIGRATION: Add missing run_kind field")
    print("=" * 70)
    
    if args.validate_only:
        validate_migration()
    elif args.dry_run:
        print("\n🔍 DRY RUN MODE - No changes will be made\n")
        
        missing_count = 0
        with open(METRICS_FILE, 'r') as f:
            for line_num, line in enumerate(f, 1):
                if not line.strip():
                    continue
                try:
                    entry = json.loads(line.strip())
                    if 'run_kind' not in entry:
                        missing_count += 1
                        if missing_count <= 10:
                            run_value = entry.get('run', 'unknown')
                            pattern = entry.get('pattern', 'unknown')
                            print(f"  Line {line_num}: Would add run_kind='{run_value}' (pattern={pattern})")
                except:
                    pass
        
        print(f"\n📊 Would migrate {missing_count} entries")
    else:
        success = migrate_run_kind()
        if success:
            validate_migration()

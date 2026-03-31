#!/usr/bin/env python3
"""
Fix Schema Tags for Tier 1/2 Circles
Adds default tags to entries missing them in analyst, orchestrator, assessor, innovator circles
"""

import json
import os
import shutil
from datetime import datetime
from pathlib import Path

GOALIE_DIR = Path(".goalie")
METRICS_FILE = GOALIE_DIR / "pattern_metrics.jsonl"
TIER_12_CIRCLES = ['analyst', 'orchestrator', 'assessor', 'innovator']

# Default tags by circle
DEFAULT_TAGS = {
    'analyst': ['analysis', 'data-driven'],
    'orchestrator': ['coordination', 'workflow'],
    'assessor': ['quality', 'validation'],
    'innovator': ['innovation', 'experimentation']
}

def fix_tags(dry_run=True):
    """Fix missing tags in Tier 1/2 circle entries."""
    
    if not METRICS_FILE.exists():
        print(f"❌ Metrics file not found: {METRICS_FILE}")
        return
    
    # Create backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = GOALIE_DIR / f"pattern_metrics_backup_{timestamp}.jsonl"
    
    if not dry_run:
        shutil.copy2(METRICS_FILE, backup_file)
        print(f"✅ Backup created: {backup_file}")
    
    # Read all entries
    with open(METRICS_FILE, 'r') as f:
        entries = [json.loads(line) for line in f if line.strip()]
    
    # Fix entries
    fixed_count = 0
    for entry in entries:
        circle = entry.get('circle', '')
        tags = entry.get('tags', [])
        
        if circle in TIER_12_CIRCLES and (not tags or len(tags) == 0):
            if dry_run:
                print(f"Would add tags to {circle} entry (pattern: {entry.get('pattern')})")
            else:
                entry['tags'] = DEFAULT_TAGS.get(circle, ['default'])
            fixed_count += 1
    
    if dry_run:
        print(f"\n🔍 DRY RUN: Would fix {fixed_count} entries")
        print("Run with --apply to make changes")
    else:
        # Write back
        with open(METRICS_FILE, 'w') as f:
            for entry in entries:
                f.write(json.dumps(entry) + '\n')
        
        print(f"\n✅ Fixed {fixed_count} entries")
        print(f"📁 Original backed up to: {backup_file}")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Fix schema tags for Tier 1/2 circles')
    parser.add_argument('--apply', action='store_true', help='Apply fixes (default: dry run)')
    
    args = parser.parse_args()
    
    fix_tags(dry_run=not args.apply)

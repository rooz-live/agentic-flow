#!/usr/bin/env python3
"""
Fix high-severity schema compliance issues in pattern_metrics.jsonl
Specifically: Missing action_completed and run_kind for governance circle entries
"""

import json
import os
from datetime import datetime
from pathlib import Path

def backup_file(filepath):
    """Create backup before modifications"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{filepath}.backup_{timestamp}"
    with open(filepath, 'r') as f:
        content = f.read()
    with open(backup_path, 'w') as f:
        f.write(content)
    print(f"✅ Backup created: {backup_path}")
    return backup_path

def fix_governance_entries(filepath):
    """Fix missing fields in governance circle entries"""
    fixed_count = 0
    entries = []
    
    print(f"📖 Reading {filepath}...")
    with open(filepath, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            
            try:
                entry = json.loads(line)
                
                # Check if governance circle and missing required fields
                if entry.get('circle') == 'governance':
                    needs_fix = False
                    
                    # Fix missing run_kind
                    if 'run_kind' not in entry or entry['run_kind'] is None:
                        # Infer from environment or context
                        entry['run_kind'] = os.environ.get('AF_PROD_RUN_KIND', 'manual')
                        needs_fix = True
                    
                    # Fix missing action_completed
                    if 'action_completed' not in entry or entry['action_completed'] is None:
                        # Infer from status
                        entry['action_completed'] = (entry.get('status') == 'completed')
                        needs_fix = True
                    
                    if needs_fix:
                        fixed_count += 1
                        print(f"🔧 Fixed line {line_num}: {entry.get('pattern', 'unknown')} - added run_kind={entry['run_kind']}, action_completed={entry['action_completed']}")
                
                entries.append(entry)
                
            except json.JSONDecodeError as e:
                print(f"⚠️  Warning: Could not parse line {line_num}: {e}")
                continue
    
    return entries, fixed_count

def write_fixed_entries(filepath, entries):
    """Write fixed entries back to file"""
    print(f"💾 Writing fixed entries to {filepath}...")
    with open(filepath, 'w') as f:
        for entry in entries:
            f.write(json.dumps(entry) + '\n')
    print(f"✅ File updated successfully")

def main():
    metrics_file = Path('.goalie/pattern_metrics.jsonl')
    
    if not metrics_file.exists():
        print(f"❌ Error: {metrics_file} not found")
        return 1
    
    print("🔍 Fixing High-Severity Schema Compliance Issues")
    print("=" * 60)
    
    # Backup
    backup_path = backup_file(metrics_file)
    
    # Fix entries
    entries, fixed_count = fix_governance_entries(metrics_file)
    
    # Write back
    if fixed_count > 0:
        write_fixed_entries(metrics_file, entries)
        print("\n" + "=" * 60)
        print(f"✅ Fixed {fixed_count} high-severity issues")
        print(f"📋 Backup available at: {backup_path}")
    else:
        print("\n✨ No high-severity issues found to fix")
    
    return 0

if __name__ == '__main__':
    exit(main())

#!/usr/bin/env python3
"""
Schema migration for .goalie/pattern_metrics.jsonl
Adds required fields: timestamp, run_kind, action_completed
"""

import json
import sys
from pathlib import Path

def migrate_entry(entry):
    """Migrate a single JSON entry to new schema"""
    
    # Map ts -> timestamp if needed
    if 'ts' in entry and 'timestamp' not in entry:
        entry['timestamp'] = entry['ts']
    
    # Map run -> run_kind if needed
    if 'run' in entry and 'run_kind' not in entry:
        entry['run_kind'] = entry['run']
    
    # Add default values for missing required fields
    if 'timestamp' not in entry:
        # Use a placeholder timestamp
        entry['timestamp'] = "2025-12-11T00:00:00.000Z"
    
    if 'run_kind' not in entry:
        # Infer from pattern or use default
        pattern = entry.get('pattern', '')
        if 'wsjf' in pattern:
            entry['run_kind'] = 'wsjf_calculator'
        elif 'backtest' in pattern:
            entry['run_kind'] = 'prod-cycle'
        else:
            entry['run_kind'] = 'unknown'
    
    if 'action_completed' not in entry:
        # Default to true for advisory mode
        entry['action_completed'] = True
    
    # Add gate if missing
    if 'gate' not in entry:
        # Infer from pattern or use default
        pattern = entry.get('pattern', '')
        if 'guardrail' in pattern:
            entry['gate'] = 'guardrail'
        elif 'wsjf' in pattern or 'backlog' in pattern:
            entry['gate'] = 'governance'
        else:
            entry['gate'] = 'general'
    
    # Add tags if missing
    if 'tags' not in entry:
        entry['tags'] = []
    
    # Ensure economic exists and has all required fields
    if 'economic' not in entry:
        entry['economic'] = {}
    
    economic = entry['economic']
    
    # Map cod -> cost_of_delay
    if 'cod' in economic and 'cost_of_delay' not in economic:
        economic['cost_of_delay'] = economic['cod']
    
    # Add missing economic fields with defaults
    if 'cost_of_delay' not in economic:
        economic['cost_of_delay'] = economic.get('cod', 0)
    if 'wsjf_score' not in economic:
        economic['wsjf_score'] = 0
    if 'job_duration' not in economic:
        economic['job_duration'] = 1
    if 'user_business_value' not in economic:
        economic['user_business_value'] = economic.get('ubv', 0)
    
    # Move non-schema fields to data object
    schema_fields = {
        'timestamp', 'pattern', 'circle', 'depth', 'run_kind',
        'gate', 'tags', 'economic', 'action_completed', 'mode', 
        'run_id', 'data'
    }
    
    if 'data' not in entry:
        entry['data'] = {}
    
    # Move extra fields to data
    extra_fields = set(entry.keys()) - schema_fields
    for field in extra_fields:
        if field not in entry['data']:
            entry['data'][field] = entry[field]
    
    # Remove moved fields from top level (except required ones)
    for field in list(entry.keys()):
        if field not in schema_fields and field != 'data':
            del entry[field]
    
    return entry


def main():
    metrics_file = Path('.goalie/pattern_metrics.jsonl')
    backup_file = Path('.goalie/pattern_metrics.jsonl.backup')
    
    if not metrics_file.exists():
        print(f"❌ File not found: {metrics_file}")
        sys.exit(1)
    
    # Backup original file
    print(f"📦 Creating backup: {backup_file}")
    with open(metrics_file, 'r') as f:
        content = f.read()
    with open(backup_file, 'w') as f:
        f.write(content)
    
    # Migrate entries
    print(f"🔧 Migrating entries...")
    migrated_count = 0
    error_count = 0
    
    lines = []
    with open(metrics_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            if not line.strip():
                continue
            
            try:
                entry = json.loads(line.strip())
                migrated_entry = migrate_entry(entry)
                lines.append(json.dumps(migrated_entry))
                migrated_count += 1
            except Exception as e:
                print(f"⚠️  Line {line_num}: {str(e)}")
                lines.append(line.strip())
                error_count += 1
    
    # Write migrated content
    with open(metrics_file, 'w') as f:
        for line in lines:
            f.write(line + '\n')
    
    print(f"✅ Migrated {migrated_count} entries")
    if error_count > 0:
        print(f"⚠️  {error_count} entries had errors")
    print(f"💾 Backup saved to: {backup_file}")


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Migrate pattern_metrics.jsonl to schema v1.0

Adds missing required fields:
- timestamp (replaces ts)
- run_kind
- depth (defaults to 1)
- tags (defaults to empty array)
- economic (defaults to zeros)
- action_completed (defaults to true)
"""

import json
import sys
from pathlib import Path
from datetime import datetime


def migrate_event(old_event: dict) -> dict:
    """Migrate old event format to new schema."""
    
    # Map old fields to new
    new_event = {}
    
    # timestamp: rename ts -> timestamp
    new_event["timestamp"] = old_event.get("ts", datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"))
    
    # pattern: keep as is
    new_event["pattern"] = old_event.get("pattern", "unknown")
    
    # circle: keep as is (normalize to lowercase)
    new_event["circle"] = old_event.get("circle", "orchestrator").lower()
    
    # depth: add default value of 0 (will be updated based on circle later)
    new_event["depth"] = old_event.get("depth", 0)
    
    # run_kind: extract from runId or default
    run_id = old_event.get("runId", "")
    if "validate" in run_id:
        new_event["run_kind"] = "validation"
    else:
        new_event["run_kind"] = old_event.get("run", "prod-cycle")
    
    # gate: keep as is
    new_event["gate"] = old_event.get("gate", "health")
    
    # tags: add default empty array
    new_event["tags"] = old_event.get("tags", [])
    
    # economic: create from old format or defaults
    if "economic" in old_event:
        econ = old_event["economic"]
        new_event["economic"] = {
            "wsjf_score": econ.get("wsjf_score", 0.0),
            "cost_of_delay": econ.get("cod", econ.get("cost_of_delay", 0.0)),
            "job_duration": econ.get("job_duration", 1),
            "user_business_value": econ.get("user_business_value", 0.0)
        }
    else:
        new_event["economic"] = {
            "wsjf_score": 0.0,
            "cost_of_delay": 0.0,
            "job_duration": 1,
            "user_business_value": 0.0
        }
    
    # action_completed: default to true for existing events
    new_event["action_completed"] = old_event.get("action_completed", True)
    
    # Keep additional fields that might be present
    extra_fields = ["behavior", "details", "success", "durationMs", "mutation", "mode"]
    for field in extra_fields:
        if field in old_event:
            new_event[field] = old_event[field]
    
    return new_event


def migrate_file(input_file: Path, output_file: Path, backup: bool = True):
    """Migrate entire pattern_metrics.jsonl file."""
    
    if not input_file.exists():
        print(f"❌ Input file not found: {input_file}", file=sys.stderr)
        return False
    
    # Create backup
    if backup:
        backup_file = input_file.with_suffix(".jsonl.backup")
        import shutil
        shutil.copy2(input_file, backup_file)
        print(f"✓ Created backup: {backup_file}", file=sys.stderr)
    
    # Read and migrate events
    migrated_events = []
    error_count = 0
    
    with open(input_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
                
            try:
                old_event = json.loads(line)
                new_event = migrate_event(old_event)
                migrated_events.append(new_event)
            except json.JSONDecodeError as e:
                print(f"⚠️  Line {line_num}: JSON decode error: {e}", file=sys.stderr)
                error_count += 1
            except Exception as e:
                print(f"⚠️  Line {line_num}: Migration error: {e}", file=sys.stderr)
                error_count += 1
    
    # Write migrated events
    with open(output_file, 'w') as f:
        for event in migrated_events:
            f.write(json.dumps(event, separators=(',', ':')) + '\n')
    
    print(f"✓ Migrated {len(migrated_events)} events", file=sys.stderr)
    if error_count > 0:
        print(f"⚠️  {error_count} errors encountered", file=sys.stderr)
    
    return True


def main():
    # Determine project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    input_file = project_root / ".goalie" / "pattern_metrics.jsonl"
    output_file = input_file  # Overwrite in place (backup created)
    
    print(f"🔧 Migrating pattern metrics schema...", file=sys.stderr)
    print(f"   Input: {input_file}", file=sys.stderr)
    
    success = migrate_file(input_file, output_file, backup=True)
    
    if success:
        print(f"✅ Migration complete!", file=sys.stderr)
        return 0
    else:
        print(f"❌ Migration failed", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

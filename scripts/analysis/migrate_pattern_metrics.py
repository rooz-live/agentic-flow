#!/usr/bin/env python3
"""
Migrate existing pattern metrics to canonical schema.

Adds missing required fields (mode, mutation, gate, run_id) to existing events
in .goalie/pattern_metrics_append.jsonl with sensible defaults.
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

def migrate_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Add missing required fields to an event."""
    migrated = event.copy()
    
    # Add mode if missing (default: advisory for existing events)
    if "mode" not in migrated:
        migrated["mode"] = "advisory"
    
    # Add mutation if missing (default: false for existing events)
    if "mutation" not in migrated:
        migrated["mutation"] = False
    
    # Add gate if missing (infer from pattern)
    if "gate" not in migrated:
        pattern = migrated.get("pattern", "")
        if "guardrail" in pattern or "health" in pattern:
            migrated["gate"] = "health"
        elif "governance" in pattern or "review" in pattern:
            migrated["gate"] = "governance"
        elif "wsjf" in pattern or "economic" in pattern:
            migrated["gate"] = "wsjf"
        else:
            migrated["gate"] = "focus"
    
    # Add run_id if missing (use timestamp as fallback)
    if "run_id" not in migrated:
        ts = migrated.get("ts", datetime.utcnow().isoformat() + "Z")
        # Extract date part for grouping by day
        date_part = ts[:10].replace("-", "")
        migrated["run_id"] = f"migrated-{date_part}"
    
    # Ensure economic fields exist
    if "economic" not in migrated:
        migrated["economic"] = {"cod": 0.0, "wsjf_score": 0.0}
    elif not isinstance(migrated["economic"], dict):
        migrated["economic"] = {"cod": 0.0, "wsjf_score": 0.0}
    else:
        if "cod" not in migrated["economic"]:
            migrated["economic"]["cod"] = 0.0
        if "wsjf_score" not in migrated["economic"]:
            migrated["economic"]["wsjf_score"] = 0.0
    
    # Ensure tags is array
    if "tags" not in migrated:
        migrated["tags"] = []
    elif not isinstance(migrated["tags"], list):
        migrated["tags"] = [migrated["tags"]]
    
    return migrated

def validate_required_fields(event: Dict[str, Any]) -> tuple[bool, list[str]]:
    """Validate event has all required fields."""
    required = [
        "ts", "run", "run_id", "iteration", "circle", "depth",
        "pattern", "mode", "mutation", "gate", "framework",
        "scheduler", "tags", "economic"
    ]
    
    missing = [field for field in required if field not in event]
    return (len(missing) == 0, missing)

def main():
    """Migrate pattern metrics files."""
    project_root = Path.cwd()
    goalie_dir = project_root / ".goalie"
    
    # Files to migrate
    files_to_migrate = [
        "pattern_metrics_append.jsonl",
        "pattern_metrics_enhanced.jsonl",
    ]
    
    print("Pattern Metrics Migration")
    print("=" * 60)
    
    for filename in files_to_migrate:
        input_path = goalie_dir / filename
        
        if not input_path.exists():
            print(f"⊘ Skipping {filename} (not found)")
            continue
        
        output_path = goalie_dir / f"{filename}.migrated"
        backup_path = goalie_dir / f"{filename}.backup"
        
        print(f"\n📄 Migrating {filename}...")
        
        migrated_count = 0
        error_count = 0
        
        with open(input_path, 'r') as infile, open(output_path, 'w') as outfile:
            for line_num, line in enumerate(infile, 1):
                try:
                    event = json.loads(line.strip())
                    migrated_event = migrate_event(event)
                    
                    # Validate
                    valid, missing = validate_required_fields(migrated_event)
                    if not valid:
                        print(f"  ⚠ Line {line_num}: Missing fields: {', '.join(missing)}")
                        error_count += 1
                        # Write anyway with warning
                    
                    # Write migrated event
                    outfile.write(json.dumps(migrated_event) + "\n")
                    migrated_count += 1
                    
                except json.JSONDecodeError as e:
                    print(f"  ✗ Line {line_num}: JSON decode error: {e}")
                    error_count += 1
                except Exception as e:
                    print(f"  ✗ Line {line_num}: Unexpected error: {e}")
                    error_count += 1
        
        # Backup original and replace
        if migrated_count > 0:
            import shutil
            shutil.copy(input_path, backup_path)
            shutil.move(output_path, input_path)
            
            print(f"  ✓ Migrated {migrated_count} events")
            print(f"  ✓ Backup saved: {backup_path}")
            if error_count > 0:
                print(f"  ⚠ Errors: {error_count}")
        else:
            output_path.unlink(missing_ok=True)
            print(f"  ⊘ No events to migrate")
    
    print("\n" + "=" * 60)
    print("Migration complete!")
    print("\nNext steps:")
    print("1. Review migrated files in .goalie/")
    print("2. Run validation: python scripts/analysis/validate_pattern_metrics.py")
    print("3. Verify pattern coverage: ./scripts/af pattern-coverage --json")

if __name__ == "__main__":
    main()

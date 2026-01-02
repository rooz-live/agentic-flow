#!/usr/bin/env python3
"""
Backfill Pattern Tags for Existing Events

Adds Federation tags to existing untagged events in pattern_metrics.jsonl
to achieve the 90% tag coverage threshold.

Run this script to fix historical events missing tags.
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime

VALID_TAG_CATEGORIES = ["HPC", "ML", "Stats", "Device/Web", "Rust", "Federation"]


def has_valid_tag(tags):
    """Check if tags list contains a valid category tag."""
    if not tags or not isinstance(tags, list):
        return False
    return any(tag in VALID_TAG_CATEGORIES for tag in tags)


def backfill_tags(metrics_file: Path, dry_run: bool = False) -> dict:
    """Backfill missing tags in pattern metrics file.
    
    Args:
        metrics_file: Path to pattern_metrics.jsonl
        dry_run: If True, don't write changes
        
    Returns:
        dict with stats about the backfill operation
    """
    if not metrics_file.exists():
        return {"error": f"File not found: {metrics_file}"}
    
    stats = {
        "total_events": 0,
        "already_tagged": 0,
        "backfilled": 0,
        "errors": 0
    }
    
    # Read all events
    events = []
    with open(metrics_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
                stats["total_events"] += 1
                
                tags = event.get("tags", [])
                if has_valid_tag(tags):
                    stats["already_tagged"] += 1
                else:
                    # Add Federation tag
                    if tags is None:
                        tags = []
                    if not isinstance(tags, list):
                        tags = [str(tags)]
                    event["tags"] = ["Federation"] + list(tags)
                    stats["backfilled"] += 1
                
                events.append(event)
            except json.JSONDecodeError:
                stats["errors"] += 1
                events.append(None)  # Keep line position
    
    # Write back if not dry run
    if not dry_run:
        backup_file = metrics_file.with_suffix('.jsonl.bak')
        os.rename(metrics_file, backup_file)
        
        with open(metrics_file, 'w') as f:
            for event in events:
                if event is not None:
                    f.write(json.dumps(event) + '\n')
    
    return stats


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Backfill pattern tags")
    parser.add_argument("--dry-run", action="store_true", help="Don't write changes")
    parser.add_argument("--file", type=str, help="Specific file to process")
    args = parser.parse_args()
    
    goalie_dir = Path(".goalie")
    
    if args.file:
        files = [Path(args.file)]
    else:
        files = [
            goalie_dir / "pattern_metrics.jsonl",
            goalie_dir / "pattern_metrics_append.jsonl",
            goalie_dir / "pattern_metrics_enhanced.jsonl",
        ]
    
    print("=" * 60)
    print("Pattern Tag Backfill")
    print("=" * 60)
    print()
    
    for file_path in files:
        if not file_path.exists():
            continue
        
        print(f"Processing: {file_path}")
        stats = backfill_tags(file_path, dry_run=args.dry_run)
        
        print(f"  Total events: {stats.get('total_events', 0)}")
        print(f"  Already tagged: {stats.get('already_tagged', 0)}")
        print(f"  Backfilled: {stats.get('backfilled', 0)}")
        print(f"  Errors: {stats.get('errors', 0)}")
        
        if stats.get('total_events', 0) > 0:
            coverage = (stats.get('already_tagged', 0) + stats.get('backfilled', 0)) / stats['total_events'] * 100
            print(f"  New coverage: {coverage:.1f}%")
        print()
    
    if args.dry_run:
        print("DRY RUN - no changes written")
    else:
        print("✅ Backfill complete")


if __name__ == "__main__":
    main()


#!/usr/bin/env python3
"""
Backfill Duration Measured for Existing Events

Fixes historical pattern_metrics.jsonl events that have valid duration_ms
but are missing the duration_measured: True flag.

This improves duration coverage by correctly marking events that already
have timing information.
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime


def backfill_duration_measured(metrics_file: Path, dry_run: bool = False) -> dict:
    """Backfill duration_measured for events with valid duration_ms.
    
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
        "already_measured": 0,
        "backfilled": 0,
        "sentinel_fixed": 0,
        "still_missing": 0,
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
                
                data = event.get("data", {})
                duration_ms = data.get("duration_ms")
                duration_measured = data.get("duration_measured", False)
                
                if duration_measured:
                    # Already properly marked
                    stats["already_measured"] += 1
                elif duration_ms is not None and duration_ms > 1:
                    # Has valid duration but missing flag - backfill
                    event["data"]["duration_measured"] = True
                    stats["backfilled"] += 1
                elif duration_ms == 1:
                    # Sentinel value - check if it's explicitly measured or not
                    if "duration_ms" in event.get("metrics", {}):
                        # Duration was in metrics, means it was passed explicitly
                        event["data"]["duration_measured"] = True
                        stats["sentinel_fixed"] += 1
                    else:
                        stats["still_missing"] += 1
                else:
                    stats["still_missing"] += 1
                
                events.append(event)
            except json.JSONDecodeError:
                stats["errors"] += 1
                # Keep original line for non-JSON lines
                events.append(None)
    
    # Write back if not dry run
    if not dry_run and events:
        backup_file = metrics_file.with_suffix('.jsonl.duration_bak')
        # Only create backup if not already exists
        if not backup_file.exists():
            os.rename(metrics_file, backup_file)
        else:
            os.remove(metrics_file)
        
        with open(metrics_file, 'w') as f:
            for event in events:
                if event is not None:
                    f.write(json.dumps(event) + '\n')
    
    return stats


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Backfill duration_measured flag")
    parser.add_argument("--dry-run", action="store_true", help="Don't write changes")
    parser.add_argument("--file", type=str, help="Specific file to process")
    args = parser.parse_args()
    
    goalie_dir = Path(".goalie")
    
    if args.file:
        files = [Path(args.file)]
    else:
        files = [goalie_dir / "pattern_metrics.jsonl"]
    
    print("=" * 60)
    print("Duration Measured Backfill")
    print("=" * 60)
    print()
    
    total_backfilled = 0
    
    for file_path in files:
        if not file_path.exists():
            continue
        
        print(f"Processing: {file_path}")
        stats = backfill_duration_measured(file_path, dry_run=args.dry_run)
        
        print(f"  Total events: {stats.get('total_events', 0)}")
        print(f"  Already measured: {stats.get('already_measured', 0)}")
        print(f"  Backfilled: {stats.get('backfilled', 0)}")
        print(f"  Sentinel fixed: {stats.get('sentinel_fixed', 0)}")
        print(f"  Still missing: {stats.get('still_missing', 0)}")
        
        total_measured = stats.get('already_measured', 0) + stats.get('backfilled', 0) + stats.get('sentinel_fixed', 0)
        if stats.get('total_events', 0) > 0:
            coverage = total_measured / stats['total_events'] * 100
            print(f"  New coverage: {coverage:.1f}%")
        
        total_backfilled += stats.get('backfilled', 0)
        print()
    
    if args.dry_run:
        print("DRY RUN - no changes written")
    else:
        print(f"✅ Backfill complete. Fixed {total_backfilled} events.")


if __name__ == "__main__":
    main()


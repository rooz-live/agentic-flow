#!/usr/bin/env python3
"""
Sync Circle Backlogs to Pattern Metrics
Reads all backlog.md files in circles/ directory and logs them to .goalie/pattern_metrics.jsonl
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime, timezone

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CIRCLES_DIR = PROJECT_ROOT / "circles"
GOALIE_DIR = PROJECT_ROOT / ".goalie"
PATTERN_METRICS_FILE = GOALIE_DIR / "pattern_metrics.jsonl"

def parse_backlog(file_path):
    items = []
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            # Find table rows: | ID | Task | Status | ...
            # Simple regex to find rows starting with |
            rows = re.findall(r'^\|.*\|$', content, re.MULTILINE)
            for row in rows:
                if '---|---' in row or '| ID |' in row:
                    continue
                parts = [p.strip() for p in row.split('|')]
                if len(parts) > 2:
                    items.append({
                        "id": parts[1],
                        "task": parts[2],
                        "status": parts[3] if len(parts) > 3 else "UNKNOWN"
                    })
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
    return items

def main():
    GOALIE_DIR.mkdir(exist_ok=True)

    backlogs = list(CIRCLES_DIR.rglob("backlog.md"))
    print(f"Found {len(backlogs)} backlog.md files.")

    synced_count = 0

    with open(PATTERN_METRICS_FILE, 'a') as f:
        for backlog_path in backlogs:
            circle_name = backlog_path.relative_to(CIRCLES_DIR).parts[0]
            items = parse_backlog(backlog_path)

            for item in items:
                event = {
                    "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    "event_type": "backlog_sync",
                    "circle": circle_name,
                    "pattern": "backlog-sync",
                    "backlog_item": item,
                    "source_file": str(backlog_path.relative_to(PROJECT_ROOT))
                }
                f.write(json.dumps(event) + "\n")
                synced_count += 1

    print(f"Synced {synced_count} items to {PATTERN_METRICS_FILE}")

if __name__ == "__main__":
    main()

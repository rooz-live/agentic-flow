import os
import json
import time
import argparse
from datetime import datetime
from pathlib import Path

def ingest_catalyst_backlog(backlog_path: str, goalie_dir: str):
    """
    Ingest Project Catalyst backlog items into the economic micro-ledger.
    """
    if not os.path.exists(backlog_path):
        print(f"Error: Backlog file not found: {backlog_path}")
        return

    metrics_log_path = os.path.join(goalie_dir, "metrics_log.jsonl")

    with open(backlog_path, 'r') as f:
        lines = f.readlines()

    # Skip header lines
    task_lines = [l for l in lines if '|' in l and 'ID' not in l and '---' not in l]

    ingested_count = 0
    for line in task_lines:
        parts = [p.strip() for p in line.split('|') if p.strip()]
        if len(parts) >= 6:
            task_id = parts[0]
            task_desc = parts[1]
            wsjf_score_str = parts[5].split('(')[0].strip()

            try:
                wsjf_score = float(wsjf_score_str)
            except ValueError:
                wsjf_score = 0.0

            # Create micro-ledger event
            event = {
                "timestamp": datetime.now().isoformat() + "Z",
                "pattern": "catalyst_proposal_ingested",
                "circle": "innovator",
                "data": {
                    "task_id": task_id,
                    "description": task_desc,
                    "source": "catalyst_backlog"
                },
                "economic": {
                    "wsjf_score": wsjf_score,
                    "revenue_impact": wsjf_score * 10.0,  # Proxy multiplier
                    "claimable": True
                },
                "tags": ["catalyst", "micro-ledger", "ingestion"]
            }

            with open(metrics_log_path, 'a') as log_f:
                log_f.write(json.dumps(event) + "\n")

            ingested_count += 1

    # Emit rollup event
    rollup_event = {
        "timestamp": datetime.now().isoformat() + "Z",
        "pattern": "catalyst_category_rollup",
        "circle": "innovator",
        "data": {
            "items_ingested": ingested_count,
            "category": "Project Catalyst"
        },
        "economic": {
            "total_items": ingested_count
        },
        "tags": ["catalyst", "micro-ledger", "rollup"]
    }

    with open(metrics_log_path, 'a') as log_f:
        log_f.write(json.dumps(rollup_event) + "\n")

    print(f"✅ Ingested {ingested_count} Catalyst items into micro-ledger")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest Project Catalyst backlog items.")
    parser.add_argument("--backlog", type=str, required=True, help="Path to backlog.md")
    parser.add_argument("--goalie-dir", type=str, default=".goalie", help="Goalie directory")

    args = parser.parse_args()
    ingest_catalyst_backlog(args.backlog, args.goalie_dir)

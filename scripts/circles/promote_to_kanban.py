#!/usr/bin/env python3
"""
Promote Backlog Items to Kanban Board
Usage: ./promote_to_kanban.py [circle] [--dry-run]

Scans circle backlogs for items with 'PENDING' status,
adds them to the 'next' column in .goalie/KANBAN_BOARD.yaml,
and updates their status to 'PROMOTED' in the backlog.md file.
"""

import os
import sys
import uuid
import time
import yaml
import re
import argparse
from datetime import datetime

# --- Configuration ---
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "scripts"))
from agentic.pattern_logger import PatternLogger

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GOALIE_DIR = os.path.join(PROJECT_ROOT, ".goalie")
KANBAN_FILE = os.path.join(GOALIE_DIR, "KANBAN_BOARD.yaml")

# Initialize Logger (global placeholder, re-init in main/promote)
logger = None

def load_kanban():
    if not os.path.exists(KANBAN_FILE):
        print(f"❌ Kanban board not found at {KANBAN_FILE}")
        sys.exit(1)
    with open(KANBAN_FILE, 'r') as f:
        return yaml.safe_load(f) or {}

def save_kanban(data):
    with open(KANBAN_FILE, 'w') as f:
        yaml.dump(data, f, sort_keys=False, indent=2)

def find_backlogs(circle):
    search_root = os.path.join(PROJECT_ROOT, "circles")
    if circle:
        search_root = os.path.join(search_root, circle)
    
    backlogs = []
    for root, dirs, files in os.walk(search_root):
        if "backlog.md" in files:
            backlogs.append(os.path.join(root, "backlog.md"))
    return backlogs

def parse_backlog_item(line):
    # Format: | ID | Task | Status | Budget | Pattern | DoR | DoD | CoD | Size | WSJF |
    parts = [p.strip() for p in line.split('|')]
    # parts[0] is empty
    if len(parts) < 4:
        return None
        
    item = {
        "id": parts[1],
        "title": parts[2],
        "status": parts[3],
        "wsjf": 0.0,
        "cod": 0.0,
        "size": 1.0
    }
    
    # Try to extract WSJF metrics based on schema
    # Tier 1 Schema: | ... | CoD | Size | WSJF | -> indices 8, 9, 10
    if len(parts) >= 11:
        try:
            item["cod"] = float(parts[8]) if parts[8] and parts[8] != 'None' else 0.0
            item["size"] = float(parts[9]) if parts[9] and parts[9] != 'None' else 1.0
            item["wsjf"] = float(parts[10]) if parts[10] and parts[10] != 'None' else 0.0
        except ValueError:
            pass
            
    # Tier 2 Schema: | ... | WSJF | -> index 6 (based on ReplenishManager format: | ID | Task | Status | DoR | DoD | WSJF |)
    # indices: 0="", 1=ID, 2=Task, 3=Status, 4=DoR, 5=DoD, 6=WSJF
    elif len(parts) >= 7 and "WSJF" not in parts[6]: # Avoid header
        try:
             item["wsjf"] = float(parts[6]) if parts[6] and parts[6] != 'None' else 0.0
        except ValueError:
            pass

    return item

def update_backlog_status(file_path, item_id, new_status):
    lines = []
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    with open(file_path, 'w') as f:
        for line in lines:
            if item_id in line:
                # Replace PENDING with PROMOTED (simple replace, could be more robust)
                line = line.replace("PENDING", new_status)
            f.write(line)

def promote_items(circle, dry_run=False, tenant_id="default"):
    # Initialize Logger with context
    global logger
    logger = PatternLogger(
        mode="mutate" if not dry_run else "advisory",
        circle=circle or "global",
        run_id=f"promote-{int(time.time())}",
        tenant_id=tenant_id,
        tenant_platform="agentic-flow-core"
    )

    kanban_data = load_kanban()
    
    # Ensure 'NEXT' section exists in yaml structure logic
    if "NEXT" not in kanban_data:
        kanban_data["NEXT"] = []
    
    backlogs = find_backlogs(circle)
    promoted_count = 0
    
    for backlog_path in backlogs:
        role = os.path.basename(os.path.dirname(backlog_path))
        print(f"🔍 Scanning {role}...")
        
        items_to_promote = []
        with open(backlog_path, 'r') as f:
            for line in f:
                if "| PENDING |" in line:
                    item = parse_backlog_item(line)
                    if item:
                        item['source_file'] = backlog_path
                        items_to_promote.append(item)
        
        for item in items_to_promote:
            print(f"  ✨ Promoting: {item['title']} (WSJF: {item['wsjf']})")
            
            if not dry_run:
                # Add to Kanban
                kanban_entry = {
                    "id": item['id'],
                    "title": item['title'],
                    "summary": f"Role: {role} | WSJF: {item['wsjf']}",
                    "circle": circle if circle else "global",
                    "status": "todo",
                    "created_at": datetime.now().isoformat(),
                    "wsjf": item['wsjf'],  # Top-level field for hygiene checks
                    "economic": {
                        "wsjf": item['wsjf'],
                        "cod": item['cod']
                    }
                }
                kanban_data["NEXT"].append(kanban_entry)
                
                # Update Backlog file
                update_backlog_status(item['source_file'], item['id'], "PROMOTED")
                promoted_count += 1
                
                # Log forensic audit event
                logger.log(
                    pattern_name="kanban_promotion",
                    data={
                        "role": role,
                        "title": item['title'],
                        "source": "promote_to_kanban",
                        "action": "promote_to_next"
                    },
                    gate="governance",
                    behavioral_type="enforcement",
                    backlog_item=item['id'],
                    economic={
                        "wsjf_score": item['wsjf'],
                        "cod": item['cod'],
                        "size": item['size']
                    },
                    run_type="promote_to_kanban"
                )

    if not dry_run and promoted_count > 0:
        save_kanban(kanban_data)
        print(f"\n✅ Successfully promoted {promoted_count} items to Kanban 'NEXT' column.")
    elif dry_run:
        print(f"\n🚫 Dry run: {promoted_count} items would be promoted.")
    else:
        print("\n🤷 No PENDING items found to promote.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Promote backlog items to Kanban")
    parser.add_argument("circle", nargs="?", help="Specific circle to scan (optional)")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes")
    parser.add_argument("--tenant-id", help="Tenant ID", default="default")
    args = parser.parse_args()
    
    promote_items(args.circle, args.dry_run, args.tenant_id)

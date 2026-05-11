#!/usr/bin/env python3
import os
import re
import time
import hashlib
from difflib import SequenceMatcher

WORKSPACE_ROOT = os.environ.get("WORKSPACE_ROOT", "/Users/shahroozbhopti/Documents/code")
BACKLOG_PATH = os.path.join(WORKSPACE_ROOT, "CAPABILITY_BACKLOG.md")
LOG_FILE = os.path.join(WORKSPACE_ROOT, "hygiene_daemon.log")

def log(msg):
    with open(LOG_FILE, "a") as f:
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
        f.write(f"[{timestamp}] {msg}\n")
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def similarity(a, b):
    return SequenceMatcher(None, a, b).ratio()

def dedupe_backlog():
    if not os.path.exists(BACKLOG_PATH):
        log("Backlog not found, skipping semantic deduplication.")
        return

    with open(BACKLOG_PATH, 'r') as f:
        content = f.read()

    lines = content.splitlines()
    header_lines = []
    table_lines = []
    footer_lines = []
    
    in_table = False
    for line in lines:
        if line.startswith("| ID |"):
            in_table = True
            header_lines.append(line)
        elif in_table and line.startswith("|----"):
            header_lines.append(line)
        elif in_table and line.startswith("|"):
            table_lines.append(line)
        elif in_table and not line.strip():
            in_table = False
            footer_lines.append(line)
        elif not in_table and not table_lines:
            header_lines.append(line)
        else:
            footer_lines.append(line)

    unique_capabilities = {}
    pruned_count = 0
    new_table = []

    for row in table_lines:
        parts = [p.strip() for p in row.split('|')]
        if len(parts) < 8: continue
        
        row_id = parts[1]
        status = parts[2]
        epic = parts[3]
        capability = parts[4]
        domain = parts[5]
        
        # Semantic Signature
        signature = f"{epic}:{capability}:{domain}".lower()
        
        if signature in unique_capabilities:
            log(f"🧹 Pruning Semantic Duplicate: {row_id} (Merged into {unique_capabilities[signature]})")
            pruned_count += 1
        else:
            unique_capabilities[signature] = row_id
            new_table.append(row)

    if pruned_count > 0:
        with open(BACKLOG_PATH, 'w') as f:
            f.write("\n".join(header_lines) + "\n")
            f.write("\n".join(new_table) + "\n")
            f.write("\n".join(footer_lines) + "\n")
        log(f"✅ Deduplication complete. {pruned_count} semantic duplicates physically removed from Backlog.")
    else:
        log("🟢 Backlog is already semantically clean. Zero duplicates found.")

def scan_redundant_scripts():
    script_dir = os.path.join(WORKSPACE_ROOT, "scripts")
    if not os.path.exists(script_dir): return
    
    hashes = {}
    redundant = 0
    
    for root, _, files in os.walk(script_dir):
        for file in files:
            if file.endswith(".sh") or file.endswith(".py"):
                path = os.path.join(root, file)
                with open(path, 'rb') as f:
                    file_hash = hashlib.md5(f.read()).hexdigest()
                    
                if file_hash in hashes:
                    log(f"⚠️ Redundant Script Detected: {path} is an exact copy of {hashes[file_hash]}")
                    redundant += 1
                else:
                    hashes[file_hash] = path
                    
    if redundant == 0:
        log("🟢 No exact script redundancies detected.")

def main():
    log("🚀 [HYGIENE DAEMON] Initializing Universal Semantic Sweeper...")
    dedupe_backlog()
    scan_redundant_scripts()
    log("🏁 [HYGIENE DAEMON] Sweep completed. Entering sleep cycle.")

if __name__ == "__main__":
    main()

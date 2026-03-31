#!/usr/bin/env python3
"""
Generate Circle-Document Index for VS Code Integration.

Walks the circles directory and builds a mapping of role -> document path.
Output: .goalie/circle_doc_index.json
"""

import os
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CIRCLES_DIR = PROJECT_ROOT / "circles"
OUTPUT_FILE = PROJECT_ROOT / ".goalie" / "circle_doc_index.json"

def generate_index():
    if not CIRCLES_DIR.exists():
        print(f"Error: Circles directory not found at {CIRCLES_DIR}")
        return

    index = {}
    
    # Walk the circles directory
    for root, dirs, files in os.walk(CIRCLES_DIR):
        root_path = Path(root)
        
        # Determine circle name from path
        try:
            rel_path = root_path.relative_to(CIRCLES_DIR)
            parts = rel_path.parts
            if not parts:
                continue
            circle_name = parts[0]
        except ValueError:
            continue

        for file in files:
            if file.endswith(".md"):
                file_path = root_path / file
                rel_file_path = file_path.relative_to(PROJECT_ROOT)
                
                # Use filename stem as key (e.g. "backlog" -> "circles/analyst/.../backlog.md")
                # Also index by role name if parent folder suggests it
                
                # simple key: circle:filename
                key_simple = f"{circle_name}:{file}"
                index[key_simple] = str(rel_file_path)
                
                # role key: circle:role (if file is purpose.md or backlog.md in a role folder)
                if len(parts) > 1:
                    # heuristic: parts[1] might be "operational-analyst-roles", parts[2] might be "Analyst"
                    if "roles" in parts[1] and len(parts) > 2:
                        role_name = parts[2]
                        if file in ["purpose.md", "backlog.md", "accountabilities.md", "domains.md"]:
                            key_role = f"{circle_name}:{role_name}:{file.replace('.md', '')}"
                            index[key_role] = str(rel_file_path)
                            
                            # Primary role link
                            if file == "backlog.md":
                                index[f"{circle_name}:{role_name}"] = str(rel_file_path)

    # Ensure output dir exists
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    with open(OUTPUT_FILE, "w") as f:
        json.dump(index, f, indent=2)
        
    print(f"Generated index with {len(index)} entries at {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_index()

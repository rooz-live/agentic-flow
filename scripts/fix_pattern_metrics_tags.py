#!/usr/bin/env python3
"""
Fix missing tags in pattern_metrics.jsonl for Tier 1/2 circles.
"""

import json
import shutil
from datetime import datetime
from pathlib import Path

# Define default tags for each circle
CIRCLE_TAGS = {
    "innovator": ["innovation", "experimentation"],
    "analyst": ["analysis", "data-driven"],
    "assessor": ["quality", "validation"],
    "intuitive": ["insight", "pattern-recognition"],
    "orchestrator": ["orchestration", "coordination"],
    "integration": ["integration", "automation"],
    "governance": ["governance", "compliance"],
    "seeker": ["discovery", "exploration"],
    "inbox-zero": ["communication", "triage"]
}

# Tier 1 and Tier 2 circles that should have tags
TIER_1_2_CIRCLES = ["innovator", "analyst", "assessor", "intuitive", "orchestrator"]

def fix_tags():
    """Fix missing tags in pattern metrics file."""
    
    pattern_file = Path(".goalie/pattern_metrics.jsonl")
    
    if not pattern_file.exists():
        print(f"❌ File not found: {pattern_file}")
        return 1
    
    # Create backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = pattern_file.parent / f"pattern_metrics_backup_tags_{timestamp}.jsonl"
    print(f"📦 Creating backup: {backup_file}")
    shutil.copy(pattern_file, backup_file)
    
    # Read and process entries
    print(f"📖 Reading {pattern_file}...")
    entries = []
    fixed_count = 0
    
    with open(pattern_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                entry = json.loads(line.strip())
                circle = entry.get('circle', '')
                tags = entry.get('tags', [])
                
                # Fix empty tags for Tier 1/2 circles
                if circle in TIER_1_2_CIRCLES and not tags:
                    entry['tags'] = CIRCLE_TAGS.get(circle, [circle])
                    fixed_count += 1
                    if fixed_count <= 10:  # Show first 10
                        print(f"  ✏️  Line {line_num}: Added tags {entry['tags']} to circle '{circle}'")
                
                # Also add tags for other known circles if empty
                elif circle in CIRCLE_TAGS and not tags:
                    entry['tags'] = CIRCLE_TAGS[circle]
                    fixed_count += 1
                    if fixed_count <= 10:
                        print(f"  ✏️  Line {line_num}: Added tags {entry['tags']} to circle '{circle}'")
                
                entries.append(entry)
                
            except json.JSONDecodeError as e:
                print(f"  ⚠️  Line {line_num}: JSON decode error: {e}")
                continue
    
    # Write fixed entries
    print(f"\n💾 Writing fixed data to {pattern_file}...")
    with open(pattern_file, 'w') as f:
        for entry in entries:
            f.write(json.dumps(entry) + '\n')
    
    print(f"\n✅ Tag fix complete!")
    print(f"   📊 Total entries: {len(entries)}")
    print(f"   ✅ Fixed: {fixed_count}")
    print(f"   💾 Backup: {backup_file}")
    
    return 0

if __name__ == "__main__":
    exit(fix_tags())

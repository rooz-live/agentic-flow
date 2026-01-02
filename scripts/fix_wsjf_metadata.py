#!/usr/bin/env python3
"""
Fix WSJF Metadata in Backlog Items

This script:
1. Scans all circle backlog.md files
2. Identifies items with malformed or missing WSJF components
3. Adds proper WSJF metadata (UBV, TC, RR, Size) based on intelligent defaults
4. Cleans up duplicate/malformed WSJF annotations
"""

import os
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
CIRCLES_DIR = PROJECT_ROOT / "circles"

# Default WSJF component values by item type (heuristics)
DEFAULT_WSJF = {
    "integration": {"ubv": 7, "tc": 5, "rr": 4, "size": 3},
    "implement": {"ubv": 8, "tc": 6, "rr": 5, "size": 2},
    "verify": {"ubv": 5, "tc": 4, "rr": 6, "size": 1},
    "insight": {"ubv": 3, "tc": 2, "rr": 2, "size": 1},
    "generic": {"ubv": 5, "tc": 3, "rr": 3, "size": 2}
}

def detect_task_type(task_desc):
    """Detect task type from description."""
    desc_lower = task_desc.lower()
    if "integrat" in desc_lower:
        return "integration"
    elif "implement" in desc_lower or "build" in desc_lower:
        return "implement"
    elif "verify" in desc_lower or "validate" in desc_lower:
        return "verify"
    elif "insight" in desc_lower or "actionable" in desc_lower:
        return "insight"
    return "generic"

def extract_wsjf_components(line):
    """Extract existing WSJF components if present."""
    components = {}
    
    ubv_match = re.search(r'(?:UBV|User Business Value):\s*(\d+)', line, re.IGNORECASE)
    if ubv_match:
        components['ubv'] = int(ubv_match.group(1))
    
    tc_match = re.search(r'(?:TC|Time Criticality):\s*(\d+)', line, re.IGNORECASE)
    if tc_match:
        components['tc'] = int(tc_match.group(1))
    
    rr_match = re.search(r'(?:RR|RROE|Risk Reduction):\s*(\d+)', line, re.IGNORECASE)
    if rr_match:
        components['rr'] = int(rr_match.group(1))
    
    size_match = re.search(r'(?:Size|Job Size):\s*(\d+)', line, re.IGNORECASE)
    if size_match:
        components['size'] = int(size_match.group(1))
    
    return components

def clean_malformed_wsjf(line):
    """Remove malformed WSJF annotations like '(WSJF: 6.0) (WSJF: 6.0)...'"""
    # Remove repeated WSJF patterns
    line = re.sub(r'(\(WSJF:\s*[\d.]+\)\s*)+', '', line)
    # Remove orphaned WSJF scores without CoD
    line = re.sub(r'\(WSJF:\s*[\d.]+\)\s*$', '', line)
    return line.strip()

def add_wsjf_metadata(line, task_desc):
    """Add proper WSJF metadata to a backlog line."""
    # Clean up existing malformed data
    line = clean_malformed_wsjf(line)
    
    # Check if already has complete WSJF components
    existing = extract_wsjf_components(line)
    
    # Detect task type and get defaults
    task_type = detect_task_type(task_desc)
    defaults = DEFAULT_WSJF[task_type].copy()
    
    # Merge with existing (prefer existing values)
    for key in ['ubv', 'tc', 'rr', 'size']:
        if key not in existing:
            existing[key] = defaults[key]
    
    # Calculate CoD and WSJF
    cod = existing['ubv'] + existing['tc'] + existing['rr']
    wsjf = round(cod / existing['size'], 2) if existing['size'] > 0 else 0
    
    # Build metadata string
    metadata = f" (UBV: {existing['ubv']}, TC: {existing['tc']}, RR: {existing['rr']}, Size: {existing['size']}, CoD: {cod}, WSJF: {wsjf})"
    
    # Insert metadata before the last column (usually WSJF column)
    # Pattern: | ... | WSJF_VALUE |
    if '|' in line:
        parts = line.split('|')
        # Insert before last column
        if len(parts) >= 2:
            parts[-2] = parts[-2].strip() + metadata
            return '|'.join(parts)
    
    # Fallback: append to end
    return line + metadata

def process_backlog_file(filepath):
    """Process a single backlog.md file."""
    print(f"Processing: {filepath}")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"  Error reading file: {e}")
        return False
    
    modified = False
    new_lines = []
    
    for i, line in enumerate(lines):
        # Skip header rows
        if i == 0 or '---' in line:
            new_lines.append(line)
            continue
        
        # Process task rows (contain FLOW-R- IDs)
        if 'FLOW-R-' in line or '|' in line:
            # Extract task description
            task_match = re.search(r'\|\s*([^|]+?)\s*\|', line)
            task_desc = task_match.group(1) if task_match else ""
            
            # Check if needs WSJF metadata
            if task_desc and ('(' not in line or '(WSJF:' in line):
                original_line = line
                line = add_wsjf_metadata(line, task_desc)
                if line != original_line:
                    modified = True
                    print(f"  Fixed line {i+1}: {task_desc[:40]}...")
        
        new_lines.append(line)
    
    if modified:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            print(f"  ✅ Updated {filepath}")
            return True
        except Exception as e:
            print(f"  ❌ Error writing file: {e}")
            return False
    else:
        print(f"  No changes needed")
        return False

def main():
    """Main execution."""
    print("🔍 Scanning for backlog files...")
    
    backlog_files = list(CIRCLES_DIR.rglob("backlog.md"))
    print(f"Found {len(backlog_files)} backlog files\n")
    
    updated_count = 0
    for filepath in backlog_files:
        if process_backlog_file(filepath):
            updated_count += 1
        print()
    
    print(f"✅ Complete! Updated {updated_count}/{len(backlog_files)} files")

if __name__ == "__main__":
    main()

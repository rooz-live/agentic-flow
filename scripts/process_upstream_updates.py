#!/usr/bin/env python3
"""
Process upstream updates report and create action items
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
REPORT_FILE = PROJECT_ROOT / "logs/upstream_updates_latest.md"
ACTIONS_FILE = PROJECT_ROOT / ".goalie/UPSTREAM_ACTIONS.yaml"

def parse_report():
    """Parse upstream report and extract actionable items"""
    if not REPORT_FILE.exists():
        print("No report found. Run: ./scripts/check_upstream_updates.sh")
        return []
    
    with open(REPORT_FILE) as f:
        content = f.read()
    
    actions = []
    
    # Parse NPM updates
    npm_match = re.search(r'\*\*Status:\*\* 🟡 (\d+) packages have updates available', content)
    if npm_match:
        count = int(npm_match.group(1))
        
        # Extract major updates (higher priority)
        major_packages = re.findall(r'\| (.*?) \| .* \| .* \| major \|', content)
        
        if major_packages:
            actions.append({
                "title": f"Update {len(major_packages)} major NPM packages",
                "priority": "HIGH",
                "packages": major_packages,
                "wsjf": 8.0,  # Breaking changes need review
                "command": "npm install " + " ".join([f"{pkg}@latest" for pkg in major_packages[:3]])
            })
        
        if count - len(major_packages) > 0:
            actions.append({
                "title": f"Update {count - len(major_packages)} minor/patch NPM packages",
                "priority": "MEDIUM",
                "wsjf": 6.0,
                "command": "npm update"
            })
    
    # Parse security vulnerabilities
    if "🔴 **CRITICAL**" in content or "🟡" in content:
        severity = "CRITICAL" if "🔴" in content else "HIGH"
        actions.append({
            "title": "Fix security vulnerabilities",
            "priority": severity,
            "wsjf": 10.0 if severity == "CRITICAL" else 8.0,
            "command": "npm audit fix"
        })
    
    # Parse Git updates
    behind_match = re.search(r'Behind upstream by (\d+) commits', content)
    if behind_match:
        commits = int(behind_match.group(1))
        actions.append({
            "title": f"Sync with upstream ({commits} commits)",
            "priority": "MEDIUM",
            "wsjf": 7.0,
            "command": "git pull upstream main"
        })
    
    return actions

def save_actions(actions):
    """Save actions to YAML for goalie tracking"""
    ACTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    with open(ACTIONS_FILE, 'w') as f:
        f.write("---\n")
        f.write(f"# Upstream Update Actions\n")
        f.write(f"# Generated: {datetime.utcnow().isoformat()}Z\n")
        f.write(f"# From: {REPORT_FILE}\n\n")
        f.write("items:\n")
        
        for i, action in enumerate(actions, 1):
            f.write(f"  - id: UPSTREAM-{i}\n")
            f.write(f"    title: \"{action['title']}\"\n")
            f.write(f"    priority: {action['priority']}\n")
            f.write(f"    wsjf_score: {action['wsjf']}\n")
            f.write(f"    command: \"{action['command']}\"\n")
            f.write(f"    status: PENDING\n")
            if 'packages' in action:
                f.write(f"    packages: {json.dumps(action['packages'])}\n")
            f.write("\n")
    
    print(f"✅ Actions saved: {ACTIONS_FILE}")
    print(f"   Total: {len(actions)} action items")

def main():
    actions = parse_report()
    
    if not actions:
        print("✅ No upstream actions needed - all up to date!")
        return
    
    save_actions(actions)
    
    # Display summary
    print("\n📋 Upstream Action Summary:")
    for action in actions:
        print(f"  [{action['priority']}] {action['title']}")
        print(f"      WSJF: {action['wsjf']} | Command: {action['command']}")

if __name__ == "__main__":
    main()

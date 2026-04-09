#!/usr/bin/env python3
"""
extract-historic-delta.py
Analyzes the go_no_go_ledger.md and outputs a 2-week Velocity Delta report.
This explicitly highlights cross-session overlaps preventing duplication.
"""

import os
import re
import datetime

def generate_delta_report():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    ledger_path = os.path.join(project_root, '.goalie', 'go_no_go_ledger.md')
    delta_report_path = os.path.join(project_root, 'reports', 'VELOCITY_DELTAS.md')

    if not os.path.exists(ledger_path):
        print(f"[✗] Ledger not found at {ledger_path}")
        return

    with open(ledger_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Simple heuristic to extract the latest completed cycles
    completed_cycles = re.findall(r'\| (Cycle.*?)\| (.*?)\| (.*?)\| (.*?)\|', content)
    
    # Analyze frequency of duplicated targets
    targets = [cycle[1].strip() for cycle in completed_cycles]
    duplicates = {target: targets.count(target) for target in set(targets) if targets.count(target) > 1}

    report = [
        "# 2-Week Velocity Delta Report",
        f"**Generated**: {datetime.datetime.now(datetime.timezone.utc).isoformat()}",
        "",
        "## Cycle Momentum",
        f"Total tracked cycle entries found: {len(completed_cycles)}",
        "",
        "## Structural Duplication Warnings",
        "The following WSJF targets appeared iteratively across multiple bounds, indicating potential amnesia or cycle repetition:",
    ]

    if duplicates:
        for target, count in duplicates.items():
            report.append(f"- **{target}**: Executed {count} times.")
    else:
        report.append("- *No major execution overlaps detected.*")

    report.extend([
        "",
        "## Next Steps for Agentic Swarms",
        "1. Check `reports/VELOCITY_DELTAS.md` before adopting WSJF priorities.",
        "2. Do NOT re-execute tasks listed in the duplicate bounds.",
        "3. Bypass repeated initialization using `_SYSTEM/_AUTOMATION/bootstrap_session.sh`."
    ])

    os.makedirs(os.path.dirname(delta_report_path), exist_ok=True)
    with open(delta_report_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))

    print(f"[\033[0;32m✓\033[0m] Velocity Delta exported to {delta_report_path}")

if __name__ == "__main__":
    generate_delta_report()

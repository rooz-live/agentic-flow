#!/usr/bin/env python3
"""
Runbook Generator
P2-TIME: Auto-generate executable runbooks from RESOLVED ROAM entries and governance policies.
"""

import argparse
import json
import os
from pathlib import Path
from datetime import datetime

try:
    import yaml
except ImportError:
    print("PyYAML not installed. Run: pip install pyyaml")
    import sys
    sys.exit(1)

class RunbookGenerator:
    def __init__(self, goalie_dir: str = ".goalie", docs_dir: str = "docs/runbooks"):
        self.goalie_dir = Path(goalie_dir)
        self.docs_dir = Path(docs_dir)
        self.docs_dir.mkdir(parents=True, exist_ok=True)
        self.roam_path = self.goalie_dir / "ROAM_TRACKER.yaml"

    def load_roam(self):
        if not self.roam_path.exists():
            print(f"Warning: {self.roam_path} not found.")
            return {}
        with open(self.roam_path, 'r') as f:
            return yaml.safe_load(f)

    def generate_roam_runbooks(self):
        """Generate runbooks from RESOLVED ROAM entries."""
        data = self.load_roam()

        count = 0
        for category in ['blockers', 'risks', 'dependencies']:
            if category not in data:
                continue

            for item in data[category]:
                status = item.get('roam_status') or item.get('status')
                if status == 'RESOLVED' or status == 'mitigated':
                    self._create_runbook_from_item(item, category)
                    count += 1

        return count

    def _create_runbook_from_item(self, item, category):
        """Create a Markdown runbook for a resolved item."""
        item_id = item.get('id', 'unknown')
        title = item.get('title', 'Untitled')

        # Determine content
        resolution = item.get('resolution_plan') or item.get('mitigation') or "No resolution plan recorded."
        owner = item.get('owner', 'Unassigned')

        filename = f"{item_id.lower().replace('-', '_')}_runbook.md"
        path = self.docs_dir / filename

        content = f"""# Runbook: {title} ({item_id})

**Category**: {category.title()}
**Owner**: {owner}
**Generated**: {datetime.now().isoformat()}

## Context
This runbook was automatically generated from a RESOLVED ROAM entry.
It documents the steps taken to resolve "{title}".

## Resolution / Mitigation Plan
{resolution}

## Verification Steps
1. Verify the root cause is addressed.
2. Check monitoring signals.
3. Validate no regression in related components.

## Related Resources
- {self.roam_path}
"""

        with open(path, 'w') as f:
            f.write(content)
        print(f"Generated runbook: {path}")

    def generate_violation_runbooks(self):
        """Generate runbooks for common governance violations."""
        # Mapping of violation rules to runbook templates
        templates = {
            "ROAM-STALE": {
                "title": "ROAM Staleness Remediation",
                "steps": [
                    "Review .goalie/ROAM_TRACKER.yaml",
                    "Update 'last_updated' field to today's date",
                    "Review all open risks and dependencies",
                    "Mark resolved items as RESOLVED",
                    "Commit and push changes"
                ]
            },
            "PATTERN-ANOMALY": {
                "title": "Pattern Anomaly Investigation",
                "steps": [
                    "Check .goalie/pattern_metrics.jsonl for high drift events",
                    "Run 'af retro-coach' to analyze patterns",
                    "If safe_degrade triggered, check system load",
                    "Adjust circuit breaker thresholds if false positive"
                ]
            }
        }

        count = 0
        for rule_id, tmpl in templates.items():
            filename = f"violation_{rule_id.lower().replace('-', '_')}.md"
            path = self.docs_dir / filename

            content = f"""# Violation Runbook: {tmpl['title']} ({rule_id})

**Trigger**: Governance violation detected for {rule_id}
**Generated**: {datetime.now().isoformat()}

## Remediation Steps
"""
            for i, step in enumerate(tmpl['steps']):
                content += f"{i+1}. {step}\n"

            with open(path, 'w') as f:
                f.write(content)
            print(f"Generated runbook: {path}")
            count += 1

        return count

def main():
    parser = argparse.ArgumentParser(description="Auto-generate runbooks from governance data")
    parser.add_argument("--goalie-dir", default=".goalie", help="Goalie directory")
    parser.add_argument("--output-dir", default="docs/runbooks", help="Output directory for runbooks")

    args = parser.parse_args()

    generator = RunbookGenerator(args.goalie_dir, args.output_dir)

    print("Generating ROAM runbooks...")
    roam_count = generator.generate_roam_runbooks()

    print("Generating Violation runbooks...")
    violation_count = generator.generate_violation_runbooks()

    print(f"\nTotal runbooks generated: {roam_count + violation_count}")

if __name__ == "__main__":
    main()

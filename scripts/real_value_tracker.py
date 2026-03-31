#!/usr/bin/env python3
"""
Real Value Tracking System
Tracks actual delivered value from completed backlog items, not simulated WSJF formulas.
"""

import os
import sys
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional

PROJECT_ROOT = Path(__file__).parent.parent
CIRCLES_DIR = PROJECT_ROOT / "circles"
VALUE_TRACK_FILE = PROJECT_ROOT / ".goalie" / "real_value_tracking.jsonl"


class RealValueTracker:
    """Tracks actual value delivered from completed work items."""

    def __init__(self):
        self.value_track_file = VALUE_TRACK_FILE
        self.value_track_file.parent.mkdir(parents=True, exist_ok=True)
        self.completed_items = self._load_completed_items()

    def _load_completed_items(self) -> List[Dict[str, Any]]:
        """Load previously tracked completed items."""
        if not self.value_track_file.exists():
            return []
        
        items = []
        with open(self.value_track_file, 'r') as f:
            for line in f:
                if line.strip():
                    items.append(json.loads(line))
        return items

    def _save_completed_item(self, item: Dict[str, Any]):
        """Save a completed item to the tracking file."""
        with open(self.value_track_file, 'a') as f:
            f.write(json.dumps(item) + '\n')

    def parse_backlog_file(self, circle: str) -> Dict[str, Any]:
        """Parse a circle's QUICK_WINS.md or backlog.md file."""
        backlog_file = None
        
        # Try QUICK_WINS.md first, then backlog.md
        for filename in ["QUICK_WINS.md", "backlog.md"]:
            potential_file = CIRCLES_DIR / circle / filename
            if potential_file.exists():
                backlog_file = potential_file
                break
        
        if not backlog_file:
            return {"circle": circle, "items": [], "completed": [], "value_tracking": {}}

        with open(backlog_file, 'r') as f:
            content = f.read()

        # Parse completed items section
        completed_section = re.search(r'## Completed Items.*?(?=##|$)', content, re.DOTALL)
        completed_items = []
        
        if completed_section:
            # Extract completed items with their actual value
            item_pattern = r'### ([\w-]+): (.+?)(?=- \*\*Status\*\*:|###|$)'
            items = re.findall(item_pattern, completed_section.group(), re.DOTALL)
            
            for item_id, description in items:
                # Look for value metrics in the description
                value_match = re.search(r'Revenue Impact: \$(\d+)', description)
                actual_value = int(value_match.group(1)) if value_match else 0
                
                completed_items.append({
                    "id": item_id.strip(),
                    "description": description.strip(),
                    "actual_value_usd": actual_value,
                    "completed_date": datetime.now(timezone.utc).isoformat()
                })

        # Parse value tracking section
        value_tracking = {}
        value_section = re.search(r'## Value Tracking\s*\n(.*?)(?=##|$)', content, re.DOTALL)
        if value_section:
            for line in value_section.group().split('\n'):
                if ':' in line and not line.startswith('#'):
                    key, value = line.split(':', 1)
                    value_tracking[key.strip()] = value.strip()

        return {
            "circle": circle,
            "items": completed_items,
            "value_tracking": value_tracking
        }

    def track_completion(self, circle: str, item_id: str, actual_value_usd: int, notes: str = ""):
        """Record a completed work item with its actual delivered value."""
        completion_record = {
            "circle": circle,
            "item_id": item_id,
            "actual_value_usd": actual_value_usd,
            "completed_date": datetime.now(timezone.utc).isoformat(),
            "notes": notes,
            "type": "actual_value_delivered"
        }
        
        self._save_completed_item(completion_record)
        self.completed_items.append(completion_record)

    def get_real_value_summary(self) -> Dict[str, Any]:
        """Generate summary of actual delivered value vs simulated metrics."""
        # Parse all circle backlogs
        circles = ["analyst", "innovator", "seeker", "intuitive", "orchestrator", "assessor"]
        circle_data = {}
        
        for circle in circles:
            circle_data[circle] = self.parse_backlog_file(circle)

        # Calculate actual delivered value
        total_actual_value = sum(item["actual_value_usd"] for item in self.completed_items)
        
        # Calculate value by circle
        value_by_circle = {}
        for item in self.completed_items:
            circle = item["circle"]
            if circle not in value_by_circle:
                value_by_circle[circle] = 0
            value_by_circle[circle] += item["actual_value_usd"]

        # Get simulated WSJF value for comparison
        simulated_value = self._get_simulated_value()

        return {
            "summary_date": datetime.now(timezone.utc).isoformat(),
            "actual_value_delivered": {
                "total_usd": total_actual_value,
                "by_circle": value_by_circle,
                "items_completed": len(self.completed_items)
            },
            "simulated_metrics": {
                "wsjf_revenue_hour": simulated_value.get("revenue_per_hour", 0),
                "wsjf_total": simulated_value.get("total_wsjf", 0)
            },
            "reality_ratio": {
                "actual_vs_simulated": total_actual_value / max(simulated_value.get("revenue_per_hour", 1), 1),
                "interpretation": "Theater" if total_actual_value < simulated_value.get("revenue_per_hour", 1) * 0.1 else "Real"
            },
            "circle_details": circle_data
        }

    def _get_simulated_value(self) -> Dict[str, Any]:
        """Get current simulated WSJF metrics for comparison."""
        # This would read the latest prod-cycle output
        # For now, return placeholder
        return {
            "revenue_per_hour": 600000,  # From last run
            "total_wsjf": 44000000
        }

    def generate_report(self) -> str:
        """Generate a human-readable report of real vs simulated value."""
        summary = self.get_real_value_summary()
        
        report = f"""
# Real Value Delivery Report
Generated: {summary['summary_date']}

## Reality Check
- **Actual Value Delivered**: ${summary['actual_value_delivered']['total_usd']:,.2f}
- **Simulated Revenue/Hour**: ${summary['simulated_metrics']['wsjf_revenue_hour']:,.2f}
- **Items Actually Completed**: {summary['actual_value_delivered']['items_completed']}
- **Reality Ratio**: {summary['reality_ratio']['actual_vs_simulated']:.2%}
- **Assessment**: {summary['reality_ratio']['interpretation']}

## Value by Circle
"""
        
        for circle, value in summary['actual_value_delivered']['by_circle'].items():
            report += f"- **{circle.title()}**: ${value:,.2f}\n"
        
        report += "\n## Recommendations\n"
        
        if summary['reality_ratio']['interpretation'] == "Theater":
            report += "⚠️  Current metrics are primarily simulated WSJF formulas.\n"
            report += "→ Focus on completing actual backlog items to generate real value.\n"
        else:
            report += "✅ System is delivering real value from completed work.\n"
            report += "→ Continue tracking actual deliveries vs simulated metrics.\n"
        
        return report


def main():
    """CLI interface for real value tracking."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Track real value delivery vs simulated metrics")
    parser.add_argument("--track", nargs=4, metavar=("CIRCLE", "ITEM_ID", "VALUE", "NOTES"),
                       help="Track a completed item: circle item_id value_usd notes")
    parser.add_argument("--report", action="store_true", help="Generate real value report")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    
    args = parser.parse_args()
    
    tracker = RealValueTracker()
    
    if args.track:
        circle, item_id, value, notes = args.track
        try:
            value_usd = int(value)
            tracker.track_completion(circle, item_id, value_usd, notes)
            print(f"✅ Tracked completion: {circle}/{item_id} = ${value_usd}")
        except ValueError:
            print("❌ Value must be a number")
            return 1
    
    if args.report or args.json:
        summary = tracker.get_real_value_summary()
        if args.json:
            print(json.dumps(summary, indent=2))
        else:
            print(tracker.generate_report())
    
    return 0


if __name__ == "__main__":
    sys.exit(main())

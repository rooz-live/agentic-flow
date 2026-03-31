#!/usr/bin/env python3
"""
Circle Orchestrator for Agentic Flow
Routes actions to circle backlogs based on governance patterns and economic gaps

Usage:
  python scripts/circle_orchestrator.py route [--dry-run]
  
Or via af CLI:
  ./scripts/af circle-orchestrate [--dry-run]
"""

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import yaml
except ImportError:
    print("Warning: PyYAML not installed. Install with: pip install PyYAML")
    yaml = None
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
GOALIE = ROOT / ".goalie"

ISO_FMT = "%Y-%m-%dT%H:%M:%SZ"


def read_yaml_file(path: Path) -> Dict[str, Any]:
    """Read YAML file"""
    if not path.exists():
        return {}
    try:
        with path.open("r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except Exception as e:
        print(f"Warning: Failed to read {path}: {e}")
        return {}


def write_yaml_file(path: Path, data: Dict[str, Any]):
    """Write YAML file"""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)


def read_jsonl(path: Path) -> List[Dict[str, Any]]:
    """Read JSONL file"""
    if not path.exists():
        return []
    out: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                out.append(obj)
            except Exception:
                continue
    return out


def write_jsonl(path: Path, data: Dict[str, Any]):
    """Append to JSONL file"""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(data) + "\n")


class CircleOrchestrator:
    """Orchestrates action routing to circle backlogs"""
    
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.circle_mappings = read_yaml_file(GOALIE / "CIRCLE_MAPPINGS.yaml")
        self.consolidated_actions = read_yaml_file(GOALIE / "CONSOLIDATED_ACTIONS.yaml")
        self.governance_insights = self._load_latest_governance_insights()
        self.pattern_metrics = read_jsonl(GOALIE / "pattern_metrics.jsonl")
        
        # Extract circle config
        self.circles = self.circle_mappings.get("circles", {})
        self.mapping_rules = self.circle_mappings.get("mapping_rules", {})
        
        # Stats tracking
        self.stats = {
            "actions_routed": 0,
            "actions_updated": 0,
            "circles_engaged": set(),
            "roam_deltas": defaultdict(float)
        }
    
    def _load_latest_governance_insights(self) -> Dict[str, Any]:
        """Load latest governance insights"""
        insights = read_jsonl(GOALIE / "governance_insights.jsonl")
        if not insights:
            return {}
        return insights[-1]  # Most recent
    
    def _match_pattern_to_circle(self, pattern: str) -> Optional[str]:
        """Match pattern to owning circle"""
        # Check pattern precedence rules first
        for rule in self.mapping_rules.get("pattern_precedence", []):
            if rule.get("pattern") == pattern:
                return rule.get("circle")
        
        # Check circle pattern assignments
        for circle_name, circle_config in self.circles.items():
            if pattern in circle_config.get("patterns", []):
                return circle_name
        
        return None
    
    def _match_action_to_circle(self, action: Dict[str, Any]) -> str:
        """Determine which circle should own this action"""
        
        # Priority override: critical/urgent → assessor
        priority = action.get("priority", "normal")
        if priority in ["critical", "urgent"]:
            for rule in self.mapping_rules.get("priority_overrides", []):
                if priority in rule.get("condition", ""):
                    return rule.get("circle", "assessor")
        
        # Pattern-based routing
        action_pattern = action.get("pattern")
        if action_pattern:
            matched_circle = self._match_pattern_to_circle(action_pattern)
            if matched_circle:
                return matched_circle
        
        # Tag-based routing
        action_tags = action.get("tags", [])
        for circle_name, circle_config in self.circles.items():
            circle_filters = circle_config.get("action_filters", [])
            for filter_rule in circle_filters:
                filter_tags = filter_rule.get("tags", [])
                if any(tag in action_tags for tag in filter_tags):
                    return circle_name
        
        # Default to orchestrator for coordination
        return "orchestrator"
    
    def _calculate_circle_roam_deltas(self) -> Dict[str, float]:
        """Calculate ROAM risk delta per circle from pattern metrics"""
        circle_risks = defaultdict(float)
        
        for event in self.pattern_metrics:
            circle = event.get("circle", "unknown")
            roam_delta = event.get("roam_delta", 0)
            economic = event.get("economic", {})
            risk_score = economic.get("risk_score", 0)
            
            # Combine ROAM delta and risk score
            total_risk = roam_delta + risk_score
            circle_risks[circle] += total_risk
        
        return dict(circle_risks)
    
    def route_actions_to_circles(self) -> Dict[str, Any]:
        """Route actions to appropriate circle backlogs"""
        print("🔄 Routing actions to circle backlogs...")
        
        actions = self.consolidated_actions.get("items", [])
        if not actions:
            print("  ⚠️  No actions found in CONSOLIDATED_ACTIONS.yaml")
            return {"routed": 0, "updated": 0}
        
        # Calculate circle ROAM deltas
        circle_risks = self._calculate_circle_roam_deltas()
        
        # Route each action
        for action in actions:
            action_id = action.get("id")
            current_circle = action.get("circle_owner")
            
            # Determine target circle
            target_circle = self._match_action_to_circle(action)
            
            # Update if different
            if current_circle != target_circle:
                action["circle_owner"] = target_circle
                action["routed_at"] = datetime.now().strftime(ISO_FMT)
                action["routed_by"] = "circle_orchestrator"
                self.stats["actions_updated"] += 1
                print(f"  ✓ Routed {action_id} → {target_circle} (was: {current_circle})")
            
            # Add ROAM risk context
            circle_risk = circle_risks.get(target_circle, 0)
            action["circle_roam_risk"] = round(circle_risk, 2)
            
            # Track engagement
            self.stats["circles_engaged"].add(target_circle)
            self.stats["actions_routed"] += 1
        
        # Update ROAM deltas in stats
        self.stats["roam_deltas"] = circle_risks
        
        return self.stats
    
    def prioritize_circle_backlogs(self):
        """Prioritize actions within each circle by WSJF"""
        print("📊 Prioritizing circle backlogs by WSJF...")
        
        actions = self.consolidated_actions.get("items", [])
        
        # Group by circle
        circle_backlogs = defaultdict(list)
        for action in actions:
            circle = action.get("circle_owner", "unknown")
            circle_backlogs[circle].append(action)
        
        # Sort each circle's backlog by WSJF (descending)
        for circle, backlog in circle_backlogs.items():
            backlog.sort(key=lambda a: a.get("wsjf_score") or 0, reverse=True)
            top_wsjf = backlog[0].get("wsjf_score") or 0 if backlog else 0
            print(f"  ✓ {circle}: {len(backlog)} actions, top WSJF: {top_wsjf:.2f}")
        
        # Reorder actions in consolidated file
        reordered_actions = []
        for circle in sorted(circle_backlogs.keys()):
            reordered_actions.extend(circle_backlogs[circle])
        
        self.consolidated_actions["items"] = reordered_actions
    
    def generate_circle_summary(self) -> Dict[str, Any]:
        """Generate summary of circle engagement"""
        actions = self.consolidated_actions.get("items", [])
        
        circle_summary = {}
        for circle_name in self.circles.keys():
            circle_actions = [a for a in actions if a.get("circle_owner") == circle_name]
            
            total_wsjf = sum(a.get("wsjf_score") or 0 for a in circle_actions)
            total_cod = sum(a.get("cost_of_delay") or 0 for a in circle_actions)
            
            circle_summary[circle_name] = {
                "action_count": len(circle_actions),
                "total_wsjf": round(total_wsjf, 2),
                "total_cod": round(total_cod, 2),
                "avg_wsjf": round(total_wsjf / max(len(circle_actions), 1), 2),
                "roam_risk": round(self.stats["roam_deltas"].get(circle_name, 0), 2),
                "top_actions": [a.get("id") for a in circle_actions[:3]]
            }
        
        return circle_summary
    
    def run(self) -> Dict[str, Any]:
        """Execute circle orchestration workflow"""
        print("🎯 Running Circle Orchestrator...")
        
        # Route actions
        routing_stats = self.route_actions_to_circles()
        
        # Prioritize backlogs
        self.prioritize_circle_backlogs()
        
        # Generate summary
        circle_summary = self.generate_circle_summary()
        
        # Save updated actions
        if not self.dry_run:
            write_yaml_file(GOALIE / "CONSOLIDATED_ACTIONS.yaml", self.consolidated_actions)
            print(f"\n✅ Updated CONSOLIDATED_ACTIONS.yaml")
        else:
            print(f"\n🔍 DRY RUN - No changes written")
        
        # Log orchestration event
        orchestration_event = {
            "timestamp": datetime.now().strftime(ISO_FMT),
            "type": "circle_orchestration",
            "actions_routed": routing_stats["actions_routed"],
            "actions_updated": routing_stats["actions_updated"],
            "circles_engaged": list(routing_stats["circles_engaged"]),
            "circle_summary": circle_summary,
            "dry_run": self.dry_run
        }
        
        if not self.dry_run:
            write_jsonl(GOALIE / "insights_log.jsonl", orchestration_event)
        
        return {
            "routing_stats": routing_stats,
            "circle_summary": circle_summary,
            "timestamp": datetime.now().strftime(ISO_FMT)
        }


def main():
    parser = argparse.ArgumentParser(description="Circle Orchestrator for Agentic Flow")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Route command
    route_parser = subparsers.add_parser("route", help="Route actions to circles")
    route_parser.add_argument("--dry-run", action="store_true", help="Dry run mode")
    route_parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    if args.command == "route":
        orchestrator = CircleOrchestrator(dry_run=args.dry_run)
        results = orchestrator.run()
        
        if args.json:
            print(json.dumps(results, indent=2))
        else:
            # Pretty print summary
            print("\n" + "=" * 80)
            print("🎯 Circle Orchestration Summary")
            print("=" * 80)
            print(f"  Actions Routed: {results['routing_stats']['actions_routed']}")
            print(f"  Actions Updated: {results['routing_stats']['actions_updated']}")
            print(f"  Circles Engaged: {len(results['routing_stats']['circles_engaged'])}")
            print(f"\n  📊 Circle Breakdown:")
            for circle, summary in results['circle_summary'].items():
                print(f"    {circle}:")
                print(f"      - Actions: {summary['action_count']}")
                print(f"      - Total WSJF: {summary['total_wsjf']}")
                print(f"      - ROAM Risk: {summary['roam_risk']}")
            print("=" * 80 + "\n")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

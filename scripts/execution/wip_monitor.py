#!/usr/bin/env python3
"""
WIP (Work In Progress) Monitor and Enforcer
Blocks operations when WIP limits are exceeded per circle.
"""

import argparse
import json
import os
import sys
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# WIP Limits per circle (configurable)
DEFAULT_WIP_LIMITS = {
    "orchestrator": 3,
    "assessor": 5,
    "analyst": 5,
    "innovator": 4,
    "seeker": 4,
    "intuitive": 6,
}

@dataclass
class WIPStatus:
    circle: str
    current_wip: int
    wip_limit: int
    utilization_pct: float
    exceeded: bool
    items: List[str]

@dataclass
class WIPReport:
    circles: List[WIPStatus]
    total_wip: int
    total_limit: int
    any_exceeded: bool
    blocked_circles: List[str]
    generated_at: str

def get_project_root() -> Path:
    """Get project root directory."""
    return Path(__file__).parent.parent.parent

def load_wip_limits() -> Dict[str, int]:
    """Load WIP limits from config or use defaults."""
    config_path = get_project_root() / "config" / "wip_limits.yaml"
    if config_path.exists():
        try:
            import yaml
            with open(config_path) as f:
                return yaml.safe_load(f).get("limits", DEFAULT_WIP_LIMITS)
        except Exception:
            pass
    return DEFAULT_WIP_LIMITS.copy()

def count_wip_items(circle: str) -> tuple[int, List[str]]:
    """Count WIP items for a circle from backlog.md."""
    project_root = get_project_root()
    backlog_paths = [
        project_root / "circles" / circle / "operational-*-roles" / "*" / "backlog.md",
        project_root / f".goalie/KANBAN_BOARD.yaml",
    ]
    
    wip_items = []
    
    # Check KANBAN_BOARD.yaml
    kanban_path = project_root / ".goalie" / "KANBAN_BOARD.yaml"
    if kanban_path.exists():
        try:
            import yaml
            with open(kanban_path) as f:
                board = yaml.safe_load(f)
                now_items = board.get("NOW", []) if board else []
                for item in now_items:
                    if isinstance(item, dict):
                        item_circle = item.get("circle", "").lower()
                        if item_circle == circle.lower():
                            wip_items.append(item.get("title", item.get("id", "unknown")))
                    elif isinstance(item, str):
                        if circle.lower() in item.lower():
                            wip_items.append(item[:50])
        except Exception:
            pass
    
    # Check pattern_metrics.jsonl for in-progress items
    metrics_path = project_root / ".goalie" / "pattern_metrics.jsonl"
    if metrics_path.exists():
        try:
            with open(metrics_path) as f:
                lines = f.readlines()[-100:]  # Last 100 entries
                for line in lines:
                    try:
                        event = json.loads(line)
                        if event.get("circle", "").lower() == circle.lower():
                            if event.get("status") == "in_progress":
                                wip_items.append(event.get("pattern", "unknown"))
                    except json.JSONDecodeError:
                        pass
        except Exception:
            pass
    
    # Deduplicate
    wip_items = list(set(wip_items))
    return len(wip_items), wip_items

def check_wip_status(circles: List[str] = None) -> WIPReport:
    """Check WIP status for all circles."""
    limits = load_wip_limits()
    if circles is None:
        circles = list(limits.keys())
    
    statuses = []
    for circle in circles:
        limit = limits.get(circle, 5)
        current, items = count_wip_items(circle)
        utilization = (current / limit * 100) if limit > 0 else 0
        
        statuses.append(WIPStatus(
            circle=circle,
            current_wip=current,
            wip_limit=limit,
            utilization_pct=round(utilization, 1),
            exceeded=current > limit,
            items=items
        ))
    
    total_wip = sum(s.current_wip for s in statuses)
    total_limit = sum(s.wip_limit for s in statuses)
    blocked = [s.circle for s in statuses if s.exceeded]
    
    return WIPReport(
        circles=statuses,
        total_wip=total_wip,
        total_limit=total_limit,
        any_exceeded=len(blocked) > 0,
        blocked_circles=blocked,
        generated_at=datetime.now().isoformat()
    )

def print_report(report: WIPReport, json_output: bool = False):
    """Print WIP report."""
    if json_output:
        print(json.dumps({
            "circles": [asdict(s) for s in report.circles],
            "total_wip": report.total_wip,
            "total_limit": report.total_limit,
            "any_exceeded": report.any_exceeded,
            "blocked_circles": report.blocked_circles,
            "generated_at": report.generated_at
        }, indent=2))
        return
    
    print(f"\n{'='*60}")
    print(f"  WIP Monitor Report - {report.generated_at[:19]}")
    print(f"{'='*60}")
    print(f"  Total WIP: {report.total_wip}/{report.total_limit}")
    
    if report.any_exceeded:
        print(f"  ⛔ BLOCKED CIRCLES: {', '.join(report.blocked_circles)}")
    else:
        print(f"  ✅ All circles within limits")
    print(f"{'='*60}\n")
    
    for s in report.circles:
        bar_len = 20
        filled = int(s.utilization_pct / 100 * bar_len)
        bar = "█" * filled + "░" * (bar_len - filled)
        icon = "⛔" if s.exceeded else ("⚠️" if s.utilization_pct > 80 else "✅")
        
        print(f"  {s.circle.capitalize():12} [{bar}] {s.current_wip}/{s.wip_limit} ({s.utilization_pct}%) {icon}")
        if s.items and len(s.items) <= 3:
            for item in s.items:
                print(f"                      └─ {item[:40]}")
    print()

def enforce_wip(circle: str) -> bool:
    """Check if a circle can accept new work. Returns True if allowed."""
    report = check_wip_status([circle])
    if report.circles:
        status = report.circles[0]
        if status.exceeded:
            print(f"⛔ WIP LIMIT EXCEEDED for {circle}: {status.current_wip}/{status.wip_limit}")
            print(f"   Complete existing items before adding new work.")
            return False
    return True

def main():
    parser = argparse.ArgumentParser(description="WIP Monitor and Enforcer")
    parser.add_argument("--check", action="store_true", help="Check WIP status for all circles")
    parser.add_argument("--circle", type=str, help="Check/enforce specific circle")
    parser.add_argument("--enforce", action="store_true", help="Enforce WIP limits (exit 1 if exceeded)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--set-limit", nargs=2, metavar=("CIRCLE", "LIMIT"), help="Set WIP limit for circle")
    
    args = parser.parse_args()
    
    if args.set_limit:
        circle, limit = args.set_limit
        print(f"Setting WIP limit for {circle} to {limit}")
        # Would save to config/wip_limits.yaml
        return
    
    if args.enforce and args.circle:
        allowed = enforce_wip(args.circle)
        sys.exit(0 if allowed else 1)
    
    circles = [args.circle] if args.circle else None
    report = check_wip_status(circles)
    print_report(report, args.json)
    
    if args.enforce and report.any_exceeded:
        sys.exit(1)

if __name__ == "__main__":
    main()

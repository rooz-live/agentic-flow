#!/usr/bin/env python3
"""Flow and learning metrics analysis for Agentic Flow.

Computes lead time, cycle time, throughput, WIP violations, and learning
metrics using .goalie/cycle_log.jsonl, .goalie/CONSOLIDATED_ACTIONS.yaml,
.goalie/insights_log.jsonl, and git timestamps.

Usage:
  ./scripts/analysis/flow_metrics.py [--json] [--since ISO] [--until ISO]
"""

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml  # requires PyYAML to be available in the environment

ROOT = Path(__file__).resolve().parents[2]
GOALIE = ROOT / ".goalie"


def parse_time(value: Optional[str]) -> Optional[datetime]:
    """Parse timestamp to naive UTC datetime to avoid tz comparison issues."""
    if not value:
        return None
    try:
        txt = value.strip()
        if "T" not in txt:
            dt = datetime.fromisoformat(txt)
        else:
            dt = datetime.fromisoformat(txt.replace("Z", "+00:00"))
        if dt.tzinfo is not None:
            dt = dt.astimezone(tz=None).replace(tzinfo=None)
        return dt
    except Exception:
        return None


def within_range(ts: Optional[str], since: Optional[datetime], until: Optional[datetime]) -> bool:
    if not ts:
        return True
    dt = parse_time(ts)
    if dt is None:
        return True
    if since and dt < since:
        return False
    if until and dt > until:
        return False
    return True


def read_jsonl(path: Path, since: Optional[datetime], until: Optional[datetime]) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    out = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            ts = obj.get("timestamp") or obj.get("ts")
            if within_range(ts, since, until):
                out.append(obj)
    return out


def load_actions() -> List[Dict[str, Any]]:
    path = GOALIE / "CONSOLIDATED_ACTIONS.yaml"
    if not path.exists():
        return []
    data = yaml.safe_load(path.read_text("utf-8")) or {}
    return data.get("items", [])


def analyze_flow(cycle_log: List[Dict[str, Any]]) -> Dict[str, Any]:
    # Throughput & trends from BML-CYCLE entries
    cycles = [e for e in cycle_log if e.get("action_type") == "BML-CYCLE"]
    throughput_by_day: Counter = Counter()
    for c in cycles:
        ts = c.get("timestamp")
        if not ts:
            continue
        day = (ts.split("T", 1)[0]).split(" ", 1)[0]
        throughput_by_day[day] += 1

    return {
        "throughput_per_day": dict(throughput_by_day),
        "total_cycles": len(cycles),
    }


def analyze_learning(actions: List[Dict[str, Any]]) -> Dict[str, Any]:
    experiments = [a for a in actions if a.get("pattern") == "experiment"]
    completed = [a for a in actions if a.get("status") == "COMPLETE"]
    total = len(actions)
    completed_count = len(completed)

    return {
        "experiments_count": len(experiments),
        "actions_total": total,
        "actions_completed": completed_count,
        "completion_rate": (completed_count / total) if total else 0.0,
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Agentic Flow: flow & learning metrics")
    parser.add_argument("--json", action="store_true", help="Output JSON instead of text")
    parser.add_argument("--since", type=str, default=None)
    parser.add_argument("--until", type=str, default=None)

    args = parser.parse_args(argv)
    since = parse_time(args.since)
    until = parse_time(args.until)

    cycle_log = read_jsonl(GOALIE / "cycle_log.jsonl", since, until)
    actions = load_actions()

    summary = {
        "flow": analyze_flow(cycle_log),
        "learning": analyze_learning(actions),
        "time_window": {"since": args.since, "until": args.until},
    }

    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        print("=== Flow & Learning Metrics ===\n")
        f = summary["flow"]
        print("# Flow")
        print(f"  Total BML cycles: {f['total_cycles']}")
        if f["throughput_per_day"]:
            print("  Throughput per day:")
            for day, count in sorted(f["throughput_per_day"].items()):
                print(f"    - {day}: {count} cycles")
        print()
        l = summary["learning"]
        print("# Learning")
        print(f"  Actions total: {l['actions_total']}")
        print(f"  Actions completed: {l['actions_completed']} ({l['completion_rate']:.1%})")
        print(f"  Experiments this window: {l['experiments_count']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())


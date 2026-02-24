#!/usr/bin/env python3
"""
Pattern Statistics Command
Shows comprehensive statistics of all patterns in pattern_metrics.jsonl
"""

import json
import os
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional


def _split_csv(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [v.strip() for v in value.split(',') if v.strip()]


def _parse_event_time(event: Dict[str, Any]) -> Optional[datetime]:
    ts = event.get("timestamp") or event.get("ts")
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace('Z', '+00:00'))
    except Exception:
        return None


def _event_correlation_id(event: Dict[str, Any]) -> str:
    return str(event.get("correlation_id") or event.get("run_id") or "unknown")


def _correlate_by_run_id(events: List[Dict[str, Any]], patterns: List[str]) -> Dict[str, Any]:
    by_run: Dict[str, set] = defaultdict(set)
    for e in events:
        rid = _event_correlation_id(e)
        p = e.get("pattern")
        if p in patterns:
            by_run[rid].add(p)

    runs_total = len(by_run)
    runs_with_any = sum(1 for s in by_run.values() if len(s) > 0)
    runs_with_all = sum(1 for s in by_run.values() if all(p in s for p in patterns))
    per_pattern_runs = {p: sum(1 for s in by_run.values() if p in s) for p in patterns}

    result: Dict[str, Any] = {
        "patterns": patterns,
        "runs_total": runs_total,
        "runs_with_any": runs_with_any,
        "runs_with_all": runs_with_all,
        "per_pattern_runs": per_pattern_runs,
        "jaccard": (runs_with_all / runs_with_any) if runs_with_any else 0.0,
    }

    if len(patterns) == 2:
        a, b = patterns
        a_runs = per_pattern_runs.get(a, 0)
        b_runs = per_pattern_runs.get(b, 0)
        result["p_b_given_a"] = (runs_with_all / a_runs) if a_runs else 0.0
        result["p_a_given_b"] = (runs_with_all / b_runs) if b_runs else 0.0

    return result


def get_goalie_dir() -> Path:
    """Get .goalie directory path"""
    project_root = os.environ.get("PROJECT_ROOT", ".")
    return Path(project_root) / ".goalie"


def load_pattern_events() -> List[Dict[str, Any]]:
    """Load all pattern events from pattern_metrics.jsonl"""
    metrics_file = get_goalie_dir() / "pattern_metrics.jsonl"
    
    if not metrics_file.exists():
        return []
    
    events = []
    with open(metrics_file, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    
    return events


def calculate_stats(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate comprehensive statistics"""
    if not events:
        return {"total": 0}
    
    stats = {
        "total": len(events),
        "by_pattern": Counter(),
        "by_circle": Counter(),
        "by_depth": Counter(),
        "by_run_kind": Counter(),
        "by_gate": Counter(),
        "completed_actions": 0,
        "failed_actions": 0,
        "economic_totals": {
            "total_cod": 0.0,
            "total_wsjf": 0.0,
            "avg_cod": 0.0,
            "avg_wsjf": 0.0
        },
        "recent_24h": 0,
        "recent_7d": 0,
        "top_tags": Counter(),
        "patterns_by_circle": defaultdict(Counter)
    }
    
    now = datetime.now(timezone.utc)
    cutoff_24h = now - timedelta(hours=24)
    cutoff_7d = now - timedelta(days=7)
    
    total_cod = 0.0
    total_wsjf = 0.0
    econ_count = 0
    
    for event in events:
        # Pattern counts
        pattern = event.get("pattern", "unknown")
        stats["by_pattern"][pattern] += 1
        
        # Circle counts
        circle = event.get("circle", "unknown")
        stats["by_circle"][circle] += 1
        stats["patterns_by_circle"][circle][pattern] += 1
        
        # Depth counts
        depth = event.get("depth", 0)
        stats["by_depth"][depth] += 1
        
        # Run kind counts
        run_kind = event.get("run_kind", "unknown")
        stats["by_run_kind"][run_kind] += 1
        
        # Gate counts
        gate = event.get("gate", "unknown")
        stats["by_gate"][gate] += 1
        
        # Action completion
        if event.get("action_completed"):
            stats["completed_actions"] += 1
        else:
            stats["failed_actions"] += 1
        
        # Economic metrics
        economic = event.get("economic", {})
        if economic:
            cod = economic.get("cost_of_delay", economic.get("cod", 0.0))
            wsjf = economic.get("wsjf_score", 0.0)
            if cod > 0 or wsjf > 0:
                total_cod += cod
                total_wsjf += wsjf
                econ_count += 1
        
        # Time-based stats
        event_time = _parse_event_time(event)
        if event_time:
            if event_time.tzinfo is None:
                event_time = event_time.replace(tzinfo=timezone.utc)
            if event_time > cutoff_24h:
                stats["recent_24h"] += 1
            if event_time > cutoff_7d:
                stats["recent_7d"] += 1
        
        # Tag counts
        tags = event.get("tags", [])
        for tag in tags:
            stats["top_tags"][tag] += 1
    
    # Calculate economic averages
    if econ_count > 0:
        stats["economic_totals"]["total_cod"] = total_cod
        stats["economic_totals"]["total_wsjf"] = total_wsjf
        stats["economic_totals"]["avg_cod"] = total_cod / econ_count
        stats["economic_totals"]["avg_wsjf"] = total_wsjf / econ_count
    
    return stats


def print_stats(stats: Dict[str, Any], json_output: bool = False):
    """Print statistics in human-readable or JSON format"""
    if json_output:
        print(json.dumps(stats, indent=2, default=str))
        return
    
    print("=" * 70)
    print("PATTERN METRICS STATISTICS")
    print("=" * 70)
    
    print(f"\n📊 Total Events: {stats['total']}")
    print(f"📈 Recent Activity: {stats['recent_24h']} (24h), {stats['recent_7d']} (7d)")
    print(f"✅ Completed Actions: {stats['completed_actions']}")
    print(f"❌ Failed Actions: {stats['failed_actions']}")
    
    # Economic summary
    econ = stats["economic_totals"]
    if econ["total_cod"] > 0 or econ["total_wsjf"] > 0:
        print(f"\n💰 Economic Metrics:")
        print(f"   Total Cost of Delay: {econ['total_cod']:.2f}")
        print(f"   Total WSJF Score: {econ['total_wsjf']:.2f}")
        print(f"   Avg CoD per Event: {econ['avg_cod']:.2f}")
        print(f"   Avg WSJF per Event: {econ['avg_wsjf']:.2f}")
    
    # Top patterns
    print(f"\n🔍 Top 10 Patterns:")
    for pattern, count in stats["by_pattern"].most_common(10):
        pct = (count / stats["total"]) * 100
        print(f"   {pattern:30s} {count:6d} ({pct:5.1f}%)")
    
    # By circle
    print(f"\n🎯 Events by Circle:")
    for circle, count in stats["by_circle"].most_common():
        pct = (count / stats["total"]) * 100
        print(f"   {circle:20s} {count:6d} ({pct:5.1f}%)")
    
    # By depth
    print(f"\n📏 Events by Depth:")
    for depth in sorted(stats["by_depth"].keys()):
        count = stats["by_depth"][depth]
        pct = (count / stats["total"]) * 100
        print(f"   Depth {depth}: {count:6d} ({pct:5.1f}%)")
    
    # By run kind
    if stats["by_run_kind"]:
        print(f"\n🔄 Events by Run Kind:")
        for run_kind, count in stats["by_run_kind"].most_common():
            pct = (count / stats["total"]) * 100
            print(f"   {run_kind:20s} {count:6d} ({pct:5.1f}%)")
    
    # Top tags
    if stats["top_tags"]:
        print(f"\n🏷️  Top 10 Tags:")
        for tag, count in stats["top_tags"].most_common(10):
            pct = (count / stats["total"]) * 100
            print(f"   {tag:20s} {count:6d} ({pct:5.1f}%)")
    
    # Pattern distribution by circle
    print(f"\n🔬 Pattern Distribution by Circle:")
    for circle, patterns in list(stats["patterns_by_circle"].items())[:5]:
        print(f"\n   {circle}:")
        for pattern, count in patterns.most_common(5):
            print(f"      {pattern:25s} {count:4d}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Pattern Metrics Statistics")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--pattern", help="Filter by specific pattern")
    parser.add_argument("--patterns", help="Comma-separated list of patterns (for filtering/correlation)")
    parser.add_argument("--circle", help="Filter by specific circle")
    parser.add_argument("--hours", type=int, default=None, help="Limit to events in the last N hours")
    parser.add_argument("--correlation-id", dest="correlation_id", help="Filter by correlation_id (per-run scoping)")
    parser.add_argument("--correlate", action="store_true", help="When using --patterns, compute run_id correlation")
    parser.add_argument("--include-run-kinds", help="Comma-separated run_kinds to include (e.g., governance-agent,prod-cycle)")
    parser.add_argument("--exclude-run-kinds", help="Comma-separated run_kinds to exclude (e.g., manual,unknown)")
    
    args = parser.parse_args()
    
    events = load_pattern_events()
    
    if not events:
        print("No pattern events found in .goalie/pattern_metrics.jsonl", file=sys.stderr)
        sys.exit(1)
    
    # Apply time filter
    if args.hours is not None:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=args.hours)
        filtered = []
        for e in events:
            t = _parse_event_time(e)
            if t:
                if t.tzinfo is None:
                    t = t.replace(tzinfo=timezone.utc)
                if t >= cutoff:
                    filtered.append(e)
        events = filtered

    include_run_kinds = set(_split_csv(args.include_run_kinds))
    exclude_run_kinds = set(_split_csv(args.exclude_run_kinds))
    if include_run_kinds:
        events = [e for e in events if (e.get("run_kind") or "unknown") in include_run_kinds]
    if exclude_run_kinds:
        events = [e for e in events if (e.get("run_kind") or "unknown") not in exclude_run_kinds]

    if args.correlation_id:
        target = str(args.correlation_id)
        events = [e for e in events if _event_correlation_id(e) == target]

    # Apply filters
    if args.pattern and args.patterns:
        print("Error: use only one of --pattern or --patterns", file=sys.stderr)
        sys.exit(2)

    patterns_list: Optional[List[str]] = None
    if args.patterns:
        patterns_list = [p.strip() for p in args.patterns.split(',') if p.strip()]
        events = [e for e in events if e.get("pattern") in patterns_list]
    elif args.pattern:
        events = [e for e in events if e.get("pattern") == args.pattern]

    if args.circle:
        events = [e for e in events if e.get("circle") == args.circle]
    
    if not events and (args.pattern or args.circle):
        print(f"No events found matching filters", file=sys.stderr)
        sys.exit(1)
    
    stats = calculate_stats(events)

    # Optional correlation output
    if args.correlate and patterns_list and len(patterns_list) >= 2:
        correlation = _correlate_by_run_id(events, patterns_list)
        stats["correlation"] = correlation

    print_stats(stats, json_output=args.json)


if __name__ == "__main__":
    main()

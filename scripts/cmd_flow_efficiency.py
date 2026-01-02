#!/usr/bin/env python3
"""
Flow Efficiency Calculator
Measures value-add time vs wait time, flow efficiency %, and WIP limits
"""

import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any


def get_goalie_dir() -> Path:
    """Get .goalie directory path"""
    project_root = os.environ.get("PROJECT_ROOT", ".")
    return Path(project_root) / ".goalie"


def load_events(hours: int = 168) -> List[Dict[str, Any]]:
    """Load pattern events"""
    metrics_file = get_goalie_dir() / "pattern_metrics.jsonl"
    
    if not metrics_file.exists():
        return []
    
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    events = []
    
    with open(metrics_file, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
                ts_str = event.get("timestamp", "")
                if ts_str:
                    try:
                        event_time = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                        if event_time > cutoff:
                            events.append(event)
                    except:
                        pass
            except json.JSONDecodeError:
                continue
    
    return events


class FlowEfficiencyAnalyzer:
    """Analyze flow efficiency metrics"""
    
    def __init__(self, events: List[Dict[str, Any]]):
        self.events = events
        self.completed = [e for e in events if e.get("action_completed")]
        self.failed = [e for e in events if not e.get("action_completed")]
    
    def estimate_value_add_time(self) -> float:
        """
        Estimate value-add time (time actually working).
        Approximation: Job duration from economic data * action count
        """
        total_value_time = 0.0
        
        for e in self.completed:
            economic = e.get("economic", {})
            job_duration = economic.get("job_duration", 0.5)  # Default 0.5h if missing
            total_value_time += job_duration
        
        return total_value_time
    
    def estimate_total_time(self) -> float:
        """
        Estimate total time (wall clock time from first to last event)
        """
        timestamps = []
        for e in self.events:
            ts_str = e.get("timestamp", "")
            if ts_str:
                try:
                    timestamps.append(datetime.fromisoformat(ts_str.replace('Z', '+00:00')))
                except:
                    pass
        
        if len(timestamps) < 2:
            return 0.0
        
        time_span = (max(timestamps) - min(timestamps)).total_seconds() / 3600
        return time_span
    
    def calculate_flow_efficiency(self) -> Dict[str, Any]:
        """
        Calculate flow efficiency: value_add_time / total_time * 100
        Industry benchmark: 40% is excellent, 20% is typical, <10% needs improvement
        """
        value_add_time = self.estimate_value_add_time()
        total_time = self.estimate_total_time()
        
        if total_time == 0:
            return {
                "efficiency_pct": 0.0,
                "value_add_hours": 0.0,
                "total_hours": 0.0,
                "wait_hours": 0.0,
                "benchmark": "N/A"
            }
        
        efficiency = (value_add_time / total_time) * 100
        wait_time = total_time - value_add_time
        
        # Benchmark classification
        if efficiency >= 40:
            benchmark = "Excellent"
        elif efficiency >= 20:
            benchmark = "Good"
        elif efficiency >= 10:
            benchmark = "Fair"
        else:
            benchmark = "Needs Improvement"
        
        return {
            "efficiency_pct": round(efficiency, 2),
            "value_add_hours": round(value_add_time, 2),
            "total_hours": round(total_time, 2),
            "wait_hours": round(wait_time, 2),
            "benchmark": benchmark
        }
    
    def calculate_wip_by_circle(self) -> Dict[str, int]:
        """
        Calculate work-in-progress by circle.
        Approximation: Count incomplete actions per circle
        """
        wip = defaultdict(int)
        
        # Count failed/incomplete as WIP
        for e in self.failed:
            circle = e.get("circle", "unknown")
            wip[circle] += 1
        
        return dict(wip)
    
    def calculate_blockers(self) -> Dict[str, Any]:
        """
        Calculate blocker metrics.
        Blockers = Failed actions that indicate delays
        """
        blocker_patterns = defaultdict(int)
        blocker_circles = defaultdict(int)
        
        for e in self.failed:
            pattern = e.get("pattern", "unknown")
            circle = e.get("circle", "unknown")
            blocker_patterns[pattern] += 1
            blocker_circles[circle] += 1
        
        return {
            "total_blockers": len(self.failed),
            "by_pattern": dict(sorted(blocker_patterns.items(), key=lambda x: x[1], reverse=True)[:3]),
            "by_circle": dict(sorted(blocker_circles.items(), key=lambda x: x[1], reverse=True)[:3])
        }
    
    def calculate_bottleneck_score(self) -> Dict[str, Any]:
        """
        Calculate bottleneck score by pattern/circle.
        High failure rate + high cycle time = bottleneck
        """
        bottlenecks = []
        
        # Group by pattern
        by_pattern = defaultdict(lambda: {"total": 0, "failed": 0})
        for e in self.events:
            pattern = e.get("pattern", "unknown")
            by_pattern[pattern]["total"] += 1
            if not e.get("action_completed"):
                by_pattern[pattern]["failed"] += 1
        
        # Calculate bottleneck scores
        for pattern, stats in by_pattern.items():
            if stats["total"] >= 3:  # Only consider patterns with at least 3 events
                failure_rate = stats["failed"] / stats["total"]
                bottleneck_score = failure_rate * stats["total"]  # Weighted by volume
                
                if bottleneck_score > 1:
                    bottlenecks.append({
                        "pattern": pattern,
                        "score": round(bottleneck_score, 2),
                        "failure_rate": round(failure_rate * 100, 2),
                        "total_events": stats["total"]
                    })
        
        return sorted(bottlenecks, key=lambda x: x["score"], reverse=True)[:5]


def print_flow_report(analyzer: FlowEfficiencyAnalyzer, json_output: bool = False):
    """Print flow efficiency report"""
    
    flow_efficiency = analyzer.calculate_flow_efficiency()
    wip = analyzer.calculate_wip_by_circle()
    blockers = analyzer.calculate_blockers()
    bottlenecks = analyzer.calculate_bottleneck_score()
    
    if json_output:
        print(json.dumps({
            "flow_efficiency": flow_efficiency,
            "wip_by_circle": wip,
            "blockers": blockers,
            "bottlenecks": bottlenecks
        }, indent=2))
        return
    
    print("=" * 70)
    print("🌊 FLOW EFFICIENCY REPORT")
    print("=" * 70)
    
    # Flow efficiency
    eff = flow_efficiency
    print(f"\n💧 Flow Efficiency:")
    print(f"   {eff['efficiency_pct']}% - {eff['benchmark']}")
    print(f"   Value-Add Time: {eff['value_add_hours']}h")
    print(f"   Wait Time:      {eff['wait_hours']}h")
    print(f"   Total Time:     {eff['total_hours']}h")
    
    # Benchmark guidance
    print(f"\n📊 Benchmark Guide:")
    print(f"   Excellent:         ≥40%")
    print(f"   Good:              20-40%")
    print(f"   Fair:              10-20%")
    print(f"   Needs Improvement: <10%")
    
    # WIP
    if wip:
        print(f"\n🔄 Work-In-Progress (WIP) by Circle:")
        for circle, count in sorted(wip.items(), key=lambda x: x[1], reverse=True):
            print(f"   {circle:15} {count:3} incomplete")
        print(f"\n   💡 Tip: Reduce WIP to improve flow efficiency")
    else:
        print(f"\n🔄 Work-In-Progress (WIP): ✅ All work completed!")
    
    # Blockers
    print(f"\n🚧 Blockers:")
    print(f"   Total: {blockers['total_blockers']}")
    if blockers['by_pattern']:
        print(f"\n   Top Blocking Patterns:")
        for pattern, count in blockers['by_pattern'].items():
            print(f"      {pattern:25} {count:3} blocks")
    
    if blockers['by_circle']:
        print(f"\n   Blocked Circles:")
        for circle, count in blockers['by_circle'].items():
            print(f"      {circle:15} {count:3} blocks")
    
    # Bottlenecks
    if bottlenecks:
        print(f"\n⚠️  Bottlenecks (High failure rate + volume):")
        for bn in bottlenecks:
            print(f"   {bn['pattern']:25} Score: {bn['score']:5.2f} | {bn['failure_rate']}% fail rate | {bn['total_events']} events")
        print(f"\n   🎯 Action: Focus improvement efforts on top bottlenecks")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Flow Efficiency Calculator")
    parser.add_argument("--hours", type=int, default=168, help="Hours of history (default: 7 days)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    events = load_events(hours=args.hours)
    
    if not events:
        print(f"No events found in last {args.hours} hours", file=sys.stderr)
        sys.exit(1)
    
    analyzer = FlowEfficiencyAnalyzer(events)
    print_flow_report(analyzer, json_output=args.json)


if __name__ == "__main__":
    main()

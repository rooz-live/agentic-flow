#!/usr/bin/env python3
"""
Execution Velocity Tracker
Tracks actions completed per time period, cycle time, lead time, throughput, and trends
"""

import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Tuple


def get_goalie_dir() -> Path:
    """Get .goalie directory path"""
    project_root = os.environ.get("PROJECT_ROOT", ".")
    return Path(project_root) / ".goalie"


def load_events(hours: int = 168) -> List[Dict[str, Any]]:
    """Load pattern events from last N hours (default: 7 days)"""
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


class VelocityAnalyzer:
    """Analyze execution velocity metrics"""
    
    def __init__(self, events: List[Dict[str, Any]]):
        self.events = events
        self.completed_actions = [e for e in events if e.get("action_completed")]
        self.failed_actions = [e for e in events if not e.get("action_completed")]
    
    def calculate_actions_per_period(self) -> Dict[str, Any]:
        """Calculate actions completed per hour, day, week"""
        if not self.completed_actions:
            return {"per_hour": 0.0, "per_day": 0.0, "per_week": 0.0}
        
        # Get time span
        timestamps = []
        for e in self.completed_actions:
            ts_str = e.get("timestamp", "")
            if ts_str:
                try:
                    timestamps.append(datetime.fromisoformat(ts_str.replace('Z', '+00:00')))
                except:
                    pass
        
        if not timestamps:
            return {"per_hour": 0.0, "per_day": 0.0, "per_week": 0.0}
        
        oldest = min(timestamps)
        newest = max(timestamps)
        time_span_hours = (newest - oldest).total_seconds() / 3600
        
        if time_span_hours == 0:
            time_span_hours = 1
        
        count = len(self.completed_actions)
        
        return {
            "per_hour": round(count / time_span_hours, 2),
            "per_day": round(count / time_span_hours * 24, 2),
            "per_week": round(count / time_span_hours * 24 * 7, 2),
            "total_actions": count,
            "time_span_hours": round(time_span_hours, 2)
        }
    
    def calculate_cycle_time(self) -> Dict[str, float]:
        """
        Calculate cycle time (time from start to completion).
        Approximation: Time between actions in same pattern/circle
        """
        cycle_times = []
        
        # Group by pattern and circle
        by_pattern = defaultdict(list)
        for e in self.events:
            key = f"{e.get('pattern')}_{e.get('circle')}"
            ts_str = e.get("timestamp", "")
            if ts_str:
                try:
                    ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                    by_pattern[key].append((ts, e))
                except:
                    pass
        
        # Calculate time between consecutive actions
        for key, items in by_pattern.items():
            items.sort(key=lambda x: x[0])
            for i in range(1, len(items)):
                time_diff = (items[i][0] - items[i-1][0]).total_seconds() / 3600
                if time_diff < 24:  # Only count if within 24 hours
                    cycle_times.append(time_diff)
        
        if not cycle_times:
            return {"avg_hours": 0.0, "min_hours": 0.0, "max_hours": 0.0}
        
        return {
            "avg_hours": round(sum(cycle_times) / len(cycle_times), 2),
            "min_hours": round(min(cycle_times), 2),
            "max_hours": round(max(cycle_times), 2),
            "p50_hours": round(sorted(cycle_times)[len(cycle_times)//2], 2)
        }
    
    def calculate_throughput(self) -> Dict[str, Any]:
        """Calculate throughput by circle and pattern"""
        by_circle = defaultdict(int)
        by_pattern = defaultdict(int)
        
        for e in self.completed_actions:
            circle = e.get("circle", "unknown")
            pattern = e.get("pattern", "unknown")
            by_circle[circle] += 1
            by_pattern[pattern] += 1
        
        return {
            "by_circle": dict(sorted(by_circle.items(), key=lambda x: x[1], reverse=True)[:5]),
            "by_pattern": dict(sorted(by_pattern.items(), key=lambda x: x[1], reverse=True)[:5]),
            "total": len(self.completed_actions)
        }
    
    def calculate_success_rate(self) -> Dict[str, Any]:
        """Calculate success rate over time"""
        total = len(self.events)
        if total == 0:
            return {"rate": 0.0, "completed": 0, "failed": 0}
        
        completed = len(self.completed_actions)
        failed = len(self.failed_actions)
        
        return {
            "rate": round(completed / total * 100, 2),
            "completed": completed,
            "failed": failed,
            "total": total
        }
    
    def calculate_velocity_trend(self, window_hours: int = 24) -> List[Dict[str, Any]]:
        """Calculate velocity trend over time windows"""
        if not self.completed_actions:
            return []
        
        # Get timestamps
        timestamped = []
        for e in self.completed_actions:
            ts_str = e.get("timestamp", "")
            if ts_str:
                try:
                    ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                    timestamped.append((ts, e))
                except:
                    pass
        
        if not timestamped:
            return []
        
        timestamped.sort(key=lambda x: x[0])
        
        # Create time windows
        start_time = timestamped[0][0]
        end_time = timestamped[-1][0]
        
        windows = []
        current = start_time
        while current < end_time:
            window_end = current + timedelta(hours=window_hours)
            count = sum(1 for ts, e in timestamped if current <= ts < window_end)
            
            windows.append({
                "start": current.isoformat(),
                "end": window_end.isoformat(),
                "actions": count,
                "velocity": round(count / window_hours, 2)
            })
            
            current = window_end
        
        return windows


def print_velocity_report(analyzer: VelocityAnalyzer, json_output: bool = False):
    """Print velocity report"""
    
    actions_per_period = analyzer.calculate_actions_per_period()
    cycle_time = analyzer.calculate_cycle_time()
    throughput = analyzer.calculate_throughput()
    success_rate = analyzer.calculate_success_rate()
    trend = analyzer.calculate_velocity_trend(window_hours=24)
    
    if json_output:
        print(json.dumps({
            "actions_per_period": actions_per_period,
            "cycle_time": cycle_time,
            "throughput": throughput,
            "success_rate": success_rate,
            "trend": trend
        }, indent=2))
        return
    
    print("=" * 70)
    print("⚡ EXECUTION VELOCITY REPORT")
    print("=" * 70)
    
    # Actions per period
    print(f"\n📊 Actions Completed:")
    print(f"   Per Hour:  {actions_per_period['per_hour']}")
    print(f"   Per Day:   {actions_per_period['per_day']}")
    print(f"   Per Week:  {actions_per_period['per_week']}")
    print(f"   Total:     {actions_per_period['total_actions']} (over {actions_per_period['time_span_hours']}h)")
    
    # Cycle time
    print(f"\n⏱️  Cycle Time (avg time between actions):")
    if cycle_time['avg_hours'] > 0:
        print(f"   Average:   {cycle_time['avg_hours']}h")
        print(f"   Median:    {cycle_time['p50_hours']}h")
        print(f"   Range:     {cycle_time['min_hours']}h - {cycle_time['max_hours']}h")
    else:
        print("   No cycle time data available")
    
    # Success rate
    print(f"\n✅ Success Rate:")
    print(f"   {success_rate['rate']}% ({success_rate['completed']}/{success_rate['total']})")
    print(f"   Completed: {success_rate['completed']}")
    print(f"   Failed:    {success_rate['failed']}")
    
    # Throughput
    print(f"\n🎯 Throughput by Circle (Top 5):")
    for circle, count in throughput['by_circle'].items():
        print(f"   {circle:15} {count:3} actions")
    
    print(f"\n📈 Throughput by Pattern (Top 5):")
    for pattern, count in throughput['by_pattern'].items():
        print(f"   {pattern:25} {count:3} actions")
    
    # Trend
    if trend:
        print(f"\n📉 Velocity Trend (24h windows):")
        for i, window in enumerate(trend[-5:]):  # Show last 5 windows
            print(f"   Window {i+1}: {window['actions']} actions ({window['velocity']}/h)")
        
        # Calculate trend direction
        if len(trend) >= 2:
            recent_avg = sum(w['velocity'] for w in trend[-3:]) / min(3, len(trend))
            older_avg = sum(w['velocity'] for w in trend[:3]) / min(3, len(trend))
            
            if recent_avg > older_avg * 1.1:
                trend_indicator = "📈 Trending UP"
            elif recent_avg < older_avg * 0.9:
                trend_indicator = "📉 Trending DOWN"
            else:
                trend_indicator = "➡️  Steady"
            
            print(f"\n   Trend: {trend_indicator}")
            print(f"   Recent avg: {round(recent_avg, 2)}/h vs Earlier avg: {round(older_avg, 2)}/h")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Execution Velocity Tracker")
    parser.add_argument("--hours", type=int, default=168, help="Hours of history to analyze (default: 7 days)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--window", type=int, default=24, help="Window size for trend analysis (hours)")
    
    args = parser.parse_args()
    
    events = load_events(hours=args.hours)
    
    if not events:
        print(f"No events found in last {args.hours} hours", file=sys.stderr)
        sys.exit(1)
    
    analyzer = VelocityAnalyzer(events)
    print_velocity_report(analyzer, json_output=args.json)


if __name__ == "__main__":
    main()

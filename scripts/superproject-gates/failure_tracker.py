#!/usr/bin/env python3
"""
Failure Tracker Tool
Tracks failure rates and trends for code-fix-proposal patterns
"""

import json
import os
import sys
import statistics
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

def get_goalie_dir() -> Path:
    """Get .goalie directory path"""
    project_root = os.environ.get("PROJECT_ROOT", ".")
    return Path(project_root) / ".goalie"

def load_pattern_events(input_file: Optional[str] = None) -> List[Dict[str, Any]]:
    """Load all pattern events from pattern_metrics.jsonl or specified file"""
    if input_file:
        metrics_file = Path(input_file)
    else:
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

def parse_event_time(event: Dict[str, Any]) -> Optional[datetime]:
    """Parse event timestamp"""
    ts = event.get("timestamp") or event.get("ts")
    if not ts:
        return None
    
    try:
        if 'T' in ts:
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        else:
            dt = datetime.fromisoformat(ts)
        
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None

def is_code_fix_event(event: Dict[str, Any]) -> bool:
    """Check if event is a code-fix-proposal"""
    pattern = event.get("pattern", "").lower()
    tags = [tag.lower() for tag in event.get("tags", [])]
    
    return (
        "code-fix" in pattern or
        "code_fix" in pattern or
        "fix-proposal" in pattern or
        "bug-fix" in pattern or
        "security-fix" in pattern or
        "performance-fix" in pattern or
        any("fix" in tag for tag in tags) or
        any("bug" in tag for tag in tags) or
        any("security" in tag for tag in tags)
    )

def track_failure_rates(events: List[Dict[str, Any]], time_window_hours: int = 24) -> Dict[str, Any]:
    """Track failure rates over time windows"""
    code_fix_events = [e for e in events if is_code_fix_event(e)]
    
    if not code_fix_events:
        return {"error": "No code-fix events found"}
    
    # Sort events by time
    code_fix_events.sort(key=lambda e: parse_event_time(e) or datetime.min)
    
    # Calculate failure rates over time windows
    now = datetime.now(timezone.utc)
    failure_rates = []
    
    # Calculate rates for different time windows
    windows = [1, 6, 12, 24, 72, 168]  # 1h, 6h, 12h, 24h, 3d, 7d
    
    for hours in windows:
        cutoff = now - timedelta(hours=hours)
        window_events = [e for e in code_fix_events if parse_event_time(e) and parse_event_time(e) >= cutoff]
        
        if window_events:
            total = len(window_events)
            failed = sum(1 for e in window_events if e.get("status") == "failed")
            failure_rate = (failed / total) * 100 if total > 0 else 0
            
            failure_rates.append({
                "time_window_hours": hours,
                "total_events": total,
                "failed_events": failed,
                "failure_rate": failure_rate,
                "timestamp": now.isoformat()
            })
    
    # Calculate trend
    if len(failure_rates) >= 2:
        recent_rate = failure_rates[0]["failure_rate"]  # Most recent (smallest window)
        historical_rate = failure_rates[-1]["failure_rate"]  # Oldest (largest window)
        trend_direction = "improving" if recent_rate < historical_rate else "degrading" if recent_rate > historical_rate else "stable"
        trend_magnitude = abs(recent_rate - historical_rate)
    else:
        trend_direction = "unknown"
        trend_magnitude = 0
    
    return {
        "current_failure_rate": failure_rates[0]["failure_rate"] if failure_rates else 0,
        "failure_rates_by_window": failure_rates,
        "trend": {
            "direction": trend_direction,
            "magnitude": trend_magnitude,
            "assessment": "significant" if trend_magnitude > 10 else "minor"
        }
    }

def analyze_failure_patterns(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze patterns in failures"""
    code_fix_events = [e for e in events if is_code_fix_event(e)]
    failed_events = [e for e in code_fix_events if e.get("status") == "failed"]
    
    if not failed_events:
        return {"error": "No failed code-fix events found"}
    
    # Analyze by time patterns
    failures_by_hour = defaultdict(int)
    failures_by_day = defaultdict(int)
    failures_by_weekday = defaultdict(int)
    
    for event in failed_events:
        event_time = parse_event_time(event)
        if event_time:
            failures_by_hour[event_time.hour] += 1
            failures_by_day[event_time.strftime("%Y-%m-%d")] += 1
            failures_by_weekday[event_time.strftime("%A")] += 1
    
    # Find peak failure times
    peak_hour = max(failures_by_hour.items(), key=lambda x: x[1]) if failures_by_hour else (0, 0)
    peak_day = max(failures_by_day.items(), key=lambda x: x[1]) if failures_by_day else ("", 0)
    peak_weekday = max(failures_by_weekday.items(), key=lambda x: x[1]) if failures_by_weekday else ("", 0)
    
    # Analyze by circle and pattern
    failures_by_circle = defaultdict(int)
    failures_by_pattern = defaultdict(int)
    
    for event in failed_events:
        circle = event.get("circle", "unknown")
        pattern = event.get("pattern", "unknown")
        failures_by_circle[circle] += 1
        failures_by_pattern[pattern] += 1
    
    return {
        "temporal_patterns": {
            "failures_by_hour": dict(failures_by_hour),
            "failures_by_day": dict(failures_by_day),
            "failures_by_weekday": dict(failures_by_weekday),
            "peak_failure_hour": peak_hour,
            "peak_failure_day": peak_day,
            "peak_failure_weekday": peak_weekday
        },
        "organizational_patterns": {
            "failures_by_circle": dict(failures_by_circle),
            "failures_by_pattern": dict(failures_by_pattern)
        }
    }

def calculate_failure_trends(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate failure trends over time"""
    code_fix_events = [e for e in events if is_code_fix_event(e)]
    
    if len(code_fix_events) < 10:
        return {"error": "Insufficient data for trend analysis"}
    
    # Group events by day
    daily_stats = defaultdict(lambda: {"total": 0, "failed": 0})
    
    for event in code_fix_events:
        event_time = parse_event_time(event)
        if event_time:
            day = event_time.strftime("%Y-%m-%d")
            daily_stats[day]["total"] += 1
            if event.get("status") == "failed":
                daily_stats[day]["failed"] += 1
    
    # Calculate daily failure rates
    daily_rates = []
    for day, stats in sorted(daily_stats.items()):
        if stats["total"] > 0:
            failure_rate = (stats["failed"] / stats["total"]) * 100
            daily_rates.append({
                "date": day,
                "failure_rate": failure_rate,
                "total_events": stats["total"],
                "failed_events": stats["failed"]
            })
    
    if len(daily_rates) < 2:
        return {"error": "Insufficient daily data for trend analysis"}
    
    # Calculate trend line
    failure_rates = [d["failure_rate"] for d in daily_rates]
    dates = list(range(len(failure_rates)))
    
    # Simple linear regression for trend
    if len(failure_rates) >= 2:
        n = len(failure_rates)
        sum_x = sum(dates)
        sum_y = sum(failure_rates)
        sum_xy = sum(x * y for x, y in zip(dates, failure_rates))
        sum_x2 = sum(x * x for x in dates)
        
        # Calculate slope (trend)
        denominator = n * sum_x2 - sum_x * sum_x
        if denominator != 0:
            slope = (n * sum_xy - sum_x * sum_y) / denominator
        else:
            slope = 0
        
        # Calculate correlation
        mean_x = sum_x / n
        mean_y = sum_y / n
        sum_sq_error_x = sum((x - mean_x) ** 2 for x in dates)
        sum_sq_error_y = sum((y - mean_y) ** 2 for y in failure_rates)
        
        if sum_sq_error_x > 0:
            correlation = sum((x - mean_x) * (y - mean_y) for x, y in zip(dates, failure_rates)) / (
                (sum_sq_error_x * sum_sq_error_y) ** 0.5
            )
        else:
            correlation = 0
    else:
        slope = 0
        correlation = 0
    
    # Predict next day's failure rate
    if slope != 0:
        predicted_next_day = failure_rates[-1] + slope
    else:
        predicted_next_day = failure_rates[-1]
    
    return {
        "trend_analysis": {
            "slope": slope,
            "correlation": correlation,
            "trend_direction": "improving" if slope < 0 else "degrading" if slope > 0 else "stable",
            "predicted_next_day_rate": predicted_next_day
        },
        "daily_rates": daily_rates[-7:],  # Last 7 days
        "overall_stats": {
            "avg_failure_rate": statistics.mean(failure_rates),
            "min_failure_rate": min(failure_rates),
            "max_failure_rate": max(failure_rates),
            "volatility": statistics.stdev(failure_rates) if len(failure_rates) > 1 else 0
        }
    }

def generate_failure_alerts(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate alerts based on failure patterns"""
    code_fix_events = [e for e in events if is_code_fix_event(e)]
    failed_events = [e for e in code_fix_events if e.get("status") == "failed"]
    
    if not failed_events:
        return {"alerts": [], "summary": "No failures to alert on"}
    
    alerts = []
    
    # Recent failure spike alert
    recent_failures = [
        e for e in failed_events 
        if parse_event_time(e) and parse_event_time(e) >= datetime.now(timezone.utc) - timedelta(hours=1)
    ]
    
    if len(recent_failures) >= 3:
        alerts.append({
            "severity": "high",
            "type": "failure_spike",
            "message": f"{len(recent_failures)} failures in the last hour",
            "recommendation": "Immediate investigation required",
            "affected_events": [e.get("run_id", "unknown") for e in recent_failures]
        })
    
    # High economic impact alert
    high_impact_failures = []
    total_economic_impact = 0
    
    for event in failed_events:
        economic = event.get("economic", {})
        cod = economic.get("cost_of_delay", 0)
        wsjf_score = economic.get("wsjf_score", 0)
        
        if cod > 50 or wsjf_score > 20:
            high_impact_failures.append(event)
            total_economic_impact += cod
    
    if high_impact_failures:
        alerts.append({
            "severity": "critical",
            "type": "high_economic_impact",
            "message": f"{len(high_impact_failures)} high-impact failures detected",
            "recommendation": "Prioritize immediate resolution",
            "total_economic_impact": total_economic_impact,
            "affected_events": [e.get("run_id", "unknown") for e in high_impact_failures]
        })
    
    # Pattern-specific alert
    pattern_failures = defaultdict(int)
    for event in failed_events:
        pattern = event.get("pattern", "unknown")
        pattern_failures[pattern] += 1
    
    # Check for patterns with high failure rates
    total_by_pattern = defaultdict(int)
    for event in code_fix_events:
        pattern = event.get("pattern", "unknown")
        total_by_pattern[pattern] += 1
    
    for pattern, failure_count in pattern_failures.items():
        total = total_by_pattern.get(pattern, 0)
        if total >= 5:  # Only analyze patterns with sufficient data
            failure_rate = (failure_count / total) * 100
            if failure_rate > 60:  # More than 60% failure rate
                alerts.append({
                    "severity": "medium",
                    "type": "pattern_failure_rate",
                    "pattern": pattern,
                    "failure_rate": failure_rate,
                    "message": f"Pattern '{pattern}' has {failure_rate:.1f}% failure rate",
                    "recommendation": f"Review and improve '{pattern}' process"
                })
    
    return {
        "alerts": alerts,
        "summary": {
            "total_alerts": len(alerts),
            "high_severity": len([a for a in alerts if a["severity"] == "high"]),
            "critical_severity": len([a for a in alerts if a["severity"] == "critical"])
        }
    }

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Failure Tracker Tool")
    parser.add_argument("--input-file", help="Input pattern metrics file")
    parser.add_argument("--pattern", default="code-fix-proposal", help="Pattern to track")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--hours", type=int, default=24, help="Time window for failure rate analysis")
    parser.add_argument("--trend-days", type=int, default=7, help="Days to include in trend analysis")
    parser.add_argument("--alerts", action="store_true", help="Generate failure alerts")
    
    args = parser.parse_args()
    
    events = load_pattern_events(args.input_file)
    
    # Filter by pattern if specified
    if args.pattern:
        events = [e for e in events if args.pattern.lower() in e.get("pattern", "").lower()]
    
    if not events:
        print("No events found matching criteria", file=sys.stderr)
        sys.exit(1)
    
    result = {
        "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        "pattern_tracked": args.pattern,
        "total_events_analyzed": len(events)
    }
    
    # Track failure rates
    failure_rates = track_failure_rates(events, args.hours)
    result["failure_rates"] = failure_rates
    
    # Analyze failure patterns
    patterns = analyze_failure_patterns(events)
    result["failure_patterns"] = patterns
    
    # Calculate trends
    trends = calculate_failure_trends(events)
    result["failure_trends"] = trends
    
    # Generate alerts if requested
    if args.alerts:
        alerts = generate_failure_alerts(events)
        result["failure_alerts"] = alerts
    
    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print("=" * 70)
        print("FAILURE TRACKING REPORT")
        print("=" * 70)
        print(f"Pattern Tracked: {args.pattern}")
        print(f"Events Analyzed: {len(events)}")
        print(f"Analysis Time: {result['analysis_timestamp']}")
        
        if "error" not in failure_rates:
            print(f"\n📈 Current Failure Rate: {failure_rates['current_failure_rate']:.1f}%")
            
            trend = failure_rates.get("trend", {})
            print(f"Trend Direction: {trend.get('direction', 'unknown')}")
            print(f"Trend Magnitude: {trend.get('magnitude', 0):.1f}%")
            print(f"Trend Assessment: {trend.get('assessment', 'unknown')}")
        
        if "error" not in patterns:
            temporal = patterns.get("temporal_patterns", {})
            print(f"\n⏰ Peak Failure Times:")
            print(f"   Hour: {temporal.get('peak_failure_hour', (0, 0))[0]}:00")
            print(f"   Day: {temporal.get('peak_failure_day', ('', 0))[0]}")
            print(f"   Weekday: {temporal.get('peak_failure_weekday', ('', 0))[0]}")
            
            org = patterns.get("organizational_patterns", {})
            failures_by_circle = org.get("failures_by_circle", {})
            if failures_by_circle:
                print(f"\n🎯 Failures by Circle:")
                for circle, count in sorted(failures_by_circle.items(), key=lambda x: x[1], reverse=True)[:5]:
                    print(f"   {circle}: {count}")
        
        if "error" not in trends:
            trend_analysis = trends.get("trend_analysis", {})
            overall_stats = trends.get("overall_stats", {})
            
            print(f"\n📊 Trend Analysis:")
            print(f"   Direction: {trend_analysis.get('trend_direction', 'unknown')}")
            print(f"   Predicted Next Day: {trend_analysis.get('predicted_next_day_rate', 0):.1f}%")
            
            if overall_stats:
                print(f"\n📈 Overall Statistics:")
                print(f"   Average Failure Rate: {overall_stats.get('avg_failure_rate', 0):.1f}%")
                print(f"   Volatility: {overall_stats.get('volatility', 0):.1f}%")
        
        if args.alerts and "error" not in result.get("failure_alerts", {}):
            alerts = result["failure_alerts"]
            alert_summary = alerts.get("summary", {})
            
            print(f"\n🚨 FAILURE ALERTS:")
            print(f"   Total Alerts: {alert_summary.get('total_alerts', 0)}")
            print(f"   High Severity: {alert_summary.get('high_severity', 0)}")
            print(f"   Critical Severity: {alert_summary.get('critical_severity', 0)}")
            
            for alert in alerts.get("alerts", [])[:3]:  # Show top 3 alerts
                print(f"\n   📢 {alert['type'].title()} Alert:")
                print(f"   Severity: {alert['severity']}")
                print(f"   Message: {alert['message']}")
                print(f"   Recommendation: {alert['recommendation']}")

if __name__ == "__main__":
    main()
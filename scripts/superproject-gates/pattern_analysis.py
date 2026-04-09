#!/usr/bin/env python3
"""
Pattern Analysis Tool
Comprehensive pattern analysis for code-fix-proposal failure reduction
"""

import json
import os
import sys
import statistics
import math
from collections import Counter, defaultdict
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

def analyze_code_fix_proposals(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze code-fix-proposal patterns for failure patterns"""
    code_fix_events = []
    
    for event in events:
        pattern = event.get("pattern", "").lower()
        tags = [tag.lower() for tag in event.get("tags", [])]
        
        # Detect code-fix-proposal patterns
        is_code_fix = (
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
        
        if is_code_fix:
            code_fix_events.append(event)
    
    if not code_fix_events:
        return {"error": "No code-fix-proposal patterns found"}
    
    # Analyze failure patterns
    total_code_fixes = len(code_fix_events)
    failed_fixes = sum(1 for e in code_fix_events if e.get("status") == "failed")
    completed_fixes = sum(1 for e in code_fix_events if e.get("status") == "completed")
    
    failure_rate = (failed_fixes / total_code_fixes) * 100 if total_code_fixes > 0 else 0
    
    # Analyze by circle
    failures_by_circle = Counter()
    successes_by_circle = Counter()
    
    for event in code_fix_events:
        circle = event.get("circle", "unknown")
        if event.get("status") == "failed":
            failures_by_circle[circle] += 1
        elif event.get("status") == "completed":
            successes_by_circle[circle] += 1
    
    # Analyze by severity (based on WSJF score and CoD)
    failure_severity = Counter()
    for event in code_fix_events:
        if event.get("status") == "failed":
            economic = event.get("economic", {})
            wsjf_score = economic.get("wsjf_score", 0)
            cod = economic.get("cost_of_delay", 0)
            
            if wsjf_score > 15 or cod > 20:
                failure_severity["high"] += 1
            elif wsjf_score > 8 or cod > 10:
                failure_severity["medium"] += 1
            else:
                failure_severity["low"] += 1
    
    # Analyze temporal patterns
    failures_by_hour = Counter()
    failures_by_day = Counter()
    
    for event in code_fix_events:
        if event.get("status") == "failed":
            event_time = parse_event_time(event)
            if event_time:
                failures_by_hour[event_time.hour] += 1
                failures_by_day[event_time.strftime("%A")] += 1
    
    # Analyze complexity patterns
    failure_by_complexity = Counter()
    for event in code_fix_events:
        if event.get("status") == "failed":
            depth = event.get("depth", 0)
            tags = [tag.lower() for tag in event.get("tags", [])]
            
            if depth >= 4 or any("security" in tag for tag in tags):
                failure_by_complexity["high"] += 1
            elif depth >= 2 or any("ui" in tag for tag in tags):
                failure_by_complexity["medium"] += 1
            else:
                failure_by_complexity["low"] += 1
    
    return {
        "total_code_fixes": total_code_fixes,
        "failed_fixes": failed_fixes,
        "completed_fixes": completed_fixes,
        "failure_rate": failure_rate,
        "failures_by_circle": dict(failures_by_circle),
        "successes_by_circle": dict(successes_by_circle),
        "failure_severity": dict(failure_severity),
        "failure_by_complexity": dict(failure_by_complexity),
        "failures_by_hour": dict(failures_by_hour),
        "failures_by_day": dict(failures_by_day),
        "high_failure_hours": [hour for hour, count in failures_by_hour.most_common(3)],
        "high_failure_days": [day for day, count in failures_by_day.most_common(3)]
    }

def identify_failure_correlations(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Identify correlations between failures and other factors"""
    code_fix_events = [e for e in events if is_code_fix_event(e)]
    
    if len(code_fix_events) < 5:
        return {"error": "Insufficient code-fix events for correlation analysis"}
    
    # Correlate failures with depth
    depth_failures = defaultdict(lambda: {"total": 0, "failed": 0})
    for event in code_fix_events:
        depth = event.get("depth", 0)
        depth_failures[depth]["total"] += 1
        if event.get("status") == "failed":
            depth_failures[depth]["failed"] += 1
    
    depth_correlation = {}
    for depth, data in depth_failures.items():
        if data["total"] > 0:
            failure_rate = (data["failed"] / data["total"]) * 100
            depth_correlation[depth] = failure_rate
    
    # Correlate failures with run kind
    run_kind_failures = defaultdict(lambda: {"total": 0, "failed": 0})
    for event in code_fix_events:
        run_kind = event.get("run_kind", "unknown")
        run_kind_failures[run_kind]["total"] += 1
        if event.get("status") == "failed":
            run_kind_failures[run_kind]["failed"] += 1
    
    run_kind_correlation = {}
    for run_kind, data in run_kind_failures.items():
        if data["total"] > 0:
            failure_rate = (data["failed"] / data["total"]) * 100
            run_kind_correlation[run_kind] = failure_rate
    
    # Correlate failures with economic impact
    economic_failures = []
    for event in code_fix_events:
        if event.get("status") == "failed":
            economic = event.get("economic", {})
            wsjf_score = economic.get("wsjf_score", 0)
            cod = economic.get("cost_of_delay", 0)
            economic_failures.append({"wsjf": wsjf_score, "cod": cod})
    
    avg_wsjf_on_failure = statistics.mean([e["wsjf"] for e in economic_failures]) if economic_failures else 0
    avg_cod_on_failure = statistics.mean([e["cod"] for e in economic_failures]) if economic_failures else 0
    
    return {
        "depth_failure_correlation": depth_correlation,
        "run_kind_failure_correlation": run_kind_correlation,
        "avg_wsjf_on_failure": avg_wsjf_on_failure,
        "avg_cod_on_failure": avg_cod_on_failure,
        "total_economic_failures": len(economic_failures)
    }

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

def generate_failure_insights(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate insights and recommendations for reducing code-fix failures"""
    analysis = analyze_code_fix_proposals(events)
    correlations = identify_failure_correlations(events)
    
    if "error" in analysis or "error" in correlations:
        return {"error": "Insufficient data for insights generation"}
    
    insights = {
        "critical_failure_patterns": [],
        "recommendations": [],
        "risk_factors": [],
        "success_patterns": []
    }
    
    # Identify critical failure patterns
    failure_rate = analysis["failure_rate"]
    if failure_rate > 30:
        insights["critical_failure_patterns"].append({
            "type": "high_failure_rate",
            "severity": "critical",
            "description": f"Overall failure rate is {failure_rate:.1f}%, which is critically high",
            "impact": "System reliability and developer productivity"
        })
    
    # Analyze circle-specific issues
    failures_by_circle = analysis["failures_by_circle"]
    for circle, failures in failures_by_circle.items():
        total_events = sum(1 for e in events if e.get("circle") == circle)
        if total_events > 0:
            circle_failure_rate = (failures / total_events) * 100
            if circle_failure_rate > 40:
                insights["critical_failure_patterns"].append({
                    "type": "circle_specific_failure",
                    "severity": "high",
                    "circle": circle,
                    "failure_rate": circle_failure_rate,
                    "description": f"Circle '{circle}' has failure rate of {circle_failure_rate:.1f}%"
                })
    
    # Analyze severity patterns
    failure_severity = analysis["failure_severity"]
    total_failures = sum(failure_severity.values())
    if total_failures > 0:
        high_severity_pct = (failure_severity.get("high", 0) / total_failures) * 100
        if high_severity_pct > 50:
            insights["critical_failure_patterns"].append({
                "type": "high_severity_failures",
                "severity": "critical",
                "description": f"{high_severity_pct:.1f}% of failures are high severity",
                "impact": "System stability and user experience"
            })
    
    # Generate recommendations
    if failure_rate > 20:
        insights["recommendations"].append({
            "priority": "high",
            "action": "implement_pre_commit_validation",
            "description": "Implement pre-commit validation for code-fix proposals",
            "expected_impact": "Reduce failures by 30-40%"
        })
    
    high_complexity_failures = analysis["failure_by_complexity"].get("high", 0)
    if high_complexity_failures > 0:
        insights["recommendations"].append({
            "priority": "medium",
            "action": "complexity_reduction",
            "description": "Break down complex fixes into smaller, manageable changes",
            "expected_impact": "Reduce high-complexity failures by 50%"
        })
    
    # Analyze temporal patterns
    high_failure_hours = analysis["high_failure_hours"]
    if high_failure_hours:
        insights["recommendations"].append({
            "priority": "medium",
            "action": "temporal_avoidance",
            "description": f"Avoid code-fix deployments during high-failure hours: {high_failure_hours}",
            "expected_impact": "Reduce time-related failures by 25%"
        })
    
    # Identify risk factors
    depth_correlation = correlations["depth_failure_correlation"]
    for depth, rate in depth_correlation.items():
        if rate > 30:
            insights["risk_factors"].append({
                "type": "depth_related",
                "depth": depth,
                "failure_rate": rate,
                "description": f"Depth {depth} has {rate:.1f}% failure rate"
            })
    
    avg_wsjf_on_failure = correlations["avg_wsjf_on_failure"]
    if avg_wsjf_on_failure > 12:
        insights["risk_factors"].append({
            "type": "economic_pressure",
            "description": f"High WSJF scores ({avg_wsjf_on_failure:.1f} avg) on failures suggest rushed work",
            "impact": "Quality compromise under pressure"
        })
    
    return insights

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Pattern Analysis Tool")
    parser.add_argument("--input-file", help="Input pattern metrics file")
    parser.add_argument("--pattern", default="code-fix-proposal", help="Pattern to analyze")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--hours", type=int, help="Limit to events in last N hours")
    
    args = parser.parse_args()
    
    events = load_pattern_events(args.input_file)
    
    # Apply time filter
    if args.hours:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=args.hours)
        events = [e for e in events if parse_event_time(e) and parse_event_time(e) >= cutoff]
    
    # Filter by pattern if specified
    if args.pattern:
        events = [e for e in events if args.pattern.lower() in e.get("pattern", "").lower()]
    
    if not events:
        print("No events found matching criteria", file=sys.stderr)
        sys.exit(1)
    
    # Generate analysis
    analysis = analyze_code_fix_proposals(events)
    correlations = identify_failure_correlations(events)
    insights = generate_failure_insights(events)
    
    result = {
        "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        "pattern_analyzed": args.pattern,
        "total_events_analyzed": len(events),
        "code_fix_analysis": analysis,
        "failure_correlations": correlations,
        "insights": insights
    }
    
    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print("=" * 70)
        print("PATTERN ANALYSIS REPORT")
        print("=" * 70)
        print(f"Pattern Analyzed: {args.pattern}")
        print(f"Events Analyzed: {len(events)}")
        print(f"Analysis Time: {result['analysis_timestamp']}")
        
        if "error" not in analysis:
            print(f"\n📊 Code-Fix Summary:")
            print(f"   Total Code Fixes: {analysis['total_code_fixes']}")
            print(f"   Failed Fixes: {analysis['failed_fixes']}")
            print(f"   Completed Fixes: {analysis['completed_fixes']}")
            print(f"   Failure Rate: {analysis['failure_rate']:.1f}%")
            
            if analysis['failures_by_circle']:
                print(f"\n🎯 Failures by Circle:")
                for circle, count in analysis['failures_by_circle'].items():
                    print(f"   {circle}: {count}")
            
            if analysis['failure_severity']:
                print(f"\n⚠️  Failure Severity:")
                for severity, count in analysis['failure_severity'].items():
                    print(f"   {severity}: {count}")
        
        if "error" not in insights:
            print(f"\n💡 Critical Findings:")
            for finding in insights['critical_failure_patterns']:
                print(f"   • {finding['description']}")
            
            print(f"\n🎯 Recommendations:")
            for rec in insights['recommendations']:
                print(f"   • {rec['description']} (Priority: {rec['priority']})")
            
            if insights['risk_factors']:
                print(f"\n⚠️  Risk Factors:")
                for risk in insights['risk_factors']:
                    print(f"   • {risk['description']}")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
WSJF Enrichment Analysis Tool
Comprehensive analysis for wsjf-enrichment failure patterns and root cause investigation
"""

import json
import os
import sys
import statistics
from collections import defaultdict, Counter
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

def is_wsjf_enrichment_event(event: Dict[str, Any]) -> bool:
    """Check if event is a wsjf-enrichment pattern"""
    pattern = event.get("pattern", "").lower()
    tags = [tag.lower() for tag in event.get("tags", [])]
    
    return (
        "wsjf-enrichment" in pattern or
        "wsjf_enrichment" in pattern or
        "wsjf-enrich" in pattern or
        "wsjf_enrich" in pattern or
        "enrichment" in pattern and "wsjf" in pattern or
        any("wsjf-enrichment" in tag for tag in tags) or
        any("wsjf_enrichment" in tag for tag in tags) or
        any("wsjf-enrich" in tag for tag in tags) or
        any("wsjf_enrich" in tag for tag in tags)
    )

def analyze_wsjf_enrichment_failures(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze wsjf-enrichment failure patterns"""
    wsjf_events = []
    
    for event in events:
        if is_wsjf_enrichment_event(event):
            wsjf_events.append(event)
    
    if not wsjf_events:
        return {"error": "No wsjf-enrichment patterns found"}
    
    # Analyze failure patterns
    total_wsjf = len(wsjf_events)
    failed_wsjf = sum(1 for e in wsjf_events if e.get("status") == "failed")
    completed_wsjf = sum(1 for e in wsjf_events if e.get("status") == "completed")
    
    failure_rate = (failed_wsjf / total_wsjf) * 100 if total_wsjf > 0 else 0
    
    # Analyze by circle
    failures_by_circle = Counter()
    successes_by_circle = Counter()
    
    for event in wsjf_events:
        circle = event.get("circle", "unknown")
        if event.get("status") == "failed":
            failures_by_circle[circle] += 1
        elif event.get("status") == "completed":
            successes_by_circle[circle] += 1
    
    # Analyze by WSJF score ranges
    failure_by_wsjf_range = Counter()
    for event in wsjf_events:
        if event.get("status") == "failed":
            economic = event.get("economic", {})
            wsjf_score = economic.get("wsjf_score", 0)
            
            if wsjf_score > 20:
                failure_by_wsjf_range["high (>20)"] += 1
            elif wsjf_score > 10:
                failure_by_wsjf_range["medium (10-20)"] += 1
            else:
                failure_by_wsjf_range["low (<=10)"] += 1
    
    # Analyze by Cost of Delay
    failure_by_cod_range = Counter()
    for event in wsjf_events:
        if event.get("status") == "failed":
            economic = event.get("economic", {})
            cod = economic.get("cost_of_delay", 0)
            
            if cod > 50:
                failure_by_cod_range["critical (>50)"] += 1
            elif cod > 25:
                failure_by_cod_range["high (25-50)"] += 1
            elif cod > 10:
                failure_by_cod_range["medium (10-25)"] += 1
            else:
                failure_by_cod_range["low (<=10)"] += 1
    
    # Analyze temporal patterns
    failures_by_hour = Counter()
    failures_by_day = Counter()
    
    for event in wsjf_events:
        if event.get("status") == "failed":
            event_time = parse_event_time(event)
            if event_time:
                failures_by_hour[event_time.hour] += 1
                failures_by_day[event_time.strftime("%A")] += 1
    
    # Analyze enrichment types
    failure_by_enrichment_type = Counter()
    for event in wsjf_events:
        if event.get("status") == "failed":
            tags = [tag.lower() for tag in event.get("tags", [])]
            
            if any("user-value" in tag for tag in tags):
                failure_by_enrichment_type["user-value"] += 1
            elif any("business-value" in tag for tag in tags):
                failure_by_enrichment_type["business-value"] += 1
            elif any("time-criticality" in tag for tag in tags):
                failure_by_enrichment_type["time-criticality"] += 1
            elif any("risk-reduction" in tag for tag in tags):
                failure_by_enrichment_type["risk-reduction"] += 1
            else:
                failure_by_enrichment_type["general"] += 1
    
    return {
        "total_wsjf_enrichments": total_wsjf,
        "failed_enrichments": failed_wsjf,
        "completed_enrichments": completed_wsjf,
        "failure_rate": failure_rate,
        "failures_by_circle": dict(failures_by_circle),
        "successes_by_circle": dict(successes_by_circle),
        "failure_by_wsjf_range": dict(failure_by_wsjf_range),
        "failure_by_cod_range": dict(failure_by_cod_range),
        "failure_by_enrichment_type": dict(failure_by_enrichment_type),
        "failures_by_hour": dict(failures_by_hour),
        "failures_by_day": dict(failures_by_day),
        "high_failure_hours": [hour for hour, count in failures_by_hour.most_common(3)],
        "high_failure_days": [day for day, count in failures_by_day.most_common(3)]
    }

def identify_wsjf_failure_correlations(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Identify correlations between wsjf-enrichment failures and other factors"""
    wsjf_events = [e for e in events if is_wsjf_enrichment_event(e)]
    
    if len(wsjf_events) < 5:
        return {"error": "Insufficient wsjf-enrichment events for correlation analysis"}
    
    # Correlate failures with WSJF score ranges
    wsjf_range_failures = defaultdict(lambda: {"total": 0, "failed": 0})
    for event in wsjf_events:
        economic = event.get("economic", {})
        wsjf_score = economic.get("wsjf_score", 0)
        
        if wsjf_score > 20:
            range_key = "high (>20)"
        elif wsjf_score > 10:
            range_key = "medium (10-20)"
        else:
            range_key = "low (<=10)"
        
        wsjf_range_failures[range_key]["total"] += 1
        if event.get("status") == "failed":
            wsjf_range_failures[range_key]["failed"] += 1
    
    wsjf_range_correlation = {}
    for range_key, data in wsjf_range_failures.items():
        if data["total"] > 0:
            failure_rate = (data["failed"] / data["total"]) * 100
            wsjf_range_correlation[range_key] = failure_rate
    
    # Correlate failures with Cost of Delay ranges
    cod_range_failures = defaultdict(lambda: {"total": 0, "failed": 0})
    for event in wsjf_events:
        economic = event.get("economic", {})
        cod = economic.get("cost_of_delay", 0)
        
        if cod > 50:
            range_key = "critical (>50)"
        elif cod > 25:
            range_key = "high (25-50)"
        elif cod > 10:
            range_key = "medium (10-25)"
        else:
            range_key = "low (<=10)"
        
        cod_range_failures[range_key]["total"] += 1
        if event.get("status") == "failed":
            cod_range_failures[range_key]["failed"] += 1
    
    cod_range_correlation = {}
    for range_key, data in cod_range_failures.items():
        if data["total"] > 0:
            failure_rate = (data["failed"] / data["total"]) * 100
            cod_range_correlation[range_key] = failure_rate
    
    # Correlate failures with enrichment types
    enrichment_failures = defaultdict(lambda: {"total": 0, "failed": 0})
    for event in wsjf_events:
        tags = [tag.lower() for tag in event.get("tags", [])]
        
        if any("user-value" in tag for tag in tags):
            enrichment_type = "user-value"
        elif any("business-value" in tag for tag in tags):
            enrichment_type = "business-value"
        elif any("time-criticality" in tag for tag in tags):
            enrichment_type = "time-criticality"
        elif any("risk-reduction" in tag for tag in tags):
            enrichment_type = "risk-reduction"
        else:
            enrichment_type = "general"
        
        enrichment_failures[enrichment_type]["total"] += 1
        if event.get("status") == "failed":
            enrichment_failures[enrichment_type]["failed"] += 1
    
    enrichment_correlation = {}
    for enrichment_type, data in enrichment_failures.items():
        if data["total"] > 0:
            failure_rate = (data["failed"] / data["total"]) * 100
            enrichment_correlation[enrichment_type] = failure_rate
    
    # Analyze economic impact of failures
    economic_failures = []
    for event in wsjf_events:
        if event.get("status") == "failed":
            economic = event.get("economic", {})
            wsjf_score = economic.get("wsjf_score", 0)
            cod = economic.get("cost_of_delay", 0)
            economic_failures.append({"wsjf": wsjf_score, "cod": cod})
    
    avg_wsjf_on_failure = statistics.mean([e["wsjf"] for e in economic_failures]) if economic_failures else 0
    avg_cod_on_failure = statistics.mean([e["cod"] for e in economic_failures]) if economic_failures else 0
    
    return {
        "wsjf_range_failure_correlation": wsjf_range_correlation,
        "cod_range_failure_correlation": cod_range_correlation,
        "enrichment_type_failure_correlation": enrichment_correlation,
        "avg_wsjf_on_failure": avg_wsjf_on_failure,
        "avg_cod_on_failure": avg_cod_on_failure,
        "total_economic_failures": len(economic_failures)
    }

def generate_wsjf_failure_insights(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate insights and recommendations for reducing wsjf-enrichment failures"""
    analysis = analyze_wsjf_enrichment_failures(events)
    correlations = identify_wsjf_failure_correlations(events)
    
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
    if failure_rate > 25:
        insights["critical_failure_patterns"].append({
            "type": "high_failure_rate",
            "severity": "critical",
            "description": f"WSJF-enrichment failure rate is {failure_rate:.1f}%, which is critically high",
            "impact": "Economic prioritization accuracy and item ranking"
        })
    
    # Analyze circle-specific issues
    failures_by_circle = analysis["failures_by_circle"]
    for circle, failures in failures_by_circle.items():
        total_events = sum(1 for e in events if e.get("circle") == circle and is_wsjf_enrichment_event(e))
        if total_events > 0:
            circle_failure_rate = (failures / total_events) * 100
            if circle_failure_rate > 35:
                insights["critical_failure_patterns"].append({
                    "type": "circle_specific_failure",
                    "severity": "high",
                    "circle": circle,
                    "failure_rate": circle_failure_rate,
                    "description": f"Circle '{circle}' has WSJF-enrichment failure rate of {circle_failure_rate:.1f}%"
                })
    
    # Analyze WSJF score range patterns
    failure_by_wsjf_range = analysis["failure_by_wsjf_range"]
    total_failures = sum(failure_by_wsjf_range.values())
    if total_failures > 0:
        high_wsjf_pct = (failure_by_wsjf_range.get("high (>20)", 0) / total_failures) * 100
        if high_wsjf_pct > 40:
            insights["critical_failure_patterns"].append({
                "type": "high_wsjf_failures",
                "severity": "critical",
                "description": f"{high_wsjf_pct:.1f}% of failures are high WSJF score items (>20)",
                "impact": "High-value economic prioritization failures"
            })
    
    # Analyze Cost of Delay patterns
    failure_by_cod_range = analysis["failure_by_cod_range"]
    if total_failures > 0:
        critical_cod_pct = (failure_by_cod_range.get("critical (>50)", 0) / total_failures) * 100
        if critical_cod_pct > 30:
            insights["critical_failure_patterns"].append({
                "type": "critical_cod_failures",
                "severity": "critical",
                "description": f"{critical_cod_pct:.1f}% of failures have critical Cost of Delay (>50)",
                "impact": "Urgent item prioritization failures"
            })
    
    # Generate recommendations
    if failure_rate > 20:
        insights["recommendations"].append({
            "priority": "high",
            "action": "implement_wsjf_validation",
            "description": "Implement pre-enrichment WSJF validation checks",
            "expected_impact": "Reduce WSJF-enrichment failures by 35-45%"
        })
    
    enrichment_correlations = correlations.get("enrichment_type_failure_correlation", {})
    for enrichment_type, rate in enrichment_correlations.items():
        if rate > 30:
            insights["recommendations"].append({
                "priority": "high",
                "action": f"improve_{enrichment_type}_enrichment",
                "description": f"Improve {enrichment_type} enrichment process (failure rate: {rate:.1f}%)",
                "expected_impact": f"Reduce {enrichment_type} failures by 50%"
            })
    
    # Analyze temporal patterns
    high_failure_hours = analysis["high_failure_hours"]
    if high_failure_hours:
        insights["recommendations"].append({
            "priority": "medium",
            "action": "temporal_avoidance",
            "description": f"Avoid WSJF-enrichment during high-failure hours: {high_failure_hours}",
            "expected_impact": "Reduce time-related failures by 20%"
        })
    
    # Identify risk factors
    wsjf_correlations = correlations.get("wsjf_range_failure_correlation", {})
    for wsjf_range, rate in wsjf_correlations.items():
        if rate > 30:
            insights["risk_factors"].append({
                "type": "wsjf_range_related",
                "wsjf_range": wsjf_range,
                "failure_rate": rate,
                "description": f"WSJF range {wsjf_range} has {rate:.1f}% failure rate"
            })
    
    avg_cod_on_failure = correlations["avg_cod_on_failure"]
    if avg_cod_on_failure > 30:
        insights["risk_factors"].append({
            "type": "high_cod_pressure",
            "description": f"High Cost of Delay on failures ({avg_cod_on_failure:.1f} avg) suggests urgency pressure",
            "impact": "Quality compromise under time pressure"
        })
    
    return insights

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="WSJF Enrichment Analysis Tool")
    parser.add_argument("--input-file", help="Input pattern metrics file")
    parser.add_argument("--pattern", default="wsjf-enrichment", help="Pattern to analyze")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--hours", type=int, help="Limit to events in last N hours")
    parser.add_argument("--circle", help="Filter by specific circle")
    parser.add_argument("--detailed", action="store_true", help="Show detailed analysis")
    
    args = parser.parse_args()
    
    events = load_pattern_events(args.input_file)
    
    # Apply time filter
    if args.hours:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=args.hours)
        events = [e for e in events if parse_event_time(e) and parse_event_time(e) >= cutoff]
    
    # Filter by circle if specified
    if args.circle:
        events = [e for e in events if e.get("circle", "").lower() == args.circle.lower()]
    
    # Filter by pattern if specified
    if args.pattern:
        events = [e for e in events if args.pattern.lower() in e.get("pattern", "").lower()]
    
    if not events:
        print("No events found matching criteria", file=sys.stderr)
        sys.exit(1)
    
    # Generate analysis
    analysis = analyze_wsjf_enrichment_failures(events)
    correlations = identify_wsjf_failure_correlations(events)
    insights = generate_wsjf_failure_insights(events)
    
    result = {
        "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        "pattern_analyzed": args.pattern,
        "total_events_analyzed": len(events),
        "wsjf_enrichment_analysis": analysis,
        "failure_correlations": correlations,
        "insights": insights
    }
    
    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print("=" * 70)
        print("WSJF ENRICHMENT ANALYSIS REPORT")
        print("=" * 70)
        print(f"Pattern Analyzed: {args.pattern}")
        print(f"Events Analyzed: {len(events)}")
        print(f"Analysis Time: {result['analysis_timestamp']}")
        
        if "error" not in analysis:
            print(f"\n📊 WSJF-Enrichment Summary:")
            print(f"   Total Enrichments: {analysis['total_wsjf_enrichments']}")
            print(f"   Failed Enrichments: {analysis['failed_enrichments']}")
            print(f"   Completed Enrichments: {analysis['completed_enrichments']}")
            print(f"   Failure Rate: {analysis['failure_rate']:.1f}%")
            
            if analysis['failures_by_circle']:
                print(f"\n🎯 Failures by Circle:")
                for circle, count in analysis['failures_by_circle'].items():
                    print(f"   {circle}: {count}")
            
            if analysis['failure_by_wsjf_range']:
                print(f"\n💰 Failures by WSJF Range:")
                for wsjf_range, count in analysis['failure_by_wsjf_range'].items():
                    print(f"   {wsjf_range}: {count}")
            
            if analysis['failure_by_cod_range']:
                print(f"\n⏰ Failures by Cost of Delay Range:")
                for cod_range, count in analysis['failure_by_cod_range'].items():
                    print(f"   {cod_range}: {count}")
            
            if analysis['failure_by_enrichment_type']:
                print(f"\n🔧 Failures by Enrichment Type:")
                for enrichment_type, count in analysis['failure_by_enrichment_type'].items():
                    print(f"   {enrichment_type}: {count}")
        
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
        
        if args.detailed and "error" not in correlations:
            print(f"\n📈 Correlation Analysis:")
            wsjf_corr = correlations.get("wsjf_range_failure_correlation", {})
            if wsjf_corr:
                print(f"   WSJF Range Correlations:")
                for wsjf_range, rate in wsjf_corr.items():
                    print(f"     {wsjf_range}: {rate:.1f}% failure rate")
            
            cod_corr = correlations.get("cod_range_failure_correlation", {})
            if cod_corr:
                print(f"   Cost of Delay Range Correlations:")
                for cod_range, rate in cod_corr.items():
                    print(f"     {cod_range}: {rate:.1f}% failure rate")
            
            enrich_corr = correlations.get("enrichment_type_failure_correlation", {})
            if enrich_corr:
                print(f"   Enrichment Type Correlations:")
                for enrich_type, rate in enrich_corr.items():
                    print(f"     {enrich_type}: {rate:.1f}% failure rate")

if __name__ == "__main__":
    main()
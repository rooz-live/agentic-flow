#!/usr/bin/env python3
"""
Pattern Metrics Filter Tool
Advanced filtering and analysis capabilities for pattern metrics
"""

import json
import os
import sys
import statistics
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Set

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

def filter_by_pattern(events: List[Dict[str, Any]], patterns: List[str]) -> List[Dict[str, Any]]:
    """Filter events by pattern names"""
    if not patterns:
        return events
    
    pattern_set = set(p.lower() for p in patterns)
    return [e for e in events if e.get("pattern", "").lower() in pattern_set]

def filter_by_circle(events: List[Dict[str, Any]], circles: List[str]) -> List[Dict[str, Any]]:
    """Filter events by circle names"""
    if not circles:
        return events
    
    circle_set = set(c.lower() for c in circles)
    return [e for e in events if e.get("circle", "").lower() in circle_set]

def filter_by_time_range(events: List[Dict[str, Any]], hours: Optional[int] = None, 
                   start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Filter events by time range"""
    if not hours and not start_date and not end_date:
        return events
    
    filtered_events = []
    
    for event in events:
        event_time = parse_event_time(event)
        if not event_time:
            continue
        
        if hours:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
            if event_time < cutoff:
                continue
        
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                if start_dt.tzinfo is None:
                    start_dt = start_dt.replace(tzinfo=timezone.utc)
                if event_time < start_dt:
                    continue
            except ValueError:
                continue
        
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                if end_dt.tzinfo is None:
                    end_dt = end_dt.replace(tzinfo=timezone.utc)
                if event_time > end_dt:
                    continue
            except ValueError:
                continue
        
        filtered_events.append(event)
    
    return filtered_events

def filter_by_economic_metrics(events: List[Dict[str, Any]], 
                           min_wsjf: Optional[float] = None,
                           max_wsjf: Optional[float] = None,
                           min_cod: Optional[float] = None,
                           max_cod: Optional[float] = None) -> List[Dict[str, Any]]:
    """Filter events by economic metrics"""
    filtered_events = []
    
    for event in events:
        economic = event.get("economic", {})
        if not economic:
            continue
        
        wsjf_score = economic.get("wsjf_score", 0)
        cod = economic.get("cost_of_delay", 0)
        
        # Apply filters
        if min_wsjf is not None and wsjf_score < min_wsjf:
            continue
        if max_wsjf is not None and wsjf_score > max_wsjf:
            continue
        if min_cod is not None and cod < min_cod:
            continue
        if max_cod is not None and cod > max_cod:
            continue
        
        filtered_events.append(event)
    
    return filtered_events

def filter_by_status(events: List[Dict[str, Any]], status_values: List[str]) -> List[Dict[str, Any]]:
    """Filter events by status values"""
    if not status_values:
        return events
    
    status_set = set(s.lower() for s in status_values)
    return [e for e in events if e.get("status", "").lower() in status_set]

def filter_by_depth(events: List[Dict[str, Any]], min_depth: Optional[int] = None, 
                  max_depth: Optional[int] = None) -> List[Dict[str, Any]]:
    """Filter events by depth range"""
    if min_depth is None and max_depth is None:
        return events
    
    filtered_events = []
    
    for event in events:
        depth = event.get("depth", 0)
        
        if min_depth is not None and depth < min_depth:
            continue
        if max_depth is not None and depth > max_depth:
            continue
        
        filtered_events.append(event)
    
    return filtered_events

def filter_by_tags(events: List[Dict[str, Any]], include_tags: List[str], 
                exclude_tags: List[str] = None) -> List[Dict[str, Any]]:
    """Filter events by tags (include/exclude)"""
    if not include_tags and not exclude_tags:
        return events
    
    include_set = set(t.lower() for t in include_tags) if include_tags else set()
    exclude_set = set(t.lower() for t in exclude_tags) if exclude_tags else set()
    
    filtered_events = []
    
    for event in events:
        event_tags = [tag.lower() for tag in event.get("tags", [])]
        
        # Must include at least one include tag if include_tags specified
        if include_set and not any(tag in include_set for tag in event_tags):
            continue
        
        # Must not include any exclude tag
        if exclude_set and any(tag in exclude_set for tag in event_tags):
            continue
        
        filtered_events.append(event)
    
    return filtered_events

def analyze_filtered_events(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze filtered events and provide insights"""
    if not events:
        return {"error": "No events to analyze"}
    
    # Basic statistics
    total_events = len(events)
    code_fix_events = [e for e in events if is_code_fix_event(e)]
    failed_events = [e for e in events if e.get("status") == "failed"]
    completed_events = [e for e in events if e.get("status") == "completed"]
    
    # Economic analysis
    economic_data = []
    for event in events:
        economic = event.get("economic", {})
        if economic:
            economic_data.append({
                "wsjf_score": economic.get("wsjf_score", 0),
                "cost_of_delay": economic.get("cost_of_delay", 0)
                "enhanced_wsjf_score": economic.get("enhanced_wsjf_score", 0)
            })
    
    wsjf_scores = [e["wsjf_score"] for e in economic_data if e["wsjf_score"] > 0]
    cod_values = [e["cost_of_delay"] for e in economic_data if e["cost_of_delay"] > 0]
    
    # Pattern analysis
    pattern_counts = {}
    circle_counts = {}
    depth_counts = {}
    
    for event in events:
        pattern = event.get("pattern", "unknown")
        circle = event.get("circle", "unknown")
        depth = event.get("depth", 0)
        
        pattern_counts[pattern] = pattern_counts.get(pattern, 0) + 1
        circle_counts[circle] = circle_counts.get(circle, 0) + 1
        depth_counts[depth] = depth_counts.get(depth, 0) + 1
    
    return {
        "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        "total_events": total_events,
        "code_fix_events": len(code_fix_events),
        "failed_events": len(failed_events),
        "completed_events": len(completed_events),
        "failure_rate": (len(failed_events) / total_events) * 100 if total_events > 0 else 0,
        "economic_summary": {
            "avg_wsjf_score": statistics.mean(wsjf_scores) if wsjf_scores else 0,
            "median_wsjf_score": statistics.median(wsjf_scores) if wsjf_scores else 0,
            "max_wsjf_score": max(wsjf_scores) if wsjf_scores else 0,
            "min_wsjf_score": min(wsjf_scores) if wsjf_scores else 0,
            "avg_cost_of_delay": statistics.mean(cod_values) if cod_values else 0,
            "median_cost_of_delay": statistics.median(cod_values) if cod_values else 0,
            "max_cost_of_delay": max(cod_values) if cod_values else 0,
            "min_cost_of_delay": min(cod_values) if cod_values else 0,
            "total_economic_impact": sum(cod_values)
        },
        "pattern_distribution": dict(sorted(pattern_counts.items(), key=lambda x: x[1], reverse=True)[:10]),
        "circle_distribution": dict(sorted(circle_counts.items(), key=lambda x: x[1], reverse=True)[:10]),
        "depth_distribution": dict(sorted(depth_counts.items(), key=lambda x: x[0])),
        "top_patterns": sorted(pattern_counts.items(), key=lambda x: x[1], reverse=True)[:5],
        "top_circles": sorted(circle_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    }

def export_filtered_events(events: List[Dict[str, Any]], output_file: str, format_type: str = "json") -> bool:
    """Export filtered events to file"""
    try:
        with open(output_file, 'w') as f:
            if format_type.lower() == "json":
                json.dump(events, f, indent=2, default=str)
            elif format_type.lower() == "csv":
                # Simple CSV export
                if events:
                    headers = list(events[0].keys())
                    f.write(",".join(headers) + "\n")
                    
                    for event in events:
                        values = []
                        for header in headers:
                            value = str(event.get(header, ""))
                            # Handle nested objects and lists
                            if "," in value or "\n" in value:
                                value = f'"{value}"'
                            values.append(value)
                        f.write(",".join(values) + "\n")
            else:
                return False
        
        return True
    except Exception as e:
        print(f"Error exporting events: {e}", file=sys.stderr)
        return False

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Pattern Metrics Filter Tool")
    parser.add_argument("--input-file", help="Input pattern metrics file")
    parser.add_argument("--output-file", help="Output file for filtered results")
    parser.add_argument("--export-format", choices=["json", "csv"], default="json", help="Export format")
    
    # Filter options
    parser.add_argument("--pattern", help="Filter by specific pattern")
    parser.add_argument("--patterns", help="Comma-separated list of patterns")
    parser.add_argument("--circle", help="Filter by specific circle")
    parser.add_argument("--circles", help="Comma-separated list of circles")
    parser.add_argument("--hours", type=int, help="Filter to events in last N hours")
    parser.add_argument("--start-date", help="Filter events from this date (ISO format)")
    parser.add_argument("--end-date", help="Filter events until this date (ISO format)")
    
    # Economic filters
    parser.add_argument("--min-wsjf", type=float, help="Minimum WSJF score")
    parser.add_argument("--max-wsjf", type=float, help="Maximum WSJF score")
    parser.add_argument("--min-cod", type=float, help="Minimum Cost of Delay")
    parser.add_argument("--max-cod", type=float, help="Maximum Cost of Delay")
    
    # Status and depth filters
    parser.add_argument("--status", help="Comma-separated list of status values")
    parser.add_argument("--min-depth", type=int, help="Minimum depth")
    parser.add_argument("--max-depth", type=int, help="Maximum depth")
    
    # Tag filters
    parser.add_argument("--include-tags", help="Comma-separated list of tags to include")
    parser.add_argument("--exclude-tags", help="Comma-separated list of tags to exclude")
    
    # Analysis options
    parser.add_argument("--analyze", action="store_true", help="Analyze filtered events")
    parser.add_argument("--limit", type=int, help="Limit number of results")
    parser.add_argument("--sort-by", choices=["time", "wsjf", "cod", "pattern", "circle"], default="time", help="Sort results by field")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    events = load_pattern_events(args.input_file)
    
    # Apply filters
    if args.pattern:
        events = filter_by_pattern(events, [args.pattern])
    elif args.patterns:
        patterns = [p.strip() for p in args.patterns.split(',') if p.strip()]
        events = filter_by_pattern(events, patterns)
    
    if args.circle:
        events = filter_by_circle(events, [args.circle])
    elif args.circles:
        circles = [c.strip() for c in args.circles.split(',') if c.strip()]
        events = filter_by_circle(events, circles)
    
    events = filter_by_time_range(events, args.hours, args.start_date, args.end_date)
    events = filter_by_economic_metrics(events, args.min_wsjf, args.max_wsjf, args.min_cod, args.max_cod)
    
    if args.status:
        status_values = [s.strip() for s in args.status.split(',') if s.strip()]
        events = filter_by_status(events, status_values)
    
    events = filter_by_depth(events, args.min_depth, args.max_depth)
    
    if args.include_tags or args.exclude_tags:
        include_tags = [t.strip() for t in args.include_tags.split(',') if t.strip()] if args.include_tags else []
        exclude_tags = [t.strip() for t in args.exclude_tags.split(',') if t.strip()] if args.exclude_tags else []
        events = filter_by_tags(events, include_tags, exclude_tags)
    
    # Sort events
    if args.sort_by == "time":
        events.sort(key=lambda e: parse_event_time(e) or datetime.min, reverse=True)
    elif args.sort_by == "wsjf":
        events.sort(key=lambda e: e.get("economic", {}).get("wsjf_score", 0), reverse=True)
    elif args.sort_by == "cod":
        events.sort(key=lambda e: e.get("economic", {}).get("cost_of_delay", 0), reverse=True)
    elif args.sort_by == "pattern":
        events.sort(key=lambda e: e.get("pattern", ""))
    elif args.sort_by == "circle":
        events.sort(key=lambda e: e.get("circle", ""))
    
    # Apply limit
    if args.limit:
        events = events[:args.limit]
    
    if not events:
        print("No events found matching filters", file=sys.stderr)
        sys.exit(1)
    
    result = {
        "filter_timestamp": datetime.now(timezone.utc).isoformat(),
        "total_filtered_events": len(events),
        "filters_applied": {
            "pattern": args.pattern or args.patterns,
            "circle": args.circle or args.circles,
            "time_range": {
                "hours": args.hours,
                "start_date": args.start_date,
                "end_date": args.end_date
            },
            "economic": {
                "min_wsjf": args.min_wsjf,
                "max_wsjf": args.max_wsjf,
                "min_cod": args.min_cod,
                "max_cod": args.max_cod
            },
            "status": args.status,
            "depth_range": {
                "min": args.min_depth,
                "max": args.max_depth
            },
            "tags": {
                "include": args.include_tags,
                "exclude": args.exclude_tags
            }
        }
    }
    
    # Add analysis if requested
    if args.analyze:
        analysis = analyze_filtered_events(events)
        result["analysis"] = analysis
    
    # Export if requested
    if args.output_file:
        success = export_filtered_events(events, args.output_file, args.export_format)
        result["export"] = {
            "file": args.output_file,
            "format": args.export_format,
            "success": success
        }
    
    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print("=" * 70)
        print("PATTERN METRICS FILTER REPORT")
        print("=" * 70)
        print(f"Events Filtered: {len(events)}")
        print(f"Filter Applied: {args.pattern or 'all patterns'}")
        
        if args.analyze and "analysis" in result:
            analysis = result["analysis"]
            print(f"\n📈 Filter Analysis:")
            print(f"   Total Events: {analysis['total_events']}")
            print(f"   Code-Fix Events: {analysis['code_fix_events']}")
            print(f"   Failure Rate: {analysis['failure_rate']:.1f}%")
            
            econ_summary = analysis.get("economic_summary", {})
            if econ_summary:
                print(f"\n💰 Economic Summary:")
                print(f"   Avg WSJF: {econ_summary.get('avg_wsjf_score', 0):.2f}")
                print(f"   Avg CoD: {econ_summary.get('avg_cost_of_delay', 0):.2f}")
                print(f"   Total Economic Impact: {econ_summary.get('total_economic_impact', 0):.2f}")
            
            top_patterns = analysis.get("top_patterns", [])
            if top_patterns:
                print(f"\n🔍 Top Patterns:")
                for pattern, count in top_patterns:
                    print(f"   {pattern}: {count}")
        
        if args.output_file:
            export_info = result.get("export", {})
            if export_info:
                print(f"\n💾 Export Results:")
                print(f"   File: {export_info['file']}")
                print(f"   Format: {export_info['format']}")
                print(f"   Success: {'✅' if export_info['success'] else '❌'}")

if __name__ == "__main__":
    main()
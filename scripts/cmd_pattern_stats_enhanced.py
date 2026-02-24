#!/usr/bin/env python3
"""
Enhanced Pattern Statistics Command
Shows comprehensive statistics of all patterns in pattern_metrics.jsonl
Enhanced with WSJF enrichment and code-fix-proposal pattern analysis
"""

import json
import os
import sys
import statistics
import math
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional

# Import WSJF adjuster for enrichment
try:
    from priority.wsjf_adjuster import WSJFAdjuster
except ImportError:
    # Fallback if wsjf_adjuster not available
    class WSJFAdjuster:
        def __init__(self):
            pass
        
        def load_pattern_events(self, hours=None):
            return []
        
        def enrich_with_wsjf(self, events):
            return events
        
        def detect_code_fix_proposal_patterns(self, events):
            return []
        
        def calculate_correlation_analysis(self, events, hours=72):
            return {}
        
        def generate_wsjf_recommendations(self, events):
            return []


def _split_csv(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [v.strip() for v in value.split(',') if v.strip()]


def _parse_event_time(event: Dict[str, Any]) -> Optional[datetime]:
    ts = event.get("timestamp") or event.get("ts")
    if not ts:
        return None
    
    try:
        # Try ISO format first
        if 'T' in ts:
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        else:
            dt = datetime.fromisoformat(ts)
        
        # Ensure timezone is UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None


def _event_correlation_id(event: Dict[str, Any]) -> str:
    """Extract correlation ID from event"""
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


def detect_code_fix_patterns(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Detect code-fix-proposal patterns in events"""
    code_fix_patterns = []
    
    for event in events:
        pattern = event.get("pattern", "")
        tags = event.get("tags", [])
        
        # Detect code-fix-proposal patterns
        is_code_fix = (
            "code-fix" in pattern.lower() or
            "code_fix" in pattern.lower() or
            "fix-proposal" in pattern.lower() or
            "bug-fix" in pattern.lower() or
            "security-fix" in pattern.lower() or
            "performance-fix" in pattern.lower() or
            any("fix" in tag.lower() for tag in tags) or
            any("bug" in tag.lower() for tag in tags) or
            any("security" in tag.lower() for tag in tags)
        )
        
        if is_code_fix:
            enriched_event = event.copy()
            enriched_event["detected_pattern_type"] = "code-fix-proposal"
            enriched_event["fix_severity"] = _assess_fix_severity(event)
            enriched_event["fix_complexity"] = _assess_fix_complexity(event)
            code_fix_patterns.append(enriched_event)
    
    return code_fix_patterns


def _assess_fix_severity(event: Dict[str, Any]) -> str:
    """Assess severity of code fix based on event data"""
    economic = event.get("economic", {})
    wsjf_score = economic.get("wsjf_score", 0)
    cod = economic.get("cost_of_delay", 0)
    tags = event.get("tags", [])
    
    # High severity if WSJF score > 15 or CoD > 20
    if wsjf_score > 15 or cod > 20:
        return "high"
    # Medium severity if WSJF score > 8 or CoD > 10
    elif wsjf_score > 8 or cod > 10:
        return "medium"
    # Low severity otherwise
    else:
        return "low"


def _assess_fix_complexity(event: Dict[str, Any]) -> str:
    """Assess complexity of code fix based on event data"""
    depth = event.get("depth", 0)
    tags = event.get("tags", [])
    
    # High complexity if depth >= 4 or security tag
    if depth >= 4 or any("security" in tag.lower() for tag in tags):
        return "high"
    # Medium complexity if depth >= 2 or UI tag
    elif depth >= 2 or any("ui" in tag.lower() for tag in tags):
        return "medium"
    # Low complexity otherwise
    else:
        return "low"


def calculate_72hour_correlation(events: List[Dict[str, Any]], hours: int = 72) -> Dict[str, Any]:
    """Calculate 72-hour correlation analysis between WSJF scores and completion rates"""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    # Filter events within time window
    recent_events = []
    for event in events:
        event_time = _parse_event_time(event)
        if event_time and event_time >= cutoff:
            recent_events.append(event)
    
    if len(recent_events) < 2:
        return {"error": "Insufficient data for correlation analysis"}
    
    # Extract WSJF scores and completion rates
    wsjf_scores = []
    completion_rates = []
    
    for event in recent_events:
        economic = event.get("economic", {})
        wsjf_score = economic.get("enhanced_wsjf_score", economic.get("wsjf_score", 0))
        completion_rate = event.get("completion_rate", 0)
        
        if wsjf_score > 0:
            wsjf_scores.append(wsjf_score)
            completion_rates.append(completion_rate)
    
    if len(wsjf_scores) < 2:
        return {"error": "Insufficient WSJF data for correlation"}
    
    # Calculate correlation coefficients
    try:
        pearson_corr = _calculate_pearson_correlation(wsjf_scores, completion_rates)
        spearman_corr = _calculate_spearman_correlation(wsjf_scores, completion_rates)
    except ValueError:
        pearson_corr = 0.0
        spearman_corr = 0.0
    
    return {
        "timeframe_hours": hours,
        "total_patterns": len(events),
        "recent_patterns": len(recent_events),
        "overall_correlation": {
            "pearson": pearson_corr,
            "spearman": spearman_corr,
            "sample_size": len(wsjf_scores)
        },
        "pattern_correlations": _calculate_pattern_correlations(recent_events)
    }


def _calculate_pearson_correlation(x: List[float], y: List[float]) -> float:
    """Calculate Pearson correlation coefficient"""
    if len(x) != len(y) or len(x) < 2:
        return 0.0
    
    n = len(x)
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi * xi for xi in x)
    sum_y2 = sum(yi * yi for yi in y)
    
    numerator = n * sum_xy - sum_x * sum_y
    denominator = math.sqrt((n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y))
    
    if denominator == 0:
        return 0.0
    
    return numerator / denominator


def _calculate_spearman_correlation(x: List[float], y: List[float]) -> float:
    """Calculate Spearman rank correlation coefficient"""
    if len(x) != len(y) or len(x) < 2:
        return 0.0
    
    # Calculate ranks
    rank_x = _calculate_ranks(x)
    rank_y = _calculate_ranks(y)
    
    n = len(x)
    sum_d2 = sum((rx - ry) ** 2 for rx, ry in zip(rank_x, rank_y))
    
    return 1 - (6 * sum_d2) / (n * (n * n - 1))


def _calculate_ranks(values: List[float]) -> List[float]:
    """Calculate ranks for Spearman correlation"""
    sorted_values = sorted(values)
    ranks = []
    
    for value in values:
        rank = sum(1 for i, v in enumerate(sorted_values) if v == value)
        ranks.append(rank)
    
    return ranks


def _calculate_pattern_correlations(events: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Calculate correlations by pattern type"""
    pattern_data = defaultdict(lambda: {"wsjf_scores": [], "completion_rates": []})
    
    for event in events:
        pattern = event.get("pattern", "unknown")
        economic = event.get("economic", {})
        wsjf_score = economic.get("enhanced_wsjf_score", economic.get("wsjf_score", 0))
        completion_rate = event.get("completion_rate", 0)
        
        if wsjf_score > 0:
            pattern_data[pattern]["wsjf_scores"].append(wsjf_score)
            pattern_data[pattern]["completion_rates"].append(completion_rate)
    
    correlations = {}
    for pattern, data in pattern_data.items():
        if len(data["wsjf_scores"]) >= 2:
            pearson_corr = _calculate_pearson_correlation(data["wsjf_scores"], data["completion_rates"])
            spearman_corr = _calculate_spearman_correlation(data["wsjf_scores"], data["completion_rates"])
            
            correlations[pattern] = {
                "correlation_strength": abs(pearson_corr),
                "pearson": pearson_corr,
                "spearman": spearman_corr,
                "avg_wsjf_score": statistics.mean(data["wsjf_scores"]),
                "completion_rate": statistics.mean(data["completion_rates"]),
                "sample_size": len(data["wsjf_scores"])
            }
    
    return correlations


def calculate_enhanced_stats(events: List[Dict[str, Any]], wsjf_enriched: bool = False) -> Dict[str, Any]:
    """Calculate enhanced statistics with WSJF and code-fix-proposal analysis"""
    stats = {
        "total": len(events),
        "recent_24h": 0,
        "recent_72h": 0,
        "completed_actions": 0,
        "failed_actions": 0,
        "by_pattern": Counter(),
        "by_circle": Counter(),
        "by_depth": Counter(),
        "by_run_kind": Counter(),
        "patterns_by_circle": defaultdict(Counter),
        "top_tags": Counter(),
        "economic_totals": {
            "total_cod": 0.0,
            "total_wsjf": 0.0,
            "avg_cod": 0.0,
            "avg_wsjf": 0.0,
            "enhanced_wsjf_applied": 0
        },
        "code_fix_proposals": {
            "total": 0,
            "by_severity": Counter(),
            "by_complexity": Counter()
        }
    }
    
    now = datetime.now(timezone.utc)
    cutoff_24h = now - timedelta(hours=24)
    cutoff_72h = now - timedelta(hours=72)
    
    econ_count = 0
    total_cod = 0.0
    total_wsjf = 0.0
    enhanced_wsjf_count = 0
    
    for event in events:
        # Time-based counts
        event_time = _parse_event_time(event)
        if event_time:
            if event_time >= cutoff_24h:
                stats["recent_24h"] += 1
            if event_time >= cutoff_72h:
                stats["recent_72h"] += 1
        
        # Basic counts
        pattern = event.get("pattern", "unknown")
        circle = event.get("circle", "unknown")
        depth = event.get("depth", 0)
        run_kind = event.get("run_kind", "unknown")
        tags = event.get("tags", [])
        
        stats["by_pattern"][pattern] += 1
        stats["by_circle"][circle] += 1
        stats["by_depth"][depth] += 1
        stats["by_run_kind"][run_kind] += 1
        
        # Pattern by circle
        stats["patterns_by_circle"][circle][pattern] += 1
        
        # Tags
        for tag in tags:
            stats["top_tags"][tag] += 1
        
        # Economic data
        economic = event.get("economic", {})
        if economic:
            cod = economic.get("cost_of_delay", 0)
            wsjf_score = economic.get("enhanced_wsjf_score", economic.get("wsjf_score", 0))
            
            if cod > 0 or wsjf_score > 0:
                econ_count += 1
                total_cod += cod
                total_wsjf += wsjf_score
                
                if "enhanced_wsjf_score" in economic:
                    enhanced_wsjf_count += 1
        
        # Action status
        if event.get("status") == "completed":
            stats["completed_actions"] += 1
        elif event.get("status") == "failed":
            stats["failed_actions"] += 1
        
        # Code-fix-proposal detection
        if event.get("detected_pattern_type") == "code-fix-proposal":
            stats["code_fix_proposals"]["total"] += 1
            severity = event.get("fix_severity", "low")
            complexity = event.get("fix_complexity", "low")
            stats["code_fix_proposals"]["by_severity"][severity] += 1
            stats["code_fix_proposals"]["by_complexity"][complexity] += 1
    
    # Calculate economic averages
    if econ_count > 0:
        stats["economic_totals"]["total_cod"] = total_cod
        stats["economic_totals"]["total_wsjf"] = total_wsjf
        stats["economic_totals"]["avg_cod"] = total_cod / econ_count
        stats["economic_totals"]["avg_wsjf"] = total_wsjf / econ_count
        stats["economic_totals"]["enhanced_wsjf_applied"] = enhanced_wsjf_count
    
    # Calculate 72-hour correlation if requested
    if wsjf_enriched:
        stats["wsjf_correlation"] = calculate_72hour_correlation(events)
    
    return stats


def print_enhanced_stats(stats: Dict[str, Any], json_output: bool = False, file=None):
    """Print enhanced statistics in human-readable or JSON format"""
    if json_output:
        output = json.dumps(stats, indent=2, default=str)
        if file:
            file.write(output)
        else:
            print(output)
        return
    
    output_lines = []
    output_lines.append("=" * 70)
    output_lines.append("ENHANCED PATTERN METRICS STATISTICS")
    output_lines.append("=" * 70)
    
    output_lines.append(f"\n📊 Total Events: {stats['total']}")
    output_lines.append(f"📈 Recent Activity: {stats['recent_24h']} (24h), {stats['recent_72h']} (72h)")
    output_lines.append(f"✅ Completed Actions: {stats['completed_actions']}")
    output_lines.append(f"❌ Failed Actions: {stats['failed_actions']}")
    
    # Economic summary
    econ = stats["economic_totals"]
    if econ["total_cod"] > 0 or econ["total_wsjf"] > 0:
        output_lines.append(f"\n💰 Economic Metrics:")
        output_lines.append(f"   Total Cost of Delay: {econ['total_cod']:.2f}")
        output_lines.append(f"   Total WSJF Score: {econ['total_wsjf']:.2f}")
        output_lines.append(f"   Avg CoD per Event: {econ['avg_cod']:.2f}")
        output_lines.append(f"   Avg WSJF per Event: {econ['avg_wsjf']:.2f}")
        if econ["enhanced_wsjf_applied"] > 0:
            output_lines.append(f"   Enhanced WSJF Applied: {econ['enhanced_wsjf_applied']} events")
    
    # Code-fix-proposal summary
    code_fixes = stats["code_fix_proposals"]
    if code_fixes["total"] > 0:
        output_lines.append(f"\n🔧 Code-Fix-Proposal Patterns:")
        output_lines.append(f"   Total: {code_fixes['total']}")
        output_lines.append(f"   By Severity: {dict(code_fixes['by_severity'])}")
        output_lines.append(f"   By Complexity: {dict(code_fixes['by_complexity'])}")
    
    # WSJF Correlation Analysis
    correlation = stats.get("wsjf_correlation", {})
    if correlation and "overall_correlation" in correlation:
        output_lines.append(f"\n📈 72-Hour WSJF Correlation Analysis:")
        output_lines.append(f"   Overall Correlation: {correlation['overall_correlation']['pearson']:.3f}")
        output_lines.append(f"   Patterns Analyzed: {correlation.get('recent_patterns', 0)}")
        
        pattern_corrs = correlation.get("pattern_correlations", {})
        if pattern_corrs:
            output_lines.append(f"   Top Pattern Correlations:")
            sorted_patterns = sorted(pattern_corrs.items(), 
                                key=lambda x: x[1].get('correlation_strength', 0), 
                                reverse=True)[:5]
            for pattern, data in sorted_patterns:
                strength = data.get('correlation_strength', 0)
                avg_wsjf = data.get('avg_wsjf_score', 0)
                completion = data.get('completion_rate', 0)
                output_lines.append(f"      {pattern:25s} {strength:6.3f} (WSJF: {avg_wsjf:.1f}, Completion: {completion:.1%})")
    
    # Top patterns
    output_lines.append(f"\n🔍 Top 10 Patterns:")
    for pattern, count in stats["by_pattern"].most_common(10):
        pct = (count / stats["total"]) * 100
        output_lines.append(f"   {pattern:30s} {count:6d} ({pct:5.1f}%)")
    
    # By circle
    output_lines.append(f"\n🎯 Events by Circle:")
    for circle, count in stats["by_circle"].most_common():
        pct = (count / stats["total"]) * 100
        output_lines.append(f"   {circle:20s} {count:6d} ({pct:5.1f}%)")
    
    # By depth
    output_lines.append(f"\n📏 Events by Depth:")
    for depth in sorted(stats["by_depth"].keys()):
        count = stats["by_depth"][depth]
        pct = (count / stats["total"]) * 100
        output_lines.append(f"   Depth {depth}: {count:6d} ({pct:5.1f}%)")
    
    # By run kind
    if stats["by_run_kind"]:
        output_lines.append(f"\n🔄 Events by Run Kind:")
        for run_kind, count in stats["by_run_kind"].most_common():
            pct = (count / stats["total"]) * 100
            output_lines.append(f"   {run_kind:20s} {count:6d} ({pct:5.1f}%)")
    
    # Top tags
    if stats["top_tags"]:
        output_lines.append(f"\n🏷️  Top 10 Tags:")
        for tag, count in stats["top_tags"].most_common(10):
            pct = (count / stats["total"]) * 100
            output_lines.append(f"   {tag:20s} {count:6d} ({pct:5.1f}%)")
    
    # Pattern distribution by circle
    output_lines.append(f"\n🔬 Pattern Distribution by Circle:")
    for circle, patterns in list(stats["patterns_by_circle"].items())[:5]:
        output_lines.append(f"\n   {circle}:")
        for pattern, count in patterns.most_common(5):
            output_lines.append(f"      {pattern:25s} {count:4d}")
    
    # Output to file or stdout
    output_text = "\n".join(output_lines)
    if file:
        file.write(output_text)
    else:
        print(output_text)


def get_goalie_dir() -> Path:
    """Get .goalie directory path"""
    project_root = os.environ.get("PROJECT_ROOT", ".")
    return Path(project_root) / ".goalie"


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Enhanced Pattern Metrics Statistics")
    
    # Optional positional arguments for compatibility with original script
    parser.add_argument("input_file", nargs='?', help="Input file path (optional, defaults to .goalie/pattern_metrics.jsonl)")
    parser.add_argument("output_file", nargs='?', help="Output file path (optional, defaults to stdout)")
    
    # Optional arguments
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--pattern", help="Filter by specific pattern")
    parser.add_argument("--patterns", help="Comma-separated list of patterns (for filtering/correlation)")
    parser.add_argument("--circle", help="Filter by specific circle")
    parser.add_argument("--hours", type=int, default=None, help="Limit to events in the last N hours")
    parser.add_argument("--correlation-id", dest="correlation_id", help="Filter by correlation_id (per-run scoping)")
    parser.add_argument("--correlate", action="store_true", help="When using --patterns, compute run_id correlation")
    parser.add_argument("--include-run-kinds", help="Comma-separated run_kinds to include (e.g., governance-agent,prod-cycle)")
    parser.add_argument("--exclude-run-kinds", help="Comma-separated run_kinds to exclude (e.g., manual,unknown)")
    
    # Enhanced WSJF options
    parser.add_argument("--wsjf-enrich", action="store_true", help="Apply WSJF enrichment to events")
    parser.add_argument("--detect-fixes", action="store_true", help="Detect and analyze code-fix-proposal patterns")
    parser.add_argument("--72h-correlation", action="store_true", help="Perform 72-hour WSJF correlation analysis")
    
    # Filtering options
    parser.add_argument("--wsjf-min", type=float, help="Minimum WSJF score filter")
    parser.add_argument("--wsjf-max", type=float, help="Maximum WSJF score filter")
    parser.add_argument("--sort-by", choices=["wsjf", "pattern", "circle", "time"], default="time", help="Sort output by field")
    parser.add_argument("--limit", type=int, help="Limit number of results")
    
    args = parser.parse_args()
    
    # Initialize WSJF adjuster for enrichment
    wsjf_adjuster = WSJFAdjuster()
    events = load_pattern_events(args.input_file if args.input_file else None)
    
    if not events:
        print("No pattern events found", file=sys.stderr)
        sys.exit(1)
    
    # Apply WSJF enrichment if requested
    if args.wsjf_enrich:
        events = wsjf_adjuster.enrich_with_wsjf(events)
    
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
    
    # Apply WSJF filters
    if args.wsjf_min is not None or args.wsjf_max is not None:
        filtered_events = []
        for e in events:
            economic = e.get("economic", {})
            wsjf_score = economic.get("enhanced_wsjf_score", economic.get("wsjf_score", 0))
            
            if args.wsjf_min is not None and wsjf_score < args.wsjf_min:
                continue
            if args.wsjf_max is not None and wsjf_score > args.wsjf_max:
                continue
            filtered_events.append(e)
        events = filtered_events
    
    # Apply sorting
    if args.sort_by == "wsjf":
        events.sort(key=lambda e: e.get("economic", {}).get("enhanced_wsjf_score", e.get("economic", {}).get("wsjf_score", 0)), reverse=True)
    elif args.sort_by == "pattern":
        events.sort(key=lambda e: e.get("pattern", ""))
    elif args.sort_by == "circle":
        events.sort(key=lambda e: e.get("circle", ""))
    elif args.sort_by == "time":
        events.sort(key=lambda e: _parse_event_time(e) or datetime.min, reverse=True)
    
    # Apply limit
    if args.limit:
        events = events[:args.limit]
    
    if not events and (args.pattern or args.circle or args.wsjf_min is not None or args.wsjf_max is not None):
        print("No events found matching filters", file=sys.stderr)
        sys.exit(1)
    
    # Detect code-fix-proposal patterns if requested
    if args.detect_fixes:
        code_fixes = detect_code_fix_patterns(events)
        # Add detected patterns back to events for analysis
        for event in events:
            for fix in code_fixes:
                if event.get("run_id") == fix.get("run_id") or event.get("correlation_id") == fix.get("correlation_id"):
                    event.update(fix)
                    break
    
    stats = calculate_enhanced_stats(events, args.wsjf_enrich or getattr(args, '_72h_correlation', False))

    # Optional correlation output
    if args.correlate and patterns_list and len(patterns_list) >= 2:
        correlation = _correlate_by_run_id(events, patterns_list)
        stats["correlation"] = correlation

    # Output results
    if args.output_file:
        with open(args.output_file, 'w') as f:
            print_enhanced_stats(stats, json_output=args.json, file=f)
    else:
        print_enhanced_stats(stats, json_output=args.json)


if __name__ == "__main__":
    main()
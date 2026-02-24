#!/usr/bin/env python3
"""
Fix Duration Instrumentation

Analyzes pattern_metrics.jsonl for missing or sentinel (1ms) duration values
and provides recommendations for improving duration coverage.

Current issue: 210 missing events + 1716 sentinel events (~52% valid coverage)
Target: ≥90% valid duration coverage
"""

import json
import os
import sys
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime


def analyze_duration_coverage(metrics_file: Path) -> dict:
    """Analyze duration_ms coverage in pattern metrics."""
    if not metrics_file.exists():
        return {"error": f"File not found: {metrics_file}"}
    
    stats = {
        "total_events": 0,
        "has_duration": 0,
        "duration_measured_true": 0,
        "sentinel_1ms": 0,
        "missing_duration": 0,
        "valid_duration": 0,
        "patterns_missing_duration": Counter(),
        "patterns_with_sentinel": Counter(),
    }
    
    with open(metrics_file, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
                stats["total_events"] += 1
                
                pattern = event.get("pattern", "unknown")
                data = event.get("data", {})
                
                # Check duration_ms in data block
                duration_ms = data.get("duration_ms")
                duration_measured = data.get("duration_measured", False)
                
                if duration_ms is None:
                    stats["missing_duration"] += 1
                    stats["patterns_missing_duration"][pattern] += 1
                elif duration_ms == 1 and not duration_measured:
                    stats["sentinel_1ms"] += 1
                    stats["patterns_with_sentinel"][pattern] += 1
                else:
                    stats["valid_duration"] += 1
                    
                if duration_ms is not None:
                    stats["has_duration"] += 1
                if duration_measured:
                    stats["duration_measured_true"] += 1
                    
            except json.JSONDecodeError:
                continue
    
    return stats


def generate_recommendations(stats: dict) -> list:
    """Generate recommendations based on duration analysis."""
    recommendations = []
    
    # Top patterns missing duration
    if stats.get("patterns_missing_duration"):
        top_missing = stats["patterns_missing_duration"].most_common(5)
        for pattern, count in top_missing:
            recommendations.append({
                "priority": "HIGH",
                "pattern": pattern,
                "issue": "missing_duration",
                "count": count,
                "fix": f"Use logger.timed('{pattern}', ...) context manager or add duration_ms to log call"
            })
    
    # Top patterns with sentinel values
    if stats.get("patterns_with_sentinel"):
        top_sentinel = stats["patterns_with_sentinel"].most_common(5)
        for pattern, count in top_sentinel:
            recommendations.append({
                "priority": "MEDIUM",
                "pattern": pattern,
                "issue": "sentinel_1ms",
                "count": count,
                "fix": f"Measure actual duration for '{pattern}' using time.time() or logger.timed()"
            })
    
    return recommendations


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Analyze duration instrumentation")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--file", type=str, help="Specific file to analyze")
    args = parser.parse_args()
    
    goalie_dir = Path(".goalie")
    metrics_file = Path(args.file) if args.file else goalie_dir / "pattern_metrics.jsonl"
    
    stats = analyze_duration_coverage(metrics_file)
    recommendations = generate_recommendations(stats)
    
    if args.json:
        output = {"stats": stats, "recommendations": recommendations}
        # Convert Counters to dicts for JSON
        output["stats"]["patterns_missing_duration"] = dict(stats.get("patterns_missing_duration", {}))
        output["stats"]["patterns_with_sentinel"] = dict(stats.get("patterns_with_sentinel", {}))
        print(json.dumps(output, indent=2))
        return
    
    # Human-readable output
    print("=" * 60)
    print("Duration Instrumentation Analysis")
    print("=" * 60)
    print()
    
    total = stats.get("total_events", 0)
    valid = stats.get("valid_duration", 0)
    missing = stats.get("missing_duration", 0)
    sentinel = stats.get("sentinel_1ms", 0)
    
    print(f"Total events: {total}")
    print(f"Valid duration: {valid} ({valid/total*100:.1f}%)" if total else "")
    print(f"Missing duration: {missing}")
    print(f"Sentinel (1ms): {sentinel}")
    print()
    
    coverage = valid / total * 100 if total else 0
    status = "✅ PASS" if coverage >= 90 else "❌ NEEDS IMPROVEMENT"
    print(f"Coverage: {coverage:.1f}% (target: 90%) - {status}")
    print()
    
    if recommendations:
        print("Recommendations:")
        for rec in recommendations[:10]:
            print(f"  [{rec['priority']}] {rec['pattern']}: {rec['issue']} ({rec['count']} events)")
            print(f"         Fix: {rec['fix']}")
            print()


if __name__ == "__main__":
    main()


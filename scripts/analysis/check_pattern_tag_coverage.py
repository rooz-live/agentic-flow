#!/usr/bin/env python3
"""
Check pattern tag coverage for telemetry validation.

Validates that ≥90% of pattern events have appropriate tags
(HPC, ML, Stats, Device/Web, Rust, Federation).
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any

VALID_TAG_CATEGORIES = ["HPC", "ML", "Stats", "Device/Web", "Rust", "Federation"]

def load_pattern_events(file_path: Path) -> List[Dict[str, Any]]:
    """Load pattern events from JSONL file."""
    events = []
    
    if not file_path.exists():
        print(f"Warning: File not found: {file_path}", file=sys.stderr)
        return events
    
    with open(file_path, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            
            try:
                event = json.loads(line)
                events.append(event)
            except json.JSONDecodeError as e:
                print(f"Warning: Line {line_num}: JSON decode error: {e}", file=sys.stderr)
    
    return events

def check_tag_coverage(events: List[Dict[str, Any]], threshold: float = 0.90) -> tuple[bool, Dict[str, Any]]:
    """Check that events have appropriate tags."""
    total_events = len(events)
    
    if total_events == 0:
        return True, {
            "total_events": 0,
            "events_with_tags": 0,
            "coverage_percentage": 0.0,
            "threshold": threshold * 100,
            "passed": True,
            "message": "No events to validate"
        }
    
    events_with_tags = 0
    tag_distribution = {tag: 0 for tag in VALID_TAG_CATEGORIES}
    untagged_patterns = []
    
    for event in events:
        tags = event.get("tags", [])
        
        if tags and len(tags) > 0:
            events_with_tags += 1
            
            # Count tag distribution
            for tag in tags:
                if tag in tag_distribution:
                    tag_distribution[tag] += 1
        else:
            pattern = event.get("pattern", "unknown")
            untagged_patterns.append(pattern)
    
    coverage_pct = (events_with_tags / total_events) * 100
    passed = coverage_pct >= (threshold * 100)
    
    return passed, {
        "total_events": total_events,
        "events_with_tags": events_with_tags,
        "coverage_percentage": coverage_pct,
        "threshold": threshold * 100,
        "passed": passed,
        "tag_distribution": tag_distribution,
        "untagged_patterns": list(set(untagged_patterns))[:10],  # First 10 unique
        "message": f"Tag coverage: {coverage_pct:.1f}% (threshold: {threshold*100}%)"
    }

def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Check pattern tag coverage for telemetry validation"
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.90,
        help="Minimum tag coverage threshold (0.0-1.0, default: 0.90)"
    )
    parser.add_argument(
        "--file",
        type=str,
        help="Specific file to check (default: check all pattern metrics files)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )
    
    args = parser.parse_args()
    
    project_root = Path.cwd()
    goalie_dir = project_root / ".goalie"
    
    # Files to check
    if args.file:
        files_to_check = [Path(args.file)]
    else:
        files_to_check = [
            goalie_dir / "pattern_metrics.jsonl",
            goalie_dir / "pattern_metrics_append.jsonl",
            goalie_dir / "pattern_metrics_enhanced.jsonl",
            goalie_dir / "cycle_log.jsonl",
        ]
    
    all_passed = True
    all_results = {}
    
    for file_path in files_to_check:
        if not file_path.exists():
            continue
        
        events = load_pattern_events(file_path)
        passed, results = check_tag_coverage(events, args.threshold)
        
        all_results[str(file_path.name)] = results
        
        if not passed:
            all_passed = False
    
    # Output results
    if args.json:
        print(json.dumps(all_results, indent=2))
    else:
        print("\n" + "=" * 60)
        print("Pattern Tag Coverage Validation")
        print("=" * 60)
        
        for filename, results in all_results.items():
            print(f"\nFile: {filename}")
            print(f"  Total events: {results['total_events']}")
            print(f"  Events with tags: {results['events_with_tags']}")
            print(f"  Coverage: {results['coverage_percentage']:.1f}%")
            print(f"  Threshold: {results['threshold']:.1f}%")
            print(f"  Status: {'✅ PASS' if results['passed'] else '❌ FAIL'}")
            
            if results['tag_distribution']:
                print("\n  Tag distribution:")
                for tag, count in sorted(results['tag_distribution'].items(), key=lambda x: x[1], reverse=True):
                    if count > 0:
                        print(f"    {tag}: {count}")
            
            if results.get('untagged_patterns'):
                print(f"\n  Untagged patterns (sample):")
                for pattern in results['untagged_patterns']:
                    print(f"    - {pattern}")
        
        print("\n" + "=" * 60)
        
        if all_passed:
            print("✅ All files passed tag coverage validation")
            print("=" * 60)
        else:
            print("❌ Some files failed tag coverage validation")
            print("=" * 60)
    
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Pattern Coverage Analysis
Analyzes Method Pattern coverage across backlogs and telemetry

Usage:
    af pattern-coverage [--json]
"""

import sys
import yaml
import json
from pathlib import Path
from typing import Dict, List, Any
from collections import defaultdict, Counter
import re
import os

# Robust path resolution relative to this script
SCRIPT_DIR = Path(__file__).resolve().parent
# Assuming script is in /scripts/, project root is one level up
PROJECT_ROOT = SCRIPT_DIR.parent
if (PROJECT_ROOT / "investing").exists():
     # If we are in a monorepo structure like /code/investing/agentic-flow/scripts/
     # and PROJECT_ROOT is /code/investing/agentic-flow, this is correct.
     pass
elif (PROJECT_ROOT / "agentic-flow").exists():
     # Fallback if structure is different
     pass

# Allow overriding via env var for complex setups
if "PROJECT_ROOT" in os.environ:
    PROJECT_ROOT = Path(os.environ["PROJECT_ROOT"])

CIRCLES_ROOT = PROJECT_ROOT / "circles"
ACTIONS_FILE = PROJECT_ROOT / ".goalie" / "CONSOLIDATED_ACTIONS.yaml"
METRICS_FILE = PROJECT_ROOT / ".goalie" / "pattern_metrics.jsonl"


def scan_backlog_patterns() -> Dict[str, Any]:
    """Scan all circle backlogs for Method Pattern usage"""
    pattern_usage = defaultdict(lambda: {'count': 0, 'circles': set()})
    total_items = 0
    items_with_patterns = 0
    items_by_circle = defaultdict(int)
    patterns_by_circle = defaultdict(lambda: Counter())
    
    # Find all backlog.md files
    backlog_files = list(CIRCLES_ROOT.glob("**/backlog.md"))
    
    for backlog_path in backlog_files:
        # Extract circle name
        parts = backlog_path.relative_to(CIRCLES_ROOT).parts
        circle_name = parts[0] if parts else 'unknown'
        
        with open(backlog_path, 'r') as f:
            content = f.read()
        
        # Parse markdown table rows (Tier 1)
        # Format: | ID | Task | Status | Budget | Method Pattern | DoR | DoD | CoD | Size | WSJF |
        pattern_regex_tier1 = r'\|\s*([A-Z]+-\d+)\s*\|[^|]*\|[^|]*\|[^|]*\|\s*([^|]+?)\s*\|'
        
        # Parse list items with tags (Tier 3)
        # Format: - [ ] #pattern:X #wsjf:Y Task description
        pattern_regex_tier3 = r'-\s*\[[ x]\]\s*.*#pattern:([\w-]+)'

        matches_tier1 = re.findall(pattern_regex_tier1, content)
        matches_tier3 = re.findall(pattern_regex_tier3, content)
        
        # Process Tier 1 matches
        for task_id, pattern in matches_tier1:
            total_items += 1
            items_by_circle[circle_name] += 1
            
            pattern = pattern.strip()
            if pattern and pattern not in ['', 'N/A', 'None', 'TBD']:
                items_with_patterns += 1
                pattern_usage[pattern]['count'] += 1
                pattern_usage[pattern]['circles'].add(circle_name)
                patterns_by_circle[circle_name][pattern] += 1

        # Process Tier 3 matches
        for pattern in matches_tier3:
            total_items += 1 # Note: This might double count if mixed, but usually files are one tier
            items_by_circle[circle_name] += 1
            
            pattern = pattern.strip()
            if pattern:
                items_with_patterns += 1
                pattern_usage[pattern]['count'] += 1
                pattern_usage[pattern]['circles'].add(circle_name)
                patterns_by_circle[circle_name][pattern] += 1
    
    # Convert sets to lists for JSON serialization
    for pattern_data in pattern_usage.values():
        pattern_data['circles'] = sorted(list(pattern_data['circles']))
    
    return {
        'total_items': total_items,
        'items_with_patterns': items_with_patterns,
        'coverage_pct': (items_with_patterns / total_items * 100) if total_items > 0 else 0,
        'patterns': dict(pattern_usage),
        'items_by_circle': dict(items_by_circle),
        'patterns_by_circle': {k: dict(v) for k, v in patterns_by_circle.items()}
    }


def scan_action_patterns() -> Dict[str, Any]:
    """Scan CONSOLIDATED_ACTIONS.yaml for pattern usage"""
    if not ACTIONS_FILE.exists():
        return {'error': 'CONSOLIDATED_ACTIONS.yaml not found'}
    
    with open(ACTIONS_FILE, 'r') as f:
        data = yaml.safe_load(f)
    
    items = data.get('items', [])
    pattern_counter = Counter()
    
    for item in items:
        pattern = item.get('pattern')
        if pattern:
            pattern_counter[pattern] += 1
    
    return {
        'total_items': len(items),
        'items_with_patterns': sum(pattern_counter.values()),
        'coverage_pct': (sum(pattern_counter.values()) / len(items) * 100) if items else 0,
        'patterns': dict(pattern_counter)
    }


def scan_telemetry_patterns() -> Dict[str, Any]:
    """Scan pattern_metrics.jsonl for telemetry coverage"""
    if not METRICS_FILE.exists():
        return {'error': 'pattern_metrics.jsonl not found'}
    
    pattern_counter = Counter()
    total_events = 0
    
    with open(METRICS_FILE, 'r') as f:
        for line in f:
            if line.strip():
                try:
                    event = json.loads(line)
                    total_events += 1
                    pattern = event.get('pattern')
                    if pattern:
                        pattern_counter[pattern] += 1
                except json.JSONDecodeError:
                    continue
    
    return {
        'total_events': total_events,
        'patterns': dict(pattern_counter),
        'unique_patterns': len(pattern_counter)
    }


def identify_gaps(backlog_data: Dict, action_data: Dict, telemetry_data: Dict) -> Dict[str, List[str]]:
    """Identify patterns missing from backlogs or telemetry"""
    backlog_patterns = set(backlog_data.get('patterns', {}).keys())
    action_patterns = set(action_data.get('patterns', {}).keys())
    telemetry_patterns = set(telemetry_data.get('patterns', {}).keys())
    
    return {
        'in_actions_not_backlogs': sorted(action_patterns - backlog_patterns),
        'in_backlogs_not_actions': sorted(backlog_patterns - action_patterns),
        'in_telemetry_not_backlogs': sorted(telemetry_patterns - backlog_patterns),
        'in_backlogs_no_telemetry': sorted(backlog_patterns - telemetry_patterns),
    }


def format_coverage_report(backlog_data: Dict, action_data: Dict, telemetry_data: Dict, gaps: Dict):
    """Format coverage report for terminal output"""
    print("\n" + "="*80)
    print("📊 Method Pattern Coverage Analysis")
    print("="*80)
    
    # Backlog coverage
    print(f"\n🗂️  Circle Backlogs:")
    print(f"  Total items: {backlog_data['total_items']}")
    print(f"  Items with patterns: {backlog_data['items_with_patterns']}")
    print(f"  Coverage: {backlog_data['coverage_pct']:.1f}%")
    
    if backlog_data['patterns']:
        print(f"\n  Top patterns:")
        sorted_patterns = sorted(backlog_data['patterns'].items(), key=lambda x: x[1]['count'], reverse=True)[:10]
        for pattern, data in sorted_patterns:
            circles = ', '.join(data['circles'])
            print(f"    • {pattern}: {data['count']} items ({circles})")
    
    # Action coverage
    print(f"\n📋 CONSOLIDATED_ACTIONS.yaml:")
    if 'error' not in action_data:
        print(f"  Total items: {action_data['total_items']}")
        print(f"  Items with patterns: {action_data['items_with_patterns']}")
        print(f"  Coverage: {action_data['coverage_pct']:.1f}%")
    else:
        print(f"  ⚠️  {action_data['error']}")
    
    # Telemetry coverage
    print(f"\n📡 Pattern Telemetry (pattern_metrics.jsonl):")
    if 'error' not in telemetry_data:
        print(f"  Total events: {telemetry_data['total_events']}")
        print(f"  Unique patterns: {telemetry_data['unique_patterns']}")
        
        if telemetry_data['patterns']:
            print(f"\n  Most active patterns:")
            sorted_patterns = sorted(telemetry_data['patterns'].items(), key=lambda x: x[1], reverse=True)[:10]
            for pattern, count in sorted_patterns:
                print(f"    • {pattern}: {count} events")
    else:
        print(f"  ⚠️  {telemetry_data['error']}")
    
    # Gaps
    print(f"\n🔍 Coverage Gaps:")
    
    if gaps['in_backlogs_no_telemetry']:
        print(f"  ⚠️  Patterns in backlogs but not emitting telemetry ({len(gaps['in_backlogs_no_telemetry'])}):")
        for pattern in gaps['in_backlogs_no_telemetry'][:5]:
            print(f"    • {pattern}")
        if len(gaps['in_backlogs_no_telemetry']) > 5:
            print(f"    ... and {len(gaps['in_backlogs_no_telemetry']) - 5} more")
    
    if gaps['in_telemetry_not_backlogs']:
        print(f"  💡 Patterns in telemetry but not in backlogs ({len(gaps['in_telemetry_not_backlogs'])}):")
        for pattern in gaps['in_telemetry_not_backlogs'][:5]:
            print(f"    • {pattern}")
    
    # Recommendations
    print(f"\n💡 Recommendations:")
    
    if backlog_data['coverage_pct'] < 80:
        missing = backlog_data['total_items'] - backlog_data['items_with_patterns']
        print(f"  • Define Method Patterns for {missing} backlog items")
    
    if gaps['in_backlogs_no_telemetry']:
        print(f"  • Add telemetry for {len(gaps['in_backlogs_no_telemetry'])} patterns")
    
    if backlog_data['coverage_pct'] >= 90:
        print(f"  ✅ Excellent pattern coverage!")
    
    print("\n" + "="*80)


def main():
    """Main entry point"""
    args = sys.argv[1:]
    output_json = '--json' in args
    
    # Scan all sources
    backlog_data = scan_backlog_patterns()
    action_data = scan_action_patterns()
    telemetry_data = scan_telemetry_patterns()
    gaps = identify_gaps(backlog_data, action_data, telemetry_data)
    
    if output_json:
        result = {
            'backlogs': backlog_data,
            'actions': action_data,
            'telemetry': telemetry_data,
            'gaps': gaps
        }
        print(json.dumps(result, indent=2))
    else:
        format_coverage_report(backlog_data, action_data, telemetry_data, gaps)


if __name__ == '__main__':
    main()

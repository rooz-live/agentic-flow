#!/usr/bin/env python3
"""
Schema Drift Monitor
- Detects incomplete entries in pattern_metrics.jsonl
- Validates required fields per schema v3
- Checks circle-specific required fields
- Exits with code 1 if drift detected (for CI/CD integration)

Usage:
    python3 scripts/monitor_schema_drift.py              # Check last 100 entries
    python3 scripts/monitor_schema_drift.py --all        # Check all entries
    python3 scripts/monitor_schema_drift.py --last 50    # Check last 50 entries
"""

import json
import sys
import os
import argparse
from typing import List, Dict

# Required fields for schema v3
REQUIRED_FIELDS = {'run_kind', 'action_completed', 'ts', 'pattern', 'tags', 'gate'}

# Circle-specific required fields (from guardrails.py SchemaValidation)
CIRCLE_FIELDS = {
    'innovator': ['innovation_metric'],
    'assessor': ['assessment_result'],
    'analyst': ['analysis_type'],
    'orchestrator': ['data'],
    'intuitive': ['confidence'],
    'seeker': ['search_query', 'results']
}

def check_recent_entries(metrics_file: str, last_n: int = 100) -> List[Dict]:
    """
    Check recent entries for schema compliance.
    
    Args:
        metrics_file: Path to pattern_metrics.jsonl
        last_n: Number of recent entries to check (0 = all)
    
    Returns:
        List of issues found
    """
    if not os.path.exists(metrics_file):
        return [{'error': f'File not found: {metrics_file}'}]
    
    try:
        with open(metrics_file) as f:
            entries = [json.loads(line) for line in f if line.strip()]
    except Exception as e:
        return [{'error': f'Failed to read file: {e}'}]
    
    if last_n > 0 and len(entries) > last_n:
        entries = entries[-last_n:]
        start_idx = len(entries) - last_n
    else:
        start_idx = 0
    
    issues = []
    
    for idx, entry in enumerate(entries):
        line_num = start_idx + idx + 1
        
        # Check required fields
        missing = REQUIRED_FIELDS - set(entry.keys())
        if missing:
            issues.append({
                'line': line_num,
                'missing': list(missing),
                'circle': entry.get('circle', 'unknown'),
                'pattern': entry.get('pattern', 'unknown'),
                'severity': 'high'
            })
        
        # Check circle-specific fields
        circle = entry.get('circle')
        if circle in CIRCLE_FIELDS:
            for field in CIRCLE_FIELDS[circle]:
                if field not in entry:
                    issues.append({
                        'line': line_num,
                        'missing': [field],
                        'circle': circle,
                        'pattern': entry.get('pattern', 'unknown'),
                        'severity': 'medium'
                    })
        
        # Check for empty tags in Tier 1/2 circles (analyst, orchestrator, assessor, innovator)
        tier_12_circles = ['analyst', 'orchestrator', 'assessor', 'innovator']
        if circle in tier_12_circles:
            tags = entry.get('tags', [])
            if not tags or len(tags) == 0:
                issues.append({
                    'line': line_num,
                    'missing': [],
                    'circle': circle,
                    'pattern': entry.get('pattern', 'unknown'),
                    'severity': 'low',
                    'note': f'Tier 1/2 circle \"{circle}\" should have non-empty tags'
                })
    
    return issues

def print_issues(issues: List[Dict], metrics_file: str, last_n: int):
    """Print issues in human-readable format."""
    if not issues:
        print("✅ Schema compliance: 100%")
        return
    
    # Count by severity
    high = sum(1 for i in issues if i.get('severity') == 'high')
    medium = sum(1 for i in issues if i.get('severity') == 'medium')
    low = sum(1 for i in issues if i.get('severity') == 'low')
    
    print(f"⚠️  Schema drift detected: {len(issues)} incomplete entries")
    print(f"   High: {high}, Medium: {medium}, Low: {low}")
    print()
    
    # Show first 10 issues
    for issue in issues[:10]:
        severity_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}.get(issue.get('severity'), '⚪')
        
        if 'error' in issue:
            print(f"{severity_emoji} ERROR: {issue['error']}")
        elif 'note' in issue:
            print(f"{severity_emoji} Line {issue['line']}: {issue['note']}")
        else:
            missing_str = ', '.join(issue['missing'])
            print(f"{severity_emoji} Line {issue['line']}: Missing {missing_str} (circle={issue['circle']}, pattern={issue['pattern']})")
    
    if len(issues) > 10:
        print(f"\n... and {len(issues) - 10} more issues")
    
    print()
    print("Recommendations:")
    if high > 0:
        print("  1. Run: python3 scripts/migrate_pattern_metrics_run_kind.py")
    if medium > 0:
        print(f"  2. Check circle-specific generators (innovator, assessor, analyst)")
    if low > 0:
        print(f"  3. Add tags to Tier 1/2 circle entries")
    print(f"  4. Backup available at: {metrics_file.replace('.jsonl', '_backup_*.jsonl')}")

def main():
    parser = argparse.ArgumentParser(description='Monitor pattern metrics for schema drift')
    parser.add_argument('--last', type=int, default=100, help='Number of recent entries to check (default: 100)')
    parser.add_argument('--all', action='store_true', help='Check all entries (overrides --last)')
    parser.add_argument('--file', default='.goalie/pattern_metrics.jsonl', help='Path to metrics file')
    parser.add_argument('--json', action='store_true', help='Output results as JSON')
    
    args = parser.parse_args()
    
    last_n = 0 if args.all else args.last
    metrics_file = args.file
    
    issues = check_recent_entries(metrics_file, last_n)
    
    if args.json:
        # JSON output for programmatic consumption
        high = sum(1 for i in issues if i.get('severity') == 'high')
        medium = sum(1 for i in issues if i.get('severity') == 'medium')
        low = sum(1 for i in issues if i.get('severity') == 'low')
        
        max_severity = 'NONE'
        if high > 0:
            max_severity = 'HIGH'
        elif medium > 0:
            max_severity = 'MEDIUM'
        elif low > 0:
            max_severity = 'LOW'
        
        result = {
            'drift_detected': len(issues) > 0,
            'severity': max_severity,
            'total_issues': len(issues),
            'high_severity': high,
            'medium_severity': medium,
            'low_severity': low,
            'issues': issues[:20],  # Limit to first 20 for output size
            'checked_entries': last_n if last_n > 0 else 'all'
        }
        print(json.dumps(result, indent=2))
    else:
        # Human-readable output
        print_issues(issues, metrics_file, last_n)
    
    # Exit with error code if HIGH severity issues found
    high_severity = sum(1 for i in issues if i.get('severity') == 'high')
    sys.exit(1 if high_severity > 0 else 0)

if __name__ == '__main__':
    main()

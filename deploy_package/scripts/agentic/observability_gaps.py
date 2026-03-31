#!/usr/bin/env python3
"""
Observability Gaps Emitter
Analyzes pattern metrics for observability coverage gaps
"""

import json
import sys
from pathlib import Path
from collections import Counter
from typing import Dict, Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]

def analyze_observability_gaps() -> Dict[str, Any]:
    """Analyze pattern metrics for observability gaps"""
    
    metrics_file = PROJECT_ROOT / ".goalie" / "pattern_metrics.jsonl"
    
    if not metrics_file.exists():
        return {
            "gap_count": 0,
            "critical_gaps": [],
            "coverage_pct": 0.0,
            "error": "No pattern metrics found"
        }
    
    # Count patterns by observability status
    total_patterns = 0
    observable_patterns = 0
    patterns = Counter()
    
    with open(metrics_file) as f:
        for line in f:
            try:
                event = json.loads(line)
                pattern = event.get('pattern')
                if pattern:
                    total_patterns += 1
                    patterns[pattern] += 1
                    
                    # Patterns with these fields are observable
                    if any(k in event for k in ['duration_seconds', 'economic', 'behavioral_type']):
                        observable_patterns += 1
            except json.JSONDecodeError:
                continue
    
    coverage_pct = (observable_patterns / total_patterns * 100) if total_patterns > 0 else 0.0
    
    # Identify gaps - patterns with no observability
    gap_patterns = [p for p, count in patterns.most_common() if count < 2]
    critical_gaps = gap_patterns[:5]  # Top 5 gaps
    
    return {
        "gap_count": len(gap_patterns),
        "critical_gaps": critical_gaps,
        "coverage_pct": round(coverage_pct, 1),
        "total_patterns": total_patterns,
        "observable_patterns": observable_patterns
    }

def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Observability Gaps Emitter")
    parser.add_argument('--filter', default='observability', help='Filter type (observability)')
    parser.add_argument('--json', action='store_true', help='Output JSON format')
    
    args = parser.parse_args()
    
    result = analyze_observability_gaps()
    
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Observability Gaps:")
        print(f"  Gap Count: {result['gap_count']}")
        print(f"  Coverage: {result['coverage_pct']}%")
        print(f"  Critical Gaps: {', '.join(result['critical_gaps'][:3])}")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())

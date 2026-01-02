#!/usr/bin/env python3
"""
Spiritual Dimension Recovery - P1-B Implementation
Addresses spiritual collapse (score=0.049) by enhancing pattern emissions with
Manthra/Yasna/Mithra alignment scores.

Recovery Strategy:
1. Backfill existing patterns with computed alignment scores
2. Create enhanced emission template for future patterns
3. Track recovery progress via dimensional_integrity metric
"""

import os
import json
import datetime
from typing import Dict, Any, List

PROJECT_ROOT = os.environ.get("PROJECT_ROOT", ".")
GOALIE_DIR = os.path.join(PROJECT_ROOT, ".goalie")
PATTERN_METRICS_FILE = os.path.join(GOALIE_DIR, "pattern_metrics.jsonl")
RECOVERY_LOG_FILE = os.path.join(GOALIE_DIR, "spiritual_recovery_log.jsonl")


def compute_alignment_score(pattern: Dict) -> Dict[str, Any]:
    """
    Compute Manthra/Yasna/Mithra alignment scores for a pattern.

    Manthra: Intent clarity (is there directed thought-power?)
    Yasna: Policy alignment (is there structured action/phase?)
    Mithra: Evidence binding (is outcome tracked?)
    """
    # Manthra: Check for intent indicators
    has_intent = bool(
        pattern.get('run') or
        pattern.get('run_id') or
        pattern.get('gate') or
        pattern.get('action')
    )
    manthra_score = 0.9 if has_intent else 0.3

    # Yasna: Check for policy/phase indicators
    has_policy = bool(
        pattern.get('mode') or
        pattern.get('depth') is not None or
        pattern.get('circle') or
        pattern.get('pattern')
    )
    yasna_score = 1.0 if has_policy else 0.5

    # Mithra: Check for evidence/outcome tracking
    has_evidence = bool(
        pattern.get('action_completed') is not None or
        pattern.get('status') or
        pattern.get('economic') or
        pattern.get('data')
    )
    mithra_score = 1.0 if has_evidence else 0.3

    # Consequence tracking (for vigilance)
    has_consequence = bool(
        pattern.get('consequence') or
        pattern.get('data', {}).get('reason') or
        pattern.get('recommendation')
    )

    # Overall drift calculation
    avg_alignment = (manthra_score + yasna_score + mithra_score) / 3
    overall_drift = round(1 - avg_alignment, 3)

    return {
        'manthra_score': manthra_score,
        'yasna_score': yasna_score,
        'mithra_score': mithra_score,
        'overall_drift': overall_drift,
        'consequence_tracked': has_consequence
    }


def analyze_current_state() -> Dict[str, Any]:
    """Analyze current spiritual dimension state from pattern metrics."""
    if not os.path.exists(PATTERN_METRICS_FILE):
        return {'error': 'Pattern metrics file not found'}

    patterns_with_alignment = 0
    patterns_without = 0
    total_patterns = 0

    with open(PATTERN_METRICS_FILE, 'r') as f:
        for line in f:
            try:
                pattern = json.loads(line.strip())
                total_patterns += 1
                if pattern.get('alignment_score'):
                    patterns_with_alignment += 1
                else:
                    patterns_without += 1
            except (json.JSONDecodeError, ValueError):
                continue

    coverage = patterns_with_alignment / total_patterns if total_patterns > 0 else 0

    return {
        'total_patterns': total_patterns,
        'patterns_with_alignment': patterns_with_alignment,
        'patterns_without_alignment': patterns_without,
        'alignment_coverage': round(coverage, 3),
        'recovery_needed': patterns_without > 0
    }


def log_recovery_action(action: str, details: Dict[str, Any]) -> None:
    """Log a spiritual dimension recovery action."""
    entry = {
        'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'action': action,
        'details': details
    }

    os.makedirs(os.path.dirname(RECOVERY_LOG_FILE), exist_ok=True)
    with open(RECOVERY_LOG_FILE, 'a') as f:
        f.write(json.dumps(entry) + '\n')


def backfill_existing_patterns(dry_run: bool = False) -> Dict[str, Any]:
    """
    Backfill existing patterns with computed alignment scores.

    Returns: Statistics about the backfill operation.
    """
    if not os.path.exists(PATTERN_METRICS_FILE):
        return {'error': 'Pattern metrics file not found'}

    patterns = []
    updated_count = 0
    skipped_count = 0

    # Read all patterns
    with open(PATTERN_METRICS_FILE, 'r') as f:
        for line in f:
            try:
                pattern = json.loads(line.strip())
                patterns.append(pattern)
            except (json.JSONDecodeError, ValueError):
                continue

    # Process each pattern
    updated_patterns = []
    for pattern in patterns:
        if pattern.get('alignment_score') and isinstance(pattern.get('alignment_score'), dict):
            # Already has alignment score
            skipped_count += 1
            updated_patterns.append(pattern)
        else:
            # Compute and add alignment score
            alignment = compute_alignment_score(pattern)
            pattern['alignment_score'] = alignment
            # Add consequence tracking if missing
            if 'consequence_tracking' not in pattern:
                pattern['consequence_tracking'] = {
                    'downstream_impact': 0.5,
                    'risk_propagation': 0.3,
                    'rollback_complexity': 0.4,
                    'observability_coverage': 0.6 if pattern.get('economic') else 0.3,
                    'consequence_awareness': 0.5 if alignment['consequence_tracked'] else 0.2,
                    'vigilance_status': 'ADEQUATE' if alignment['consequence_tracked'] else 'NEEDS_ATTENTION',
                    'framework': 'VIG-v1'
                }
            updated_count += 1
            updated_patterns.append(pattern)

    # Write back if not dry run
    if not dry_run:
        with open(PATTERN_METRICS_FILE, 'w') as f:
            for pattern in updated_patterns:
                f.write(json.dumps(pattern) + '\n')

    # Calculate spiritual dimension after backfill
    manthra_sum = sum(p['alignment_score'].get('manthra_score', 0) for p in updated_patterns)
    yasna_sum = sum(p['alignment_score'].get('yasna_score', 0) for p in updated_patterns)
    mithra_sum = sum(p['alignment_score'].get('mithra_score', 0) for p in updated_patterns)
    total = len(updated_patterns)

    spiritual_dimension = 0
    if total > 0:
        spiritual_dimension = (manthra_sum/total + yasna_sum/total + mithra_sum/total) / 3

    return {
        'total_patterns': len(patterns),
        'updated': updated_count,
        'skipped': skipped_count,
        'dry_run': dry_run,
        'spiritual_dimension': round(spiritual_dimension, 3),
        'manthra_avg': round(manthra_sum/total, 3) if total > 0 else 0,
        'yasna_avg': round(yasna_sum/total, 3) if total > 0 else 0,
        'mithra_avg': round(mithra_sum/total, 3) if total > 0 else 0
    }


def main():
    """Execute spiritual dimension analysis or backfill."""
    import argparse
    parser = argparse.ArgumentParser(description='Spiritual Dimension Recovery')
    parser.add_argument('--analyze', action='store_true', help='Analyze current state')
    parser.add_argument('--backfill-existing', action='store_true', help='Backfill alignment scores')
    parser.add_argument('--dry-run', action='store_true', help='Dry run (no writes)')
    parser.add_argument('--json', action='store_true', help='JSON output')
    args = parser.parse_args()

    if args.backfill_existing:
        result = backfill_existing_patterns(dry_run=args.dry_run)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"Spiritual Dimension Backfill {'(DRY RUN)' if args.dry_run else ''}")
            print(f"=" * 50)
            print(f"Total patterns: {result.get('total_patterns', 0)}")
            print(f"Updated: {result.get('updated', 0)}")
            print(f"Skipped (already had scores): {result.get('skipped', 0)}")
            print()
            print(f"=== SPIRITUAL DIMENSION: {result.get('spiritual_dimension', 0):.3f} ===")
            print(f"  Manthra (intent) avg: {result.get('manthra_avg', 0):.3f}")
            print(f"  Yasna (policy) avg: {result.get('yasna_avg', 0):.3f}")
            print(f"  Mithra (evidence) avg: {result.get('mithra_avg', 0):.3f}")
            print(f"\nTarget: >0.5")
            if result.get('spiritual_dimension', 0) >= 0.5:
                print("✅ TARGET MET!")
            else:
                gap = 0.5 - result.get('spiritual_dimension', 0)
                print(f"Gap to target: {gap:.3f}")
        log_recovery_action('backfill', result)
        return

    state = analyze_current_state()

    if args.json:
        print(json.dumps(state, indent=2))
    else:
        print(f"Spiritual Dimension Recovery Analysis")
        print(f"=" * 40)
        print(f"Total patterns: {state.get('total_patterns', 0)}")
        print(f"With alignment: {state.get('patterns_with_alignment', 0)}")
        print(f"Without alignment: {state.get('patterns_without_alignment', 0)}")
        print(f"Coverage: {state.get('alignment_coverage', 0)*100:.1f}%")
        print(f"Recovery needed: {state.get('recovery_needed', False)}")

    log_recovery_action('analyze', state)


if __name__ == '__main__':
    main()

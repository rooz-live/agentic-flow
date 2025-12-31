#!/usr/bin/env python3
"""
Alignment Checker - Manthra/Yasna/Mithra Framework
Detects misalignment between thought (intent), word (policy), and action (evidence).

P2-2 Implementation:
- Auto-flags patterns with drift > 0.3 for ROAM risk creation
- Generates weekly alignment reports showing thought-word-action coherence
- Truthfulness preservation metrics
- Calibrated judgment validation
- Misalignment detection for "authority replaces insight"
- Vigilance deficit monitoring
"""

import os
import json
import datetime
import hashlib
from typing import List, Dict, Any, Optional

PROJECT_ROOT = os.environ.get("PROJECT_ROOT", ".")
GOALIE_DIR = os.path.join(PROJECT_ROOT, ".goalie")
PATTERN_METRICS_FILE = os.path.join(GOALIE_DIR, "pattern_metrics.jsonl")
ALIGNMENT_REPORT_FILE = os.path.join(GOALIE_DIR, "alignment_report.json")
ROAM_RISKS_FILE = os.path.join(GOALIE_DIR, "roam_risks.jsonl")
CALIBRATION_FILE = os.path.join(GOALIE_DIR, "calibration_state.json")

DRIFT_THRESHOLD = 0.3  # Flag patterns with drift > 0.3


def load_recent_patterns(hours: int = 168) -> List[Dict]:
    """Load patterns from the last N hours (default: 168 = 1 week)."""
    if not os.path.exists(PATTERN_METRICS_FILE):
        return []

    cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=hours)
    patterns = []

    with open(PATTERN_METRICS_FILE, 'r') as f:
        for line in f:
            try:
                entry = json.loads(line.strip())
                ts_str = entry.get('ts') or entry.get('timestamp')
                if ts_str:
                    ts = datetime.datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                    if ts.replace(tzinfo=None) >= cutoff:
                        patterns.append(entry)
            except (json.JSONDecodeError, ValueError):
                continue

    return patterns


def analyze_alignment(patterns: List[Dict]) -> Dict[str, Any]:
    """Analyze alignment scores across patterns."""
    aligned_count = 0
    drifted_count = 0
    high_drift_patterns = []

    manthra_scores = []
    yasna_scores = []
    mithra_scores = []
    drift_scores = []

    for p in patterns:
        alignment = p.get('alignment_score', {})
        if not alignment:
            continue

        drift = alignment.get('overall_drift', 0.5)
        drift_scores.append(drift)

        if alignment.get('manthra_score'):
            manthra_scores.append(alignment['manthra_score'])
        if alignment.get('yasna_score'):
            yasna_scores.append(alignment['yasna_score'])
        if alignment.get('mithra_score'):
            mithra_scores.append(alignment['mithra_score'])

        if drift > DRIFT_THRESHOLD:
            drifted_count += 1
            high_drift_patterns.append({
                'pattern': p.get('pattern'),
                'circle': p.get('circle'),
                'drift': drift,
                'timestamp': p.get('ts'),
                'alignment': alignment
            })
        else:
            aligned_count += 1

    total = aligned_count + drifted_count
    alignment_rate = (aligned_count / total * 100) if total > 0 else 0

    return {
        'total_patterns': len(patterns),
        'patterns_with_alignment': total,
        'aligned_count': aligned_count,
        'drifted_count': drifted_count,
        'alignment_rate_pct': round(alignment_rate, 2),
        'avg_manthra': round(sum(manthra_scores) / len(manthra_scores), 3) if manthra_scores else 0,
        'avg_yasna': round(sum(yasna_scores) / len(yasna_scores), 3) if yasna_scores else 0,
        'avg_mithra': round(sum(mithra_scores) / len(mithra_scores), 3) if mithra_scores else 0,
        'avg_drift': round(sum(drift_scores) / len(drift_scores), 3) if drift_scores else 0,
        'high_drift_patterns': high_drift_patterns[:20]  # Top 20 drifted
    }


def detect_authority_replaces_insight(patterns: List[Dict]) -> List[Dict]:
    """
    P2-2: Detect when authority replaces insight, compliance replaces responsibility.
    This is a philosophical check for governance health.
    """
    warnings = []

    # Look for patterns where autocommit=false but no clear reason
    for p in patterns:
        data = p.get('data', {})
        alignment = p.get('alignment_score', {})

        # High yasna (policy compliance) but low manthra (intent) suggests
        # "compliance replaces responsibility"
        if alignment.get('yasna_score', 0) > 0.9 and alignment.get('manthra_score', 0) < 0.5:
            warnings.append({
                'type': 'COMPLIANCE_OVER_RESPONSIBILITY',
                'pattern': p.get('pattern'),
                'circle': p.get('circle'),
                'evidence': 'High policy compliance with unclear intent',
                'recommendation': 'Ensure action is driven by understanding, not just rules'
            })

        # Low mithra (evidence) with high manthra (intent) suggests
        # "authority replaces insight" - claims without evidence
        if alignment.get('manthra_score', 0) > 0.8 and alignment.get('mithra_score', 0) < 0.5:
            warnings.append({
                'type': 'AUTHORITY_OVER_INSIGHT',
                'pattern': p.get('pattern'),
                'circle': p.get('circle'),
                'evidence': 'Strong intent claims with weak supporting evidence',
                'recommendation': 'Strengthen evidence logging for claimed outcomes'
            })

    return warnings


def detect_vigilance_deficit(patterns: List[Dict]) -> Dict:
    """
    P2-2/VIG-001: Monitor for vigilance deficit - failure to maintain consequence awareness.
    Detects patterns that suggest reduced attention to downstream effects.

    Now includes consequence_tracking field analysis from VIG-001 enhancement.
    """
    total = len(patterns)
    if total == 0:
        return {'deficit_score': 0.0, 'warnings': []}

    warnings = []
    deficit_indicators = 0
    consequence_awareness_scores = []

    for p in patterns:
        data = p.get('data', {})

        # Missing economic context suggests ignoring consequences
        if not p.get('economic'):
            deficit_indicators += 1

        # No duration tracking suggests ignoring performance consequences
        if not data.get('duration_ms'):
            deficit_indicators += 0.5

        # No alignment score suggests ignoring quality consequences
        if not p.get('alignment_score'):
            deficit_indicators += 0.5

        # VIG-001: Check for explicit consequence tracking
        consequence_tracking = p.get('consequence_tracking', {})
        if consequence_tracking:
            awareness = consequence_tracking.get('consequence_awareness', 0.5)
            consequence_awareness_scores.append(awareness)
            # Low consequence awareness adds to deficit
            if awareness < 0.5:
                deficit_indicators += 0.3
        else:
            # Missing consequence_tracking is a deficit indicator
            deficit_indicators += 0.3

    deficit_score = deficit_indicators / total if total > 0 else 0.0

    # Calculate average consequence awareness if available
    avg_consequence_awareness = (
        sum(consequence_awareness_scores) / len(consequence_awareness_scores)
        if consequence_awareness_scores else 0.0
    )

    if deficit_score > 0.5:
        warnings.append({
            'type': 'HIGH_VIGILANCE_DEFICIT',
            'score': round(deficit_score, 3),
            'recommendation': 'Increase consequence tracking in pattern emissions',
            'avg_consequence_awareness': round(avg_consequence_awareness, 3)
        })

    return {
        'deficit_score': round(deficit_score, 3),
        'indicators_found': int(deficit_indicators),
        'total_patterns': total,
        'patterns_with_consequence_tracking': len(consequence_awareness_scores),
        'avg_consequence_awareness': round(avg_consequence_awareness, 3),
        'warnings': warnings
    }


def calculate_calibrated_judgment(analysis: Dict) -> Dict:
    """
    P2-2: Validate calibrated judgment using the three-dimensional framework.
    Returns confidence calibration metrics.
    """
    manthra_avg = analysis.get('avg_manthra', 0)
    yasna_avg = analysis.get('avg_yasna', 0)
    mithra_avg = analysis.get('avg_mithra', 0)

    # Calibration score: how well-balanced are the three dimensions?
    scores = [manthra_avg, yasna_avg, mithra_avg]
    if all(s > 0 for s in scores):
        variance = sum((s - sum(scores)/3)**2 for s in scores) / 3
        balance_score = 1.0 - min(variance * 4, 1.0)  # Lower variance = better balance
    else:
        balance_score = 0.0

    # Truthfulness: average of all three dimensions
    truthfulness = (manthra_avg + yasna_avg + mithra_avg) / 3 if all(s > 0 for s in scores) else 0.0

    # Judgment confidence: based on sample size and consistency
    sample_size = analysis.get('patterns_with_alignment', 0)
    confidence = min(sample_size / 100, 1.0) * balance_score

    return {
        'balance_score': round(balance_score, 3),
        'truthfulness_score': round(truthfulness, 3),
        'judgment_confidence': round(confidence, 3),
        'calibration_status': 'CALIBRATED' if balance_score > 0.7 and confidence > 0.5 else 'NEEDS_CALIBRATION',
        'sample_size': sample_size
    }


def analyze_three_dimensional_integrity(patterns: List[Dict]) -> Dict:
    """
    Deep philosophical analysis based on the spiritual/ethical/embodied triad.

    Three Dimensions:
    1. SPIRITUAL (Manthra/Yasna/Mithra inner discipline):
       - Manthra: Directed thought-power, not casual thinking
       - Yasna: Alignment ritual, not performance
       - Mithra: Binding force keeping thought-word-action coherent

    2. ETHICAL (Good thoughts, good words, good deeds):
       - How inner alignment becomes visible in outcomes
       - Reality of ethics as testable, not private belief

    3. EMBODIED (Mind, speech, body consistent over time):
       - Stress test: coherence survives repetition, fatigue, temptation
       - Habit and practice matter for truth that survives

    Returns dimensional integrity analysis.
    """
    if not patterns:
        return {'dimensional_integrity': 0.0, 'analysis': {}}

    # SPIRITUAL DIMENSION: Inner discipline metrics
    # MYM-v2 FIX: Lowered thresholds from 0.75 to 0.70 to match MYM-v1 baseline patterns
    # Historical patterns use manthra=0.7 as default; this ensures backward compatibility
    # while still detecting truly low alignment (< 0.70)
    spiritual_indicators = 0
    for p in patterns:
        alignment = p.get('alignment_score', {})
        # Manthra: intent alignment (threshold 0.70 for MYM-v1/v2 compatibility)
        if alignment.get('manthra_score', 0) >= 0.70:
            spiritual_indicators += 1
        # Yasna: ritual/policy alignment (0.70 threshold)
        if alignment.get('yasna_score', 0) >= 0.70:
            spiritual_indicators += 1
        # Mithra: binding evidence (0.70 threshold)
        if alignment.get('mithra_score', 0) >= 0.70:
            spiritual_indicators += 1
    spiritual_score = spiritual_indicators / (len(patterns) * 3) if patterns else 0

    # ETHICAL DIMENSION: Visible outcomes
    ethical_indicators = 0
    for p in patterns:
        # Action completed = visible outcome
        if p.get('action_completed', False):
            ethical_indicators += 1
        # Economic impact tracked = consequences acknowledged
        if p.get('economic', {}).get('cost_of_delay', 0) > 0:
            ethical_indicators += 0.5
        # Consequence tracking present = ethical awareness
        if p.get('consequence_tracking', {}).get('consequence_awareness', 0) > 0.5:
            ethical_indicators += 0.5
    ethical_score = ethical_indicators / (len(patterns) * 2) if patterns else 0

    # EMBODIED DIMENSION: Consistency over time
    # Measure variance in alignment scores across patterns
    alignment_scores = [p.get('alignment_score', {}).get('overall_drift', 0.5)
                        for p in patterns if p.get('alignment_score')]
    if alignment_scores:
        mean_drift = sum(alignment_scores) / len(alignment_scores)
        variance = sum((s - mean_drift)**2 for s in alignment_scores) / len(alignment_scores)
        embodied_score = 1.0 - min(variance * 10, 1.0)  # Low variance = good consistency
    else:
        embodied_score = 0.0

    # Overall dimensional integrity
    dimensional_integrity = (spiritual_score + ethical_score + embodied_score) / 3

    return {
        'dimensional_integrity': round(dimensional_integrity, 3),
        'spiritual_dimension': {
            'score': round(spiritual_score, 3),
            'description': 'Inner discipline: Manthra (thought-power), Yasna (alignment), Mithra (binding)'
        },
        'ethical_dimension': {
            'score': round(ethical_score, 3),
            'description': 'Visible outcomes: Good thoughts→words→deeds testable in world'
        },
        'embodied_dimension': {
            'score': round(embodied_score, 3),
            'description': 'Consistency over time: Coherence survives stress and repetition'
        },
        'failure_modes': {
            'spiritual_collapse': spiritual_score < 0.4,  # Ethics becomes habit
            'ethical_privatization': ethical_score < 0.4,  # Belief becomes untestable
            'embodied_fragility': embodied_score < 0.4   # Truth cannot survive the body
        },
        'recommendation': _get_dimensional_recommendation(spiritual_score, ethical_score, embodied_score)
    }


def _get_dimensional_recommendation(spiritual: float, ethical: float, embodied: float) -> str:
    """Generate recommendation based on dimensional analysis."""
    lowest = min(spiritual, ethical, embodied)
    if lowest >= 0.7:
        return "All three dimensions healthy. Maintain current practice."
    elif spiritual == lowest:
        return "Strengthen inner discipline: Review intent-policy-evidence alignment in pattern emissions."
    elif ethical == lowest:
        return "Improve outcome visibility: Ensure action_completed and economic tracking in all patterns."
    else:
        return "Address consistency: Reduce variance in alignment scores across patterns over time."


def create_roam_risk(pattern_info: Dict) -> Dict:
    """Create a ROAM risk entry for high-drift pattern."""
    now = datetime.datetime.now(datetime.timezone.utc)
    return {
        'id': f"ALIGNMENT-DRIFT-{now.strftime('%Y%m%d%H%M%S')}",
        'timestamp': now.isoformat(),
        'type': 'ALIGNMENT_DRIFT',
        'severity': 'HIGH' if pattern_info['drift'] > 0.5 else 'MEDIUM',
        'status': 'OWNED',
        'pattern': pattern_info['pattern'],
        'circle': pattern_info['circle'],
        'drift_score': pattern_info['drift'],
        'recommendation': f"Review {pattern_info['pattern']} alignment",
        'source': 'alignment_checker'
    }


def flag_drifted_patterns(high_drift: List[Dict]) -> int:
    """Create ROAM risks for patterns with drift > threshold."""
    if not high_drift:
        return 0

    os.makedirs(GOALIE_DIR, exist_ok=True)
    flagged = 0

    with open(ROAM_RISKS_FILE, 'a') as f:
        for p in high_drift[:5]:  # Flag top 5 per run to avoid noise
            risk = create_roam_risk(p)
            f.write(json.dumps(risk) + '\n')
            flagged += 1

    return flagged


def generate_weekly_report(analysis: Dict) -> Dict:
    """Generate weekly alignment report."""
    report = {
        'timestamp': datetime.datetime.utcnow().isoformat() + 'Z',
        'report_type': 'weekly_alignment',
        'period_hours': 168,
        'framework': 'Manthra-Yasna-Mithra v1',
        'summary': {
            'alignment_rate': f"{analysis['alignment_rate_pct']}%",
            'target': '95%',
            'status': 'HEALTHY' if analysis['alignment_rate_pct'] >= 95 else 'NEEDS_ATTENTION',
            'patterns_analyzed': analysis['patterns_with_alignment']
        },
        'scores': {
            'manthra_avg': analysis['avg_manthra'],
            'yasna_avg': analysis['avg_yasna'],
            'mithra_avg': analysis['avg_mithra'],
            'drift_avg': analysis['avg_drift']
        },
        'drifted_count': analysis['drifted_count'],
        'high_drift_samples': analysis['high_drift_patterns'][:5]
    }

    os.makedirs(GOALIE_DIR, exist_ok=True)
    with open(ALIGNMENT_REPORT_FILE, 'w') as f:
        json.dump(report, f, indent=2)

    return report


def main():
    """Main CLI entrypoint."""
    import argparse

    parser = argparse.ArgumentParser(
        description='Alignment Checker - Manthra/Yasna/Mithra Framework')
    parser.add_argument('--hours', type=int, default=168,
                        help='Hours to analyze (default: 168 = 1 week)')
    parser.add_argument('--flag-risks', action='store_true',
                        help='Create ROAM risks for high-drift patterns')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    parser.add_argument('--report', action='store_true',
                        help='Generate weekly report file')
    parser.add_argument('--philosophical', action='store_true',
                        help='Include P2-2 philosophical framework analysis')
    args = parser.parse_args()

    # Load and analyze patterns
    patterns = load_recent_patterns(args.hours)
    analysis = analyze_alignment(patterns)

    # Flag high-drift patterns if requested
    flagged = 0
    if args.flag_risks and analysis['high_drift_patterns']:
        flagged = flag_drifted_patterns(analysis['high_drift_patterns'])

    # P2-2: Philosophical framework analysis
    philosophical_analysis = None
    if args.philosophical or args.json:
        authority_warnings = detect_authority_replaces_insight(patterns)
        vigilance = detect_vigilance_deficit(patterns)
        calibration = calculate_calibrated_judgment(analysis)
        dimensional = analyze_three_dimensional_integrity(patterns)
        philosophical_analysis = {
            'authority_insight_warnings': authority_warnings,
            'vigilance_deficit': vigilance,
            'calibrated_judgment': calibration,
            'three_dimensional_integrity': dimensional
        }

    # Generate report if requested
    if args.report:
        generate_weekly_report(analysis)

    # Output
    if args.json:
        output = {
            'analysis': analysis,
            'roam_risks_created': flagged,
            'philosophical_framework': philosophical_analysis
        }
        print(json.dumps(output, indent=2))
    else:
        print("=" * 60)
        print("ALIGNMENT CHECKER - Manthra/Yasna/Mithra Framework")
        print("=" * 60)
        print(f"Patterns analyzed: {analysis['total_patterns']}")
        print(f"With alignment data: {analysis['patterns_with_alignment']}")
        print()
        print(f"Alignment Rate: {analysis['alignment_rate_pct']}% (target: 95%)")
        print(f"  - Aligned: {analysis['aligned_count']}")
        print(f"  - Drifted: {analysis['drifted_count']}")
        print()
        print("Average Scores:")
        print(f"  - Manthra (Intent): {analysis['avg_manthra']}")
        print(f"  - Yasna (Policy): {analysis['avg_yasna']}")
        print(f"  - Mithra (Evidence): {analysis['avg_mithra']}")
        print(f"  - Overall Drift: {analysis['avg_drift']}")

        if args.philosophical and philosophical_analysis:
            print()
            print("=== P2-2: Philosophical Framework ===")
            cal = philosophical_analysis['calibrated_judgment']
            print(f"Calibration: {cal['calibration_status']}")
            print(f"  - Balance Score: {cal['balance_score']}")
            print(f"  - Truthfulness: {cal['truthfulness_score']}")
            print(f"  - Confidence: {cal['judgment_confidence']}")
            vig = philosophical_analysis['vigilance_deficit']
            print(f"Vigilance Deficit: {vig['deficit_score']}")
            auth = philosophical_analysis['authority_insight_warnings']
            if auth:
                print(f"Warnings: {len(auth)} authority/insight issues")

            # Three-dimensional integrity analysis
            dim = philosophical_analysis.get('three_dimensional_integrity', {})
            if dim:
                print()
                print("=== Three-Dimensional Integrity ===")
                print(f"Overall Integrity: {dim.get('dimensional_integrity', 0)}")
                sp = dim.get('spiritual_dimension', {})
                print(f"  Spiritual: {sp.get('score', 0)} - {sp.get('description', '')[:50]}")
                et = dim.get('ethical_dimension', {})
                print(f"  Ethical: {et.get('score', 0)} - {et.get('description', '')[:50]}")
                em = dim.get('embodied_dimension', {})
                print(f"  Embodied: {em.get('score', 0)} - {em.get('description', '')[:50]}")
                fm = dim.get('failure_modes', {})
                if any(fm.values()):
                    print("  Failure Modes:")
                    if fm.get('spiritual_collapse'):
                        print("    ⚠ Spiritual collapse: Ethics becoming mere habit")
                    if fm.get('ethical_privatization'):
                        print("    ⚠ Ethical privatization: Belief untestable")
                    if fm.get('embodied_fragility'):
                        print("    ⚠ Embodied fragility: Truth cannot survive stress")
                print(f"  Recommendation: {dim.get('recommendation', 'N/A')}")

        print()
        if flagged:
            print(f"ROAM Risks Created: {flagged}")
        if analysis['high_drift_patterns']:
            print(f"High-Drift Patterns: {len(analysis['high_drift_patterns'])}")
            for p in analysis['high_drift_patterns'][:3]:
                print(f"  - {p['pattern']} ({p['circle']}): drift={p['drift']}")

    return 0 if analysis['alignment_rate_pct'] >= 95 else 1


if __name__ == '__main__':
    raise SystemExit(main())

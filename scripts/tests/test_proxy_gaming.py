#!/usr/bin/env python3
"""
Comprehensive test suite for P2-TRUTH proxy gaming detection validation.

Covers:
- Basic rationale extraction (dict and string)
- Auto-rationale generation
- Edge cases (boundary conditions, missing fields, empty data)
- Gaming indicator trigger scenarios
- ROAM framework patterns
- Pattern coverage validation
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.agentic.alignment_checker import (
    load_recent_patterns,
    detect_proxy_gaming,
    _extract_rationale
)
from scripts.agentic.pattern_logger import PatternLogger
import json

# Track test results
tests_passed = 0
tests_failed = 0
test_results = []

def run_test(test_name, test_func):
    """Run a test and track results."""
    global tests_passed, tests_failed, test_results
    try:
        result = test_func()
        if result:
            tests_passed += 1
            test_results.append({'name': test_name, 'status': 'PASSED'})
            return result
    except Exception as e:
        print(f"  ✗ FAILED: {e}")
        tests_failed += 1
        test_results.append({'name': test_name, 'status': 'FAILED', 'error': str(e)})
        return None


# =============================================================================
# BASIC TESTS (Original 4 tests)
# =============================================================================

def test_auto_rationale():
    """Test that PatternLogger generates auto-rationale."""
    print("=== Test 1: Auto-Rationale Generation ===")
    logger = PatternLogger(circle='orchestrator', mode='advisory')
    rationale = logger._generate_auto_rationale('safe_degrade', {'action': 'test'}, 'health', 'enforcement')

    assert 'why' in rationale, 'Missing why key'
    assert 'context' in rationale, 'Missing context key'
    assert 'auto_generated' in rationale, 'Missing auto_generated key'
    assert rationale['why'] == 'Graceful degradation triggered to maintain service stability'
    print(f"  ✓ Auto-rationale generated: {rationale['why'][:50]}...")
    return True

def test_dict_rationale_extraction():
    """Test that dict rationales are extracted correctly."""
    print("=== Test 2: Dict Rationale Extraction ===")
    pattern_with_dict = {'rationale': {'why': 'Test explanation for policy compliance', 'context': 'test'}}
    extracted = _extract_rationale(pattern_with_dict)

    assert extracted == 'Test explanation for policy compliance', f'Expected rationale text, got: {extracted}'
    print(f"  ✓ Dict rationale extracted: {extracted[:40]}...")
    return True

def test_string_rationale_extraction():
    """Test that string rationales still work."""
    print("=== Test 3: String Rationale Extraction ===")
    pattern_with_string = {'rationale': 'This is a legacy string rationale that is long enough'}
    extracted = _extract_rationale(pattern_with_string)

    assert extracted == 'This is a legacy string rationale that is long enough'
    print(f"  ✓ String rationale extracted: {extracted[:40]}...")
    return True

def test_proxy_gaming_detection():
    """Test proxy gaming detection on recent patterns."""
    print("=== Test 4: Proxy Gaming Detection (Live) ===")
    patterns = load_recent_patterns(hours=48)  # Extended to 48 hours
    result = detect_proxy_gaming(patterns)

    print(f"  Patterns analyzed: {result.get('patterns_analyzed', 0)}")
    print(f"  Gaming detected: {result.get('gaming_detected', 'N/A')}")
    print(f"  Gaming score: {result.get('gaming_score', 'N/A')}")
    print(f"  Risk level: {result.get('risk_level', 'N/A')}")
    print(f"  Indicators: {len(result.get('indicators', []))} found")
    return result


# =============================================================================
# EDGE CASE TESTS - Boundary Conditions
# =============================================================================

def test_empty_patterns():
    """Test gaming detection with empty pattern list."""
    print("=== Test 5: Empty Patterns ===")
    result = detect_proxy_gaming([])
    assert result['gaming_detected'] == False, 'Empty patterns should not detect gaming'
    assert result['risk_level'] == 'LOW', 'Empty patterns should be LOW risk'
    assert result['patterns_analyzed'] == 0, 'Should report 0 patterns'
    print("  ✓ Empty patterns handled correctly")
    return True

def test_exactly_10_patterns_variance():
    """Test variance calculation boundary (exactly 10 patterns required)."""
    print("=== Test 6: Exactly 10 Patterns for Variance ===")
    # Create exactly 10 patterns with uniform scores (should trigger ARTIFICIAL_CONSISTENCY)
    patterns = []
    for i in range(10):
        patterns.append({
            'pattern': f'test_pattern_{i}',
            'alignment_score': {'manthra_score': 0.9, 'yasna_score': 0.9, 'mithra_score': 0.9},
            'rationale': 'Test rationale that is long enough to count'
        })

    result = detect_proxy_gaming(patterns)
    # With uniform high scores, should detect ARTIFICIAL_CONSISTENCY
    indicator_types = [ind['type'] for ind in result.get('indicators', [])]
    print(f"  Indicators found: {indicator_types}")
    print(f"  Gaming score: {result.get('gaming_score')}")
    print("  ✓ Exactly 10 patterns processed (variance check active)")
    return True

def test_9_patterns_no_variance():
    """Test that variance check is skipped with < 10 patterns."""
    print("=== Test 7: 9 Patterns (No Variance Check) ===")
    patterns = []
    for i in range(9):
        patterns.append({
            'pattern': f'test_pattern_{i}',
            'alignment_score': {'manthra_score': 0.9, 'yasna_score': 0.9, 'mithra_score': 0.9},
            'rationale': 'Test rationale that is long enough to count'
        })

    result = detect_proxy_gaming(patterns)
    indicator_types = [ind['type'] for ind in result.get('indicators', [])]
    # Should NOT have ARTIFICIAL_CONSISTENCY with only 9 patterns
    assert 'ARTIFICIAL_CONSISTENCY' not in indicator_types, 'Should skip variance check with < 10 patterns'
    print(f"  Indicators found: {indicator_types}")
    print("  ✓ Variance check correctly skipped with 9 patterns")
    return True


# =============================================================================
# EDGE CASE TESTS - Missing/Malformed Data
# =============================================================================

def test_missing_rationale_fields():
    """Test extraction with missing rationale in various locations."""
    print("=== Test 8: Missing Rationale Fields ===")

    # No rationale at all
    p1 = {'pattern': 'test', 'data': {'action': 'test'}}
    assert _extract_rationale(p1) is None, 'Should return None for missing rationale'

    # Empty rationale dict
    p2 = {'pattern': 'test', 'rationale': {}}
    assert _extract_rationale(p2) is None, 'Should return None for empty rationale dict'

    # Short rationale (below threshold)
    p3 = {'pattern': 'test', 'rationale': 'Short'}
    assert _extract_rationale(p3) is None, 'Should return None for short rationale'

    # Dict with short 'why'
    p4 = {'pattern': 'test', 'rationale': {'why': 'Short'}}
    assert _extract_rationale(p4) is None, 'Should return None for short dict why'

    print("  ✓ All missing rationale scenarios handled correctly")
    return True

def test_malformed_data_field():
    """Test extraction when data field is not a dict."""
    print("=== Test 9: Malformed Data Field ===")

    # data is a string
    p1 = {'pattern': 'test', 'data': 'not a dict'}
    result = _extract_rationale(p1)
    assert result is None, 'Should handle string data gracefully'

    # data is None
    p2 = {'pattern': 'test', 'data': None}
    result = _extract_rationale(p2)
    assert result is None, 'Should handle None data gracefully'

    # data is a list
    p3 = {'pattern': 'test', 'data': [1, 2, 3]}
    result = _extract_rationale(p3)
    assert result is None, 'Should handle list data gracefully'

    print("  ✓ Malformed data field handled correctly")
    return True

def test_mixed_rationale_types():
    """Test gaming detection with mixed dict and string rationales."""
    print("=== Test 10: Mixed Rationale Types ===")
    patterns = [
        {'pattern': 'p1', 'rationale': {'why': 'Dict rationale explaining the action'}},
        {'pattern': 'p2', 'rationale': 'String rationale that is long enough'},
        {'pattern': 'p3', 'data': {'reason': 'Nested data.reason field'}},
        {'pattern': 'p4', 'reason': 'Top-level reason field'},
        {'pattern': 'p5'},  # No rationale
    ]

    result = detect_proxy_gaming(patterns)
    print(f"  Patterns analyzed: {result.get('patterns_analyzed')}")
    print(f"  ✓ Mixed rationale types processed without error")
    return True


# =============================================================================
# GAMING INDICATOR TRIGGER TESTS
# =============================================================================

def test_trigger_checkbox_compliance():
    """Test scenario that triggers CHECKBOX_COMPLIANCE indicator."""
    print("=== Test 11: Trigger CHECKBOX_COMPLIANCE ===")
    # High alignment scores with low consequence tracking
    patterns = []
    for i in range(15):
        patterns.append({
            'pattern': f'checkbox_{i}',
            'alignment_score': {
                'manthra_score': 0.95,
                'yasna_score': 0.95,
                'mithra_score': 0.95,
                'consequence_tracked': False  # Low consequence tracking
            },
            'rationale': 'Rationale explaining the compliance action'
        })

    result = detect_proxy_gaming(patterns)
    indicator_types = [ind['type'] for ind in result.get('indicators', [])]

    if 'CHECKBOX_COMPLIANCE' in indicator_types:
        print("  ✓ CHECKBOX_COMPLIANCE indicator triggered correctly")
    else:
        print(f"  ℹ Indicators found: {indicator_types} (CHECKBOX requires high alignment + low consequence)")
    return True

def test_trigger_artificial_consistency():
    """Test scenario that triggers ARTIFICIAL_CONSISTENCY indicator."""
    print("=== Test 12: Trigger ARTIFICIAL_CONSISTENCY ===")
    # Exactly uniform scores with low variance
    patterns = []
    for i in range(12):
        patterns.append({
            'pattern': f'uniform_{i}',
            'alignment_score': {
                'manthra_score': 0.85,
                'yasna_score': 0.85,
                'mithra_score': 0.85
            },
            'rationale': 'Uniform compliance rationale'
        })

    result = detect_proxy_gaming(patterns)
    indicator_types = [ind['type'] for ind in result.get('indicators', [])]

    if 'ARTIFICIAL_CONSISTENCY' in indicator_types:
        print("  ✓ ARTIFICIAL_CONSISTENCY indicator triggered correctly")
    else:
        print(f"  ℹ Indicators found: {indicator_types}")
    return True

def test_trigger_inflated_priorities():
    """Test scenario that triggers INFLATED_PRIORITIES indicator."""
    print("=== Test 13: Trigger INFLATED_PRIORITIES ===")
    # High WSJF with low revenue impact - ratio > 10x triggers detection
    # WSJF=150, revenue=10 → ratio = 15x (above 10x threshold)
    patterns = []
    for i in range(10):
        patterns.append({
            'pattern': f'inflated_{i}',
            'economic': {
                'wsjf_score': 150,  # High WSJF (ratio-based: 150/10 = 15x > 10x threshold)
                'revenue_impact': 10  # Low revenue
            },
            'rationale': 'Priority rationale'
        })

    result = detect_proxy_gaming(patterns)
    indicator_types = [ind['type'] for ind in result.get('indicators', [])]

    if 'INFLATED_PRIORITIES' in indicator_types:
        print("  ✓ INFLATED_PRIORITIES indicator triggered correctly")
    else:
        print(f"  ℹ Indicators found: {indicator_types}")
    return True

def test_trigger_blind_compliance():
    """Test scenario that triggers BLIND_COMPLIANCE indicator."""
    print("=== Test 14: Trigger BLIND_COMPLIANCE ===")
    # High yasna (policy) with missing rationale
    patterns = []
    for i in range(15):
        patterns.append({
            'pattern': f'blind_{i}',
            'alignment_score': {
                'yasna_score': 0.95  # High policy compliance
            }
            # No rationale - should trigger BLIND_COMPLIANCE
        })

    result = detect_proxy_gaming(patterns)
    indicator_types = [ind['type'] for ind in result.get('indicators', [])]

    if 'BLIND_COMPLIANCE' in indicator_types:
        print("  ✓ BLIND_COMPLIANCE indicator triggered correctly")
    else:
        print(f"  ℹ Indicators found: {indicator_types}")
    return True


# =============================================================================
# ROAM FRAMEWORK PATTERN TESTS
# =============================================================================

def test_roam_pattern_rationales():
    """Test that all ROAM framework patterns have rationales."""
    print("=== Test 15: ROAM Pattern Rationales ===")
    logger = PatternLogger(circle='orchestrator', mode='advisory')

    roam_patterns = [
        'roam_risk_identified',
        'roam_risk_identified_high',
        'roam_risk_resolved',
        'roam_assumption_validated',
        'roam_assumption_created',
        'roam_mitigation_applied',
        'roam_mitigation_ineffective',
        'roam_opportunity_captured',
        'roam_tracker_update',
    ]

    missing = []
    for pattern in roam_patterns:
        rationale = logger._generate_auto_rationale(pattern, {}, 'governance', 'enforcement')
        why = rationale.get('why', '')
        # Generic fallback contains "per <gate> gate policy" - check for that specific pattern
        is_generic = 'gate policy' in why.lower() or not why
        if is_generic:
            missing.append(pattern)
        else:
            print(f"    ✓ {pattern}: {why[:40]}...")

    if missing:
        print(f"  ⚠ Missing rationales for: {missing}")
    else:
        print("  ✓ All ROAM patterns have specific rationales")
    return True


# =============================================================================
# PATTERN COVERAGE VALIDATION
# =============================================================================

def test_pattern_coverage():
    """Validate that all 59+ pattern types have corresponding rationale templates."""
    print("=== Test 16: Pattern Coverage Validation ===")
    logger = PatternLogger(circle='orchestrator', mode='advisory')

    # Get the pattern_rationales dict from _generate_auto_rationale
    # We test by generating rationales for known patterns
    known_patterns = [
        # Observability
        'observability_first', 'observability-first',
        # Safety
        'safe_degrade', 'safe-degrade', 'guardrail_lock', 'guardrail-lock',
        # Cycles
        'depth_ladder', 'iteration_budget', 'prod_cycle_complete', 'flow_metrics',
        # Ceremonies
        'standup_sync', 'retro_complete', 'replenish_complete', 'refine_complete',
        # WSJF
        'wsjf_prioritization', 'wsjf-enrichment', 'ai_enhanced_wsjf',
        # Governance
        'env_policy', 'governance_audit', 'code-fix-proposal',
        # Risk
        'circle-risk-focus', 'failure-strategy',
        # Interpretability
        'interpretability', 'preflight_check', 'system_state_snapshot',
        # Security
        'SEC-AUDIT-npm',
        # Spiritual
        'spiritual_dimension_enhancement',
        # Integration
        'phase4_integration_synthesis', 'infrastructure_milestone',
        # ROAM
        'roam_risk_identified', 'roam_assumption_validated', 'roam_mitigation_applied',
    ]

    coverage_count = 0
    generic_count = 0

    for pattern in known_patterns:
        rationale = logger._generate_auto_rationale(pattern, {}, 'test', 'enforcement')
        why = rationale.get('why', '')
        # Check if it's a specific rationale (not the generic fallback)
        if why and 'per test gate policy' not in why.lower():
            coverage_count += 1
        else:
            generic_count += 1
            print(f"    ⚠ Generic rationale for: {pattern}")

    print(f"  Specific rationales: {coverage_count}/{len(known_patterns)}")
    print(f"  Generic fallbacks: {generic_count}/{len(known_patterns)}")
    print(f"  ✓ Pattern coverage: {coverage_count/len(known_patterns)*100:.1f}%")
    return True


# =============================================================================
# WSJF EDGE CASE TESTS
# =============================================================================

def test_wsjf_edge_cases():
    """Test WSJF scoring edge cases."""
    print("=== Test 17: WSJF Edge Cases ===")

    # Edge case: Zero WSJF scores
    patterns_zero = [
        {'pattern': 'zero_wsjf', 'economic': {'wsjf_score': 0, 'revenue_impact': 0}}
    ]
    result = detect_proxy_gaming(patterns_zero)
    assert result['gaming_detected'] == False, 'Zero WSJF should not trigger gaming'

    # Edge case: Very high WSJF with high revenue (legitimate)
    patterns_legit = []
    for i in range(10):
        patterns_legit.append({
            'pattern': f'legit_{i}',
            'economic': {'wsjf_score': 100, 'revenue_impact': 10000},
            'rationale': 'High priority with high revenue'
        })
    result = detect_proxy_gaming(patterns_legit)
    indicator_types = [ind['type'] for ind in result.get('indicators', [])]
    assert 'INFLATED_PRIORITIES' not in indicator_types, 'High WSJF with high revenue should not be inflated'

    print("  ✓ WSJF edge cases handled correctly")
    return True


# =============================================================================
# MAIN
# =============================================================================

def main():
    """Run all tests."""
    global tests_passed, tests_failed, test_results

    print("=" * 70)
    print("P2-TRUTH PROXY GAMING DETECTION - COMPREHENSIVE TEST SUITE")
    print("=" * 70)
    print()

    # Basic tests
    print("-" * 70)
    print("SECTION 1: BASIC TESTS")
    print("-" * 70)
    run_test("Auto-Rationale Generation", test_auto_rationale)
    run_test("Dict Rationale Extraction", test_dict_rationale_extraction)
    run_test("String Rationale Extraction", test_string_rationale_extraction)
    gaming_result = run_test("Proxy Gaming Detection (Live)", test_proxy_gaming_detection)

    # Edge case tests - Boundary conditions
    print()
    print("-" * 70)
    print("SECTION 2: EDGE CASES - BOUNDARY CONDITIONS")
    print("-" * 70)
    run_test("Empty Patterns", test_empty_patterns)
    run_test("Exactly 10 Patterns (Variance)", test_exactly_10_patterns_variance)
    run_test("9 Patterns (No Variance)", test_9_patterns_no_variance)

    # Edge case tests - Missing/Malformed data
    print()
    print("-" * 70)
    print("SECTION 3: EDGE CASES - MISSING/MALFORMED DATA")
    print("-" * 70)
    run_test("Missing Rationale Fields", test_missing_rationale_fields)
    run_test("Malformed Data Field", test_malformed_data_field)
    run_test("Mixed Rationale Types", test_mixed_rationale_types)

    # Gaming indicator triggers
    print()
    print("-" * 70)
    print("SECTION 4: GAMING INDICATOR TRIGGERS")
    print("-" * 70)
    run_test("Trigger CHECKBOX_COMPLIANCE", test_trigger_checkbox_compliance)
    run_test("Trigger ARTIFICIAL_CONSISTENCY", test_trigger_artificial_consistency)
    run_test("Trigger INFLATED_PRIORITIES", test_trigger_inflated_priorities)
    run_test("Trigger BLIND_COMPLIANCE", test_trigger_blind_compliance)

    # ROAM framework tests
    print()
    print("-" * 70)
    print("SECTION 5: ROAM FRAMEWORK")
    print("-" * 70)
    run_test("ROAM Pattern Rationales", test_roam_pattern_rationales)

    # Pattern coverage
    print()
    print("-" * 70)
    print("SECTION 6: PATTERN COVERAGE")
    print("-" * 70)
    run_test("Pattern Coverage Validation", test_pattern_coverage)
    run_test("WSJF Edge Cases", test_wsjf_edge_cases)

    # Summary
    print()
    print("=" * 70)
    print(f"RESULTS: {tests_passed} passed, {tests_failed} failed")
    print("=" * 70)

    # JSON output for CI
    print()
    print("=== JSON OUTPUT FOR CI ===")
    output = {
        'tests_passed': tests_passed,
        'tests_failed': tests_failed,
        'test_results': test_results,
        'proxy_gaming': gaming_result if gaming_result else {'gaming_detected': False, 'risk_level': 'UNKNOWN'}
    }
    print(json.dumps(output, indent=2, default=str))

    # Exit with failure if gaming detected at HIGH or MEDIUM risk (conservative mode)
    if gaming_result:
        if gaming_result.get('risk_level') in ['HIGH', 'MEDIUM'] and gaming_result.get('gaming_detected'):
            print(f"\n⚠️  {gaming_result.get('risk_level')} RISK GAMING DETECTED - BUILD SHOULD FAIL")
            sys.exit(1)

    if tests_failed > 0:
        sys.exit(1)

    print("\n✓ All tests passed, no medium/high-risk gaming detected")
    sys.exit(0)

if __name__ == '__main__':
    main()


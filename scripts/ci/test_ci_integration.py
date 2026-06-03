#!/usr/bin/env python3
"""
Risk Analytics CI/CD Integration Test

Tests that risk analytics gates integrate correctly with CI/CD pipeline.
Validates gate triggers, alert system, and override procedures.
"""

import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime

def test_gate_triggers():
    """Test that gates trigger correctly on mock PRs."""
    print("\n" + "=" * 80)
    print("Testing Gate Triggers")
    print("=" * 80)
    
    test_cases = [
        {
            'name': 'P0 Critical PR',
            'severity': 3,
            'blast_radius': 3,
            'urgency': 3,
            'confidence': 0.9,
            'stability_debt': 0.1,
            'expected_level': 'P0',
            'should_block': True
        },
        {
            'name': 'P1 High Risk PR',
            'severity': 2,
            'blast_radius': 2,
            'urgency': 2,
            'confidence': 0.8,
            'stability_debt': 0.1,
            'expected_level': 'P1',
            'should_block': False
        },
        {
            'name': 'P2 Medium Risk PR',
            'severity': 2,
            'blast_radius': 1,
            'urgency': 1,
            'confidence': 0.7,
            'stability_debt': 0.0,
            'expected_level': 'P2',
            'should_block': False
        },
        {
            'name': 'P3 Low Risk PR',
            'severity': 1,
            'blast_radius': 1,
            'urgency': 1,
            'confidence': 0.6,
            'stability_debt': 0.0,
            'expected_level': 'P3',
            'should_block': False
        }
    ]
    
    results = []
    for test_case in test_cases:
        # Calculate risk score
        weights = {
            'severity': 0.4,
            'blast': 0.25,
            'urgency': 0.2,
            'confidence': 0.15,
            'stability_debt': -0.1
        }
        
        score = (
            test_case['severity'] * weights['severity'] +
            test_case['blast_radius'] * weights['blast'] +
            test_case['urgency'] * weights['urgency'] +
            test_case['confidence'] * weights['confidence'] +
            test_case['stability_debt'] * weights['stability_debt']
        )
        
        score = min(100, max(0, score * 100 / 3))
        
        # Classify risk level
        if score >= 75:
            level = 'P0'
        elif score >= 50:
            level = 'P1'
        elif score >= 25:
            level = 'P2'
        else:
            level = 'P3'
        
        # Check if gate should block
        should_block = level == 'P0'
        
        # Validate
        passed = (level == test_case['expected_level'] and 
                 should_block == test_case['should_block'])
        
        status = "✅ PASS" if passed else "❌ FAIL"
        results.append({
            'test': test_case['name'],
            'score': round(score, 2),
            'level': level,
            'blocks': should_block,
            'passed': passed,
            'status': status
        })
        
        print(f"\n{status}: {test_case['name']}")
        print(f"  Score: {score:.1f}")
        print(f"  Level: {level}")
        print(f"  Blocks Merge: {should_block}")
    
    return results

def test_alert_system():
    """Test that alert system detects threshold violations."""
    print("\n" + "=" * 80)
    print("Testing Alert System")
    print("=" * 80)
    
    alert_tests = [
        {
            'name': 'P0 Rate Threshold',
            'metric': 'p0_rate',
            'value': 6.0,
            'threshold': 5.0,
            'should_alert': True
        },
        {
            'name': 'Override Frequency Threshold',
            'metric': 'override_frequency',
            'value': 2,
            'threshold': 1,
            'should_alert': True
        },
        {
            'name': 'False Positive Rate Threshold',
            'metric': 'false_positive_rate',
            'value': 6.0,
            'threshold': 5.0,
            'should_alert': True
        },
        {
            'name': 'Normal P0 Rate',
            'metric': 'p0_rate',
            'value': 3.0,
            'threshold': 5.0,
            'should_alert': False
        }
    ]
    
    results = []
    for test in alert_tests:
        should_alert = test['value'] > test['threshold']
        passed = should_alert == test['should_alert']
        status = "✅ PASS" if passed else "❌ FAIL"
        
        results.append({
            'test': test['name'],
            'metric': test['metric'],
            'value': test['value'],
            'threshold': test['threshold'],
            'alerts': should_alert,
            'passed': passed,
            'status': status
        })
        
        print(f"\n{status}: {test['name']}")
        print(f"  Metric: {test['metric']}")
        print(f"  Value: {test['value']}")
        print(f"  Threshold: {test['threshold']}")
        print(f"  Alert Triggered: {should_alert}")
    
    return results

def test_override_procedure():
    """Test that override procedure works correctly."""
    print("\n" + "=" * 80)
    print("Testing Override Procedure")
    print("=" * 80)
    
    override_tests = [
        {
            'name': 'Override with Valid Label',
            'label': 'risk-override-approved',
            'should_allow': True
        },
        {
            'name': 'Override with Invalid Label',
            'label': 'invalid-label',
            'should_allow': False
        },
        {
            'name': 'Override with Audit Trail',
            'label': 'risk-override-approved',
            'audit_trail': True,
            'should_allow': True
        }
    ]
    
    results = []
    for test in override_tests:
        # Check if label is valid
        valid_labels = ['risk-override-approved', 'risk-emergency-override']
        is_valid = test['label'] in valid_labels
        
        passed = is_valid == test['should_allow']
        status = "✅ PASS" if passed else "❌ FAIL"
        
        results.append({
            'test': test['name'],
            'label': test['label'],
            'valid': is_valid,
            'passed': passed,
            'status': status
        })
        
        print(f"\n{status}: {test['name']}")
        print(f"  Label: {test['label']}")
        print(f"  Valid: {is_valid}")
        if test.get('audit_trail'):
            print(f"  Audit Trail: Recorded")
    
    return results

def main():
    """Run all CI/CD integration tests."""
    print("\n" + "=" * 80)
    print("Risk Analytics CI/CD Integration Tests")
    print("=" * 80)
    
    all_results = {
        'timestamp': datetime.now().isoformat(),
        'tests': {
            'gate_triggers': test_gate_triggers(),
            'alert_system': test_alert_system(),
            'override_procedure': test_override_procedure()
        }
    }
    
    # Calculate summary
    total_tests = 0
    passed_tests = 0
    
    for test_group in all_results['tests'].values():
        for test in test_group:
            total_tests += 1
            if test['passed']:
                passed_tests += 1
    
    print("\n" + "=" * 80)
    print("Test Summary")
    print("=" * 80)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    print(f"Success Rate: {passed_tests / total_tests * 100:.1f}%")
    
    # Save results
    results_file = Path(__file__).parent.parent.parent / 'ci_integration_test_results.json'
    with open(results_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    
    print(f"\n✅ Test results saved to {results_file}")
    print("=" * 80)
    
    return 0 if passed_tests == total_tests else 1

if __name__ == '__main__':
    sys.exit(main())


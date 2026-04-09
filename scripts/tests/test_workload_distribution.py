#!/usr/bin/env python3
"""
Test Cycles for Workload Distribution Improvements
Validates telemetry, decision lens metrics, and workload balancer
"""

import json
import os
import subprocess
import sys
from typing import Dict, List, Any
from datetime import datetime

def run_test_cycle(name: str, tests: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Run a test cycle with multiple validation tests."""
    
    print(f"\n=== Running Test Cycle: {name} ===")
    results = {
        'cycle_name': name,
        'timestamp': datetime.now().isoformat(),
        'tests': [],
        'passed': 0,
        'failed': 0,
        'overall_status': 'UNKNOWN'
    }
    
    for test in tests:
        test_name = test['name']
        test_type = test['type']
        
        print(f"\n  Test: {test_name}")
        
        try:
            if test_type == 'command':
                # Run command test
                cmd = test['command']
                expected = test.get('expected')
                
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                
                if expected:
                    if expected in result.stdout:
                        print(f"    ✓ PASS: Found expected output '{expected}'")
                        results['tests'].append({
                            'name': test_name,
                            'status': 'PASS',
                            'output': result.stdout[:200]
                        })
                        results['passed'] += 1
                    else:
                        print(f"    ✗ FAIL: Expected '{expected}' not found")
                        results['tests'].append({
                            'name': test_name,
                            'status': 'FAIL',
                            'output': result.stdout[:200]
                        })
                        results['failed'] += 1
                else:
                    # Just check exit code
                    if result.returncode == 0:
                        print(f"    ✓ PASS: Command succeeded")
                        results['tests'].append({
                            'name': test_name,
                            'status': 'PASS'
                        })
                        results['passed'] += 1
                    else:
                        print(f"    ✗ FAIL: Command failed with exit code {result.returncode}")
                        results['tests'].append({
                            'name': test_name,
                            'status': 'FAIL',
                            'error': result.stderr[:200]
                        })
                        results['failed'] += 1
                        
            elif test_type == 'python':
                # Run Python function test
                module = test['module']
                function = test['function']
                args = test.get('args', [])
                
                # Import and run function
                sys.path.insert(0, 'scripts')
                try:
                    mod = __import__(module)
                    func = getattr(mod, function)
                    
                    if args:
                        result = func(*args)
                    else:
                        result = func()
                    
                    # Validate result
                    validation = test.get('validation', {})
                    passed = True
                    
                    for key, expected in validation.items():
                        if key in result:
                            if callable(expected):
                                # Lambda validation
                                if not expected(result[key]):
                                    print(f"    ✗ FAIL: {key} validation failed")
                                    passed = False
                            else:
                                # Exact match validation
                                if result[key] != expected:
                                    print(f"    ✗ FAIL: {key} expected {expected}, got {result[key]}")
                                    passed = False
                    
                    if passed:
                        print(f"    ✓ PASS: All validations passed")
                        results['tests'].append({
                            'name': test_name,
                            'status': 'PASS',
                            'result': result
                        })
                        results['passed'] += 1
                    else:
                        results['tests'].append({
                            'name': test_name,
                            'status': 'FAIL',
                            'result': result
                        })
                        results['failed'] += 1
                        
                except Exception as e:
                    print(f"    ✗ FAIL: Exception - {str(e)}")
                    results['tests'].append({
                        'name': test_name,
                        'status': 'FAIL',
                        'error': str(e)
                    })
                    results['failed'] += 1
                    
        except Exception as e:
            print(f"    ✗ FAIL: Test execution error - {str(e)}")
            results['tests'].append({
                'name': test_name,
                'status': 'FAIL',
                'error': str(e)
            })
            results['failed'] += 1
    
    # Calculate overall status
    results['overall_status'] = 'PASS' if results['failed'] == 0 else 'FAIL'
    
    print(f"\n  Results: {results['passed']} passed, {results['failed']} failed")
    print(f"  Overall: {results['overall_status']}")
    
    return results

def main():
    """Run all test cycles for workload distribution improvements."""
    
    print("=" * 60)
    print("WORKLOAD DISTRIBUTION - TEST CYCLES")
    print("=" * 60)
    
    all_results = []
    
    # Cycle 1: Telemetry Fix Validation
    cycle1_tests = [
        {
            'name': 'Check telemetry coverage improved',
            'type': 'command',
            'command': './scripts/af prod-swarm --default-emitters 2>&1 | grep "Telemetry coverage"',
            'expected': 'Telemetry coverage: 66.7%'
        },
        {
            'name': 'Verify circle events are tracked',
            'type': 'command',
            'command': './scripts/af prod-swarm --default-emitters 2>&1 | grep "Events:" | head -5',
            'expected': 'Events:'
        }
    ]
    
    cycle1_result = run_test_cycle("Telemetry Fix Validation", cycle1_tests)
    all_results.append(cycle1_result)
    
    # Cycle 2: Decision Lens Metrics
    cycle2_tests = [
        {
            'name': 'Analyze workload distribution',
            'type': 'python',
            'module': 'decision_lens_metrics',
            'function': 'analyze_workload_distribution',
            'args': ['.goalie/pattern_metrics.jsonl'],
            'validation': {
                'total_events': lambda x: x > 6000,  # Should be > 6000
                'misclassification_rate': lambda x: 10 < x < 20  # Should be between 10-20%
            }
        },
        {
            'name': 'Check workload imbalance detected',
            'type': 'python',
            'module': 'decision_lens_metrics',
            'function': 'analyze_workload_distribution',
            'args': ['.goalie/pattern_metrics.jsonl'],
            'validation': {
                'recommendations': lambda x: len(x) > 0 and any(r['type'] == 'workload_imbalance' for r in x)
            }
        }
    ]
    
    cycle2_result = run_test_cycle("Decision Lens Metrics", cycle2_tests)
    all_results.append(cycle2_result)
    
    # Cycle 3: Workload Balancer
    cycle3_tests = [
        {
            'name': 'Generate redistribution plan',
            'type': 'command',
            'command': 'python3 scripts/workload_balancer.py | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Patterns to move: {data[\"plan\"][\"total_patterns_to_move\"]}\")"',
            'expected': 'Patterns to move: 200'
        },
        {
            'name': 'Verify balance script created',
            'type': 'command',
            'command': 'ls -la scripts/balance_workload.sh',
            'expected': 'balance_workload.sh'
        }
    ]
    
    cycle3_result = run_test_cycle("Workload Balancer", cycle3_tests)
    all_results.append(cycle3_result)
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST CYCLES SUMMARY")
    print("=" * 60)
    
    total_passed = sum(r['passed'] for r in all_results)
    total_failed = sum(r['failed'] for r in all_results)
    
    for result in all_results:
        status_icon = "✓" if result['overall_status'] == 'PASS' else "✗"
        print(f"{status_icon} {result['cycle_name']}: {result['passed']} passed, {result['failed']} failed")
    
    print(f"\nOverall: {total_passed} passed, {total_failed} failed")
    
    if total_failed == 0:
        print("\n✓ ALL TEST CYCLES PASSED")
        print("Workload distribution improvements are ready for production.")
    else:
        print(f"\n✗ {total_failed} TESTS FAILED")
        print("Review failed tests before proceeding.")
    
    # Save results
    results_file = ".goalie/workload_distribution_test_results.json"
    with open(results_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    
    print(f"\nDetailed results saved to: {results_file}")

if __name__ == "__main__":
    main()

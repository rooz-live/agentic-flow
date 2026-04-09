#!/usr/bin/env python3
"""
Test Runner Framework

Comprehensive test runner for unit, integration, and end-to-end tests.
"""

import os
import sys
import json
import time
import logging
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

class TestRunner:
    """Comprehensive test runner"""

    def __init__(self, config_path: Optional[str] = None):
        self.project_root = Path(__file__).parent.parent.parent
        self.config = self._load_config(config_path)
        self.logger = logging.getLogger(__name__)
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'tests': {},
            'summary': {}
        }

    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load test configuration"""
        if config_path:
            config_file = Path(config_path)
        else:
            config_file = self.project_root / '.goalie' / 'validation_config.json'

        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    return json.load(f)
            except Exception:
                pass

        return {
            'testing': {
                'timeout_seconds': 300,
                'parallel_execution': False,
                'fail_fast': False
            }
        }

    def run_unit_tests(self) -> Dict[str, Any]:
        """Run unit tests"""
        self.logger.info("Running unit tests")

        results = {
            'status': 'unknown',
            'tests_run': 0,
            'passed': 0,
            'failed': 0,
            'errors': []
        }

        try:
            # Run TypeScript/Jest tests for agentic-flow-core
            core_dir = self.project_root / 'agentic-flow-core'
            if core_dir.exists():
                self.logger.info("Running TypeScript unit tests")
                result = subprocess.run(
                    ['npm', 'test'],
                    cwd=core_dir,
                    capture_output=True,
                    text=True,
                    timeout=self.config.get('testing', {}).get('timeout_seconds', 300)
                )

                results['tests_run'] += 1
                if result.returncode == 0:
                    results['passed'] += 1
                    results['status'] = 'passed'
                else:
                    results['failed'] += 1
                    results['errors'].append(f'TypeScript tests failed: {result.stderr}')
                    results['status'] = 'failed'

            # Run Python unit tests
            python_test_dirs = [
                self.project_root / 'tests',
                self.project_root / 'scripts' / 'testing'
            ]

            for test_dir in python_test_dirs:
                if test_dir.exists():
                    self.logger.info(f"Running Python tests in {test_dir}")
                    result = subprocess.run(
                        [sys.executable, '-m', 'pytest', str(test_dir), '-v'],
                        capture_output=True,
                        text=True,
                        timeout=self.config.get('testing', {}).get('timeout_seconds', 300)
                    )

                    results['tests_run'] += 1
                    if result.returncode == 0:
                        results['passed'] += 1
                    else:
                        results['failed'] += 1
                        results['errors'].append(f'Python tests failed: {result.stderr}')

            if results['failed'] == 0:
                results['status'] = 'passed'
            else:
                results['status'] = 'failed'

        except subprocess.TimeoutExpired:
            results['errors'].append('Unit tests timed out')
            results['status'] = 'failed'
        except Exception as e:
            results['errors'].append(f'Unit test execution error: {str(e)}')
            results['status'] = 'failed'

        return results

    def run_integration_tests(self) -> Dict[str, Any]:
        """Run integration tests"""
        self.logger.info("Running integration tests")

        results = {
            'status': 'unknown',
            'tests_run': 0,
            'passed': 0,
            'failed': 0,
            'errors': []
        }

        try:
            # Run integration test script
            integration_script = self.project_root / 'scripts' / 'testing' / 'integration_tests.py'
            if integration_script.exists():
                self.logger.info("Running integration test script")
                result = subprocess.run(
                    [sys.executable, str(integration_script)],
                    capture_output=True,
                    text=True,
                    timeout=self.config.get('testing', {}).get('timeout_seconds', 300)
                )

                results['tests_run'] += 1
                if result.returncode == 0:
                    results['passed'] += 1
                    results['status'] = 'passed'
                else:
                    results['failed'] += 1
                    results['errors'].append(f'Integration tests failed: {result.stderr}')
                    results['status'] = 'failed'
            else:
                results['errors'].append('Integration test script not found')
                results['status'] = 'failed'

        except subprocess.TimeoutExpired:
            results['errors'].append('Integration tests timed out')
            results['status'] = 'failed'
        except Exception as e:
            results['errors'].append(f'Integration test execution error: {str(e)}')
            results['status'] = 'failed'

        return results

    def run_e2e_tests(self) -> Dict[str, Any]:
        """Run end-to-end tests"""
        self.logger.info("Running end-to-end tests")

        results = {
            'status': 'unknown',
            'tests_run': 0,
            'passed': 0,
            'failed': 0,
            'errors': []
        }

        try:
            # Run E2E test script
            e2e_script = self.project_root / 'scripts' / 'testing' / 'e2e_tests.py'
            if e2e_script.exists():
                self.logger.info("Running E2E test script")
                result = subprocess.run(
                    [sys.executable, str(e2e_script)],
                    capture_output=True,
                    text=True,
                    timeout=self.config.get('testing', {}).get('timeout_seconds', 600)  # Longer timeout for E2E
                )

                results['tests_run'] += 1
                if result.returncode == 0:
                    results['passed'] += 1
                    results['status'] = 'passed'
                else:
                    results['failed'] += 1
                    results['errors'].append(f'E2E tests failed: {result.stderr}')
                    results['status'] = 'failed'
            else:
                results['errors'].append('E2E test script not found')
                results['status'] = 'failed'

        except subprocess.TimeoutExpired:
            results['errors'].append('E2E tests timed out')
            results['status'] = 'failed'
        except Exception as e:
            results['errors'].append(f'E2E test execution error: {str(e)}')
            results['status'] = 'failed'

        return results

    def run_performance_tests(self) -> Dict[str, Any]:
        """Run performance tests"""
        self.logger.info("Running performance tests")

        results = {
            'status': 'unknown',
            'metrics': {},
            'errors': []
        }

        try:
            # Import and run performance validator
            from scripts.validation.performance_validator import PerformanceValidator

            validator = PerformanceValidator()
            perf_results = validator.run_validation()

            results['metrics'] = perf_results
            results['status'] = perf_results.get('overall_status', 'unknown')

        except Exception as e:
            results['errors'].append(f'Performance test execution error: {str(e)}')
            results['status'] = 'failed'

        return results

    def run_security_tests(self) -> Dict[str, Any]:
        """Run security tests"""
        self.logger.info("Running security tests")

        results = {
            'status': 'unknown',
            'issues': {},
            'errors': []
        }

        try:
            # Import and run security validator
            from scripts.validation.security_validator import SecurityValidator

            validator = SecurityValidator()
            sec_results = validator.run_validation()

            results['issues'] = sec_results
            results['status'] = sec_results.get('overall_status', 'unknown')

        except Exception as e:
            results['errors'].append(f'Security test execution error: {str(e)}')
            results['status'] = 'failed'

        return results

    def run_all_tests(self, test_types: Optional[List[str]] = None) -> Dict[str, Any]:
        """Run all specified test types"""
        if test_types is None:
            test_types = ['unit', 'integration', 'e2e', 'performance', 'security']

        self.logger.info(f"Running test types: {test_types}")

        test_functions = {
            'unit': self.run_unit_tests,
            'integration': self.run_integration_tests,
            'e2e': self.run_e2e_tests,
            'performance': self.run_performance_tests,
            'security': self.run_security_tests
        }

        for test_type in test_types:
            if test_type in test_functions:
                self.logger.info(f"Starting {test_type} tests")
                start_time = time.time()
                test_result = test_functions[test_type]()
                end_time = time.time()

                test_result['duration_seconds'] = end_time - start_time
                self.results['tests'][test_type] = test_result

        # Calculate summary
        total_tests = 0
        total_passed = 0
        total_failed = 0

        for test_type, result in self.results['tests'].items():
            if test_type in ['unit', 'integration', 'e2e']:
                total_tests += result.get('tests_run', 0)
                total_passed += result.get('passed', 0)
                total_failed += result.get('failed', 0)
            else:
                # For performance and security, count as single test
                total_tests += 1
                if result.get('status') == 'passed':
                    total_passed += 1
                else:
                    total_failed += 1

        self.results['summary'] = {
            'total_tests': total_tests,
            'passed': total_passed,
            'failed': total_failed,
            'success_rate': (total_passed / total_tests * 100) if total_tests > 0 else 0
        }

        return self.results

    def emit_test_evidence(self) -> None:
        """Emit test results to evidence system"""
        try:
            evidence_file = self.project_root / '.goalie' / 'test_results.jsonl'
            with open(evidence_file, 'a') as f:
                evidence = {
                    'timestamp': self.results['timestamp'],
                    'test_run': self.results
                }
                f.write(json.dumps(evidence) + '\n')
        except Exception as e:
            self.logger.error(f"Failed to emit test evidence: {e}")

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Test Runner Framework')
    parser.add_argument('--types', nargs='+',
                       choices=['unit', 'integration', 'e2e', 'performance', 'security'],
                       help='Test types to run')
    parser.add_argument('--config', help='Path to test config file')
    parser.add_argument('--output', help='Output file for results')
    parser.add_argument('--json', action='store_true', help='Output in JSON format')

    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    runner = TestRunner(args.config)
    results = runner.run_all_tests(args.types)
    runner.emit_test_evidence()

    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
    elif args.json:
        print(json.dumps(results, indent=2))
    else:
        summary = results.get('summary', {})
        print("Test Results Summary:")
        print(f"  Total Tests: {summary.get('total_tests', 0)}")
        print(f"  Passed: {summary.get('passed', 0)}")
        print(f"  Failed: {summary.get('failed', 0)}")
        print(".1f")

        for test_type, result in results.get('tests', {}).items():
            print(f"\n{test_type.upper()} Tests: {result.get('status', 'unknown').upper()}")
            if test_type in ['unit', 'integration', 'e2e']:
                print(f"  Tests Run: {result.get('tests_run', 0)}")
                print(f"  Passed: {result.get('passed', 0)}")
                print(f"  Failed: {result.get('failed', 0)}")
            if result.get('errors'):
                print("  Errors:")
                for error in result['errors']:
                    print(f"    {error}")

if __name__ == '__main__':
    main()
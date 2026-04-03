#!/usr/bin/env python3
"""
Performance Validator

Validates system performance metrics and thresholds.
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scripts.validation.base_validator import BaseValidator

class PerformanceValidator(BaseValidator):
    """Validates system performance"""

    def __init__(self, config_path: Optional[str] = None):
        super().__init__(config_path)
        self.logger = logging.getLogger(__name__)

    def validate_response_times(self) -> Dict[str, Any]:
        """Validate system response times"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'response_times': {},
            'errors': []
        }

        try:
            # Check performance metrics file
            perf_file = Path(self.project_root) / '.goalie' / 'performance_metrics.jsonl'
            if perf_file.exists():
                with open(perf_file, 'r') as f:
                    lines = f.readlines()
                    total_time = 0
                    count = 0
                    for line in lines[-100:]:  # Last 100 entries
                        if line.strip():
                            try:
                                data = json.loads(line.strip())
                                if 'duration_ms' in data:
                                    total_time += data['duration_ms']
                                    count += 1
                            except json.JSONDecodeError:
                                continue

                    if count > 0:
                        avg_time = total_time / count
                        results['response_times']['average_ms'] = avg_time
                        # Threshold: 1000ms average
                        if avg_time > 1000:
                            results['errors'].append(f'Average response time too high: {avg_time:.2f}ms')
                        else:
                            results['status'] = 'passed'
                    else:
                        results['status'] = 'warning'
                        results['errors'].append('No performance metrics found')
            else:
                results['status'] = 'warning'
                results['errors'].append('Performance metrics file not found')

        except Exception as e:
            results['errors'].append(f'Response time validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_memory_usage(self) -> Dict[str, Any]:
        """Validate memory usage"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'memory': {},
            'errors': []
        }

        try:
            import psutil
            process = psutil.Process()
            memory_info = process.memory_info()

            memory_mb = memory_info.rss / 1024 / 1024
            results['memory']['current_mb'] = memory_mb

            # Threshold: 500MB
            if memory_mb > 500:
                results['errors'].append(f'Memory usage too high: {memory_mb:.2f}MB')
            else:
                results['status'] = 'passed'

        except ImportError:
            results['status'] = 'warning'
            results['errors'].append('psutil not available for memory checking')
        except Exception as e:
            results['errors'].append(f'Memory validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_cpu_usage(self) -> Dict[str, Any]:
        """Validate CPU usage"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'cpu': {},
            'errors': []
        }

        try:
            import psutil
            cpu_percent = psutil.cpu_percent(interval=1)
            results['cpu']['usage_percent'] = cpu_percent

            # Threshold: 80%
            if cpu_percent > 80:
                results['errors'].append(f'CPU usage too high: {cpu_percent:.1f}%')
            else:
                results['status'] = 'passed'

        except ImportError:
            results['status'] = 'warning'
            results['errors'].append('psutil not available for CPU checking')
        except Exception as e:
            results['errors'].append(f'CPU validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_throughput(self) -> Dict[str, Any]:
        """Validate system throughput"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'throughput': {},
            'errors': []
        }

        try:
            # Check evidence emission rate
            evidence_file = Path(self.project_root) / '.goalie' / 'unified_evidence.jsonl'
            if evidence_file.exists():
                mtime = evidence_file.stat().st_mtime
                now = time.time()
                hours_since_modified = (now - mtime) / 3600

                with open(evidence_file, 'r') as f:
                    lines = f.readlines()

                if hours_since_modified > 0:
                    rate_per_hour = len(lines) / hours_since_modified
                    results['throughput']['evidence_per_hour'] = rate_per_hour

                    # Threshold: at least 1 per hour
                    if rate_per_hour < 1:
                        results['errors'].append(f'Low evidence emission rate: {rate_per_hour:.2f}/hour')
                    else:
                        results['status'] = 'passed'
                else:
                    results['status'] = 'warning'
            else:
                results['status'] = 'warning'
                results['errors'].append('Evidence file not found')

        except Exception as e:
            results['errors'].append(f'Throughput validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def run_validation(self) -> Dict[str, Any]:
        """Run all performance validations"""
        self.logger.info("Starting performance validation")

        results = {
            'timestamp': datetime.now().isoformat(),
            'validator': 'performance',
            'overall_status': 'unknown',
            'validations': {}
        }

        # Run all validations
        validations = {
            'response_times': self.validate_response_times,
            'memory_usage': self.validate_memory_usage,
            'cpu_usage': self.validate_cpu_usage,
            'throughput': self.validate_throughput
        }

        all_passed = True
        for name, validator_func in validations.items():
            self.logger.info(f"Running {name} validation")
            val_result = validator_func()
            results['validations'][name] = val_result

            if val_result['status'] in ['failed']:
                all_passed = False

        results['overall_status'] = 'passed' if all_passed else 'failed'

        self.logger.info(f"Performance validation completed: {results['overall_status']}")
        return results

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Performance Validator')
    parser.add_argument('--config', help='Path to validation config file')
    parser.add_argument('--output', help='Output file for results')
    parser.add_argument('--json', action='store_true', help='Output in JSON format')

    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    validator = PerformanceValidator(args.config)
    results = validator.run_validation()

    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
    elif args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"Performance Validation: {results['overall_status'].upper()}")
        for name, val in results['validations'].items():
            print(f"  {name}: {val['status'].upper()}")
            if val.get('errors'):
                for error in val['errors']:
                    print(f"    ERROR: {error}")

if __name__ == '__main__':
    main()
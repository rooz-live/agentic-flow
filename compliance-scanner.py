#!/usr/bin/env python3
# compliance-scanner.py

import yaml
import subprocess
import json
import sys
from datetime import datetime
from pathlib import Path

class ComplianceScanner:
    def __init__(self, policy_file):
        with open(policy_file) as f:
            self.policy = yaml.safe_load(f)

    def run_check(self, rule):
        """Execute compliance check"""
        try:
            result = subprocess.run(
                rule['check']['script'],
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            return {
                'rule_id': rule['id'],
                'title': rule['title'],
                'severity': rule['severity'],
                'status': 'PASS' if result.returncode == 0 else 'FAIL',
                'output': result.stdout.strip(),
                'error': result.stderr.strip()
            }
        except subprocess.TimeoutExpired:
            return {
                'rule_id': rule['id'],
                'status': 'ERROR',
                'error': 'Check timed out'
            }

    def scan(self):
        """Run all compliance checks"""
        results = []
        for rule in self.policy['spec']['rules']:
            result = self.run_check(rule)
            results.append(result)
        return results

    def generate_report(self, results):
        """Generate compliance report"""
        report = {
            'scan_date': datetime.now().isoformat(),
            'policy': self.policy['metadata']['name'],
            'summary': {
                'total': len(results),
                'passed': len([r for r in results if r['status'] == 'PASS']),
                'failed': len([r for r in results if r['status'] == 'FAIL']),
                'errors': len([r for r in results if r['status'] == 'ERROR'])
            },
            'details': results
        }

        # Save report
        with open('compliance-report.json', 'w') as f:
            json.dump(report, f, indent=2)

        return report

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 compliance-scanner.py <policy-file>")
        sys.exit(1)

    policy_file = sys.argv[1]
    scanner = ComplianceScanner(policy_file)
    results = scanner.scan()
    report = scanner.generate_report(results)

    print(f"Compliance Scan Results:")
    print(f"Total: {report['summary']['total']}")
    print(f"Passed: {report['summary']['passed']}")
    print(f"Failed: {report['summary']['failed']}")
    print(f"Errors: {report['summary']['errors']}")

    # Exit with error if any failures
    if report['summary']['failed'] > 0:
        sys.exit(1)

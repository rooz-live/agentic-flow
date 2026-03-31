#!/usr/bin/env python3
"""
Compliance Scanner for Ubuntu 22.04 CIS Benchmark
Integrates with agentic-flow bounded reasoning framework and ROAM tracker.
"""

import yaml
import subprocess
import json
import sys
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

class ComplianceScanner:
    """CIS Benchmark compliance scanner with ROAM integration."""
    
    def __init__(self, policy_file: str, environment: str = "local"):
        with open(policy_file) as f:
            self.policy = yaml.safe_load(f)
        self.environment = environment
        self.results: List[Dict[str, Any]] = []
        self.goalie_dir = Path(".goalie/compliance")
        self.goalie_dir.mkdir(parents=True, exist_ok=True)
    
    def get_required_score(self) -> int:
        """Get minimum required score for current environment."""
        gates = self.policy.get('spec', {}).get('gates', {})
        env_gate = gates.get(self.environment, {'requiredScore': 80})
        return env_gate.get('requiredScore', 80)
    
    def run_check(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single compliance check."""
        check = rule.get('check', {})
        script = check.get('script', '')
        
        try:
            result = subprocess.run(
                script, shell=True, capture_output=True, text=True, timeout=30
            )
            status = 'PASS' if result.returncode == 0 else 'FAIL'
            return {
                'rule_id': rule['id'],
                'title': rule['title'],
                'severity': rule.get('severity', 'medium'),
                'category': rule.get('category', 'general'),
                'status': status,
                'output': result.stdout[:500] if result.stdout else '',
                'error': result.stderr[:500] if result.stderr else '',
                'timestamp': datetime.utcnow().isoformat()
            }
        except subprocess.TimeoutExpired:
            return {
                'rule_id': rule['id'],
                'title': rule['title'],
                'severity': rule.get('severity', 'medium'),
                'status': 'ERROR',
                'error': 'Check timed out (>30s)',
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                'rule_id': rule['id'],
                'title': rule['title'],
                'status': 'ERROR',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def scan(self) -> List[Dict[str, Any]]:
        """Run all compliance checks."""
        rules = self.policy.get('spec', {}).get('rules', [])
        print(f"[SCAN] Running {len(rules)} compliance checks...")
        
        for i, rule in enumerate(rules, 1):
            print(f"  [{i}/{len(rules)}] {rule['id']}: {rule['title'][:50]}...")
            result = self.run_check(rule)
            self.results.append(result)
            status_icon = "✅" if result['status'] == 'PASS' else "❌" if result['status'] == 'FAIL' else "⚠️"
            print(f"       {status_icon} {result['status']}")
        
        return self.results
    
    def calculate_score(self) -> float:
        """Calculate compliance score as percentage."""
        if not self.results:
            return 0.0
        passed = len([r for r in self.results if r['status'] == 'PASS'])
        total = len([r for r in self.results if r['status'] != 'ERROR'])
        return (passed / total * 100) if total > 0 else 0.0
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive compliance report."""
        score = self.calculate_score()
        required = self.get_required_score()
        
        report = {
            'metadata': {
                'policy': self.policy.get('metadata', {}).get('name', 'unknown'),
                'environment': self.environment,
                'scan_timestamp': datetime.utcnow().isoformat(),
                'scanner_version': '1.0.0'
            },
            'summary': {
                'total_rules': len(self.results),
                'passed': len([r for r in self.results if r['status'] == 'PASS']),
                'failed': len([r for r in self.results if r['status'] == 'FAIL']),
                'errors': len([r for r in self.results if r['status'] == 'ERROR']),
                'score': round(score, 2),
                'required_score': required,
                'gate_passed': score >= required
            },
            'by_severity': {
                'critical': {'passed': 0, 'failed': 0},
                'high': {'passed': 0, 'failed': 0},
                'medium': {'passed': 0, 'failed': 0},
                'low': {'passed': 0, 'failed': 0}
            },
            'details': self.results
        }
        
        # Count by severity
        for r in self.results:
            sev = r.get('severity', 'medium')
            if sev in report['by_severity']:
                if r['status'] == 'PASS':
                    report['by_severity'][sev]['passed'] += 1
                elif r['status'] == 'FAIL':
                    report['by_severity'][sev]['failed'] += 1
        
        # Save to goalie directory
        report_path = self.goalie_dir / f"compliance_report_{self.environment}.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n[REPORT] Saved to {report_path}")
        
        return report


if __name__ == '__main__':
    env = os.environ.get('AF_ENVIRONMENT', 'local')
    policy = 'compliance/policies/ubuntu-22.04-cis-benchmark.yaml'
    
    if len(sys.argv) > 1:
        policy = sys.argv[1]
    if len(sys.argv) > 2:
        env = sys.argv[2]
    
    scanner = ComplianceScanner(policy, env)
    scanner.scan()
    report = scanner.generate_report()
    
    print(f"\n{'='*60}")
    print(f"COMPLIANCE REPORT - {env.upper()}")
    print(f"{'='*60}")
    print(f"Score: {report['summary']['score']}% (Required: {report['summary']['required_score']}%)")
    print(f"Passed: {report['summary']['passed']}/{report['summary']['total_rules']}")
    print(f"Gate Status: {'✅ PASSED' if report['summary']['gate_passed'] else '❌ BLOCKED'}")
    
    sys.exit(0 if report['summary']['gate_passed'] else 1)


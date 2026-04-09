#!/usr/bin/env python3
"""
Security Validator

Validates security configurations and potential vulnerabilities.
"""

import os
import sys
import json
import stat
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scripts.validation.base_validator import BaseValidator

class SecurityValidator(BaseValidator):
    """Validates system security"""

    def __init__(self, config_path: Optional[str] = None):
        super().__init__(config_path)
        self.logger = logging.getLogger(__name__)

    def validate_file_permissions(self) -> Dict[str, Any]:
        """Validate file permissions for sensitive files"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'permissions': {},
            'errors': []
        }

        try:
            sensitive_files = [
                '.goalie/risk_tracking.db',
                '.goalie/governance_config.json',
                '.goalie/evidence_trail_config.json'
            ]

            for file_path in sensitive_files:
                full_path = Path(self.project_root) / file_path
                if full_path.exists():
                    file_stat = full_path.stat()
                    mode = stat.filemode(file_stat.st_mode)
                    results['permissions'][file_path] = mode

                    # Check if world-readable
                    if file_stat.st_mode & stat.S_IROTH:
                        results['errors'].append(f'File world-readable: {file_path}')
                    # Check if world-writable
                    if file_stat.st_mode & stat.S_IWOTH:
                        results['errors'].append(f'File world-writable: {file_path}')
                else:
                    results['permissions'][file_path] = 'not_found'

            if not results['errors']:
                results['status'] = 'passed'

        except Exception as e:
            results['errors'].append(f'File permissions validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_environment_secrets(self) -> Dict[str, Any]:
        """Validate environment variables for exposed secrets"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'secrets': {},
            'errors': []
        }

        try:
            # Check for common secret patterns in environment
            secret_patterns = [
                'password',
                'secret',
                'key',
                'token',
                'credential'
            ]

            exposed_vars = []
            for key, value in os.environ.items():
                key_lower = key.lower()
                for pattern in secret_patterns:
                    if pattern in key_lower and len(value) > 10:  # Likely actual secret
                        exposed_vars.append(key)
                        break

            if exposed_vars:
                results['secrets']['exposed_variables'] = exposed_vars
                results['errors'].append(f'Potentially exposed secrets: {exposed_vars}')
            else:
                results['secrets']['status'] = 'no_exposed_secrets'

            results['status'] = 'passed' if not exposed_vars else 'failed'

        except Exception as e:
            results['errors'].append(f'Environment secrets validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_code_security(self) -> Dict[str, Any]:
        """Validate code for security issues"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'security_issues': {},
            'errors': []
        }

        try:
            # Check for common security issues in Python files
            python_files = list(Path(self.project_root).rglob('*.py'))
            issues_found = []

            dangerous_patterns = [
                'eval(',
                'exec(',
                'subprocess.call.*shell=True',
                'os.system',
                'pickle.load',
                'yaml.load',
                'input('
            ]

            for py_file in python_files[:50]:  # Limit to first 50 files
                try:
                    with open(py_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        for pattern in dangerous_patterns:
                            if pattern in content:
                                issues_found.append(f'{py_file.name}: {pattern}')
                except Exception:
                    continue

            if issues_found:
                results['security_issues']['dangerous_patterns'] = issues_found
                results['errors'].extend(issues_found)
                results['status'] = 'failed'
            else:
                results['security_issues']['status'] = 'no_issues_found'
                results['status'] = 'passed'

        except Exception as e:
            results['errors'].append(f'Code security validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_network_security(self) -> Dict[str, Any]:
        """Validate network security configurations"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'network': {},
            'errors': []
        }

        try:
            # Check for open ports (basic check)
            import socket

            common_ports = [22, 80, 443, 3306, 5432]  # SSH, HTTP, HTTPS, MySQL, PostgreSQL
            open_ports = []

            for port in common_ports:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex(('127.0.0.1', port))
                if result == 0:
                    open_ports.append(port)
                sock.close()

            results['network']['open_ports'] = open_ports

            # Flag potentially sensitive ports
            sensitive_ports = [22, 3306, 5432]
            exposed_sensitive = [p for p in open_ports if p in sensitive_ports]

            if exposed_sensitive:
                results['errors'].append(f'Sensitive ports exposed locally: {exposed_sensitive}')
                results['status'] = 'warning'
            else:
                results['status'] = 'passed'

        except ImportError:
            results['status'] = 'warning'
            results['errors'].append('Socket module not available')
        except Exception as e:
            results['errors'].append(f'Network security validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def run_validation(self) -> Dict[str, Any]:
        """Run all security validations"""
        self.logger.info("Starting security validation")

        results = {
            'timestamp': datetime.now().isoformat(),
            'validator': 'security',
            'overall_status': 'unknown',
            'validations': {}
        }

        # Run all validations
        validations = {
            'file_permissions': self.validate_file_permissions,
            'environment_secrets': self.validate_environment_secrets,
            'code_security': self.validate_code_security,
            'network_security': self.validate_network_security
        }

        all_passed = True
        for name, validator_func in validations.items():
            self.logger.info(f"Running {name} validation")
            val_result = validator_func()
            results['validations'][name] = val_result

            if val_result['status'] in ['failed']:
                all_passed = False

        results['overall_status'] = 'passed' if all_passed else 'failed'

        self.logger.info(f"Security validation completed: {results['overall_status']}")
        return results

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Security Validator')
    parser.add_argument('--config', help='Path to validation config file')
    parser.add_argument('--output', help='Output file for results')
    parser.add_argument('--json', action='store_true', help='Output in JSON format')

    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    validator = SecurityValidator(args.config)
    results = validator.run_validation()

    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
    elif args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"Security Validation: {results['overall_status'].upper()}")
        for name, val in results['validations'].items():
            print(f"  {name}: {val['status'].upper()}")
            if val.get('errors'):
                for error in val['errors']:
                    print(f"    ERROR: {error}")

if __name__ == '__main__':
    main()
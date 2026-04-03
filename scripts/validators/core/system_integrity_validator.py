#!/usr/bin/env python3
"""
System Integrity Validator

Validates the integrity of all agentic flow system components including:
- Core framework components
- Database integrity
- File system structure
- Process health
- Component dependencies
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scripts.validation.base_validator import BaseValidator

class SystemIntegrityValidator(BaseValidator):
    """Validates system integrity across all components"""

    def __init__(self, config_path: Optional[str] = None):
        super().__init__(config_path)
        self.logger = logging.getLogger(__name__)

    def validate_core_framework(self) -> Dict[str, Any]:
        """Validate core framework components"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'components': {},
            'errors': []
        }

        try:
            # Check agentic-flow-core directory
            core_path = Path(self.project_root) / 'agentic-flow-core'
            if not core_path.exists():
                results['errors'].append('agentic-flow-core directory not found')
                results['status'] = 'failed'
                return results

            # Check core files
            core_files = [
                'src/index.ts',
                'src/core/orchestration-framework.ts',
                'src/core/health-checks.ts',
                'package.json',
                'tsconfig.json'
            ]

            for file_path in core_files:
                full_path = core_path / file_path
                if not full_path.exists():
                    results['errors'].append(f'Core file missing: {file_path}')
                    results['status'] = 'failed'
                else:
                    results['components'][file_path] = 'present'

            # Check TypeScript compilation
            if self._check_typescript_compilation():
                results['components']['typescript_compilation'] = 'passed'
            else:
                results['errors'].append('TypeScript compilation failed')
                results['status'] = 'failed'

            if not results['errors']:
                results['status'] = 'passed'

        except Exception as e:
            results['errors'].append(f'Framework validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_database_integrity(self) -> Dict[str, Any]:
        """Validate database integrity"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'databases': {},
            'errors': []
        }

        try:
            # Check .agentdb directory
            agentdb_path = Path(self.project_root) / '.agentdb'
            if not agentdb_path.exists():
                results['errors'].append('.agentdb directory not found')
                results['status'] = 'failed'
                return results

            # Check for database files
            db_files = list(agentdb_path.glob('*.db'))
            if not db_files:
                results['errors'].append('No database files found in .agentdb')
                results['status'] = 'failed'
            else:
                for db_file in db_files:
                    results['databases'][db_file.name] = 'present'

            # Check risk_tracking.db specifically
            risk_db = agentdb_path / 'risk_tracking.db'
            if risk_db.exists():
                results['databases']['risk_tracking.db'] = 'present'
            else:
                results['errors'].append('risk_tracking.db not found')

            if not results['errors']:
                results['status'] = 'passed'

        except Exception as e:
            results['errors'].append(f'Database validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_file_structure(self) -> Dict[str, Any]:
        """Validate file system structure"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'directories': {},
            'errors': []
        }

        try:
            required_dirs = [
                'scripts',
                'src',
                'docs',
                '.goalie',
                'agentic-flow-core',
                'tests'
            ]

            for dir_name in required_dirs:
                dir_path = Path(self.project_root) / dir_name
                if not dir_path.exists():
                    results['errors'].append(f'Required directory missing: {dir_name}')
                    results['status'] = 'failed'
                else:
                    results['directories'][dir_name] = 'present'

            # Check .goalie subdirectories
            goalie_path = Path(self.project_root) / '.goalie'
            goalie_subs = ['evidence', 'backups', 'dashboard']
            for sub in goalie_subs:
                sub_path = goalie_path / sub
                if not sub_path.exists():
                    results['errors'].append(f'.goalie subdirectory missing: {sub}')
                else:
                    results['directories'][f'.goalie/{sub}'] = 'present'

            if not results['errors']:
                results['status'] = 'passed'

        except Exception as e:
            results['errors'].append(f'File structure validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_process_health(self) -> Dict[str, Any]:
        """Validate running processes"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'processes': {},
            'errors': []
        }

        try:
            import psutil

            # Check for common processes
            expected_processes = [
                'node',  # Node.js processes
                'python',  # Python processes
            ]

            running_processes = []
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    if proc.info['name'] in expected_processes:
                        running_processes.append(proc.info)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

            results['processes']['running_count'] = len(running_processes)

            # Check for agentic flow specific processes
            af_processes = [p for p in running_processes if 'af' in ' '.join(p.get('cmdline', []))]
            results['processes']['af_processes'] = len(af_processes)

            results['status'] = 'passed'

        except ImportError:
            results['errors'].append('psutil not available for process checking')
            results['status'] = 'warning'
        except Exception as e:
            results['errors'].append(f'Process health validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_dependencies(self) -> Dict[str, Any]:
        """Validate component dependencies"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'dependencies': {},
            'errors': []
        }

        try:
            # Check package.json dependencies
            core_package = Path(self.project_root) / 'agentic-flow-core' / 'package.json'
            if core_package.exists():
                with open(core_package, 'r') as f:
                    package_data = json.load(f)

                deps = package_data.get('dependencies', {})
                dev_deps = package_data.get('devDependencies', {})

                results['dependencies']['core_dependencies'] = len(deps)
                results['dependencies']['core_dev_dependencies'] = len(dev_deps)

                # Check for critical dependencies
                critical_deps = ['@ruvector/agentic-flow-core']
                for dep in critical_deps:
                    if dep not in deps:
                        results['errors'].append(f'Critical dependency missing: {dep}')
            else:
                results['errors'].append('agentic-flow-core/package.json not found')

            if not results['errors']:
                results['status'] = 'passed'
            else:
                results['status'] = 'failed'

        except Exception as e:
            results['errors'].append(f'Dependency validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def _check_typescript_compilation(self) -> bool:
        """Check if TypeScript compiles successfully"""
        try:
            import subprocess
            result = subprocess.run(
                ['npx', 'tsc', '--noEmit'],
                cwd=Path(self.project_root) / 'agentic-flow-core',
                capture_output=True,
                text=True,
                timeout=30
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False

    def run_validation(self) -> Dict[str, Any]:
        """Run all system integrity validations"""
        self.logger.info("Starting system integrity validation")

        results = {
            'timestamp': datetime.now().isoformat(),
            'validator': 'system_integrity',
            'overall_status': 'unknown',
            'validations': {}
        }

        # Run all validations
        validations = {
            'core_framework': self.validate_core_framework,
            'database_integrity': self.validate_database_integrity,
            'file_structure': self.validate_file_structure,
            'process_health': self.validate_process_health,
            'dependencies': self.validate_dependencies
        }

        all_passed = True
        for name, validator_func in validations.items():
            self.logger.info(f"Running {name} validation")
            val_result = validator_func()
            results['validations'][name] = val_result

            if val_result['status'] in ['failed', 'error']:
                all_passed = False

        results['overall_status'] = 'passed' if all_passed else 'failed'

        self.logger.info(f"System integrity validation completed: {results['overall_status']}")
        return results

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='System Integrity Validator')
    parser.add_argument('--config', help='Path to validation config file')
    parser.add_argument('--output', help='Output file for results')
    parser.add_argument('--json', action='store_true', help='Output in JSON format')

    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    validator = SystemIntegrityValidator(args.config)
    results = validator.run_validation()

    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
    elif args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"System Integrity Validation: {results['overall_status'].upper()}")
        for name, val in results['validations'].items():
            print(f"  {name}: {val['status'].upper()}")
            if val.get('errors'):
                for error in val['errors']:
                    print(f"    ERROR: {error}")

if __name__ == '__main__':
    main()
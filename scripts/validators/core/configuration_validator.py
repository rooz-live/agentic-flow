#!/usr/bin/env python3
"""
Configuration Validator

Validates configuration files and settings across the agentic flow system.
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scripts.validation.base_validator import BaseValidator

class ConfigurationValidator(BaseValidator):
    """Validates system configuration"""

    def __init__(self, config_path: Optional[str] = None):
        super().__init__(config_path)
        self.logger = logging.getLogger(__name__)

    def validate_goalie_config(self) -> Dict[str, Any]:
        """Validate .goalie configuration files"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'configs': {},
            'errors': []
        }

        try:
            goalie_path = Path(self.project_root) / '.goalie'
            config_files = [
                'governance_config.json',
                'evidence_trail_config.json',
                'observability_config.json',
                'validation_config.json'
            ]

            for config_file in config_files:
                config_path = goalie_path / config_file
                if config_path.exists():
                    try:
                        with open(config_path, 'r') as f:
                            json.load(f)
                        results['configs'][config_file] = 'valid'
                    except json.JSONDecodeError as e:
                        results['errors'].append(f'Invalid JSON in {config_file}: {e}')
                        results['status'] = 'failed'
                else:
                    results['errors'].append(f'Config file missing: {config_file}')

            if not results['errors']:
                results['status'] = 'passed'

        except Exception as e:
            results['errors'].append(f'Goalie config validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_package_configs(self) -> Dict[str, Any]:
        """Validate package.json configurations"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'packages': {},
            'errors': []
        }

        try:
            # Check agentic-flow-core package.json
            core_package = Path(self.project_root) / 'agentic-flow-core' / 'package.json'
            if core_package.exists():
                with open(core_package, 'r') as f:
                    package_data = json.load(f)

                # Validate required fields
                required_fields = ['name', 'version', 'scripts', 'dependencies']
                for field in required_fields:
                    if field not in package_data:
                        results['errors'].append(f'Missing required field in core package.json: {field}')

                results['packages']['agentic-flow-core'] = 'valid'
            else:
                results['errors'].append('agentic-flow-core/package.json not found')

            if not results['errors']:
                results['status'] = 'passed'
            else:
                results['status'] = 'failed'

        except Exception as e:
            results['errors'].append(f'Package config validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_environment_variables(self) -> Dict[str, Any]:
        """Validate required environment variables"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'variables': {},
            'errors': []
        }

        try:
            required_vars = [
                'PROJECT_ROOT',
                'AF_RUN_ID',
                'AF_CORRELATION_ID'
            ]

            for var in required_vars:
                if var in os.environ:
                    results['variables'][var] = 'present'
                else:
                    results['errors'].append(f'Required environment variable missing: {var}')

            if not results['errors']:
                results['status'] = 'passed'
            else:
                results['status'] = 'warning'  # Not critical failure

        except Exception as e:
            results['errors'].append(f'Environment validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_script_permissions(self) -> Dict[str, Any]:
        """Validate script file permissions"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'scripts': {},
            'errors': []
        }

        try:
            scripts_dir = Path(self.project_root) / 'scripts'
            if scripts_dir.exists():
                for script_file in scripts_dir.rglob('*'):
                    if script_file.is_file() and script_file.suffix in ['.py', '.sh']:
                        # Check if executable
                        if os.access(script_file, os.X_OK):
                            results['scripts'][str(script_file.relative_to(self.project_root))] = 'executable'
                        else:
                            results['errors'].append(f'Script not executable: {script_file}')

            if not results['errors']:
                results['status'] = 'passed'
            else:
                results['status'] = 'failed'

        except Exception as e:
            results['errors'].append(f'Script permissions validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def run_validation(self) -> Dict[str, Any]:
        """Run all configuration validations"""
        self.logger.info("Starting configuration validation")

        results = {
            'timestamp': datetime.now().isoformat(),
            'validator': 'configuration',
            'overall_status': 'unknown',
            'validations': {}
        }

        # Run all validations
        validations = {
            'goalie_config': self.validate_goalie_config,
            'package_configs': self.validate_package_configs,
            'environment_variables': self.validate_environment_variables,
            'script_permissions': self.validate_script_permissions
        }

        all_passed = True
        for name, validator_func in validations.items():
            self.logger.info(f"Running {name} validation")
            val_result = validator_func()
            results['validations'][name] = val_result

            if val_result['status'] in ['failed']:
                all_passed = False

        results['overall_status'] = 'passed' if all_passed else 'failed'

        self.logger.info(f"Configuration validation completed: {results['overall_status']}")
        return results

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Configuration Validator')
    parser.add_argument('--config', help='Path to validation config file')
    parser.add_argument('--output', help='Output file for results')
    parser.add_argument('--json', action='store_true', help='Output in JSON format')

    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    validator = ConfigurationValidator(args.config)
    results = validator.run_validation()

    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
    elif args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"Configuration Validation: {results['overall_status'].upper()}")
        for name, val in results['validations'].items():
            print(f"  {name}: {val['status'].upper()}")
            if val.get('errors'):
                for error in val['errors']:
                    print(f"    ERROR: {error}")

if __name__ == '__main__':
    main()
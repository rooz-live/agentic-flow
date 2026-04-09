#!/usr/bin/env python3
"""
Data Consistency Validator

Validates data consistency across databases, evidence files, and metrics.
"""

import os
import sys
import json
import sqlite3
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scripts.validation.base_validator import BaseValidator

class DataConsistencyValidator(BaseValidator):
    """Validates data consistency across the system"""

    def __init__(self, config_path: Optional[str] = None):
        super().__init__(config_path)
        self.logger = logging.getLogger(__name__)

    def validate_evidence_files(self) -> Dict[str, Any]:
        """Validate evidence file consistency"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'files': {},
            'errors': []
        }

        try:
            goalie_path = Path(self.project_root) / '.goalie'
            evidence_files = [
                'unified_evidence.jsonl',
                'economic_compounding.jsonl',
                'observability_gaps.jsonl',
                'performance_metrics.jsonl'
            ]

            for evidence_file in evidence_files:
                file_path = goalie_path / evidence_file
                if file_path.exists():
                    try:
                        with open(file_path, 'r') as f:
                            lines = f.readlines()
                            valid_lines = 0
                            for line in lines:
                                if line.strip():
                                    json.loads(line.strip())
                                    valid_lines += 1
                            results['files'][evidence_file] = f'{valid_lines} valid entries'
                    except json.JSONDecodeError as e:
                        results['errors'].append(f'Invalid JSON in {evidence_file}: {e}')
                else:
                    results['errors'].append(f'Evidence file missing: {evidence_file}')

            if not results['errors']:
                results['status'] = 'passed'

        except Exception as e:
            results['errors'].append(f'Evidence validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_database_schema(self) -> Dict[str, Any]:
        """Validate database schema consistency"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'databases': {},
            'errors': []
        }

        try:
            agentdb_path = Path(self.project_root) / '.agentdb'
            if agentdb_path.exists():
                for db_file in agentdb_path.glob('*.db'):
                    try:
                        conn = sqlite3.connect(str(db_file))
                        cursor = conn.cursor()

                        # Get table info
                        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                        tables = cursor.fetchall()

                        results['databases'][db_file.name] = f'{len(tables)} tables'
                        conn.close()
                    except sqlite3.Error as e:
                        results['errors'].append(f'Database error in {db_file.name}: {e}')

            if not results['errors']:
                results['status'] = 'passed'

        except Exception as e:
            results['errors'].append(f'Database schema validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_metrics_consistency(self) -> Dict[str, Any]:
        """Validate metrics data consistency"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'metrics': {},
            'errors': []
        }

        try:
            # Check pattern metrics
            pattern_metrics = Path(self.project_root) / '.goalie' / 'pattern_metrics.jsonl'
            if pattern_metrics.exists():
                with open(pattern_metrics, 'r') as f:
                    lines = f.readlines()
                    results['metrics']['pattern_metrics'] = f'{len(lines)} entries'

            # Check test metrics
            test_metrics = Path(self.project_root) / '.goalie' / 'test_metrics_log.jsonl'
            if test_metrics.exists():
                with open(test_metrics, 'r') as f:
                    lines = f.readlines()
                    results['metrics']['test_metrics'] = f'{len(lines)} entries'

            results['status'] = 'passed'

        except Exception as e:
            results['errors'].append(f'Metrics validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def validate_temporal_consistency(self) -> Dict[str, Any]:
        """Validate temporal data consistency"""
        results: Dict[str, Any] = {
            'status': 'unknown',
            'temporal_checks': {},
            'errors': []
        }

        try:
            # Check if timestamps are in chronological order in evidence files
            evidence_file = Path(self.project_root) / '.goalie' / 'unified_evidence.jsonl'
            if evidence_file.exists():
                timestamps = []
                with open(evidence_file, 'r') as f:
                    for line in f:
                        if line.strip():
                            try:
                                data = json.loads(line.strip())
                                if 'timestamp' in data:
                                    timestamps.append(data['timestamp'])
                            except json.JSONDecodeError:
                                continue

                # Check if timestamps are sorted
                if timestamps == sorted(timestamps):
                    results['temporal_checks']['evidence_chronological'] = 'passed'
                else:
                    results['errors'].append('Evidence timestamps not in chronological order')

            results['status'] = 'passed' if not results['errors'] else 'failed'

        except Exception as e:
            results['errors'].append(f'Temporal validation error: {str(e)}')
            results['status'] = 'failed'

        return results

    def run_validation(self) -> Dict[str, Any]:
        """Run all data consistency validations"""
        self.logger.info("Starting data consistency validation")

        results = {
            'timestamp': datetime.now().isoformat(),
            'validator': 'data_consistency',
            'overall_status': 'unknown',
            'validations': {}
        }

        # Run all validations
        validations = {
            'evidence_files': self.validate_evidence_files,
            'database_schema': self.validate_database_schema,
            'metrics_consistency': self.validate_metrics_consistency,
            'temporal_consistency': self.validate_temporal_consistency
        }

        all_passed = True
        for name, validator_func in validations.items():
            self.logger.info(f"Running {name} validation")
            val_result = validator_func()
            results['validations'][name] = val_result

            if val_result['status'] in ['failed']:
                all_passed = False

        results['overall_status'] = 'passed' if all_passed else 'failed'

        self.logger.info(f"Data consistency validation completed: {results['overall_status']}")
        return results

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Data Consistency Validator')
    parser.add_argument('--config', help='Path to validation config file')
    parser.add_argument('--output', help='Output file for results')
    parser.add_argument('--json', action='store_true', help='Output in JSON format')

    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    validator = DataConsistencyValidator(args.config)
    results = validator.run_validation()

    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
    elif args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"Data Consistency Validation: {results['overall_status'].upper()}")
        for name, val in results['validations'].items():
            print(f"  {name}: {val['status'].upper()}")
            if val.get('errors'):
                for error in val['errors']:
                    print(f"    ERROR: {error}")

if __name__ == '__main__':
    main()
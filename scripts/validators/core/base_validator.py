#!/usr/bin/env python3
"""
Base Validator Class

Provides common functionality for all validation scripts.
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod


class BaseValidator(ABC):
    """Base class for all validators"""

    def __init__(self, config_path: Optional[str] = None):
        self.project_root = self._find_project_root()
        self.config = self._load_config(config_path)
        self.logger = logging.getLogger(self.__class__.__name__)

    def _find_project_root(self) -> str:
        """Find the project root directory"""
        current = Path(__file__).resolve()
        for parent in current.parents:
            if (parent / '.goalie').exists():
                return str(parent)
        return str(Path(__file__).parent.parent.parent)

    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load validation configuration"""
        if config_path:
            config_file = Path(config_path)
        else:
            config_file = Path(self.project_root) / '.goalie' / 'validation_config.json'

        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                self.logger.warning(f"Failed to load config {config_file}: {e}")

        # Return default config
        return {
            'validation': {
                'enabled_checks': ['all'],
                'strict_mode': False,
                'timeout_seconds': 300
            },
            'reporting': {
                'output_format': 'json',
                'log_level': 'INFO'
            }
        }

    @abstractmethod
    def run_validation(self) -> Dict[str, Any]:
        """Run the validation and return results"""
        pass

    def emit_evidence(self, results: Dict[str, Any]) -> None:
        """Emit validation results to evidence system"""
        try:
            evidence_file = Path(self.project_root) / '.goalie' / 'validation_evidence.jsonl'
            with open(evidence_file, 'a') as f:
                evidence = {
                    'timestamp': results.get('timestamp'),
                    'validator': results.get('validator'),
                    'status': results.get('overall_status'),
                    'details': results
                }
                f.write(json.dumps(evidence) + '\n')
        except Exception as e:
            self.logger.error(f"Failed to emit evidence: {e}")

    def log_validation_result(self, results: Dict[str, Any]) -> None:
        """Log validation results"""
        status = results.get('overall_status', 'unknown')
        validator = results.get('validator', 'unknown')

        if status == 'passed':
            self.logger.info(f"{validator} validation PASSED")
        elif status == 'failed':
            self.logger.error(f"{validator} validation FAILED")
            for validation_name, val_result in results.get('validations', {}).items():
                if val_result.get('status') in ['failed', 'error']:
                    for error in val_result.get('errors', []):
                        self.logger.error(f"  {validation_name}: {error}")
        else:
            self.logger.warning(f"{validator} validation {status.upper()}")
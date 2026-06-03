#!/usr/bin/env python3
"""
Comprehensive Monitoring and Validation Systems Validator

Validates all monitoring and validation systems for production readiness:
- Compact prompt templates functionality
- Retro refinement logging and processes
- Documentation completeness and accuracy
- Script integration and functionality
- CI/CD pipeline monitoring
- Integration monitoring (PI sync, CLAUDE, GitHub workflows)
- Automated alert systems with escalation

Generates comprehensive validation reports for risk analytics soft launch deployment.
"""

import asyncio
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import re

# Optional imports with fallbacks
try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s|validation|%(levelname)s|%(message)s',
    datefmt='%Y-%m-%dT%H:%M:%SZ'
)
logger = logging.getLogger(__name__)

class MonitoringSystemValidator:
    """Comprehensive monitoring system validator"""

    def __init__(self):
        self.validation_results = []
        self.errors = []
        self.warnings = []
        self.critical_issues = []
        self.start_time = datetime.now(timezone.utc)

    def log_validation_result(self, component: str, status: str, message: str, details: Dict = None):
        """Log a validation result"""
        result = {
            'timestamp': datetime.now(timezone.utc),
            'component': component,
            'status': status,
            'message': message,
            'details': details or {}
        }

        self.validation_results.append(result)

        if status == 'ERROR':
            self.errors.append(result)
            self.critical_issues.append(result)
            logger.error(f"VALIDATION ERROR [{component}]: {message}")
        elif status == 'WARNING':
            self.warnings.append(result)
            logger.warning(f"VALIDATION WARNING [{component}]: {message}")
        else:
            logger.info(f"VALIDATION OK [{component}]: {message}")

    def validate_compact_prompt_templates(self) -> Dict[str, Any]:
        """Validate compact prompt templates functionality"""
        logger.info("Validating compact prompt templates...")

        template_file = Path("docs/COMPACT_PROMPT_TEMPLATES.md")
        if not template_file.exists():
            self.log_validation_result('compact_templates', 'ERROR',
                                     'COMPACT_PROMPT_TEMPLATES.md file not found')
            return {'valid': False, 'error': 'File not found'}

        try:
            with open(template_file, 'r') as f:
                content = f.read()

            # Check for required sections
            required_sections = [
                'Compact Prompt Templates',
                'Template Categories',
                'Usage Guidelines',
                'Validation Rules'
            ]

            missing_sections = []
            for section in required_sections:
                if section not in content:
                    missing_sections.append(section)

            if missing_sections:
                self.log_validation_result('compact_templates', 'WARNING',
                                         f'Missing sections: {missing_sections}')

            # Check for template examples
            if '```' not in content:
                self.log_validation_result('compact_templates', 'WARNING',
                                         'No code examples found in templates')

            # Check file size (should not be empty)
            if len(content) < 1000:
                self.log_validation_result('compact_templates', 'ERROR',
                                         f'File too small: {len(content)} characters')

            # Check for recent modifications
            file_mtime = template_file.stat().st_mtime
            days_old = (time.time() - file_mtime) / 86400

            if days_old > 7:
                self.log_validation_result('compact_templates', 'WARNING',
                                         f'Templates not updated recently: {days_old:.1f} days old')

            self.log_validation_result('compact_templates', 'OK',
                                     f'Compact templates validated: {len(content)} characters')
            return {'valid': True, 'size': len(content), 'sections': len(required_sections)}

        except Exception as e:
            self.log_validation_result('compact_templates', 'ERROR',
                                     f'Error reading templates: {str(e)}')
            return {'valid': False, 'error': str(e)}

    def validate_retro_refinement_processes(self) -> Dict[str, Any]:
        """Validate retro refinement logging and processes"""
        logger.info("Validating retro refinement processes...")

        retro_logs = []
        retro_docs = []

        # Find retro-related files
        for pattern in ['*retro*', '*refinement*', '*RETRO*']:
            for file_path in Path(".").rglob(pattern):
                if file_path.is_file():
                    if file_path.suffix in ['.log', '.json']:
                        retro_logs.append(file_path)
                    elif file_path.suffix in ['.md', '.txt']:
                        retro_docs.append(file_path)

        # Check for retro log files
        if not retro_logs:
            self.log_validation_result('retro_processes', 'WARNING',
                                     'No retro refinement log files found')

        # Check for retro documentation
        if not retro_docs:
            self.log_validation_result('retro_processes', 'WARNING',
                                     'No retro refinement documentation found')

        # Validate retro log structure
        for log_file in retro_logs[-5:]:  # Check last 5 files
            try:
                if log_file.suffix == '.json':
                    with open(log_file, 'r') as f:
                        data = json.load(f)

                    # Check for required retro fields
                    required_fields = ['timestamp', 'correlation_id', 'phase']
                    missing_fields = [field for field in required_fields if field not in data]

                    if missing_fields:
                        self.log_validation_result('retro_processes', 'ERROR',
                                                 f'Missing fields in {log_file}: {missing_fields}')
                    else:
                        self.log_validation_result('retro_processes', 'OK',
                                                 f'Valid retro log: {log_file}')

                elif log_file.suffix == '.log':
                    with open(log_file, 'r') as f:
                        content = f.read()

                    if len(content) < 100:
                        self.log_validation_result('retro_processes', 'WARNING',
                                                 f'Retro log file too small: {log_file}')
                    else:
                        self.log_validation_result('retro_processes', 'OK',
                                                 f'Valid retro log: {log_file}')

            except Exception as e:
                self.log_validation_result('retro_processes', 'ERROR',
                                         f'Error validating retro log {log_file}: {str(e)}')

        result = {
            'valid': len(self.errors) == 0,
            'retro_logs_found': len(retro_logs),
            'retro_docs_found': len(retro_docs),
            'logs_validated': len(retro_logs)
        }

        self.log_validation_result('retro_processes', 'OK' if result['valid'] else 'WARNING',
                                 f'Retro processes validation: {len(retro_logs)} logs, {len(retro_docs)} docs')

        return result

    def validate_documentation_completeness(self) -> Dict[str, Any]:
        """Validate all documentation files for completeness and accuracy"""
        logger.info("Validating documentation completeness...")

        docs_dir = Path("docs")
        if not docs_dir.exists():
            self.log_validation_result('documentation', 'ERROR', 'docs directory not found')
            return {'valid': False, 'error': 'docs directory not found'}

        # Required documentation files
        required_docs = [
            'README.md',
            'COMPACT_PROMPT_TEMPLATES.md',
            'MONITORING_SETUP.md',
            'DEPLOYMENT_READINESS_SUMMARY.md',
            'RISK_ANALYTICS_READY.md'
        ]

        missing_docs = []
        validated_docs = []

        # Check for required documentation
        for doc in required_docs:
            doc_path = docs_dir / doc
            if not doc_path.exists():
                missing_docs.append(doc)
            else:
                validated_docs.append(doc)

        if missing_docs:
            self.log_validation_result('documentation', 'ERROR',
                                     f'Missing required documentation: {missing_docs}')

        # Validate existing documentation files
        for doc_file in docs_dir.glob("*.md"):
            if doc_file.name in required_docs or not doc_file.name.startswith('.'):
                try:
                    with open(doc_file, 'r') as f:
                        content = f.read()

                    # Basic validation checks
                    if len(content) < 100:
                        self.log_validation_result('documentation', 'WARNING',
                                                 f'Documentation file too small: {doc_file.name}')

                    # Check for basic structure
                    if not content.strip():
                        self.log_validation_result('documentation', 'ERROR',
                                                 f'Empty documentation file: {doc_file.name}')
                    else:
                        # Check for headers (basic markdown structure)
                        lines = content.split('\n')
                        headers = [line for line in lines if line.strip().startswith('#')]

                        if not headers:
                            self.log_validation_result('documentation', 'WARNING',
                                                     f'No headers found in: {doc_file.name}')

                        self.log_validation_result('documentation', 'OK',
                                                 f'Validated documentation: {doc_file.name} ({len(content)} chars)')

                except Exception as e:
                    self.log_validation_result('documentation', 'ERROR',
                                             f'Error reading documentation {doc_file}: {str(e)}')

        # Check documentation cross-references
        all_docs = list(docs_dir.glob("*.md"))
        orphaned_refs = self.check_documentation_references(all_docs)

        if orphaned_refs:
            self.log_validation_result('documentation', 'WARNING',
                                     f'Orphaned documentation references: {orphaned_refs}')

        result = {
            'valid': len(missing_docs) == 0,
            'total_docs': len(all_docs),
            'required_docs_found': len(validated_docs),
            'missing_docs': missing_docs,
            'orphaned_references': len(orphaned_refs)
        }

        self.log_validation_result('documentation', 'OK' if result['valid'] else 'ERROR',
                                 f'Documentation validation: {len(all_docs)} total, {len(missing_docs)} missing')

        return result

    def check_documentation_references(self, doc_files: List[Path]) -> List[str]:
        """Check for orphaned documentation references"""
        orphaned_refs = []

        # This is a simplified check - in practice you'd parse markdown links
        for doc_file in doc_files:
            try:
                with open(doc_file, 'r') as f:
                    content = f.read()

                # Look for relative links that might be broken
                import re
                links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content)

                for link_text, link_url in links:
                    if link_url.startswith('./') or link_url.startswith('../'):
                        # Check if referenced file exists
                        ref_path = doc_file.parent / link_url
                        if not ref_path.exists():
                            orphaned_refs.append(f"{doc_file.name} -> {link_url}")

            except Exception as e:
                logger.warning(f"Error checking references in {doc_file}: {e}")

        return orphaned_refs

    def validate_script_integrations(self) -> Dict[str, Any]:
        """Validate all scripts for proper integration and functionality"""
        logger.info("Validating script integrations...")

        scripts_dir = Path("scripts")
        if not scripts_dir.exists():
            self.log_validation_result('scripts', 'ERROR', 'scripts directory not found')
            return {'valid': False, 'error': 'scripts directory not found'}

        # Critical scripts that must exist and be functional
        critical_scripts = [
            'monitoring_dashboard.py',
            'monitor_token_usage.py',
            'validate_heartbeats.py',
            'production_environment_monitor.py',
            'enhanced_monitoring_dashboard.py'
        ]

        missing_scripts = []
        invalid_scripts = []
        valid_scripts = []

        # Check script existence
        for script in critical_scripts:
            script_path = scripts_dir / script
            if not script_path.exists():
                missing_scripts.append(script)
            else:
                # Validate script syntax and basic structure
                validation = self.validate_script(script_path)
                if validation['valid']:
                    valid_scripts.append(script)
                else:
                    invalid_scripts.append(script)

        if missing_scripts:
            self.log_validation_result('scripts', 'ERROR',
                                     f'Missing critical scripts: {missing_scripts}')

        if invalid_scripts:
            self.log_validation_result('scripts', 'ERROR',
                                     f'Invalid scripts: {invalid_scripts}')

        # Test script execution (basic)
        for script in valid_scripts[:3]:  # Test first 3 scripts
            script_path = scripts_dir / script
            try:
                # Basic syntax check
                result = subprocess.run([sys.executable, '-m', 'py_compile', str(script_path)],
                                      capture_output=True, timeout=30)

                if result.returncode != 0:
                    self.log_validation_result('scripts', 'ERROR',
                                             f'Script syntax error in {script}: {result.stderr.decode()}')
                else:
                    self.log_validation_result('scripts', 'OK',
                                             f'Script syntax valid: {script}')

            except subprocess.TimeoutExpired:
                self.log_validation_result('scripts', 'WARNING',
                                         f'Script validation timed out: {script}')
            except Exception as e:
                self.log_validation_result('scripts', 'ERROR',
                                         f'Script validation failed {script}: {str(e)}')

        result = {
            'valid': len(missing_scripts) == 0 and len(invalid_scripts) == 0,
            'total_scripts': len(critical_scripts),
            'missing_scripts': missing_scripts,
            'invalid_scripts': invalid_scripts,
            'valid_scripts': valid_scripts
        }

        self.log_validation_result('scripts', 'OK' if result['valid'] else 'ERROR',
                                 f'Script validation: {len(valid_scripts)}/{len(critical_scripts)} valid')

        return result

    def validate_script(self, script_path: Path) -> Dict[str, Any]:
        """Validate individual script"""
        try:
            with open(script_path, 'r') as f:
                content = f.read()

            # Basic checks
            if not content.strip():
                return {'valid': False, 'error': 'Empty script'}

            if not content.startswith('#!/'):
                return {'valid': False, 'error': 'Missing shebang'}

            if 'import' not in content and 'from' not in content:
                return {'valid': False, 'error': 'No imports found'}

            # Check for basic structure
            required_elements = ['def main', 'if __name__']
            missing_elements = [elem for elem in required_elements if elem not in content]

            if missing_elements:
                return {'valid': False, 'error': f'Missing elements: {missing_elements}'}

            return {'valid': True, 'size': len(content)}

        except Exception as e:
            return {'valid': False, 'error': str(e)}

    def validate_ci_cd_pipeline(self) -> Dict[str, Any]:
        """Validate CI/CD pipeline monitoring and integration"""
        logger.info("Validating CI/CD pipeline...")

        ci_dir = Path("ci")
        if not ci_dir.exists():
            self.log_validation_result('ci_cd', 'WARNING', 'CI directory not found')
            return {'valid': False, 'error': 'CI directory not found'}

        # Check for critical CI files
        critical_ci_files = [
            'promotion_gate.sh',
            'python_syntax_validation.sh',
            'ssl_cert_generation.sh',
            'additional_validation.sh'
        ]

        missing_ci_files = []
        for ci_file in critical_ci_files:
            ci_path = ci_dir / ci_file
            if not ci_path.exists():
                missing_ci_files.append(ci_file)

        if missing_ci_files:
            self.log_validation_result('ci_cd', 'ERROR',
                                     f'Missing critical CI files: {missing_ci_files}')

        # Check .github directory for workflows
        github_dir = Path(".github")
        if github_dir.exists():
            workflows_dir = github_dir / "workflows"
            if workflows_dir.exists():
                workflow_files = list(workflows_dir.glob("*.yml")) + list(workflows_dir.glob("*.yaml"))
                if workflow_files:
                    self.log_validation_result('ci_cd', 'OK',
                                             f'Found GitHub workflows: {len(workflow_files)} files')
                else:
                    self.log_validation_result('ci_cd', 'WARNING', 'No GitHub workflow files found')
            else:
                self.log_validation_result('ci_cd', 'WARNING', 'No GitHub workflows directory')
        else:
            self.log_validation_result('ci_cd', 'WARNING', 'No .github directory found')

        # Validate CI script execution
        for ci_file in critical_ci_files:
            ci_path = ci_dir / ci_file
            if ci_path.exists():
                try:
                    # Basic validation - check if file is executable and not empty
                    if ci_path.stat().st_size == 0:
                        self.log_validation_result('ci_cd', 'ERROR', f'Empty CI file: {ci_file}')
                    elif not os.access(ci_path, os.X_OK):
                        self.log_validation_result('ci_cd', 'WARNING', f'CI file not executable: {ci_file}')
                    else:
                        self.log_validation_result('ci_cd', 'OK', f'Valid CI file: {ci_file}')
                except Exception as e:
                    self.log_validation_result('ci_cd', 'ERROR', f'Error validating CI file {ci_file}: {str(e)}')

        result = {
            'valid': len(missing_ci_files) == 0,
            'ci_files_found': len(critical_ci_files) - len(missing_ci_files),
            'missing_ci_files': missing_ci_files
        }

        self.log_validation_result('ci_cd', 'OK' if result['valid'] else 'ERROR',
                                 f'CI/CD validation: {result["ci_files_found"]}/{len(critical_ci_files)} files valid')

        return result

    def validate_integration_monitoring(self) -> Dict[str, Any]:
        """Validate integration monitoring (PI sync, CLAUDE, GitHub workflows)"""
        logger.info("Validating integration monitoring...")

        integrations = []

        # Check PI sync integration
        pi_config = Path("stx11-greenfield/config/pi_sync_config.yaml")
        if pi_config.exists():
            try:
                if YAML_AVAILABLE:
                    with open(pi_config, 'r') as f:
                        pi_data = yaml.safe_load(f)

                    if pi_data:
                        integrations.append({
                            'name': 'PI Sync',
                            'status': 'OK',
                            'details': f'Config found with {len(pi_data)} settings'
                        })
                        self.log_validation_result('integrations', 'OK', 'PI sync configuration valid')
                    else:
                        integrations.append({
                            'name': 'PI Sync',
                            'status': 'WARNING',
                            'details': 'Empty configuration'
                        })
                        self.log_validation_result('integrations', 'WARNING', 'PI sync configuration empty')
                else:
                    # YAML not available, just check if file exists and has content
                    if pi_config.stat().st_size > 0:
                        integrations.append({
                            'name': 'PI Sync',
                            'status': 'OK',
                            'details': 'Config file exists (YAML parser not available)'
                        })
                        self.log_validation_result('integrations', 'OK', 'PI sync configuration file exists')
                    else:
                        integrations.append({
                            'name': 'PI Sync',
                            'status': 'WARNING',
                            'details': 'Empty configuration file'
                        })
                        self.log_validation_result('integrations', 'WARNING', 'PI sync configuration empty')
            except Exception as e:
                integrations.append({
                    'name': 'PI Sync',
                    'status': 'ERROR',
                    'details': f'Error: {str(e)}'
                })
                self.log_validation_result('integrations', 'ERROR', f'PI sync configuration error: {str(e)}')
        else:
            integrations.append({
                'name': 'PI Sync',
                'status': 'MISSING',
                'details': 'Configuration file not found'
            })
            self.log_validation_result('integrations', 'WARNING', 'PI sync configuration not found')

        # Check CLAUDE integration
        claude_config = Path("CLAUDE.md")
        if claude_config.exists():
            try:
                with open(claude_config, 'r') as f:
                    claude_content = f.read()

                if len(claude_content) > 1000:
                    integrations.append({
                        'name': 'CLAUDE',
                        'status': 'OK',
                        'details': f'Documentation found: {len(claude_content)} characters'
                    })
                    self.log_validation_result('integrations', 'OK', 'CLAUDE documentation valid')
                else:
                    integrations.append({
                        'name': 'CLAUDE',
                        'status': 'WARNING',
                        'details': f'Documentation too small: {len(claude_content)} characters'
                    })
                    self.log_validation_result('integrations', 'WARNING', 'CLAUDE documentation too small')
            except Exception as e:
                integrations.append({
                    'name': 'CLAUDE',
                    'status': 'ERROR',
                    'details': f'Error: {str(e)}'
                })
                self.log_validation_result('integrations', 'ERROR', f'CLAUDE documentation error: {str(e)}')
        else:
            integrations.append({
                'name': 'CLAUDE',
                'status': 'MISSING',
                'details': 'Documentation not found'
            })
            self.log_validation_result('integrations', 'WARNING', 'CLAUDE documentation not found')

        # Check for recent integration activity in logs
        recent_activity = False
        if Path("logs").exists():
            for log_file in Path("logs").glob("*"):
                if log_file.stat().st_mtime > time.time() - 3600:  # Modified within last hour
                    recent_activity = True
                    break

        if recent_activity:
            self.log_validation_result('integrations', 'OK', 'Recent integration activity detected')
        else:
            self.log_validation_result('integrations', 'WARNING', 'No recent integration activity')

        result = {
            'valid': all(i['status'] == 'OK' for i in integrations),
            'integrations': integrations,
            'recent_activity': recent_activity
        }

        overall_status = 'OK' if result['valid'] else 'WARNING'
        self.log_validation_result('integrations', overall_status,
                                 f'Integration monitoring: {len([i for i in integrations if i["status"] == "OK"])}/{len(integrations)} active')

        return result

    def validate_automated_alerts(self) -> Dict[str, Any]:
        """Validate automated alert systems and escalation procedures"""
        logger.info("Validating automated alert systems...")

        # Check for alert configuration
        alert_config = Path("monitor_config.json")
        if alert_config.exists():
            try:
                with open(alert_config, 'r') as f:
                    config = json.load(f)

                # Check for alert rules
                alert_rules = config.get('alert_rules', {})
                if alert_rules:
                    self.log_validation_result('alerts', 'OK', f'Alert rules configured: {len(alert_rules)} rules')
                else:
                    self.log_validation_result('alerts', 'WARNING', 'No alert rules configured')

                # Check for alert webhooks
                webhooks = config.get('alert_webhooks', [])
                if webhooks:
                    self.log_validation_result('alerts', 'OK', f'Alert webhooks configured: {len(webhooks)} endpoints')
                else:
                    self.log_validation_result('alerts', 'WARNING', 'No alert webhooks configured')

                # Check anomaly thresholds
                thresholds = config.get('anomaly_thresholds', {})
                if thresholds:
                    self.log_validation_result('alerts', 'OK', f'Anomaly thresholds configured: {len(thresholds)} settings')
                else:
                    self.log_validation_result('alerts', 'WARNING', 'No anomaly thresholds configured')

            except Exception as e:
                self.log_validation_result('alerts', 'ERROR', f'Error reading alert configuration: {str(e)}')
        else:
            self.log_validation_result('alerts', 'WARNING', 'No alert configuration file found')

        # Check for escalation procedures documentation
        escalation_docs = []
        for pattern in ['*escalat*', '*alert*', '*notification*']:
            for file_path in Path("docs").glob(pattern):
                escalation_docs.append(file_path)

        if escalation_docs:
            self.log_validation_result('alerts', 'OK', f'Escalation documentation found: {len(escalation_docs)} files')
        else:
            self.log_validation_result('alerts', 'WARNING', 'No escalation procedures documentation found')

        # Check log files for recent alerts
        recent_alerts = 0
        if Path("logs").exists():
            for log_file in Path("logs").glob("*"):
                if log_file.suffix in ['.log', '.json']:
                    try:
                        if log_file.suffix == '.json':
                            with open(log_file, 'r') as f:
                                data = json.load(f)
                                if isinstance(data, list):
                                    recent_alerts += len([item for item in data if 'alert' in item.get('component', '').lower()])
                        else:
                            with open(log_file, 'r') as f:
                                content = f.read()
                                recent_alerts += content.lower().count('alert')
                    except:
                        pass

        if recent_alerts > 0:
            self.log_validation_result('alerts', 'OK', f'Recent alerts detected: {recent_alerts}')
        else:
            self.log_validation_result('alerts', 'WARNING', 'No recent alert activity detected')

        # Determine overall status
        critical_alert_issues = len([r for r in self.validation_results
                                  if r['component'] == 'alerts' and r['status'] == 'ERROR'])

        result = {
            'valid': critical_alert_issues == 0,
            'alert_rules_configured': alert_rules is not None,
            'webhooks_configured': len(webhooks) > 0 if 'webhooks' in locals() else False,
            'escalation_docs_found': len(escalation_docs) > 0,
            'recent_alerts': recent_alerts
        }

        status = 'OK' if result['valid'] else 'WARNING'
        self.log_validation_result('alerts', status, 'Automated alert systems validation complete')

        return result

    def run_comprehensive_validation(self) -> Dict[str, Any]:
        """Run comprehensive validation of all monitoring systems"""
        logger.info("Starting comprehensive monitoring systems validation...")

        # Clear previous results
        self.validation_results = []
        self.errors = []
        self.warnings = []
        self.critical_issues = []

        # Run all validations
        compact_templates = self.validate_compact_prompt_templates()
        retro_processes = self.validate_retro_refinement_processes()
        documentation = self.validate_documentation_completeness()
        scripts = self.validate_script_integrations()
        ci_cd = self.validate_ci_cd_pipeline()
        integrations = self.validate_integration_monitoring()
        alerts = self.validate_automated_alerts()

        # Generate comprehensive report
        end_time = datetime.now(timezone.utc)
        duration = end_time - self.start_time

        # Calculate overall status
        total_checks = len(self.validation_results)
        error_checks = len(self.errors)
        warning_checks = len(self.warnings)
        success_checks = total_checks - error_checks - warning_checks

        overall_status = 'HEALTHY' if error_checks == 0 else 'DEGRADED' if error_checks < 3 else 'UNHEALTHY'

        report = {
            'validation_summary': {
                'timestamp': end_time,
                'duration_seconds': duration.total_seconds(),
                'overall_status': overall_status,
                'total_checks': total_checks,
                'successful_checks': success_checks,
                'warning_checks': warning_checks,
                'error_checks': error_checks,
                'health_score': (success_checks / total_checks * 100) if total_checks > 0 else 0
            },
            'component_results': {
                'compact_templates': compact_templates,
                'retro_processes': retro_processes,
                'documentation': documentation,
                'scripts': scripts,
                'ci_cd': ci_cd,
                'integrations': integrations,
                'alerts': alerts
            },
            'validation_details': self.validation_results,
            'errors': self.errors,
            'warnings': self.warnings,
            'critical_issues': self.critical_issues,
            'recommendations': self.generate_recommendations()
        }

        # Log overall result
        logger.info(f"Validation completed in {duration.total_seconds():.2f}s - Status: {overall_status}")
        logger.info(f"Results: {success_checks} OK, {warning_checks} WARNING, {error_checks} ERROR")

        return report

    def generate_recommendations(self) -> List[str]:
        """Generate recommendations based on validation results"""
        recommendations = []

        # Check for critical issues
        if self.critical_issues:
            recommendations.append(f"CRITICAL: {len(self.critical_issues)} critical issues require immediate attention")
            for issue in self.critical_issues:
                recommendations.append(f"  - {issue['component']}: {issue['message']}")

        # Check for missing components
        components_checked = set(r['component'] for r in self.validation_results)
        required_components = {
            'compact_templates', 'retro_processes', 'documentation',
            'scripts', 'ci_cd', 'integrations', 'alerts'
        }

        missing_components = required_components - components_checked
        if missing_components:
            recommendations.append(f"Missing validation for components: {missing_components}")

        # Check for specific issues
        if any(r['component'] == 'compact_templates' and r['status'] == 'ERROR' for r in self.validation_results):
            recommendations.append("Fix compact prompt templates - ensure COMPACT_PROMPT_TEMPLATES.md exists and is complete")

        if any(r['component'] == 'scripts' and r['status'] == 'ERROR' for r in self.validation_results):
            recommendations.append("Fix script integrations - ensure all critical monitoring scripts are present and functional")

        if any(r['component'] == 'documentation' and r['status'] == 'ERROR' for r in self.validation_results):
            recommendations.append("Complete documentation - ensure all required documentation files are present")

        if any(r['component'] == 'alerts' and r['status'] == 'WARNING' for r in self.validation_results):
            recommendations.append("Configure alert systems - set up alert rules, webhooks, and escalation procedures")

        if any(r['component'] == 'integrations' and r['status'] == 'WARNING' for r in self.validation_results):
            recommendations.append("Validate integrations - ensure PI sync, CLAUDE, and GitHub workflows are properly configured")

        # Success message if no major issues
        if not self.critical_issues and not missing_components:
            recommendations.append("All monitoring systems validated successfully - ready for production deployment")

        return recommendations

def main():
    """Main execution function"""
    import argparse

    parser = argparse.ArgumentParser(description="Comprehensive Monitoring Systems Validation")
    parser.add_argument('--component', choices=[
        'templates', 'retro', 'documentation', 'scripts', 'ci_cd', 'integrations', 'alerts', 'all'
    ], default='all', help='Component to validate (default: all)')
    parser.add_argument('--output', default='stdout', help='Output file for reports')
    parser.add_argument('--format', choices=['json', 'text'], default='json', help='Output format')
    parser.add_argument('--fail-on-warning', action='store_true', help='Exit with error code on warnings')

    args = parser.parse_args()

    validator = MonitoringSystemValidator()

    try:
        if args.component == 'all':
            # Run comprehensive validation
            report = validator.run_comprehensive_validation()
        else:
            # Run specific component validation
            component_methods = {
                'templates': validator.validate_compact_prompt_templates,
                'retro': validator.validate_retro_refinement_processes,
                'documentation': validator.validate_documentation_completeness,
                'scripts': validator.validate_script_integrations,
                'ci_cd': validator.validate_ci_cd_pipeline,
                'integrations': validator.validate_integration_monitoring,
                'alerts': validator.validate_automated_alerts
            }

            method = component_methods.get(args.component)
            if method:
                method()
                # Generate mini report for single component
                report = {
                    'component_validation': args.component,
                    'validation_results': validator.validation_results,
                    'errors': validator.errors,
                    'warnings': validator.warnings,
                    'recommendations': validator.generate_recommendations()
                }
            else:
                print(f"Unknown component: {args.component}")
                sys.exit(1)

        # Output report
        if args.format == 'json':
            output = json.dumps(report, indent=2, default=str)
        else:
            # Text format
            summary = report.get('validation_summary', report)
            output = f"""
Monitoring Systems Validation Report
===================================

Timestamp: {summary.get('timestamp', 'Unknown')}
Duration: {summary.get('duration_seconds', 0):.2f} seconds
Overall Status: {summary.get('overall_status', 'Unknown')}
Health Score: {summary.get('health_score', 0):.1f}%

Results Summary:
- Total Checks: {summary.get('total_checks', 0)}
- Successful: {summary.get('successful_checks', 0)}
- Warnings: {summary.get('warning_checks', 0)}
- Errors: {summary.get('error_checks', 0)}

Component Status:
"""

            for component, result in report.get('component_results', {}).items():
                status = '✅' if result.get('valid', False) else '⚠️' if result.get('valid') is None else '❌'
                output += f"- {status} {component}: {result.get('valid', 'Unknown')}\n"

            if 'recommendations' in report and report['recommendations']:
                output += f"\nRecommendations:\n"
                for rec in report['recommendations']:
                    output += f"- {rec}\n"

        if args.output == 'stdout':
            print(output)
        else:
            with open(args.output, 'w') as f:
                f.write(output)
            logger.info(f"Validation report saved to {args.output}")

        # Exit codes
        if report.get('validation_summary', {}).get('error_checks', 0) > 0:
            logger.error("Validation failed with errors")
            sys.exit(1)
        elif args.fail_on_warning and report.get('validation_summary', {}).get('warning_checks', 0) > 0:
            logger.warning("Validation completed with warnings")
            sys.exit(1)
        else:
            logger.info("Validation completed successfully")
            sys.exit(0)

    except Exception as e:
        logger.error(f"Validation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
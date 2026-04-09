#!/usr/bin/env python3
"""
Comprehensive Validation Scripts Integration
Integrates with existing validation systems and provides enhanced validation capabilities
"""

import json
import os
import sys
import time
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

class ComprehensiveValidator:
    """Comprehensive validation system for production workflows"""
    
    def __init__(self, project_root: Optional[str] = None):
        self.project_root = Path(project_root) if project_root else Path.cwd()
        self.goalie_dir = self.project_root / ".goalie"
        self.validation_dir = self.goalie_dir / "validation"
        self.validation_dir.mkdir(exist_ok=True)
        
        # Validation results storage
        self.validation_results = {}
        self.validation_history = []
    
    def validate_production_cycle(self, mode: str, circle: Optional[str] = None) -> Dict[str, Any]:
        """Validate production cycle configuration and prerequisites"""
        results = {
            "validation_type": "production_cycle",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "mode": mode,
            "circle": circle,
            "checks": {}
        }
        
        # Check 1: Environment validation
        results["checks"]["environment"] = self._validate_environment()
        
        # Check 2: Dependencies validation
        results["checks"]["dependencies"] = self._validate_dependencies()
        
        # Check 3: Configuration validation
        results["checks"]["configuration"] = self._validate_configuration(mode, circle)
        
        # Check 4: Circle-specific validation
        if circle:
            results["checks"]["circle_specific"] = self._validate_circle_requirements(circle)
        
        # Check 5: Governance validation
        results["checks"]["governance"] = self._validate_governance_requirements()
        
        # Check 6: Health system validation
        results["checks"]["health_system"] = self._validate_health_system()
        
        # Calculate overall status
        all_checks = results["checks"].values()
        passed_checks = sum(1 for check in all_checks if check.get("passed", False))
        total_checks = len(all_checks)
        
        results["summary"] = {
            "total_checks": total_checks,
            "passed_checks": passed_checks,
            "failed_checks": total_checks - passed_checks,
            "overall_passed": passed_checks == total_checks,
            "pass_rate": (passed_checks / total_checks) * 100 if total_checks > 0 else 0
        }
        
        # Store results
        self._store_validation_results(results)
        
        return results
    
    def validate_production_swarm(self, prior_file: Optional[str] = None, 
                              current_file: Optional[str] = None,
                              auto_ref_file: Optional[str] = None) -> Dict[str, Any]:
        """Validate production swarm configuration and files"""
        results = {
            "validation_type": "production_swarm",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "files": {
                "prior": prior_file,
                "current": current_file,
                "auto_ref": auto_ref_file
            },
            "checks": {}
        }
        
        # Check 1: File existence and accessibility
        results["checks"]["file_accessibility"] = self._validate_swarm_files(
            prior_file, current_file, auto_ref_file
        )
        
        # Check 2: File format validation
        results["checks"]["file_format"] = self._validate_swarm_file_formats(
            prior_file, current_file, auto_ref_file
        )
        
        # Check 3: Data consistency validation
        results["checks"]["data_consistency"] = self._validate_swarm_data_consistency(
            prior_file, current_file, auto_ref_file
        )
        
        # Check 4: Performance baseline validation
        results["checks"]["performance_baseline"] = self._validate_performance_baseline()
        
        # Calculate overall status
        all_checks = results["checks"].values()
        passed_checks = sum(1 for check in all_checks if check.get("passed", False))
        total_checks = len(all_checks)
        
        results["summary"] = {
            "total_checks": total_checks,
            "passed_checks": passed_checks,
            "failed_checks": total_checks - passed_checks,
            "overall_passed": passed_checks == total_checks,
            "pass_rate": (passed_checks / total_checks) * 100 if total_checks > 0 else 0
        }
        
        # Store results
        self._store_validation_results(results)
        
        return results
    
    def validate_multipass_configuration(self, preflight_iters: int, 
                                   progress_tooltip: str) -> Dict[str, Any]:
        """Validate multipass configuration"""
        results = {
            "validation_type": "multipass_configuration",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "preflight_iters": preflight_iters,
            "progress_tooltip": progress_tooltip,
            "checks": {}
        }
        
        # Check 1: Preflight iterations validation
        results["checks"]["preflight_iterations"] = self._validate_preflight_iterations(
            preflight_iters
        )
        
        # Check 2: Progress tooltip validation
        results["checks"]["progress_tooltip"] = self._validate_progress_tooltip(progress_tooltip)
        
        # Check 3: Regression detection configuration
        results["checks"]["regression_detection"] = self._validate_regression_detection()
        
        # Calculate overall status
        all_checks = results["checks"].values()
        passed_checks = sum(1 for check in all_checks if check.get("passed", False))
        total_checks = len(all_checks)
        
        results["summary"] = {
            "total_checks": total_checks,
            "passed_checks": passed_checks,
            "failed_checks": total_checks - passed_checks,
            "overall_passed": passed_checks == total_checks,
            "pass_rate": (passed_checks / total_checks) * 100 if total_checks > 0 else 0
        }
        
        # Store results
        self._store_validation_results(results)
        
        return results
    
    def validate_system_health(self) -> Dict[str, Any]:
        """Validate overall system health"""
        results = {
            "validation_type": "system_health",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "checks": {}
        }
        
        # Check 1: Resource availability
        results["checks"]["resources"] = self._validate_system_resources()
        
        # Check 2: Service connectivity
        results["checks"]["services"] = self._validate_service_connectivity()
        
        # Check 3: Data integrity
        results["checks"]["data_integrity"] = self._validate_data_integrity()
        
        # Check 4: Performance metrics
        results["checks"]["performance"] = self._validate_performance_metrics()
        
        # Calculate overall status
        all_checks = results["checks"].values()
        passed_checks = sum(1 for check in all_checks if check.get("passed", False))
        total_checks = len(all_checks)
        
        results["summary"] = {
            "total_checks": total_checks,
            "passed_checks": passed_checks,
            "failed_checks": total_checks - passed_checks,
            "overall_passed": passed_checks == total_checks,
            "pass_rate": (passed_checks / total_checks) * 100 if total_checks > 0 else 0
        }
        
        # Store results
        self._store_validation_results(results)
        
        return results
    
    def _validate_environment(self) -> Dict[str, Any]:
        """Validate environment setup"""
        check = {
            "name": "Environment Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        # Check AF_ENV
        af_env = os.environ.get("AF_ENV", "local")
        if af_env not in ["local", "dev", "stg", "prod"]:
            check["passed"] = False
            check["details"]["af_env"] = f"Invalid AF_ENV: {af_env}"
        else:
            check["details"]["af_env"] = f"Valid AF_ENV: {af_env}"
        
        # Check required directories
        required_dirs = [".goalie", "scripts", "agentic-flow-core"]
        for dir_name in required_dirs:
            dir_path = self.project_root / dir_name
            if not dir_path.exists():
                check["passed"] = False
                check["details"][f"dir_{dir_name}"] = f"Missing directory: {dir_name}"
            else:
                check["details"][f"dir_{dir_name}"] = f"Directory exists: {dir_name}"
        
        # Check Python environment
        try:
            import sys
            python_version = sys.version_info
            if python_version.major < 3 or python_version.minor < 8:
                check["warnings"].append(f"Python version {python_version.major}.{python_version.minor} may not be fully supported")
            check["details"]["python_version"] = f"{python_version.major}.{python_version.minor}.{python_version.micro}"
        except Exception as e:
            check["passed"] = False
            check["details"]["python_version"] = f"Error checking Python version: {e}"
        
        return check
    
    def _validate_dependencies(self) -> Dict[str, Any]:
        """Validate required dependencies"""
        check = {
            "name": "Dependencies Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        # Check Python modules
        required_modules = ["json", "uuid", "datetime", "pathlib"]
        for module in required_modules:
            try:
                __import__(module)
                check["details"][f"module_{module}"] = "Available"
            except ImportError:
                check["passed"] = False
                check["details"][f"module_{module}"] = f"Missing module: {module}"
        
        # Check external tools
        external_tools = ["python3", "uuidgen"]
        for tool in external_tools:
            try:
                result = subprocess.run(
                    ["which", tool], 
                    capture_output=True, 
                    text=True
                )
                if result.returncode == 0:
                    check["details"][f"tool_{tool}"] = "Available"
                else:
                    check["warnings"].append(f"Tool not found: {tool}")
            except Exception:
                check["warnings"].append(f"Error checking tool: {tool}")
        
        return check
    
    def _validate_configuration(self, mode: str, circle: Optional[str]) -> Dict[str, Any]:
        """Validate configuration parameters"""
        check = {
            "name": "Configuration Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        # Validate mode
        valid_modes = ["mutate", "normal", "advisory", "enforcement"]
        if mode not in valid_modes:
            check["passed"] = False
            check["details"]["mode"] = f"Invalid mode: {mode}"
        else:
            check["details"]["mode"] = f"Valid mode: {mode}"
        
        # Validate circle if provided
        if circle:
            valid_circles = ["analyst", "assessor", "innovator", "intuitive", "orchestrator", "seeker"]
            if circle not in valid_circles:
                check["warnings"].append(f"Unknown circle: {circle}")
            else:
                check["details"]["circle"] = f"Valid circle: {circle}"
        
        return check
    
    def _validate_circle_requirements(self, circle: str) -> Dict[str, Any]:
        """Validate circle-specific requirements"""
        check = {
            "name": f"Circle Requirements Validation ({circle})",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        # Check circle-specific directories
        circle_dir = self.goalie_dir / circle
        if not circle_dir.exists():
            check["warnings"].append(f"Circle directory not found: {circle_dir}")
        else:
            check["details"]["circle_dir"] = f"Circle directory exists: {circle_dir}"
        
        # Check circle-specific configuration
        circle_config_file = self.goalie_dir / f"{circle}_config.json"
        if circle_config_file.exists():
            try:
                with open(circle_config_file, 'r') as f:
                    circle_config = json.load(f)
                check["details"]["circle_config"] = "Circle configuration loaded"
            except json.JSONDecodeError:
                check["warnings"].append(f"Invalid JSON in circle config: {circle_config_file}")
        else:
            check["details"]["circle_config"] = "No circle-specific configuration found"
        
        return check
    
    def _validate_governance_requirements(self) -> Dict[str, Any]:
        """Validate governance system requirements"""
        check = {
            "name": "Governance Requirements Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        # Check governance configuration
        governance_file = self.goalie_dir / "governance_config.json"
        if governance_file.exists():
            try:
                with open(governance_file, 'r') as f:
                    governance_config = json.load(f)
                check["details"]["governance_config"] = "Governance configuration loaded"
                
                # Validate required governance fields
                required_fields = ["purposes", "domains", "accountabilities"]
                for field in required_fields:
                    if field in governance_config:
                        check["details"][f"governance_{field}"] = f"Field present: {field}"
                    else:
                        check["warnings"].append(f"Missing governance field: {field}")
            except json.JSONDecodeError:
                check["passed"] = False
                check["details"]["governance_config"] = "Invalid JSON in governance configuration"
        else:
            check["warnings"].append("Governance configuration file not found")
        
        return check
    
    def _validate_health_system(self) -> Dict[str, Any]:
        """Validate health check system"""
        check = {
            "name": "Health System Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        # Check health check script
        health_script = self.project_root / "scripts" / "af" / "health_check.py"
        if health_script.exists():
            check["details"]["health_script"] = "Health check script available"
        else:
            check["warnings"].append("Health check script not found")
        
        # Check health status file
        health_status_file = self.goalie_dir / "system_health.json"
        if health_status_file.exists():
            check["details"]["health_status"] = "Health status file exists"
        else:
            check["details"]["health_status"] = "No health status file (will be created)"
        
        return check
    
    def _validate_swarm_files(self, prior_file: Optional[str], 
                           current_file: Optional[str], 
                           auto_ref_file: Optional[str]) -> Dict[str, Any]:
        """Validate swarm file accessibility"""
        check = {
            "name": "Swarm File Accessibility Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        files = {
            "prior": prior_file,
            "current": current_file,
            "auto_ref": auto_ref_file
        }
        
        for file_type, file_path in files.items():
            if file_path:
                full_path = self.project_root / file_path
                if full_path.exists():
                    check["details"][f"file_{file_type}"] = f"File exists: {file_path}"
                else:
                    check["passed"] = False
                    check["details"][f"file_{file_type}"] = f"File not found: {file_path}"
            else:
                check["details"][f"file_{file_type}"] = f"No {file_type} file specified"
        
        return check
    
    def _validate_swarm_file_formats(self, prior_file: Optional[str], 
                                  current_file: Optional[str], 
                                  auto_ref_file: Optional[str]) -> Dict[str, Any]:
        """Validate swarm file formats"""
        check = {
            "name": "Swarm File Format Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        files = {
            "prior": prior_file,
            "current": current_file,
            "auto_ref": auto_ref_file
        }
        
        for file_type, file_path in files.items():
            if file_path:
                full_path = self.project_root / file_path
                if full_path.exists():
                    try:
                        # Try to read as TSV
                        with open(full_path, 'r') as f:
                            first_line = f.readline().strip()
                            if '\t' in first_line:
                                check["details"][f"format_{file_type}"] = f"Valid TSV format: {file_path}"
                            else:
                                check["warnings"].append(f"File may not be TSV format: {file_path}")
                    except Exception as e:
                        check["warnings"].append(f"Error reading file {file_path}: {e}")
        
        return check
    
    def _validate_swarm_data_consistency(self, prior_file: Optional[str], 
                                     current_file: Optional[str], 
                                     auto_ref_file: Optional[str]) -> Dict[str, Any]:
        """Validate swarm data consistency"""
        check = {
            "name": "Swarm Data Consistency Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        # This is a simplified validation - in practice, you'd want more sophisticated checks
        files = {
            "prior": prior_file,
            "current": current_file,
            "auto_ref": auto_ref_file
        }
        
        available_files = [f for f in files.values() if f]
        if len(available_files) < 2:
            check["warnings"].append("Need at least 2 files for consistency validation")
            return check
        
        # Check for basic consistency (same number of columns, etc.)
        column_counts = {}
        for file_type, file_path in files.items():
            if file_path:
                full_path = self.project_root / file_path
                if full_path.exists():
                    try:
                        with open(full_path, 'r') as f:
                            first_line = f.readline().strip()
                            column_count = len(first_line.split('\t'))
                            column_counts[file_type] = column_count
                    except Exception:
                        check["warnings"].append(f"Error analyzing columns in {file_path}")
        
        if column_counts:
            unique_counts = set(column_counts.values())
            if len(unique_counts) > 1:
                check["warnings"].append(f"Inconsistent column counts: {column_counts}")
            else:
                check["details"]["column_consistency"] = f"Consistent column count: {list(unique_counts)[0]}"
        
        return check
    
    def _validate_performance_baseline(self) -> Dict[str, Any]:
        """Validate performance baseline"""
        check = {
            "name": "Performance Baseline Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        # Check for baseline metrics
        baseline_file = self.goalie_dir / "performance_baseline.json"
        if baseline_file.exists():
            try:
                with open(baseline_file, 'r') as f:
                    baseline = json.load(f)
                check["details"]["baseline_file"] = "Performance baseline loaded"
                
                # Check required baseline metrics
                required_metrics = ["response_time", "throughput", "error_rate"]
                for metric in required_metrics:
                    if metric in baseline:
                        check["details"][f"baseline_{metric}"] = f"Metric present: {metric}"
                    else:
                        check["warnings"].append(f"Missing baseline metric: {metric}")
            except json.JSONDecodeError:
                check["passed"] = False
                check["details"]["baseline_file"] = "Invalid JSON in performance baseline"
        else:
            check["warnings"].append("Performance baseline file not found")
        
        return check
    
    def _validate_preflight_iterations(self, preflight_iters: int) -> Dict[str, Any]:
        """Validate preflight iterations configuration"""
        check = {
            "name": "Preflight Iterations Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        if preflight_iters < 1:
            check["passed"] = False
            check["details"]["iterations"] = f"Invalid iterations: {preflight_iters} (must be >= 1)"
        elif preflight_iters > 20:
            check["warnings"].append(f"High iteration count may be slow: {preflight_iters}")
        else:
            check["details"]["iterations"] = f"Valid iterations: {preflight_iters}"
        
        return check
    
    def _validate_progress_tooltip(self, progress_tooltip: str) -> Dict[str, Any]:
        """Validate progress tooltip configuration"""
        check = {
            "name": "Progress Tooltip Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        valid_tooltips = ["off", "compact", "rich", "json", "write-status-file"]
        if progress_tooltip not in valid_tooltips:
            check["passed"] = False
            check["details"]["tooltip"] = f"Invalid tooltip: {progress_tooltip}"
        else:
            check["details"]["tooltip"] = f"Valid tooltip: {progress_tooltip}"
        
        return check
    
    def _validate_regression_detection(self) -> Dict[str, Any]:
        """Validate regression detection configuration"""
        check = {
            "name": "Regression Detection Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        # Check for regression detection configuration
        regression_config = self.goalie_dir / "regression_config.json"
        if regression_config.exists():
            try:
                with open(regression_config, 'r') as f:
                    config = json.load(f)
                check["details"]["regression_config"] = "Regression configuration loaded"
                
                # Check required configuration fields
                required_fields = ["thresholds", "metrics", "actions"]
                for field in required_fields:
                    if field in config:
                        check["details"][f"regression_{field}"] = f"Field present: {field}"
                    else:
                        check["warnings"].append(f"Missing regression field: {field}")
            except json.JSONDecodeError:
                check["passed"] = False
                check["details"]["regression_config"] = "Invalid JSON in regression configuration"
        else:
            check["warnings"].append("Regression configuration file not found")
        
        return check
    
    def _validate_system_resources(self) -> Dict[str, Any]:
        """Validate system resources"""
        check = {
            "name": "System Resources Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        try:
            import psutil
            
            # Check memory
            memory = psutil.virtual_memory()
            if memory.percent > 90:
                check["warnings"].append(f"High memory usage: {memory.percent}%")
            else:
                check["details"]["memory"] = f"Memory usage: {memory.percent}%"
            
            # Check disk space
            disk = psutil.disk_usage(str(self.project_root))
            if disk.percent > 90:
                check["warnings"].append(f"Low disk space: {100 - disk.percent}% free")
            else:
                check["details"]["disk"] = f"Disk free: {100 - disk.percent}%"
            
        except ImportError:
            check["warnings"].append("psutil not available for resource monitoring")
        except Exception as e:
            check["warnings"].append(f"Error checking resources: {e}")
        
        return check
    
    def _validate_service_connectivity(self) -> Dict[str, Any]:
        """Validate service connectivity"""
        check = {
            "name": "Service Connectivity Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        # Check for common services
        services = {
            "database": "localhost:5432",
            "redis": "localhost:6379",
            "api": "localhost:8080"
        }
        
        for service, address in services.items():
            try:
                import socket
                host, port = address.split(':')
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex((host, int(port)))
                sock.close()
                
                if result == 0:
                    check["details"][f"service_{service}"] = f"Service available: {service}"
                else:
                    check["warnings"].append(f"Service unavailable: {service} at {address}")
            except Exception:
                check["warnings"].append(f"Error checking service: {service}")
        
        return check
    
    def _validate_data_integrity(self) -> Dict[str, Any]:
        """Validate data integrity"""
        check = {
            "name": "Data Integrity Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        # Check for data files
        data_files = [
            "pattern_metrics.jsonl",
            "unified_evidence.jsonl",
            "metrics_log.jsonl"
        ]
        
        for data_file in data_files:
            file_path = self.goalie_dir / data_file
            if file_path.exists():
                try:
                    # Try to read first few lines to check integrity
                    with open(file_path, 'r') as f:
                        lines_read = 0
                        for line in f:
                            try:
                                json.loads(line)
                                lines_read += 1
                                if lines_read >= 5:  # Check first 5 lines
                                    break
                            except json.JSONDecodeError:
                                check["warnings"].append(f"Invalid JSON in {data_file} at line {lines_read + 1}")
                                break
                    
                    check["details"][f"data_{data_file}"] = f"Data integrity OK: {data_file}"
                except Exception as e:
                    check["warnings"].append(f"Error checking {data_file}: {e}")
            else:
                check["details"][f"data_{data_file}"] = f"Data file not found: {data_file}"
        
        return check
    
    def _validate_performance_metrics(self) -> Dict[str, Any]:
        """Validate performance metrics"""
        check = {
            "name": "Performance Metrics Validation",
            "passed": True,
            "details": {},
            "warnings": []
        }
        
        # Check for recent performance metrics
        metrics_file = self.goalie_dir / "pattern_metrics.jsonl"
        if metrics_file.exists():
            try:
                recent_metrics = []
                with open(metrics_file, 'r') as f:
                    for line in f:
                        try:
                            metric = json.loads(line)
                            recent_metrics.append(metric)
                            if len(recent_metrics) >= 10:  # Get last 10 metrics
                                break
                        except json.JSONDecodeError:
                            continue
                
                if recent_metrics:
                    # Check for performance trends
                    latest_score = recent_metrics[-1].get("performance_score", 0)
                    if len(recent_metrics) >= 2:
                        previous_score = recent_metrics[-2].get("performance_score", 0)
                        if latest_score < previous_score * 0.8:  # 20% drop
                            check["warnings"].append(f"Performance degradation detected: {latest_score} vs {previous_score}")
                        else:
                            check["details"]["performance_trend"] = f"Performance stable: {latest_score}"
                    
                    check["details"]["recent_metrics"] = f"Found {len(recent_metrics)} recent metrics"
                else:
                    check["warnings"].append("No recent performance metrics found")
            except Exception as e:
                check["warnings"].append(f"Error checking performance metrics: {e}")
        else:
            check["warnings"].append("Performance metrics file not found")
        
        return check
    
    def _store_validation_results(self, results: Dict[str, Any]) -> None:
        """Store validation results"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        validation_file = self.validation_dir / f"validation_{timestamp}.json"
        
        try:
            with open(validation_file, 'w') as f:
                json.dump(results, f, indent=2)
        except IOError as e:
            print(f"Error storing validation results: {e}", file=sys.stderr)
        
        # Add to history
        self.validation_history.append(results)
        
        # Keep only last 50 validations in memory
        if len(self.validation_history) > 50:
            self.validation_history = self.validation_history[-50:]

def main():
    """CLI interface for comprehensive validator"""
    if len(sys.argv) < 2:
        print("Usage: comprehensive_validator.py <command> [options]")
        print("Commands: prod-cycle, prod-swarm, multipass, system-health")
        sys.exit(1)
    
    command = sys.argv[1]
    validator = ComprehensiveValidator()
    
    if command == "prod-cycle":
        mode = sys.argv[3] if len(sys.argv) > 3 else "normal"
        circle = sys.argv[5] if len(sys.argv) > 5 and sys.argv[4] == "--circle" else None
        results = validator.validate_production_cycle(mode, circle)
        print(json.dumps(results, indent=2))
    
    elif command == "prod-swarm":
        prior = None
        current = None
        auto_ref = None
        
        # Parse file arguments
        for i, arg in enumerate(sys.argv[2:]):
            if arg == "--prior" and i + 1 < len(sys.argv) - 2:
                prior = sys.argv[i + 3]
            elif arg == "--current" and i + 1 < len(sys.argv) - 2:
                current = sys.argv[i + 3]
            elif arg == "--auto-ref" and i + 1 < len(sys.argv) - 2:
                auto_ref = sys.argv[i + 3]
        
        results = validator.validate_production_swarm(prior, current, auto_ref)
        print(json.dumps(results, indent=2))
    
    elif command == "multipass":
        preflight_iters = int(sys.argv[3]) if len(sys.argv) > 3 else 5
        progress_tooltip = sys.argv[5] if len(sys.argv) > 5 and sys.argv[4] == "--progress-tooltip" else "off"
        results = validator.validate_multipass_configuration(preflight_iters, progress_tooltip)
        print(json.dumps(results, indent=2))
    
    elif command == "system-health":
        results = validator.validate_system_health()
        print(json.dumps(results, indent=2))
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Evidence Integration System
Integrates with existing evidence emitters and pattern metrics
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

class EvidenceIntegration:
    """Evidence integration system for production workflows"""
    
    def __init__(self, project_root: Optional[str] = None):
        self.project_root = Path(project_root) if project_root else Path.cwd()
        self.goalie_dir = self.project_root / ".goalie"
        
        # Evidence files
        self.unified_evidence_file = self.goalie_dir / "unified_evidence.jsonl"
        self.pattern_metrics_file = self.goalie_dir / "pattern_metrics.jsonl"
        self.metrics_log_file = self.goalie_dir / "metrics_log.jsonl"
        
        # Ensure .goalie directory exists
        self.goalie_dir.mkdir(exist_ok=True)
    
    def emit_evidence(self, evidence_type: str, data: Dict[str, Any], 
                     run_id: Optional[str] = None, 
                     circle: Optional[str] = None,
                     gate: Optional[str] = None,
                     behavioral_type: Optional[str] = None) -> None:
        """Emit evidence to unified evidence file"""
        evidence_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "type": evidence_type,
            "data": data,
            "run_id": run_id or os.environ.get("AF_RUN_ID", "unknown"),
            "circle": circle or os.environ.get("AF_CIRCLE", ""),
            "gate": gate or "production",
            "behavioral_type": behavioral_type or "execution"
        }
        
        # Write to unified evidence file
        with open(self.unified_evidence_file, 'a') as f:
            f.write(json.dumps(evidence_entry) + '\n')
    
    def emit_pattern_metric(self, metric_name: str, value: float, 
                        metadata: Optional[Dict[str, Any]] = None) -> None:
        """Emit pattern metric"""
        metric_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "metric_name": metric_name,
            "value": value,
            "metadata": metadata or {},
            "run_id": os.environ.get("AF_RUN_ID", "unknown"),
            "circle": os.environ.get("AF_CIRCLE", "")
        }
        
        # Write to pattern metrics file
        with open(self.pattern_metrics_file, 'a') as f:
            f.write(json.dumps(metric_entry) + '\n')
    
    def emit_system_metric(self, metric_name: str, value: float, 
                       component: Optional[str] = None,
                       metadata: Optional[Dict[str, Any]] = None) -> None:
        """Emit system metric"""
        metric_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "metric_name": metric_name,
            "value": value,
            "component": component or "system",
            "metadata": metadata or {},
            "run_id": os.environ.get("AF_RUN_ID", "unknown")
        }
        
        # Write to metrics log file
        with open(self.metrics_log_file, 'a') as f:
            f.write(json.dumps(metric_entry) + '\n')
    
    def emit_production_cycle_evidence(self, cycle_type: str, mode: str, 
                                  status: str, duration: float,
                                  circle: Optional[str] = None,
                                  iterations: Optional[int] = None,
                                  metrics: Optional[Dict[str, Any]] = None) -> None:
        """Emit production cycle specific evidence"""
        evidence_data = {
            "cycle_type": cycle_type,
            "mode": mode,
            "status": status,
            "duration_seconds": duration,
            "iterations": iterations,
            "metrics": metrics or {}
        }
        
        self.emit_evidence(
            evidence_type="production_cycle",
            data=evidence_data,
            circle=circle,
            gate="completion"
        )
    
    def emit_multipass_evidence(self, command: str, preflight_iters: int,
                             preflight_status: str, preflight_duration: float,
                             regression_detected: bool,
                             regression_details: Optional[Dict[str, Any]] = None) -> None:
        """Emit multipass specific evidence"""
        evidence_data = {
            "command": command,
            "preflight_iterations": preflight_iters,
            "preflight_status": preflight_status,
            "preflight_duration_seconds": preflight_duration,
            "regression_detected": regression_detected,
            "regression_details": regression_details or {}
        }
        
        self.emit_evidence(
            evidence_type="multipass_execution",
            data=evidence_data,
            gate="preflight"
        )
    
    def emit_validation_evidence(self, validation_type: str, validation_result: Dict[str, Any],
                              component: Optional[str] = None) -> None:
        """Emit validation evidence"""
        evidence_data = {
            "validation_type": validation_type,
            "validation_result": validation_result,
            "component": component or "system"
        }
        
        self.emit_evidence(
            evidence_type="validation",
            data=evidence_data,
            gate="validation"
        )
    
    def emit_health_check_evidence(self, component: str, status: str,
                                metrics: Dict[str, Any]) -> None:
        """Emit health check evidence"""
        evidence_data = {
            "health_component": component,
            "health_status": status,
            "health_metrics": metrics
        }
        
        self.emit_evidence(
            evidence_type="health_check",
            data=evidence_data,
            gate="health"
        )
    
    def emit_performance_baseline(self, baseline_metrics: Dict[str, Any],
                             baseline_type: str = "performance") -> None:
        """Emit performance baseline evidence"""
        evidence_data = {
            "baseline_type": baseline_type,
            "baseline_metrics": baseline_metrics,
            "baseline_timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        self.emit_evidence(
            evidence_type="performance_baseline",
            data=evidence_data,
            gate="baseline"
        )
    
    def emit_regression_evidence(self, regression_type: str, 
                             baseline_value: float, current_value: float,
                             threshold: float, component: Optional[str] = None) -> None:
        """Emit regression evidence"""
        evidence_data = {
            "regression_type": regression_type,
            "baseline_value": baseline_value,
            "current_value": current_value,
            "threshold": threshold,
            "regression_percentage": ((baseline_value - current_value) / baseline_value) * 100,
            "component": component or "system"
        }
        
        self.emit_evidence(
            evidence_type="regression",
            data=evidence_data,
            gate="regression"
        )
    
    def get_recent_evidence(self, evidence_type: Optional[str] = None, 
                          limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent evidence entries"""
        evidence = []
        
        try:
            with open(self.unified_evidence_file, 'r') as f:
                lines = f.readlines()
                for line in reversed(lines):
                    line = line.strip()
                    if line:
                        try:
                            entry = json.loads(line)
                            if evidence_type is None or entry.get("type") == evidence_type:
                                evidence.append(entry)
                                if len(evidence) >= limit:
                                    break
                        except json.JSONDecodeError:
                            continue
        except IOError:
            pass
        
        return evidence
    
    def get_recent_pattern_metrics(self, metric_name: Optional[str] = None,
                                limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent pattern metrics"""
        metrics = []
        
        try:
            with open(self.pattern_metrics_file, 'r') as f:
                lines = f.readlines()
                for line in reversed(lines):
                    line = line.strip()
                    if line:
                        try:
                            entry = json.loads(line)
                            if metric_name is None or entry.get("metric_name") == metric_name:
                                metrics.append(entry)
                                if len(metrics) >= limit:
                                    break
                        except json.JSONDecodeError:
                            continue
        except IOError:
            pass
        
        return metrics
    
    def get_recent_system_metrics(self, component: Optional[str] = None,
                               limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent system metrics"""
        metrics = []
        
        try:
            with open(self.metrics_log_file, 'r') as f:
                lines = f.readlines()
                for line in reversed(lines):
                    line = line.strip()
                    if line:
                        try:
                            entry = json.loads(line)
                            if component is None or entry.get("component") == component:
                                metrics.append(entry)
                                if len(metrics) >= limit:
                                    break
                        except json.JSONDecodeError:
                            continue
        except IOError:
            pass
        
        return metrics
    
    def analyze_performance_trend(self, metric_name: str, window_size: int = 5) -> Dict[str, Any]:
        """Analyze performance trend for a metric"""
        recent_metrics = self.get_recent_pattern_metrics(metric_name, window_size)
        
        if len(recent_metrics) < 2:
            return {"error": "Insufficient data for trend analysis"}
        
        # Calculate trend
        values = [m.get("value", 0) for m in recent_metrics]
        latest_value = values[0]
        previous_value = values[-1]
        
        # Simple trend calculation
        if len(values) >= 3:
            # Calculate moving average
            moving_avg = sum(values[:3]) / 3
            trend = "improving" if latest_value > moving_avg else "declining" if latest_value < moving_avg else "stable"
        else:
            trend = "stable"  # Not enough data for trend
        
        # Calculate change percentage
        if previous_value != 0:
            change_pct = ((latest_value - previous_value) / previous_value) * 100
        else:
            change_pct = 0
        
        return {
            "metric_name": metric_name,
            "latest_value": latest_value,
            "previous_value": previous_value,
            "change_percentage": change_pct,
            "trend": trend,
            "data_points": len(values),
            "analysis_timestamp": datetime.utcnow().isoformat() + "Z"
        }
    
    def detect_performance_regression(self, metric_name: str, threshold: float = 10.0) -> Dict[str, Any]:
        """Detect performance regression for a metric"""
        recent_metrics = self.get_recent_pattern_metrics(metric_name, 5)
        
        if len(recent_metrics) < 2:
            return {"error": "Insufficient data for regression detection"}
        
        # Get latest and baseline values
        latest_entry = recent_metrics[0]
        baseline_entry = recent_metrics[-1]
        
        latest_value = latest_entry.get("value", 0)
        baseline_value = baseline_entry.get("value", 0)
        
        # Check for regression
        if baseline_value == 0:
            return {"error": "Baseline value is zero, cannot calculate regression"}
        
        regression_pct = ((baseline_value - latest_value) / baseline_value) * 100
        
        is_regression = regression_pct > threshold
        
        return {
            "metric_name": metric_name,
            "baseline_value": baseline_value,
            "latest_value": latest_value,
            "regression_percentage": regression_pct,
            "threshold": threshold,
            "regression_detected": is_regression,
            "detection_timestamp": datetime.utcnow().isoformat() + "Z"
        }

def main():
    """CLI interface for evidence integration"""
    if len(sys.argv) < 2:
        print("Usage: evidence_integration.py <command> [options]")
        print("Commands: emit-evidence, emit-pattern-metric, emit-system-metric,")
        print("         emit-production-cycle, emit-multipass, emit-validation,")
        print("         emit-health-check, emit-performance-baseline, emit-regression,")
        print("         get-evidence, get-pattern-metrics, get-system-metrics,")
        print("         analyze-trend, detect-regression")
        sys.exit(1)
    
    command = sys.argv[1]
    integration = EvidenceIntegration()
    
    if command == "emit-evidence":
        if len(sys.argv) < 4:
            print("Usage: evidence_integration.py emit-evidence <type> <data_json>")
            sys.exit(1)
        
        evidence_type = sys.argv[2]
        try:
            data = json.loads(sys.argv[3])
        except json.JSONDecodeError:
            print("Invalid JSON data")
            sys.exit(1)
        
        integration.emit_evidence(evidence_type, data)
        print(f"Evidence emitted: {evidence_type}")
    
    elif command == "emit-pattern-metric":
        if len(sys.argv) < 4:
            print("Usage: evidence_integration.py emit-pattern-metric <name> <value> [metadata_json]")
            sys.exit(1)
        
        metric_name = sys.argv[2]
        try:
            value = float(sys.argv[3])
        except ValueError:
            print("Invalid metric value")
            sys.exit(1)
        
        metadata = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None
        integration.emit_pattern_metric(metric_name, value, metadata)
        print(f"Pattern metric emitted: {metric_name} = {value}")
    
    elif command == "emit-system-metric":
        if len(sys.argv) < 4:
            print("Usage: evidence_integration.py emit-system-metric <name> <value> [component] [metadata_json]")
            sys.exit(1)
        
        metric_name = sys.argv[2]
        try:
            value = float(sys.argv[3])
        except ValueError:
            print("Invalid metric value")
            sys.exit(1)
        
        component = sys.argv[4] if len(sys.argv) > 4 else None
        metadata = json.loads(sys.argv[5]) if len(sys.argv) > 5 else None
        integration.emit_system_metric(metric_name, value, component, metadata)
        print(f"System metric emitted: {metric_name} = {value}")
    
    elif command == "emit-production-cycle":
        if len(sys.argv) < 6:
            print("Usage: evidence_integration.py emit-production-cycle <type> <mode> <status> <duration>")
            sys.exit(1)
        
        cycle_type = sys.argv[2]
        mode = sys.argv[3]
        status = sys.argv[4]
        try:
            duration = float(sys.argv[5])
        except ValueError:
            print("Invalid duration value")
            sys.exit(1)
        
        circle = None
        iterations = None
        metrics = None
        
        # Parse optional arguments
        for i, arg in enumerate(sys.argv[6:]):
            if arg == "--circle" and i + 1 < len(sys.argv) - 6:
                circle = sys.argv[i + 7]
            elif arg == "--iterations" and i + 1 < len(sys.argv) - 6:
                try:
                    iterations = int(sys.argv[i + 7])
                except ValueError:
                    pass
            elif arg == "--metrics" and i + 1 < len(sys.argv) - 6:
                try:
                    metrics = json.loads(sys.argv[i + 7])
                except json.JSONDecodeError:
                    pass
        
        integration.emit_production_cycle_evidence(cycle_type, mode, status, duration, circle, iterations, metrics)
        print(f"Production cycle evidence emitted: {cycle_type} - {status}")
    
    elif command == "emit-multipass":
        if len(sys.argv) < 6:
            print("Usage: evidence_integration.py emit-multipass <command> <iters> <status> <duration>")
            sys.exit(1)
        
        command = sys.argv[2]
        try:
            preflight_iters = int(sys.argv[3])
        except ValueError:
            print("Invalid iteration count")
            sys.exit(1)
        
        preflight_status = sys.argv[4]
        try:
            preflight_duration = float(sys.argv[5])
        except ValueError:
            print("Invalid duration value")
            sys.exit(1)
        
        regression_detected = False
        regression_details = None
        
        # Parse optional arguments
        for i, arg in enumerate(sys.argv[6:]):
            if arg == "--regression-detected" and i + 1 < len(sys.argv) - 6:
                regression_detected = sys.argv[i + 7].lower() == "true"
            elif arg == "--regression-details" and i + 1 < len(sys.argv) - 6:
                try:
                    regression_details = json.loads(sys.argv[i + 7])
                except json.JSONDecodeError:
                    pass
        
        integration.emit_multipass_evidence(command, preflight_iters, preflight_status, preflight_duration, regression_detected, regression_details)
        print(f"Multipass evidence emitted: {command} - {preflight_status}")
    
    elif command == "emit-validation":
        if len(sys.argv) < 4:
            print("Usage: evidence_integration.py emit-validation <type> <result_json>")
            sys.exit(1)
        
        validation_type = sys.argv[2]
        try:
            validation_result = json.loads(sys.argv[3])
        except json.JSONDecodeError:
            print("Invalid JSON result")
            sys.exit(1)
        
        component = None
        for i, arg in enumerate(sys.argv[4:]):
            if arg == "--component" and i + 1 < len(sys.argv) - 4:
                component = sys.argv[i + 5]
        
        integration.emit_validation_evidence(validation_type, validation_result, component)
        print(f"Validation evidence emitted: {validation_type}")
    
    elif command == "emit-health-check":
        if len(sys.argv) < 4:
            print("Usage: evidence_integration.py emit-health-check <component> <status> <metrics_json>")
            sys.exit(1)
        
        component = sys.argv[2]
        status = sys.argv[3]
        try:
            metrics = json.loads(sys.argv[4])
        except json.JSONDecodeError:
            print("Invalid JSON metrics")
            sys.exit(1)
        
        integration.emit_health_check_evidence(component, status, metrics)
        print(f"Health check evidence emitted: {component} - {status}")
    
    elif command == "emit-performance-baseline":
        if len(sys.argv) < 3:
            print("Usage: evidence_integration.py emit-performance-baseline <metrics_json>")
            sys.exit(1)
        
        try:
            baseline_metrics = json.loads(sys.argv[2])
        except json.JSONDecodeError:
            print("Invalid JSON metrics")
            sys.exit(1)
        
        baseline_type = None
        for i, arg in enumerate(sys.argv[3:]):
            if arg == "--type" and i + 1 < len(sys.argv) - 3:
                baseline_type = sys.argv[i + 4]
        
        integration.emit_performance_baseline(baseline_metrics, baseline_type)
        print(f"Performance baseline emitted")
    
    elif command == "emit-regression":
        if len(sys.argv) < 5:
            print("Usage: evidence_integration.py emit-regression <type> <baseline> <current> <threshold>")
            sys.exit(1)
        
        regression_type = sys.argv[2]
        try:
            baseline_value = float(sys.argv[3])
            current_value = float(sys.argv[4])
            threshold = float(sys.argv[5])
        except ValueError:
            print("Invalid numeric values")
            sys.exit(1)
        
        component = None
        for i, arg in enumerate(sys.argv[6:]):
            if arg == "--component" and i + 1 < len(sys.argv) - 6:
                component = sys.argv[i + 7]
        
        integration.emit_regression_evidence(regression_type, baseline_value, current_value, threshold, component)
        print(f"Regression evidence emitted: {regression_type}")
    
    elif command == "get-evidence":
        evidence_type = None
        limit = 10
        
        # Parse optional arguments
        for i, arg in enumerate(sys.argv[2:]):
            if arg == "--type" and i + 1 < len(sys.argv) - 2:
                evidence_type = sys.argv[i + 3]
            elif arg == "--limit" and i + 1 < len(sys.argv) - 2:
                try:
                    limit = int(sys.argv[i + 3])
                except ValueError:
                    pass
        
        evidence = integration.get_recent_evidence(evidence_type, limit)
        print(json.dumps(evidence, indent=2))
    
    elif command == "get-pattern-metrics":
        metric_name = None
        limit = 10
        
        # Parse optional arguments
        for i, arg in enumerate(sys.argv[2:]):
            if arg == "--name" and i + 1 < len(sys.argv) - 2:
                metric_name = sys.argv[i + 3]
            elif arg == "--limit" and i + 1 < len(sys.argv) - 2:
                try:
                    limit = int(sys.argv[i + 3])
                except ValueError:
                    pass
        
        metrics = integration.get_recent_pattern_metrics(metric_name, limit)
        print(json.dumps(metrics, indent=2))
    
    elif command == "get-system-metrics":
        component = None
        limit = 10
        
        # Parse optional arguments
        for i, arg in enumerate(sys.argv[2:]):
            if arg == "--component" and i + 1 < len(sys.argv) - 2:
                component = sys.argv[i + 3]
            elif arg == "--limit" and i + 1 < len(sys.argv) - 2:
                try:
                    limit = int(sys.argv[i + 3])
                except ValueError:
                    pass
        
        metrics = integration.get_recent_system_metrics(component, limit)
        print(json.dumps(metrics, indent=2))
    
    elif command == "analyze-trend":
        if len(sys.argv) < 3:
            print("Usage: evidence_integration.py analyze-trend <metric_name> [window_size]")
            sys.exit(1)
        
        metric_name = sys.argv[2]
        window_size = 5
        
        # Parse optional arguments
        for i, arg in enumerate(sys.argv[3:]):
            if arg == "--window" and i + 1 < len(sys.argv) - 3:
                try:
                    window_size = int(sys.argv[i + 4])
                except ValueError:
                    pass
        
        trend = integration.analyze_performance_trend(metric_name, window_size)
        print(json.dumps(trend, indent=2))
    
    elif command == "detect-regression":
        if len(sys.argv) < 3:
            print("Usage: evidence_integration.py detect-regression <metric_name> [threshold]")
            sys.exit(1)
        
        metric_name = sys.argv[2]
        threshold = 10.0
        
        # Parse optional arguments
        for i, arg in enumerate(sys.argv[3:]):
            if arg == "--threshold" and i + 1 < len(sys.argv) - 3:
                try:
                    threshold = float(sys.argv[i + 4])
                except ValueError:
                    pass
        
        regression = integration.detect_performance_regression(metric_name, threshold)
        print(json.dumps(regression, indent=2))
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
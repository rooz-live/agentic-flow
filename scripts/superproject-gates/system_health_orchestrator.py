#!/usr/bin/env python3
"""
System Health Orchestrator
Coordinates system-wide health monitoring across all components
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum

class ComponentType(Enum):
    ORCHESTRATION = "orchestration"
    AGENTDB = "agentdb"
    MCP = "mcp"
    GOVERNANCE = "governance"
    MONITORING = "monitoring"

class SystemHealthStatus(Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"

@dataclass
class ComponentHealth:
    """Health status of a system component"""
    component: ComponentType
    status: SystemHealthStatus
    last_checked: datetime
    metrics: Dict[str, float]
    dependencies: List[str]
    alerts: List[Dict[str, Any]]

@dataclass
class SystemHealthReport:
    """Complete system health report"""
    timestamp: datetime
    overall_status: SystemHealthStatus
    components: Dict[str, ComponentHealth]
    circles_status: Dict[str, Any]
    performance_metrics: Dict[str, float]
    incidents: List[Dict[str, Any]]
    recommendations: List[str]

class SystemHealthOrchestrator:
    """Orchestrates system-wide health monitoring"""

    def __init__(self, project_root: Optional[str] = None):
        self.project_root = Path(project_root) if project_root else Path.cwd()
        self.goalie_dir = self.project_root / ".goalie"
        self.health_dir = self.goalie_dir / "system_health"
        self.reports_file = self.health_dir / "health_reports.jsonl"

        # Ensure directories exist
        self.health_dir.mkdir(exist_ok=True)

        # Component dependencies
        self.component_dependencies = {
            "orchestration": [],
            "agentdb": ["orchestration"],
            "mcp": ["orchestration"],
            "governance": ["orchestration"],
            "monitoring": []
        }

    def generate_health_report(self) -> SystemHealthReport:
        """Generate comprehensive system health report"""
        timestamp = datetime.utcnow()

        # Check all components
        component_health = {}
        for component in ComponentType:
            health = self._check_component_health(component.value)
            component_health[component.value] = health

        # Get circle health status
        circles_status = self._get_circles_health_status()

        # Get system performance metrics
        performance_metrics = self._get_system_performance_metrics()

        # Get recent incidents
        incidents = self._get_recent_incidents()

        # Determine overall status
        overall_status = self._calculate_overall_status(component_health, circles_status)

        # Generate recommendations
        recommendations = self._generate_recommendations(component_health, circles_status, incidents)

        report = SystemHealthReport(
            timestamp=timestamp,
            overall_status=overall_status,
            components=component_health,
            circles_status=circles_status,
            performance_metrics=performance_metrics,
            incidents=incidents,
            recommendations=recommendations
        )

        # Store report
        self._store_health_report(report)

        return report

    def get_component_health(self, component: str) -> Optional[ComponentHealth]:
        """Get health status of a specific component"""
        report = self.generate_health_report()
        return report.components.get(component)

    def get_health_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get health report history"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        history = []

        try:
            with open(self.reports_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            report_data = json.loads(line)
                            report_time = datetime.fromisoformat(report_data["timestamp"])

                            if report_time >= cutoff_time:
                                history.append(report_data)
                        except json.JSONDecodeError:
                            continue
        except IOError:
            pass

        return sorted(history, key=lambda x: x["timestamp"])

    def detect_system_anomalies(self) -> List[Dict[str, Any]]:
        """Detect system-wide anomalies"""
        history = self.get_health_history(24)
        anomalies = []

        if len(history) < 5:
            return anomalies

        # Analyze trends
        recent_reports = history[-10:]

        # Check for component status degradation
        component_statuses = {}
        for report in recent_reports:
            for comp_name, comp_data in report["components"].items():
                if comp_name not in component_statuses:
                    component_statuses[comp_name] = []
                component_statuses[comp_name].append(comp_data["status"])

        for comp_name, statuses in component_statuses.items():
            # Check if status has degraded recently
            recent_status = statuses[-1]
            earlier_statuses = statuses[:-3]  # Look at earlier statuses

            if recent_status == "critical" and "critical" not in earlier_statuses:
                anomalies.append({
                    "type": "component_degradation",
                    "severity": "critical",
                    "component": comp_name,
                    "message": f"Component {comp_name} degraded to critical status",
                    "timestamp": history[-1]["timestamp"]
                })
            elif (recent_status == "warning" and
                  all(s == "healthy" for s in earlier_statuses[-3:])):
                anomalies.append({
                    "type": "component_warning",
                    "severity": "warning",
                    "component": comp_name,
                    "message": f"Component {comp_name} entered warning state",
                    "timestamp": history[-1]["timestamp"]
                })

        # Check for performance degradation
        if len(recent_reports) >= 3:
            latest_perf = recent_reports[-1]["performance_metrics"]
            baseline_perf = {}

            # Calculate baseline from earlier reports
            for metric in ["cpu", "memory", "response_time"]:
                values = [r["performance_metrics"].get(metric, 0) for r in recent_reports[:-1]]
                baseline_perf[metric] = sum(values) / len(values) if values else 0

            # Check for significant degradation
            for metric, current_value in latest_perf.items():
                baseline_value = baseline_perf.get(metric, current_value)
                if baseline_value > 0:
                    degradation = (current_value - baseline_value) / baseline_value
                    if degradation > 0.5:  # 50% degradation
                        anomalies.append({
                            "type": "performance_degradation",
                            "severity": "warning",
                            "metric": metric,
                            "message": f"Performance degradation in {metric}: {degradation:.1%} increase",
                            "current_value": current_value,
                            "baseline_value": baseline_value,
                            "timestamp": history[-1]["timestamp"]
                        })

        return anomalies

    def _check_component_health(self, component_name: str) -> ComponentHealth:
        """Check health of a specific component"""
        # In a real implementation, this would interface with actual component monitoring
        # For now, simulate based on component characteristics

        base_health = {
            "orchestration": {"status": "healthy", "response_time": 50},
            "agentdb": {"status": "healthy", "response_time": 100},
            "mcp": {"status": "warning", "response_time": 200},
            "governance": {"status": "healthy", "response_time": 75},
            "monitoring": {"status": "healthy", "response_time": 25}
        }

        # Add some variability
        health_data = base_health.get(component_name, {"status": "unknown", "response_time": 0})
        status_variation = time.time() % 10

        if status_variation > 8:
            status = "critical"
        elif status_variation > 6:
            status = "warning"
        else:
            status = health_data["status"]

        # Generate metrics based on component
        metrics = self._generate_component_metrics(component_name, status)

        # Generate alerts
        alerts = []
        if status == "critical":
            alerts.append({
                "severity": "critical",
                "message": f"Critical issue detected in {component_name}",
                "timestamp": datetime.utcnow().isoformat()
            })
        elif status == "warning":
            alerts.append({
                "severity": "warning",
                "message": f"Warning condition in {component_name}",
                "timestamp": datetime.utcnow().isoformat()
            })

        return ComponentHealth(
            component=ComponentType(component_name),
            status=SystemHealthStatus(status),
            last_checked=datetime.utcnow(),
            metrics=metrics,
            dependencies=self.component_dependencies.get(component_name, []),
            alerts=alerts
        )

    def _generate_component_metrics(self, component_name: str, status: str) -> Dict[str, float]:
        """Generate metrics for a component"""
        base_metrics = {
            "orchestration": {
                "response_time": 50,
                "throughput": 100,
                "error_rate": 0.01,
                "uptime": 99.9
            },
            "agentdb": {
                "response_time": 100,
                "hit_rate": 0.95,
                "memory_usage": 70,
                "connections": 50
            },
            "mcp": {
                "response_time": 200,
                "connected_servers": 3,
                "message_latency": 150,
                "error_rate": 0.05
            },
            "governance": {
                "response_time": 75,
                "rules_evaluated": 1000,
                "decisions_made": 50,
                "compliance_rate": 98
            },
            "monitoring": {
                "response_time": 25,
                "metrics_collected": 5000,
                "alerts_generated": 10,
                "data_retention": 30
            }
        }

        metrics = base_metrics.get(component_name, {"response_time": 0})
        # Add status-based variation
        if status == "critical":
            metrics = {k: v * 2 if k == "response_time" else v * 0.5 if "rate" in k else v
                      for k, v in metrics.items()}
        elif status == "warning":
            metrics = {k: v * 1.5 if k == "response_time" else v * 0.8 if "rate" in k else v
                      for k, v in metrics.items()}

        return metrics

    def _get_circles_health_status(self) -> Dict[str, Any]:
        """Get health status of all functional circles"""
        # In a real implementation, this would call the circle health monitor
        # For now, simulate circle health
        circles = ["analyst", "assessor", "innovator", "intuitive", "orchestrator", "seeker"]

        circle_status = {}
        for circle in circles:
            # Simulate circle health
            health_score = 70 + (hash(circle) % 30)  # 70-100
            status = "healthy" if health_score > 80 else "warning" if health_score > 60 else "critical"

            circle_status[circle] = {
                "status": status,
                "health_score": health_score,
                "active_tasks": 3 + (hash(circle) % 5),
                "performance_score": health_score - 5 + (hash(circle) % 10)
            }

        return circle_status

    def _get_system_performance_metrics(self) -> Dict[str, float]:
        """Get overall system performance metrics"""
        # Simulate system metrics
        return {
            "cpu": 45 + (time.time() % 20),  # 45-65%
            "memory": 60 + (time.time() % 25),  # 60-85%
            "disk": 35 + (time.time() % 15),  # 35-50%
            "network": 20 + (time.time() % 30),  # 20-50ms latency
            "uptime": 95 + (time.time() % 5),  # 95-100%
            "response_time": 100 + (time.time() % 50)  # 100-150ms
        }

    def _get_recent_incidents(self) -> List[Dict[str, Any]]:
        """Get recent system incidents"""
        # Simulate recent incidents
        incidents = []
        now = datetime.utcnow()

        # Generate 0-3 random incidents in the last 24 hours
        incident_count = int(time.time()) % 4

        components = ["orchestration", "agentdb", "mcp", "governance", "monitoring"]
        severities = ["low", "medium", "high", "critical"]

        for i in range(incident_count):
            hours_ago = (time.time() % 24)
            incident_time = now - timedelta(hours=hours_ago)

            incidents.append({
                "timestamp": incident_time.isoformat(),
                "severity": severities[i % len(severities)],
                "component": components[i % len(components)],
                "description": f"Incident in {components[i % len(components)]} component",
                "resolved": (i % 2) == 0  # Alternate resolved/unresolved
            })

        return sorted(incidents, key=lambda x: x["timestamp"], reverse=True)

    def _calculate_overall_status(self, component_health: Dict[str, ComponentHealth],
                                circles_status: Dict[str, Any]) -> SystemHealthStatus:
        """Calculate overall system health status"""
        # Check component statuses
        component_statuses = [health.status.value for health in component_health.values()]

        # Check circle statuses
        circle_statuses = [circle_data["status"] for circle_data in circles_status.values()]

        all_statuses = component_statuses + circle_statuses

        if "critical" in all_statuses:
            return SystemHealthStatus.CRITICAL
        elif "warning" in all_statuses:
            return SystemHealthStatus.WARNING
        elif all(s == "healthy" for s in all_statuses):
            return SystemHealthStatus.HEALTHY
        else:
            return SystemHealthStatus.UNKNOWN

    def _generate_recommendations(self, component_health: Dict[str, ComponentHealth],
                               circles_status: Dict[str, Any],
                               incidents: List[Dict[str, Any]]) -> List[str]:
        """Generate health improvement recommendations"""
        recommendations = []

        # Check for critical components
        critical_components = [name for name, health in component_health.items()
                             if health.status.value == "critical"]
        if critical_components:
            recommendations.append(f"Immediate attention required for critical components: {', '.join(critical_components)}")

        # Check for warning components
        warning_components = [name for name, health in component_health.items()
                            if health.status.value == "warning"]
        if warning_components:
            recommendations.append(f"Review warning components: {', '.join(warning_components)}")

        # Check for unhealthy circles
        unhealthy_circles = [name for name, circle_data in circles_status.items()
                           if circle_data["status"] != "healthy"]
        if unhealthy_circles:
            recommendations.append(f"Address health issues in circles: {', '.join(unhealthy_circles)}")

        # Check for unresolved incidents
        unresolved_incidents = [inc for inc in incidents if not inc.get("resolved", False)]
        if unresolved_incidents:
            recommendations.append(f"Resolve {len(unresolved_incidents)} outstanding incidents")

        # Performance recommendations
        if not recommendations:
            recommendations.append("System health is good. Continue monitoring performance trends.")

        return recommendations

    def _store_health_report(self, report: SystemHealthReport) -> None:
        """Store health report to file"""
        report_data = {
            "timestamp": report.timestamp.isoformat(),
            "overall_status": report.overall_status.value,
            "components": {name: {
                "component": health.component.value,
                "status": health.status.value,
                "last_checked": health.last_checked.isoformat(),
                "metrics": health.metrics,
                "dependencies": health.dependencies,
                "alerts": health.alerts
            } for name, health in report.components.items()},
            "circles_status": report.circles_status,
            "performance_metrics": report.performance_metrics,
            "incidents": report.incidents,
            "recommendations": report.recommendations
        }

        with open(self.reports_file, 'a') as f:
            f.write(json.dumps(report_data) + '\n')

def main():
    """CLI interface for system health orchestration"""
    if len(sys.argv) < 2:
        print("Usage: system_health_orchestrator.py <command> [options]")
        print("Commands: report, component-health, history, anomalies")
        sys.exit(1)

    command = sys.argv[1]
    orchestrator = SystemHealthOrchestrator()

    if command == "report":
        report = orchestrator.generate_health_report()
        result = {
            "timestamp": report.timestamp.isoformat(),
            "overall_status": report.overall_status.value,
            "components": {name: {
                "status": health.status.value,
                "metrics": health.metrics,
                "alerts": health.alerts
            } for name, health in report.components.items()},
            "circles_status": report.circles_status,
            "performance_metrics": report.performance_metrics,
            "incidents": report.incidents,
            "recommendations": report.recommendations
        }
        print(json.dumps(result, indent=2))

    elif command == "component-health":
        if len(sys.argv) < 3:
            print("Usage: system_health_orchestrator.py component-health <component>")
            sys.exit(1)

        component = sys.argv[2]
        health = orchestrator.get_component_health(component)
        if health:
            result = {
                "component": health.component.value,
                "status": health.status.value,
                "last_checked": health.last_checked.isoformat(),
                "metrics": health.metrics,
                "dependencies": health.dependencies,
                "alerts": health.alerts
            }
            print(json.dumps(result, indent=2))
        else:
            print(f"Component '{component}' not found")
            sys.exit(1)

    elif command == "history":
        hours = 24
        if len(sys.argv) > 2:
            try:
                hours = int(sys.argv[2])
            except ValueError:
                pass

        history = orchestrator.get_health_history(hours)
        print(json.dumps(history, indent=2))

    elif command == "anomalies":
        anomalies = orchestrator.detect_system_anomalies()
        print(json.dumps(anomalies, indent=2))

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
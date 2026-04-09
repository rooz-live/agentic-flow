#!/usr/bin/env python3
"""
Circle Health Monitoring System
Monitors health and performance of all functional circles
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

class CircleRole(Enum):
    ANALYST = "analyst"
    ASSESSOR = "assessor"
    INNOVATOR = "innovator"
    INTUITIVE = "intuitive"
    ORCHESTRATOR = "orchestrator"
    SEEKER = "seeker"

class HealthStatus(Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"

@dataclass
class CircleHealthMetrics:
    """Health metrics for a functional circle"""
    circle: CircleRole
    status: HealthStatus
    task_completion_rate: float
    average_task_duration: float
    error_rate: float
    resource_utilization: float
    last_activity: datetime
    active_tasks: int
    blocked_tasks: int
    performance_score: float

@dataclass
class CircleHealthSnapshot:
    """Complete health snapshot for all circles"""
    timestamp: datetime
    circles: Dict[str, CircleHealthMetrics]
    overall_status: HealthStatus
    alerts: List[Dict[str, Any]]

class CircleHealthMonitor:
    """Monitors health and performance of functional circles"""

    def __init__(self, project_root: Optional[str] = None):
        self.project_root = Path(project_root) if project_root else Path.cwd()
        self.goalie_dir = self.project_root / ".goalie"
        self.health_dir = self.goalie_dir / "circle_health"
        self.snapshots_file = self.health_dir / "health_snapshots.jsonl"

        # Ensure directories exist
        self.health_dir.mkdir(exist_ok=True)

        # Circle responsibilities (matching health-checks.ts)
        self.circle_responsibilities = {
            "analyst": [
                "Data analysis and insights generation",
                "Pattern recognition and optimization",
                "Performance metrics analysis"
            ],
            "assessor": [
                "Risk assessment and quality assurance",
                "Compliance monitoring",
                "Quality gate management"
            ],
            "innovator": [
                "Research and development initiatives",
                "Prototype development",
                "Innovation pipeline management"
            ],
            "intuitive": [
                "User experience and interface design",
                "Usability testing",
                "User feedback collection"
            ],
            "orchestrator": [
                "System coordination and workflow management",
                "Resource allocation",
                "Performance optimization"
            ],
            "seeker": [
                "Market research and opportunity identification",
                "Competitive analysis",
                "Trend monitoring"
            ]
        }

    def monitor_circle_health(self) -> CircleHealthSnapshot:
        """Monitor health of all functional circles"""
        timestamp = datetime.utcnow()
        circle_metrics = {}
        alerts = []

        for circle_name in self.circle_responsibilities.keys():
            metrics = self._assess_circle_health(circle_name)
            circle_metrics[circle_name] = metrics

            # Generate alerts for critical issues
            if metrics.status == HealthStatus.CRITICAL:
                alerts.append({
                    "circle": circle_name,
                    "severity": "critical",
                    "message": f"Critical health issue in {circle_name} circle",
                    "metrics": asdict(metrics)
                })
            elif metrics.status == HealthStatus.WARNING:
                alerts.append({
                    "circle": circle_name,
                    "severity": "warning",
                    "message": f"Health warning for {circle_name} circle",
                    "metrics": asdict(metrics)
                })

        # Determine overall status
        overall_status = self._calculate_overall_status(circle_metrics)

        snapshot = CircleHealthSnapshot(
            timestamp=timestamp,
            circles=circle_metrics,
            overall_status=overall_status,
            alerts=alerts
        )

        # Store snapshot
        self._store_health_snapshot(snapshot)

        return snapshot

    def get_circle_health(self, circle: str) -> Optional[CircleHealthMetrics]:
        """Get current health metrics for a specific circle"""
        snapshot = self.monitor_circle_health()
        return snapshot.circles.get(circle)

    def get_circle_health_history(self, circle: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Get health history for a circle over the specified hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        history = []

        try:
            with open(self.snapshots_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            snapshot_data = json.loads(line)
                            snapshot_time = datetime.fromisoformat(snapshot_data["timestamp"])

                            if snapshot_time >= cutoff_time:
                                circle_data = snapshot_data["circles"].get(circle)
                                if circle_data:
                                    history.append({
                                        "timestamp": snapshot_time.isoformat(),
                                        "metrics": circle_data
                                    })
                        except json.JSONDecodeError:
                            continue
        except IOError:
            pass

        return sorted(history, key=lambda x: x["timestamp"])

    def get_circle_performance_trends(self, circle: str, hours: int = 24) -> Dict[str, Any]:
        """Analyze performance trends for a circle"""
        history = self.get_circle_health_history(circle, hours)

        if len(history) < 2:
            return {"error": "Insufficient data for trend analysis"}

        # Extract metrics over time
        timestamps = []
        completion_rates = []
        task_durations = []
        error_rates = []

        for entry in history:
            metrics = entry["metrics"]
            timestamps.append(datetime.fromisoformat(entry["timestamp"]))
            completion_rates.append(metrics["task_completion_rate"])
            task_durations.append(metrics["average_task_duration"])
            error_rates.append(metrics["error_rate"])

        # Calculate trends (simplified)
        def calculate_trend(values):
            if len(values) < 2:
                return "insufficient_data"
            recent_avg = sum(values[-3:]) / min(3, len(values))
            earlier_avg = sum(values[:3]) / min(3, len(values))
            if earlier_avg == 0:
                return "improving" if recent_avg > 0 else "stable"
            change = (recent_avg - earlier_avg) / earlier_avg
            if change > 0.1:
                return "improving"
            elif change < -0.1:
                return "declining"
            else:
                return "stable"

        return {
            "circle": circle,
            "time_range_hours": hours,
            "data_points": len(history),
            "trends": {
                "completion_rate": calculate_trend(completion_rates),
                "task_duration": calculate_trend(task_durations),
                "error_rate": calculate_trend(error_rates)
            },
            "latest_metrics": history[-1]["metrics"] if history else None
        }

    def detect_circle_anomalies(self, circle: str) -> List[Dict[str, Any]]:
        """Detect anomalies in circle performance"""
        history = self.get_circle_health_history(circle, 24)
        anomalies = []

        if len(history) < 5:
            return anomalies

        # Calculate baseline from recent history
        recent_metrics = [entry["metrics"] for entry in history[-10:]]
        baseline = {
            "completion_rate": sum(m["task_completion_rate"] for m in recent_metrics) / len(recent_metrics),
            "error_rate": sum(m["error_rate"] for m in recent_metrics) / len(recent_metrics),
            "task_duration": sum(m["average_task_duration"] for m in recent_metrics) / len(recent_metrics)
        }

        # Check latest metrics for anomalies
        latest = history[-1]["metrics"]

        # Completion rate anomaly
        if abs(latest["task_completion_rate"] - baseline["completion_rate"]) > 0.2:
            direction = "high" if latest["task_completion_rate"] > baseline["completion_rate"] else "low"
            anomalies.append({
                "type": "completion_rate_anomaly",
                "severity": "warning",
                "message": f"Unusual {direction} completion rate: {latest['task_completion_rate']:.2f} (baseline: {baseline['completion_rate']:.2f})",
                "timestamp": history[-1]["timestamp"]
            })

        # Error rate spike
        if latest["error_rate"] > baseline["error_rate"] * 2:
            anomalies.append({
                "type": "error_rate_spike",
                "severity": "critical",
                "message": f"Error rate spike: {latest['error_rate']:.2f} (baseline: {baseline['error_rate']:.2f})",
                "timestamp": history[-1]["timestamp"]
            })

        # Task duration anomaly
        if abs(latest["average_task_duration"] - baseline["task_duration"]) / baseline["task_duration"] > 0.5:
            direction = "long" if latest["average_task_duration"] > baseline["task_duration"] else "short"
            anomalies.append({
                "type": "task_duration_anomaly",
                "severity": "warning",
                "message": f"Unusually {direction} task durations: {latest['average_task_duration']:.1f}s (baseline: {baseline['task_duration']:.1f}s)",
                "timestamp": history[-1]["timestamp"]
            })

        return anomalies

    def _assess_circle_health(self, circle_name: str) -> CircleHealthMetrics:
        """Assess health of a specific circle"""
        # Gather metrics from various sources
        task_metrics = self._get_task_metrics(circle_name)
        performance_metrics = self._get_performance_metrics(circle_name)
        resource_metrics = self._get_resource_metrics(circle_name)

        # Calculate health status
        status = self._calculate_circle_status(task_metrics, performance_metrics, resource_metrics)

        # Calculate performance score (0-100)
        performance_score = self._calculate_performance_score(task_metrics, performance_metrics)

        return CircleHealthMetrics(
            circle=CircleRole(circle_name),
            status=status,
            task_completion_rate=task_metrics["completion_rate"],
            average_task_duration=task_metrics["avg_duration"],
            error_rate=task_metrics["error_rate"],
            resource_utilization=resource_metrics["utilization"],
            last_activity=task_metrics["last_activity"],
            active_tasks=task_metrics["active_count"],
            blocked_tasks=task_metrics["blocked_count"],
            performance_score=performance_score
        )

    def _get_task_metrics(self, circle_name: str) -> Dict[str, Any]:
        """Get task-related metrics for a circle"""
        # In a real implementation, this would query the task management system
        # For now, simulate based on circle characteristics

        base_completion = {
            "analyst": 0.85,
            "assessor": 0.90,
            "innovator": 0.75,
            "intuitive": 0.80,
            "orchestrator": 0.95,
            "seeker": 0.70
        }

        # Add some randomness to simulate real metrics
        completion_rate = base_completion.get(circle_name, 0.8) + (0.1 * (0.5 - time.time() % 1))

        return {
            "completion_rate": max(0, min(1, completion_rate)),
            "avg_duration": 15 + (circle_name.__hash__() % 20),  # 15-35 seconds
            "error_rate": 0.02 + (circle_name.__hash__() % 10) / 100,  # 2-12%
            "last_activity": datetime.utcnow() - timedelta(minutes=(circle_name.__hash__() % 60)),
            "active_count": 2 + (circle_name.__hash__() % 5),  # 2-7 tasks
            "blocked_count": (circle_name.__hash__() % 3)  # 0-2 blocked
        }

    def _get_performance_metrics(self, circle_name: str) -> Dict[str, Any]:
        """Get performance metrics for a circle"""
        # Simulate performance metrics
        return {
            "throughput": 10 + (circle_name.__hash__() % 20),  # tasks/hour
            "efficiency": 0.8 + (circle_name.__hash__() % 20) / 100,  # 80-100%
            "quality_score": 0.85 + (circle_name.__hash__() % 15) / 100  # 85-100%
        }

    def _get_resource_metrics(self, circle_name: str) -> Dict[str, Any]:
        """Get resource utilization metrics for a circle"""
        # Simulate resource metrics
        return {
            "utilization": 0.6 + (circle_name.__hash__() % 40) / 100,  # 60-100%
            "memory_usage": 50 + (circle_name.__hash__() % 30),  # MB
            "cpu_usage": 20 + (circle_name.__hash__() % 40)  # %
        }

    def _calculate_circle_status(self, task_metrics: Dict, performance_metrics: Dict,
                               resource_metrics: Dict) -> HealthStatus:
        """Calculate health status for a circle"""
        # Define thresholds
        critical_thresholds = {
            "completion_rate": 0.5,
            "error_rate": 0.15,
            "resource_utilization": 0.95
        }

        warning_thresholds = {
            "completion_rate": 0.7,
            "error_rate": 0.08,
            "resource_utilization": 0.85
        }

        # Check for critical conditions
        if (task_metrics["completion_rate"] < critical_thresholds["completion_rate"] or
            task_metrics["error_rate"] > critical_thresholds["error_rate"] or
            resource_metrics["utilization"] > critical_thresholds["resource_utilization"]):
            return HealthStatus.CRITICAL

        # Check for warning conditions
        if (task_metrics["completion_rate"] < warning_thresholds["completion_rate"] or
            task_metrics["error_rate"] > warning_thresholds["error_rate"] or
            resource_metrics["utilization"] > warning_thresholds["resource_utilization"]):
            return HealthStatus.WARNING

        return HealthStatus.HEALTHY

    def _calculate_performance_score(self, task_metrics: Dict, performance_metrics: Dict) -> float:
        """Calculate overall performance score (0-100)"""
        # Weight different factors
        completion_weight = 0.4
        error_weight = 0.3
        efficiency_weight = 0.3

        completion_score = task_metrics["completion_rate"] * 100
        error_score = (1 - task_metrics["error_rate"]) * 100  # Invert error rate
        efficiency_score = performance_metrics["efficiency"] * 100

        return (completion_score * completion_weight +
                error_score * error_weight +
                efficiency_score * efficiency_weight)

    def _calculate_overall_status(self, circle_metrics: Dict[str, CircleHealthMetrics]) -> HealthStatus:
        """Calculate overall system health status"""
        statuses = [metrics.status for metrics in circle_metrics.values()]

        if HealthStatus.CRITICAL in statuses:
            return HealthStatus.CRITICAL
        elif HealthStatus.WARNING in statuses:
            return HealthStatus.WARNING
        elif all(status == HealthStatus.HEALTHY for status in statuses):
            return HealthStatus.HEALTHY
        else:
            return HealthStatus.UNKNOWN

    def _store_health_snapshot(self, snapshot: CircleHealthSnapshot) -> None:
        """Store health snapshot to file"""
        snapshot_data = {
            "timestamp": snapshot.timestamp.isoformat(),
            "circles": {name: asdict(metrics) for name, metrics in snapshot.circles.items()},
            "overall_status": snapshot.overall_status.value,
            "alerts": snapshot.alerts
        }

        with open(self.snapshots_file, 'a') as f:
            f.write(json.dumps(snapshot_data) + '\n')

def main():
    """CLI interface for circle health monitoring"""
    if len(sys.argv) < 2:
        print("Usage: circle_health_monitor.py <command> [options]")
        print("Commands: monitor, circle-health, trends, anomalies")
        sys.exit(1)

    command = sys.argv[1]
    monitor = CircleHealthMonitor()

    if command == "monitor":
        snapshot = monitor.monitor_circle_health()
        result = {
            "timestamp": snapshot.timestamp.isoformat(),
            "overall_status": snapshot.overall_status.value,
            "circles": {name: asdict(metrics) for name, metrics in snapshot.circles.items()},
            "alerts": snapshot.alerts
        }
        print(json.dumps(result, indent=2))

    elif command == "circle-health":
        if len(sys.argv) < 3:
            print("Usage: circle_health_monitor.py circle-health <circle>")
            sys.exit(1)

        circle = sys.argv[2]
        metrics = monitor.get_circle_health(circle)
        if metrics:
            print(json.dumps(asdict(metrics), indent=2))
        else:
            print(f"Circle '{circle}' not found")
            sys.exit(1)

    elif command == "trends":
        if len(sys.argv) < 3:
            print("Usage: circle_health_monitor.py trends <circle> [hours]")
            sys.exit(1)

        circle = sys.argv[2]
        hours = 24
        if len(sys.argv) > 3:
            try:
                hours = int(sys.argv[3])
            except ValueError:
                pass

        trends = monitor.get_circle_performance_trends(circle, hours)
        print(json.dumps(trends, indent=2))

    elif command == "anomalies":
        if len(sys.argv) < 3:
            print("Usage: circle_health_monitor.py anomalies <circle>")
            sys.exit(1)

        circle = sys.argv[2]
        anomalies = monitor.detect_circle_anomalies(circle)
        print(json.dumps(anomalies, indent=2))

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
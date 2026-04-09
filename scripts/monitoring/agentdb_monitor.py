#!/usr/bin/env python3
"""
AgentDB Monitoring System
Monitors health and performance of the AgentDB vector database
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

class AgentDBStatus(Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"

@dataclass
class AgentDBMetrics:
    """Health metrics for AgentDB"""
    status: AgentDBStatus
    connection_count: int
    query_count: int
    response_time_ms: float
    storage_used_gb: float
    storage_available_gb: float
    vector_count: int
    hit_rate: float
    error_rate: float
    last_backup: datetime
    uptime_hours: float

@dataclass
class AgentDBSnapshot:
    """Complete health snapshot for AgentDB"""
    timestamp: datetime
    metrics: AgentDBMetrics
    alerts: List[Dict[str, Any]]

class AgentDBMonitor:
    """Monitors health and performance of AgentDB"""

    def __init__(self, project_root: Optional[str] = None):
        self.project_root = Path(project_root) if project_root else Path.cwd()
        self.goalie_dir = self.project_root / ".goalie"
        self.agentdb_dir = self.project_root / ".agentdb"
        self.snapshots_file = self.goalie_dir / "agentdb_snapshots.jsonl"

        # Ensure directories exist
        self.goalie_dir.mkdir(exist_ok=True)

    def monitor_agentdb_health(self) -> AgentDBSnapshot:
        """Monitor health of AgentDB"""
        timestamp = datetime.utcnow()

        # Gather metrics from various sources
        connection_metrics = self._get_connection_metrics()
        performance_metrics = self._get_performance_metrics()
        storage_metrics = self._get_storage_metrics()
        backup_metrics = self._get_backup_metrics()

        # Calculate overall status
        status = self._calculate_overall_status(connection_metrics, performance_metrics, storage_metrics)

        # Create metrics object
        metrics = AgentDBMetrics(
            status=status,
            connection_count=connection_metrics["active_connections"],
            query_count=performance_metrics["total_queries"],
            response_time_ms=performance_metrics["avg_response_time"],
            storage_used_gb=storage_metrics["used_gb"],
            storage_available_gb=storage_metrics["available_gb"],
            vector_count=performance_metrics["vector_count"],
            hit_rate=performance_metrics["hit_rate"],
            error_rate=performance_metrics["error_rate"],
            last_backup=backup_metrics["last_backup"],
            uptime_hours=backup_metrics["uptime_hours"]
        )

        # Generate alerts
        alerts = self._generate_alerts(metrics)

        snapshot = AgentDBSnapshot(
            timestamp=timestamp,
            metrics=metrics,
            alerts=alerts
        )

        # Store snapshot
        self._store_snapshot(snapshot)

        return snapshot

    def get_agentdb_health_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get health history over the specified hours"""
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
                                history.append({
                                    "timestamp": snapshot_time.isoformat(),
                                    "metrics": snapshot_data["metrics"]
                                })
                        except json.JSONDecodeError:
                            continue
        except IOError:
            pass

        return sorted(history, key=lambda x: x["timestamp"])

    def detect_anomalies(self) -> List[Dict[str, Any]]:
        """Detect anomalies in AgentDB performance"""
        history = self.get_agentdb_health_history(24)
        anomalies = []

        if len(history) < 5:
            return anomalies

        # Calculate baseline from recent history
        recent_metrics = [entry["metrics"] for entry in history[-10:]]
        baseline = {
            "response_time": sum(m["response_time_ms"] for m in recent_metrics) / len(recent_metrics),
            "error_rate": sum(m["error_rate"] for m in recent_metrics) / len(recent_metrics),
            "hit_rate": sum(m["hit_rate"] for m in recent_metrics) / len(recent_metrics)
        }

        # Check latest metrics for anomalies
        latest = history[-1]["metrics"]

        # Response time anomaly
        if latest["response_time_ms"] > baseline["response_time"] * 2:
            anomalies.append({
                "type": "high_response_time",
                "severity": "warning",
                "message": f"Response time spike: {latest['response_time_ms']:.1f}ms (baseline: {baseline['response_time']:.1f}ms)",
                "timestamp": history[-1]["timestamp"]
            })

        # Error rate spike
        if latest["error_rate"] > baseline["error_rate"] * 3:
            anomalies.append({
                "type": "error_rate_spike",
                "severity": "critical",
                "message": f"Error rate spike: {latest['error_rate']:.3f} (baseline: {baseline['error_rate']:.3f})",
                "timestamp": history[-1]["timestamp"]
            })

        # Hit rate drop
        if latest["hit_rate"] < baseline["hit_rate"] * 0.7:
            anomalies.append({
                "type": "hit_rate_drop",
                "severity": "warning",
                "message": f"Hit rate drop: {latest['hit_rate']:.2f} (baseline: {baseline['hit_rate']:.2f})",
                "timestamp": history[-1]["timestamp"]
            })

        return anomalies

    def _get_connection_metrics(self) -> Dict[str, Any]:
        """Get connection-related metrics"""
        # In a real implementation, this would query AgentDB connection stats
        # For now, simulate based on system characteristics
        return {
            "active_connections": 5 + (int(time.time()) % 10),  # 5-14 connections
            "max_connections": 100,
            "connection_pool_utilization": 0.6 + (int(time.time()) % 40) / 100  # 60-99%
        }

    def _get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        # Simulate performance metrics
        return {
            "total_queries": 1000 + (int(time.time()) % 5000),
            "avg_response_time": 50 + (int(time.time()) % 150),  # 50-199ms
            "vector_count": 50000 + (int(time.time()) % 50000),
            "hit_rate": 0.85 + (int(time.time()) % 15) / 100,  # 85-99%
            "error_rate": 0.005 + (int(time.time()) % 20) / 1000  # 0.5-2.4%
        }

    def _get_storage_metrics(self) -> Dict[str, Any]:
        """Get storage utilization metrics"""
        # Check actual AgentDB directory if it exists
        if self.agentdb_dir.exists():
            try:
                # Get directory size
                total_size = sum(f.stat().st_size for f in self.agentdb_dir.rglob('*') if f.is_file())
                used_gb = total_size / (1024**3)
            except:
                used_gb = 1.5  # fallback
        else:
            used_gb = 1.5  # default

        # Simulate available storage (assume 10GB total)
        available_gb = 10.0 - used_gb

        return {
            "used_gb": used_gb,
            "available_gb": max(0, available_gb),
            "total_gb": 10.0,
            "utilization_pct": (used_gb / 10.0) * 100
        }

    def _get_backup_metrics(self) -> Dict[str, Any]:
        """Get backup and uptime metrics"""
        # Check for backup files
        backup_files = list(self.agentdb_dir.glob("*.backup")) if self.agentdb_dir.exists() else []
        last_backup = datetime.utcnow() - timedelta(hours=24)  # default to 24 hours ago

        if backup_files:
            # Find most recent backup
            most_recent = max(backup_files, key=lambda f: f.stat().st_mtime)
            last_backup = datetime.fromtimestamp(most_recent.stat().st_mtime)

        # Simulate uptime (assume service restart every few days)
        uptime_hours = (int(time.time()) % (7 * 24 * 3600)) / 3600  # 0-168 hours

        return {
            "last_backup": last_backup,
            "backup_age_hours": (datetime.utcnow() - last_backup).total_seconds() / 3600,
            "uptime_hours": uptime_hours
        }

    def _calculate_overall_status(self, conn_metrics: Dict, perf_metrics: Dict, storage_metrics: Dict) -> AgentDBStatus:
        """Calculate overall health status"""
        # Define critical thresholds
        critical_thresholds = {
            "error_rate": 0.05,  # 5%
            "response_time": 500,  # 500ms
            "storage_utilization": 0.95,  # 95%
            "connection_utilization": 0.9  # 90%
        }

        warning_thresholds = {
            "error_rate": 0.02,  # 2%
            "response_time": 200,  # 200ms
            "storage_utilization": 0.85,  # 85%
            "connection_utilization": 0.8  # 80%
        }

        # Check for critical conditions
        if (perf_metrics["error_rate"] > critical_thresholds["error_rate"] or
            perf_metrics["avg_response_time"] > critical_thresholds["response_time"] or
            storage_metrics["utilization_pct"] > critical_thresholds["storage_utilization"] * 100 or
            conn_metrics["connection_pool_utilization"] > critical_thresholds["connection_utilization"]):
            return AgentDBStatus.CRITICAL

        # Check for warning conditions
        if (perf_metrics["error_rate"] > warning_thresholds["error_rate"] or
            perf_metrics["avg_response_time"] > warning_thresholds["response_time"] or
            storage_metrics["utilization_pct"] > warning_thresholds["storage_utilization"] * 100 or
            conn_metrics["connection_pool_utilization"] > warning_thresholds["connection_utilization"]):
            return AgentDBStatus.WARNING

        return AgentDBStatus.HEALTHY

    def _generate_alerts(self, metrics: AgentDBMetrics) -> List[Dict[str, Any]]:
        """Generate alerts based on metrics"""
        alerts = []

        if metrics.status == AgentDBStatus.CRITICAL:
            alerts.append({
                "severity": "critical",
                "message": "AgentDB is in critical state",
                "metrics": asdict(metrics)
            })
        elif metrics.status == AgentDBStatus.WARNING:
            alerts.append({
                "severity": "warning",
                "message": "AgentDB performance warning",
                "metrics": asdict(metrics)
            })

        # Specific alerts
        if metrics.error_rate > 0.03:
            alerts.append({
                "severity": "warning",
                "message": f"High error rate: {metrics.error_rate:.3f}",
                "type": "error_rate"
            })

        if metrics.response_time_ms > 300:
            alerts.append({
                "severity": "warning",
                "message": f"High response time: {metrics.response_time_ms:.1f}ms",
                "type": "response_time"
            })

        if metrics.storage_used_gb / (metrics.storage_used_gb + metrics.storage_available_gb) > 0.9:
            alerts.append({
                "severity": "warning",
                "message": f"Low storage space: {metrics.storage_available_gb:.1f}GB remaining",
                "type": "storage"
            })

        backup_age_days = (datetime.utcnow() - metrics.last_backup).total_seconds() / (24 * 3600)
        if backup_age_days > 7:
            alerts.append({
                "severity": "warning",
                "message": f"Stale backup: {backup_age_days:.1f} days old",
                "type": "backup"
            })

        return alerts

    def _store_snapshot(self, snapshot: AgentDBSnapshot) -> None:
        """Store health snapshot to file"""
        snapshot_data = {
            "timestamp": snapshot.timestamp.isoformat(),
            "metrics": asdict(snapshot.metrics),
            "alerts": snapshot.alerts
        }

        with open(self.snapshots_file, 'a') as f:
            f.write(json.dumps(snapshot_data) + '\n')

def main():
    """CLI interface for AgentDB monitoring"""
    if len(sys.argv) < 2:
        print("Usage: agentdb_monitor.py <command> [options]")
        print("Commands: monitor, history, anomalies")
        sys.exit(1)

    command = sys.argv[1]
    monitor = AgentDBMonitor()

    if command == "monitor":
        snapshot = monitor.monitor_agentdb_health()
        result = {
            "timestamp": snapshot.timestamp.isoformat(),
            "status": snapshot.metrics.status.value,
            "metrics": asdict(snapshot.metrics),
            "alerts": snapshot.alerts
        }
        print(json.dumps(result, indent=2))

    elif command == "history":
        hours = 24
        if len(sys.argv) > 2:
            try:
                hours = int(sys.argv[2])
            except ValueError:
                pass

        history = monitor.get_agentdb_health_history(hours)
        print(json.dumps(history, indent=2))

    elif command == "anomalies":
        anomalies = monitor.detect_anomalies()
        print(json.dumps(anomalies, indent=2))

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
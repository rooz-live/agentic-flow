#!/usr/bin/env python3
"""
System Health Dashboard
Provides comprehensive system health visualization across all functional circles
with real-time monitoring and governance compliance tracking.
"""

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False


class HealthStatus(Enum):
    """Health status levels"""
    CRITICAL = "critical"
    WARNING = "warning"
    GOOD = "good"
    EXCELLENT = "excellent"
    UNKNOWN = "unknown"


class SystemHealthDashboard:
    """System health dashboard with circle-based monitoring"""

    def __init__(self, goalie_dir: Optional[str] = None):
        self.goalie_dir = Path(goalie_dir) if goalie_dir else Path(".goalie")
        self.dashboard_dir = self.goalie_dir / "dashboard"
        self.dashboard_dir.mkdir(exist_ok=True)

        # Health monitoring files
        self.health_snapshot_file = self.goalie_dir / "system_health.json"
        self.health_history_file = self.dashboard_dir / "health_history.jsonl"

        # Circle roles for health monitoring
        self.circle_roles = [
            "analyst", "assessor", "innovator", "intuitive",
            "orchestrator", "seeker"
        ]

    def generate_health_dashboard(self, format_type: str = "text") -> str:
        """Generate comprehensive health dashboard"""
        # Collect current health metrics
        system_metrics = self._collect_system_metrics()
        circle_health = self._assess_circle_health()
        governance_health = self._check_governance_health()
        performance_health = self._analyze_performance_health()

        # Combine all health data
        health_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "system_metrics": system_metrics,
            "circle_health": circle_health,
            "governance_health": governance_health,
            "performance_health": performance_health,
            "overall_health": self._calculate_overall_health(
                system_metrics, circle_health, governance_health, performance_health
            )
        }

        # Save health snapshot
        self._save_health_snapshot(health_data)

        # Format output
        if format_type == "json":
            return json.dumps(health_data, indent=2, default=str)
        elif format_type == "text":
            return self._format_text_health_dashboard(health_data)
        elif format_type == "compact":
            return self._format_compact_health_dashboard(health_data)
        elif format_type == "rich":
            return self._format_rich_health_dashboard(health_data)
        else:
            return json.dumps(health_data, indent=2, default=str)

    def _collect_system_metrics(self) -> Dict[str, Any]:
        """Collect basic system metrics"""
        metrics = {}

        if HAS_PSUTIL:
            try:
                # CPU metrics
                cpu_percent = psutil.cpu_percent(interval=1)
                metrics["cpu_usage_percent"] = cpu_percent
                metrics["cpu_status"] = self._categorize_cpu_health(cpu_percent)

                # Memory metrics
                memory = psutil.virtual_memory()
                metrics["memory_usage_percent"] = memory.percent
                metrics["memory_available_gb"] = memory.available / (1024**3)
                metrics["memory_status"] = self._categorize_memory_health(memory.percent)

                # Disk metrics
                disk = psutil.disk_usage(str(Path.cwd()))
                metrics["disk_usage_percent"] = disk.percent
                metrics["disk_free_gb"] = disk.free / (1024**3)
                metrics["disk_status"] = self._categorize_disk_health(disk.percent)

                # Network (basic connectivity check)
                metrics["network_status"] = "good"  # Simplified

            except Exception as e:
                metrics["error"] = f"Failed to collect system metrics: {e}"
                metrics["cpu_status"] = "unknown"
                metrics["memory_status"] = "unknown"
                metrics["disk_status"] = "unknown"
                metrics["network_status"] = "unknown"
        else:
            # Fallback when psutil is not available
            metrics["cpu_usage_percent"] = 0
            metrics["cpu_status"] = "unknown"
            metrics["memory_usage_percent"] = 0
            metrics["memory_status"] = "unknown"
            metrics["disk_usage_percent"] = 0
            metrics["disk_status"] = "unknown"
            metrics["network_status"] = "unknown"
            metrics["note"] = "psutil not available - using mock metrics"

        return metrics

    def _assess_circle_health(self) -> Dict[str, Any]:
        """Assess health of functional circles"""
        circle_health = {}

        for role in self.circle_roles:
            # Check for recent activity in evidence files
            activity_score = self._check_circle_activity(role)
            responsiveness_score = self._check_circle_responsiveness(role)
            error_rate = self._check_circle_errors(role)

            # Calculate overall circle health
            health_score = (activity_score + responsiveness_score + (100 - error_rate)) / 3
            status = self._categorize_circle_health(health_score)

            circle_health[role] = {
                "status": status,
                "health_score": health_score,
                "activity_score": activity_score,
                "responsiveness_score": responsiveness_score,
                "error_rate": error_rate,
                "last_activity": self._get_last_circle_activity(role)
            }

        return circle_health

    def _check_governance_health(self) -> Dict[str, Any]:
        """Check governance compliance health"""
        governance_files = [
            self.goalie_dir / "governance_compliance.jsonl",
            self.goalie_dir / "unified_evidence.jsonl"
        ]

        compliance_checks = 0
        compliance_passed = 0
        recent_violations = []

        for gov_file in governance_files:
            if gov_file.exists():
                try:
                    with open(gov_file, 'r') as f:
                        lines = f.readlines()[-50:]  # Check last 50 entries
                        for line in lines:
                            line = line.strip()
                            if line:
                                try:
                                    entry = json.loads(line)
                                    if entry.get("type") == "governance":
                                        compliance_checks += 1
                                        if entry.get("validation_status") == "valid":
                                            compliance_passed += 1
                                    elif entry.get("type") == "compliance_check":
                                        compliance_checks += 1
                                        if entry.get("status") == "passed":
                                            compliance_passed += 1
                                        elif entry.get("status") == "failed":
                                            recent_violations.append(entry)
                                except json.JSONDecodeError:
                                    continue
                except IOError:
                    continue

        compliance_rate = (compliance_passed / compliance_checks * 100) if compliance_checks > 0 else 0

        return {
            "status": self._categorize_governance_health(compliance_rate),
            "compliance_rate": compliance_rate,
            "total_checks": compliance_checks,
            "passed_checks": compliance_passed,
            "failed_checks": compliance_checks - compliance_passed,
            "recent_violations": recent_violations[-5:]  # Last 5 violations
        }

    def _analyze_performance_health(self) -> Dict[str, Any]:
        """Analyze system performance health"""
        performance_files = [
            self.goalie_dir / "performance_metrics.jsonl",
            self.goalie_dir / "pattern_metrics.jsonl"
        ]

        metrics = {
            "response_times": [],
            "throughput_rates": [],
            "error_rates": [],
            "pattern_scores": []
        }

        for perf_file in performance_files:
            if perf_file.exists():
                try:
                    with open(perf_file, 'r') as f:
                        lines = f.readlines()[-20:]  # Check last 20 entries
                        for line in lines:
                            line = line.strip()
                            if line:
                                try:
                                    entry = json.loads(line)
                                    content = entry.get("content", {})

                                    # Extract performance metrics
                                    if "response_time" in content:
                                        metrics["response_times"].append(content["response_time"])
                                    if "throughput" in content:
                                        metrics["throughput_rates"].append(content["throughput"])
                                    if "error_rate" in content:
                                        metrics["error_rates"].append(content["error_rate"])
                                    if "performance_score" in content:
                                        metrics["pattern_scores"].append(content["performance_score"])

                                except json.JSONDecodeError:
                                    continue
                except IOError:
                    continue

        # Calculate averages
        avg_response_time = sum(metrics["response_times"]) / len(metrics["response_times"]) if metrics["response_times"] else 0
        avg_throughput = sum(metrics["throughput_rates"]) / len(metrics["throughput_rates"]) if metrics["throughput_rates"] else 0
        avg_error_rate = sum(metrics["error_rates"]) / len(metrics["error_rates"]) if metrics["error_rates"] else 0
        avg_pattern_score = sum(metrics["pattern_scores"]) / len(metrics["pattern_scores"]) if metrics["pattern_scores"] else 0

        # Determine overall performance status
        performance_score = 100 - avg_error_rate  # Simplified scoring
        if avg_pattern_score > 0:
            performance_score = (performance_score + avg_pattern_score) / 2

        return {
            "status": self._categorize_performance_health(performance_score),
            "performance_score": performance_score,
            "avg_response_time": avg_response_time,
            "avg_throughput": avg_throughput,
            "avg_error_rate": avg_error_rate,
            "avg_pattern_score": avg_pattern_score,
            "metrics_count": sum(len(v) for v in metrics.values())
        }

    def _calculate_overall_health(self, system: Dict, circles: Dict,
                                governance: Dict, performance: Dict) -> Dict[str, Any]:
        """Calculate overall system health"""
        # Weight the different health components
        weights = {
            "system": 0.3,
            "circles": 0.3,
            "governance": 0.2,
            "performance": 0.2
        }

        # Convert status strings to numeric scores
        status_scores = {
            "excellent": 100,
            "good": 80,
            "warning": 60,
            "critical": 20,
            "unknown": 50
        }

        system_score = status_scores.get(system.get("cpu_status", "unknown"), 50)
        circle_scores = [status_scores.get(c.get("status", "unknown"), 50) for c in circles.values()]
        circles_avg = sum(circle_scores) / len(circle_scores) if circle_scores else 50
        governance_score = status_scores.get(governance.get("status", "unknown"), 50)
        performance_score = status_scores.get(performance.get("status", "unknown"), 50)

        overall_score = (
            weights["system"] * system_score +
            weights["circles"] * circles_avg +
            weights["governance"] * governance_score +
            weights["performance"] * performance_score
        )

        overall_status = self._score_to_status(overall_score)

        return {
            "status": overall_status,
            "health_score": overall_score,
            "component_scores": {
                "system": system_score,
                "circles": circles_avg,
                "governance": governance_score,
                "performance": performance_score
            }
        }

    def _categorize_cpu_health(self, cpu_percent: float) -> str:
        """Categorize CPU health based on usage percentage"""
        if cpu_percent < 50:
            return "excellent"
        elif cpu_percent < 70:
            return "good"
        elif cpu_percent < 90:
            return "warning"
        else:
            return "critical"

    def _categorize_memory_health(self, memory_percent: float) -> str:
        """Categorize memory health based on usage percentage"""
        if memory_percent < 60:
            return "excellent"
        elif memory_percent < 80:
            return "good"
        elif memory_percent < 95:
            return "warning"
        else:
            return "critical"

    def _categorize_disk_health(self, disk_percent: float) -> str:
        """Categorize disk health based on usage percentage"""
        if disk_percent < 70:
            return "excellent"
        elif disk_percent < 85:
            return "good"
        elif disk_percent < 95:
            return "warning"
        else:
            return "critical"

    def _categorize_circle_health(self, health_score: float) -> str:
        """Categorize circle health based on score"""
        if health_score >= 90:
            return "excellent"
        elif health_score >= 75:
            return "good"
        elif health_score >= 60:
            return "warning"
        else:
            return "critical"

    def _categorize_governance_health(self, compliance_rate: float) -> str:
        """Categorize governance health based on compliance rate"""
        if compliance_rate >= 95:
            return "excellent"
        elif compliance_rate >= 85:
            return "good"
        elif compliance_rate >= 70:
            return "warning"
        else:
            return "critical"

    def _categorize_performance_health(self, performance_score: float) -> str:
        """Categorize performance health based on score"""
        if performance_score >= 90:
            return "excellent"
        elif performance_score >= 75:
            return "good"
        elif performance_score >= 60:
            return "warning"
        else:
            return "critical"

    def _score_to_status(self, score: float) -> str:
        """Convert numeric score to status string"""
        if score >= 90:
            return "excellent"
        elif score >= 75:
            return "good"
        elif score >= 60:
            return "warning"
        else:
            return "critical"

    def _check_circle_activity(self, role: str) -> float:
        """Check activity level for a circle role (simplified)"""
        # This would check recent evidence entries for the role
        # For now, return a mock score based on available data
        return 85.0  # Mock implementation

    def _check_circle_responsiveness(self, role: str) -> float:
        """Check responsiveness for a circle role (simplified)"""
        return 80.0  # Mock implementation

    def _check_circle_errors(self, role: str) -> float:
        """Check error rate for a circle role (simplified)"""
        return 5.0  # Mock implementation

    def _get_last_circle_activity(self, role: str) -> Optional[str]:
        """Get last activity timestamp for a circle role"""
        # Check evidence files for recent activity
        evidence_files = [
            self.goalie_dir / "unified_evidence.jsonl",
            self.goalie_dir / f"{role}_activity.jsonl"  # Hypothetical file
        ]

        latest_timestamp = None
        for ev_file in evidence_files:
            if ev_file.exists():
                try:
                    with open(ev_file, 'r') as f:
                        lines = f.readlines()
                        if lines:
                            last_line = lines[-1].strip()
                            if last_line:
                                entry = json.loads(last_line)
                                timestamp = entry.get("timestamp")
                                if timestamp and (not latest_timestamp or timestamp > latest_timestamp):
                                    latest_timestamp = timestamp
                except (IOError, json.JSONDecodeError):
                    continue

        return latest_timestamp

    def _save_health_snapshot(self, health_data: Dict[str, Any]) -> None:
        """Save health snapshot to file"""
        try:
            with open(self.health_snapshot_file, 'w') as f:
                json.dump(health_data, f, indent=2, default=str)

            # Also append to history
            with open(self.health_history_file, 'a') as f:
                f.write(json.dumps(health_data) + '\n')

        except IOError:
            pass  # Continue without saving

    def _format_text_health_dashboard(self, health_data: Dict[str, Any]) -> str:
        """Format health dashboard as plain text"""
        output = []
        output.append("=" * 60)
        output.append("SYSTEM HEALTH DASHBOARD")
        output.append("=" * 60)
        output.append(f"Generated: {health_data['timestamp']}")
        output.append("")

        # Overall health
        overall = health_data.get("overall_health", {})
        output.append("OVERALL HEALTH:")
        output.append(f"  Status: {overall.get('status', 'unknown').upper()}")
        output.append(".1f")
        output.append("")

        # System metrics
        system = health_data.get("system_metrics", {})
        output.append("SYSTEM METRICS:")
        output.append(f"  CPU: {system.get('cpu_status', 'unknown')} "
                     f"({system.get('cpu_usage_percent', 0):.1f}%)")
        output.append(f"  Memory: {system.get('memory_status', 'unknown')} "
                     f"({system.get('memory_usage_percent', 0):.1f}%)")
        output.append(f"  Disk: {system.get('disk_status', 'unknown')} "
                     f"({system.get('disk_usage_percent', 0):.1f}%)")
        output.append("")

        # Circle health
        circles = health_data.get("circle_health", {})
        output.append("CIRCLE HEALTH:")
        for role, health in circles.items():
            output.append(f"  {role.capitalize()}: {health.get('status', 'unknown')} "
                         ".1f")
        output.append("")

        # Governance health
        governance = health_data.get("governance_health", {})
        output.append("GOVERNANCE HEALTH:")
        output.append(f"  Status: {governance.get('status', 'unknown')}")
        output.append(".1f")
        output.append(f"  Passed Checks: {governance.get('passed_checks', 0)}")
        output.append("")

        # Performance health
        performance = health_data.get("performance_health", {})
        output.append("PERFORMANCE HEALTH:")
        output.append(f"  Status: {performance.get('status', 'unknown')}")
        output.append(".1f")
        output.append(".2f")
        output.append("")

        return "\n".join(output)

    def _format_compact_health_dashboard(self, health_data: Dict[str, Any]) -> str:
        """Format health dashboard as compact text"""
        overall = health_data.get("overall_health", {})
        system = health_data.get("system_metrics", {})
        governance = health_data.get("governance_health", {})

        return (f"{health_data['timestamp'][:19]} | "
                f"Overall: {overall.get('status', 'unknown')} | "
                f"CPU: {system.get('cpu_status', 'unknown')} | "
                f"Memory: {system.get('memory_status', 'unknown')} | "
                f"Disk: {system.get('disk_status', 'unknown')} | "
                f"Governance: {governance.get('status', 'unknown')}")

    def _format_rich_health_dashboard(self, health_data: Dict[str, Any]) -> str:
        """Format health dashboard as rich text with emojis"""
        output = []
        output.append("🏥 SYSTEM HEALTH DASHBOARD 🏥")
        output.append("=" * 60)
        output.append(f"📅 Generated: {health_data['timestamp'][:19]}")
        output.append("")

        # Overall health with emoji
        overall = health_data.get("overall_health", {})
        status_emoji = {
            "excellent": "🌟",
            "good": "✅",
            "warning": "⚠️",
            "critical": "❌",
            "unknown": "❓"
        }.get(overall.get('status', 'unknown'), "❓")

        output.append(f"{status_emoji} OVERALL HEALTH: {overall.get('status', 'unknown').upper()}")
        output.append(".1f")
        output.append("")

        # System metrics with emojis
        system = health_data.get("system_metrics", {})
        output.append("🖥️ SYSTEM METRICS:")
        cpu_emoji = status_emoji.get(system.get('cpu_status', 'unknown'), "❓")
        output.append(f"   🏃 CPU: {cpu_emoji} {system.get('cpu_status', 'unknown')} "
                     f"({system.get('cpu_usage_percent', 0):.1f}%)")

        mem_emoji = status_emoji.get(system.get('memory_status', 'unknown'), "❓")
        output.append(f"   💾 Memory: {mem_emoji} {system.get('memory_status', 'unknown')} "
                     f"({system.get('memory_usage_percent', 0):.1f}%)")

        disk_emoji = status_emoji.get(system.get('disk_status', 'unknown'), "❓")
        output.append(f"   💿 Disk: {disk_emoji} {system.get('disk_status', 'unknown')} "
                     f"({system.get('disk_usage_percent', 0):.1f}%)")
        output.append("")

        # Circle health
        circles = health_data.get("circle_health", {})
        output.append("👥 CIRCLE HEALTH:")
        for role, health in circles.items():
            circle_emoji = status_emoji.get(health.get('status', 'unknown'), "❓")
            output.append(f"   {circle_emoji} {role.capitalize()}: {health.get('status', 'unknown')} "
                         ".1f")
        output.append("")

        # Governance and Performance
        governance = health_data.get("governance_health", {})
        performance = health_data.get("performance_health", {})

        gov_emoji = status_emoji.get(governance.get('status', 'unknown'), "❓")
        output.append(f"⚖️ GOVERNANCE: {gov_emoji} {governance.get('status', 'unknown')} "
                     ".1f")

        perf_emoji = status_emoji.get(performance.get('status', 'unknown'), "❓")
        output.append(f"📈 PERFORMANCE: {perf_emoji} {performance.get('status', 'unknown')} "
                     ".1f")

        return "\n".join(output)


def main():
    """CLI interface for health dashboard"""
    import argparse

    parser = argparse.ArgumentParser(description="System Health Dashboard")
    parser.add_argument("action", choices=["generate", "monitor", "alerts"],
                       help="Action to perform")
    parser.add_argument("--format", default="text", choices=["text", "json", "compact", "rich"],
                       help="Output format")
    parser.add_argument("--interval", type=int, default=60,
                       help="Monitoring interval in seconds")
    parser.add_argument("--count", type=int, default=5,
                       help="Number of monitoring iterations")

    args = parser.parse_args()

    dashboard = SystemHealthDashboard()

    try:
        if args.action == "generate":
            result = dashboard.generate_health_dashboard(args.format)
            print(result)

        elif args.action == "monitor":
            print("Starting health monitoring... (Ctrl+C to stop)")
            try:
                for i in range(args.count):
                    result = dashboard.generate_health_dashboard(args.format)
                    print(f"\n--- Health Check {i+1}/{args.count} ---")
                    print(result)
                    if i < args.count - 1:
                        time.sleep(args.interval)
            except KeyboardInterrupt:
                print("\nMonitoring stopped.")

        elif args.action == "alerts":
            # Generate dashboard and check for alerts
            health_data = json.loads(dashboard.generate_health_dashboard("json"))
            alerts = []

            # Check overall health
            overall = health_data.get("overall_health", {})
            if overall.get("status") in ["critical", "warning"]:
                alerts.append(f"Overall health is {overall.get('status').upper()}")

            # Check system metrics
            system = health_data.get("system_metrics", {})
            for metric in ["cpu_status", "memory_status", "disk_status"]:
                if system.get(metric) in ["critical", "warning"]:
                    alerts.append(f"System {metric.replace('_status', '')} is {system.get(metric).upper()}")

            # Check circles
            circles = health_data.get("circle_health", {})
            for role, health in circles.items():
                if health.get("status") in ["critical", "warning"]:
                    alerts.append(f"Circle {role} health is {health.get('status').upper()}")

            if alerts:
                print("🚨 HEALTH ALERTS:")
                for alert in alerts:
                    print(f"  • {alert}")
            else:
                print("✅ All systems healthy - no alerts")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
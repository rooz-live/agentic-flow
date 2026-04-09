#!/usr/bin/env python3
"""
CLI Dashboard Interface
Main dashboard interface providing real-time status display with multiple output formats,
interactive dashboard commands for monitoring production workflows, progress tracking,
and evidence trail monitoring.
"""

import json
import os
import sys
import time
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List
from enum import Enum

# Import our dashboard components
try:
    from .status_file_manager import StatusFileManager
    from .evidence_monitor import EvidenceMonitor
    from .health_dashboard import SystemHealthDashboard
except ImportError:
    # Fallback for direct execution
    import sys
    import os
    sys.path.insert(0, os.path.dirname(__file__))
    from status_file_manager import StatusFileManager
    from evidence_monitor import EvidenceMonitor
    from health_dashboard import SystemHealthDashboard


class OutputFormat(Enum):
    """Supported output formats"""
    TEXT = "text"
    COMPACT = "compact"
    RICH = "rich"
    JSON = "json"
    TABLE = "table"


class DashboardMode(Enum):
    """Dashboard operation modes"""
    STATIC = "static"
    WATCH = "watch"
    INTERACTIVE = "interactive"


class CLIDashboard:
    """Main CLI dashboard interface"""

    def __init__(self, goalie_dir: Optional[str] = None):
        self.goalie_dir = Path(goalie_dir) if goalie_dir else Path(".goalie")
        self.status_file = self.goalie_dir / "prod_status_current.json"

        # Initialize components
        self.status_manager = StatusFileManager(str(self.status_file))
        self.evidence_monitor = EvidenceMonitor(str(self.goalie_dir))
        self.health_dashboard = SystemHealthDashboard(str(self.goalie_dir))

        # Dashboard configuration
        self.config_file = self.goalie_dir / "dashboard_config.json"
        self.config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        """Load dashboard configuration"""
        default_config = {
            "refresh_interval": 30,
            "max_history": 100,
            "output_format": "text",
            "show_evidence": True,
            "show_health": True,
            "show_progress": True,
            "alert_thresholds": {
                "cpu_warning": 70,
                "memory_warning": 80,
                "disk_warning": 85,
                "evidence_completeness_warning": 80
            }
        }

        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    loaded_config = json.load(f)
                    default_config.update(loaded_config)
            except (json.JSONDecodeError, IOError):
                pass

        return default_config

    def generate_dashboard(self, format_type: str = "text",
                          show_evidence: bool = True,
                          show_health: bool = True,
                          show_progress: bool = True) -> str:
        """Generate comprehensive dashboard"""
        # Collect all dashboard data
        dashboard_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "config": self.config
        }

        # Production status
        if show_progress:
            try:
                status_data = self.status_manager.get_status()
                dashboard_data["production_status"] = status_data
            except Exception as e:
                dashboard_data["production_status"] = {"error": str(e)}

        # Evidence trails
        if show_evidence:
            try:
                evidence_completeness = self.evidence_monitor.validate_evidence_completeness()
                evidence_freshness = self.evidence_monitor.monitor_evidence_freshness()
                dashboard_data["evidence"] = {
                    "completeness": evidence_completeness,
                    "freshness": evidence_freshness
                }
            except Exception as e:
                dashboard_data["evidence"] = {"error": str(e)}

        # System health
        if show_health:
            try:
                health_data = json.loads(self.health_dashboard.generate_health_dashboard("json"))
                dashboard_data["health"] = health_data
            except Exception as e:
                dashboard_data["health"] = {"error": str(e)}

        # Generate alerts
        dashboard_data["alerts"] = self._generate_alerts(dashboard_data)

        # Format output
        if format_type == "json":
            return json.dumps(dashboard_data, indent=2, default=str)
        elif format_type == "text":
            return self._format_text_dashboard(dashboard_data)
        elif format_type == "compact":
            return self._format_compact_dashboard(dashboard_data)
        elif format_type == "rich":
            return self._format_rich_dashboard(dashboard_data)
        elif format_type == "table":
            return self._format_table_dashboard(dashboard_data)
        else:
            return json.dumps(dashboard_data, indent=2, default=str)

    def watch_mode(self, interval: int = 30, format_type: str = "compact",
                  max_iterations: Optional[int] = None) -> None:
        """Run dashboard in watch mode with periodic updates"""
        iteration = 0

        try:
            while max_iterations is None or iteration < max_iterations:
                # Clear screen for better UX
                os.system('clear' if os.name == 'posix' else 'cls')

                # Generate and display dashboard
                dashboard = self.generate_dashboard(format_type)
                print(dashboard)

                iteration += 1
                if max_iterations is None or iteration < max_iterations:
                    print(f"\nRefreshing in {interval} seconds... (Ctrl+C to stop)")
                    time.sleep(interval)

        except KeyboardInterrupt:
            print("\nWatch mode stopped.")

    def interactive_mode(self) -> None:
        """Run dashboard in interactive mode"""
        print("CLI Dashboard - Interactive Mode")
        print("Commands: status, evidence, health, watch, alerts, config, help, quit")
        print("-" * 50)

        while True:
            try:
                command = input("dashboard> ").strip().lower()

                if command in ["quit", "q", "exit"]:
                    break
                elif command == "status":
                    status = self.status_manager.get_status()
                    print(json.dumps(status, indent=2, default=str))
                elif command == "evidence":
                    report = self.evidence_monitor.generate_evidence_report()
                    print(report)
                elif command == "health":
                    health = self.health_dashboard.generate_health_dashboard("text")
                    print(health)
                elif command.startswith("watch"):
                    parts = command.split()
                    interval = int(parts[1]) if len(parts) > 1 else 30
                    self.watch_mode(interval, max_iterations=1)
                elif command == "alerts":
                    dashboard_data = json.loads(self.generate_dashboard("json"))
                    alerts = dashboard_data.get("alerts", [])
                    if alerts:
                        print("🚨 ACTIVE ALERTS:")
                        for alert in alerts:
                            print(f"  • {alert}")
                    else:
                        print("✅ No active alerts")
                elif command == "config":
                    print(json.dumps(self.config, indent=2))
                elif command in ["help", "h", "?"]:
                    self._show_interactive_help()
                elif command == "":
                    continue
                else:
                    print(f"Unknown command: {command}")
                    print("Type 'help' for available commands")

            except (KeyboardInterrupt, EOFError):
                print("\nExiting interactive mode.")
                break
            except Exception as e:
                print(f"Error: {e}")

    def _generate_alerts(self, dashboard_data: Dict[str, Any]) -> List[str]:
        """Generate alerts based on dashboard data and thresholds"""
        alerts = []

        # Health alerts
        health = dashboard_data.get("health", {})
        if isinstance(health, dict) and "error" not in health:
            overall = health.get("overall_health", {})
            if overall.get("status") in ["critical", "warning"]:
                alerts.append(f"Overall health is {overall.get('status').upper()}")

            # System metrics alerts
            system = health.get("system_metrics", {})
            thresholds = self.config.get("alert_thresholds", {})

            cpu_usage = system.get("cpu_usage_percent", 0)
            if cpu_usage > thresholds.get("cpu_warning", 70):
                alerts.append(f"High CPU usage: {cpu_usage:.1f}%")

            memory_usage = system.get("memory_usage_percent", 0)
            if memory_usage > thresholds.get("memory_warning", 80):
                alerts.append(f"High memory usage: {memory_usage:.1f}%")

            disk_usage = system.get("disk_usage_percent", 0)
            if disk_usage > thresholds.get("disk_warning", 85):
                alerts.append(f"High disk usage: {disk_usage:.1f}%")

        # Evidence alerts
        evidence = dashboard_data.get("evidence", {})
        if isinstance(evidence, dict) and "error" not in evidence:
            completeness = evidence.get("completeness", {})
            completeness_pct = completeness.get("overall_completeness", 100)
            threshold = self.config.get("alert_thresholds", {}).get("evidence_completeness_warning", 80)

            if completeness_pct < threshold:
                alerts.append(f"Low evidence completeness: {completeness_pct:.1f}%")

            # Freshness alerts
            freshness = evidence.get("freshness", {})
            freshness_pct = freshness.get("freshness_percentage", 100)
            if freshness_pct < 80:
                alerts.append(f"Stale evidence: {freshness_pct:.1f}% fresh")

        # Production status alerts
        prod_status = dashboard_data.get("production_status", {})
        if isinstance(prod_status, dict) and "error" not in prod_status:
            status = prod_status.get("status")
            if status == "failed":
                alerts.append("Production workflow has failed")
            elif status == "blocked":
                alerts.append("Production workflow is blocked")

        return alerts

    def _format_text_dashboard(self, dashboard_data: Dict[str, Any]) -> str:
        """Format dashboard as plain text"""
        output = []
        output.append("=" * 80)
        output.append("COMPREHENSIVE PRODUCTION DASHBOARD")
        output.append("=" * 80)
        output.append(f"Generated: {dashboard_data['timestamp']}")
        output.append("")

        # Production Status
        prod_status = dashboard_data.get("production_status", {})
        if isinstance(prod_status, dict) and "error" not in prod_status:
            output.append("PRODUCTION STATUS:")
            output.append(f"  Run ID: {prod_status.get('run_id', 'N/A')}")
            output.append(f"  Command: {prod_status.get('command', 'N/A')}")
            output.append(f"  Status: {prod_status.get('status', 'N/A')}")
            output.append(f"  Start Time: {prod_status.get('start_time', 'N/A')}")
            if prod_status.get('end_time'):
                output.append(f"  End Time: {prod_status.get('end_time', 'N/A')}")
            output.append("")

        # Evidence Summary
        evidence = dashboard_data.get("evidence", {})
        if isinstance(evidence, dict) and "error" not in evidence:
            completeness = evidence.get("completeness", {})
            freshness = evidence.get("freshness", {})

            output.append("EVIDENCE TRAILS:")
            output.append(".1f")
            output.append(f"  Fresh Evidence: {freshness.get('fresh_evidence_count', 0)}")
            output.append(f"  Stale Evidence: {freshness.get('stale_evidence_count', 0)}")
            output.append("")

        # Health Summary
        health = dashboard_data.get("health", {})
        if isinstance(health, dict) and "error" not in health:
            overall = health.get("overall_health", {})
            system = health.get("system_metrics", {})

            output.append("SYSTEM HEALTH:")
            output.append(f"  Overall: {overall.get('status', 'unknown')}")
            output.append(".1f")
            output.append(f"  CPU: {system.get('cpu_status', 'unknown')} ({system.get('cpu_usage_percent', 0):.1f}%)")
            output.append(f"  Memory: {system.get('memory_status', 'unknown')} ({system.get('memory_usage_percent', 0):.1f}%)")
            output.append(f"  Disk: {system.get('disk_status', 'unknown')} ({system.get('disk_usage_percent', 0):.1f}%)")
            output.append("")

        # Alerts
        alerts = dashboard_data.get("alerts", [])
        if alerts:
            output.append("ACTIVE ALERTS:")
            for alert in alerts:
                output.append(f"  🚨 {alert}")
            output.append("")

        return "\n".join(output)

    def _format_compact_dashboard(self, dashboard_data: Dict[str, Any]) -> str:
        """Format dashboard as compact single line"""
        timestamp = dashboard_data['timestamp'][:19]

        # Extract key metrics
        prod_status = dashboard_data.get("production_status", {})
        status = prod_status.get("status", "unknown") if isinstance(prod_status, dict) else "error"

        evidence = dashboard_data.get("evidence", {})
        if isinstance(evidence, dict) and "error" not in evidence:
            completeness = evidence.get("completeness", {}).get("overall_completeness", 0)
            freshness = evidence.get("freshness", {}).get("freshness_percentage", 0)
        else:
            completeness = 0
            freshness = 0

        health = dashboard_data.get("health", {})
        if isinstance(health, dict) and "error" not in health:
            overall_health = health.get("overall_health", {}).get("status", "unknown")
            system = health.get("system_metrics", {})
            cpu = system.get("cpu_usage_percent", 0)
            memory = system.get("memory_usage_percent", 0)
        else:
            overall_health = "error"
            cpu = 0
            memory = 0

        alerts_count = len(dashboard_data.get("alerts", []))

        return (f"{timestamp} | Status: {status} | Evidence: {completeness:.0f}%/{freshness:.0f}% | "
                f"Health: {overall_health} | CPU: {cpu:.0f}% | Memory: {memory:.0f}% | "
                f"Alerts: {alerts_count}")

    def _format_rich_dashboard(self, dashboard_data: Dict[str, Any]) -> str:
        """Format dashboard as rich text with emojis"""
        output = []
        output.append("🚀 COMPREHENSIVE PRODUCTION DASHBOARD 🚀")
        output.append("=" * 80)
        output.append(f"📅 Generated: {dashboard_data['timestamp'][:19]}")
        output.append("")

        # Production Status
        prod_status = dashboard_data.get("production_status", {})
        if isinstance(prod_status, dict) and "error" not in prod_status:
            status_emoji = {
                "running": "⚡",
                "completed": "✅",
                "failed": "❌",
                "blocked": "🚫",
                "initializing": "🔄"
            }.get(prod_status.get('status', 'unknown'), "❓")

            output.append(f"{status_emoji} PRODUCTION STATUS:")
            output.append(f"   🆔 Run ID: {prod_status.get('run_id', 'N/A')}")
            output.append(f"   🎯 Command: {prod_status.get('command', 'N/A')}")
            output.append(f"   📊 Status: {prod_status.get('status', 'N/A')}")
            output.append("")

        # Evidence Summary
        evidence = dashboard_data.get("evidence", {})
        if isinstance(evidence, dict) and "error" not in evidence:
            completeness = evidence.get("completeness", {})
            freshness = evidence.get("freshness", {})

            evidence_emoji = "✅" if completeness.get("overall_completeness", 0) > 80 else "⚠️"
            output.append(f"{evidence_emoji} EVIDENCE TRAILS:")
            output.append(".1f")
            output.append(f"   🆕 Fresh: {freshness.get('fresh_evidence_count', 0)} | "
                         f"📅 Stale: {freshness.get('stale_evidence_count', 0)}")
            output.append("")

        # Health Summary
        health = dashboard_data.get("health", {})
        if isinstance(health, dict) and "error" not in health:
            overall = health.get("overall_health", {})
            system = health.get("system_metrics", {})

            health_emoji = {
                "excellent": "🌟",
                "good": "✅",
                "warning": "⚠️",
                "critical": "❌"
            }.get(overall.get('status', 'unknown'), "❓")

            output.append(f"{health_emoji} SYSTEM HEALTH:")
            output.append(f"   Overall: {overall.get('status', 'unknown').upper()}")
            output.append(f"   🏃 CPU: {system.get('cpu_status', 'unknown')} "
                         f"({system.get('cpu_usage_percent', 0):.1f}%)")
            output.append(f"   💾 Memory: {system.get('memory_status', 'unknown')} "
                         f"({system.get('memory_usage_percent', 0):.1f}%)")
            output.append(f"   💿 Disk: {system.get('disk_status', 'unknown')} "
                         f"({system.get('disk_usage_percent', 0):.1f}%)")
            output.append("")

        # Alerts
        alerts = dashboard_data.get("alerts", [])
        if alerts:
            output.append("🚨 ACTIVE ALERTS:")
            for alert in alerts:
                output.append(f"   • {alert}")
            output.append("")

        return "\n".join(output)

    def _format_table_dashboard(self, dashboard_data: Dict[str, Any]) -> str:
        """Format dashboard as table (simplified)"""
        # This would implement a proper table format
        # For now, return text format
        return self._format_text_dashboard(dashboard_data)

    def _show_interactive_help(self) -> None:
        """Show interactive mode help"""
        print("""
Available Commands:
  status       Show current production status
  evidence     Show evidence trail report
  health       Show system health dashboard
  watch [sec]  Watch mode with optional interval (default 30s)
  alerts       Show active alerts
  config       Show dashboard configuration
  help         Show this help message
  quit         Exit interactive mode

Shortcuts: q, exit, h, ?
        """.strip())


def main():
    """CLI entry point for dashboard"""
    parser = argparse.ArgumentParser(description="CLI Dashboard Interface")
    parser.add_argument("command", choices=["show", "watch", "interactive", "status", "evidence", "health"],
                       help="Dashboard command")
    parser.add_argument("--format", default="text", choices=["text", "compact", "rich", "json", "table"],
                       help="Output format")
    parser.add_argument("--interval", type=int, default=30,
                       help="Watch mode refresh interval in seconds")
    parser.add_argument("--iterations", type=int,
                       help="Maximum number of watch iterations")
    parser.add_argument("--no-evidence", action="store_true",
                       help="Exclude evidence trails from dashboard")
    parser.add_argument("--no-health", action="store_true",
                       help="Exclude health metrics from dashboard")
    parser.add_argument("--no-progress", action="store_true",
                       help="Exclude progress tracking from dashboard")

    args = parser.parse_args()

    dashboard = CLIDashboard()

    try:
        if args.command == "show":
            result = dashboard.generate_dashboard(
                args.format,
                show_evidence=not args.no_evidence,
                show_health=not args.no_health,
                show_progress=not args.no_progress
            )
            print(result)

        elif args.command == "watch":
            dashboard.watch_mode(args.interval, args.format, args.iterations)

        elif args.command == "interactive":
            dashboard.interactive_mode()

        elif args.command == "status":
            status = dashboard.status_manager.get_status()
            if args.format == "json":
                print(json.dumps(status, indent=2, default=str))
            else:
                print("Current Production Status:")
                print(json.dumps(status, indent=2, default=str))

        elif args.command == "evidence":
            report = dashboard.evidence_monitor.generate_evidence_report(format_type=args.format)
            print(report)

        elif args.command == "health":
            health = dashboard.health_dashboard.generate_health_dashboard(args.format)
            print(health)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Real-Time Telemetry Collection System
Collects and aggregates telemetry data from various sources with monitoring capabilities
"""

import json
import os
import sys
import logging
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable, Set
import psutil
import signal

class TelemetryCollector:
    """Real-time telemetry collection and aggregation system"""

    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_config(config_path)
        self.goalie_dir = Path(os.environ.get("PROJECT_ROOT", ".")) / ".goalie"
        self.logger = self._setup_logging()

        # Collection configuration
        collection_config = self.config.get("observability", {})
        self.collection_interval = collection_config.get("collection_interval_seconds", 30)
        self.retention_days = collection_config.get("retention_days", 30)
        self.telemetry_sources = set(collection_config.get("telemetry_sources", []))

        # Alerting configuration
        alerting_config = collection_config.get("alerting", {})
        self.alerting_enabled = alerting_config.get("enabled", True)
        self.alert_channels = alerting_config.get("channels", ["console"])

        # Thresholds
        thresholds = alerting_config.get("thresholds", {})
        self.gap_coverage_threshold = thresholds.get("gap_coverage_percentage", 80)
        self.anomaly_confidence_threshold = thresholds.get("anomaly_confidence", 0.95)
        self.pattern_deviation_threshold = thresholds.get("pattern_deviation_threshold", 0.2)

        # Collection state
        self.is_running = False
        self.collection_thread = None
        self.stop_event = threading.Event()

        # Data buffers
        self.telemetry_buffer = deque(maxlen=1000)
        self.metrics_buffer = defaultdict(lambda: deque(maxlen=100))

        # Callbacks
        self.alert_callbacks: List[Callable] = []
        self.data_callbacks: List[Callable] = []

        # Initialize output files
        self._ensure_output_files()

    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load observability configuration"""
        if config_path:
            config_file = Path(config_path)
        else:
            config_file = Path(os.environ.get("PROJECT_ROOT", ".")) / ".goalie" / "observability_config.json"

        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    return json.load(f)
            except json.JSONDecodeError as e:
                print(f"Error loading config: {e}", file=sys.stderr)
                return {}
        return {}

    def _setup_logging(self) -> logging.Logger:
        """Setup logging for telemetry collection"""
        logger = logging.getLogger("telemetry_collector")
        logger.setLevel(logging.INFO)

        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

        log_config = self.config.get("logging", {})
        if log_config.get("outputs"):
            for output in log_config["outputs"]:
                if output != "console":
                    file_handler = logging.FileHandler(output)
                    file_handler.setLevel(logging.INFO)
                    file_handler.setFormatter(formatter)
                    logger.addHandler(file_handler)

        return logger

    def _ensure_output_files(self):
        """Ensure telemetry output files exist"""
        self.telemetry_file = self.goalie_dir / "telemetry_log.jsonl"
        self.metrics_file = self.goalie_dir / "performance_metrics.jsonl"
        self.alerts_file = self.goalie_dir / "observability_alerts.jsonl"

        # Create files if they don't exist
        for file_path in [self.telemetry_file, self.metrics_file, self.alerts_file]:
            if not file_path.exists():
                file_path.touch()

    def add_alert_callback(self, callback: Callable):
        """Add callback for alert notifications"""
        self.alert_callbacks.append(callback)

    def add_data_callback(self, callback: Callable):
        """Add callback for data collection events"""
        self.data_callbacks.append(callback)

    def collect_evidence_emitter_data(self) -> List[Dict[str, Any]]:
        """Collect data from evidence emitters"""
        evidence_data = []

        evidence_files = [
            "unified_evidence.jsonl",
            "economic_compounding.jsonl",
            "maturity_coverage.jsonl",
            "observability_gaps.jsonl",
            "performance_metrics.jsonl",
            "system_health.json"
        ]

        for filename in evidence_files:
            file_path = self.goalie_dir / filename
            if file_path.exists():
                try:
                    if filename.endswith('.jsonl'):
                        with open(file_path, 'r') as f:
                            lines = f.readlines()[-10:]  # Last 10 entries
                            for line in lines:
                                line = line.strip()
                                if line:
                                    try:
                                        event = json.loads(line)
                                        evidence_data.append({
                                            "source": "evidence_emitter",
                                            "file": filename,
                                            "data": event,
                                            "collection_timestamp": datetime.now(timezone.utc).isoformat()
                                        })
                                    except json.JSONDecodeError:
                                        continue
                    elif filename.endswith('.json'):
                        with open(file_path, 'r') as f:
                            data = json.load(f)
                            evidence_data.append({
                                "source": "evidence_emitter",
                                "file": filename,
                                "data": data,
                                "collection_timestamp": datetime.now(timezone.utc).isoformat()
                            })
                except Exception as e:
                    self.logger.error(f"Error collecting from {filename}: {e}")

        return evidence_data

    def collect_pattern_metrics_data(self) -> List[Dict[str, Any]]:
        """Collect data from pattern metrics"""
        pattern_data = []

        pattern_files = [
            "pattern_metrics.jsonl",
            "wsjf_config.json"
        ]

        for filename in pattern_files:
            file_path = self.goalie_dir / filename
            if file_path.exists():
                try:
                    if filename.endswith('.jsonl'):
                        with open(file_path, 'r') as f:
                            lines = f.readlines()[-20:]  # Last 20 entries for patterns
                            for line in lines:
                                line = line.strip()
                                if line:
                                    try:
                                        event = json.loads(line)
                                        pattern_data.append({
                                            "source": "pattern_metrics",
                                            "file": filename,
                                            "data": event,
                                            "collection_timestamp": datetime.now(timezone.utc).isoformat()
                                        })
                                    except json.JSONDecodeError:
                                        continue
                    elif filename.endswith('.json'):
                        with open(file_path, 'r') as f:
                            data = json.load(f)
                            pattern_data.append({
                                "source": "pattern_metrics",
                                "file": filename,
                                "data": data,
                                "collection_timestamp": datetime.now(timezone.utc).isoformat()
                            })
                except Exception as e:
                    self.logger.error(f"Error collecting from {filename}: {e}")

        return pattern_data

    def collect_system_health_data(self) -> Dict[str, Any]:
        """Collect system health and performance metrics"""
        try:
            system_data = {
                "source": "system_health",
                "collection_timestamp": datetime.now(timezone.utc).isoformat(),
                "cpu": {
                    "usage_percent": psutil.cpu_percent(interval=1),
                    "count": psutil.cpu_count(),
                    "frequency": psutil.cpu_freq().current if psutil.cpu_freq() else None
                },
                "memory": {
                    "total_mb": psutil.virtual_memory().total / 1024 / 1024,
                    "available_mb": psutil.virtual_memory().available / 1024 / 1024,
                    "used_mb": psutil.virtual_memory().used / 1024 / 1024,
                    "usage_percent": psutil.virtual_memory().percent
                },
                "disk": {
                    "total_gb": psutil.disk_usage('/').total / 1024 / 1024 / 1024,
                    "free_gb": psutil.disk_usage('/').free / 1024 / 1024 / 1024,
                    "used_gb": psutil.disk_usage('/').used / 1024 / 1024 / 1024,
                    "usage_percent": psutil.disk_usage('/').percent
                },
                "network": {
                    "bytes_sent": psutil.net_io_counters().bytes_sent,
                    "bytes_recv": psutil.net_io_counters().bytes_recv,
                    "packets_sent": psutil.net_io_counters().packets_sent,
                    "packets_recv": psutil.net_io_counters().packets_recv
                },
                "process": {
                    "pid": os.getpid(),
                    "memory_mb": psutil.Process().memory_info().rss / 1024 / 1024,
                    "cpu_percent": psutil.Process().cpu_percent(),
                    "threads": psutil.Process().num_threads()
                }
            }

            return system_data
        except Exception as e:
            self.logger.error(f"Error collecting system health data: {e}")
            return {
                "source": "system_health",
                "error": str(e),
                "collection_timestamp": datetime.now(timezone.utc).isoformat()
            }

    def collect_performance_logs_data(self) -> List[Dict[str, Any]]:
        """Collect data from performance logs"""
        performance_data = []

        log_files = [
            "metrics_log.jsonl",
            "test_metrics_log.jsonl",
            "process_flow_metrics.json"
        ]

        for filename in log_files:
            file_path = self.goalie_dir / filename
            if file_path.exists():
                try:
                    if filename.endswith('.jsonl'):
                        with open(file_path, 'r') as f:
                            lines = f.readlines()[-5:]  # Last 5 entries
                            for line in lines:
                                line = line.strip()
                                if line:
                                    try:
                                        event = json.loads(line)
                                        performance_data.append({
                                            "source": "performance_logs",
                                            "file": filename,
                                            "data": event,
                                            "collection_timestamp": datetime.now(timezone.utc).isoformat()
                                        })
                                    except json.JSONDecodeError:
                                        continue
                    elif filename.endswith('.json'):
                        with open(file_path, 'r') as f:
                            data = json.load(f)
                            performance_data.append({
                                "source": "performance_logs",
                                "file": filename,
                                "data": data,
                                "collection_timestamp": datetime.now(timezone.utc).isoformat()
                            })
                except Exception as e:
                    self.logger.error(f"Error collecting from {filename}: {e}")

        return performance_data

    def collect_telemetry_data(self) -> Dict[str, Any]:
        """Collect telemetry data from all configured sources"""
        telemetry_data = {
            "collection_timestamp": datetime.now(timezone.utc).isoformat(),
            "sources": {}
        }

        # Collect from each source
        if "evidence_emitters" in self.telemetry_sources:
            telemetry_data["sources"]["evidence_emitters"] = self.collect_evidence_emitter_data()

        if "pattern_metrics" in self.telemetry_sources:
            telemetry_data["sources"]["pattern_metrics"] = self.collect_pattern_metrics_data()

        if "system_health" in self.telemetry_sources:
            telemetry_data["sources"]["system_health"] = self.collect_system_health_data()

        if "performance_logs" in self.telemetry_sources:
            telemetry_data["sources"]["performance_logs"] = self.collect_performance_logs_data()

        return telemetry_data

    def store_telemetry_data(self, data: Dict[str, Any]):
        """Store collected telemetry data"""
        try:
            # Write to telemetry log
            with open(self.telemetry_file, 'a') as f:
                f.write(json.dumps(data) + '\n')

            # Extract and store performance metrics
            self._extract_and_store_metrics(data)

            # Notify data callbacks
            for callback in self.data_callbacks:
                try:
                    callback(data)
                except Exception as e:
                    self.logger.error(f"Error in data callback: {e}")

        except Exception as e:
            self.logger.error(f"Error storing telemetry data: {e}")

    def _extract_and_store_metrics(self, telemetry_data: Dict[str, Any]):
        """Extract performance metrics from telemetry data"""
        try:
            metrics = {
                "timestamp": telemetry_data["collection_timestamp"],
                "metrics": {}
            }

            # Extract system health metrics
            if "system_health" in telemetry_data.get("sources", {}):
                system_data = telemetry_data["sources"]["system_health"]
                if "cpu" in system_data:
                    metrics["metrics"]["cpu_usage"] = system_data["cpu"]["usage_percent"]
                if "memory" in system_data:
                    metrics["metrics"]["memory_usage_mb"] = system_data["memory"]["used_mb"]
                    metrics["metrics"]["memory_usage_percent"] = system_data["memory"]["usage_percent"]

            # Extract pattern execution metrics
            pattern_count = 0
            success_count = 0

            for source_data in telemetry_data.get("sources", {}).values():
                if isinstance(source_data, list):
                    for item in source_data:
                        if isinstance(item, dict) and "data" in item:
                            event_data = item["data"]
                            if "pattern" in event_data or "pattern_type" in event_data:
                                pattern_count += 1
                                if event_data.get("status") == "completed":
                                    success_count += 1

            if pattern_count > 0:
                metrics["metrics"]["pattern_execution_count"] = pattern_count
                metrics["metrics"]["pattern_success_rate"] = success_count / pattern_count

            # Store metrics
            with open(self.metrics_file, 'a') as f:
                f.write(json.dumps(metrics) + '\n')

            # Update metrics buffer for alerting
            for key, value in metrics["metrics"].items():
                self.metrics_buffer[key].append({
                    "timestamp": metrics["timestamp"],
                    "value": value
                })

        except Exception as e:
            self.logger.error(f"Error extracting metrics: {e}")

    def check_alerts(self):
        """Check for alerting conditions"""
        try:
            alerts = []

            # Check coverage gaps
            if len(self.telemetry_buffer) > 0:
                recent_data = list(self.telemetry_buffer)[-10:]  # Last 10 collections
                coverage_score = self._calculate_coverage_score(recent_data)

                if coverage_score < self.gap_coverage_threshold / 100:
                    alerts.append({
                        "type": "coverage_gap",
                        "severity": "high",
                        "message": f"Telemetry coverage dropped to {coverage_score:.1%}",
                        "threshold": self.gap_coverage_threshold,
                        "current_value": coverage_score * 100
                    })

            # Check pattern deviation
            if "pattern_success_rate" in self.metrics_buffer:
                success_rates = [m["value"] for m in self.metrics_buffer["pattern_success_rate"]]
                if len(success_rates) >= 5:
                    avg_success_rate = sum(success_rates[-5:]) / 5
                    if avg_success_rate < 0.8:  # Less than 80% success rate
                        alerts.append({
                            "type": "pattern_performance",
                            "severity": "medium",
                            "message": f"Pattern success rate dropped to {avg_success_rate:.1%}",
                            "threshold": 80,
                            "current_value": avg_success_rate * 100
                        })

            # Check system resource alerts
            if "cpu_usage" in self.metrics_buffer:
                cpu_usage = [m["value"] for m in self.metrics_buffer["cpu_usage"]]
                if cpu_usage and cpu_usage[-1] > 90:
                    alerts.append({
                        "type": "system_resource",
                        "severity": "high",
                        "message": f"CPU usage is critically high: {cpu_usage[-1]:.1f}%",
                        "threshold": 90,
                        "current_value": cpu_usage[-1]
                    })

            # Send alerts
            for alert in alerts:
                self._send_alert(alert)

        except Exception as e:
            self.logger.error(f"Error checking alerts: {e}")

    def _calculate_coverage_score(self, recent_data: List[Dict[str, Any]]) -> float:
        """Calculate telemetry coverage score"""
        if not recent_data:
            return 0.0

        expected_sources = len(self.telemetry_sources)
        if expected_sources == 0:
            return 1.0

        total_coverage = 0.0
        for data in recent_data:
            sources_present = 0
            for source in self.telemetry_sources:
                if source in data.get("sources", {}) and data["sources"][source]:
                    sources_present += 1
            total_coverage += sources_present / expected_sources

        return total_coverage / len(recent_data)

    def _send_alert(self, alert: Dict[str, Any]):
        """Send alert through configured channels"""
        try:
            alert_data = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "alert": alert
            }

            # Write to alerts file
            with open(self.alerts_file, 'a') as f:
                f.write(json.dumps(alert_data) + '\n')

            # Send to console
            if "console" in self.alert_channels:
                severity_emoji = {"high": "🚨", "medium": "⚠️", "low": "ℹ️"}.get(alert["severity"], "ℹ️")
                print(f"{severity_emoji} ALERT: {alert['message']}", file=sys.stderr)

            # Notify alert callbacks
            for callback in self.alert_callbacks:
                try:
                    callback(alert)
                except Exception as e:
                    self.logger.error(f"Error in alert callback: {e}")

        except Exception as e:
            self.logger.error(f"Error sending alert: {e}")

    def collection_loop(self):
        """Main collection loop"""
        self.logger.info("Starting telemetry collection loop")

        while not self.stop_event.is_set():
            try:
                # Collect telemetry data
                telemetry_data = self.collect_telemetry_data()

                # Store data
                self.store_telemetry_data(telemetry_data)

                # Add to buffer
                self.telemetry_buffer.append(telemetry_data)

                # Check alerts
                if self.alerting_enabled:
                    self.check_alerts()

                # Clean up old data
                self._cleanup_old_data()

                # Wait for next collection
                self.stop_event.wait(self.collection_interval)

            except Exception as e:
                self.logger.error(f"Error in collection loop: {e}")
                self.stop_event.wait(5)  # Wait 5 seconds before retrying

        self.logger.info("Telemetry collection loop stopped")

    def _cleanup_old_data(self):
        """Clean up old telemetry data beyond retention period"""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.retention_days)

            # Clean up telemetry file
            if self.telemetry_file.exists():
                lines_to_keep = []
                with open(self.telemetry_file, 'r') as f:
                    for line in f:
                        try:
                            data = json.loads(line.strip())
                            ts = datetime.fromisoformat(data["collection_timestamp"].replace('Z', '+00:00'))
                            if ts >= cutoff_date:
                                lines_to_keep.append(line.strip())
                        except:
                            continue

                if len(lines_to_keep) < 1000:  # Only rewrite if we removed significant data
                    with open(self.telemetry_file, 'w') as f:
                        for line in lines_to_keep:
                            f.write(line + '\n')

        except Exception as e:
            self.logger.error(f"Error cleaning up old data: {e}")

    def start_collection(self):
        """Start the telemetry collection process"""
        if self.is_running:
            self.logger.warning("Telemetry collection is already running")
            return

        self.is_running = True
        self.stop_event.clear()
        self.collection_thread = threading.Thread(target=self.collection_loop, daemon=True)
        self.collection_thread.start()
        self.logger.info("Telemetry collection started")

    def stop_collection(self):
        """Stop the telemetry collection process"""
        if not self.is_running:
            return

        self.logger.info("Stopping telemetry collection...")
        self.stop_event.set()
        self.is_running = False

        if self.collection_thread and self.collection_thread.is_alive():
            self.collection_thread.join(timeout=10)

        self.logger.info("Telemetry collection stopped")

    def get_collection_status(self) -> Dict[str, Any]:
        """Get current collection status"""
        return {
            "is_running": self.is_running,
            "collection_interval": self.collection_interval,
            "sources": list(self.telemetry_sources),
            "buffer_size": len(self.telemetry_buffer),
            "alerts_enabled": self.alerting_enabled,
            "retention_days": self.retention_days
        }

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    if 'collector' in globals():
        collector.stop_collection()
    sys.exit(0)

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Real-Time Telemetry Collector")
    parser.add_argument("--config", help="Path to observability config file")
    parser.add_argument("--daemon", action="store_true", help="Run as daemon")
    parser.add_argument("--once", action="store_true", help="Collect once and exit")
    parser.add_argument("--status", action="store_true", help="Show collection status")
    parser.add_argument("--json", action="store_true", help="Output status as JSON")

    args = parser.parse_args()

    collector = TelemetryCollector(args.config)

    if args.status:
        status = collector.get_collection_status()
        if args.json:
            print(json.dumps(status, indent=2, default=str))
        else:
            print("Telemetry Collection Status:")
            print(f"  Running: {status['is_running']}")
            print(f"  Interval: {status['collection_interval']}s")
            print(f"  Sources: {', '.join(status['sources'])}")
            print(f"  Buffer Size: {status['buffer_size']}")
            print(f"  Alerts: {status['alerts_enabled']}")
        return

    if args.once:
        # Collect once
        data = collector.collect_telemetry_data()
        collector.store_telemetry_data(data)
        print("Telemetry collection completed")
        return

    if args.daemon:
        # Run as daemon
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

        collector.start_collection()

        try:
            # Keep running
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
        finally:
            collector.stop_collection()
    else:
        # Interactive mode - collect once and show status
        collector.start_collection()
        time.sleep(2)  # Let it collect some data
        collector.stop_collection()

        status = collector.get_collection_status()
        print("Collection completed. Status:")
        print(json.dumps(status, indent=2, default=str))

if __name__ == "__main__":
    main()
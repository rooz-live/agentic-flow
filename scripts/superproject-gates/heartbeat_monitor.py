#!/usr/bin/env python3
"""
Unified Heartbeat Monitoring System
Standardizes heartbeat formats across all system components for unified monitoring
and early detection of anomalies.
"""

import json
import time
import sqlite3
import logging
import asyncio
import aiohttp
import argparse
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
from pathlib import Path
from collections import defaultdict
import re
import subprocess
import socket
import json as json_module
import ipaddress

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s|heartbeat_monitor|%(levelname)s|%(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class Heartbeat:
    """Standard heartbeat format for all system components"""
    timestamp: str
    component: str
    phase: str
    status: str
    elapsed: int
    correlation_id: str
    metrics: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_log_line(cls, line: str) -> Optional['Heartbeat']:
        """Parse heartbeat from standardized log format"""
        try:
            # Expected formats:
            # 5-field: ts|component|phase|status|elapsed
            # 6+-field: ts|component|phase|status|elapsed|correlation_id|metrics
            parts = line.strip().split('|')
            if len(parts) < 5:
                return None

            if len(parts) == 5:
                # 5-field format: ts|component|phase|status|elapsed
                return cls(
                    timestamp=parts[0],
                    component=parts[1],
                    phase=parts[2],
                    status=parts[3],
                    elapsed=int(parts[4]),
                    correlation_id="",
                    metrics=""
                )
            else:
                # 6+ field format: ts|component|phase|status|elapsed|correlation_id|metrics
                return cls(
                    timestamp=parts[0],
                    component=parts[1],
                    phase=parts[2],
                    status=parts[3],
                    elapsed=int(parts[4]),
                    correlation_id=parts[5],
                    metrics=parts[6] if len(parts) > 6 else ""
                )
        except (ValueError, IndexError) as e:
            logger.warning(f"Failed to parse heartbeat line: {line} - {e}")
            return None

class HeartbeatDatabase:
    """SQLite database for storing and querying heartbeats"""

    def __init__(self, db_path: str = "heartbeats.db"):
        self.db_path = db_path
        self.init_db()

    def init_db(self):
        """Initialize database schema"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS heartbeats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    component TEXT NOT NULL,
                    phase TEXT NOT NULL,
                    status TEXT NOT NULL,
                    elapsed INTEGER NOT NULL,
                    correlation_id TEXT NOT NULL,
                    metrics TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Create indexes for common queries
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_component_timestamp
                ON heartbeats(component, timestamp)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_status_timestamp
                ON heartbeats(status, timestamp)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_correlation_id
                ON heartbeats(correlation_id)
            """)

    def store_heartbeat(self, heartbeat: Heartbeat):
        """Store heartbeat in database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO heartbeats
                (timestamp, component, phase, status, elapsed, correlation_id, metrics)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                heartbeat.timestamp,
                heartbeat.component,
                heartbeat.phase,
                heartbeat.status,
                heartbeat.elapsed,
                heartbeat.correlation_id,
                heartbeat.metrics
            ))

    def get_recent_heartbeats(self, component: str = None, hours: int = 24) -> List[Dict]:
        """Get recent heartbeats for analysis"""
        since = (datetime.now() - timedelta(hours=hours)).isoformat()

        query = """
            SELECT * FROM heartbeats
            WHERE timestamp > ?
        """
        params = [since]

        if component:
            query += " AND component = ?"
            params.append(component)

        query += " ORDER BY timestamp DESC"

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

class AnomalyDetector:
    """Detect anomalies in heartbeat patterns"""

    def __init__(self, db: HeartbeatDatabase):
        self.db = db

    def detect_missing_heartbeats(self, expected_interval: int = 300) -> List[Dict]:
        """Detect components that haven't sent heartbeats recently"""
        anomalies = []
        recent_heartbeats = self.db.get_recent_heartbeats(hours=2)

        # Group by component
        component_last_seen = {}
        for hb in recent_heartbeats:
            component = hb['component']
            timestamp = hb['timestamp']

            if component not in component_last_seen:
                component_last_seen[component] = timestamp
            elif timestamp > component_last_seen[component]:
                component_last_seen[component] = timestamp

        # Check for missing heartbeats
        now = datetime.now()
        for component, last_seen in component_last_seen.items():
            try:
                last_time = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
                if last_time.tzinfo:
                    last_time = last_time.replace(tzinfo=None)

                seconds_since = (now - last_time).total_seconds()

                if seconds_since > expected_interval:
                    anomalies.append({
                        'type': 'missing_heartbeat',
                        'component': component,
                        'last_seen': last_seen,
                        'seconds_since': int(seconds_since),
                        'severity': 'high' if seconds_since > expected_interval * 2 else 'medium'
                    })
            except ValueError as e:
                logger.warning(f"Failed to parse timestamp {last_seen}: {e}")

        return anomalies

    def detect_error_spikes(self, threshold: float = 0.5) -> List[Dict]:
        """Detect unusual spikes in error rates"""
        anomalies = []
        recent_heartbeats = self.db.get_recent_heartbeats(hours=1)

        # Group by component and calculate error rates
        component_stats = defaultdict(lambda: {'total': 0, 'errors': 0})

        for hb in recent_heartbeats:
            component = hb['component']
            status = hb['status']

            component_stats[component]['total'] += 1
            if status in ['ERROR', 'FAIL', 'TIMEOUT']:
                component_stats[component]['errors'] += 1

        # Check for high error rates
        for component, stats in component_stats.items():
            if stats['total'] < 5:  # Need minimum samples
                continue

            error_rate = stats['errors'] / stats['total']

            if error_rate > threshold:
                anomalies.append({
                    'type': 'error_spike',
                    'component': component,
                    'error_rate': round(error_rate, 2),
                    'total_requests': stats['total'],
                    'errors': stats['errors'],
                    'severity': 'high' if error_rate > 0.8 else 'medium'
                })

        return anomalies

    def detect_performance_degradation(self, threshold_multiplier: float = 2.0) -> List[Dict]:
        """Detect performance degradation based on elapsed times"""
        anomalies = []

        # Get baseline performance (last week)
        baseline_heartbeats = self.db.get_recent_heartbeats(hours=168)  # 1 week
        recent_heartbeats = self.db.get_recent_heartbeats(hours=1)

        # Calculate baseline performance by component/phase
        baseline_stats = defaultdict(list)
        for hb in baseline_heartbeats:
            key = f"{hb['component']}|{hb['phase']}"
            if hb['status'] == 'OK':
                baseline_stats[key].append(hb['elapsed'])

        # Calculate baseline averages
        baseline_averages = {}
        for key, elapsed_times in baseline_stats.items():
            if len(elapsed_times) > 10:  # Need minimum samples
                baseline_averages[key] = sum(elapsed_times) / len(elapsed_times)

        # Check recent performance
        recent_stats = defaultdict(list)
        for hb in recent_heartbeats:
            key = f"{hb['component']}|{hb['phase']}"
            if hb['status'] == 'OK':
                recent_stats[key].append(hb['elapsed'])

        # Compare recent vs baseline
        for key, elapsed_times in recent_stats.items():
            if len(elapsed_times) < 3:  # Need minimum samples
                continue

            if key not in baseline_averages:
                continue

            recent_avg = sum(elapsed_times) / len(elapsed_times)
            baseline_avg = baseline_averages[key]

            if recent_avg > baseline_avg * threshold_multiplier:
                component, phase = key.split('|', 1)
                anomalies.append({
                    'type': 'performance_degradation',
                    'component': component,
                    'phase': phase,
                    'recent_avg': round(recent_avg, 2),
                    'baseline_avg': round(baseline_avg, 2),
                    'degradation_factor': round(recent_avg / baseline_avg, 2),
                    'severity': 'high' if recent_avg > baseline_avg * 3 else 'medium'
                })

        return anomalies

    def detect_response_time_spikes(self, threshold_multiplier: float = 3.0) -> List[Dict]:
        """Detect response time spikes using moving averages"""
        anomalies = []
        recent_heartbeats = self.db.get_recent_heartbeats(hours=1)

        # Group by component
        component_data = defaultdict(list)
        for hb in recent_heartbeats:
            if hb['elapsed'] > 0:  # Only consider heartbeats with timing data
                component_data[hb['component']].append({
                    'timestamp': hb['timestamp'],
                    'elapsed': hb['elapsed'],
                    'phase': hb['phase']
                })

        for component, heartbeats in component_data.items():
            if len(heartbeats) < 10:  # Need baseline data
                continue

            # Sort by timestamp
            heartbeats.sort(key=lambda x: x['timestamp'])

            # Calculate moving average of last 10 heartbeats
            recent_times = [hb['elapsed'] for hb in heartbeats[-10:]]
            baseline_avg = statistics.mean(recent_times[:-1])  # Exclude current
            current_time = recent_times[-1]

            if current_time > baseline_avg * threshold_multiplier:
                anomalies.append({
                    'type': 'response_time_spike',
                    'component': component,
                    'current_time': current_time,
                    'baseline_avg': round(baseline_avg, 2),
                    'multiplier': round(current_time / baseline_avg, 2),
                    'severity': 'high' if current_time > baseline_avg * 5 else 'medium'
                })

        return anomalies

    def detect_memory_spikes(self, threshold_multiplier: float = 2.0) -> List[Dict]:
        """Detect memory usage spikes from heartbeat metrics"""
        anomalies = []
        recent_heartbeats = self.db.get_recent_heartbeats(hours=1)

        for hb in recent_heartbeats:
            try:
                metrics = json.loads(hb['metrics'])
                memory_mb = metrics.get('memory_usage_mb', 0)

                if memory_mb > 0:
                    # Get recent memory usage for this component
                    component_heartbeats = self.db.get_recent_heartbeats(component=hb['component'], hours=1)
                    memory_values = []

                    for chb in component_heartbeats:
                        try:
                            cmetrics = json.loads(chb['metrics'])
                            cmemory = cmetrics.get('memory_usage_mb', 0)
                            if cmemory > 0:
                                memory_values.append(cmemory)
                        except (json.JSONDecodeError, KeyError):
                            continue

                    if len(memory_values) >= 10:
                        baseline_avg = statistics.mean(memory_values[:-1])  # Exclude current

                        if memory_mb > baseline_avg * threshold_multiplier:
                            anomalies.append({
                                'type': 'memory_spike',
                                'component': hb['component'],
                                'current_memory': memory_mb,
                                'baseline_avg': round(baseline_avg, 2),
                                'multiplier': round(memory_mb / baseline_avg, 2),
                                'severity': 'high' if memory_mb > baseline_avg * 3 else 'medium'
                            })

            except (json.JSONDecodeError, KeyError):
                continue

        return anomalies

    def detect_cpu_spikes(self, threshold_percent: float = 80.0) -> List[Dict]:
        """Detect CPU usage spikes"""
        anomalies = []
        recent_heartbeats = self.db.get_recent_heartbeats(hours=1)

        for hb in recent_heartbeats:
            try:
                metrics = json.loads(hb['metrics'])
                cpu_percent = metrics.get('cpu_usage_percent', 0)

                if cpu_percent > threshold_percent:
                    anomalies.append({
                        'type': 'cpu_spike',
                        'component': hb['component'],
                        'current_cpu': cpu_percent,
                        'threshold': threshold_percent,
                        'severity': 'critical' if cpu_percent > 95 else 'high'
                    })

            except (json.JSONDecodeError, KeyError):
                continue

        return anomalies

    def detect_operation_failures(self) -> List[Dict]:
        """Detect operation failures from heartbeat status and custom metrics"""
        anomalies = []
        recent_heartbeats = self.db.get_recent_heartbeats(hours=1)

        for hb in recent_heartbeats:
            # Check status
            if hb['status'] in ['ERROR', 'FAIL', 'TIMEOUT']:
                anomalies.append({
                    'type': 'operation_failure',
                    'component': hb['component'],
                    'phase': hb['phase'],
                    'status': hb['status'],
                    'severity': 'high'
                })

            # Check custom metrics for failure indicators
            try:
                metrics = json.loads(hb['metrics'])
                custom_metrics = metrics.get('custom_metrics', {})

                if 'status' in custom_metrics:
                    status = custom_metrics['status']
                    if status in ['failed', 'error', 'blocked']:
                        anomalies.append({
                            'type': 'operation_failure',
                            'component': hb['component'],
                            'phase': hb['phase'],
                            'status': status,
                            'severity': 'high'
                        })

            except (json.JSONDecodeError, KeyError):
                continue

        return anomalies

    def detect_format_anomalies(self) -> List[Dict]:
        """Detect incorrect heartbeat formats"""
        anomalies = []
        recent_heartbeats = self.db.get_recent_heartbeats(hours=1)

        for hb in recent_heartbeats:
            # Check for malformed timestamps
            try:
                datetime.fromisoformat(hb['timestamp'].replace('Z', '+00:00'))
            except ValueError:
                anomalies.append({
                    'type': 'format_error',
                    'component': hb['component'],
                    'field': 'timestamp',
                    'value': hb['timestamp'],
                    'severity': 'medium'
                })

            # Check for invalid elapsed times
            if not isinstance(hb['elapsed'], int) or hb['elapsed'] < 0:
                anomalies.append({
                    'type': 'format_error',
                    'component': hb['component'],
                    'field': 'elapsed',
                    'value': hb['elapsed'],
                    'severity': 'medium'
                })

            # Check for empty required fields
            if not hb['component'] or not hb['phase'] or not hb['status']:
                anomalies.append({
                    'type': 'format_error',
                    'component': hb['component'],
                    'field': 'required_fields',
                    'value': f"component='{hb['component']}', phase='{hb['phase']}', status='{hb['status']}'",
                    'severity': 'medium'
                })

        return anomalies

    def detect_timing_gaps(self, gap_threshold: int = 300) -> List[Dict]:
        """Detect gaps >300s between consecutive heartbeats for each component"""
        anomalies = []
        recent_heartbeats = self.db.get_recent_heartbeats(hours=24)

        # Group by component and sort by timestamp
        component_heartbeats = defaultdict(list)
        for hb in recent_heartbeats:
            component_heartbeats[hb['component']].append(hb)

        for component, heartbeats in component_heartbeats.items():
            if len(heartbeats) < 2:
                continue

            # Sort by timestamp
            heartbeats.sort(key=lambda x: x['timestamp'])

            for i in range(1, len(heartbeats)):
                try:
                    current_time = datetime.fromisoformat(heartbeats[i]['timestamp'].replace('Z', '+00:00'))
                    prev_time = datetime.fromisoformat(heartbeats[i-1]['timestamp'].replace('Z', '+00:00'))

                    if current_time.tzinfo:
                        current_time = current_time.replace(tzinfo=None)
                    if prev_time.tzinfo:
                        prev_time = prev_time.replace(tzinfo=None)

                    gap_seconds = (current_time - prev_time).total_seconds()

                    if gap_seconds > gap_threshold:
                        anomalies.append({
                            'type': 'timing_gap',
                            'component': component,
                            'gap_seconds': int(gap_seconds),
                            'from_timestamp': heartbeats[i-1]['timestamp'],
                            'to_timestamp': heartbeats[i]['timestamp'],
                            'severity': 'high' if gap_seconds > gap_threshold * 2 else 'medium'
                        })
                except ValueError as e:
                    logger.warning(f"Failed to parse timestamps for gap detection: {e}")

        return anomalies

    def detect_irregular_intervals(self, deviation_threshold: float = 0.5) -> List[Dict]:
        """Detect irregular heartbeat intervals (timing issues)"""
        anomalies = []
        recent_heartbeats = self.db.get_recent_heartbeats(hours=24)

        # Group by component and calculate intervals
        component_heartbeats = defaultdict(list)
        for hb in recent_heartbeats:
            component_heartbeats[hb['component']].append(hb)

        for component, heartbeats in component_heartbeats.items():
            if len(heartbeats) < 5:  # Need minimum samples
                continue

            # Sort by timestamp and calculate intervals
            heartbeats.sort(key=lambda x: x['timestamp'])
            intervals = []

            for i in range(1, len(heartbeats)):
                try:
                    current_time = datetime.fromisoformat(heartbeats[i]['timestamp'].replace('Z', '+00:00'))
                    prev_time = datetime.fromisoformat(heartbeats[i-1]['timestamp'].replace('Z', '+00:00'))

                    if current_time.tzinfo:
                        current_time = current_time.replace(tzinfo=None)
                    if prev_time.tzinfo:
                        prev_time = prev_time.replace(tzinfo=None)

                    interval = (current_time - prev_time).total_seconds()
                    intervals.append(interval)
                except ValueError:
                    continue

            if len(intervals) < 4:
                continue

            # Calculate mean and standard deviation
            mean_interval = sum(intervals) / len(intervals)
            variance = sum((x - mean_interval) ** 2 for x in intervals) / len(intervals)
            std_dev = variance ** 0.5

            # Check for irregular intervals
            irregular_count = 0
            for interval in intervals:
                if abs(interval - mean_interval) > std_dev * deviation_threshold:
                    irregular_count += 1

            if irregular_count > len(intervals) * 0.3:  # More than 30% irregular
                anomalies.append({
                    'type': 'irregular_timing',
                    'component': component,
                    'mean_interval': round(mean_interval, 2),
                    'std_dev': round(std_dev, 2),
                    'irregular_count': irregular_count,
                    'total_intervals': len(intervals),
                    'severity': 'medium'
                })

        return anomalies

class HeartbeatMonitor:
    """Main heartbeat monitoring system"""

    def __init__(self, config_path: str = "monitor_config.json"):
        self.config = self.load_config(config_path)
        self.db = HeartbeatDatabase(self.config.get('database_path', 'heartbeats.db'))
        self.detector = AnomalyDetector(self.db)
        self.log_sources = self.config.get('log_sources', [])

    def load_config(self, config_path: str) -> Dict:
        """Load monitoring configuration"""
        default_config = {
            'database_path': 'heartbeats.db',
            'log_sources': [
                {'path': 'logs/heartbeats.log', 'type': 'file'},
                {'path': 'logs/validation_suite.log', 'type': 'file'},
                {'path': 'logs/deployment.log', 'type': 'file'}
            ],
            'alert_webhooks': [],
            'monitoring_interval': 60,
            'anomaly_thresholds': {
                'missing_heartbeat_seconds': 300,
                'error_rate_threshold': 0.5,
                'performance_degradation_multiplier': 2.0
            }
        }

        try:
            if Path(config_path).exists():
                with open(config_path, 'r') as f:
                    user_config = json.load(f)
                default_config.update(user_config)
        except Exception as e:
            logger.warning(f"Failed to load config from {config_path}: {e}")

        return default_config

    def parse_log_files(self):
        """Parse heartbeats from log files"""
        for source in self.log_sources:
            if source['type'] == 'file':
                self.parse_log_file(source['path'], source.get('format', 'pipe_separated'))
            elif source['type'] == 'directory':
                self.parse_log_directory(source['path'], source.get('format', 'jsonl'), source.get('pattern', '*'), source.get('recursive', False))

    def parse_log_file(self, log_path: str, format_type: str = 'pipe_separated'):
        """Parse heartbeats from a single log file"""
        try:
            log_file = Path(log_path)
            if not log_file.exists():
                return

            # Track last processed position to avoid reprocessing
            position_file = Path(f"{log_path}.position")
            last_position = 0

            if position_file.exists():
                try:
                    last_position = int(position_file.read_text())
                except ValueError:
                    last_position = 0

            with open(log_file, 'r') as f:
                f.seek(last_position)
                new_lines = 0

                for line in f:
                    heartbeat = None
                    if format_type == 'pipe_separated':
                        heartbeat = Heartbeat.from_log_line(line)
                    elif format_type == 'jsonl':
                        heartbeat = self.parse_jsonl_line(line)

                    if heartbeat:
                        self.db.store_heartbeat(heartbeat)
                        new_lines += 1

                # Update position
                current_position = f.tell()
                position_file.write_text(str(current_position))

                if new_lines > 0:
                    logger.info(f"Processed {new_lines} new heartbeats from {log_path}")

        except Exception as e:
            logger.error(f"Failed to parse log file {log_path}: {e}")

    def parse_log_directory(self, dir_path: str, format_type: str, pattern: str, recursive: bool = False):
        """Parse heartbeats from all files in a directory matching a pattern"""
        try:
            directory = Path(dir_path)
            if not directory.exists() or not directory.is_dir():
                return

            # Find all matching files
            if recursive:
                files = list(directory.rglob(pattern))
            else:
                files = list(directory.glob(pattern))

            for file_path in files:
                if file_path.is_file():
                    self.parse_log_file(str(file_path), format_type)

        except Exception as e:
            logger.error(f"Failed to parse log directory {dir_path}: {e}")

    def parse_jsonl_line(self, line: str) -> Optional[Heartbeat]:
        """Parse heartbeat from JSONL format used by ssr_test monitor"""
        try:
            data = json.loads(line.strip())

            # Convert JSONL format to standardized Heartbeat
            # JSONL format: {"timestamp": "...", "component": "...", "event_type": "...", "correlation_id": "...", "metrics": {...}}
            timestamp = data.get('timestamp', '')
            if timestamp and not timestamp.endswith('Z'):
                timestamp += 'Z'

            # Extract metrics
            metrics_data = data.get('metrics', {})
            execution_time = metrics_data.get('execution_time_ms', 0)
            memory_usage = metrics_data.get('memory_usage_mb', 0)
            cpu_usage = metrics_data.get('cpu_usage_percent', 0)

            # Create metrics JSON string
            metrics_json = json.dumps({
                'execution_time_ms': execution_time,
                'memory_usage_mb': memory_usage,
                'cpu_usage_percent': cpu_usage,
                'custom_metrics': data.get('data', {}),
                'event_type': data.get('event_type', 'heartbeat')
            })

            return Heartbeat(
                timestamp=timestamp,
                component=data.get('component', 'unknown'),
                phase=data.get('event_type', 'heartbeat'),
                status=self.infer_status_from_jsonl(data),
                elapsed=int(execution_time),
                correlation_id=data.get('correlation_id', ''),
                metrics=metrics_json
            )

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning(f"Failed to parse JSONL line: {line} - {e}")
            return None

    def infer_status_from_jsonl(self, data: Dict) -> str:
        """Infer status from JSONL heartbeat data"""
        custom_metrics = data.get('data', {})

        # Check for explicit status
        if 'status' in custom_metrics:
            status = custom_metrics['status']
            if status in ['success', 'ok', 'healthy']:
                return 'OK'
            elif status in ['failed', 'error', 'blocked']:
                return 'ERROR'
            elif status in ['warning', 'degraded']:
                return 'WARNING'

        # Default to OK for heartbeats
        return 'OK'

    def detect_anomalies(self) -> List[Dict]:
        """Run all anomaly detection algorithms"""
        thresholds = self.config['anomaly_thresholds']
        anomalies = []

        # Detect missing heartbeats
        anomalies.extend(
            self.detector.detect_missing_heartbeats(
                expected_interval=thresholds['missing_heartbeat_seconds']
            )
        )

        # Detect error spikes
        anomalies.extend(
            self.detector.detect_error_spikes(
                threshold=thresholds['error_rate_threshold']
            )
        )

        # Detect performance degradation
        anomalies.extend(
            self.detector.detect_performance_degradation(
                threshold_multiplier=thresholds['performance_degradation_multiplier']
            )
        )

        # Detect response time spikes
        anomalies.extend(
            self.detector.detect_response_time_spikes(
                threshold_multiplier=thresholds.get('response_time_spike_multiplier', 3.0)
            )
        )

        # Detect memory spikes
        anomalies.extend(
            self.detector.detect_memory_spikes(
                threshold_multiplier=thresholds.get('memory_spike_multiplier', 2.0)
            )
        )

        # Detect CPU spikes
        anomalies.extend(
            self.detector.detect_cpu_spikes(
                threshold_percent=thresholds.get('cpu_spike_threshold', 80.0)
            )
        )

        # Detect operation failures
        anomalies.extend(
            self.detector.detect_operation_failures()
        )

        return anomalies

    async def send_alerts(self, anomalies: List[Dict]):
        """Send alerts for detected anomalies"""
        if not anomalies:
            return

        for webhook_url in self.config.get('alert_webhooks', []):
            try:
                async with aiohttp.ClientSession() as session:
                    payload = {
                        'timestamp': datetime.now().isoformat(),
                        'anomalies': anomalies,
                        'total_anomalies': len(anomalies),
                        'high_severity': len([a for a in anomalies if a.get('severity') == 'high'])
                    }

                    async with session.post(webhook_url, json=payload) as response:
                        if response.status == 200:
                            logger.info(f"Sent alert to {webhook_url}")
                        else:
                            logger.error(f"Failed to send alert to {webhook_url}: {response.status}")

            except Exception as e:
                logger.error(f"Failed to send alert to {webhook_url}: {e}")

    async def monitor_loop(self):
        """Main monitoring loop"""
        interval = self.config['monitoring_interval']

        while True:
            try:
                # Parse new log entries
                self.parse_log_files()

                # Detect anomalies
                anomalies = self.detect_anomalies()

                if anomalies:
                    logger.warning(f"Detected {len(anomalies)} anomalies")
                    for anomaly in anomalies:
                        logger.warning(f"Anomaly: {anomaly}")

                    # Send alerts
                    await self.send_alerts(anomalies)
                else:
                    logger.info("No anomalies detected")

                # Generate heartbeat for monitor itself
                monitor_heartbeat = Heartbeat(
                    timestamp=datetime.now().isoformat() + 'Z',
                    component='heartbeat_monitor',
                    phase='monitor_loop',
                    status='OK',
                    elapsed=0,
                    correlation_id=f"monitor-{int(time.time())}",
                    metrics=f"anomalies={len(anomalies)}"
                )
                self.db.store_heartbeat(monitor_heartbeat)

            except Exception as e:
                logger.error(f"Error in monitor loop: {e}")

                # Generate error heartbeat
                error_heartbeat = Heartbeat(
                    timestamp=datetime.now().isoformat() + 'Z',
                    component='heartbeat_monitor',
                    phase='monitor_loop',
                    status='ERROR',
                    elapsed=0,
                    correlation_id=f"monitor-error-{int(time.time())}",
                    metrics=f"error={str(e)}"
                )
                self.db.store_heartbeat(error_heartbeat)

            await asyncio.sleep(interval)

def create_sample_config():
    """Create a sample configuration file"""
    config = {
        "database_path": "heartbeats.db",
        "log_sources": [
            {"path": "logs/heartbeats.log", "type": "file"},
            {"path": "logs/comprehensive_validation_suite.log", "type": "file"},
            {"path": "logs/deployment.log", "type": "file"}
        ],
        "alert_webhooks": [
            "https://hooks.slack.com/your/webhook/url",
            "https://your-monitoring-system.com/webhooks/alerts"
        ],
        "monitoring_interval": 60,
        "anomaly_thresholds": {
            "missing_heartbeat_seconds": 300,
            "error_rate_threshold": 0.5,
            "performance_degradation_multiplier": 2.0
        }
    }

    with open('monitor_config.json', 'w') as f:
        json.dump(config, f, indent=2)

    print("Created sample configuration: monitor_config.json")

def main():
    parser = argparse.ArgumentParser(description='Unified Heartbeat Monitoring System')
    parser.add_argument('--config', default='monitor_config.json',
                       help='Configuration file path')
    parser.add_argument('--create-config', action='store_true',
                       help='Create sample configuration file')
    parser.add_argument('--test-detection', action='store_true',
                       help='Run anomaly detection once and exit')

    args = parser.parse_args()

    if args.create_config:
        create_sample_config()
        return

    monitor = HeartbeatMonitor(args.config)

    if args.test_detection:
        monitor.parse_log_files()
        anomalies = monitor.detect_anomalies()

        if anomalies:
            print(f"\nDetected {len(anomalies)} anomalies:")
            for anomaly in anomalies:
                print(f"- {anomaly}")
        else:
            print("No anomalies detected")
        return

    # Run continuous monitoring
    logger.info("Starting heartbeat monitor...")
    asyncio.run(monitor.monitor_loop())

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Centralized Heartbeat Aggregator for Platform Connectors and CI/CD Pipelines

Aggregates heartbeat streams from multiple sources and provides real-time monitoring.
Format: timestamp|component|phase|status|elapsed|correlation_id|metrics
"""

import asyncio
import json
import logging
import re
import sys
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Heartbeat format regex
HEARTBEAT_REGEX = re.compile(
    r'^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\|([^|]+)\|([^|]+)\|([^|]+)\|([0-9.]+)\|([^|]+)\|(.*)$'
)

class HeartbeatAggregator:
    """Centralized heartbeat aggregator for monitoring and alerting."""

    def __init__(self, max_history: int = 1000, alert_threshold: int = 300):
        self.heartbeats = deque(maxlen=max_history)
        self.component_stats = defaultdict(lambda: {
            'last_seen': None,
            'status_counts': defaultdict(int),
            'error_count': 0,
            'alerts': []
        })
        self.alert_threshold = alert_threshold  # seconds without heartbeat
        self.correlation_tracking = defaultdict(list)

    def parse_heartbeat(self, line: str) -> Optional[Dict]:
        """Parse a heartbeat line into structured data."""
        match = HEARTBEAT_REGEX.match(line.strip())
        if not match:
            return None

        timestamp_str, component, phase, status, elapsed_str, correlation_id, metrics_str = match.groups()

        try:
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            elapsed = float(elapsed_str)
            metrics = json.loads(metrics_str) if metrics_str.strip() else {}
        except (ValueError, json.JSONDecodeError) as e:
            logger.warning(f"Failed to parse heartbeat: {e}")
            return None

        return {
            'timestamp': timestamp,
            'component': component,
            'phase': phase,
            'status': status,
            'elapsed': elapsed,
            'correlation_id': correlation_id,
            'metrics': metrics,
            'raw_line': line.strip()
        }

    def add_heartbeat(self, heartbeat: Dict):
        """Add a heartbeat to the aggregator."""
        self.heartbeats.append(heartbeat)

        component = heartbeat['component']
        status = heartbeat['status']
        correlation_id = heartbeat['correlation_id']

        # Update component stats
        stats = self.component_stats[component]
        stats['last_seen'] = heartbeat['timestamp']
        stats['status_counts'][status] += 1

        if status in ['ERROR', 'FAIL']:
            stats['error_count'] += 1

        # Track correlation IDs
        self.correlation_tracking[correlation_id].append(heartbeat)

        # Check for alerts
        self._check_alerts(component, heartbeat)

    def _check_alerts(self, component: str, heartbeat: Dict):
        """Check for alert conditions."""
        now = datetime.now(timezone.utc)
        stats = self.component_stats[component]

        # Alert on missing heartbeats
        if stats['last_seen']:
            time_since_last = (now - stats['last_seen']).total_seconds()
            if time_since_last > self.alert_threshold:
                alert = {
                    'type': 'missing_heartbeat',
                    'component': component,
                    'last_seen': stats['last_seen'].isoformat(),
                    'seconds_since': time_since_last,
                    'timestamp': now.isoformat()
                }
                stats['alerts'].append(alert)
                logger.warning(f"ALERT: Missing heartbeat for {component} ({time_since_last:.0f}s)")

        # Alert on error patterns
        if heartbeat['status'] in ['ERROR', 'FAIL']:
            alert = {
                'type': 'error_status',
                'component': component,
                'phase': heartbeat['phase'],
                'status': heartbeat['status'],
                'correlation_id': heartbeat['correlation_id'],
                'timestamp': now.isoformat()
            }
            stats['alerts'].append(alert)
            logger.error(f"ALERT: Error status for {component}:{heartbeat['phase']} - {heartbeat['status']}")

    def get_status_summary(self) -> Dict:
        """Get comprehensive status summary."""
        now = datetime.now(timezone.utc)
        summary = {
            'timestamp': now.isoformat(),
            'total_heartbeats': len(self.heartbeats),
            'components': {},
            'alerts': [],
            'correlation_summary': {}
        }

        # Component status
        for component, stats in self.component_stats.items():
            component_summary = {
                'last_seen': stats['last_seen'].isoformat() if stats['last_seen'] else None,
                'status_counts': dict(stats['status_counts']),
                'error_count': stats['error_count'],
                'alert_count': len(stats['alerts']),
                'seconds_since_last': (now - stats['last_seen']).total_seconds() if stats['last_seen'] else None
            }
            summary['components'][component] = component_summary

            # Collect alerts
            summary['alerts'].extend(stats['alerts'][-10:])  # Last 10 alerts per component

        # Correlation summary
        for corr_id, heartbeats in self.correlation_tracking.items():
            if heartbeats:
                latest = max(heartbeats, key=lambda h: h['timestamp'])
                summary['correlation_summary'][corr_id] = {
                    'count': len(heartbeats),
                    'latest_timestamp': latest['timestamp'].isoformat(),
                    'components': list(set(h['component'] for h in heartbeats)),
                    'statuses': list(set(h['status'] for h in heartbeats))
                }

        return summary

    def get_recent_heartbeats(self, limit: int = 50) -> List[Dict]:
        """Get recent heartbeats."""
        return list(self.heartbeats)[-limit:]

    async def monitor_streams(self, log_files: List[str]):
        """Monitor heartbeat streams from log files."""
        logger.info(f"Starting heartbeat monitoring for {len(log_files)} files")

        while True:
            for log_file in log_files:
                if Path(log_file).exists():
                    try:
                        with open(log_file, 'r') as f:
                            for line in f:
                                if line.strip():
                                    heartbeat = self.parse_heartbeat(line)
                                    if heartbeat:
                                        self.add_heartbeat(heartbeat)
                    except Exception as e:
                        logger.error(f"Error reading {log_file}: {e}")

            # Generate summary every 30 seconds
            summary = self.get_status_summary()
            print(json.dumps(summary, indent=2))

            await asyncio.sleep(30)

def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description='Heartbeat Aggregator')
    parser.add_argument('--log-files', nargs='+', default=['logs/correlation.heartbeats.log', 'logs/universal_heartbeats.log'],
                       help='Log files to monitor')
    parser.add_argument('--max-history', type=int, default=1000, help='Maximum heartbeats to keep in history')
    parser.add_argument('--alert-threshold', type=int, default=300, help='Alert threshold in seconds')

    args = parser.parse_args()

    aggregator = HeartbeatAggregator(
        max_history=args.max_history,
        alert_threshold=args.alert_threshold
    )

    # Run monitoring
    asyncio.run(aggregator.monitor_streams(args.log_files))

if __name__ == '__main__':
    main()
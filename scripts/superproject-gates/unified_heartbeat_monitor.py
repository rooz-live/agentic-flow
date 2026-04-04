#!/usr/bin/env python3
"""
Unified Heartbeat Monitoring System
Monitors heartbeat formats across all system components for early anomaly detection
"""

import asyncio
import json
import logging
import socket
import sqlite3
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import aiohttp
import subprocess
import os
import re
import yaml

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s|heartbeat_monitor|%(levelname)s|%(message)s',
    datefmt='%Y-%m-%dT%H:%M:%SZ'
)
logger = logging.getLogger(__name__)

class HeartbeatMonitor:
    """Unified heartbeat monitoring and anomaly detection system"""

    def __init__(self, config_path: str = "config/heartbeat_config.yaml"):
        self.config = self._load_config(config_path)
        self.db_path = self.config.get('database', {}).get('path', 'logs/heartbeat_monitor.db')
        self.setup_database()

    def _load_config(self, config_path: str) -> dict:
        """Load heartbeat monitoring configuration"""
        default_config = {
            'monitoring': {
                'interval': 30,  # seconds
                'timeout': 10,
                'retry_attempts': 3
            },
            'endpoints': {
                'starlingx': {
                    'host': '23.92.79.2',
                    'ports': [443, 8443, 22],
                    'type': 'network',
                    'critical': True
                },
                'hivelocity_device': {
                    'device_id': '24460',
                    'hostname': 'hv2b40b82',
                    'ipmi_port': 623,
                    'type': 'ipmi',
                    'critical': True
                }
            },
            'heartbeat_format': {
                'timestamp_format': '%Y-%m-%dT%H:%M:%SZ',
                'separator': '|',
                'required_fields': ['timestamp', 'service', 'component', 'status', 'sequence', 'correlation_id']
            },
            'thresholds': {
                'response_time_ms': 5000,
                'failure_rate': 0.1,
                'consecutive_failures': 3
            },
            'alerts': {
                'webhook_url': None,
                'email_recipients': [],
                'slack_channel': None
            }
        }

        try:
            with open(config_path, 'r') as f:
                user_config = yaml.safe_load(f)
                # Merge with defaults
                return {**default_config, **user_config}
        except FileNotFoundError:
            logger.warning(f"Config file not found: {config_path}, using defaults")
            return default_config

    def setup_database(self):
        """Initialize SQLite database for heartbeat storage"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

        with sqlite3.connect(self.db_path) as conn:
            conn.executescript('''
                CREATE TABLE IF NOT EXISTS heartbeats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    service TEXT NOT NULL,
                    component TEXT NOT NULL,
                    status TEXT NOT NULL,
                    sequence_number INTEGER,
                    correlation_id TEXT,
                    response_time_ms REAL,
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS anomalies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    service TEXT NOT NULL,
                    component TEXT NOT NULL,
                    anomaly_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    description TEXT,
                    metadata TEXT,
                    resolved_at DATETIME,
                    resolution_notes TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_heartbeats_timestamp ON heartbeats(timestamp);
                CREATE INDEX IF NOT EXISTS idx_heartbeats_service ON heartbeats(service);
                CREATE INDEX IF NOT EXISTS idx_anomalies_detected_at ON anomalies(detected_at);
            ''')

    def standardize_heartbeat(self, raw_heartbeat: str) -> Optional[Dict]:
        """Standardize heartbeat format across different sources"""
        separator = self.config['heartbeat_format']['separator']
        required_fields = self.config['heartbeat_format']['required_fields']

        parts = raw_heartbeat.strip().split(separator)

        if len(parts) < len(required_fields):
            logger.warning(f"Invalid heartbeat format: {raw_heartbeat}")
            return None

        heartbeat = {}
        for i, field in enumerate(required_fields):
            if i < len(parts):
                heartbeat[field] = parts[i]

        # Additional metadata in remaining parts
        if len(parts) > len(required_fields):
            heartbeat['metadata'] = separator.join(parts[len(required_fields):])

        return heartbeat

    async def check_network_endpoint(self, name: str, config: Dict) -> Dict:
        """Check network endpoint health"""
        host = config['host']
        ports = config['ports']
        start_time = time.time()

        results = []
        for port in ports:
            try:
                # TCP connection check
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection(host, port),
                    timeout=self.config['monitoring']['timeout']
                )
                writer.close()
                await writer.wait_closed()

                response_time = (time.time() - start_time) * 1000
                results.append({
                    'port': port,
                    'status': 'OK',
                    'response_time_ms': response_time
                })

            except asyncio.TimeoutError:
                results.append({
                    'port': port,
                    'status': 'TIMEOUT',
                    'response_time_ms': self.config['monitoring']['timeout'] * 1000
                })
            except Exception as e:
                results.append({
                    'port': port,
                    'status': 'ERROR',
                    'error': str(e),
                    'response_time_ms': -1
                })

        # Determine overall status
        ok_count = sum(1 for r in results if r['status'] == 'OK')
        overall_status = 'OK' if ok_count > 0 else 'ERROR'
        avg_response_time = sum(r.get('response_time_ms', 0) for r in results if r['response_time_ms'] > 0) / len(results)

        return {
            'service': 'network_monitor',
            'component': name,
            'status': overall_status,
            'response_time_ms': avg_response_time,
            'metadata': json.dumps({
                'host': host,
                'port_results': results
            })
        }

    async def check_ipmi_device(self, name: str, config: Dict) -> Dict:
        """Check IPMI device health"""
        device_id = config['device_id']
        hostname = config['hostname']
        start_time = time.time()

        ipmi_user = os.environ.get('IPMI_USER')
        ipmi_password = os.environ.get('IPMI_PASSWORD')

        if not ipmi_user or not ipmi_password:
            return {
                'service': 'ipmi_monitor',
                'component': name,
                'status': 'ERROR',
                'response_time_ms': 0,
                'metadata': json.dumps({
                    'device_id': device_id,
                    'hostname': hostname,
                    'error': 'IPMI credentials not configured (set IPMI_USER and IPMI_PASSWORD environment variables)'
                })
            }

        try:
            # IPMI check using ipmitool (if available)
            cmd = f"ipmitool -H {hostname} -U {ipmi_user} -P {ipmi_password} chassis status"
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=self.config['monitoring']['timeout']
            )

            response_time = (time.time() - start_time) * 1000

            if process.returncode == 0:
                status = 'OK'
                metadata = {
                    'device_id': device_id,
                    'hostname': hostname,
                    'ipmi_output': stdout.decode().strip()
                }
            else:
                status = 'ERROR'
                metadata = {
                    'device_id': device_id,
                    'hostname': hostname,
                    'error': stderr.decode().strip()
                }

        except asyncio.TimeoutError:
            status = 'TIMEOUT'
            response_time = self.config['monitoring']['timeout'] * 1000
            metadata = {
                'device_id': device_id,
                'hostname': hostname,
                'error': 'IPMI command timeout'
            }
        except Exception as e:
            status = 'ERROR'
            response_time = (time.time() - start_time) * 1000
            metadata = {
                'device_id': device_id,
                'hostname': hostname,
                'error': str(e)
            }

        return {
            'service': 'ipmi_monitor',
            'component': name,
            'status': status,
            'response_time_ms': response_time,
            'metadata': json.dumps(metadata)
        }

    def detect_anomalies(self, heartbeat: Dict) -> List[Dict]:
        """Detect anomalies in heartbeat patterns"""
        anomalies = []
        service = heartbeat['service']
        component = heartbeat['component']

        with sqlite3.connect(self.db_path) as conn:
            # Check response time anomaly
            if heartbeat.get('response_time_ms', 0) > self.config['thresholds']['response_time_ms']:
                anomalies.append({
                    'service': service,
                    'component': component,
                    'anomaly_type': 'high_response_time',
                    'severity': 'WARNING',
                    'description': f"Response time {heartbeat['response_time_ms']}ms exceeds threshold {self.config['thresholds']['response_time_ms']}ms"
                })

            # Check consecutive failures
            cursor = conn.execute('''
                SELECT status FROM heartbeats
                WHERE service = ? AND component = ?
                ORDER BY created_at DESC
                LIMIT ?
            ''', (service, component, self.config['thresholds']['consecutive_failures']))

            recent_statuses = [row[0] for row in cursor.fetchall()]
            if len(recent_statuses) >= self.config['thresholds']['consecutive_failures']:
                if all(status != 'OK' for status in recent_statuses):
                    anomalies.append({
                        'service': service,
                        'component': component,
                        'anomaly_type': 'consecutive_failures',
                        'severity': 'CRITICAL',
                        'description': f"Component has failed {len(recent_statuses)} consecutive times"
                    })

        return anomalies

    def store_heartbeat(self, heartbeat: Dict):
        """Store heartbeat in database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO heartbeats
                (timestamp, service, component, status, sequence_number, correlation_id, response_time_ms, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                heartbeat.get('timestamp', datetime.utcnow().isoformat() + 'Z'),
                heartbeat['service'],
                heartbeat['component'],
                heartbeat['status'],
                heartbeat.get('sequence', 0),
                heartbeat.get('correlation_id', ''),
                heartbeat.get('response_time_ms', 0),
                heartbeat.get('metadata', '')
            ))

    def store_anomaly(self, anomaly: Dict):
        """Store detected anomaly"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO anomalies
                (service, component, anomaly_type, severity, description, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                anomaly['service'],
                anomaly['component'],
                anomaly['anomaly_type'],
                anomaly['severity'],
                anomaly['description'],
                json.dumps(anomaly.get('metadata', {}))
            ))

    async def send_alert(self, anomaly: Dict):
        """Send alert for detected anomaly"""
        alert_message = f"🚨 ANOMALY DETECTED: {anomaly['service']}.{anomaly['component']} - {anomaly['description']}"

        # Log alert
        logger.error(f"ANOMALY|{anomaly['severity']}|{alert_message}")

        # Send webhook alert if configured
        webhook_url = self.config['alerts'].get('webhook_url')
        if webhook_url:
            try:
                async with aiohttp.ClientSession() as session:
                    await session.post(webhook_url, json={
                        'text': alert_message,
                        'anomaly': anomaly
                    })
            except Exception as e:
                logger.error(f"Failed to send webhook alert: {e}")

    def emit_heartbeat(self, service: str, component: str, status: str, **kwargs):
        """Emit standardized heartbeat"""
        timestamp = datetime.utcnow().strftime(self.config['heartbeat_format']['timestamp_format'])
        separator = self.config['heartbeat_format']['separator']

        heartbeat_parts = [
            timestamp,
            service,
            component,
            status,
            str(kwargs.get('sequence', 0)),
            kwargs.get('correlation_id', f'hb-{int(time.time())}')
        ]

        # Add metadata
        if kwargs.get('metadata'):
            heartbeat_parts.append(kwargs['metadata'])

        heartbeat_line = separator.join(heartbeat_parts)
        print(heartbeat_line)  # Output to stdout for collection
        logger.info(heartbeat_line)

        return heartbeat_line

    async def monitor_endpoints(self):
        """Monitor all configured endpoints"""
        sequence = 0
        correlation_id = f"monitor-{int(time.time())}"

        while True:
            try:
                # Monitor each endpoint
                for name, config in self.config['endpoints'].items():
                    endpoint_type = config['type']

                    if endpoint_type == 'network':
                        result = await self.check_network_endpoint(name, config)
                    elif endpoint_type == 'ipmi':
                        result = await self.check_ipmi_device(name, config)
                    else:
                        logger.warning(f"Unknown endpoint type: {endpoint_type}")
                        continue

                    # Add sequence and correlation ID
                    result['sequence'] = sequence
                    result['correlation_id'] = correlation_id
                    result['timestamp'] = datetime.utcnow().strftime(
                        self.config['heartbeat_format']['timestamp_format']
                    )

                    # Emit heartbeat
                    self.emit_heartbeat(
                        service=result['service'],
                        component=result['component'],
                        status=result['status'],
                        sequence=sequence,
                        correlation_id=correlation_id,
                        metadata=f"response_time={result.get('response_time_ms', 0):.2f}ms"
                    )

                    # Store heartbeat
                    self.store_heartbeat(result)

                    # Detect and handle anomalies
                    anomalies = self.detect_anomalies(result)
                    for anomaly in anomalies:
                        self.store_anomaly(anomaly)
                        await self.send_alert(anomaly)

                    sequence += 1

                # Wait for next monitoring cycle
                await asyncio.sleep(self.config['monitoring']['interval'])

            except KeyboardInterrupt:
                logger.info("Monitor stopped by user")
                break
            except Exception as e:
                logger.error(f"Monitor error: {e}")
                await asyncio.sleep(5)  # Brief pause before retry

    def get_health_summary(self, hours: int = 24) -> Dict:
        """Get health summary for the last N hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        with sqlite3.connect(self.db_path) as conn:
            # Get recent heartbeats
            cursor = conn.execute('''
                SELECT service, component, status, COUNT(*) as count
                FROM heartbeats
                WHERE created_at > ?
                GROUP BY service, component, status
                ORDER BY service, component
            ''', (cutoff_time.isoformat(),))

            heartbeat_stats = {}
            for service, component, status, count in cursor.fetchall():
                key = f"{service}.{component}"
                if key not in heartbeat_stats:
                    heartbeat_stats[key] = {}
                heartbeat_stats[key][status] = count

            # Get recent anomalies
            cursor = conn.execute('''
                SELECT service, component, anomaly_type, severity, COUNT(*) as count
                FROM anomalies
                WHERE detected_at > ? AND resolved_at IS NULL
                GROUP BY service, component, anomaly_type, severity
            ''', (cutoff_time.isoformat(),))

            active_anomalies = []
            for service, component, anomaly_type, severity, count in cursor.fetchall():
                active_anomalies.append({
                    'service': service,
                    'component': component,
                    'type': anomaly_type,
                    'severity': severity,
                    'count': count
                })

        return {
            'summary_period_hours': hours,
            'heartbeat_stats': heartbeat_stats,
            'active_anomalies': active_anomalies,
            'generated_at': datetime.utcnow().isoformat() + 'Z'
        }

async def main():
    """Main monitoring loop"""
    monitor = HeartbeatMonitor()

    # Emit startup heartbeat
    monitor.emit_heartbeat(
        service='heartbeat_monitor',
        component='startup',
        status='OK',
        metadata='system_initialized'
    )

    try:
        await monitor.monitor_endpoints()
    except KeyboardInterrupt:
        # Emit shutdown heartbeat
        monitor.emit_heartbeat(
            service='heartbeat_monitor',
            component='shutdown',
            status='OK',
            metadata='system_stopping'
        )

if __name__ == "__main__":
    asyncio.run(main())

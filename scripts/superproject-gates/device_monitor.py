#!/usr/bin/env python3
"""
Device State Tracking and Monitoring
Handles IPMI issues, network endpoints, and device state management
"""

import json
import os
import time
import subprocess
import socket
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

class DeviceMonitor:
    """Monitor physical devices and network endpoints"""

    def __init__(self, config: Dict):
        self.config = config
        self.device_states_file = "device_states.json"

    def check_ipmi_status(self, device_config: Dict) -> Dict:
        """Check IPMI status for a device"""
        device_id = device_config['id']
        ipmi_address = device_config['ipmi_address']

        ipmi_user = os.environ.get('IPMI_USER')
        ipmi_password = os.environ.get('IPMI_PASSWORD')

        if not ipmi_user or not ipmi_password:
            return {
                'device_id': device_id,
                'status': 'ERROR',
                'error': 'IPMI credentials not configured (set IPMI_USER and IPMI_PASSWORD environment variables)',
                'ipmi_address': ipmi_address
            }

        try:
            # Use ipmitool to check device status
            result = subprocess.run(
                ['ipmitool', '-H', ipmi_address, '-U', ipmi_user, '-P', ipmi_password, 'chassis', 'status'],
                capture_output=True, text=True, timeout=30
            )

            if result.returncode == 0:
                # Parse IPMI output
                status_lines = result.stdout.strip().split('\n')
                power_status = "unknown"
                for line in status_lines:
                    if "System Power" in line:
                        power_status = "on" if "on" in line.lower() else "off"
                        break

                return {
                    'device_id': device_id,
                    'status': 'OK',
                    'power_status': power_status,
                    'ipmi_address': ipmi_address,
                    'checks': device_config['ipmi_checks']
                }
            else:
                return {
                    'device_id': device_id,
                    'status': 'ERROR',
                    'error': f"IPMI command failed: {result.stderr}",
                    'ipmi_address': ipmi_address
                }

        except subprocess.TimeoutExpired:
            return {
                'device_id': device_id,
                'status': 'TIMEOUT',
                'error': 'IPMI check timed out',
                'ipmi_address': ipmi_address
            }
        except FileNotFoundError:
            return {
                'device_id': device_id,
                'status': 'ERROR',
                'error': 'ipmitool not found',
                'ipmi_address': ipmi_address
            }
        except Exception as e:
            return {
                'device_id': device_id,
                'status': 'ERROR',
                'error': str(e),
                'ipmi_address': ipmi_address
            }

    def check_network_endpoint(self, endpoint_config: Dict) -> Dict:
        """Check network endpoint availability"""
        hostname = endpoint_config['hostname']
        ip = endpoint_config['ip']
        services = endpoint_config.get('services', [])
        expected_response_time = endpoint_config.get('expected_response_time_ms', 1000)

        results = {
            'hostname': hostname,
            'ip': ip,
            'services': {},
            'overall_status': 'OK'
        }

        # Check basic connectivity
        try:
            start_time = time.time()
            socket.gethostbyname(hostname)
            dns_resolution_time = (time.time() - start_time) * 1000

            if dns_resolution_time > expected_response_time:
                results['dns_resolution_time_ms'] = round(dns_resolution_time, 2)
                results['dns_status'] = 'SLOW'
            else:
                results['dns_resolution_time_ms'] = round(dns_resolution_time, 2)
                results['dns_status'] = 'OK'

        except socket.gaierror as e:
            results['dns_status'] = 'ERROR'
            results['dns_error'] = str(e)
            results['overall_status'] = 'ERROR'
            return results

        # Check individual services
        for service in services:
            if service == 'http':
                results['services']['http'] = self._check_http_service(ip, 80)
            elif service == 'https':
                results['services']['https'] = self._check_http_service(ip, 443, use_ssl=True)
            elif service == 'ssh':
                results['services']['ssh'] = self._check_tcp_service(ip, 22)
            else:
                results['services'][service] = {'status': 'UNKNOWN', 'error': f'Unsupported service: {service}'}

        # Determine overall status
        for service_result in results['services'].values():
            if service_result.get('status') == 'ERROR':
                results['overall_status'] = 'ERROR'
                break

        return results

    def _check_http_service(self, ip: str, port: int, use_ssl: bool = False) -> Dict:
        """Check HTTP/HTTPS service availability"""
        try:
            import ssl
            import urllib.request

            protocol = 'https' if use_ssl else 'http'
            url = f"{protocol}://{ip}:{port}/"

            start_time = time.time()
            if use_ssl:
                context = ssl.create_default_context()
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE

                with urllib.request.urlopen(url, context=context, timeout=10) as response:
                    response_time = (time.time() - start_time) * 1000
                    return {
                        'status': 'OK',
                        'response_time_ms': round(response_time, 2),
                        'response_code': response.getcode()
                    }
            else:
                with urllib.request.urlopen(url, timeout=10) as response:
                    response_time = (time.time() - start_time) * 1000
                    return {
                        'status': 'OK',
                        'response_time_ms': round(response_time, 2),
                        'response_code': response.getcode()
                    }

        except Exception as e:
            return {
                'status': 'ERROR',
                'error': str(e)
            }

    def _check_tcp_service(self, ip: str, port: int) -> Dict:
        """Check TCP service availability"""
        try:
            start_time = time.time()
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            result = sock.connect_ex((ip, port))
            response_time = (time.time() - start_time) * 1000
            sock.close()

            if result == 0:
                return {
                    'status': 'OK',
                    'response_time_ms': round(response_time, 2)
                }
            else:
                return {
                    'status': 'ERROR',
                    'error': f'Connection refused (result: {result})'
                }

        except Exception as e:
            return {
                'status': 'ERROR',
                'error': str(e)
            }

    def load_device_states(self) -> Dict:
        """Load current device states from file"""
        try:
            if Path(self.device_states_file).exists():
                with open(self.device_states_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load device states: {e}")

        return {}

    def save_device_states(self, states: Dict):
        """Save device states to file"""
        try:
            with open(self.device_states_file, 'w') as f:
                json.dump(states, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save device states: {e}")

    def update_device_state(self, device_id: str, state: str, additional_info: Dict = None):
        """Update device state and persist to file"""
        states = self.load_device_states()

        state_entry = {
            'state': state,
            'timestamp': datetime.now().isoformat(),
        }

        if additional_info:
            state_entry.update(additional_info)

        states[device_id] = state_entry
        self.save_device_states(states)

        logger.info(f"Updated device {device_id} state to {state}")

    def monitor_devices(self) -> List[Dict]:
        """Monitor all configured devices and return status reports"""
        reports = []

        if not self.config.get('enabled', False):
            return reports

        # Monitor physical devices
        for device_config in self.config.get('devices', []):
            device_id = device_config['id']

            # Check IPMI status
            ipmi_status = self.check_ipmi_status(device_config)

            # Update device state based on IPMI status
            if ipmi_status['status'] == 'OK':
                self.update_device_state(device_id, 'operational', {
                    'power_status': ipmi_status.get('power_status'),
                    'ipmi_address': ipmi_status.get('ipmi_address'),
                    'last_check': datetime.now().isoformat()
                })
            else:
                self.update_device_state(device_id, 'error', {
                    'error': ipmi_status.get('error'),
                    'ipmi_address': ipmi_status.get('ipmi_address'),
                    'last_check': datetime.now().isoformat()
                })

            reports.append({
                'type': 'device_ipmi_check',
                'device_id': device_id,
                'status': ipmi_status['status'],
                'details': ipmi_status
            })

        # Monitor network endpoints
        for endpoint_config in self.config.get('network_endpoints', []):
            endpoint_status = self.check_network_endpoint(endpoint_config)

            reports.append({
                'type': 'network_endpoint_check',
                'hostname': endpoint_config['hostname'],
                'status': endpoint_status['overall_status'],
                'details': endpoint_status
            })

        return reports

    def detect_device_anomalies(self) -> List[Dict]:
        """Detect anomalies in device states and network connectivity"""
        anomalies = []

        # Check for devices stuck in error state
        device_states = self.load_device_states()
        alert_rules = self.config.get('alert_rules', {})

        device_blockage_threshold = alert_rules.get('device_state_blockage', {}).get('threshold', 10)
        device_blockage_window = alert_rules.get('device_state_blockage', {}).get('time_window_minutes', 120)

        for device_id, state_info in device_states.items():
            if state_info.get('state') == 'error':
                last_check = state_info.get('timestamp')
                if last_check:
                    try:
                        last_check_time = datetime.fromisoformat(last_check.replace('Z', '+00:00'))
                        if last_check_time.tzinfo:
                            last_check_time = last_check_time.replace(tzinfo=None)

                        minutes_since_error = (datetime.now() - last_check_time).total_seconds() / 60

                        if minutes_since_error > device_blockage_window:
                            anomalies.append({
                                'type': 'device_state_blockage',
                                'device_id': device_id,
                                'severity': 'high',
                                'description': f'Device {device_id} has been in error state for {int(minutes_since_error)} minutes',
                                'last_error': state_info.get('error'),
                                'threshold_exceeded': device_blockage_threshold
                            })
                    except ValueError as e:
                        logger.warning(f"Failed to parse timestamp for device {device_id}: {e}")

        # Check for network endpoint failures
        network_failure_threshold = alert_rules.get('network_unreachable', {}).get('threshold', 5)
        network_failure_window = alert_rules.get('network_unreachable', {}).get('time_window_minutes', 30)

        # This would need to track historical network checks
        # For now, we'll just check current status

        return anomalies

#!/usr/bin/env python3
"""
Device State Tracking System
Specifically handles IPMI issues like hv2b40b82 on device #24460
and network endpoints such as stx-aio-0.corp.interface.tag.ooo (23.92.79.2)
"""

import asyncio
import json
import logging
import sqlite3
import subprocess
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import aiohttp
import socket
import paramiko
import os

# Configure logging with the standard heartbeat format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s|device_tracker|%(levelname)s|%(message)s',
    datefmt='%Y-%m-%dT%H:%M:%SZ'
)
logger = logging.getLogger(__name__)

class DeviceStateTracker:
    """Advanced device state tracking with gate blockage prevention"""

    def __init__(self):
        self.db_path = 'logs/device_state_tracking.db'
        self.setup_database()
        self.correlation_id = f"dst-{int(time.time())}"
        self.sequence = 0

        # Device configurations
        self.devices = {
            'hv2b40b82': {
                'device_id': '24460',
                'hostname': 'hv2b40b82',
                'type': 'hivelocity_server',
                'ipmi_host': 'hv2b40b82-ipmi.hivelocity.net',  # Assuming IPMI naming convention
                'management_ip': None,  # Will be discovered
                'ssh_port': 22,
                'ipmi_port': 623,
                'critical': True
            }
        }

        self.endpoints = {
            'stx-aio-0': {
                'fqdn': 'stx-aio-0.corp.interface.tag.ooo',
                'ip': '23.92.79.2',
                'type': 'starlingx_node',
                'services': ['ssh', 'https', 'openstack-api', 'horizon'],
                'ports': [22, 443, 8443, 6385, 8778, 9696],  # StarlingX common ports
                'critical': True
            }
        }

    def setup_database(self):
        """Initialize database for device state tracking"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

        with sqlite3.connect(self.db_path) as conn:
            conn.executescript('''
                CREATE TABLE IF NOT EXISTS device_states (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    device_name TEXT NOT NULL,
                    device_id TEXT,
                    state TEXT NOT NULL,
                    component TEXT NOT NULL,
                    status TEXT NOT NULL,
                    response_time_ms REAL,
                    error_details TEXT,
                    recovery_action TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS gate_blocks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    device_name TEXT NOT NULL,
                    block_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    description TEXT,
                    auto_recovery_attempted BOOLEAN DEFAULT 0,
                    resolved_at DATETIME,
                    resolution_method TEXT
                );

                CREATE TABLE IF NOT EXISTS recovery_actions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    device_name TEXT NOT NULL,
                    action_type TEXT NOT NULL,
                    command TEXT,
                    success BOOLEAN,
                    output TEXT,
                    duration_ms REAL
                );

                CREATE INDEX IF NOT EXISTS idx_device_states_timestamp ON device_states(timestamp);
                CREATE INDEX IF NOT EXISTS idx_device_states_device ON device_states(device_name);
                CREATE INDEX IF NOT EXISTS idx_gate_blocks_detected_at ON gate_blocks(detected_at);
            ''')

    def emit_heartbeat(self, service: str, component: str, status: str, **kwargs):
        """Emit standardized heartbeat"""
        timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')

        heartbeat_parts = [
            timestamp,
            service,
            component,
            status,
            str(self.sequence),
            self.correlation_id
        ]

        if kwargs.get('metadata'):
            heartbeat_parts.append(kwargs['metadata'])

        heartbeat_line = '|'.join(heartbeat_parts)
        print(heartbeat_line)
        logger.info(heartbeat_line)

        self.sequence += 1
        return heartbeat_line

    async def check_ipmi_health(self, device_name: str, config: Dict) -> Dict:
        """Check IPMI health and detect issues"""
        start_time = time.time()
        device_id = config['device_id']
        hostname = config['hostname']

        ipmi_user = os.environ.get('IPMI_USER')
        ipmi_password = os.environ.get('IPMI_PASSWORD')

        if not ipmi_user or not ipmi_password:
            return {
                'device_name': device_name,
                'device_id': device_id,
                'component': 'ipmi',
                'status': 'ERROR',
                'response_time_ms': 0,
                'issues': ['ipmi_credentials_missing'],
                'method_results': [],
                'successful_methods': 0
            }

        # Try multiple IPMI access methods
        ipmi_methods = [
            # Method 1: Direct IPMI host (if configured)
            {
                'host': config.get('ipmi_host', hostname),
                'command': f"ipmitool -H {{host}} -U {ipmi_user} -P {ipmi_password} chassis status"
            },
            # Method 2: Local ipmitool (if on the same network)
            {
                'host': hostname,
                'command': f"ipmitool -H {{host}} -U {ipmi_user} -P {ipmi_password} sel info"
            },
            # Method 3: Alternative command with same credentials
            {
                'host': hostname,
                'command': f"ipmitool -H {{host}} -U {ipmi_user} -P {ipmi_password} chassis power status"
            }
        ]

        results = []
        for i, method in enumerate(ipmi_methods):
            try:
                host = method['host']
                cmd = method['command'].format(host=host)

                process = await asyncio.create_subprocess_shell(
                    cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )

                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=15  # IPMI can be slow
                )

                response_time = (time.time() - start_time) * 1000

                if process.returncode == 0:
                    results.append({
                        'method': i + 1,
                        'status': 'OK',
                        'response_time_ms': response_time,
                        'output': stdout.decode().strip()
                    })
                    break  # Success, no need to try other methods
                else:
                    results.append({
                        'method': i + 1,
                        'status': 'ERROR',
                        'response_time_ms': response_time,
                        'error': stderr.decode().strip()
                    })

            except asyncio.TimeoutError:
                results.append({
                    'method': i + 1,
                    'status': 'TIMEOUT',
                    'response_time_ms': 15000,
                    'error': 'IPMI command timeout'
                })
            except Exception as e:
                results.append({
                    'method': i + 1,
                    'status': 'ERROR',
                    'response_time_ms': (time.time() - start_time) * 1000,
                    'error': str(e)
                })

        # Determine overall IPMI health
        successful_methods = [r for r in results if r['status'] == 'OK']
        overall_status = 'OK' if successful_methods else 'ERROR'

        # Check for specific IPMI issues
        issues = []
        if not successful_methods:
            issues.append('ipmi_unreachable')

        for result in results:
            if 'connection refused' in result.get('error', '').lower():
                issues.append('ipmi_service_down')
            elif 'authentication' in result.get('error', '').lower():
                issues.append('ipmi_auth_failed')
            elif 'timeout' in result.get('error', '').lower():
                issues.append('ipmi_timeout')

        return {
            'device_name': device_name,
            'device_id': device_id,
            'component': 'ipmi',
            'status': overall_status,
            'response_time_ms': min(r.get('response_time_ms', float('inf')) for r in results),
            'issues': issues,
            'method_results': results,
            'successful_methods': len(successful_methods)
        }

    async def check_network_endpoint(self, endpoint_name: str, config: Dict) -> Dict:
        """Check network endpoint health with comprehensive service validation"""
        fqdn = config['fqdn']
        ip = config['ip']
        ports = config['ports']
        services = config['services']

        start_time = time.time()

        # DNS resolution check
        dns_ok = False
        try:
            resolved_ip = socket.gethostbyname(fqdn)
            dns_ok = resolved_ip == ip
        except socket.gaierror:
            resolved_ip = None
            dns_ok = False

        # Port connectivity checks
        port_results = []
        for port in ports:
            port_start = time.time()
            try:
                # Test both FQDN and IP
                for target in [fqdn, ip]:
                    try:
                        reader, writer = await asyncio.wait_for(
                            asyncio.open_connection(target, port),
                            timeout=5
                        )
                        writer.close()
                        await writer.wait_closed()

                        port_results.append({
                            'port': port,
                            'target': target,
                            'status': 'OK',
                            'response_time_ms': (time.time() - port_start) * 1000\n                        })\n                        break  # Success with this target\n                    except Exception as e:\n                        if target == ip:  # Last attempt failed\n                            port_results.append({\n                                'port': port,\n                                'target': f'{fqdn}/{ip}',\n                                'status': 'ERROR',\n                                'error': str(e),\n                                'response_time_ms': (time.time() - port_start) * 1000\n                            })\n                        continue\n                        \n            except Exception as e:\n                port_results.append({\n                    'port': port,\n                    'target': f'{fqdn}/{ip}',\n                    'status': 'ERROR',\n                    'error': str(e),\n                    'response_time_ms': (time.time() - port_start) * 1000\n                })\n        \n        # Service-specific checks\n        service_results = []\n        \n        # SSH check (port 22)\n        if 'ssh' in services and 22 in ports:\n            ssh_result = await self._check_ssh_service(ip, fqdn)\n            service_results.append(ssh_result)\n        \n        # HTTPS check (port 443)\n        if 'https' in services and 443 in ports:\n            https_result = await self._check_https_service(fqdn)\n            service_results.append(https_result)\n        \n        # StarlingX-specific checks\n        if config['type'] == 'starlingx_node':\n            stx_result = await self._check_starlingx_services(ip, fqdn)\n            service_results.append(stx_result)\n        \n        # Determine overall endpoint health\n        successful_ports = sum(1 for r in port_results if r['status'] == 'OK')\n        total_ports = len(ports)\n        \n        if successful_ports == 0:\n            overall_status = 'ERROR'\n            severity = 'CRITICAL'\n        elif successful_ports < total_ports * 0.5:\n            overall_status = 'DEGRADED'\n            severity = 'WARNING'\n        else:\n            overall_status = 'OK'\n            severity = 'INFO'\n        \n        # Identify specific issues\n        issues = []\n        if not dns_ok:\n            issues.append('dns_resolution_failed')\n        if successful_ports == 0:\n            issues.append('network_unreachable')\n        elif successful_ports < total_ports:\n            issues.append('partial_service_failure')\n        \n        return {\n            'endpoint_name': endpoint_name,\n            'fqdn': fqdn,\n            'ip': ip,\n            'component': 'network',\n            'status': overall_status,\n            'severity': severity,\n            'response_time_ms': (time.time() - start_time) * 1000,\n            'dns_resolution': {'ok': dns_ok, 'resolved_ip': resolved_ip},\n            'port_results': port_results,\n            'service_results': service_results,\n            'issues': issues,\n            'successful_ports': successful_ports,\n            'total_ports': total_ports\n        }\n    \n    async def _check_ssh_service(self, ip: str, hostname: str) -> Dict:\n        """Check SSH service availability"""\n        try:\n            # Simple SSH banner grab\n            reader, writer = await asyncio.wait_for(\n                asyncio.open_connection(ip, 22),\n                timeout=10\n            )\n            \n            # Read SSH banner\n            banner = await asyncio.wait_for(reader.readline(), timeout=5)\n            writer.close()\n            await writer.wait_closed()\n            \n            return {\n                'service': 'ssh',\n                'status': 'OK',\n                'banner': banner.decode().strip()\n            }\n            \n        except Exception as e:\n            return {\n                'service': 'ssh',\n                'status': 'ERROR',\n                'error': str(e)\n            }\n    \n    async def _check_https_service(self, hostname: str) -> Dict:\n        """Check HTTPS service availability"""\n        try:\n            async with aiohttp.ClientSession(\n                timeout=aiohttp.ClientTimeout(total=10)\n            ) as session:\n                async with session.get(\n                    f'https://{hostname}',\n                    ssl=False  # Skip SSL verification for internal services\n                ) as response:\n                    return {\n                        'service': 'https',\n                        'status': 'OK',\n                        'http_status': response.status,\n                        'headers': dict(response.headers)\n                    }\n                    \n        except Exception as e:\n            return {\n                'service': 'https',\n                'status': 'ERROR',\n                'error': str(e)\n            }\n    \n    async def _check_starlingx_services(self, ip: str, hostname: str) -> Dict:\n        """Check StarlingX-specific services"""\n        stx_endpoints = [\n            {'port': 6385, 'service': 'sysinv-api', 'path': '/'},\n            {'port': 8778, 'service': 'placement-api', 'path': '/'},\n            {'port': 9696, 'service': 'neutron-api', 'path': '/'}\n        ]\n        \n        results = []\n        for endpoint in stx_endpoints:\n            try:\n                url = f\"http://{ip}:{endpoint['port']}{endpoint['path']}\"\n                async with aiohttp.ClientSession(\n                    timeout=aiohttp.ClientTimeout(total=5)\n                ) as session:\n                    async with session.get(url) as response:\n                        results.append({\n                            'service': endpoint['service'],\n                            'port': endpoint['port'],\n                            'status': 'OK',\n                            'http_status': response.status\n                        })\n            except Exception as e:\n                results.append({\n                    'service': endpoint['service'],\n                    'port': endpoint['port'],\n                    'status': 'ERROR',\n                    'error': str(e)\n                })\n        \n        successful_services = sum(1 for r in results if r['status'] == 'OK')\n        overall_status = 'OK' if successful_services > 0 else 'ERROR'\n        \n        return {\n            'service': 'starlingx',\n            'status': overall_status,\n            'service_results': results,\n            'successful_services': successful_services\n        }\n    \n    async def attempt_recovery(self, device_name: str, issue_type: str) -> Dict:\n        \"\"\"Attempt automated recovery for common issues\"\"\"\n        recovery_actions = {\n            'ipmi_unreachable': [\n                'ping_test',\n                'ipmi_reset',\n                'network_route_check'\n            ],\n            'network_unreachable': [\n                'ping_test',\n                'traceroute',\n                'dns_flush',\n                'service_restart'\n            ],\n            'partial_service_failure': [\n                'service_status_check',\n                'service_restart',\n                'port_scan'\n            ]\n        }\n        \n        actions = recovery_actions.get(issue_type, ['ping_test'])\n        results = []\n        \n        for action in actions:\n            start_time = time.time()\n            try:\n                if action == 'ping_test':\n                    result = await self._recovery_ping_test(device_name)\n                elif action == 'ipmi_reset':\n                    result = await self._recovery_ipmi_reset(device_name)\n                elif action == 'service_restart':\n                    result = await self._recovery_service_restart(device_name)\n                elif action == 'dns_flush':\n                    result = await self._recovery_dns_flush()\n                else:\n                    result = {'action': action, 'status': 'SKIPPED', 'reason': 'Not implemented'}\n                \n                result['duration_ms'] = (time.time() - start_time) * 1000\n                results.append(result)\n                \n                # Log recovery attempt\n                with sqlite3.connect(self.db_path) as conn:\n                    conn.execute('''\n                        INSERT INTO recovery_actions \n                        (device_name, action_type, command, success, output, duration_ms)\n                        VALUES (?, ?, ?, ?, ?, ?)\n                    ''', (\n                        device_name,\n                        action,\n                        result.get('command', ''),\n                        result.get('status') == 'OK',\n                        json.dumps(result),\n                        result['duration_ms']\n                    ))\n                \n                # If action succeeded, we might not need to continue\n                if result.get('status') == 'OK' and issue_type in ['ipmi_unreachable', 'network_unreachable']:\n                    break\n                    \n            except Exception as e:\n                results.append({\n                    'action': action,\n                    'status': 'ERROR',\n                    'error': str(e),\n                    'duration_ms': (time.time() - start_time) * 1000\n                })\n        \n        return {\n            'device_name': device_name,\n            'issue_type': issue_type,\n            'recovery_attempts': len(results),\n            'successful_actions': sum(1 for r in results if r.get('status') == 'OK'),\n            'actions': results\n        }\n    \n    async def _recovery_ping_test(self, device_name: str) -> Dict:\n        \"\"\"Test network connectivity with ping\"\"\"\n        # Get device config\n        device_config = self.devices.get(device_name) or next(\n            (config for config in self.endpoints.values() if device_name in config.get('fqdn', '')),\n            None\n        )\n        \n        if not device_config:\n            return {'action': 'ping_test', 'status': 'ERROR', 'error': 'Device config not found'}\n        \n        target = device_config.get('ip') or device_config.get('hostname', device_name)\n        cmd = f\"ping -c 4 -W 2000 {target}\"\n        \n        try:\n            process = await asyncio.create_subprocess_shell(\n                cmd,\n                stdout=asyncio.subprocess.PIPE,\n                stderr=asyncio.subprocess.PIPE\n            )\n            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=10)\n            \n            if process.returncode == 0:\n                return {\n                    'action': 'ping_test',\n                    'status': 'OK',\n                    'command': cmd,\n                    'output': stdout.decode().strip()\n                }\n            else:\n                return {\n                    'action': 'ping_test',\n                    'status': 'FAILED',\n                    'command': cmd,\n                    'error': stderr.decode().strip()\n                }\n                \n        except Exception as e:\n            return {\n                'action': 'ping_test',\n                'status': 'ERROR',\n                'command': cmd,\n                'error': str(e)\n            }\n    \n    async def _recovery_ipmi_reset(self, device_name: str) -> Dict:\n        \"\"\"Attempt IPMI BMC reset\"\"\"\n        device_config = self.devices.get(device_name)\n        if not device_config:\n            return {'action': 'ipmi_reset', 'status': 'ERROR', 'error': 'Device not found'}\n        \n        hostname = device_config['hostname']\n        cmd = f\"ipmitool -H {hostname} -U admin -P admin bmc reset cold\"\n        \n        try:\n            process = await asyncio.create_subprocess_shell(\n                cmd,\n                stdout=asyncio.subprocess.PIPE,\n                stderr=asyncio.subprocess.PIPE\n            )\n            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30)\n            \n            if process.returncode == 0:\n                return {\n                    'action': 'ipmi_reset',\n                    'status': 'OK',\n                    'command': cmd,\n                    'output': 'BMC reset initiated'\n                }\n            else:\n                return {\n                    'action': 'ipmi_reset',\n                    'status': 'FAILED',\n                    'command': cmd,\n                    'error': stderr.decode().strip()\n                }\n                \n        except Exception as e:\n            return {\n                'action': 'ipmi_reset',\n                'status': 'ERROR',\n                'command': cmd,\n                'error': str(e)\n            }\n    \n    async def _recovery_service_restart(self, device_name: str) -> Dict:\n        \"\"\"Attempt to restart services (placeholder - would need SSH access)\"\"\"\n        return {\n            'action': 'service_restart',\n            'status': 'SKIPPED',\n            'reason': 'Requires SSH access configuration'\n        }\n    \n    async def _recovery_dns_flush(self) -> Dict:\n        \"\"\"Flush local DNS cache\"\"\"\n        # macOS DNS flush\n        cmd = \"sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder\"\n        \n        try:\n            process = await asyncio.create_subprocess_shell(\n                cmd,\n                stdout=asyncio.subprocess.PIPE,\n                stderr=asyncio.subprocess.PIPE\n            )\n            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=10)\n            \n            return {\n                'action': 'dns_flush',\n                'status': 'OK',\n                'command': cmd,\n                'output': 'DNS cache flushed'\n            }\n            \n        except Exception as e:\n            return {\n                'action': 'dns_flush',\n                'status': 'ERROR',\n                'command': cmd,\n                'error': str(e)\n            }\n    \n    def detect_gate_blockages(self, device_results: List[Dict]) -> List[Dict]:\n        \"\"\"Detect conditions that could cause gate blockages\"\"\"\n        blockages = []\n        \n        for result in device_results:\n            device_name = result.get('device_name') or result.get('endpoint_name')\n            \n            # Critical device completely unreachable\n            if result.get('status') == 'ERROR' and result.get('critical', False):\n                blockages.append({\n                    'device_name': device_name,\n                    'block_type': 'critical_device_unreachable',\n                    'severity': 'CRITICAL',\n                    'description': f\"Critical device {device_name} is completely unreachable\",\n                    'auto_recovery_possible': True\n                })\n            \n            # IPMI-specific blockages\n            if result.get('component') == 'ipmi':\n                issues = result.get('issues', [])\n                if 'ipmi_unreachable' in issues:\n                    blockages.append({\n                        'device_name': device_name,\n                        'block_type': 'ipmi_management_lost',\n                        'severity': 'HIGH',\n                        'description': f\"IPMI management access lost for device {device_name}\",\n                        'auto_recovery_possible': True\n                    })\n            \n            # Network endpoint blockages\n            if result.get('component') == 'network':\n                successful_ports = result.get('successful_ports', 0)\n                total_ports = result.get('total_ports', 1)\n                \n                if successful_ports == 0:\n                    blockages.append({\n                        'device_name': device_name,\n                        'block_type': 'network_isolation',\n                        'severity': 'CRITICAL',\n                        'description': f\"Network endpoint {device_name} is completely isolated\",\n                        'auto_recovery_possible': True\n                    })\n                elif successful_ports < total_ports * 0.5:\n                    blockages.append({\n                        'device_name': device_name,\n                        'block_type': 'partial_service_degradation',\n                        'severity': 'WARNING',\n                        'description': f\"Network endpoint {device_name} has {successful_ports}/{total_ports} services available\",\n                        'auto_recovery_possible': True\n                    })\n        \n        return blockages\n    \n    def store_device_state(self, result: Dict):\n        \"\"\"Store device state in database\"\"\"\n        with sqlite3.connect(self.db_path) as conn:\n            conn.execute('''\n                INSERT INTO device_states \n                (timestamp, device_name, device_id, state, component, status, response_time_ms, error_details)\n                VALUES (?, ?, ?, ?, ?, ?, ?, ?)\n            ''', (\n                datetime.utcnow().isoformat() + 'Z',\n                result.get('device_name') or result.get('endpoint_name'),\n                result.get('device_id', ''),\n                result.get('status', 'UNKNOWN'),\n                result.get('component', 'unknown'),\n                result.get('status', 'UNKNOWN'),\n                result.get('response_time_ms', 0),\n                json.dumps(result)\n            ))\n    \n    def store_gate_blockage(self, blockage: Dict):\n        \"\"\"Store detected gate blockage\"\"\"\n        with sqlite3.connect(self.db_path) as conn:\n            conn.execute('''\n                INSERT INTO gate_blocks \n                (device_name, block_type, severity, description, auto_recovery_attempted)\n                VALUES (?, ?, ?, ?, ?)\n            ''', (\n                blockage['device_name'],\n                blockage['block_type'],\n                blockage['severity'],\n                blockage['description'],\n                blockage['auto_recovery_possible']\n            ))\n    \n    async def monitor_and_recover(self):\n        \"\"\"Main monitoring loop with automatic recovery\"\"\"\n        logger.info(\"Starting device state monitoring with recovery capabilities\")\n        \n        self.emit_heartbeat(\n            service='device_tracker',\n            component='startup',\n            status='OK',\n            metadata='monitoring_initialized'\n        )\n        \n        while True:\n            try:\n                all_results = []\n                \n                # Check all devices\n                for device_name, config in self.devices.items():\n                    logger.info(f\"Checking IPMI device: {device_name}\")\n                    result = await self.check_ipmi_health(device_name, config)\n                    all_results.append(result)\n                    self.store_device_state(result)\n                    \n                    # Emit device-specific heartbeat\n                    self.emit_heartbeat(\n                        service='device_tracker',\n                        component=f'ipmi_{device_name}',\n                        status=result['status'],\n                        metadata=f\"device_id={result['device_id']},response_time={result['response_time_ms']:.2f}ms\"\n                    )\n                \n                # Check all network endpoints\n                for endpoint_name, config in self.endpoints.items():\n                    logger.info(f\"Checking network endpoint: {endpoint_name}\")\n                    result = await self.check_network_endpoint(endpoint_name, config)\n                    all_results.append(result)\n                    self.store_device_state(result)\n                    \n                    # Emit endpoint-specific heartbeat\n                    self.emit_heartbeat(\n                        service='device_tracker',\n                        component=f'network_{endpoint_name}',\n                        status=result['status'],\n                        metadata=f\"fqdn={result['fqdn']},ports={result['successful_ports']}/{result['total_ports']}\"\n                    )\n                \n                # Detect gate blockages\n                blockages = self.detect_gate_blockages(all_results)\n                \n                # Handle blockages with automatic recovery\n                for blockage in blockages:\n                    logger.warning(f\"Gate blockage detected: {blockage['description']}\")\n                    self.store_gate_blockage(blockage)\n                    \n                    # Emit blockage alert heartbeat\n                    self.emit_heartbeat(\n                        service='device_tracker',\n                        component='gate_blockage',\n                        status='ALERT',\n                        metadata=f\"type={blockage['block_type']},severity={blockage['severity']}\"\n                    )\n                    \n                    # Attempt automatic recovery if possible\n                    if blockage['auto_recovery_possible']:\n                        logger.info(f\"Attempting automatic recovery for {blockage['device_name']}\")\n                        recovery_result = await self.attempt_recovery(\n                            blockage['device_name'],\n                            blockage['block_type']\n                        )\n                        \n                        successful_actions = recovery_result['successful_actions']\n                        if successful_actions > 0:\n                            logger.info(f\"Recovery successful: {successful_actions} actions completed\")\n                            self.emit_heartbeat(\n                                service='device_tracker',\n                                component='auto_recovery',\n                                status='OK',\n                                metadata=f\"device={blockage['device_name']},actions={successful_actions}\"\n                            )\n                        else:\n                            logger.error(f\"Recovery failed for {blockage['device_name']}\")\n                            self.emit_heartbeat(\n                                service='device_tracker',\n                                component='auto_recovery',\n                                status='FAILED',\n                                metadata=f\"device={blockage['device_name']},attempts={recovery_result['recovery_attempts']}\"\n                            )\n                \n                # Wait before next monitoring cycle\n                await asyncio.sleep(60)  # Monitor every minute\n                \n            except KeyboardInterrupt:\n                logger.info(\"Device monitoring stopped by user\")\n                self.emit_heartbeat(\n                    service='device_tracker',\n                    component='shutdown',\n                    status='OK',\n                    metadata='monitoring_stopped'\n                )\n                break\n            except Exception as e:\n                logger.error(f\"Monitoring error: {e}\")\n                self.emit_heartbeat(\n                    service='device_tracker',\n                    component='monitor_error',\n                    status='ERROR',\n                    metadata=f\"error={str(e)}\"\n                )\n                await asyncio.sleep(30)  # Wait before retry\n\nasync def main():\n    \"\"\"Main entry point\"\"\"\n    tracker = DeviceStateTracker()\n    await tracker.monitor_and_recover()\n\nif __name__ == \"__main__\":\n    asyncio.run(main())

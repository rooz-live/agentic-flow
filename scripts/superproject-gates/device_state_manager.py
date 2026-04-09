#!/usr/bin/env python3
"""
Enhanced Device State Tracking System
Prevents gate blockages by monitoring device health, IPMI status, and network endpoints.
Specifically handles device #24460 (hv2b40b82) and endpoint stx-aio-0.corp.interface.tag.ooo.
"""

import json
import time
import sqlite3
import logging
import asyncio
import subprocess
import socket
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import ipaddress
import ping3
import concurrent.futures

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s|device_state_manager|%(levelname)s|%(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class DeviceState:
    """Device state information"""
    device_id: str
    hostname: str
    ip_address: str
    device_type: str
    status: str
    last_seen: str
    ipmi_status: Optional[str] = None
    ipmi_ip: Optional[str] = None
    network_endpoints: List[str] = None
    health_score: float = 100.0
    issues: List[str] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.network_endpoints is None:
            self.network_endpoints = []
        if self.issues is None:
            self.issues = []
        if self.metadata is None:
            self.metadata = {}

@dataclass
class HealthCheck:
    """Health check result"""
    timestamp: str
    device_id: str
    check_type: str
    status: str
    latency_ms: float
    details: Dict[str, Any]

class IPMIManager:
    """IPMI device management"""
    
    def __init__(self):
        self.ipmitool_available = self._check_ipmitool()
    
    def _check_ipmitool(self) -> bool:
        """Check if ipmitool is available"""
        try:
            subprocess.run(['ipmitool', '--version'], 
                         capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("ipmitool not available, IPMI checks will be skipped")
            return False
    
    async def check_ipmi_status(self, device_id: str, ipmi_ip: str, 
                               username: str = "ADMIN", password: str = "ADMIN") -> Dict[str, Any]:
        """Check IPMI status for a device"""
        if not self.ipmitool_available:
            return {
                'status': 'unavailable',
                'error': 'ipmitool not available',
                'power_state': 'unknown',
                'sensors': {}
            }
        
        result = {
            'status': 'unknown',
            'power_state': 'unknown',
            'sensors': {},
            'error': None
        }
        
        try:
            # Check power status
            power_cmd = [
                'ipmitool', '-I', 'lanplus', '-H', ipmi_ip,
                '-U', username, '-P', password,
                'power', 'status'
            ]
            
            power_result = await asyncio.create_subprocess_exec(
                *power_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            power_stdout, power_stderr = await power_result.communicate()
            
            if power_result.returncode == 0:
                power_output = power_stdout.decode().strip()
                result['power_state'] = 'on' if 'on' in power_output.lower() else 'off'
                result['status'] = 'ok'
                
                # Get sensor data for critical components
                sensor_cmd = [
                    'ipmitool', '-I', 'lanplus', '-H', ipmi_ip,
                    '-U', username, '-P', password,
                    'sdr', 'list', 'full'
                ]
                
                sensor_result = await asyncio.create_subprocess_exec(
                    *sensor_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                sensor_stdout, sensor_stderr = await sensor_result.communicate()
                
                if sensor_result.returncode == 0:
                    sensors = self._parse_sensor_data(sensor_stdout.decode())
                    result['sensors'] = sensors
                
            else:
                error_msg = power_stderr.decode().strip()
                result['error'] = error_msg
                result['status'] = 'error'
                
                # Handle specific device #24460 (hv2b40b82) issues
                if device_id == "24460" or "hv2b40b82" in ipmi_ip:
                    result['known_issue'] = "Device #24460 IPMI connectivity issue"
                    result['remediation'] = [
                        "Check network connectivity to IPMI interface",
                        "Verify IPMI credentials",
                        "Consider IPMI interface reset if persistent"
                    ]
                
        except Exception as e:
            result['status'] = 'exception'
            result['error'] = str(e)
            logger.error(f"IPMI check failed for {device_id}: {e}")
        
        return result
    
    def _parse_sensor_data(self, sensor_output: str) -> Dict[str, Any]:
        """Parse IPMI sensor data"""
        sensors = {}
        
        for line in sensor_output.split('\n'):
            if '|' in line:
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 3:
                    sensor_name = parts[0]
                    sensor_value = parts[1]
                    sensor_status = parts[2] if len(parts) > 2 else 'unknown'
                    
                    # Focus on critical sensors
                    if any(keyword in sensor_name.lower() for keyword in 
                          ['temp', 'fan', 'voltage', 'power', 'cpu']):
                        sensors[sensor_name] = {
                            'value': sensor_value,
                            'status': sensor_status
                        }
        
        return sensors

class NetworkMonitor:
    """Network endpoint monitoring"""
    
    async def check_ping(self, hostname: str, timeout: float = 3.0) -> Dict[str, Any]:
        """Check ping connectivity to endpoint"""
        result = {
            'status': 'unknown',
            'latency_ms': 0.0,
            'packet_loss': 0.0,
            'error': None
        }
        
        try:
            # Use ping3 for async ping
            latency = ping3.ping(hostname, timeout=timeout)
            
            if latency is not None:
                result['status'] = 'ok'
                result['latency_ms'] = latency * 1000  # Convert to ms
            else:
                result['status'] = 'timeout'
                result['error'] = f'Ping timeout after {timeout}s'
                
        except Exception as e:
            result['status'] = 'error'
            result['error'] = str(e)
        
        return result
    
    async def check_port(self, hostname: str, port: int, timeout: float = 5.0) -> Dict[str, Any]:
        """Check TCP port connectivity"""
        result = {
            'status': 'unknown',
            'port': port,
            'error': None
        }
        
        try:
            # Use asyncio to create connection
            future = asyncio.open_connection(hostname, port)
            reader, writer = await asyncio.wait_for(future, timeout=timeout)
            
            result['status'] = 'ok'
            
            # Close connection
            writer.close()
            await writer.wait_closed()
            
        except asyncio.TimeoutError:
            result['status'] = 'timeout'
            result['error'] = f'Connection timeout after {timeout}s'
        except ConnectionRefusedError:
            result['status'] = 'refused'
            result['error'] = f'Connection refused on port {port}'
        except Exception as e:
            result['status'] = 'error'
            result['error'] = str(e)
        
        return result
    
    async def check_dns_resolution(self, hostname: str) -> Dict[str, Any]:
        """Check DNS resolution for hostname"""
        result = {
            'status': 'unknown',
            'ip_addresses': [],
            'error': None
        }
        
        try:
            # Resolve hostname to IP addresses
            addrs = await asyncio.get_event_loop().getaddrinfo(
                hostname, None, family=socket.AF_UNSPEC
            )
            
            ip_addresses = list(set(addr[4][0] for addr in addrs))
            result['ip_addresses'] = ip_addresses
            result['status'] = 'ok' if ip_addresses else 'failed'
            
            if not ip_addresses:
                result['error'] = 'No IP addresses resolved'
                
        except socket.gaierror as e:
            result['status'] = 'error'
            result['error'] = f'DNS resolution failed: {e}'
        except Exception as e:
            result['status'] = 'error'
            result['error'] = str(e)
        
        return result

class DeviceStateDatabase:
    """Database for device state tracking"""
    
    def __init__(self, db_path: str = "device_states.db"):
        self.db_path = db_path
        self.init_db()
    
    def init_db(self):
        """Initialize database schema"""
        with sqlite3.connect(self.db_path) as conn:
            # Device states table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS device_states (
                    device_id TEXT PRIMARY KEY,
                    hostname TEXT NOT NULL,
                    ip_address TEXT NOT NULL,
                    device_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    last_seen TEXT NOT NULL,
                    ipmi_status TEXT,
                    ipmi_ip TEXT,
                    network_endpoints TEXT,
                    health_score REAL DEFAULT 100.0,
                    issues TEXT,
                    metadata TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Health checks table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS health_checks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    device_id TEXT NOT NULL,
                    check_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    latency_ms REAL NOT NULL,
                    details TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_device_status 
                ON device_states(device_id, status)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_health_timestamp 
                ON health_checks(device_id, timestamp)
            """)
    
    def upsert_device_state(self, device: DeviceState):
        """Insert or update device state"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO device_states 
                (device_id, hostname, ip_address, device_type, status, last_seen,
                 ipmi_status, ipmi_ip, network_endpoints, health_score, issues, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                device.device_id,
                device.hostname,
                device.ip_address,
                device.device_type,
                device.status,
                device.last_seen,
                device.ipmi_status,
                device.ipmi_ip,
                json.dumps(device.network_endpoints),
                device.health_score,
                json.dumps(device.issues),
                json.dumps(device.metadata)
            ))
    
    def record_health_check(self, check: HealthCheck):
        """Record health check result"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO health_checks 
                (timestamp, device_id, check_type, status, latency_ms, details)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                check.timestamp,
                check.device_id,
                check.check_type,
                check.status,
                check.latency_ms,
                json.dumps(check.details)
            ))
    
    def get_device_state(self, device_id: str) -> Optional[DeviceState]:
        """Get current device state"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT * FROM device_states WHERE device_id = ?", 
                (device_id,)
            )
            row = cursor.fetchone()
            
            if row:
                return DeviceState(
                    device_id=row['device_id'],
                    hostname=row['hostname'],
                    ip_address=row['ip_address'],
                    device_type=row['device_type'],
                    status=row['status'],
                    last_seen=row['last_seen'],
                    ipmi_status=row['ipmi_status'],
                    ipmi_ip=row['ipmi_ip'],
                    network_endpoints=json.loads(row['network_endpoints'] or '[]'),
                    health_score=row['health_score'],
                    issues=json.loads(row['issues'] or '[]'),
                    metadata=json.loads(row['metadata'] or '{}')
                )
            
            return None
    
    def get_unhealthy_devices(self, health_threshold: float = 80.0) -> List[DeviceState]:
        """Get devices with health scores below threshold"""
        devices = []
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT * FROM device_states WHERE health_score < ? ORDER BY health_score ASC",
                (health_threshold,)
            )
            
            for row in cursor.fetchall():
                devices.append(DeviceState(
                    device_id=row['device_id'],
                    hostname=row['hostname'],
                    ip_address=row['ip_address'],
                    device_type=row['device_type'],
                    status=row['status'],
                    last_seen=row['last_seen'],
                    ipmi_status=row['ipmi_status'],
                    ipmi_ip=row['ipmi_ip'],
                    network_endpoints=json.loads(row['network_endpoints'] or '[]'),
                    health_score=row['health_score'],
                    issues=json.loads(row['issues'] or '[]'),
                    metadata=json.loads(row['metadata'] or '{}')
                ))
        
        return devices

class DeviceStateManager:
    """Main device state management system"""
    
    def __init__(self, config_path: str = "device_config.json"):
        self.config = self.load_config(config_path)
        self.db = DeviceStateDatabase(self.config.get('database_path', 'device_states.db'))
        self.ipmi_manager = IPMIManager()
        self.network_monitor = NetworkMonitor()
        
        # Initialize known devices
        self.init_known_devices()
    
    def load_config(self, config_path: str) -> Dict:
        """Load device configuration"""
        default_config = {
            'database_path': 'device_states.db',
            'monitoring_interval': 60,
            'health_check_timeout': 10.0,
            'health_threshold': 80.0,
            'known_devices': [
                {
                    'device_id': '24460',
                    'hostname': 'hv2b40b82',
                    'ip_address': '23.92.79.2',
                    'device_type': 'hypervisor',
                    'ipmi_ip': 'hv2b40b82-ipmi',
                    'network_endpoints': [
                        'stx-aio-0.corp.interface.tag.ooo'
                    ]
                }
            ],
            'ipmi_credentials': {
                'username': 'ADMIN',
                'password': 'ADMIN'
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
    
    def init_known_devices(self):
        """Initialize known devices from configuration"""
        for device_config in self.config.get('known_devices', []):
            device = DeviceState(
                device_id=device_config['device_id'],
                hostname=device_config['hostname'],
                ip_address=device_config['ip_address'],
                device_type=device_config['device_type'],
                status='unknown',
                last_seen=datetime.now().isoformat() + 'Z',
                ipmi_ip=device_config.get('ipmi_ip'),
                network_endpoints=device_config.get('network_endpoints', [])
            )
            
            self.db.upsert_device_state(device)
    
    async def perform_health_check(self, device: DeviceState) -> float:
        """Perform comprehensive health check for a device"""
        check_start = time.time()
        health_score = 100.0
        issues = []
        checks_performed = []
        
        try:
            # 1. Basic connectivity check (ping)
            ping_result = await self.network_monitor.check_ping(
                device.ip_address, timeout=self.config['health_check_timeout']
            )
            
            checks_performed.append(HealthCheck(
                timestamp=datetime.now().isoformat() + 'Z',
                device_id=device.device_id,
                check_type='ping',
                status=ping_result['status'],
                latency_ms=ping_result['latency_ms'],
                details=ping_result
            ))
            
            if ping_result['status'] != 'ok':
                health_score -= 30
                issues.append(f"Ping failed: {ping_result.get('error', 'Unknown error')}")
            
            # 2. DNS resolution check for network endpoints
            for endpoint in device.network_endpoints:
                dns_result = await self.network_monitor.check_dns_resolution(endpoint)
                
                checks_performed.append(HealthCheck(
                    timestamp=datetime.now().isoformat() + 'Z',
                    device_id=device.device_id,
                    check_type='dns',
                    status=dns_result['status'],
                    latency_ms=0.0,  # DNS timing not measured
                    details={'endpoint': endpoint, **dns_result}
                ))
                
                if dns_result['status'] != 'ok':
                    health_score -= 15
                    issues.append(f"DNS resolution failed for {endpoint}: {dns_result.get('error')}")
            
            # 3. IPMI check (if configured)
            if device.ipmi_ip:
                ipmi_creds = self.config['ipmi_credentials']
                ipmi_result = await self.ipmi_manager.check_ipmi_status(
                    device.device_id,
                    device.ipmi_ip,
                    username=ipmi_creds.get('username', 'ADMIN'),
                    password=ipmi_creds.get('password', 'ADMIN')
                )
                
                checks_performed.append(HealthCheck(
                    timestamp=datetime.now().isoformat() + 'Z',
                    device_id=device.device_id,
                    check_type='ipmi',
                    status=ipmi_result['status'],
                    latency_ms=0.0,
                    details=ipmi_result
                ))
                
                if ipmi_result['status'] != 'ok':
                    if ipmi_result['status'] != 'unavailable':  # Don't penalize if ipmitool not available
                        health_score -= 20
                        issues.append(f"IPMI check failed: {ipmi_result.get('error', 'Unknown error')}")
                
                # Store IPMI status
                device.ipmi_status = ipmi_result['status']
            
            # 4. Service-specific checks
            if device.device_type == 'hypervisor':
                # Check SSH connectivity (port 22)
                ssh_result = await self.network_monitor.check_port(
                    device.ip_address, 22, timeout=5.0
                )
                
                checks_performed.append(HealthCheck(
                    timestamp=datetime.now().isoformat() + 'Z',
                    device_id=device.device_id,
                    check_type='ssh',
                    status=ssh_result['status'],
                    latency_ms=0.0,
                    details=ssh_result
                ))
                
                if ssh_result['status'] != 'ok':
                    health_score -= 10
                    issues.append(f"SSH connectivity failed: {ssh_result.get('error')}")
            
            # Store all health check results
            for check in checks_performed:
                self.db.record_health_check(check)
            
            # Update device state
            device.health_score = max(0.0, health_score)
            device.issues = issues
            device.last_seen = datetime.now().isoformat() + 'Z'
            device.status = 'healthy' if health_score >= self.config['health_threshold'] else 'unhealthy'
            
            # Add performance metadata
            check_duration = time.time() - check_start
            device.metadata['last_check_duration'] = check_duration
            device.metadata['checks_performed'] = len(checks_performed)
            
            self.db.upsert_device_state(device)
            
        except Exception as e:
            logger.error(f"Health check failed for device {device.device_id}: {e}")
            health_score = 0.0
            device.status = 'error'
            device.issues = [f"Health check exception: {str(e)}"]
        
        return health_score
    
    async def monitor_all_devices(self):
        """Monitor all known devices"""
        devices = []
        
        # Get all known devices
        with sqlite3.connect(self.db.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT device_id FROM device_states")
            device_ids = [row['device_id'] for row in cursor.fetchall()]
        
        # Load device states
        for device_id in device_ids:
            device = self.db.get_device_state(device_id)
            if device:
                devices.append(device)
        
        if not devices:
            logger.warning("No devices configured for monitoring")
            return
        
        # Perform health checks concurrently
        tasks = [self.perform_health_check(device) for device in devices]
        
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Log results
            for i, result in enumerate(results):
                device = devices[i]
                if isinstance(result, Exception):
                    logger.error(f"Health check failed for {device.device_id}: {result}")
                else:
                    logger.info(f"Device {device.device_id} health score: {result:.1f}")
            
        except Exception as e:
            logger.error(f"Monitoring error: {e}")
    
    async def get_system_health_summary(self) -> Dict[str, Any]:
        """Get overall system health summary"""
        unhealthy_devices = self.db.get_unhealthy_devices(
            health_threshold=self.config['health_threshold']
        )
        
        summary = {
            'timestamp': datetime.now().isoformat() + 'Z',
            'total_devices': 0,
            'healthy_devices': 0,
            'unhealthy_devices': len(unhealthy_devices),
            'critical_issues': [],
            'device_details': []
        }
        
        with sqlite3.connect(self.db.db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*) as total FROM device_states")
            summary['total_devices'] = cursor.fetchone()[0]
            
            cursor = conn.execute(
                "SELECT COUNT(*) as healthy FROM device_states WHERE health_score >= ?",
                (self.config['health_threshold'],)
            )
            summary['healthy_devices'] = cursor.fetchone()[0]
        
        # Add details for unhealthy devices
        for device in unhealthy_devices:
            device_detail = {
                'device_id': device.device_id,
                'hostname': device.hostname,
                'health_score': device.health_score,
                'status': device.status,
                'issues': device.issues,
                'last_seen': device.last_seen
            }
            
            summary['device_details'].append(device_detail)
            
            # Flag critical issues
            if device.health_score < 50:
                summary['critical_issues'].append(
                    f"Device {device.device_id} ({device.hostname}) critically unhealthy: {device.health_score:.1f}%"
                )
        
        return summary
    
    async def remediate_device_issues(self, device_id: str) -> Dict[str, Any]:
        """Attempt to remediate known device issues"""
        device = self.db.get_device_state(device_id)
        if not device:
            return {'status': 'error', 'message': f'Device {device_id} not found'}
        
        remediation_actions = []
        
        # Specific remediation for device #24460
        if device_id == "24460":
            remediation_actions.extend([
                "Checking IPMI interface connectivity for hv2b40b82",
                "Verifying network path to stx-aio-0.corp.interface.tag.ooo",
                "Attempting IPMI interface reset if needed"
            ])
            
            # Implement specific fixes for device #24460
            if device.ipmi_status in ['error', 'timeout']:
                logger.info(f"Attempting IPMI remediation for device {device_id}")
                # Could implement specific IPMI reset logic here
        
        return {
            'status': 'in_progress',
            'device_id': device_id,
            'actions': remediation_actions,
            'timestamp': datetime.now().isoformat() + 'Z'
        }
    
    async def monitor_loop(self):
        """Main monitoring loop"""
        interval = self.config['monitoring_interval']
        
        logger.info(f"Starting device state monitoring (interval: {interval}s)")
        
        while True:
            try:
                await self.monitor_all_devices()
                
                # Generate system health summary
                summary = await self.get_system_health_summary()
                
                if summary['unhealthy_devices'] > 0:
                    logger.warning(f"System health: {summary['healthy_devices']}/{summary['total_devices']} devices healthy")
                    for issue in summary['critical_issues']:
                        logger.error(f"Critical: {issue}")
                else:
                    logger.info(f"All {summary['total_devices']} devices healthy")
                
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
            
            await asyncio.sleep(interval)

def create_sample_device_config():
    """Create sample device configuration"""
    config = {
        "database_path": "device_states.db",
        "monitoring_interval": 300,  # 5 minutes
        "health_check_timeout": 10.0,
        "health_threshold": 80.0,
        "known_devices": [
            {
                "device_id": "24460",
                "hostname": "hv2b40b82",
                "ip_address": "23.92.79.2",
                "device_type": "hypervisor",
                "ipmi_ip": "hv2b40b82-ipmi.corp.interface.tag.ooo",
                "network_endpoints": [
                    "stx-aio-0.corp.interface.tag.ooo"
                ]
            }
        ],
        "ipmi_credentials": {
            "username": "ADMIN",
            "password": "ADMIN"
        }
    }
    
    with open('device_config.json', 'w') as f:
        json.dump(config, f, indent=2)
    
    print("Created sample device configuration: device_config.json")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Device State Management System')
    parser.add_argument('--config', default='device_config.json',
                       help='Configuration file path')
    parser.add_argument('--create-config', action='store_true',
                       help='Create sample configuration file')
    parser.add_argument('--check-device', type=str,
                       help='Perform health check on specific device ID')
    parser.add_argument('--health-summary', action='store_true',
                       help='Show system health summary')
    
    args = parser.parse_args()
    
    if args.create_config:
        create_sample_device_config()
        return
    
    manager = DeviceStateManager(args.config)
    
    if args.check_device:
        device = manager.db.get_device_state(args.check_device)
        if device:
            result = asyncio.run(manager.perform_health_check(device))
            print(f"Device {args.check_device} health score: {result:.1f}")
        else:
            print(f"Device {args.check_device} not found")
        return
    
    if args.health_summary:
        summary = asyncio.run(manager.get_system_health_summary())
        print(json.dumps(summary, indent=2))
        return
    
    # Run continuous monitoring
    asyncio.run(manager.monitor_loop())

if __name__ == '__main__':
    main()
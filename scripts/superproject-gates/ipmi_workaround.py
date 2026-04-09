#!/usr/bin/env python3
"""
IPMI Workaround Script for Device #24460
SSH-based remote management when direct IPMI is unreachable
"""

import os
import sys
import json
import time
import logging
import argparse
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import paramiko
from dataclasses import dataclass
import yaml

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class DeviceStatus:
    """Device status information"""
    device_id: str
    hostname: str
    status: str
    last_check: datetime
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    uptime: str
    load_average: List[float]
    network_interfaces: Dict[str, Any]
    services_status: Dict[str, str]

@dataclass
class IPMICommand:
    """IPMI command representation"""
    command: str
    ssh_equivalent: str
    description: str
    requires_root: bool

class IPMIWorkaround:
    """SSH-based workaround for IPMI access to device #24460"""
    
    def __init__(self, config_path: str = '/etc/risk-analytics/ipmi_config.yaml'):
        self.config = self._load_config(config_path)
        self.device_id = "24460"
        self.hostname = self.config.get('hostname', '192.168.1.100')
        self.username = self.config.get('username', 'admin')
        self.key_file = self.config.get('key_file', '/Users/shahroozbhopti/Documents/code/legacy engineering/DevOps/pem/device_24460.pem')
        self.port = self.config.get('port', 22)
        
        # IPMI command mappings
        self.ipmi_commands = self._initialize_command_mappings()
        
        logger.info(f"IPMIWorkaround initialized for device {self.device_id} at {self.hostname}")
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from YAML file"""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f) or {}
        except FileNotFoundError:
            logger.warning(f"Config file not found: {config_path}, using defaults")
            return {}
        except yaml.YAMLError as e:
            logger.error(f"Error parsing config file: {e}")
            return {}
    
    def _initialize_command_mappings(self) -> Dict[str, IPMICommand]:
        """Initialize IPMI to SSH command mappings"""
        return {
            'power_status': IPMICommand(
                command='ipmitool chassis power status',
                ssh_equivalent='systemctl is-system-running',
                description='Check system power/running status',
                requires_root=False
            ),
            'power_on': IPMICommand(
                command='ipmitool chassis power on',
                ssh_equivalent='sudo systemctl reboot',
                description='Power on/restart system',
                requires_root=True
            ),
            'power_off': IPMICommand(
                command='ipmitool chassis power off',
                ssh_equivalent='sudo shutdown -h now',
                description='Power off system',
                requires_root=True
            ),
            'reset': IPMICommand(
                command='ipmitool chassis power reset',
                ssh_equivalent='sudo systemctl reboot',
                description='Reset system',
                requires_root=True
            ),
            'sensor_list': IPMICommand(
                command='ipmitool sensor list',
                ssh_equivalent='sensors && cat /proc/cpuinfo | grep MHz && free -h',
                description='List system sensors and stats',
                requires_root=False
            ),
            'system_info': IPMICommand(
                command='ipmitool fru print',
                ssh_equivalent='dmidecode -t system && uname -a',
                description='System information',
                requires_root=True
            ),
            'bmc_info': IPMICommand(
                command='ipmitool mc info',
                ssh_equivalent='hostnamectl && systemd-analyze',
                description='Management controller info',
                requires_root=False
            ),
            'sel_list': IPMICommand(
                command='ipmitool sel list',
                ssh_equivalent='journalctl --since "1 hour ago" -p err && dmesg | tail -50',
                description='System event log',
                requires_root=False
            )
        }
    
    def create_ssh_connection(self) -> paramiko.SSHClient:
        """Create SSH connection to the device"""
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Load private key
            if os.path.exists(self.key_file):
                private_key = paramiko.RSAKey.from_private_key_file(self.key_file)
                ssh.connect(
                    hostname=self.hostname,
                    port=self.port,
                    username=self.username,
                    pkey=private_key,
                    timeout=10
                )
            else:
                # Fallback to password authentication (not recommended for production)
                password = self.config.get('password')
                if password:
                    ssh.connect(
                        hostname=self.hostname,
                        port=self.port,
                        username=self.username,
                        password=password,
                        timeout=10
                    )
                else:
                    raise Exception(f"Neither key file ({self.key_file}) nor password available")
            
            logger.debug(f"SSH connection established to {self.hostname}")
            return ssh
            
        except Exception as e:
            logger.error(f"Failed to establish SSH connection: {e}")
            raise
    
    def execute_ssh_command(self, command: str, timeout: int = 30) -> Tuple[str, str, int]:
        """Execute command via SSH and return stdout, stderr, exit code"""
        ssh = None
        try:
            ssh = self.create_ssh_connection()
            
            logger.debug(f"Executing SSH command: {command}")
            stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
            
            exit_code = stdout.channel.recv_exit_status()
            stdout_data = stdout.read().decode('utf-8').strip()
            stderr_data = stderr.read().decode('utf-8').strip()
            
            return stdout_data, stderr_data, exit_code
            
        except Exception as e:
            logger.error(f"SSH command execution failed: {e}")
            return "", str(e), -1
        finally:
            if ssh:
                ssh.close()
    
    def check_connectivity(self) -> bool:
        """Test SSH connectivity to the device"""
        try:
            stdout, stderr, exit_code = self.execute_ssh_command('echo "connectivity_test"')
            
            if exit_code == 0 and "connectivity_test" in stdout:
                logger.info(f"✅ SSH connectivity to device {self.device_id} confirmed")
                return True
            else:
                logger.error(f"❌ SSH connectivity test failed: {stderr}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Connectivity check failed: {e}")
            return False
    
    def get_power_status(self) -> str:
        """Get system power/running status"""
        try:
            ipmi_cmd = self.ipmi_commands['power_status']
            stdout, stderr, exit_code = self.execute_ssh_command(ipmi_cmd.ssh_equivalent)
            
            if exit_code == 0:
                # Map systemctl output to IPMI-like response
                if 'running' in stdout.lower():
                    return "Chassis Power is on"
                elif 'degraded' in stdout.lower():
                    return "Chassis Power is on (degraded)"
                else:
                    return f"Chassis Power status: {stdout}"
            else:
                # Fallback check
                uptime_stdout, _, uptime_exit = self.execute_ssh_command('uptime')
                if uptime_exit == 0:
                    return "Chassis Power is on"
                else:
                    return "Chassis Power is off"
                    
        except Exception as e:
            logger.error(f"Power status check failed: {e}")
            return "Power status unknown"
    
    def power_cycle(self, action: str = 'reset') -> bool:
        """Perform power cycle operation"""
        if action not in ['on', 'off', 'reset']:
            logger.error(f"Invalid power action: {action}")
            return False
        
        try:
            ipmi_cmd = self.ipmi_commands.get(f'power_{action}')
            if not ipmi_cmd:
                logger.error(f"Power action {action} not supported")
                return False
            
            logger.warning(f"⚠️  Performing power {action} on device {self.device_id}")
            
            # Confirm action for destructive operations
            if action in ['off', 'reset']:
                confirm = input(f"Are you sure you want to {action} device {self.device_id}? (yes/no): ")
                if confirm.lower() != 'yes':
                    logger.info("Power operation cancelled by user")
                    return False
            
            stdout, stderr, exit_code = self.execute_ssh_command(ipmi_cmd.ssh_equivalent, timeout=60)
            
            if exit_code == 0:
                logger.info(f"✅ Power {action} command sent successfully")
                return True
            else:
                logger.error(f"❌ Power {action} failed: {stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Power cycle operation failed: {e}")
            return False
    
    def get_system_sensors(self) -> Dict[str, Any]:
        """Get system sensor information (temperature, voltage, etc.)"""
        try:
            ipmi_cmd = self.ipmi_commands['sensor_list']
            stdout, stderr, exit_code = self.execute_ssh_command(ipmi_cmd.ssh_equivalent)
            
            sensors = {}
            
            if exit_code == 0:
                lines = stdout.split('\n')
                
                # Parse temperature sensors
                for line in lines:
                    if '°C' in line or 'temp' in line.lower():
                        sensors['temperature'] = line.strip()
                
                # Parse CPU info
                cpu_info = []
                for line in lines:
                    if 'MHz' in line or 'cpu MHz' in line:
                        cpu_info.append(line.strip())
                if cpu_info:
                    sensors['cpu_frequency'] = cpu_info
                
                # Parse memory info
                memory_info = []
                for line in lines:
                    if any(mem_key in line.lower() for mem_key in ['mem', 'total', 'free', 'available']):
                        memory_info.append(line.strip())
                if memory_info:
                    sensors['memory'] = memory_info
            
            # Additional system stats
            stats_commands = {
                'cpu_usage': "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1",
                'memory_usage': "free | grep Mem | awk '{printf(\"%.1f\", ($3/$2) * 100.0)}'",
                'load_average': "uptime | awk -F'load average:' '{print $2}'",
                'disk_usage': "df -h / | tail -1 | awk '{print $5}'"
            }
            
            for stat_name, command in stats_commands.items():
                try:
                    stat_stdout, _, stat_exit = self.execute_ssh_command(command)
                    if stat_exit == 0:
                        sensors[stat_name] = stat_stdout.strip()
                except:
                    pass
            
            return sensors
            
        except Exception as e:
            logger.error(f"System sensors check failed: {e}")
            return {}
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get detailed system information"""
        try:
            info = {}
            
            info_commands = {
                'hostname': 'hostname -f',
                'uptime': 'uptime -p',
                'kernel': 'uname -r',
                'os_release': 'cat /etc/os-release | head -5',
                'cpu_info': 'lscpu | grep "Model name" | cut -d: -f2',
                'memory_total': 'free -h | grep Mem | awk "{print $2}"',
                'disk_info': 'lsblk -d -o NAME,SIZE,MODEL | head -5',
                'network_interfaces': 'ip addr show | grep -E "^[0-9]+" | awk "{print $2}"'
            }
            
            for info_key, command in info_commands.items():
                try:
                    stdout, _, exit_code = self.execute_ssh_command(command)
                    if exit_code == 0:
                        info[info_key] = stdout.strip()
                except Exception as e:
                    info[info_key] = f"Error: {e}"
            
            return info
            
        except Exception as e:
            logger.error(f"System info collection failed: {e}")
            return {}
    
    def get_system_logs(self, lines: int = 50) -> Dict[str, List[str]]:
        """Get recent system logs"""
        try:
            logs = {}
            
            log_commands = {
                'system_errors': f'journalctl --since "1 hour ago" -p err --no-pager -n {lines}',
                'kernel_messages': f'dmesg | tail -{lines}',
                'auth_log': f'journalctl --since "1 hour ago" _COMM=sshd --no-pager -n {lines}',
                'system_log': f'journalctl --since "1 hour ago" --no-pager -n {lines}'
            }
            
            for log_type, command in log_commands.items():
                try:
                    stdout, _, exit_code = self.execute_ssh_command(command)
                    if exit_code == 0 and stdout:
                        logs[log_type] = stdout.split('\n')
                    else:
                        logs[log_type] = []
                except Exception:
                    logs[log_type] = []
            
            return logs
            
        except Exception as e:
            logger.error(f"System logs collection failed: {e}")
            return {}
    
    def check_services_status(self) -> Dict[str, str]:
        """Check status of critical services"""
        critical_services = [
            'sshd', 'systemd-networkd', 'systemd-resolved', 
            'docker', 'nginx', 'risk-analytics'
        ]
        
        service_status = {}
        
        for service in critical_services:
            try:
                command = f'systemctl is-active {service}'
                stdout, _, exit_code = self.execute_ssh_command(command)
                
                if exit_code == 0:
                    service_status[service] = stdout.strip()
                else:
                    service_status[service] = 'inactive'
                    
            except Exception:
                service_status[service] = 'unknown'
        
        return service_status
    
    def get_comprehensive_status(self) -> DeviceStatus:
        """Get comprehensive device status"""
        try:
            # Basic connectivity check
            if not self.check_connectivity():
                return DeviceStatus(
                    device_id=self.device_id,
                    hostname=self.hostname,
                    status='unreachable',
                    last_check=datetime.utcnow(),
                    cpu_usage=0.0,
                    memory_usage=0.0,
                    disk_usage=0.0,
                    uptime='unknown',
                    load_average=[0.0, 0.0, 0.0],
                    network_interfaces={},
                    services_status={}
                )
            
            # Get system metrics
            sensors = self.get_system_sensors()
            system_info = self.get_system_info()
            services = self.check_services_status()
            
            # Parse metrics
            cpu_usage = float(sensors.get('cpu_usage', '0').replace('%', ''))
            memory_usage = float(sensors.get('memory_usage', '0'))
            disk_usage_str = sensors.get('disk_usage', '0%').replace('%', '')
            disk_usage = float(disk_usage_str) if disk_usage_str.replace('.', '').isdigit() else 0.0
            
            # Parse load average
            load_avg_str = sensors.get('load_average', '0.0, 0.0, 0.0').strip()
            load_average = [float(x.strip()) for x in load_avg_str.split(',')[:3]]
            if len(load_average) < 3:
                load_average = [0.0, 0.0, 0.0]
            
            # Determine overall status
            status = 'healthy'
            if cpu_usage > 80:
                status = 'high_cpu'
            elif memory_usage > 85:
                status = 'high_memory'
            elif disk_usage > 90:
                status = 'high_disk'
            elif any(services[svc] != 'active' for svc in ['sshd'] if svc in services):
                status = 'service_issues'
            
            device_status = DeviceStatus(
                device_id=self.device_id,
                hostname=self.hostname,
                status=status,
                last_check=datetime.utcnow(),
                cpu_usage=cpu_usage,
                memory_usage=memory_usage,
                disk_usage=disk_usage,
                uptime=system_info.get('uptime', 'unknown'),
                load_average=load_average,
                network_interfaces={'ssh': f"{self.hostname}:{self.port}"},
                services_status=services
            )
            
            logger.info(f"✅ Comprehensive status collected for device {self.device_id}")
            return device_status
            
        except Exception as e:
            logger.error(f"Comprehensive status collection failed: {e}")
            return DeviceStatus(
                device_id=self.device_id,
                hostname=self.hostname,
                status='error',
                last_check=datetime.utcnow(),
                cpu_usage=0.0,
                memory_usage=0.0,
                disk_usage=0.0,
                uptime='unknown',
                load_average=[0.0, 0.0, 0.0],
                network_interfaces={},
                services_status={}
            )
    
    def run_health_check(self) -> Dict[str, Any]:
        """Run comprehensive health check"""
        logger.info(f"🔍 Starting health check for device {self.device_id}")
        
        health_report = {
            'device_id': self.device_id,
            'timestamp': datetime.utcnow().isoformat(),
            'connectivity': {},
            'power_status': {},
            'system_info': {},
            'sensors': {},
            'services': {},
            'logs': {},
            'overall_status': 'unknown',
            'recommendations': []
        }
        
        try:
            # Test connectivity
            connectivity_ok = self.check_connectivity()
            health_report['connectivity'] = {
                'status': 'ok' if connectivity_ok else 'failed',
                'method': 'ssh',
                'endpoint': f"{self.hostname}:{self.port}"
            }
            
            if not connectivity_ok:
                health_report['overall_status'] = 'unreachable'
                health_report['recommendations'].append('Check network connectivity and SSH service')
                return health_report
            
            # Get power status
            power_status = self.get_power_status()
            health_report['power_status'] = {
                'status': power_status,
                'method': 'ssh_equivalent'
            }
            
            # Get system information
            system_info = self.get_system_info()
            health_report['system_info'] = system_info
            
            # Get sensors
            sensors = self.get_system_sensors()
            health_report['sensors'] = sensors
            
            # Get service status
            services = self.check_services_status()
            health_report['services'] = services
            
            # Get recent logs
            logs = self.get_system_logs(20)
            health_report['logs'] = {k: v[:5] for k, v in logs.items()}  # Truncate for report
            
            # Determine overall status and recommendations
            issues = []
            
            # Check resource usage
            cpu_usage = float(sensors.get('cpu_usage', '0').replace('%', ''))
            memory_usage = float(sensors.get('memory_usage', '0'))
            
            if cpu_usage > 80:
                issues.append(f'High CPU usage: {cpu_usage}%')
                health_report['recommendations'].append('Investigate high CPU usage')
            
            if memory_usage > 85:
                issues.append(f'High memory usage: {memory_usage}%')
                health_report['recommendations'].append('Check memory-intensive processes')
            
            # Check service status
            critical_services = ['sshd', 'docker', 'nginx']
            for service in critical_services:
                if service in services and services[service] != 'active':
                    issues.append(f'Service {service} is {services[service]}')
                    health_report['recommendations'].append(f'Restart {service} service')
            
            # Check for errors in logs
            error_logs = logs.get('system_errors', [])
            if error_logs and len([log for log in error_logs if log.strip()]) > 0:
                issues.append('Recent error messages found in system logs')
                health_report['recommendations'].append('Review system error logs')
            
            # Determine overall status
            if not issues:
                health_report['overall_status'] = 'healthy'
            elif len(issues) <= 2:
                health_report['overall_status'] = 'warning'
            else:
                health_report['overall_status'] = 'critical'
            
            health_report['issues'] = issues
            
            logger.info(f"✅ Health check completed for device {self.device_id}")
            logger.info(f"Overall status: {health_report['overall_status']}")
            if issues:
                logger.warning(f"Issues found: {', '.join(issues)}")
            
            return health_report
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            health_report['overall_status'] = 'error'
            health_report['error'] = str(e)
            return health_report
    
    def save_health_report(self, health_report: Dict[str, Any], 
                          output_file: Optional[str] = None):
        """Save health check report to file"""
        if not output_file:
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            output_file = f'/var/log/risk-analytics/device_{self.device_id}_health_{timestamp}.json'
        
        try:
            Path(output_file).parent.mkdir(parents=True, exist_ok=True)
            with open(output_file, 'w') as f:
                json.dump(health_report, f, indent=2)
            
            logger.info(f"Health report saved to {output_file}")
            
        except Exception as e:
            logger.error(f"Failed to save health report: {e}")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='IPMI Workaround for Device #24460')
    parser.add_argument('--config', default='/etc/risk-analytics/ipmi_config.yaml',
                       help='Configuration file path')
    parser.add_argument('--action', choices=['connectivity', 'power-status', 'power-cycle', 
                                           'sensors', 'system-info', 'logs', 'services', 
                                           'health-check'], 
                       default='health-check',
                       help='Action to perform')
    parser.add_argument('--power-action', choices=['on', 'off', 'reset'],
                       help='Power action for power-cycle')
    parser.add_argument('--output', help='Output file for reports')
    parser.add_argument('--lines', type=int, default=50,
                       help='Number of log lines to retrieve')
    
    args = parser.parse_args()
    
    try:
        ipmi_workaround = IPMIWorkaround(args.config)
        
        if args.action == 'connectivity':
            result = ipmi_workaround.check_connectivity()
            print(f"Connectivity: {'✅ OK' if result else '❌ FAILED'}")
            
        elif args.action == 'power-status':
            status = ipmi_workaround.get_power_status()
            print(f"Power Status: {status}")
            
        elif args.action == 'power-cycle':
            if not args.power_action:
                print("Error: --power-action required for power-cycle")
                sys.exit(1)
            result = ipmi_workaround.power_cycle(args.power_action)
            print(f"Power {args.power_action}: {'✅ SUCCESS' if result else '❌ FAILED'}")
            
        elif args.action == 'sensors':
            sensors = ipmi_workaround.get_system_sensors()
            print(json.dumps(sensors, indent=2))
            
        elif args.action == 'system-info':
            info = ipmi_workaround.get_system_info()
            print(json.dumps(info, indent=2))
            
        elif args.action == 'logs':
            logs = ipmi_workaround.get_system_logs(args.lines)
            print(json.dumps(logs, indent=2))
            
        elif args.action == 'services':
            services = ipmi_workaround.check_services_status()
            print("Service Status:")
            for service, status in services.items():
                status_icon = "✅" if status == "active" else "❌"
                print(f"  {service}: {status_icon} {status}")
        
        elif args.action == 'health-check':
            health_report = ipmi_workaround.run_health_check()
            
            # Print summary
            print(f"\n📊 Health Check Summary for Device #{ipmi_workaround.device_id}")
            print(f"{'='*50}")
            print(f"Overall Status: {health_report['overall_status'].upper()}")
            print(f"Connectivity: {health_report['connectivity']['status']}")
            print(f"Power Status: {health_report['power_status']['status']}")
            
            if 'issues' in health_report and health_report['issues']:
                print(f"\n⚠️  Issues Found:")
                for issue in health_report['issues']:
                    print(f"  • {issue}")
            
            if health_report['recommendations']:
                print(f"\n💡 Recommendations:")
                for rec in health_report['recommendations']:
                    print(f"  • {rec}")
            
            # Save report
            if args.output:
                ipmi_workaround.save_health_report(health_report, args.output)
            else:
                ipmi_workaround.save_health_report(health_report)
            
            # Set exit code based on status
            if health_report['overall_status'] in ['critical', 'error', 'unreachable']:
                sys.exit(1)
            elif health_report['overall_status'] == 'warning':
                sys.exit(2)
        
    except Exception as e:
        logger.error(f"IPMI workaround failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
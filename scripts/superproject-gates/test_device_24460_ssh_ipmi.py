#!/usr/bin/env python3
"""
Device #24460 SSH-based IPMI Access Workaround
Addresses IPMI connectivity issues for device health monitoring

**Date:** 2025-10-16
**Correlation ID:** consciousness-1758658960
**Device:** 24460 (hv2b40b82)
**Network:** stx-aio-0.corp.interface.tag.ooo (23.92.79.2)
"""

import subprocess
import socket
import json
import datetime
import argparse
import sys
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

@dataclass
class IPMIResult:
    """IPMI command result with status and data"""
    success: bool
    command: str
    output: str
    error: str = ""
    timestamp: str = ""
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.datetime.now().isoformat()

class Device24460Monitor:
    """SSH-based IPMI monitoring for device #24460"""
    
    def __init__(self, host: str = "23.92.79.2", pem_file: str = None):
        self.host = host
        self.device_id = "24460"
        self.device_name = "hv2b40b82"
        self.correlation_id = "consciousness-1758658960"
        
        # SSH configuration
        self.pem_file = pem_file or "/Users/shahroozbhopti/pem/rooz.pem"
        self.ssh_user = "root"
        self.ssh_options = [
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=/dev/null",
            "-o", "ConnectTimeout=10",
            "-o", "ServerAliveInterval=60",
            "-o", "ServerAliveCountMax=3"
        ]
        
        # Health thresholds
        self.thresholds = {
            'cpu_temp_critical': 85,  # Celsius
            'cpu_temp_warning': 75,
            'fan_speed_min': 1000,    # RPM
            'power_watts_max': 500,   # Watts
            'voltage_tolerance': 0.1  # 10% tolerance
        }
    
    def test_connectivity(self) -> Dict:
        """Test basic connectivity to device #24460"""
        
        results = {
            'timestamp': datetime.datetime.now().isoformat(),
            'device_id': self.device_id,
            'host': self.host,
            'tests': {}
        }
        
        # Test 1: ICMP ping
        ping_result = self._test_ping()
        results['tests']['ping'] = ping_result
        
        # Test 2: SSH connectivity
        ssh_result = self._test_ssh_connection()
        results['tests']['ssh'] = ssh_result
        
        # Test 3: IPMI availability via SSH
        if ssh_result['success']:
            ipmi_result = self._test_ipmi_availability()
            results['tests']['ipmi'] = ipmi_result
        else:
            results['tests']['ipmi'] = {
                'success': False,
                'message': 'SSH connection required for IPMI access',
                'skipped': True
            }
        
        # Overall connectivity status
        results['overall_status'] = (
            ping_result['success'] and 
            ssh_result['success'] and 
            results['tests']['ipmi']['success']
        )
        
        return results
    
    def _test_ping(self) -> Dict:
        """Test ICMP ping connectivity"""
        
        try:
            result = subprocess.run(
                ["ping", "-c", "3", "-W", "3000", self.host],
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0:
                # Parse ping statistics
                lines = result.stdout.split('\n')
                stats_line = [l for l in lines if 'packets transmitted' in l]
                
                return {
                    'success': True,
                    'message': 'ICMP ping successful',
                    'details': stats_line[0] if stats_line else 'Ping successful',
                    'latency': self._extract_ping_latency(result.stdout)
                }
            else:
                return {
                    'success': False,
                    'message': 'ICMP ping failed',
                    'error': result.stderr
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': 'Ping test failed',
                'error': str(e)
            }
    
    def _extract_ping_latency(self, ping_output: str) -> Optional[float]:
        """Extract average latency from ping output"""
        
        try:
            lines = ping_output.split('\n')
            stats_line = [l for l in lines if 'min/avg/max' in l]
            
            if stats_line:
                # Format: min/avg/max/mdev = 1.234/2.345/3.456/0.789 ms
                parts = stats_line[0].split('=')[1].strip()
                avg_latency = float(parts.split('/')[1])
                return avg_latency
                
        except (IndexError, ValueError):
            pass
            
        return None
    
    def _test_ssh_connection(self) -> Dict:
        """Test SSH connectivity and authentication"""
        
        ssh_cmd = [
            "ssh", "-i", self.pem_file,
            *self.ssh_options,
            f"{self.ssh_user}@{self.host}",
            "echo 'SSH connection successful'"
        ]
        
        try:
            result = subprocess.run(
                ssh_cmd, capture_output=True, text=True, timeout=15
            )
            
            if result.returncode == 0 and 'SSH connection successful' in result.stdout:
                return {
                    'success': True,
                    'message': 'SSH connection and authentication successful',
                    'pem_file': self.pem_file
                }
            else:
                return {
                    'success': False,
                    'message': 'SSH connection or authentication failed',
                    'error': result.stderr,
                    'pem_file': self.pem_file
                }
                
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'message': 'SSH connection timeout',
                'error': 'Connection timed out after 15 seconds'
            }
        except Exception as e:
            return {
                'success': False,
                'message': 'SSH test failed',
                'error': str(e)
            }
    
    def _test_ipmi_availability(self) -> Dict:
        """Test IPMI tool availability via SSH"""
        
        ssh_cmd = [
            "ssh", "-i", self.pem_file,
            *self.ssh_options,
            f"{self.ssh_user}@{self.host}",
            "which ipmitool && ipmitool mc info"
        ]
        
        try:
            result = subprocess.run(
                ssh_cmd, capture_output=True, text=True, timeout=20
            )
            
            if result.returncode == 0 and 'Device ID' in result.stdout:
                return {
                    'success': True,
                    'message': 'IPMI tool available and responsive',
                    'details': result.stdout.strip()
                }
            else:
                return {
                    'success': False,
                    'message': 'IPMI tool not available or unresponsive',
                    'error': result.stderr,
                    'output': result.stdout
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': 'IPMI availability test failed',
                'error': str(e)
            }
    
    def get_device_health(self) -> Dict:
        """Get comprehensive device health via SSH-IPMI"""
        
        health_data = {
            'timestamp': datetime.datetime.now().isoformat(),
            'device_id': self.device_id,
            'host': self.host,
            'correlation_id': self.correlation_id,
            'health_score': 0,
            'status': 'unknown',
            'sensors': {},
            'alerts': [],
            'recommendations': []
        }
        
        # Get sensor readings
        sensor_commands = {
            'temperature': 'ipmitool sdr type temperature',
            'fan': 'ipmitool sdr type fan',
            'voltage': 'ipmitool sdr type voltage',
            'power': 'ipmitool dcmi power reading'
        }
        
        sensor_results = {}
        
        for sensor_type, command in sensor_commands.items():
            result = self._execute_ssh_command(command)
            sensor_results[sensor_type] = result
            
            if result.success:
                parsed_data = self._parse_sensor_data(sensor_type, result.output)
                health_data['sensors'][sensor_type] = parsed_data
            else:
                health_data['alerts'].append({
                    'severity': 'warning',
                    'message': f'Failed to read {sensor_type} sensors',
                    'details': result.error
                })
        
        # Calculate health score and status
        health_score = self._calculate_health_score(health_data['sensors'], health_data['alerts'])
        health_data['health_score'] = health_score
        health_data['status'] = self._determine_health_status(health_score)
        
        # Add recommendations
        health_data['recommendations'] = self._generate_recommendations(health_data)
        
        return health_data
    
    def _execute_ssh_command(self, command: str) -> IPMIResult:
        """Execute IPMI command via SSH"""
        
        ssh_cmd = [
            "ssh", "-i", self.pem_file,
            *self.ssh_options,
            f"{self.ssh_user}@{self.host}",
            command
        ]
        
        try:
            result = subprocess.run(
                ssh_cmd, capture_output=True, text=True, timeout=30
            )
            
            return IPMIResult(
                success=result.returncode == 0,
                command=command,
                output=result.stdout,
                error=result.stderr
            )
            
        except Exception as e:
            return IPMIResult(
                success=False,
                command=command,
                output="",
                error=str(e)
            )
    
    def _parse_sensor_data(self, sensor_type: str, raw_output: str) -> Dict:
        """Parse IPMI sensor output into structured data"""
        
        parsed_data = {
            'readings': [],
            'status': 'ok',
            'critical_count': 0,
            'warning_count': 0
        }
        
        if not raw_output:
            return parsed_data
        
        lines = raw_output.strip().split('\n')
        
        for line in lines:
            if '|' not in line:
                continue
                
            parts = [p.strip() for p in line.split('|')]
            
            if len(parts) >= 3:
                sensor_name = parts[0]
                value_str = parts[1]
                status = parts[2] if len(parts) > 2 else 'ok'
                
                # Extract numeric value
                numeric_value = self._extract_numeric_value(value_str)
                
                reading = {
                    'name': sensor_name,
                    'value': numeric_value,
                    'value_string': value_str,
                    'status': status.lower(),
                    'unit': self._extract_unit(value_str)
                }
                
                parsed_data['readings'].append(reading)
                
                # Count warnings and critical alerts
                if 'critical' in status.lower() or 'crit' in status.lower():
                    parsed_data['critical_count'] += 1
                elif 'warning' in status.lower() or 'warn' in status.lower():
                    parsed_data['warning_count'] += 1
        
        # Determine overall sensor status
        if parsed_data['critical_count'] > 0:
            parsed_data['status'] = 'critical'
        elif parsed_data['warning_count'] > 0:
            parsed_data['status'] = 'warning'
        
        return parsed_data
    
    def _extract_numeric_value(self, value_str: str) -> Optional[float]:
        """Extract numeric value from sensor reading"""
        
        try:
            # Remove common units and extract number
            clean_str = value_str.lower()
            for unit in ['degrees c', 'c', 'rpm', 'volts', 'v', 'watts', 'w', '%']:
                clean_str = clean_str.replace(unit, '')
            
            # Find first number (including decimal)
            import re
            match = re.search(r'-?\d+\.?\d*', clean_str)
            if match:
                return float(match.group())
                
        except (ValueError, AttributeError):
            pass
            
        return None
    
    def _extract_unit(self, value_str: str) -> str:
        """Extract unit from sensor reading"""
        
        value_lower = value_str.lower()
        
        if 'degrees c' in value_lower or ' c' in value_lower:
            return 'celsius'
        elif 'rpm' in value_lower:
            return 'rpm'
        elif 'volts' in value_lower or ' v' in value_lower:
            return 'volts'
        elif 'watts' in value_lower or ' w' in value_lower:
            return 'watts'
        elif '%' in value_lower:
            return 'percent'
        else:
            return 'unknown'
    
    def _calculate_health_score(self, sensors: Dict, alerts: List) -> int:
        """Calculate overall device health score (0-100)"""
        
        base_score = 100
        penalties = 0
        
        # Penalize based on sensor status
        for sensor_type, sensor_data in sensors.items():
            if sensor_data.get('critical_count', 0) > 0:
                penalties += 30  # Critical sensor issues
            elif sensor_data.get('warning_count', 0) > 0:
                penalties += 10  # Warning sensor issues
        
        # Penalize based on alerts
        for alert in alerts:
            if alert.get('severity') == 'critical':
                penalties += 20
            elif alert.get('severity') == 'warning':
                penalties += 5
        
        # Check specific thresholds
        if 'temperature' in sensors:
            for reading in sensors['temperature'].get('readings', []):
                temp_value = reading.get('value')
                if temp_value and temp_value > self.thresholds['cpu_temp_critical']:
                    penalties += 25
                elif temp_value and temp_value > self.thresholds['cpu_temp_warning']:
                    penalties += 10
        
        final_score = max(0, base_score - penalties)
        return final_score
    
    def _determine_health_status(self, health_score: int) -> str:
        """Determine health status from score"""
        
        if health_score >= 90:
            return 'excellent'
        elif health_score >= 80:
            return 'good'
        elif health_score >= 60:
            return 'fair'
        elif health_score >= 40:
            return 'poor'
        else:
            return 'critical'
    
    def _generate_recommendations(self, health_data: Dict) -> List[str]:
        """Generate actionable recommendations based on health data"""
        
        recommendations = []
        sensors = health_data.get('sensors', {})
        
        # Temperature recommendations
        if 'temperature' in sensors:
            for reading in sensors['temperature'].get('readings', []):
                temp_value = reading.get('value')
                if temp_value and temp_value > self.thresholds['cpu_temp_warning']:
                    recommendations.append(
                        f"Monitor {reading['name']} temperature ({temp_value}°C) - consider increasing cooling"
                    )
        
        # Fan recommendations  
        if 'fan' in sensors:
            for reading in sensors['fan'].get('readings', []):
                fan_value = reading.get('value')
                if fan_value and fan_value < self.thresholds['fan_speed_min']:
                    recommendations.append(
                        f"Check {reading['name']} - speed ({fan_value} RPM) below minimum threshold"
                    )
        
        # General recommendations based on health score
        health_score = health_data.get('health_score', 0)
        if health_score < 70:
            recommendations.append("Schedule maintenance window for device health investigation")
            recommendations.append("Review system logs for additional error details")
        
        return recommendations
    
    def emit_heartbeat(self, phase: str, status: str, metrics: Dict = None):
        """Emit monitoring heartbeat"""
        
        timestamp = datetime.datetime.now().isoformat().replace("+00:00", "Z")
        metrics_json = json.dumps(metrics or {}, separators=(',', ':'))
        
        heartbeat = f"{timestamp}|device_24460_monitor|{phase}|{status}|0|{self.correlation_id}|{metrics_json}"
        
        # Write to heartbeat log
        import os
        os.makedirs("logs", exist_ok=True)
        
        with open("logs/heartbeats.log", "a") as f:
            f.write(heartbeat + '\n')
            f.flush()

def main():
    parser = argparse.ArgumentParser(description="Device #24460 SSH-IPMI monitoring")
    parser.add_argument("--host", default="23.92.79.2", help="Device host IP")
    parser.add_argument("--pem-file", help="SSH PEM file path")
    parser.add_argument("--test-connectivity", action="store_true", help="Test connectivity only")
    parser.add_argument("--full-health", action="store_true", help="Full health assessment")
    parser.add_argument("--json-output", action="store_true", help="JSON output format")
    
    args = parser.parse_args()
    
    monitor = Device24460Monitor(args.host, args.pem_file)
    
    if args.test_connectivity:
        print("🔗 Testing Device #24460 Connectivity...")
        results = monitor.test_connectivity()
        
        if args.json_output:
            print(json.dumps(results, indent=2))
        else:
            print(f"   Host: {results['host']}")
            print(f"   Device ID: {results['device_id']}")
            print(f"   Overall Status: {'✅ PASS' if results['overall_status'] else '❌ FAIL'}")
            
            for test_name, test_result in results['tests'].items():
                status = '✅' if test_result['success'] else '❌'
                print(f"   {test_name.upper()}: {status} {test_result['message']}")
        
        # Emit heartbeat
        monitor.emit_heartbeat("connectivity_test", 
                             "success" if results['overall_status'] else "warning",
                             {"overall_status": results['overall_status']})
        
        return 0 if results['overall_status'] else 1
    
    elif args.full_health:
        print("🏥 Device #24460 Full Health Assessment...")
        health_data = monitor.get_device_health()
        
        if args.json_output:
            print(json.dumps(health_data, indent=2))
        else:
            print(f"   Device ID: {health_data['device_id']}")
            print(f"   Health Score: {health_data['health_score']}/100")
            print(f"   Status: {health_data['status'].upper()}")
            
            # Show sensor summary
            for sensor_type, sensor_data in health_data['sensors'].items():
                status_emoji = '🟢' if sensor_data['status'] == 'ok' else '🟡' if sensor_data['status'] == 'warning' else '🔴'
                print(f"   {sensor_type.upper()}: {status_emoji} {sensor_data['status']}")
            
            # Show alerts
            if health_data['alerts']:
                print("   ALERTS:")
                for alert in health_data['alerts']:
                    emoji = '🚨' if alert['severity'] == 'critical' else '⚠️'
                    print(f"     {emoji} {alert['message']}")
            
            # Show recommendations
            if health_data['recommendations']:
                print("   RECOMMENDATIONS:")
                for rec in health_data['recommendations']:
                    print(f"     💡 {rec}")
        
        # Emit heartbeat
        monitor.emit_heartbeat("health_assessment", 
                             health_data['status'],
                             {"health_score": health_data['health_score']})
        
        return 0 if health_data['health_score'] > 60 else 1
    
    else:
        # Default: quick connectivity test
        results = monitor.test_connectivity()
        overall_status = results['overall_status']
        
        print(f"Device #24460 Status: {'✅ ONLINE' if overall_status else '❌ OFFLINE'}")
        
        return 0 if overall_status else 1

if __name__ == "__main__":
    sys.exit(main())
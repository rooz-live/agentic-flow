#!/usr/bin/env python3
"""
Sensorimotor Worker - Offloads SSH/IPMI operations
Least-privilege agent for device management

Based on Moravec's Paradox: Sensorimotor tasks require enormous computational
resources compared to reasoning. Offload to specialized agent.

Usage:
    python3 scripts/sensorimotor_worker.py --device 24460 --action power_status
    python3 scripts/sensorimotor_worker.py --device 0 --action chassis_status
"""

import subprocess
import argparse
import json
import os
import sys
from datetime import datetime
from typing import Dict, Optional, Tuple

# Add project root to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from agentic.pattern_logger import PatternLogger


class SensorimotorWorker:
    """Specialized agent for SSH/IPMI operations with typed metric emission"""
    
    def __init__(self, ssh_config_path: Optional[str] = None, circle: str = 'orchestrator'):
        self.logger = PatternLogger(circle=circle)
        self.ssh_config_path = ssh_config_path or os.path.expanduser("~/.ssh/config")
        
    def execute_ipmi(self, device_id: str, command: str) -> Tuple[bool, Dict]:
        """
        Execute IPMI command via SSH
        
        Args:
            device_id: Device identifier (e.g., "24460" or "0")
            command: IPMI command (e.g., "power status", "chassis status")
        
        Returns:
            Tuple of (success, result_data)
        """
        start_time = datetime.now()
        
        # Map device IDs to SSH config aliases
        device_host_map = {
            '24460': 'device-24460',
            '0': 'stx-aio-0'
        }
        ssh_host = device_host_map.get(device_id, f"stx-aio-{device_id}")
        ssh_cmd = (
            f"ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 "
            f"{ssh_host} 'ipmitool {command}'"
        )
        
        try:
            result = subprocess.run(
                ssh_cmd, 
                shell=True, 
                capture_output=True, 
                text=True,
                timeout=30
            )
            
            duration_ms = (datetime.now() - start_time).total_seconds() * 1000
            success = result.returncode == 0
            
            # Parse output for typed metrics (don't log raw output)
            parsed_data = self._parse_ipmi_output(command, result.stdout)
            
            # Emit typed metric
            self.logger.log('ipmi_command', {
                'device_id': device_id,
                'command': command,
                'status': result.returncode,
                'success': success,
                'duration_ms': duration_ms,
                'parsed': parsed_data,
                'tags': ['sensorimotor', 'ipmi', 'ssh']
            }, gate='sensorimotor', behavioral_type='automation',
            economic={
                'cod': 5 if success else 20,  # Higher CoD on failure
                'wsjf_score': 100 if success else 0,
                'job_duration': duration_ms / 1000,
                'user_business_value': 50
            })
            
            return success, {
                'device_id': device_id,
                'command': command,
                'success': success,
                'duration_ms': duration_ms,
                'parsed': parsed_data,
                'error': result.stderr if not success else None
            }
            
        except subprocess.TimeoutExpired:
            duration_ms = 30000
            self.logger.log('ipmi_command', {
                'device_id': device_id,
                'command': command,
                'status': -1,
                'success': False,
                'duration_ms': duration_ms,
                'error': 'timeout',
                'action_completed': False,
                'tags': ['sensorimotor', 'ipmi', 'timeout']
            }, gate='sensorimotor', behavioral_type='automation',
            economic={'cod': 50, 'wsjf_score': 0, 'job_duration': 30, 'user_business_value': 0})
            
            return False, {
                'device_id': device_id,
                'command': command,
                'success': False,
                'error': 'Command timed out after 30s'
            }
            
        except Exception as e:
            self.logger.log('ipmi_command', {
                'device_id': device_id,
                'command': command,
                'success': False,
                'error': str(e),
                'action_completed': False,
                'tags': ['sensorimotor', 'ipmi', 'error']
            }, gate='sensorimotor', behavioral_type='automation',
            economic={'cod': 30, 'wsjf_score': 0, 'job_duration': 0, 'user_business_value': 0})
            
            return False, {
                'device_id': device_id,
                'command': command,
                'success': False,
                'error': str(e)
            }
    
    def _parse_ipmi_output(self, command: str, output: str) -> Dict:
        """Parse IPMI output into typed metrics"""
        parsed = {'raw_lines': len(output.split('\n')) if output else 0}
        
        if 'power' in command.lower():
            # Parse power status
            if 'on' in output.lower():
                parsed['power_state'] = 'on'
            elif 'off' in output.lower():
                parsed['power_state'] = 'off'
            else:
                parsed['power_state'] = 'unknown'
        
        elif 'chassis' in command.lower():
            # Parse chassis status
            parsed['chassis_info'] = {}
            for line in output.split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    parsed['chassis_info'][key.strip()] = value.strip()
        
        elif 'sensor' in command.lower():
            # Count sensors
            sensors = [line for line in output.split('\n') if '|' in line]
            parsed['sensor_count'] = len(sensors)
        
        return parsed
    
    def execute_ssh_command(self, device_id: str, command: str) -> Tuple[bool, Dict]:
        """
        Execute arbitrary SSH command (non-IPMI)
        
        Args:
            device_id: Device identifier
            command: Shell command to run
        
        Returns:
            Tuple of (success, result_data)
        """
        start_time = datetime.now()
        # Map device IDs to SSH config aliases
        device_host_map = {
            '24460': 'device-24460',
            '0': 'stx-aio-0'
        }
        ssh_host = device_host_map.get(device_id, f"stx-aio-{device_id}")
        ssh_cmd = (
            f"ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 "
            f"{ssh_host} '{command}'"
        )
        
        try:
            result = subprocess.run(
                ssh_cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            duration_ms = (datetime.now() - start_time).total_seconds() * 1000
            success = result.returncode == 0
            
            self.logger.log('ssh_command', {
                'device_id': device_id,
                'command': command[:100],  # Truncate long commands
                'success': success,
                'duration_ms': duration_ms,
                'tags': ['sensorimotor', 'ssh']
            }, gate='sensorimotor', behavioral_type='automation',
            economic={
                'cod': 5 if success else 15,
                'wsjf_score': 80 if success else 0,
                'job_duration': duration_ms / 1000,
                'user_business_value': 40
            })
            
            return success, {
                'device_id': device_id,
                'command': command,
                'success': success,
                'duration_ms': duration_ms,
                'stdout_lines': len(result.stdout.split('\n')) if result.stdout else 0,
                'error': result.stderr if not success else None
            }
            
        except subprocess.TimeoutExpired:
            return False, {'error': 'Command timed out after 60s'}
        except Exception as e:
            return False, {'error': str(e)}


def main():
    parser = argparse.ArgumentParser(
        description='Sensorimotor Worker - Offload SSH/IPMI operations',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Check power status
  python3 scripts/sensorimotor_worker.py --device 24460 --action power_status
  
  # Get chassis status
  python3 scripts/sensorimotor_worker.py --device 0 --action chassis_status
  
  # List sensors
  python3 scripts/sensorimotor_worker.py --device 24460 --action sensor_list
  
  # Custom IPMI command
  python3 scripts/sensorimotor_worker.py --device 24460 --ipmi "mc info"
  
  # Custom SSH command
  python3 scripts/sensorimotor_worker.py --device 24460 --ssh "uptime"
        """
    )
    
    parser.add_argument('--device', required=True, help='Device ID (e.g., 24460, 0)')
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--action', choices=[
        'power_status', 'chassis_status', 'sensor_list', 'bmc_info', 'lan_print'
    ], help='Predefined IPMI action')
    group.add_argument('--ipmi', help='Custom IPMI command')
    group.add_argument('--ssh', help='Custom SSH command')
    
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    args = parser.parse_args()
    
    worker = SensorimotorWorker()
    
    # Map actions to IPMI commands
    action_map = {
        'power_status': 'power status',
        'chassis_status': 'chassis status',
        'sensor_list': 'sensor list',
        'bmc_info': 'mc info',
        'lan_print': 'lan print 1'
    }
    
    if args.action:
        ipmi_command = action_map[args.action]
        success, result = worker.execute_ipmi(args.device, ipmi_command)
    elif args.ipmi:
        success, result = worker.execute_ipmi(args.device, args.ipmi)
    elif args.ssh:
        success, result = worker.execute_ssh_command(args.device, args.ssh)
    
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        status_icon = "✅" if success else "❌"
        print(f"\n{status_icon} Sensorimotor Operation")
        print(f"{'='*50}")
        print(f"Device: {result['device_id']}")
        print(f"Command: {result.get('command', 'N/A')}")
        print(f"Success: {success}")
        
        if 'duration_ms' in result:
            print(f"Duration: {result['duration_ms']:.0f}ms")
        
        if 'parsed' in result:
            print(f"\nParsed Data:")
            for key, value in result['parsed'].items():
                print(f"  {key}: {value}")
        
        if result.get('error'):
            print(f"\nError: {result['error']}")
        
        print(f"{'='*50}\n")
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()

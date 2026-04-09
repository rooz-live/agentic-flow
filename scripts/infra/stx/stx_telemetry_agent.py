#!/usr/bin/env python3
"""
StarlingX STX-AIO Telemetry Agent

Bridges physical hardware constraints (ipmitool chassis status, etc.) from STX 12/13 systems
natively into the agentic-flow .goalie/stx_hardware_baseline.json ledger allowing the Swarm
to govern computational bounds dynamically (R-2026-020).

Usage:
    python3 stx_telemetry_agent.py [--host HOST] [--heartbeat]
"""

import argparse
import json
import logging
import os
import sys
import time
import subprocess
from datetime import datetime, timezone

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('stx_telemetry_agent')

class STXTelemetryAgent:
    def __init__(self, host: str = "23.92.79.2", heartbeat_monitoring: bool = True):
        self.host = host
        self.heartbeat_monitoring = heartbeat_monitoring
        
        # SSH configuration
        self.ssh_port = 2222
        self.ssh_user = os.getenv('YOLIFE_STX_USER', 'root')
        self.ssh_key_path = os.getenv('YOLIFE_STX_KEY', os.path.expanduser('~/.ssh/starlingx_key'))
        
        # Fallback key (as proven in earlier environments)
        if not os.path.exists(self.ssh_key_path):
            alt_key = os.path.expanduser('~/pem/stx-aio-0.pem')
            if os.path.exists(alt_key):
                self.ssh_key_path = alt_key

        self.telemetry_ledger = {
            'host': self.host,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'telemetry': {},
            'infrastructure_health': 0.0,
            'heartbeat_verified': False
        }

    def run_ssh_command(self, command: str, timeout: int = 30):
        start_time = time.time()
        try:
            ssh_cmd = [
                'ssh',
                '-i', self.ssh_key_path,
                '-p', str(self.ssh_port),
                '-o', 'StrictHostKeyChecking=no',
                '-o', 'UserKnownHostsFile=/dev/null',
                '-o', 'BatchMode=yes',
                '-o', 'ConnectTimeout=10',
                f'{self.ssh_user}@{self.host}',
                command
            ]
            
            result = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=timeout)
            latency_ms = (time.time() - start_time) * 1000
            
            if result.returncode == 0:
                return True, result.stdout.strip(), latency_ms
            else:
                return False, result.stderr.strip(), latency_ms

        except subprocess.TimeoutExpired:
            return False, f"SSH command timed out after {timeout}s", (time.time() - start_time) * 1000
        except Exception as e:
            return False, f"SSH command failed: {str(e)}", (time.time() - start_time) * 1000

    def collect_ipmi_chassis_status(self):
        logger.info("Collecting IPMI chassis status...")
        success, output, latency = self.run_ssh_command('ipmitool chassis status 2>/dev/null || echo "IPMI CLI Missing"')
        
        result = {'success': success, 'latency_ms': latency, 'data': {}}
        if success and "IPMI CLI Missing" not in output:
            for line in output.split('\n'):
                if ':' in line:
                    k, v = line.split(':', 1)
                    result['data'][k.strip()] = v.strip()
            self.telemetry_ledger['telemetry']['ipmitool_chassis'] = result
            return True
        else:
            self.telemetry_ledger['telemetry']['ipmitool_chassis'] = {'success': False, 'error': output}
            return False

    def collect_system_health(self):
        logger.info("Collecting standard system health metrics...")
        health_data = {}
        
        # Uptime
        succ, out, lat = self.run_ssh_command('uptime')
        health_data['uptime'] = out if succ else 'Failed'
        
        # Memory
        succ, out, lat = self.run_ssh_command('free -m | grep Mem')
        if succ:
            parts = out.split()
            if len(parts) >= 4:
                health_data['memory_total_mb'] = parts[1]
                health_data['memory_used_mb'] = parts[2]
                health_data['memory_free_mb'] = parts[3]
                
        # Disk Space
        succ, out, lat = self.run_ssh_command('df -h / | tail -1')
        if succ:
            parts = out.split()
            if len(parts) >= 5:
                health_data['disk_size'] = parts[1]
                health_data['disk_used'] = parts[2]
                health_data['disk_avail'] = parts[3]
                health_data['disk_percent'] = parts[4]
                
        self.telemetry_ledger['telemetry']['system_health'] = health_data
        return True

    def calculate_health_score(self):
        score = 0
        if self.telemetry_ledger['telemetry'].get('ipmitool_chassis', {}).get('success'):
            score += 50
        
        sys_health = self.telemetry_ledger['telemetry'].get('system_health', {})
        if 'uptime' in sys_health and sys_health['uptime'] != 'Failed':
            score += 50
            
        self.telemetry_ledger['infrastructure_health'] = score
        self.telemetry_ledger['heartbeat_verified'] = score == 100
        return score

    def save_baseline(self):
        output_path = os.path.join('.goalie', 'stx_hardware_baseline.json')
        os.makedirs('.goalie', exist_ok=True)
        try:
            with open(output_path, 'w') as f:
                json.dump(self.telemetry_ledger, f, indent=2)
            logger.info(f"Successfully wrote STX Telemetry Baseline to {output_path}")
        except Exception as e:
            logger.error(f"Failed to write baseline: {e}")

    def execute(self):
        logger.info(f"Starting STX-AIO Telemetry Integration against {self.host}...")
        
        # Check basic SSH
        succ, out, lat = self.run_ssh_command('echo "Connection verified"')
        if not succ:
            logger.warning(f"Failed basic connectivity to STX-AIO: {out}")
            logger.warning("Will commit local empty telemetry payload mapping ROAM.")
            self.calculate_health_score()
            self.save_baseline()
            return

        self.collect_ipmi_chassis_status()
        self.collect_system_health()
        
        score = self.calculate_health_score()
        self.save_baseline()
        
        logger.info(f"STX-AIO Telemetry Execution Complete. Health Score: {score}/100")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='STX-AIO Telemetry Integration')
    parser.add_argument('--host', default='23.92.79.2', help='StarlingX Host IP')
    parser.add_argument('--heartbeat', action='store_true', help='Collect metrics natively')
    args = parser.parse_args()
    
    agent = STXTelemetryAgent(host=args.host, heartbeat_monitoring=args.heartbeat)
    agent.execute()

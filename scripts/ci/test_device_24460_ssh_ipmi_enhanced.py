#!/usr/bin/env python3
"""
Enhanced Device #24460 IPMI Test via SSH

SSH-based workaround for IPMI connectivity issues with:
- Neural debugging capabilities
- Unified heartbeat monitoring integration
- Real-time diagnostic reporting
- CLAUDE ecosystem telemetry

Usage:
    python3 test_device_24460_ssh_ipmi_enhanced.py [--host HOST] [--neural] [--heartbeat]
"""

import argparse
import json
import logging
import os
import sys
import time
import subprocess
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import socket
import requests

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('device_24460_test')

class EnhancedDeviceIPMITester:
    """Enhanced IPMI testing via SSH with CLAUDE ecosystem integration"""

    def __init__(self, host: str = "23.92.79.2", neural_debugging: bool = False,
                 heartbeat_monitoring: bool = True):
        self.host = host
        self.neural_debugging = neural_debugging
        self.heartbeat_monitoring = heartbeat_monitoring
        self.device_id = "24460"

        # SSH configuration
        self.ssh_port = 2222  # Updated from 22 - device uses non-standard port
        self.ssh_user = os.getenv('SSH_USER', 'root')
        self.ssh_key_path = os.getenv('SSH_KEY_PATH', '/Users/shahroozbhopti/Documents/code/pem/device_24460.pem')

        # IPMI configuration
        self.ipmi_user = os.getenv('IPMI_USER', 'admin')
        self.ipmi_password = os.getenv('IPMI_PASSWORD', '')

        # Test results storage
        self.test_results = {
            'device_id': self.device_id,
            'host': self.host,
            'test_timestamp': datetime.now(timezone.utc).isoformat(),
            'tests': {},
            'overall_health_score': 0.0,
            'neural_analysis': {},
            'heartbeat_status': {}
        }

        # Neural debugging state
        self.neural_state = {
            'patterns_detected': [],
            'anomaly_scores': [],
            'diagnostic_insights': []
        }

    def emit_heartbeat(self, component: str, status: str, metadata: Dict = None):
        """Emit heartbeat to unified monitoring system"""
        if not self.heartbeat_monitoring:
            return

        heartbeat_data = {
            'component': component,
            'status': status,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'device_id': self.device_id,
            'metadata': metadata or {}
        }

        try:
            response = requests.post(
                'http://localhost:9090/heartbeat',
                json=heartbeat_data,
                timeout=5
            )
            if response.status_code == 200:
                logger.debug(f"Heartbeat emitted for {component}: {status}")
            else:
                logger.warning(f"Failed to emit heartbeat: {response.status_code}")
        except Exception as e:
            logger.debug(f"Heartbeat emission failed (monitoring may be offline): {e}")

    def neural_debug_analysis(self, test_name: str, result: Dict, latency_ms: float):
        """Apply neural debugging analysis to test results"""
        if not self.neural_debugging:
            return

        try:
            patterns = []

            if latency_ms > 1000:
                patterns.append('high_latency_detected')
            elif latency_ms > 200:
                patterns.append('moderate_latency_detected')
            else:
                patterns.append('optimal_latency')

            if not result.get('passed', False):
                patterns.append('connection_failure')
                if 'timeout' in result.get('message', '').lower():
                    patterns.append('timeout_pattern')
                elif 'refused' in result.get('message', '').lower():
                    patterns.append('connection_refused_pattern')
                elif 'auth' in result.get('message', '').lower():
                    patterns.append('authentication_failure_pattern')

            anomaly_score = 0.0
            if not result.get('passed', False):
                anomaly_score += 0.5
            if latency_ms > 500:
                anomaly_score += 0.3

            self.neural_state['patterns_detected'].extend(patterns)
            self.neural_state['anomaly_scores'].append({
                'test': test_name,
                'score': anomaly_score,
                'latency': latency_ms
            })

            if anomaly_score > 0.5:
                insight = f"High anomaly detected in {test_name}: investigate {patterns}"
                self.neural_state['diagnostic_insights'].append(insight)
                logger.warning(f"Neural analysis: {insight}")

        except Exception as e:
            logger.error(f"Neural debugging analysis failed: {e}")

    def run_ssh_command(self, command: str, timeout: int = 30) -> Tuple[bool, str, float]:
        """Execute command via SSH and measure latency"""
        start_time = time.time()

        try:
            ssh_cmd = [
                'ssh',
                '-i', self.ssh_key_path,
                '-o', 'StrictHostKeyChecking=no',
                '-o', 'ConnectTimeout=30',
                '-o', f'ServerAliveInterval=60',
                '-o', f'ServerAliveCountMax=3',
                f'{self.ssh_user}@{self.host}',
                command
            ]

            logger.debug(f"Executing SSH command: {' '.join(ssh_cmd[:-1])} [command]")

            result = subprocess.run(
                ssh_cmd,
                capture_output=True,
                text=True,
                timeout=timeout
            )

            latency_ms = (time.time() - start_time) * 1000

            if result.returncode == 0:
                return True, result.stdout.strip(), latency_ms
            else:
                return False, result.stderr.strip(), latency_ms

        except subprocess.TimeoutExpired:
            latency_ms = (time.time() - start_time) * 1000
            return False, f"SSH command timed out after {timeout}s", latency_ms
        except FileNotFoundError:
            return False, f"SSH key not found at {self.ssh_key_path}", 0.0
        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            return False, f"SSH command failed: {str(e)}", latency_ms

    def test_ssh_connectivity(self) -> Dict:
        """Test SSH connectivity to device"""
        self.emit_heartbeat('ssh_test', 'starting')

        logger.info("Testing SSH connectivity...")
        success, output, latency_ms = self.run_ssh_command('echo "SSH connection successful"')

        result = {
            'passed': success,
            'message': output if success else f"SSH failed: {output}",
            'latency_ms': latency_ms
        }

        self.neural_debug_analysis('ssh_connectivity', result, latency_ms)
        self.emit_heartbeat('ssh_test', 'completed' if success else 'failed',
                           {'latency_ms': latency_ms})

        return result

    def test_ipmi_via_ipmitool(self) -> Dict:
        """Test IPMI functionality via ipmitool over SSH"""
        self.emit_heartbeat('ipmi_test', 'starting')

        logger.info("Testing IPMI via ipmitool...")

        if not self.ipmi_password:
            result = {
                'passed': False,
                'message': 'IPMI credentials not configured (set IPMI_USER and IPMI_PASSWORD)',
                'latency_ms': 0.0
            }
        else:
            command = f'ipmitool -I lanplus -H localhost -U {self.ipmi_user} -P {self.ipmi_password} power status'
            success, output, latency_ms = self.run_ssh_command(command)

            result = {
                'passed': success,
                'message': output if success else f"IPMI failed: {output}",
                'latency_ms': latency_ms
            }

        self.neural_debug_analysis('ipmi_connectivity', result, result['latency_ms'])
        self.emit_heartbeat('ipmi_test', 'completed' if result['passed'] else 'failed',
                           {'has_credentials': bool(self.ipmi_password)})

        return result

    def test_system_health_via_ssh(self) -> Dict:
        """Test system health indicators via SSH"""
        self.emit_heartbeat('health_test', 'starting')

        logger.info("Testing system health via SSH...")

        health_checks = []

        success, output, latency_ms = self.run_ssh_command('uptime')
        health_checks.append({
            'check': 'uptime',
            'passed': success,
            'output': output,
            'latency_ms': latency_ms
        })

        success, output, latency_ms = self.run_ssh_command('free -m | grep Mem')
        health_checks.append({
            'check': 'memory',
            'passed': success,
            'output': output,
            'latency_ms': latency_ms
        })

        success, output, latency_ms = self.run_ssh_command('df -h | head -5')
        health_checks.append({
            'check': 'disk',
            'passed': success,
            'output': output,
            'latency_ms': latency_ms
        })

        passed_checks = sum(1 for check in health_checks if check['passed'])
        total_checks = len(health_checks)
        health_percentage = (passed_checks / total_checks) * 100

        avg_latency = sum(check['latency_ms'] for check in health_checks) / total_checks

        result = {
            'passed': health_percentage > 50,
            'message': f"System health: {health_percentage:.1f}% ({passed_checks}/{total_checks} checks passed)",
            'latency_ms': avg_latency,
            'health_percentage': health_percentage,
            'individual_checks': health_checks
        }

        self.neural_debug_analysis('system_health', result, avg_latency)
        self.emit_heartbeat('health_test', 'completed', {
            'health_percentage': health_percentage,
            'passed_checks': passed_checks,
            'total_checks': total_checks
        })

        return result

    def test_network_performance(self) -> Dict:
        """Test network performance characteristics"""
        self.emit_heartbeat('network_test', 'starting')

        logger.info("Testing network performance...")

        try:
            ping_result = subprocess.run(
                ['ping', '-c', '3', self.host],
                capture_output=True,
                text=True,
                timeout=10
            )

            if ping_result.returncode == 0:
                output_lines = ping_result.stdout.split('\n')
                for line in output_lines:
                    if 'avg' in line:
                        parts = line.split('/')
                        if len(parts) >= 4:
                            avg_ping = float(parts[4])
                            result = {
                                'passed': True,
                                'message': f'Network reachable, avg ping: {avg_ping}ms',
                                'latency_ms': avg_ping
                            }
                            break
                else:
                    result = {
                        'passed': True,
                        'message': 'Network reachable',
                        'latency_ms': 0.0
                    }
            else:
                result = {
                    'passed': False,
                    'message': f'Ping failed: {ping_result.stderr}',
                    'latency_ms': 0.0
                }

        except Exception as e:
            result = {
                'passed': False,
                'message': f'Network test failed: {str(e)}',
                'latency_ms': 0.0
            }

        self.neural_debug_analysis('network_performance', result, result['latency_ms'])
        self.emit_heartbeat('network_test', 'completed' if result['passed'] else 'failed',
                           {'latency_ms': result['latency_ms']})

        return result

    def test_starlingx_integration(self) -> Dict:
        """Test StarlingX integration and compatibility"""
        self.emit_heartbeat('starlingx_test', 'starting')

        logger.info("Testing StarlingX integration...")

        try:
            # Check if StarlingX services are running
            success, output, latency_ms = self.run_ssh_command('systemctl is-active --quiet stx-platform && echo "StarlingX active" || echo "StarlingX not active"')

            if success and 'StarlingX active' in output:
                # Check StarlingX version
                success, version_output, version_latency = self.run_ssh_command('stx version 2>/dev/null || echo "Version check failed"')
                version_info = version_output if success else "Unknown version"

                result = {
                    'passed': True,
                    'message': f'StarlingX integration verified - {version_info}',
                    'latency_ms': latency_ms,
                    'version_info': version_info
                }
            else:
                result = {
                    'passed': False,
                    'message': 'StarlingX services not running or accessible',
                    'latency_ms': latency_ms
                }

        except Exception as e:
            result = {
                'passed': False,
                'message': f'StarlingX integration test failed: {str(e)}',
                'latency_ms': 0.0
            }

        self.neural_debug_analysis('starlingx_integration', result, result['latency_ms'])
        self.emit_heartbeat('starlingx_test', 'completed' if result['passed'] else 'failed')

        return result

    def calculate_overall_health_score(self) -> float:
        """Calculate overall device health score from test results"""
        if not self.test_results['tests']:
            return 0.0

        total_weight = 0.0
        weighted_score = 0.0

        test_weights = {
            'ssh_connectivity': 0.4,
            'network_performance': 0.3,
            'system_health': 0.2,
            'ipmi_connectivity': 0.1,
            'starlingx_integration': 0.2
        }

        for test_name, test_result in self.test_results['tests'].items():
            weight = test_weights.get(test_name, 0.1)
            score = 100.0 if test_result.get('passed', False) else 0.0

            weighted_score += score * weight
            total_weight += weight

        return weighted_score / total_weight if total_weight > 0 else 0.0

    def generate_diagnostic_report(self) -> Dict:
        """Generate comprehensive diagnostic report"""
        health_score = self.calculate_overall_health_score()

        passed_tests = sum(1 for result in self.test_results['tests'].values()
                          if result.get('passed', False))
        total_tests = len(self.test_results['tests'])

        remediations = []
        for test_name, test_result in self.test_results['tests'].items():
            if not test_result.get('passed', False):
                if test_name == 'ssh_connectivity':
                    remediations.append(f"Fix SSH connectivity: {test_result.get('message', 'Unknown error')}")
                elif test_name == 'ipmi_connectivity':
                    remediations.append("Configure IPMI_USER and IPMI_PASSWORD environment variables")
                elif test_name == 'network_performance':
                    remediations.append(f"Investigate network issues: {test_result.get('message', 'Unknown error')}")
                elif test_name == 'system_health':
                    remediations.append("Investigate system health issues via SSH")
                elif test_name == 'starlingx_integration':
                    remediations.append("Ensure StarlingX services are running and accessible")

        self.test_results.update({
            'health_score': health_score,
            'passed': passed_tests,
            'total': total_tests,
            'test_completion_timestamp': datetime.now(timezone.utc).isoformat(),
            'remediations': remediations,
            'neural_analysis': self.neural_state if self.neural_debugging else {},
            'claude_ecosystem_integration': {
                'neural_debugging_enabled': self.neural_debugging,
                'heartbeat_monitoring_enabled': self.heartbeat_monitoring,
                'correlation_id': 'consciousness-1758658960'
            }
        })

        return self.test_results

    def get_heartbeat_status(self) -> Dict:
        """Get unified heartbeat monitoring status"""
        if not self.heartbeat_monitoring:
            return {'status': 'disabled'}

        try:
            response = requests.get('http://localhost:9090/health/unified-heartbeat', timeout=5)
            if response.status_code == 200:
                return response.json()
            else:
                return {'status': 'unreachable', 'code': response.status_code}
        except Exception as e:
            return {'status': 'offline', 'error': str(e)}

    def run_comprehensive_test(self) -> Dict:
        """Run comprehensive device test suite"""
        logger.info(f"Starting comprehensive test for device {self.device_id} at {self.host}")
        self.emit_heartbeat('device_test_suite', 'starting')

        test_functions = {
            'ssh_connectivity': self.test_ssh_connectivity,
            'network_performance': self.test_network_performance,
            'system_health': self.test_system_health_via_ssh,
            'ipmi_connectivity': self.test_ipmi_via_ipmitool,
            'starlingx_integration': self.test_starlingx_integration
        }

        for test_name, test_function in test_functions.items():
            try:
                logger.info(f"Running {test_name} test...")
                self.test_results['tests'][test_name] = test_function()

                if self.neural_debugging and test_name in self.test_results['tests']:
                    self.neural_debug_analysis(
                        test_name,
                        self.test_results['tests'][test_name],
                        self.test_results['tests'][test_name].get('latency_ms', 0.0)
                    )

            except Exception as e:
                logger.error(f"Test {test_name} failed with exception: {e}")
                self.test_results['tests'][test_name] = {
                    'passed': False,
                    'message': f'Test exception: {str(e)}',
                    'latency_ms': 0.0
                }

        report = self.generate_diagnostic_report()

        self.emit_heartbeat('device_test_suite', 'completed', {
            'health_score': report['health_score'],
            'passed_tests': report['passed'],
            'total_tests': report['total']
        })

        logger.info(f"Device test completed. Health score: {report['health_score']:.1f}%")

        return report

    def save_results(self, filename: str = None):
        """Save test results to JSON file"""
        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f".device_{self.device_id}_ssh_ipmi_result_{timestamp}.json"

        try:
            with open(filename, 'w') as f:
                json.dump(self.test_results, f, indent=2)
            logger.info(f"Results saved to {filename}")
        except Exception as e:
            logger.error(f"Failed to save results: {e}")

def main():
    parser = argparse.ArgumentParser(description='Enhanced Device #24460 IPMI Test via SSH')
    parser.add_argument('--host', default='23.92.79.2',
                        help='Device hostname or IP address')
    parser.add_argument('--neural', action='store_true',
                        help='Enable neural debugging analysis')
    parser.add_argument('--heartbeat', action='store_true', default=True,
                        help='Enable unified heartbeat monitoring (default: enabled)')
    parser.add_argument('--output', '-o',
                        help='Output file for results (default: auto-generated)')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Enable verbose logging')

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    tester = EnhancedDeviceIPMITester(
        host=args.host,
        neural_debugging=args.neural,
        heartbeat_monitoring=args.heartbeat
    )

    try:
        results = tester.run_comprehensive_test()

        tester.save_results(args.output)

        print(f"\n🔍 Device #{tester.device_id} Test Results")
        print("=" * 40)
        print(f"📊 Health Score: {results['health_score']:.1f}%")
        print(f"✅ Passed: {results['passed']}/{results['total']} tests")
        print(f"🤖 Neural Debug: {'Enabled' if args.neural else 'Disabled'}")
        print(f"💓 Heartbeat: {'Enabled' if args.heartbeat else 'Disabled'}")

        failed_tests = [name for name, result in results['tests'].items()
                       if not result.get('passed', False)]
        if failed_tests:
            print(f"\n❌ Failed Tests: {', '.join(failed_tests)}")

        if results.get('remediations'):
            print(f"\n🔧 Remediations Needed:")
            for i, remediation in enumerate(results['remediations'], 1):
                print(f"   {i}. {remediation}")

        if args.neural and results.get('neural_analysis', {}).get('diagnostic_insights'):
            print(f"\n🧠 Neural Insights:")
            for insight in results['neural_analysis']['diagnostic_insights']:
                print(f"   • {insight}")

        return 0 if results['health_score'] > 66.0 else 1

    except KeyboardInterrupt:
        logger.info("Test interrupted by user")
        return 130
    except Exception as e:
        logger.error(f"Test failed with unexpected error: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main())
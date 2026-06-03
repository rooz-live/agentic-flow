#!/usr/bin/env python3
"""
Device #24460 SSH-based IPMI Access Script
==========================================

Provides SSH-based IPMI access for device #24460 (hv2b40b82) as a workaround
for DNS resolution failures. Integrates with unified heartbeat monitoring
and provides comprehensive device state tracking.

Device Details:
- Device ID: 24460
- Hostname: hv2b40b82
- IP Address: 23.92.79.2
- IPMI Issue: DNS resolution failure for hv2b40b82.ipmi
- Workaround: SSH tunnel through main host
"""

import subprocess
import json
import time
import logging
import argparse
import os
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path
import socket
import threading

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s|device_24460_ipmi|%(levelname)s|%(message)s',
    datefmt='%Y-%m-%dT%H:%M:%SZ'
)
logger = logging.getLogger(__name__)

class Device24460IPMIClient:
    """SSH-based IPMI client for device #24460"""
    
    def __init__(self):
        self.device_id = "24460"
        self.hostname = "hv2b40b82"
        self.ip_address = "23.92.79.2"
        self.ssh_key_path = "/Users/shahroozbhopti/pem/rooz.pem"
        self.ssh_user = "root"
        self.ipmi_port = 623
        self.tunnel_local_port = 8623
        self.tunnel_process = None
        
    def check_ssh_connectivity(self) -> bool:
        """Test SSH connectivity to device"""
        try:
            cmd = [
                "ssh", "-i", self.ssh_key_path,
                "-o", "ConnectTimeout=10",
                "-o", "ServerAliveInterval=60",
                "-o", "ServerAliveCountMax=3",
                "-o", "StrictHostKeyChecking=no",
                f"{self.ssh_user}@{self.ip_address}",
                "echo 'SSH_CONNECTION_OK'"
            ]
            
            result = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True, 
                timeout=15
            )
            
            if result.returncode == 0 and "SSH_CONNECTION_OK" in result.stdout:
                logger.info(f"SSH connectivity to {self.ip_address} verified")
                return True
            else:
                logger.error(f"SSH connectivity failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("SSH connection timeout")
            return False
        except Exception as e:
            logger.error(f"SSH connectivity check failed: {e}")
            return False
    
    def execute_ipmi_command(self, command: str) -> Dict[str, Any]:
        """Execute IPMI command via SSH"""
        start_time = time.time()
        
        try:
            # Execute ipmitool on the remote host directly via SSH
            ssh_cmd = [
                "ssh", "-i", self.ssh_key_path,
                "-o", "ConnectTimeout=10",
                "-o", "StrictHostKeyChecking=no",
                f"{self.ssh_user}@{self.ip_address}",
                f"ipmitool {command}"
            ]
            
            result = subprocess.run(
                ssh_cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            execution_time = (time.time() - start_time) * 1000
            
            response = {
                "device_id": self.device_id,
                "command": command,
                "method": "ssh_tunnel_workaround",
                "success": result.returncode == 0,
                "output": result.stdout.strip(),
                "error": result.stderr.strip() if result.stderr else None,
                "execution_time_ms": round(execution_time, 2),
                "timestamp": datetime.now().isoformat(),
                "workaround_active": True
            }
            
            if response["success"]:
                logger.info(f"IPMI command '{command}' executed successfully via SSH workaround")
            else:
                logger.error(f"IPMI command failed: {response['error']}")
            
            return response
            
        except Exception as e:
            return {
                "device_id": self.device_id,
                "command": command,
                "method": "ssh_tunnel_workaround",
                "success": False,
                "output": None,
                "error": str(e),
                "execution_time_ms": (time.time() - start_time) * 1000,
                "timestamp": datetime.now().isoformat(),
                "workaround_active": True
            }
    
    def get_chassis_status(self) -> Dict[str, Any]:
        """Get chassis power status"""
        return self.execute_ipmi_command("chassis status")
    
    def comprehensive_health_check(self) -> Dict[str, Any]:
        """Perform comprehensive device health check"""
        logger.info("Starting comprehensive health check for device #24460")
        
        health_report = {
            "device_id": self.device_id,
            "hostname": self.hostname,
            "ip_address": self.ip_address,
            "timestamp": datetime.now().isoformat(),
            "ssh_connectivity": False,
            "ipmi_accessibility": False,
            "chassis_status": None,
            "overall_status": "UNKNOWN",
            "issues": [],
            "recommendations": [],
            "workaround_status": "ACTIVE_SSH_TUNNEL"
        }
        
        # Test SSH connectivity
        health_report["ssh_connectivity"] = self.check_ssh_connectivity()
        if not health_report["ssh_connectivity"]:
            health_report["issues"].append("SSH connectivity failed")
            health_report["recommendations"].append("Check network connectivity and SSH keys")
        
        # Test IPMI accessibility via workaround
        chassis_result = self.get_chassis_status()
        health_report["chassis_status"] = chassis_result
        health_report["ipmi_accessibility"] = chassis_result["success"]
        
        if not health_report["ipmi_accessibility"]:
            health_report["issues"].append("IPMI access failed via SSH workaround")
            health_report["recommendations"].append("Check SSH access and ipmitool availability on remote host")
        
        # Determine overall status
        if health_report["ssh_connectivity"] and health_report["ipmi_accessibility"]:
            health_report["overall_status"] = "OPERATIONAL_SSH_TUNNEL"
        elif health_report["ssh_connectivity"]:
            health_report["overall_status"] = "LIMITED_SSH_ONLY"
        else:
            health_report["overall_status"] = "UNREACHABLE"
        
        # Emit heartbeat
        self._emit_heartbeat(health_report)
        
        return health_report
    
    def _emit_heartbeat(self, health_data: Dict[str, Any]):
        """Emit standardized heartbeat for monitoring integration"""
        timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        status = health_data["overall_status"]
        correlation_id = f"device-{self.device_id}-{int(time.time())}"
        
        # Emit heartbeat in standardized format
        heartbeat = f"{timestamp}|device_24460_ipmi|heartbeat|{status}|1|{correlation_id}|method=ssh_workaround,connectivity={health_data['ssh_connectivity']},ipmi={health_data['ipmi_accessibility']}"
        
        print(heartbeat)
        logger.info(heartbeat)

def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description="Device #24460 SSH-based IPMI Access")
    parser.add_argument("--command", help="IPMI command to execute")
    parser.add_argument("--health-check", action="store_true", help="Run comprehensive health check")
    parser.add_argument("--output", help="Output file for results")
    
    args = parser.parse_args()
    
    # Initialize IPMI client
    client = Device24460IPMIClient()
    
    try:
        if args.health_check or not args.command:
            # Run comprehensive health check
            result = client.comprehensive_health_check()
            
            if args.output:
                with open(args.output, 'w') as f:
                    json.dump(result, f, indent=2)
                logger.info(f"Health check results written to {args.output}")
            else:
                print(json.dumps(result, indent=2))
        
        elif args.command:
            # Execute specific IPMI command
            result = client.execute_ipmi_command(args.command)
            
            if args.output:
                with open(args.output, 'w') as f:
                    json.dump(result, f, indent=2)
            else:
                print(json.dumps(result, indent=2))
        
        # Exit with appropriate code
        if hasattr(client, 'last_status'):
            if client.last_status == "OPERATIONAL_SSH_TUNNEL":
                exit(0)
            else:
                exit(1)
        else:
            exit(0)
    
    except KeyboardInterrupt:
        logger.info("Operation interrupted by user")
        exit(1)
    except Exception as e:
        logger.error(f"Operation failed: {e}")
        exit(1)

if __name__ == "__main__":
    main()

import subprocess
import json
import argparse
import time
import logging
import os
import sys
import socket
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict
import asyncio
import aiofiles

@dataclass
class TestConfig:
    """Configuration for IPMI testing"""
    device_id: str = "24460"
    host: str = "23.92.79.2"
    ssh_key: str = "~/.ssh/starlingx_key"
    ssh_user: str = "root"
    ipmi_host: str = "hv2b40b82"
    ipmi_user: str = "admin"
    ipmi_password: str = "admin"
    connect_timeout: int = 10
    command_timeout: int = 15
    max_retries: int = 3
    retry_delay: float = 1.0
    dns_timeout: int = 5
    heartbeat_interval: int = 30

@dataclass
class TestResult:
    """Individual test result"""
    test_name: str
    timestamp: str
    status: str  # success, failed, timeout, error, not_available
    details: Dict[str, Any]
    error: Optional[str]
    duration: float

class EnhancedSSHIPMITester:
    """Enhanced IPMI tester with robust error handling and monitoring integration"""

    def __init__(self, config: TestConfig = None):
        self.config = config or TestConfig()
        self.ssh_key = str(Path(self.config.ssh_key).expanduser())
        self.setup_logging()

    def setup_logging(self) -> None:
        """Setup enhanced logging with file and console output"""
        log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        logging.basicConfig(
            level=logging.INFO,
            format=log_format,
            handlers=[
                logging.FileHandler(f'device_{self.config.device_id}_ipmi_test.log'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(f"Device{self.config.device_id}Tester")

    def resolve_hostname(self, hostname: str) -> Tuple[bool, Optional[str]]:
        """Resolve hostname with timeout and fallback handling"""
        try:
            self.logger.info(f"Resolving hostname: {hostname}")
            ip = socket.gethostbyname(hostname)
            self.logger.info(f"Resolved {hostname} -> {ip}")
            return True, ip
        except socket.gaierror as e:
            self.logger.warning(f"DNS resolution failed for {hostname}: {e}")
            return False, None
        except Exception as e:
            self.logger.error(f"Unexpected error resolving {hostname}: {e}")
            return False, None

    def check_ssh_key(self) -> bool:
        """Verify SSH key exists and is accessible"""
        if not Path(self.ssh_key).exists():
            self.logger.error(f"SSH key not found: {self.ssh_key}")
            return False

        try:
            Path(self.ssh_key).chmod(0o600)  # Ensure correct permissions
            self.logger.info(f"SSH key verified: {self.ssh_key}")
            return True
        except Exception as e:
            self.logger.error(f"SSH key permission error: {e}")
            return False

    def run_ssh_command(self, command: List[str], timeout: int = None) -> Tuple[bool, str, str]:
        """Run SSH command with enhanced error handling and timeout"""
        if timeout is None:
            timeout = self.config.command_timeout

        try:
            self.logger.debug(f"Running SSH command: {' '.join(command)}")
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False
            )

            stdout = result.stdout.strip()
            stderr = result.stderr.strip()

            if result.returncode == 0:
                self.logger.debug(f"Command succeeded: {stdout[:100]}")
                return True, stdout, stderr
            else:
                self.logger.warning(f"Command failed (exit {result.returncode}): {stderr}")
                return False, stdout, stderr

        except subprocess.TimeoutExpired:
            self.logger.error(f"Command timed out after {timeout}s")
            return False, "", f"Timeout after {timeout}s"
        except FileNotFoundError:
            self.logger.error(f"SSH command not found: {command[0]}")
            return False, "", f"Command not found: {command[0]}"
        except Exception as e:
            self.logger.error(f"Unexpected error running command: {e}")
            return False, "", str(e)

    def test_ssh_connectivity_with_retry(self) -> TestResult:
        """Test SSH connectivity with retry logic"""
        start_time = time.time()
        test_result = TestResult(
            test_name="ssh_connectivity",
            timestamp=datetime.utcnow().isoformat(),
            status="unknown",
            details={},
            error=None,
            duration=0.0
        )

        # Check SSH key first
        if not self.check_ssh_key():
            test_result.status = "failed"
            test_result.error = f"SSH key not accessible: {self.ssh_key}"
            test_result.duration = time.time() - start_time
            return test_result

        # Build SSH command for connectivity test
        cmd = [
            "ssh", "-i", self.ssh_key,
            "-o", f"ConnectTimeout={self.config.connect_timeout}",
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=/dev/null",
            "-o", "PasswordAuthentication=no",
            f"{self.config.ssh_user}@{self.config.host}",
            "hostname"
        ]

        for attempt in range(self.config.max_retries):
            if attempt > 0:
                self.logger.info(f"Retry attempt {attempt + 1}/{self.config.max_retries}")
                time.sleep(self.config.retry_delay * (2 ** attempt))  # Exponential backoff

            success, stdout, stderr = self.run_ssh_command(cmd, self.config.connect_timeout + 5)

            if success:
                test_result.status = "success"
                test_result.details = {
                    "hostname": stdout,
                    "response_time": f"< {self.config.connect_timeout + 5}s",
                    "attempts": attempt + 1
                }
                test_result.duration = time.time() - start_time
                return test_result

        # All attempts failed
        test_result.status = "failed"
        test_result.error = f"SSH connection failed after {self.config.max_retries} attempts. Last error: {stderr}"
        test_result.duration = time.time() - start_time
        return test_result

    def test_ipmi_tool_availability_with_retry(self) -> TestResult:
        """Test if ipmitool is available on the remote system with retry logic"""
        start_time = time.time()
        test_result = TestResult(
            test_name="ipmi_tool_availability",
            timestamp=datetime.utcnow().isoformat(),
            status="unknown",
            details={},
            error=None,
            duration=0.0
        )

        cmd = [
            "ssh", "-i", self.ssh_key,
            "-o", f"ConnectTimeout={self.config.connect_timeout}",
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=/dev/null",
            f"{self.config.ssh_user}@{self.config.host}",
            "which ipmitool"
        ]

        for attempt in range(self.config.max_retries):
            if attempt > 0:
                time.sleep(self.config.retry_delay * (2 ** attempt))

            success, stdout, stderr = self.run_ssh_command(cmd, self.config.connect_timeout + 5)

            if success and stdout.strip():
                # Try to get version info
                version_cmd = [
                    "ssh", "-i", self.ssh_key,
                    "-o", f"ConnectTimeout={self.config.connect_timeout}",
                    "-o", "StrictHostKeyChecking=no",
                    "-o", "UserKnownHostsFile=/dev/null",
                    f"{self.config.ssh_user}@{self.config.host}",
                    "ipmitool -V"
                ]

                version_success, version_stdout, _ = self.run_ssh_command(version_cmd, 10)

                test_result.status = "success"
                test_result.details = {
                    "ipmitool_path": stdout.strip(),
                    "version_available": version_success,
                    "attempts": attempt + 1
                }

                if version_success:
                    test_result.details["version"] = version_stdout.strip()

                test_result.duration = time.time() - start_time
                return test_result

        test_result.status = "not_available"
        test_result.error = f"ipmitool not found after {self.config.max_retries} attempts"
        test_result.duration = time.time() - start_time
        return test_result

    def test_ipmi_connectivity_with_retry(self) -> TestResult:
        """Test IPMI connectivity via SSH with retry logic"""
        start_time = time.time()
        test_result = TestResult(
            test_name="ipmi_connectivity",
            timestamp=datetime.utcnow().isoformat(),
            status="unknown",
            details={},
            error=None,
            duration=0.0
        )

        # First check if ipmitool is available
        availability_test = self.test_ipmi_tool_availability_with_retry()
        if availability_test.status != "success":
            test_result.status = "failed"
            test_result.error = "IPMI tool not available on remote system"
            test_result.duration = time.time() - start_time
            return test_result

        # Try different IPMI connection methods
        ipmi_commands = [
            f"ipmitool -I lanplus -H 127.0.0.1 -U {self.config.ipmi_user} -P {self.config.ipmi_password} chassis status",
            f"ipmitool -I lanplus -H {self.config.ipmi_host} -U {self.config.ipmi_user} -P {self.config.ipmi_password} chassis status",
        ]

        for ipmi_cmd in ipmi_commands:
            for attempt in range(self.config.max_retries):
                if attempt > 0:
                    time.sleep(self.config.retry_delay)

                cmd = [
                    "ssh", "-i", self.ssh_key,
                    "-o", f"ConnectTimeout={self.config.connect_timeout}",
                    "-o", "StrictHostKeyChecking=no",
                    "-o", "UserKnownHostsFile=/dev/null",
                    f"{self.config.ssh_user}@{self.config.host}",
                    ipmi_cmd
                ]

                success, stdout, stderr = self.run_ssh_command(cmd, self.config.command_timeout + 5)

                if success:
                    # Parse chassis status output
                    chassis_info = {}
                    for line in stdout.split('\n'):
                        if ':' in line:
                            key, value = line.split(':', 1)
                            chassis_info[key.strip()] = value.strip()

                    test_result.status = "success"
                    test_result.details = {
                        "connection_method": "localhost" if "127.0.0.1" in ipmi_cmd else "hostname",
                        "chassis_status": chassis_info,
                        "attempts": attempt + 1
                    }
                    test_result.duration = time.time() - start_time
                    return test_result

        test_result.status = "failed"
        test_result.error = f"All IPMI connection methods failed after {self.config.max_retries} attempts"
        test_result.duration = time.time() - start_time
        return test_result

    def test_dns_resolution_with_retry(self) -> TestResult:
        """Test DNS resolution for IPMI hostname with retry logic"""
        start_time = time.time()
        test_result = TestResult(
            test_name="dns_resolution",
            timestamp=datetime.utcnow().isoformat(),
            status="unknown",
            details={},
            error=None,
            duration=0.0
        )

        for attempt in range(self.config.max_retries):
            if attempt > 0:
                time.sleep(self.config.retry_delay)

            success, ip = self.resolve_hostname(self.config.ipmi_host)

            if success:
                # Also test if we can reach the IP
                test_cmd = [
                    "ssh", "-i", self.ssh_key,
                    "-o", f"ConnectTimeout={self.config.connect_timeout}",
                    "-o", "StrictHostKeyChecking=no",
                    "-o", "UserKnownHostsFile=/dev/null",
                    f"{self.config.ssh_user}@{self.config.host}",
                    f"ping -c 1 -W 3 {ip}"
                ]

                ping_success, _, _ = self.run_ssh_command(test_cmd, 10)

                test_result.status = "success"
                test_result.details = {
                    "resolved_ip": ip,
                    "ip_reachable": ping_success,
                    "attempts": attempt + 1
                }
                test_result.duration = time.time() - start_time
                return test_result

        test_result.status = "failed"
        test_result.error = f"DNS resolution failed for {self.config.ipmi_host} after {self.config.max_retries} attempts"
        test_result.duration = time.time() - start_time
        return test_result

    def update_device_state(self, results: Dict[str, Any]) -> None:
        """Update device_states.json with current test results"""
        try:
            state_file = Path("device_states.json")
            if state_file.exists():
                with open(state_file, 'r') as f:
                    states = json.load(f)
            else:
                states = {}

            # Determine overall state based on test results
            if results.get("overall_status") == "operational":
                state = "healthy"
            elif results.get("overall_status") == "partial":
                state = "degraded"
            else:
                state = "unreachable"

            states[self.config.device_id] = {
                "state": state,
                "timestamp": datetime.utcnow().isoformat(),
                "last_test": results.get("test_end"),
                "ipmi_status": results.get("overall_status"),
                "ssh_status": results.get("tests", {}).get("ssh_connectivity", {}).get("status"),
                "dns_status": results.get("tests", {}).get("dns_resolution", {}).get("status")
            }

            with open(state_file, 'w') as f:
                json.dump(states, f, indent=2)

            self.logger.info(f"Updated device state for {self.config.device_id}: {state}")

        except Exception as e:
            self.logger.error(f"Failed to update device state: {e}")

    def generate_heartbeat_data(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate heartbeat data for monitoring integration"""
        return {
            "device_id": self.config.device_id,
            "timestamp": datetime.utcnow().isoformat(),
            "type": "ipmi_health_check",
            "status": results.get("overall_status", "unknown"),
            "metrics": {
                "ssh_connectivity": results.get("tests", {}).get("ssh_connectivity", {}).get("status") == "success",
                "ipmi_available": results.get("tests", {}).get("ipmi_tool_availability", {}).get("status") == "success",
                "ipmi_connectivity": results.get("tests", {}).get("ipmi_connectivity", {}).get("status") == "success",
                "dns_resolution": results.get("tests", {}).get("dns_resolution", {}).get("status") == "success",
                "total_tests": results.get("summary", {}).get("total_tests", 0),
                "passed_tests": results.get("summary", {}).get("passed", 0)
            },
            "details": results
        }

    def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run all IPMI tests and return comprehensive results with monitoring integration"""
        self.logger.info(f"Starting comprehensive IPMI test for device {self.config.device_id} at {self.config.host}")

        test_suite = {
            "device_id": self.config.device_id,
            "host": self.config.host,
            "test_start": datetime.utcnow().isoformat(),
            "tests": {},
            "summary": {
                "total_tests": 0,
                "passed": 0,
                "failed": 0,
                "errors": 0
            }
        }

        # Run all tests with enhanced error handling
        tests = [
            ("ssh_connectivity", self.test_ssh_connectivity_with_retry),
            ("dns_resolution", self.test_dns_resolution_with_retry),
            ("ipmi_tool_availability", self.test_ipmi_tool_availability_with_retry),
            ("ipmi_connectivity", self.test_ipmi_connectivity_with_retry)
        ]

        for test_name, test_func in tests:
            self.logger.info(f"Running {test_name}...")
            try:
                test_result = test_func()
                test_suite["tests"][test_name] = asdict(test_result)

                # Update summary
                test_suite["summary"]["total_tests"] += 1
                if test_result.status == "success":
                    test_suite["summary"]["passed"] += 1
                elif test_result.status in ["failed", "not_available", "timeout"]:
                    test_suite["summary"]["failed"] += 1
                else:
                    test_suite["summary"]["errors"] += 1

            except Exception as e:
                self.logger.error(f"Test {test_name} failed with exception: {e}")
                test_suite["summary"]["total_tests"] += 1
                test_suite["summary"]["errors"] += 1

                error_result = TestResult(
                    test_name=test_name,
                    timestamp=datetime.utcnow().isoformat(),
                    status="error",
                    details={},
                    error=str(e),
                    duration=0.0
                )
                test_suite["tests"][test_name] = asdict(error_result)

            # Brief delay between tests
            time.sleep(1)

        test_suite["test_end"] = datetime.utcnow().isoformat()

        # Overall assessment
        passed = test_suite["summary"]["passed"]
        total = test_suite["summary"]["total_tests"]

        if passed >= 3:  # SSH, DNS, and at least one IPMI method
            test_suite["overall_status"] = "operational"
        elif passed >= 2:  # SSH and DNS are critical
            test_suite["overall_status"] = "partial"
        else:
            test_suite["overall_status"] = "failed"

        # Update device state and generate heartbeat
        self.update_device_state(test_suite)
        heartbeat_data = self.generate_heartbeat_data(test_suite)

        # Save heartbeat data for monitoring integration
        heartbeat_file = f"logs/heartbeats/device_{self.config.device_id}_ipmi.jsonl"
        Path(heartbeat_file).parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(heartbeat_file, 'a') as f:
                f.write(json.dumps(heartbeat_data) + '\n')
            self.logger.info(f"Heartbeat data saved to {heartbeat_file}")
        except Exception as e:
            self.logger.error(f"Failed to save heartbeat data: {e}")

        return test_suite

    def save_results(self, results: Dict[str, Any], output_path: Optional[str] = None) -> str:
        """Save test results to file with enhanced metadata"""
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"device_{self.config.device_id}_ipmi_test_{timestamp}.json"

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Add metadata to results
        results["metadata"] = {
            "script_version": "2.0.0",
            "generated_by": "EnhancedSSHIPMITester",
            "config": asdict(self.config)
        }

        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)

        self.logger.info(f"Test results saved to: {output_path}")
        return str(output_path)

def create_enhanced_tester(config_dict: Dict[str, Any] = None) -> EnhancedSSHIPMITester:
    """Factory function to create tester with configuration"""
    if config_dict:
        config = TestConfig(**{k: v for k, v in config_dict.items() if hasattr(TestConfig, k)})
    else:
        # Try to load from environment variables
        config = TestConfig()
        config.host = os.getenv("IPMI_HOST", config.host)
        config.ssh_key = os.getenv("SSH_KEY_PATH", config.ssh_key)
        config.ssh_user = os.getenv("SSH_USER", config.ssh_user)
        config.device_id = os.getenv("DEVICE_ID", config.device_id)

    return EnhancedSSHIPMITester(config)

def main():
    """Enhanced main execution function with better configuration and error handling"""
    parser = argparse.ArgumentParser(description="Enhanced SSH-based IPMI connectivity test for device #24460")
    parser.add_argument("--host", default="23.92.79.2", help="Device hostname or IP")
    parser.add_argument("--ssh-key", default="~/.ssh/starlingx_key", help="SSH private key path")
    parser.add_argument("--ssh-user", default="root", help="SSH username")
    parser.add_argument("--device-id", default="24460", help="Device ID for tracking")
    parser.add_argument("--output", help="Output file for test results")
    parser.add_argument("--config", help="JSON configuration file")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--debug", action="store_true", help="Debug output")
    parser.add_argument("--max-retries", type=int, default=3, help="Maximum retry attempts")
    parser.add_argument("--timeout", type=int, default=15, help="Command timeout in seconds")

    args = parser.parse_args()

    # Setup configuration
    config_dict = {
        "host": args.host,
        "ssh_key": args.ssh_key,
        "ssh_user": args.ssh_user,
        "device_id": args.device_id,
        "max_retries": args.max_retries,
        "command_timeout": args.timeout
    }

    # Override with config file if provided
    if args.config and Path(args.config).exists():
        try:
            with open(args.config, 'r') as f:
                file_config = json.load(f)
            config_dict.update(file_config)
        except Exception as e:
            print(f"Warning: Could not load config file {args.config}: {e}")

    # Create tester
    tester = create_enhanced_tester(config_dict)

    # Set logging level
    if args.debug:
        tester.logger.setLevel(logging.DEBUG)
    elif args.verbose:
        tester.logger.setLevel(logging.INFO)
    else:
        tester.logger.setLevel(logging.WARNING)

    try:
        # Run comprehensive test
        results = tester.run_comprehensive_test()
        output_path = tester.save_results(results, args.output)

        # Output results
        print(f"\n{'='*70}")
        print("ENHANCED IPMI TEST RESULTS")
        print(f"{'='*70}")
        print(f"Device: {results['device_id']} ({results['host']})")
        print(f"Overall Status: {results['overall_status'].upper()}")
        print(f"Tests: {results['summary']['passed']}/{results['summary']['total_tests']} passed")
        print(f"Duration: {(datetime.fromisoformat(results['test_end'].replace('Z', '+00:00')) - datetime.fromisoformat(results['test_start'].replace('Z', '+00:00'))).total_seconds():.1f}s")

        if args.verbose or args.debug:
            print("\nDetailed Results:")
            for test_name, test_result in results["tests"].items():
                status_icon = "✅" if test_result["status"] == "success" else "❌" if test_result["status"] in ["failed", "error"] else "⚠️"
                print(f"  {status_icon} {test_name}: {test_result['status']}")
                if test_result.get("error"):
                    print(f"    Error: {test_result['error']}")
                if test_result.get("duration"):
                    print(f"    Duration: {test_result['duration']:.2f}s")

        print(f"\nResults saved to: {output_path}")
        print(f"Heartbeat data: logs/heartbeats/device_{results['device_id']}_ipmi.jsonl")
        print(f"Log file: device_{results['device_id']}_ipmi_test.log")

        return 0 if results["overall_status"] in ["operational", "partial"] else 1

    except KeyboardInterrupt:
        tester.logger.info("Test interrupted by user")
        return 130
    except Exception as e:
        tester.logger.error(f"Unexpected error in main: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
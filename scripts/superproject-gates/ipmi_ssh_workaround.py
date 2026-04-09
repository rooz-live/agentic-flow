#!/usr/bin/env python3
"""
IPMI SSH Workaround for Device #24460
=====================================

Provides a workaround for IPMI connectivity issues with device #24460 by establishing
SSH tunnels and alternative communication paths for critical device operations.

This script handles:
- SSH tunnel establishment for IPMI-over-IP
- Alternative device health monitoring via SSH
- Remote power management through SSH proxies
- Automatic fallback mechanisms for device communication

Usage:
    python ipmi_ssh_workaround.py --device 24460 --test-connectivity
    python ipmi_ssh_workaround.py --device 24460 --establish-tunnel
    python ipmi_ssh_workaround.py --device 24460 --power-cycle --confirm
"""

import asyncio
import subprocess
import socket
import time
import json
import logging
import argparse
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
import tempfile
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class IPMISSHWorkaround:
    """Handles IPMI connectivity workarounds via SSH tunnels"""
    
    def __init__(self, device_id: str = "24460"):
        self.device_id = device_id
        self.config = self._load_device_config()
        self.ssh_key_path = Path.home() / "pem" / "rooz.pem"
        self.tunnel_port = 6230  # Local port for IPMI tunnel
        self.ssh_tunnel_process = None
        
    def _load_device_config(self) -> Dict[str, Any]:
        """Load device configuration for SSH connections"""
        # Device #24460 configuration
        config = {
            "24460": {
                "primary_host": "23.92.79.2",
                "backup_host": "stx-aio-0.corp.interface.tag.ooo",
                "ipmi_host": "24460.ipmi.interface.internal",
                "ssh_user": "root",
                "ssh_port": 22,
                "ipmi_port": 623,
                "description": "Production server with IPMI connectivity issues",
                "location": "Primary datacenter",
                "critical": True
            }
        }
        
        return config.get(self.device_id, {})
    
    async def test_connectivity(self) -> Dict[str, Any]:
        """Test various connectivity methods to the device"""
        logger.info(f"Testing connectivity to device #{self.device_id}")
        
        results = {
            "device_id": self.device_id,
            "timestamp": datetime.now().isoformat(),
            "tests": {
                "ssh_primary": {"status": "UNKNOWN", "response_time": None},
                "ssh_backup": {"status": "UNKNOWN", "response_time": None},
                "ipmi_direct": {"status": "UNKNOWN", "response_time": None},
                "ping_test": {"status": "UNKNOWN", "response_time": None}
            },
            "recommendations": []
        }
        
        # Test 1: SSH to primary host
        logger.info("Testing SSH to primary host...")
        ssh_primary_result = await self._test_ssh_connection(
            self.config.get("primary_host"), 
            self.config.get("ssh_user", "root")
        )
        results["tests"]["ssh_primary"] = ssh_primary_result
        
        # Test 2: SSH to backup host
        if self.config.get("backup_host"):
            logger.info("Testing SSH to backup host...")
            ssh_backup_result = await self._test_ssh_connection(
                self.config.get("backup_host"), 
                self.config.get("ssh_user", "root")
            )
            results["tests"]["ssh_backup"] = ssh_backup_result
        
        # Test 3: Direct IPMI connection
        logger.info("Testing direct IPMI connection...")
        ipmi_result = await self._test_ipmi_connection()
        results["tests"]["ipmi_direct"] = ipmi_result
        
        # Test 4: Basic ping test
        logger.info("Testing ping connectivity...")
        ping_result = await self._test_ping()
        results["tests"]["ping_test"] = ping_result
        
        # Generate recommendations
        results["recommendations"] = self._generate_connectivity_recommendations(results["tests"])
        
        return results
    
    async def _test_ssh_connection(self, host: str, user: str, timeout: int = 10) -> Dict[str, Any]:
        """Test SSH connection to specified host"""
        if not host:
            return {"status": "SKIPPED", "error": "Host not configured"}
        
        start_time = time.time()
        
        try:
            # Test SSH connection with a simple command
            cmd = [
                "ssh",
                "-i", str(self.ssh_key_path),
                "-o", "ConnectTimeout=10",
                "-o", "StrictHostKeyChecking=no",
                "-o", "UserKnownHostsFile=/dev/null",
                "-o", "LogLevel=ERROR",
                f"{user}@{host}",
                "echo 'SSH_TEST_SUCCESS'"
            ]
            
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(result.communicate(), timeout=timeout)
            response_time = round((time.time() - start_time) * 1000, 2)
            
            if result.returncode == 0 and b"SSH_TEST_SUCCESS" in stdout:
                return {
                    "status": "SUCCESS",
                    "response_time": response_time,
                    "host": host
                }
            else:
                return {
                    "status": "FAILED",
                    "response_time": response_time,
                    "error": stderr.decode().strip() if stderr else "Connection failed",
                    "host": host
                }
                
        except asyncio.TimeoutError:
            return {
                "status": "TIMEOUT",
                "response_time": timeout * 1000,
                "error": f"Connection timed out after {timeout}s",
                "host": host
            }
        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e),
                "host": host
            }
    
    async def _test_ipmi_connection(self) -> Dict[str, Any]:
        """Test direct IPMI connection"""
        ipmi_host = self.config.get("ipmi_host")
        if not ipmi_host:
            return {"status": "SKIPPED", "error": "IPMI host not configured"}
        
        start_time = time.time()
        
        try:
            # Test IPMI connection using ipmitool if available
            cmd = ["ipmitool", "-I", "lanplus", "-H", ipmi_host, "-U", "admin", "chassis", "status"]
            
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(result.communicate(), timeout=15)
            response_time = round((time.time() - start_time) * 1000, 2)
            
            if result.returncode == 0:
                return {
                    "status": "SUCCESS",
                    "response_time": response_time,
                    "output": stdout.decode().strip()
                }
            else:
                return {
                    "status": "FAILED",
                    "response_time": response_time,
                    "error": stderr.decode().strip()
                }
                
        except FileNotFoundError:
            return {
                "status": "UNAVAILABLE",
                "error": "ipmitool not installed"
            }
        except asyncio.TimeoutError:
            return {
                "status": "TIMEOUT",
                "response_time": 15000,
                "error": "IPMI connection timed out"
            }
        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e)
            }
    
    async def _test_ping(self) -> Dict[str, Any]:
        """Test basic ping connectivity"""
        host = self.config.get("primary_host")
        if not host:
            return {"status": "SKIPPED", "error": "Primary host not configured"}
        
        try:
            cmd = ["ping", "-c", "3", "-W", "5000", host]
            
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await result.communicate()
            
            if result.returncode == 0:
                # Parse ping statistics for average response time
                output = stdout.decode()
                for line in output.split('\n'):
                    if 'avg' in line and 'ms' in line:
                        # Extract average ping time
                        parts = line.split('/')
                        if len(parts) >= 5:
                            avg_time = float(parts[4])
                            return {
                                "status": "SUCCESS",
                                "response_time": round(avg_time, 2)
                            }
                
                return {"status": "SUCCESS", "response_time": None}
            else:
                return {
                    "status": "FAILED",
                    "error": stderr.decode().strip()
                }
                
        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e)
            }
    
    def _generate_connectivity_recommendations(self, tests: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on connectivity test results"""
        recommendations = []
        
        ssh_primary = tests.get("ssh_primary", {})
        ssh_backup = tests.get("ssh_backup", {})
        ipmi_direct = tests.get("ipmi_direct", {})
        ping_test = tests.get("ping_test", {})
        
        # SSH connectivity recommendations
        if ssh_primary.get("status") == "SUCCESS":
            recommendations.append("✅ Primary SSH connection working - use for device management")
        elif ssh_backup.get("status") == "SUCCESS":
            recommendations.append("⚠️ Primary SSH failed, but backup SSH working - use backup host")
        else:
            recommendations.append("❌ SSH connections failed - check network connectivity and credentials")
        
        # IPMI recommendations
        if ipmi_direct.get("status") == "SUCCESS":
            recommendations.append("✅ Direct IPMI connection working - no workaround needed")
        elif ipmi_direct.get("status") in ["FAILED", "TIMEOUT"]:
            if ssh_primary.get("status") == "SUCCESS" or ssh_backup.get("status") == "SUCCESS":
                recommendations.append("🔧 IPMI failed but SSH working - establish SSH tunnel for IPMI")
            else:
                recommendations.append("🚨 Both IPMI and SSH failed - escalate to infrastructure team")
        
        # Performance recommendations
        ssh_times = [ssh_primary.get("response_time"), ssh_backup.get("response_time")]
        fast_ssh = min([t for t in ssh_times if t is not None], default=None)
        
        if fast_ssh and fast_ssh > 2000:  # > 2 seconds
            recommendations.append("⚠️ High SSH latency detected - monitor network performance")
        
        # Network recommendations
        if ping_test.get("status") == "FAILED":
            recommendations.append("🔧 Ping failed - check network routing and firewall rules")
        
        return recommendations
    
    async def establish_ssh_tunnel(self) -> Dict[str, Any]:
        """Establish SSH tunnel for IPMI-over-IP access"""
        logger.info(f"Establishing SSH tunnel for device #{self.device_id}")
        
        # Determine best SSH host to use
        connectivity = await self.test_connectivity()
        ssh_host = None
        
        if connectivity["tests"]["ssh_primary"]["status"] == "SUCCESS":
            ssh_host = self.config.get("primary_host")
            logger.info("Using primary host for SSH tunnel")
        elif connectivity["tests"]["ssh_backup"]["status"] == "SUCCESS":
            ssh_host = self.config.get("backup_host")
            logger.info("Using backup host for SSH tunnel")
        else:
            return {
                "status": "FAILED",
                "error": "No working SSH connection available for tunnel"
            }
        
        try:
            # Kill any existing tunnel on this port
            await self._kill_existing_tunnel()
            
            # Establish SSH tunnel
            # Local port 6230 -> SSH host -> IPMI host:623
            ipmi_host = self.config.get("ipmi_host", "localhost")
            ipmi_port = self.config.get("ipmi_port", 623)
            ssh_user = self.config.get("ssh_user", "root")
            
            tunnel_cmd = [
                "ssh",
                "-i", str(self.ssh_key_path),
                "-N",  # Don't execute remote command
                "-L", f"{self.tunnel_port}:{ipmi_host}:{ipmi_port}",  # Local port forwarding
                "-o", "StrictHostKeyChecking=no",
                "-o", "UserKnownHostsFile=/dev/null",
                "-o", "ServerAliveInterval=60",
                "-o", "ServerAliveCountMax=3",
                f"{ssh_user}@{ssh_host}"
            ]
            
            logger.info(f"Starting SSH tunnel: {' '.join(tunnel_cmd[:5])}...")  # Don't log full command
            
            self.ssh_tunnel_process = await asyncio.create_subprocess_exec(
                *tunnel_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Wait a moment for tunnel to establish
            await asyncio.sleep(2)
            
            # Check if tunnel is working
            tunnel_test = await self._test_tunnel_connectivity()
            
            if tunnel_test["status"] == "SUCCESS":
                logger.info(f"SSH tunnel established successfully on port {self.tunnel_port}")
                return {
                    "status": "SUCCESS",
                    "tunnel_port": self.tunnel_port,
                    "ssh_host": ssh_host,
                    "target": f"{ipmi_host}:{ipmi_port}",
                    "process_id": self.ssh_tunnel_process.pid
                }
            else:
                # Tunnel failed, clean up
                await self._kill_existing_tunnel()
                return {
                    "status": "FAILED",
                    "error": f"Tunnel test failed: {tunnel_test.get('error', 'Unknown error')}"
                }
                
        except Exception as e:
            logger.error(f"Failed to establish SSH tunnel: {e}")
            await self._kill_existing_tunnel()
            return {
                "status": "ERROR",
                "error": str(e)
            }
    
    async def _test_tunnel_connectivity(self) -> Dict[str, Any]:
        """Test if the SSH tunnel is working"""
        try:
            # Try to connect to the local tunnel port
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex(('localhost', self.tunnel_port))
            sock.close()
            
            if result == 0:
                return {"status": "SUCCESS"}
            else:
                return {"status": "FAILED", "error": f"Cannot connect to tunnel port {self.tunnel_port}"}
                
        except Exception as e:
            return {"status": "ERROR", "error": str(e)}
    
    async def _kill_existing_tunnel(self):
        """Kill any existing SSH tunnel process"""
        if self.ssh_tunnel_process:
            try:
                self.ssh_tunnel_process.terminate()
                await asyncio.wait_for(self.ssh_tunnel_process.wait(), timeout=5)
            except asyncio.TimeoutError:
                self.ssh_tunnel_process.kill()
            except:
                pass
            finally:
                self.ssh_tunnel_process = None
        
        # Also kill any processes using our tunnel port
        try:
            cmd = f"lsof -ti:{self.tunnel_port}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.returncode == 0 and result.stdout.strip():
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    subprocess.run(f"kill -9 {pid}", shell=True)
                    logger.info(f"Killed process {pid} using port {self.tunnel_port}")
        except:
            pass
    
    async def power_cycle_device(self, confirm: bool = False) -> Dict[str, Any]:
        """Perform power cycle on the device via IPMI or SSH"""
        if not confirm:
            return {
                "status": "ABORTED",
                "error": "Power cycle not confirmed. Use --confirm flag to proceed."
            }
        
        logger.warning(f"Initiating power cycle for device #{self.device_id}")
        
        # First try direct IPMI
        connectivity = await self.test_connectivity()
        
        if connectivity["tests"]["ipmi_direct"]["status"] == "SUCCESS":
            logger.info("Using direct IPMI for power cycle")
            return await self._power_cycle_ipmi_direct()
        
        # Try via SSH tunnel
        if (connectivity["tests"]["ssh_primary"]["status"] == "SUCCESS" or 
            connectivity["tests"]["ssh_backup"]["status"] == "SUCCESS"):
            
            logger.info("Direct IPMI failed, attempting via SSH tunnel")
            tunnel_result = await self.establish_ssh_tunnel()
            
            if tunnel_result["status"] == "SUCCESS":
                result = await self._power_cycle_ipmi_tunnel()
                await self._kill_existing_tunnel()  # Clean up tunnel
                return result
            else:
                logger.error("SSH tunnel establishment failed")
        
        # Last resort: SSH-based power management
        if (connectivity["tests"]["ssh_primary"]["status"] == "SUCCESS" or 
            connectivity["tests"]["ssh_backup"]["status"] == "SUCCESS"):
            
            logger.info("IPMI methods failed, attempting SSH-based power cycle")
            return await self._power_cycle_ssh()
        
        return {
            "status": "FAILED",
            "error": "All power cycle methods failed - manual intervention required"
        }
    
    async def _power_cycle_ipmi_direct(self) -> Dict[str, Any]:
        """Power cycle using direct IPMI connection"""
        try:
            ipmi_host = self.config.get("ipmi_host")
            
            # Power off
            cmd_off = ["ipmitool", "-I", "lanplus", "-H", ipmi_host, "-U", "admin", "chassis", "power", "off"]
            result_off = await asyncio.create_subprocess_exec(*cmd_off, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            stdout_off, stderr_off = await result_off.communicate()
            
            if result_off.returncode != 0:
                return {"status": "FAILED", "error": f"Power off failed: {stderr_off.decode()}"}
            
            logger.info("Device powered off, waiting 10 seconds...")
            await asyncio.sleep(10)
            
            # Power on
            cmd_on = ["ipmitool", "-I", "lanplus", "-H", ipmi_host, "-U", "admin", "chassis", "power", "on"]
            result_on = await asyncio.create_subprocess_exec(*cmd_on, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            stdout_on, stderr_on = await result_on.communicate()
            
            if result_on.returncode != 0:
                return {"status": "FAILED", "error": f"Power on failed: {stderr_on.decode()}"}
            
            return {
                "status": "SUCCESS",
                "method": "direct_ipmi",
                "message": "Device power cycled successfully"
            }
            
        except Exception as e:
            return {"status": "ERROR", "error": str(e)}
    
    async def _power_cycle_ipmi_tunnel(self) -> Dict[str, Any]:
        """Power cycle using IPMI over SSH tunnel"""
        try:
            # Use localhost:tunnel_port for IPMI commands
            
            # Power off
            cmd_off = ["ipmitool", "-I", "lanplus", "-H", "localhost", "-p", str(self.tunnel_port), "-U", "admin", "chassis", "power", "off"]
            result_off = await asyncio.create_subprocess_exec(*cmd_off, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            stdout_off, stderr_off = await result_off.communicate()
            
            if result_off.returncode != 0:
                return {"status": "FAILED", "error": f"Power off via tunnel failed: {stderr_off.decode()}"}
            
            logger.info("Device powered off via tunnel, waiting 10 seconds...")
            await asyncio.sleep(10)
            
            # Power on
            cmd_on = ["ipmitool", "-I", "lanplus", "-H", "localhost", "-p", str(self.tunnel_port), "-U", "admin", "chassis", "power", "on"]
            result_on = await asyncio.create_subprocess_exec(*cmd_on, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            stdout_on, stderr_on = await result_on.communicate()
            
            if result_on.returncode != 0:
                return {"status": "FAILED", "error": f"Power on via tunnel failed: {stderr_on.decode()}"}
            
            return {
                "status": "SUCCESS",
                "method": "ipmi_tunnel",
                "message": "Device power cycled successfully via SSH tunnel"
            }
            
        except Exception as e:
            return {"status": "ERROR", "error": str(e)}
    
    async def _power_cycle_ssh(self) -> Dict[str, Any]:
        """Power cycle using SSH-based commands (last resort)"""
        try:
            # Determine SSH host
            connectivity = await self.test_connectivity()
            ssh_host = None
            
            if connectivity["tests"]["ssh_primary"]["status"] == "SUCCESS":
                ssh_host = self.config.get("primary_host")
            elif connectivity["tests"]["ssh_backup"]["status"] == "SUCCESS":
                ssh_host = self.config.get("backup_host")
            else:
                return {"status": "FAILED", "error": "No SSH connection available"}
            
            ssh_user = self.config.get("ssh_user", "root")
            
            # Try graceful reboot first
            cmd_reboot = [
                "ssh",
                "-i", str(self.ssh_key_path),
                "-o", "ConnectTimeout=10",
                "-o", "StrictHostKeyChecking=no",
                f"{ssh_user}@{ssh_host}",
                "shutdown -r now"
            ]
            
            result = await asyncio.create_subprocess_exec(*cmd_reboot, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            stdout, stderr = await result.communicate()
            
            return {
                "status": "SUCCESS",
                "method": "ssh_reboot",
                "message": "Device reboot initiated via SSH"
            }
            
        except Exception as e:
            return {"status": "ERROR", "error": str(e)}
    
    async def get_device_status(self) -> Dict[str, Any]:
        """Get comprehensive device status"""
        logger.info(f"Checking status of device #{self.device_id}")
        
        status = {
            "device_id": self.device_id,
            "timestamp": datetime.now().isoformat(),
            "connectivity": await self.test_connectivity(),
            "power_status": "UNKNOWN",
            "system_health": {},
            "recommendations": []
        }
        
        # Try to get power status via IPMI
        try:
            ipmi_host = self.config.get("ipmi_host")
            if status["connectivity"]["tests"]["ipmi_direct"]["status"] == "SUCCESS":
                cmd = ["ipmitool", "-I", "lanplus", "-H", ipmi_host, "-U", "admin", "chassis", "power", "status"]
                result = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
                stdout, stderr = await result.communicate()
                
                if result.returncode == 0:
                    if b"on" in stdout.lower():
                        status["power_status"] = "ON"
                    elif b"off" in stdout.lower():
                        status["power_status"] = "OFF"
        except:
            pass
        
        # Get system health via SSH if available
        ssh_tests = status["connectivity"]["tests"]
        if ssh_tests["ssh_primary"]["status"] == "SUCCESS" or ssh_tests["ssh_backup"]["status"] == "SUCCESS":
            ssh_host = (self.config.get("primary_host") if ssh_tests["ssh_primary"]["status"] == "SUCCESS" 
                       else self.config.get("backup_host"))
            
            health = await self._get_ssh_system_health(ssh_host)
            status["system_health"] = health
        
        # Generate overall recommendations
        status["recommendations"] = self._generate_status_recommendations(status)
        
        return status
    
    async def _get_ssh_system_health(self, ssh_host: str) -> Dict[str, Any]:
        """Get system health information via SSH"""
        health = {
            "uptime": None,
            "load_average": None,
            "memory_usage": None,
            "disk_usage": None,
            "services_status": {}
        }
        
        try:
            ssh_user = self.config.get("ssh_user", "root")
            
            # Get uptime
            cmd = [
                "ssh", "-i", str(self.ssh_key_path),
                "-o", "ConnectTimeout=10", "-o", "StrictHostKeyChecking=no",
                f"{ssh_user}@{ssh_host}",
                "uptime"
            ]
            result = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            stdout, stderr = await result.communicate()
            if result.returncode == 0:
                health["uptime"] = stdout.decode().strip()
            
            # Get memory usage
            cmd[7] = "free -h | grep Mem"
            result = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            stdout, stderr = await result.communicate()
            if result.returncode == 0:
                health["memory_usage"] = stdout.decode().strip()
                
            # Get disk usage
            cmd[7] = "df -h /"
            result = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            stdout, stderr = await result.communicate()
            if result.returncode == 0:
                health["disk_usage"] = stdout.decode().strip()
        
        except Exception as e:
            logger.warning(f"Could not get system health via SSH: {e}")
        
        return health
    
    def _generate_status_recommendations(self, status: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on device status"""
        recommendations = []
        
        # Connectivity recommendations
        conn_tests = status["connectivity"]["tests"]
        if conn_tests["ipmi_direct"]["status"] != "SUCCESS":
            recommendations.append("🔧 IPMI connection issues detected - use SSH tunnel workaround")
        
        if (conn_tests["ssh_primary"]["status"] != "SUCCESS" and 
            conn_tests["ssh_backup"]["status"] != "SUCCESS"):
            recommendations.append("🚨 All SSH connections failed - escalate to infrastructure team")
        
        # Power status recommendations
        if status["power_status"] == "OFF":
            recommendations.append("⚡ Device is powered off - power on required")
        elif status["power_status"] == "UNKNOWN":
            recommendations.append("❓ Power status unknown - investigate IPMI connectivity")
        
        # System health recommendations
        health = status.get("system_health", {})
        if health.get("memory_usage"):
            # Simple check for high memory usage (would need parsing for accurate check)
            if "90%" in health["memory_usage"] or "95%" in health["memory_usage"]:
                recommendations.append("⚠️ High memory usage detected - monitor system resources")
        
        return recommendations
    
    def print_status_report(self, status: Dict[str, Any]):
        """Print formatted status report"""
        print(f"\n🖥️  DEVICE STATUS REPORT - #{status['device_id']}")
        print("=" * 60)
        print(f"Timestamp: {status['timestamp']}")
        print(f"Power Status: {status['power_status']}")
        
        print(f"\n📡 Connectivity Tests:")
        for test_name, test_result in status["connectivity"]["tests"].items():
            status_emoji = {
                "SUCCESS": "✅",
                "FAILED": "❌", 
                "TIMEOUT": "⏰",
                "SKIPPED": "⏭️",
                "ERROR": "💥"
            }.get(test_result["status"], "❓")
            
            response_time = f" ({test_result['response_time']}ms)" if test_result.get('response_time') else ""
            print(f"  {status_emoji} {test_name.replace('_', ' ').title()}: {test_result['status']}{response_time}")
        
        if status.get("system_health"):
            print(f"\n💚 System Health:")
            health = status["system_health"]
            if health.get("uptime"):
                print(f"  Uptime: {health['uptime']}")
            if health.get("memory_usage"):
                print(f"  Memory: {health['memory_usage']}")
        
        if status.get("recommendations"):
            print(f"\n💡 Recommendations:")
            for rec in status["recommendations"]:
                print(f"  {rec}")


async def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description="IPMI SSH Workaround for Device #24460")
    parser.add_argument("--device", default="24460", help="Device ID")
    parser.add_argument("--test-connectivity", action="store_true", help="Test all connectivity methods")
    parser.add_argument("--establish-tunnel", action="store_true", help="Establish SSH tunnel for IPMI")
    parser.add_argument("--power-cycle", action="store_true", help="Power cycle the device")
    parser.add_argument("--get-status", action="store_true", help="Get comprehensive device status")
    parser.add_argument("--confirm", action="store_true", help="Confirm destructive operations")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    workaround = IPMISSHWorkaround(args.device)
    
    try:
        if args.test_connectivity:
            print(f"🔍 Testing connectivity to device #{args.device}...")
            results = await workaround.test_connectivity()
            
            print(f"\n📊 CONNECTIVITY TEST RESULTS")
            print("=" * 50)
            
            for test_name, test_result in results["tests"].items():
                status_emoji = {
                    "SUCCESS": "✅",
                    "FAILED": "❌",
                    "TIMEOUT": "⏰", 
                    "SKIPPED": "⏭️",
                    "ERROR": "💥"
                }.get(test_result["status"], "❓")
                
                response_time = f" ({test_result['response_time']}ms)" if test_result.get('response_time') else ""
                print(f"{status_emoji} {test_name.replace('_', ' ').title()}: {test_result['status']}{response_time}")
                
                if test_result.get('error'):
                    print(f"    Error: {test_result['error']}")
            
            if results.get("recommendations"):
                print(f"\n💡 Recommendations:")
                for rec in results["recommendations"]:
                    print(f"  {rec}")
        
        elif args.establish_tunnel:
            print(f"🔧 Establishing SSH tunnel for device #{args.device}...")
            result = await workaround.establish_ssh_tunnel()
            
            if result["status"] == "SUCCESS":
                print(f"✅ SSH tunnel established successfully!")
                print(f"   Local port: {result['tunnel_port']}")
                print(f"   SSH host: {result['ssh_host']}")
                print(f"   Process ID: {result['process_id']}")
                print(f"\n💡 Use localhost:{result['tunnel_port']} for IPMI commands")
                print(f"   Example: ipmitool -I lanplus -H localhost -p {result['tunnel_port']} -U admin chassis status")
            else:
                print(f"❌ Failed to establish tunnel: {result.get('error')}")
                sys.exit(1)
        
        elif args.power_cycle:
            if not args.confirm:
                print("⚠️  Power cycle requires confirmation. Use --confirm flag.")
                print("   This will forcefully restart the device!")
                sys.exit(1)
            
            print(f"⚡ Initiating power cycle for device #{args.device}...")
            result = await workaround.power_cycle_device(confirm=True)
            
            if result["status"] == "SUCCESS":
                print(f"✅ {result['message']}")
                print(f"   Method used: {result.get('method', 'unknown')}")
            else:
                print(f"❌ Power cycle failed: {result.get('error')}")
                sys.exit(1)
        
        elif args.get_status:
            print(f"📊 Getting status for device #{args.device}...")
            status = await workaround.get_device_status()
            workaround.print_status_report(status)
        
        else:
            print("No action specified. Use --help for available options.")
            print("\nQuick actions:")
            print("  --test-connectivity    Test all connection methods")
            print("  --establish-tunnel     Setup SSH tunnel for IPMI")
            print("  --get-status          Get comprehensive device status")
            print("  --power-cycle --confirm   Power cycle device (destructive!)")
    
    except KeyboardInterrupt:
        print("\n\n⏹️  Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Operation failed: {e}")
        print(f"\n💥 Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
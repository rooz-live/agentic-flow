#!/usr/bin/env python3
"""
Enhanced Device #24460 SSH IPMI Monitoring with Neural Capabilities
Supports neural analysis, SSH key configuration, and comprehensive validation
"""

import json
import subprocess
import datetime
import argparse
import os
import sys
import sqlite3
import time
import socket
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any

class NeuralDeviceMonitor:
    def __init__(self, device_ip: str = "23.92.79.2", device_id: str = "24460", 
                 correlation_id: str = "consciousness-1758658960"):
        self.device_ip = device_ip
        self.device_id = device_id
        self.correlation_id = correlation_id
        self.timestamp = datetime.datetime.utcnow().isoformat() + "Z"
        
        # Enhanced configuration
        self.neural_enabled = False
        self.ssh_key_path = "/Users/shahroozbhopti/pem/rooz.pem"
        self.timeout = 30
        self.verbose = False
        
        # Neural scoring weights
        self.neural_weights = {
            "connectivity": 0.25,
            "performance": 0.20,
            "security": 0.20,
            "reliability": 0.15,
            "availability": 0.20
        }
        
        # Initialize logging
        self.project_root = Path(__file__).parent.parent.parent
        self.logs_dir = self.project_root / "logs"
        self.logs_dir.mkdir(exist_ok=True)
        
        # Initialize database
        self.db_path = self.logs_dir / "device_monitoring.db"
        self.init_database()
    
    def init_database(self):
        """Initialize device monitoring database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS device_health_checks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                device_id TEXT NOT NULL,
                device_ip TEXT NOT NULL,
                check_type TEXT NOT NULL,
                status TEXT NOT NULL,
                response_time REAL,
                neural_score REAL,
                health_metrics TEXT,
                correlation_id TEXT,
                details TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS neural_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                device_id TEXT NOT NULL,
                pattern_type TEXT NOT NULL,
                confidence_score REAL,
                risk_indicators TEXT,
                recommendations TEXT,
                correlation_id TEXT
            )
        """)
        
        # Create indexes for performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_device_timestamp ON device_health_checks(device_id, timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_neural_device ON neural_analysis(device_id, timestamp)")
        
        conn.commit()
        conn.close()
    
    def emit_heartbeat(self, component: str, phase: str, status: str, elapsed_ms: int, metrics: Dict[str, Any] = None):
        """Emit standardized heartbeat for CLAUDE ecosystem integration"""
        heartbeat_line = f"{self.timestamp}|{component}|{phase}|{status}|{elapsed_ms}|{self.correlation_id}|{json.dumps(metrics or {})}"
        
        heartbeat_file = self.logs_dir / "heartbeats.log"
        with open(heartbeat_file, "a") as f:
            f.write(heartbeat_line + "\n")
        
        if self.verbose:
            print(f"💓 Heartbeat: {component} | {phase} | {status}")
    
    def test_connectivity(self) -> Dict[str, Any]:
        """Enhanced connectivity testing with neural analysis"""
        start_time = time.time()
        
        print(f"🔗 Testing Enhanced Connectivity to Device #{self.device_id} ({self.device_ip})")
        
        results = {
            "device_id": self.device_id,
            "device_ip": self.device_ip,
            "timestamp": self.timestamp,
            "tests": {},
            "overall_status": "UNKNOWN",
            "neural_score": 0.0,
            "recommendations": []
        }
        
        # Test 1: ICMP Ping
        ping_result = self._test_ping()
        results["tests"]["ping"] = ping_result
        
        # Test 2: SSH Connectivity
        ssh_result = self._test_ssh_connectivity()
        results["tests"]["ssh"] = ssh_result
        
        # Test 3: IPMI over SSH
        ipmi_result = self._test_ssh_ipmi()
        results["tests"]["ipmi"] = ipmi_result
        
        # Test 4: Port Scanning (Neural Enhanced)
        port_result = self._test_port_availability()
        results["tests"]["ports"] = port_result
        
        # Calculate overall status
        test_scores = [test["score"] for test in results["tests"].values()]
        overall_score = sum(test_scores) / len(test_scores) if test_scores else 0
        
        if overall_score >= 80:
            results["overall_status"] = "HEALTHY"
        elif overall_score >= 60:
            results["overall_status"] = "DEGRADED"
        else:
            results["overall_status"] = "CRITICAL"
        
        # Neural analysis if enabled
        if self.neural_enabled:
            neural_analysis = self._analyze_connectivity_patterns(results)
            results["neural_analysis"] = neural_analysis
            results["neural_score"] = neural_analysis["confidence_score"]
        
        # Store results in database
        self._store_health_check("connectivity", results["overall_status"], 
                                overall_score, results, time.time() - start_time)
        
        elapsed_ms = int((time.time() - start_time) * 1000)
        self.emit_heartbeat("device_monitor", "connectivity_test", results["overall_status"], 
                          elapsed_ms, {"overall_score": overall_score, "neural_enabled": self.neural_enabled})
        
        return results
    
    def _test_ping(self) -> Dict[str, Any]:
        """Test ICMP ping connectivity"""
        try:
            result = subprocess.run(
                ["ping", "-c", "4", "-W", str(self.timeout * 1000), self.device_ip],
                capture_output=True, text=True, timeout=self.timeout
            )
            
            if result.returncode == 0:
                # Parse ping statistics
                output_lines = result.stdout.split('\n')
                stats_line = [line for line in output_lines if "avg" in line]
                
                avg_time = 0
                if stats_line:
                    # Extract average time (format: min/avg/max/stddev = 1.234/5.678/9.012/1.345 ms)
                    times = stats_line[0].split('=')[1].strip().split('/')
                    avg_time = float(times[1]) if len(times) > 1 else 0
                
                score = max(0, 100 - (avg_time * 2))  # Score based on response time
                
                return {
                    "status": "SUCCESS",
                    "response_time_ms": avg_time,
                    "score": min(100, score),
                    "details": f"Ping successful, avg response: {avg_time}ms"
                }
            else:
                return {
                    "status": "FAILED",
                    "response_time_ms": None,
                    "score": 0,
                    "details": "ICMP ping failed"
                }
        except Exception as e:
            return {
                "status": "ERROR",
                "response_time_ms": None,
                "score": 0,
                "details": f"Ping error: {str(e)}"
            }
    
    def _test_ssh_connectivity(self) -> Dict[str, Any]:
        """Test SSH connectivity with key-based authentication"""
        try:
            ssh_cmd = [
                "ssh",
                "-i", self.ssh_key_path,
                "-o", "ConnectTimeout=10",
                "-o", "BatchMode=yes",
                "-o", "StrictHostKeyChecking=no",
                f"root@{self.device_ip}",
                "echo 'SSH Connection Successful'"
            ]
            
            start_time = time.time()
            result = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=self.timeout)
            response_time = (time.time() - start_time) * 1000
            
            if result.returncode == 0 and "SSH Connection Successful" in result.stdout:
                score = max(50, 100 - (response_time / 100))  # Score based on response time
                
                return {
                    "status": "SUCCESS",
                    "response_time_ms": response_time,
                    "score": min(100, score),
                    "details": f"SSH connection successful in {response_time:.2f}ms"
                }
            else:
                return {
                    "status": "FAILED",
                    "response_time_ms": response_time,
                    "score": 25,
                    "details": f"SSH connection failed: {result.stderr.strip() or 'Unknown error'}"
                }
                
        except subprocess.TimeoutExpired:
            return {
                "status": "TIMEOUT",
                "response_time_ms": self.timeout * 1000,
                "score": 0,
                "details": "SSH connection timeout"
            }
        except Exception as e:
            return {
                "status": "ERROR",
                "response_time_ms": None,
                "score": 0,
                "details": f"SSH error: {str(e)}"
            }
    
    def _test_ssh_ipmi(self) -> Dict[str, Any]:
        """Test IPMI functionality via SSH"""
        try:
            # Test basic IPMI sensor reading via SSH
            ipmi_cmd = [
                "ssh",
                "-i", self.ssh_key_path,
                "-o", "ConnectTimeout=10",
                "-o", "BatchMode=yes",
                "-o", "StrictHostKeyChecking=no",
                f"root@{self.device_ip}",
                "ipmitool sensor list | head -5"
            ]
            
            start_time = time.time()
            result = subprocess.run(ipmi_cmd, capture_output=True, text=True, timeout=self.timeout)
            response_time = (time.time() - start_time) * 1000
            
            if result.returncode == 0 and result.stdout.strip():
                # Parse sensor data for health indicators
                sensor_lines = result.stdout.strip().split('\n')
                sensor_count = len([line for line in sensor_lines if '|' in line])
                
                score = min(100, 60 + (sensor_count * 5))  # Base score + sensor availability
                
                return {
                    "status": "SUCCESS",
                    "response_time_ms": response_time,
                    "score": score,
                    "sensor_count": sensor_count,
                    "details": f"IPMI operational, {sensor_count} sensors detected"
                }
            else:
                return {
                    "status": "FAILED",
                    "response_time_ms": response_time,
                    "score": 20,
                    "details": f"IPMI command failed: {result.stderr.strip() or 'No sensor data'}"
                }
                
        except subprocess.TimeoutExpired:
            return {
                "status": "TIMEOUT",
                "response_time_ms": self.timeout * 1000,
                "score": 0,
                "details": "IPMI command timeout via SSH"
            }
        except Exception as e:
            return {
                "status": "ERROR",
                "response_time_ms": None,
                "score": 0,
                "details": f"IPMI SSH error: {str(e)}"
            }
    
    def _test_port_availability(self) -> Dict[str, Any]:
        """Test critical port availability with neural scoring"""
        critical_ports = [22, 23, 443, 623, 5900]  # SSH, Telnet, HTTPS, IPMI, VNC
        
        port_results = {}
        total_score = 0
        
        for port in critical_ports:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5)
                
                start_time = time.time()
                result = sock.connect_ex((self.device_ip, port))
                response_time = (time.time() - start_time) * 1000
                
                if result == 0:
                    port_score = 100
                    status = "OPEN"
                else:
                    port_score = 0
                    status = "CLOSED"
                
                port_results[port] = {
                    "status": status,
                    "response_time_ms": response_time,
                    "score": port_score
                }
                
                total_score += port_score
                sock.close()
                
            except Exception as e:
                port_results[port] = {
                    "status": "ERROR",
                    "response_time_ms": None,
                    "score": 0,
                    "error": str(e)
                }
        
        avg_score = total_score / len(critical_ports)
        
        return {
            "status": "SUCCESS" if avg_score > 50 else "DEGRADED",
            "score": avg_score,
            "port_details": port_results,
            "details": f"Port scan complete, {sum(1 for p in port_results.values() if p['status'] == 'OPEN')}/{len(critical_ports)} ports open"
        }
    
    def _analyze_connectivity_patterns(self, connectivity_results: Dict[str, Any]) -> Dict[str, Any]:
        """Neural pattern analysis of connectivity data"""
        
        print("🧠 Applying neural pattern analysis...")
        
        # Extract key metrics for neural analysis
        ping_score = connectivity_results["tests"]["ping"]["score"]
        ssh_score = connectivity_results["tests"]["ssh"]["score"]
        ipmi_score = connectivity_results["tests"]["ipmi"]["score"]
        port_score = connectivity_results["tests"]["ports"]["score"]
        
        # Neural pattern scoring
        patterns = {
            "connectivity_stability": ping_score * 0.3,
            "authentication_reliability": ssh_score * 0.25,
            "management_capability": ipmi_score * 0.25,
            "service_availability": port_score * 0.2
        }
        
        # Calculate confidence score
        confidence_score = sum(patterns.values())
        
        # Risk indicators based on patterns
        risk_indicators = []
        if ping_score < 80:
            risk_indicators.append("Network connectivity instability detected")
        if ssh_score < 70:
            risk_indicators.append("SSH authentication issues may indicate security concerns")
        if ipmi_score < 60:
            risk_indicators.append("IPMI management interface degraded or unavailable")
        if port_score < 50:
            risk_indicators.append("Critical services may be unavailable")
        
        # Generate recommendations
        recommendations = []
        if confidence_score >= 90:
            recommendations.append("Device operating optimally, maintain current monitoring")
        elif confidence_score >= 70:
            recommendations.append("Device stable with minor issues, monitor closely")
        else:
            recommendations.append("Device requires immediate attention, investigate connectivity issues")
            if ssh_score < 50:
                recommendations.append("Verify SSH key configuration and network routing")
            if ipmi_score < 50:
                recommendations.append("Check IPMI service status and hardware health")
        
        neural_analysis = {
            "confidence_score": confidence_score,
            "pattern_scores": patterns,
            "risk_indicators": risk_indicators,
            "recommendations": recommendations,
            "neural_weights": self.neural_weights
        }
        
        # Store neural analysis
        self._store_neural_analysis("connectivity_pattern", confidence_score, 
                                  risk_indicators, recommendations)
        
        return neural_analysis
    
    def full_health_check(self) -> Dict[str, Any]:
        """Comprehensive health check with neural analysis"""
        start_time = time.time()
        
        print(f"🏥 Running Full Health Check for Device #{self.device_id}")
        
        # Start with connectivity test
        connectivity_results = self.test_connectivity()
        
        # Extended health checks
        health_results = {
            "device_id": self.device_id,
            "device_ip": self.device_ip,
            "timestamp": self.timestamp,
            "connectivity": connectivity_results,
            "hardware_health": self._check_hardware_health(),
            "system_performance": self._check_system_performance(),
            "security_posture": self._check_security_posture(),
            "overall_health_score": 0.0,
            "recommendations": []
        }
        
        # Calculate overall health score
        component_scores = {
            "connectivity": connectivity_results.get("neural_score", 0) or sum(test["score"] for test in connectivity_results["tests"].values()) / len(connectivity_results["tests"]),
            "hardware": health_results["hardware_health"]["score"],
            "performance": health_results["system_performance"]["score"],
            "security": health_results["security_posture"]["score"]
        }
        
        # Weighted health score
        weights = {"connectivity": 0.3, "hardware": 0.3, "performance": 0.2, "security": 0.2}
        overall_score = sum(component_scores[component] * weights[component] 
                          for component in component_scores)
        
        health_results["overall_health_score"] = overall_score
        health_results["component_scores"] = component_scores
        
        # Generate recommendations
        if overall_score >= 90:
            health_results["health_status"] = "EXCELLENT"
            health_results["recommendations"].append("Device operating at optimal levels")
        elif overall_score >= 75:
            health_results["health_status"] = "GOOD"
            health_results["recommendations"].append("Device stable with minor optimization opportunities")
        elif overall_score >= 60:
            health_results["health_status"] = "FAIR"
            health_results["recommendations"].append("Device functional but requires attention")
        else:
            health_results["health_status"] = "POOR"
            health_results["recommendations"].append("Device requires immediate intervention")
        
        # Neural analysis for full health assessment
        if self.neural_enabled:
            full_neural_analysis = self._analyze_full_health_patterns(health_results)
            health_results["full_neural_analysis"] = full_neural_analysis
        
        # Store comprehensive results
        self._store_health_check("full_health", health_results["health_status"], 
                                overall_score, health_results, time.time() - start_time)
        
        elapsed_ms = int((time.time() - start_time) * 1000)
        self.emit_heartbeat("device_monitor", "full_health_check", health_results["health_status"],
                          elapsed_ms, {"overall_score": overall_score, "neural_enabled": self.neural_enabled})
        
        return health_results
    
    def _check_hardware_health(self) -> Dict[str, Any]:
        """Check hardware health via IPMI sensors"""
        try:
            # Get comprehensive sensor data via SSH
            sensor_cmd = [
                "ssh", "-i", self.ssh_key_path, "-o", "ConnectTimeout=10",
                "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no",
                f"root@{self.device_ip}",
                "ipmitool sensor list | grep -E '(Temp|Fan|Voltage|Power)'"
            ]
            
            result = subprocess.run(sensor_cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and result.stdout.strip():
                sensor_lines = result.stdout.strip().split('\n')
                
                # Parse sensor data
                temp_sensors = [line for line in sensor_lines if 'Temp' in line]
                fan_sensors = [line for line in sensor_lines if 'Fan' in line] 
                voltage_sensors = [line for line in sensor_lines if 'Voltage' in line]
                power_sensors = [line for line in sensor_lines if 'Power' in line]
                
                # Calculate health score based on sensor availability and status
                total_sensors = len(sensor_lines)
                healthy_sensors = len([line for line in sensor_lines if 'ok' in line.lower()])
                
                if total_sensors > 0:
                    health_score = (healthy_sensors / total_sensors) * 100
                else:
                    health_score = 50  # Unknown status
                
                return {
                    "status": "SUCCESS",
                    "score": health_score,
                    "sensor_summary": {
                        "temperature": len(temp_sensors),
                        "fans": len(fan_sensors),
                        "voltage": len(voltage_sensors),
                        "power": len(power_sensors),
                        "total": total_sensors,
                        "healthy": healthy_sensors
                    },
                    "details": f"Hardware monitoring active: {healthy_sensors}/{total_sensors} sensors healthy"
                }
            else:
                return {
                    "status": "LIMITED",
                    "score": 40,
                    "details": "Hardware monitoring unavailable or limited sensor data"
                }
                
        except Exception as e:
            return {
                "status": "ERROR",
                "score": 0,
                "details": f"Hardware health check failed: {str(e)}"
            }
    
    def _check_system_performance(self) -> Dict[str, Any]:
        """Check system performance metrics"""
        try:
            # Get system load and memory info via SSH
            perf_cmd = [
                "ssh", "-i", self.ssh_key_path, "-o", "ConnectTimeout=10",
                "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no",
                f"root@{self.device_ip}",
                "uptime; free -m | head -2"
            ]
            
            result = subprocess.run(perf_cmd, capture_output=True, text=True, timeout=20)
            
            if result.returncode == 0:
                output_lines = result.stdout.strip().split('\n')
                
                # Parse uptime and load average
                uptime_line = output_lines[0] if output_lines else ""
                load_avg = 0.0
                
                if "load average:" in uptime_line:
                    load_part = uptime_line.split("load average:")[1].strip()
                    load_values = [float(x.strip().rstrip(',')) for x in load_part.split()[:3]]
                    load_avg = load_values[0] if load_values else 0.0
                
                # Calculate performance score (lower load is better)
                if load_avg <= 1.0:
                    perf_score = 100
                elif load_avg <= 2.0:
                    perf_score = 80
                elif load_avg <= 5.0:
                    perf_score = 60
                else:
                    perf_score = 30
                
                return {
                    "status": "SUCCESS",
                    "score": perf_score,
                    "metrics": {
                        "load_average_1min": load_avg,
                        "uptime_info": uptime_line
                    },
                    "details": f"System load: {load_avg}, performance score: {perf_score}"
                }
            else:
                return {
                    "status": "LIMITED",
                    "score": 60,
                    "details": "Performance data unavailable"
                }
                
        except Exception as e:
            return {
                "status": "ERROR",
                "score": 0,
                "details": f"Performance check failed: {str(e)}"
            }
    
    def _check_security_posture(self) -> Dict[str, Any]:
        """Check security configuration and posture"""
        try:
            # Check SSH configuration and security settings
            security_cmd = [
                "ssh", "-i", self.ssh_key_path, "-o", "ConnectTimeout=10",
                "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no",
                f"root@{self.device_ip}",
                "grep -E '(PermitRootLogin|PasswordAuthentication)' /etc/ssh/sshd_config; echo '---'; ps aux | grep -E '(ssh|firewall)' | head -3"
            ]
            
            result = subprocess.run(security_cmd, capture_output=True, text=True, timeout=20)
            
            security_score = 70  # Base score
            security_notes = []
            
            if result.returncode == 0:
                output = result.stdout.strip()
                
                # Analyze SSH configuration
                if "PermitRootLogin no" in output:
                    security_score += 15
                    security_notes.append("Root login disabled (good)")
                elif "PermitRootLogin yes" in output:
                    security_score -= 10
                    security_notes.append("Root login enabled (review recommended)")
                
                if "PasswordAuthentication no" in output:
                    security_score += 10
                    security_notes.append("Password auth disabled (good)")
                elif "PasswordAuthentication yes" in output:
                    security_score -= 5
                    security_notes.append("Password auth enabled (consider key-only)")
                
                # Check for running security services
                if "ssh" in output.lower():
                    security_score += 5
                    security_notes.append("SSH service running")
                
                return {
                    "status": "SUCCESS",
                    "score": min(100, security_score),
                    "security_notes": security_notes,
                    "details": f"Security posture assessed, score: {security_score}"
                }
            else:
                return {
                    "status": "LIMITED",
                    "score": 50,
                    "details": "Security assessment partially available"
                }
                
        except Exception as e:
            return {
                "status": "ERROR",
                "score": 30,
                "details": f"Security check failed: {str(e)}"
            }
    
    def _analyze_full_health_patterns(self, health_results: Dict[str, Any]) -> Dict[str, Any]:
        """Comprehensive neural analysis of full health data"""
        
        print("🧠 Performing comprehensive neural health analysis...")
        
        # Extract component scores
        connectivity_score = health_results["component_scores"]["connectivity"]
        hardware_score = health_results["component_scores"]["hardware"]
        performance_score = health_results["component_scores"]["performance"]
        security_score = health_results["component_scores"]["security"]
        
        # Advanced pattern analysis
        patterns = {
            "system_stability": (connectivity_score + performance_score) / 2,
            "hardware_reliability": hardware_score,
            "security_posture": security_score,
            "operational_readiness": (hardware_score + performance_score + security_score) / 3
        }
        
        # Neural confidence calculation
        pattern_variance = max(patterns.values()) - min(patterns.values())
        confidence_score = health_results["overall_health_score"] * (1 - (pattern_variance / 200))
        
        # Advanced risk assessment
        risk_factors = []
        if connectivity_score < 70:
            risk_factors.append("Network connectivity issues may impact service availability")
        if hardware_score < 60:
            risk_factors.append("Hardware degradation detected, proactive maintenance recommended")
        if performance_score < 70:
            risk_factors.append("Performance bottlenecks may affect workload efficiency")
        if security_score < 80:
            risk_factors.append("Security configuration review recommended")
        
        # Predictive recommendations
        recommendations = []
        if confidence_score >= 90:
            recommendations.extend([
                "Device operating optimally across all subsystems",
                "Continue current maintenance schedule",
                "Consider for production workload expansion"
            ])
        elif confidence_score >= 75:
            recommendations.extend([
                "Device stable with minor optimization opportunities",
                "Schedule preventive maintenance review",
                "Monitor trending patterns for early issue detection"
            ])
        elif confidence_score >= 60:
            recommendations.extend([
                "Device functional but requires attention in degraded areas",
                "Prioritize remediation of lowest-scoring components",
                "Increase monitoring frequency until issues resolved"
            ])
        else:
            recommendations.extend([
                "Device requires immediate comprehensive intervention",
                "Investigate all subsystems showing degraded performance",
                "Consider temporary workload redistribution if applicable"
            ])
        
        neural_analysis = {
            "confidence_score": confidence_score,
            "pattern_analysis": patterns,
            "risk_factors": risk_factors,
            "predictive_recommendations": recommendations,
            "neural_insights": {
                "pattern_variance": pattern_variance,
                "system_coherence": 100 - (pattern_variance * 2),
                "predictive_confidence": min(100, confidence_score * 1.1)
            }
        }
        
        # Store comprehensive neural analysis
        self._store_neural_analysis("full_health_pattern", confidence_score,
                                  risk_factors, recommendations)
        
        return neural_analysis
    
    def _store_health_check(self, check_type: str, status: str, score: float, 
                           results: Dict[str, Any], response_time: float):
        """Store health check results in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO device_health_checks 
            (timestamp, device_id, device_ip, check_type, status, response_time, 
             neural_score, health_metrics, correlation_id, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            self.timestamp, self.device_id, self.device_ip, check_type, status,
            response_time, results.get("neural_score", 0), json.dumps(results),
            self.correlation_id, json.dumps(results.get("recommendations", []))
        ))
        
        conn.commit()
        conn.close()
    
    def _store_neural_analysis(self, pattern_type: str, confidence: float,
                              risk_indicators: List[str], recommendations: List[str]):
        """Store neural analysis results"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO neural_analysis 
            (timestamp, device_id, pattern_type, confidence_score, 
             risk_indicators, recommendations, correlation_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            self.timestamp, self.device_id, pattern_type, confidence,
            json.dumps(risk_indicators), json.dumps(recommendations),
            self.correlation_id
        ))
        
        conn.commit()
        conn.close()

def main():
    parser = argparse.ArgumentParser(description="Enhanced Device #24460 SSH IPMI Monitoring")
    parser.add_argument("--device-ip", default="23.92.79.2", help="Device IP address")
    parser.add_argument("--device-id", default="24460", help="Device ID")
    parser.add_argument("--ssh-key", default="/Users/shahroozbhopti/pem/rooz.pem", help="SSH private key path")
    parser.add_argument("--neural", action="store_true", help="Enable neural pattern analysis")
    parser.add_argument("--test-connectivity", action="store_true", help="Run connectivity tests only")
    parser.add_argument("--full-health", action="store_true", help="Run comprehensive health check")
    parser.add_argument("--validate-all", action="store_true", help="Validate all systems")
    parser.add_argument("--json-output", action="store_true", help="Output results as JSON")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    parser.add_argument("--timeout", type=int, default=30, help="Connection timeout in seconds")
    
    args = parser.parse_args()
    
    # Initialize monitor
    monitor = NeuralDeviceMonitor(
        device_ip=args.device_ip,
        device_id=args.device_id
    )
    
    monitor.neural_enabled = args.neural
    monitor.ssh_key_path = args.ssh_key
    monitor.timeout = args.timeout
    monitor.verbose = args.verbose
    
    # Validate SSH key exists
    if not os.path.exists(args.ssh_key):
        print(f"❌ SSH key not found: {args.ssh_key}")
        sys.exit(1)
    
    # Run requested tests
    results = None
    
    if args.test_connectivity:
        results = monitor.test_connectivity()
    elif args.full_health:
        results = monitor.full_health_check()
    elif args.validate_all:
        # Run all validation tests
        connectivity_results = monitor.test_connectivity()
        health_results = monitor.full_health_check()
        
        results = {
            "validation_type": "comprehensive",
            "connectivity": connectivity_results,
            "full_health": health_results,
            "overall_validation": "PASS" if (
                connectivity_results.get("overall_status") in ["HEALTHY", "DEGRADED"] and
                health_results.get("health_status") in ["EXCELLENT", "GOOD", "FAIR"]
            ) else "FAIL"
        }
    else:
        # Default: connectivity test
        results = monitor.test_connectivity()
    
    # Output results
    if args.json_output:
        print(json.dumps(results, indent=2))
    else:
        # Human-readable output
        print("\n" + "="*60)
        print(f"Enhanced Device Monitor Results - {monitor.timestamp}")
        print("="*60)
        
        if "validation_type" in results:
            print(f"Validation Type: {results['validation_type']}")
            print(f"Overall Validation: {results['overall_validation']}")
        elif "overall_status" in results:
            print(f"Overall Status: {results['overall_status']}")
        elif "health_status" in results:
            print(f"Health Status: {results['health_status']}")
            print(f"Overall Score: {results['overall_health_score']:.1f}/100")
        
        if args.neural and "neural_analysis" in results:
            neural = results["neural_analysis"]
            print(f"Neural Confidence: {neural['confidence_score']:.1f}%")
            if neural.get("recommendations"):
                print("Neural Recommendations:")
                for rec in neural["recommendations"]:
                    print(f"  • {rec}")
    
    # Exit with appropriate code
    if results:
        if "overall_validation" in results:
            sys.exit(0 if results["overall_validation"] == "PASS" else 1)
        elif "overall_status" in results:
            sys.exit(0 if results["overall_status"] in ["HEALTHY", "DEGRADED"] else 1)
        elif "health_status" in results:
            sys.exit(0 if results["health_status"] in ["EXCELLENT", "GOOD", "FAIR"] else 1)
    
    sys.exit(1)

if __name__ == "__main__":
    main()
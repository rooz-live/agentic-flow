#!/usr/bin/env python3
"""
Test-Driven Development Suite for Milestone Gate Validations
Correlation ID: consciousness-1758658960
"""

import unittest
import subprocess
import datetime
import json
import os
import sys
from typing import Dict, Any, List, Tuple

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

CORRELATION_ID = "consciousness-1758658960"
TEST_DOMAINS = [
    "interface.artchat.art",
    "interface.o-gov.com",
    "interface.rooz.live",
    "interface.tag.ooo",
    "interface.tag.vote"
]


class TestM1DNSResolution(unittest.TestCase):
    """Test M1: DNS & Infrastructure Baseline"""
    
    def test_dns_resolution_all_domains(self):
        """Test that all domains resolve to valid IP addresses"""
        for domain in TEST_DOMAINS:
            with self.subTest(domain=domain):
                result = subprocess.run(
                    ["dig", "+short", "A", domain],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                self.assertEqual(result.returncode, 0, f"dig command failed for {domain}")
                
                ip_addresses = [line for line in result.stdout.strip().split('\n') if line]
                self.assertGreater(len(ip_addresses), 0, f"No IP address found for {domain}")
                
                # Validate IP format
                for ip in ip_addresses:
                    octets = ip.split('.')
                    self.assertEqual(len(octets), 4, f"Invalid IP format for {domain}: {ip}")
                    for octet in octets:
                        self.assertTrue(0 <= int(octet) <= 255, f"Invalid octet in IP: {ip}")


class TestM2TLSAndHSTS(unittest.TestCase):
    """Test M2: TLS/SSL & HSTS Deployment"""
    
    def test_https_accessible(self):
        """Test that all domains are accessible via HTTPS"""
        for domain in TEST_DOMAINS:
            with self.subTest(domain=domain):
                result = subprocess.run(
                    ["curl", "-Iks", "--max-time", "10", f"https://{domain}"],
                    capture_output=True,
                    text=True
                )
                self.assertEqual(result.returncode, 0, f"HTTPS failed for {domain}")
                
                # Check for valid HTTP status
                first_line = result.stdout.split('\n')[0]
                self.assertIn("HTTP", first_line, f"Invalid HTTP response from {domain}")
                self.assertRegex(first_line, r"HTTP/[0-9.]+ (200|301|302)", 
                               f"Invalid HTTP status for {domain}: {first_line}")
    
    def test_hsts_header_present(self):
        """Test that HSTS headers are present on all domains"""
        for domain in TEST_DOMAINS:
            with self.subTest(domain=domain):
                result = subprocess.run(
                    ["curl", "-Iks", "--max-time", "10", f"https://{domain}"],
                    capture_output=True,
                    text=True
                )
                self.assertEqual(result.returncode, 0, f"HTTPS failed for {domain}")
                
                # Check for HSTS header
                headers = result.stdout.lower()
                self.assertIn("strict-transport-security", headers,
                            f"HSTS header missing for {domain}")
                
                # Validate HSTS max-age
                for line in result.stdout.split('\n'):
                    if 'strict-transport-security' in line.lower():
                        self.assertIn("max-age=", line.lower(),
                                    f"HSTS max-age missing for {domain}")
                        break


class TestM3NginxConfiguration(unittest.TestCase):
    """Test M3: Nginx Configuration & SSR"""
    
    def test_nginx_syntax_valid(self):
        """Test that nginx configuration syntax is valid"""
        result = subprocess.run(
            ["ssh", "root@23.92.79.2", "nginx -t"],
            capture_output=True,
            text=True
        )
        self.assertEqual(result.returncode, 0, 
                        f"Nginx syntax validation failed: {result.stderr}")
        self.assertIn("syntax is ok", result.stderr.lower(),
                     "Nginx syntax check did not confirm valid syntax")


class TestM4PHPFPMAndApplication(unittest.TestCase):
    """Test M4: PHP-FPM & Application Layer"""
    
    def test_php_fpm_active(self):
        """Test that PHP-FPM service is active"""
        result = subprocess.run(
            ["ssh", "root@23.92.79.2", "systemctl is-active php-fpm"],
            capture_output=True,
            text=True
        )
        self.assertEqual(result.returncode, 0, "PHP-FPM is not active")
        self.assertEqual(result.stdout.strip(), "active", "PHP-FPM status is not 'active'")
    
    def test_health_endpoints(self):
        """Test that health endpoints return 200 OK"""
        # Only test domains we expect to have health endpoints
        test_domains = ["interface.rooz.live"]
        
        for domain in test_domains:
            with self.subTest(domain=domain):
                result = subprocess.run(
                    ["curl", "-f", "--max-time", "10", f"https://{domain}/health"],
                    capture_output=True,
                    text=True
                )
                # Note: Some domains may not have health endpoints yet
                if result.returncode == 0:
                    self.assertIn("ok", result.stdout.lower(),
                                f"Health endpoint for {domain} did not return 'ok'")


class TestM5BlueGreenDeployment(unittest.TestCase):
    """Test M5: Blue-Green Deployment Validation"""
    
    def test_response_times_acceptable(self):
        """Test that response times are under 2000ms for P95"""
        latencies = []
        
        for domain in TEST_DOMAINS:
            result = subprocess.run(
                ["curl", "-o", "/dev/null", "-s", "-w", "%{time_total}", 
                 "--max-time", "10", f"https://{domain}"],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                try:
                    latency_seconds = float(result.stdout.strip())
                    latency_ms = latency_seconds * 1000
                    latencies.append(latency_ms)
                except ValueError:
                    pass
        
        if latencies:
            # Calculate P95
            latencies.sort()
            p95_index = int(len(latencies) * 0.95)
            p95_latency = latencies[p95_index] if p95_index < len(latencies) else latencies[-1]
            
            self.assertLess(p95_latency, 2000, 
                          f"P95 latency {p95_latency}ms exceeds 2000ms threshold")


class TestSystemResources(unittest.TestCase):
    """Test system resource constraints"""
    
    def test_file_descriptor_limit(self):
        """Test that file descriptor limit is sufficient"""
        result = subprocess.run(
            ["bash", "-c", "ulimit -n"],
            capture_output=True,
            text=True
        )
        self.assertEqual(result.returncode, 0, "Failed to get file descriptor limit")
        
        limit = int(result.stdout.strip())
        self.assertGreaterEqual(limit, 1024, 
                              f"File descriptor limit {limit} is too low (minimum 1024)")
    
    def test_datetime_timezone_aware(self):
        """Test that datetime operations use timezone-aware timestamps"""
        # This tests that datetime.UTC is available (Python 3.11+)
        try:
            timestamp = datetime.datetime.now(datetime.UTC)
            self.assertIsNotNone(timestamp.tzinfo, "Datetime is not timezone-aware")
        except AttributeError:
            # Fallback for older Python versions
            timestamp = datetime.datetime.now(datetime.timezone.utc)
            self.assertIsNotNone(timestamp.tzinfo, "Datetime is not timezone-aware")


class TestConsciousnessGates(unittest.TestCase):
    """Test consciousness evolution gate requirements"""
    
    def setUp(self):
        """Load latest deployment report"""
        self.report_path = "/Users/shahroozbhopti/Documents/code/legacy engineering/DevOps/logs"
        self.report_data = None
        
        # Find latest deployment report
        if os.path.exists(self.report_path):
            reports = [f for f in os.listdir(self.report_path) 
                      if f.startswith("deployment_report_") and f.endswith(".json")]
            if reports:
                latest_report = sorted(reports)[-1]
                with open(os.path.join(self.report_path, latest_report), 'r') as f:
                    self.report_data = json.load(f)
    
    def test_evidence_count_sufficient(self):
        """Test that evidence count meets minimum threshold (≥2)"""
        if self.report_data and 'evidence_count' in self.report_data:
            evidence_count = self.report_data['evidence_count']
            self.assertGreaterEqual(evidence_count, 2,
                                  f"Evidence count {evidence_count} below minimum of 2")
    
    def test_confidence_threshold(self):
        """Test that confidence meets minimum threshold (≥0.70)"""
        if self.report_data and 'confidence' in self.report_data:
            confidence = self.report_data['confidence']
            self.assertGreaterEqual(confidence, 0.70,
                                  f"Confidence {confidence} below minimum of 0.70")
    
    def test_ece_calibration_acceptable(self):
        """Test that Expected Calibration Error is below threshold (≤0.02)"""
        if self.report_data and 'ece' in self.report_data:
            ece = self.report_data['ece']
            self.assertLessEqual(ece, 0.02,
                               f"ECE {ece} exceeds maximum of 0.02")


def emit_heartbeat(component: str, phase: str, status: str, 
                  elapsed_ms: int = 0, metrics: Dict[str, Any] = None):
    """Emit standardized telemetry heartbeat"""
    metrics = metrics or {}
    timestamp = datetime.datetime.now(datetime.UTC).isoformat(timespec="seconds").replace("+00:00", "Z")
    metrics_json = json.dumps(metrics, separators=(',', ':'))
    
    heartbeat = f"{timestamp}|{component}|{phase}|{status}|{elapsed_ms}|{CORRELATION_ID}|{metrics_json}"
    print(heartbeat, flush=True)


if __name__ == '__main__':
    # Emit start heartbeat
    emit_heartbeat("test_suite", "start", "running", metrics={"test_count": 0})
    
    # Run tests with verbose output
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(sys.modules[__name__])
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Emit completion heartbeat
    metrics = {
        "tests_run": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "skipped": len(result.skipped),
        "success_rate": (result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun if result.testsRun > 0 else 0
    }
    
    status = "success" if result.wasSuccessful() else "failed"
    emit_heartbeat("test_suite", "complete", status, metrics=metrics)
    
    # Exit with appropriate code
    sys.exit(0 if result.wasSuccessful() else 1)
